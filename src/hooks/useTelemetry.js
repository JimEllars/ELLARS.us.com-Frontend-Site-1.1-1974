import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const QUEUE_KEY = 'axim_telemetry_queue';

const getQueue = () => {
  try {
    const data = localStorage.getItem(QUEUE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

const saveToQueue = (payload) => {
  try {
    const queue = getQueue();
    // Keep it lightweight to avoid hitting quotas
    if (queue.length < 50) {
      queue.push(payload);
      localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    }
  } catch (e) {
    console.warn('Failed to save telemetry to queue', e);
  }
};

const clearQueue = () => {
  try {
    localStorage.removeItem(QUEUE_KEY);
  } catch (e) { console.warn('Failed to clear queue', e); }
};

export const useTelemetry = () => {
  const { pathname } = useLocation();

  const flushQueue = async () => {
    const queue = getQueue();
    if (queue.length === 0) return;

    const apiKey = import.meta.env.VITE_AXIM_API_KEY;
    const apiUrl = import.meta.env.VITE_AXIM_API_URL || 'https://api.axim.us.com/v1/telemetry';
    if (!apiKey) return;

    try {
      // Send batched or sequentially. Here we'll send sequentially for simplicity, or in a single batch if backend supports it.
      // Since the prompt says "process and flush the queued items to the AXiM Core API, then clear the local array", we'll do it cleanly.
      for (const payload of queue) {
         const controller = new AbortController();
         const timeoutId = setTimeout(() => controller.abort(), 5000);
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
         clearTimeout(timeoutId);
      }
      clearQueue();
    } catch (e) {
      console.warn('Failed to flush telemetry queue', e);
    }
  };

  useEffect(() => {
    const handleOnline = () => {
      flushQueue();
    };

    window.addEventListener('online', handleOnline);
    return () => {
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  useEffect(() => {
    const hasConsented = localStorage.getItem('ellars_privacy_consent');
    if (hasConsented !== 'true') {
      return;
    }

    const sendTelemetry = async () => {
      const payload = {
        event: 'page_view',
        path: pathname,
        timestamp: new Date().toISOString(),
      };

      try {
        const apiKey = import.meta.env.VITE_AXIM_API_KEY;
        const apiUrl = import.meta.env.VITE_AXIM_API_URL || 'https://api.axim.us.com/v1/telemetry';

        if (!apiKey) {
          return;
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

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

        clearTimeout(timeoutId);
      } catch (error) {
        console.warn('Telemetry payload failed to send, queuing locally', error);
        saveToQueue(payload);
      }
    };

    // Background isolation
    (async () => {
      await sendTelemetry();
    })();
  }, [pathname]);

  const trackEvent = (eventName, eventData = {}) => {
    // Isolate telemetry from UI thread execution
    (async () => {
      const hasConsented = localStorage.getItem('ellars_privacy_consent');
      if (hasConsented !== 'true') {
        return;
      }

      const payload = {
        event: eventName,
        data: eventData,
        timestamp: new Date().toISOString(),
      };

      try {
        const apiKey = import.meta.env.VITE_AXIM_API_KEY;
        const apiUrl = import.meta.env.VITE_AXIM_API_URL || 'https://api.axim.us.com/v1/telemetry';

        if (!apiKey) return;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

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

        clearTimeout(timeoutId);
      } catch (error) {
        console.warn('Telemetry payload failed to send, queuing locally', error);
        saveToQueue(payload);
      }
    })();
  };

  return { trackEvent };
};
