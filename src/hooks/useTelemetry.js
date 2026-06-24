import { useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';

const QUEUE_KEY = 'ellars_telemetry_queue';
const MAX_RETRIES = 3;
const BASE_BACKOFF_MS = 1000;

const generateUUID = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0,
      v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

const enqueuePayload = (payload) => {
  try {
    const queue = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
    queue.push(payload);
    const limitedQueue = queue.slice(-50);
    localStorage.setItem(QUEUE_KEY, JSON.stringify(limitedQueue));
  } catch (e) {
    // Silence errors to prevent network identifiers in console
  }
};

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export const useTelemetry = () => {
  const { pathname } = useLocation();
  const isOnline = useNetworkStatus();

  // Implement an in-memory boolean flag locker ('isFlushing') directly within the hook layer.
  const isFlushing = useRef(false);

  // Track in-flight payloads to serialize them on unload if they fail or get interrupted
  const inFlightPayloads = useRef([]);

  // Setup tab unload handlers to serialize pending telemetry queues
  useEffect(() => {
    const handleUnload = () => {
      if (inFlightPayloads.current.length > 0) {
        try {
          const queue = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
          const newQueue = [...queue, ...inFlightPayloads.current];
          const limitedQueue = newQueue.slice(-50);
          try {
            localStorage.setItem(QUEUE_KEY, JSON.stringify(limitedQueue));
          } catch (storageError) {
            if (storageError.name === 'QuotaExceededError' || storageError.name === 'NS_ERROR_DOM_QUOTA_REACHED') {
              try {
                // Slicing to remove the oldest 20 elements as recovery
                const recoveredQueue = limitedQueue.slice(20);
                localStorage.setItem(QUEUE_KEY, JSON.stringify(recoveredQueue));
              } catch (retryError) {
                try {
                  sessionStorage.setItem(QUEUE_KEY, JSON.stringify(limitedQueue));
                } catch (sessionError) {
                  // Fallback failed
                }
              }
            }
          }
        } catch (e) {
          // Silent
        }
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        handleUnload();
      }
    };

    window.addEventListener('beforeunload', handleUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', handleUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const flushQueue = useCallback(async () => {
    // When a device reconnection event is broadcast by useNetworkStatus, verify the lock flag state before attempting a flush transaction.
    if (isFlushing.current) return;

    // Toggle the state lock value to true during the active background fetch execution block
    isFlushing.current = true;

    try {
      const hasConsented = localStorage.getItem('ellars_privacy_consent');
      if (hasConsented !== 'true') return;

      const apiKey = import.meta.env.VITE_AXIM_API_KEY;
      const apiUrl = import.meta.env.VITE_AXIM_API_URL || 'https://api.axim.us.com/v1/telemetry';
      if (!apiKey) return;

      const queue = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
      if (queue.length === 0) return;

      let attempt = 0;
      let success = false;

      // Register the payloads we're about to send as "in-flight" in case of unload
      inFlightPayloads.current = [...queue];

      while (attempt < MAX_RETRIES && !success) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        try {
          const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${apiKey}`,
              'Accept': 'application/json',
              'X-Project-Scope': 'ELLARS_FRONTEND'
            },
            body: JSON.stringify(queue), // Single array payload block
            signal: controller.signal,
          });

          // Resetting it to false only after a definitive HTTP server resolution code clears or drops the local array queue.
          if (response.status === 200 || response.ok) {
            // Safely clear the local browser persistent array cache upon verified gateway reception
            localStorage.setItem(QUEUE_KEY, JSON.stringify([]));
            success = true;
            inFlightPayloads.current = []; // Clear in-flight payloads on success
          } else {
             throw new Error('Non-200 response');
          }
        } catch (error) {
          // If a failure occurs, increment attempt and wait exponentially
          attempt++;
          if (attempt < MAX_RETRIES) {
            await wait(BASE_BACKOFF_MS * Math.pow(2, attempt));
          }
        } finally {
          clearTimeout(timeoutId);
        }
      }
    } catch (e) {
      // Silently fail
    } finally {
      // Resetting it to false only when a successful transmission is verified or the backoff ceiling is completely exhausted
      isFlushing.current = false;
    }
  }, []);

  useEffect(() => {
    if (isOnline) {
      if (!isFlushing.current) {
        flushQueue();
      }
    }
    return () => {};
  }, [isOnline, flushQueue]);

  const dispatchTelemetry = useCallback(async (payload) => {
    const hasConsented = localStorage.getItem('ellars_privacy_consent');
    if (hasConsented !== 'true') return;

    const apiKey = import.meta.env.VITE_AXIM_API_KEY;
    const apiUrl = import.meta.env.VITE_AXIM_API_URL || 'https://api.axim.us.com/v1/telemetry';

    if (!apiKey) return;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    // Track as an individual in-flight payload
    inFlightPayloads.current.push(payload);

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'Accept': 'application/json',
          'X-Project-Scope': 'ELLARS_FRONTEND'
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error('Server error');
      }

      // Successfully sent, remove from in-flight
      inFlightPayloads.current = inFlightPayloads.current.filter(p => p.telemetry_envelope.idempotency_key !== payload.telemetry_envelope.idempotency_key);

    } catch (error) {
      clearTimeout(timeoutId);

      // If a 'CRITICAL' or 'HIGH' severity anomaly capture request fails to deliver
      const severity = payload?.event_payload?.severity;
      if (severity === 'CRITICAL' || severity === 'HIGH') {
        enqueuePayload(payload);
      }

      // Request completed (though failed), remove from in-flight if it wasn't captured in the beforeunload
      inFlightPayloads.current = inFlightPayloads.current.filter(p => p.telemetry_envelope.idempotency_key !== payload.telemetry_envelope.idempotency_key);
    }
  }, []);

  const createTelemetryPayload = useCallback((eventType, severity, componentOrigin, errorMessage = "", stackTrace = "", metadata = {}) => {
    return {
      telemetry_envelope: {
        project_id: 'ELLARS_FRONTEND',
        environment: 'production',
        timestamp: new Date().toISOString(),
        idempotency_key: generateUUID(),
        session: { context_scope: 'public_facing_umbrella' }
      },
      event_payload: {
        event_type: eventType,
        severity: severity,
        component_origin: componentOrigin,
        error_message: errorMessage,
        stack_trace: stackTrace,
        metadata: {
          current_route: pathname,
          network_status: isOnline ? 'online' : 'offline',
          ...metadata
        }
      }
    };
  }, [pathname, isOnline]);

  useEffect(() => {
    const sendTelemetry = async () => {
      const payload = createTelemetryPayload('page_view', 'LOW', 'ROUTER', '', '', { path: pathname });
      await dispatchTelemetry(payload);
    };

    // Background isolation
    sendTelemetry();
    return () => {};
  }, [pathname, dispatchTelemetry, createTelemetryPayload]);

  const trackEvent = useCallback((eventName, eventData = {}, severity = 'MEDIUM', componentOrigin = 'UI_INTERACTION', errorMessage = "", stackTrace = "") => {
    // Isolate telemetry from UI thread execution
    const payload = createTelemetryPayload(eventName, severity, componentOrigin, errorMessage, stackTrace, { data: eventData });
    dispatchTelemetry(payload);
  }, [createTelemetryPayload, dispatchTelemetry]);

  return { trackEvent, dispatchTelemetry };
};
