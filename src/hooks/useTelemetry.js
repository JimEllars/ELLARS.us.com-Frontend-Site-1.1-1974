import { useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';

const QUEUE_KEY = 'ellars_telemetry_queue';
const MAX_RETRIES = 3;
const BASE_BACKOFF_MS = 1000;

export const generateUUID = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0,
      v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};




const prunePayloadArray = (queue) => {
  return queue.map(payload => {
    if (!payload || !payload.event_payload || !payload.event_payload.metadata) return payload;
    const prunedMetadata = { ...payload.event_payload.metadata };
    if (prunedMetadata.data && typeof prunedMetadata.data === "object" && prunedMetadata.data !== null) {
      const prunedData = { ...prunedMetadata.data };
      ["nativeEvent", "_reactName", "_targetInst", "target", "currentTarget", "view"].forEach(key => {
        delete prunedData[key];
      });
      prunedMetadata.data = prunedData;
    }
    return {
      ...payload,
      event_payload: {
        ...payload.event_payload,
        metadata: prunedMetadata
      }
    };
  });
};

export const enqueuePayload = (payload) => {
  try {
    const queue = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
    // Add local timestamp when enqueueing
    payload.timestamp = payload.timestamp || Date.now();
    queue.push(payload);
    const limitedQueue = queue.slice(-50);
    const prunedQueue = prunePayloadArray(limitedQueue);
    try {
      localStorage.setItem(QUEUE_KEY, JSON.stringify(prunedQueue));
      if (typeof window !== 'undefined') { window.dispatchEvent(new CustomEvent('ellars_telemetry_updated')); }
    } catch (storageError) {
      if (storageError.name === 'QuotaExceededError' || storageError.name === 'NS_ERROR_DOM_QUOTA_REACHED') {
        try {
          // Slice the oldest 20 records out of the existing queue and re-attempt the write
          const recoveredQueue = prunedQueue.slice(20);
          localStorage.setItem(QUEUE_KEY, JSON.stringify(recoveredQueue));
        } catch (retryError) {
          try {
            sessionStorage.setItem(QUEUE_KEY, JSON.stringify(prunedQueue));
          } catch (sessionError) {
            // Silence
          }
        }
      }
    }
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
      try {
        const queue = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
        let payloadsToSend = [];
        if (inFlightPayloads.current.length > 0) {
          payloadsToSend = [...inFlightPayloads.current];
        }
        if (queue.length > 0) {
          payloadsToSend = [...queue, ...payloadsToSend];
        }

        if (payloadsToSend.length > 0) {
          const limitedQueue = payloadsToSend.slice(-50);
          const prunedQueue = prunePayloadArray(limitedQueue);

          const hasConsented = localStorage.getItem('ellars_privacy_consent');
          const apiKey = import.meta.env.VITE_AXIM_API_KEY;
          const apiUrl = import.meta.env.VITE_AXIM_API_URL || '/api/telemetry';

          if (hasConsented === 'true' && apiKey) {
            // Using fetch with keepalive as a replacement for sendBeacon
            // since sendBeacon doesn't easily support custom headers like Authorization
            fetch(apiUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
                'Accept': 'application/json',
                'X-Project-Scope': 'ELLARS_FRONTEND'
              },
              body: JSON.stringify(prunedQueue),
              keepalive: true
            }).catch(() => {});

            // Clear local storage queue since we attempted to send it
            localStorage.setItem(QUEUE_KEY, JSON.stringify([]));
          } else {
             // Fallback to saving to local storage if can't send
             localStorage.setItem(QUEUE_KEY, JSON.stringify(prunedQueue));
          }
        }
      } catch (e) {
        // Silent
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
      const apiUrl = import.meta.env.VITE_AXIM_API_URL || '/api/telemetry';
      if (!apiKey) return;

      const queue = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
      if (queue.length === 0) return;

      const now = Date.now();
      const freshQueue = queue.filter(payload => {
          return (now - (payload.timestamp || 0)) <= 86400000;
      });

      if (freshQueue.length !== queue.length) {
          localStorage.setItem(QUEUE_KEY, JSON.stringify(freshQueue));
      }

      if (freshQueue.length === 0) return;

      const prunedQueue = prunePayloadArray(freshQueue);

      let attempt = 0;
      let success = false;

      // Register the payloads we're about to send as "in-flight" in case of unload
      inFlightPayloads.current = [...prunedQueue];

      while (attempt < MAX_RETRIES && !success) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);

        try {
          const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${apiKey}`,
              'Accept': 'application/json',
              'X-Project-Scope': 'ELLARS_FRONTEND'
            },
            body: JSON.stringify(prunedQueue), // Single array payload block
            signal: controller.signal,
          });

          // Resetting it to false only after a definitive HTTP server resolution code clears or drops the local array queue.
          if (response.status === 200 || response.ok) {
            // Safely clear the local browser persistent array cache upon verified gateway reception
            localStorage.setItem(QUEUE_KEY, JSON.stringify([]));
            if (typeof window !== 'undefined') { window.dispatchEvent(new CustomEvent('ellars_telemetry_updated')); }
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

    // Auto flush every 30 seconds
    const interval = setInterval(() => {
      if (isOnline && !isFlushing.current) {
        flushQueue();
      }
    }, 30000);

    // Ensure robust auto-flush execution on browser network reconnection
    window.addEventListener('online', flushQueue);

    return () => {
       clearInterval(interval);
       window.removeEventListener('online', flushQueue);
    };
  }, [isOnline, flushQueue]);

  const dispatchTelemetry = useCallback(async (payload) => {
    const hasConsented = localStorage.getItem('ellars_privacy_consent');
    if (hasConsented !== 'true') return;

    // Just enqueue it. The interval or unload will handle the flush.
    enqueuePayload(payload);

    // Trigger an event so UI can update queue depth
    if (typeof window !== 'undefined') {
       window.dispatchEvent(new CustomEvent('ellars_telemetry_updated'));
    }

    // Flush immediately if buffer reaches 10 events
    try {
      const queue = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
      if (queue.length >= 10 && isOnline && !isFlushing.current) {
        flushQueue();
      }
    } catch(e) { /* silent */ }
  }, [flushQueue, isOnline]);

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
      try {
        const payload = createTelemetryPayload('page_view', 'LOW', 'ROUTER', '', '', { path: pathname });
        await dispatchTelemetry(payload);
      } catch (e) { /* silent */ }
    };

    // Background isolation
    sendTelemetry();
    return () => {};
  }, [pathname, dispatchTelemetry, createTelemetryPayload]);

  const trackEvent = useCallback((eventName, eventData = {}, severity = 'MEDIUM', componentOrigin = 'UI_INTERACTION', errorMessage = "", stackTrace = "") => {
    try {
      // Isolate telemetry from UI thread execution
      const payload = createTelemetryPayload(eventName, severity, componentOrigin, errorMessage, stackTrace, { data: eventData });
      dispatchTelemetry(payload).catch(() => {}); // Catch any stray rejections from dispatchTelemetry
    } catch (e) {
      // Ignore errors entirely to prevent UI disruption
    }
  }, [createTelemetryPayload, dispatchTelemetry]);

  return { trackEvent, dispatchTelemetry, flushQueue };
};
