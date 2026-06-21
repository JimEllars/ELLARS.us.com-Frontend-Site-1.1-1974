import { useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';

const QUEUE_KEY = 'ellars_telemetry_queue';

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
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch (e) {
    // Silence errors to prevent network identifiers in console
  }
};

let isFlushing = false;

const flushQueue = async () => {
  if (isFlushing) return;
  isFlushing = true;

  try {
    const hasConsented = localStorage.getItem('ellars_privacy_consent');
    if (hasConsented !== 'true') return;

    const apiKey = import.meta.env.VITE_AXIM_API_KEY;
    const apiUrl = import.meta.env.VITE_AXIM_API_URL || 'https://api.axim.us.com/v1/telemetry';
    if (!apiKey) return;

    const queue = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
    if (queue.length === 0) return;

    // Clear the array cache buffer entirely immediately
    localStorage.setItem(QUEUE_KEY, JSON.stringify([]));

    // Sequentially extract all queued events from storage and dispatch them down the edge worker stream
    for (const payload of queue) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      try {
        await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
            'Accept': 'application/json',
            'X-Project-Scope': 'ELLARS_FRONTEND',
          },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });
      } catch (error) {
        // Silently fail if unable to send a flushed item
      } finally {
        clearTimeout(timeoutId);
      }
    }
  } catch (e) {
    // Silently fail
  } finally {
    isFlushing = false;
  }
};

export const useTelemetry = () => {
  const { pathname } = useLocation();
  const isOnline = useNetworkStatus();

  useEffect(() => {
    if (isOnline) {
      flushQueue();
    }
    return () => {};
  }, [isOnline]);

  const dispatchTelemetry = useCallback(async (payload) => {
    const hasConsented = localStorage.getItem('ellars_privacy_consent');
    if (hasConsented !== 'true') return;

    const apiKey = import.meta.env.VITE_AXIM_API_KEY;
    const apiUrl = import.meta.env.VITE_AXIM_API_URL || 'https://api.axim.us.com/v1/telemetry';

    if (!apiKey) return;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'Accept': 'application/json',
          'X-Project-Scope': 'ELLARS_FRONTEND',
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error('Server error');
      }
    } catch (error) {
      clearTimeout(timeoutId);

      // If a 'CRITICAL' or 'HIGH' severity anomaly capture request fails to deliver
      const severity = payload?.event_payload?.severity;
      if (severity === 'CRITICAL' || severity === 'HIGH') {
        enqueuePayload(payload);
      }
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
