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
        // Implement telemetry dispatch
        const apiKey = import.meta.env.VITE_AXIM_API_KEY;
        const apiUrl = import.meta.env.VITE_AXIM_API_URL || 'https://api.axim.us.com/v1/telemetry';

        if (!apiKey) {
          // Fail silently if key is not provided (e.g. dev environment)
          return;
        }

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
        });
      } catch (error) {
        // Fail silently on timeouts or 500 errors without triggering GlobalErrorBoundary
        console.warn('Telemetry payload failed to send', error);
      }
    };

    sendTelemetry();
  }, [pathname]);

  const trackEvent = async (eventName, eventData = {}) => {
    const hasConsented = localStorage.getItem('ellars_privacy_consent');
    if (hasConsented !== 'true') {
      return;
    }

    try {
      const apiKey = import.meta.env.VITE_AXIM_API_KEY;
      const apiUrl = import.meta.env.VITE_AXIM_API_URL || 'https://api.axim.us.com/v1/telemetry';

      if (!apiKey) return;

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
      });
    } catch (error) {
      console.warn('Telemetry payload failed to send', error);
    }
  };

  return { trackEvent };
};
