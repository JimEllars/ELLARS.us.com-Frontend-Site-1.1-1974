import { useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';

const QUEUE_KEY = 'ellars_telemetry_queue';

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

  useEffect(() => {
    const sendTelemetry = async () => {
      const payload = {
        telemetry_envelope: { project_id: 'ELLARS_FRONTEND' },
        event_payload: {
          event: 'page_view',
          path: pathname,
          timestamp: new Date().toISOString(),
          // Assume regular page views might not be critical, but if it is, set it.
          // The prompt specifically talks about anomalies or events with severity.
        }
      };

      await dispatchTelemetry(payload);
    };

    // Background isolation
    sendTelemetry();
    return () => {};
  }, [pathname, dispatchTelemetry]);

  const trackEvent = useCallback((eventName, eventData = {}, severity = 'NORMAL') => {
    // Isolate telemetry from UI thread execution
    const payload = {
      telemetry_envelope: { project_id: 'ELLARS_FRONTEND' },
      event_payload: {
        event: eventName,
        data: eventData,
        timestamp: new Date().toISOString(),
        severity: severity
      }
    };

    dispatchTelemetry(payload);
  }, [dispatchTelemetry]);

  return { trackEvent, dispatchTelemetry };
};
