import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const QUEUE_KEY = 'axim_telemetry_queue';

const enqueuePayload = (payload) => {
  try {
    const queue = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
    queue.push(payload);
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch (e) {
    console.warn('Failed to enqueue telemetry', e);
  }
};

let isFlushing = false;

const flushQueue = async () => {
  if (isFlushing) return;
  isFlushing = true;
  const hasConsented = localStorage.getItem('ellars_privacy_consent');
  if (hasConsented !== 'true') return;

  const apiKey = import.meta.env.VITE_AXIM_API_KEY;
  const apiUrl = import.meta.env.VITE_AXIM_API_URL || 'https://api.axim.us.com/v1/telemetry';
  if (!apiKey) return;

  try {
    const queue = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
    if (queue.length === 0) return;

    // We process sequentially or batch? The prompt implies "flush the queued items".
    // Axim API seems to take single items based on current fetch, but we can do a loop.
    const remainingQueue = [];
    for (const payload of queue) {
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
           remainingQueue.push(payload);
        }
      } catch (error) {
        clearTimeout(timeoutId);
        remainingQueue.push(payload);
      }
    }
    localStorage.setItem(QUEUE_KEY, JSON.stringify(remainingQueue));
  } catch (e) {
    console.warn('Failed to flush telemetry queue', e);
  } finally {
    isFlushing = false;
  }
};

export const useTelemetry = () => {
  const { pathname } = useLocation();

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
        console.warn('Telemetry payload failed to send, queuing', error);
        enqueuePayload(payload);
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
        console.warn('Telemetry payload failed to send, queuing', error);
        enqueuePayload(payload);
      }
    })();
  };

  return { trackEvent };
};
