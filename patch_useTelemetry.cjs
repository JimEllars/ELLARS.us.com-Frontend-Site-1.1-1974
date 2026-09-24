const fs = require('fs');
let content = fs.readFileSync('src/hooks/useTelemetry.js', 'utf8');

// Use navigator.sendBeacon inside handleUnload instead of fetch
content = content.replace(
`    const handleUnload = () => {
      try {
        const queue = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
        if (queue.length > 0) {
          // If we had a transmission inflight that we couldn't resolve before unload,
          // merge it back into the persistent queue for the next session
          let finalQueue = [...queue];
          if (inFlightPayloads.current.length > 0) {
              const inFlightIds = new Set(inFlightPayloads.current.map(p => p.telemetry_envelope?.idempotency_key));
              const deduplicatedQueue = finalQueue.filter(p => !inFlightIds.has(p.telemetry_envelope?.idempotency_key));
              finalQueue = [...inFlightPayloads.current, ...deduplicatedQueue];
          }

          const prunedQueue = prunePayloadArray(finalQueue);

          if (prunedQueue.length > 0) {
            const apiKey = import.meta.env.VITE_AXIM_API_KEY;
            const apiUrl = import.meta.env.VITE_AXIM_API_URL || '/api/telemetry';

            if (apiKey) {
               fetch(apiUrl, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': \`Bearer \${apiKey}\`,
                    'Accept': 'application/json',
                    'X-Project-Scope': 'ELLARS_FRONTEND'
                  },
                  body: JSON.stringify(prunedQueue),
                  keepalive: true
                }).catch(() => {});
            }

            localStorage.setItem(QUEUE_KEY, JSON.stringify([]));
          } else {
             localStorage.setItem(QUEUE_KEY, JSON.stringify(prunedQueue));
          }
        }
      } catch (e) {
        // Silent
      }
    };`,
`    const handleUnload = () => {
      try {
        const queue = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
        if (queue.length > 0) {
          // If we had a transmission inflight that we couldn't resolve before unload,
          // merge it back into the persistent queue for the next session
          let finalQueue = [...queue];
          if (inFlightPayloads.current.length > 0) {
              const inFlightIds = new Set(inFlightPayloads.current.map(p => p.telemetry_envelope?.idempotency_key));
              const deduplicatedQueue = finalQueue.filter(p => !inFlightIds.has(p.telemetry_envelope?.idempotency_key));
              finalQueue = [...inFlightPayloads.current, ...deduplicatedQueue];
          }

          const prunedQueue = prunePayloadArray(finalQueue);

          if (prunedQueue.length > 0) {
            const apiKey = import.meta.env.VITE_AXIM_API_KEY;
            const apiUrl = import.meta.env.VITE_AXIM_API_URL || '/api/telemetry';

            if (apiKey && navigator.sendBeacon) {
               const blob = new Blob([JSON.stringify(prunedQueue)], { type: 'application/json' });
               navigator.sendBeacon(apiUrl, blob);
            } else if (apiKey) {
               fetch(apiUrl, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': \`Bearer \${apiKey}\`,
                    'Accept': 'application/json',
                    'X-Project-Scope': 'ELLARS_FRONTEND'
                  },
                  body: JSON.stringify(prunedQueue),
                  keepalive: true
                }).catch(() => {});
            }

            localStorage.setItem(QUEUE_KEY, JSON.stringify([]));
          } else {
             localStorage.setItem(QUEUE_KEY, JSON.stringify(prunedQueue));
          }
        }
      } catch (e) {
        // Silent
      }
    };`
);

// Prevent infinite loop on 5xx errors by capping max retries explicitly inside the attempt condition
// Note: MAX_RETRIES is already checked (`attempt < MAX_RETRIES`), but we ensure backoff limits

fs.writeFileSync('src/hooks/useTelemetry.js', content);
