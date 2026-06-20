import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export const useTelemetry = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    const hasConsented = localStorage.getItem('ellars_privacy_consent');
    if (hasConsented !== 'true') {
      return;
    }

    const sendTelemetry = async () => {
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
          body: JSON.stringify({
            event: 'page_view',
            path: pathname,
            timestamp: new Date().toISOString(),
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);
      } catch (error) {
        console.warn('Telemetry payload failed to send', error);
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
          body: JSON.stringify({
            event: eventName,
            data: eventData,
            timestamp: new Date().toISOString(),
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);
      } catch (error) {
        console.warn('Telemetry payload failed to send', error);
      }
    })();
  };

  return { trackEvent };
};
