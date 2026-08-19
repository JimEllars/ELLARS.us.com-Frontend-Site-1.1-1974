export default {
  async fetch(request, env, ctx) {
    // Clone the request so we can read the headers/body without consuming the original
    const reqClone = request.clone();

    // Check for the custom telemetry header we inject on errors
    const telemetryHeader = reqClone.headers.get('X-Client-Telemetry');

    if (telemetryHeader === 'AXiM-Frontend-v1') {
      // Use waitUntil to process the telemetry asynchronously without blocking the main response
      ctx.waitUntil(
        (async () => {
          try {
            // We only care about logging POST bodies that have error payloads
            if (reqClone.method === 'POST') {
              const body = await reqClone.json();

              // Here we would typically send this to Cloudflare Analytics Engine
              // For now, we log it so that 'wrangler tail' captures the structured error
              console.log(JSON.stringify({
                level: 'error',
                source: 'edge_telemetry',
                path: new URL(request.url).pathname,
                payload: body,
                timestamp: new Date().toISOString()
              }));
            }
          } catch (e) {
            console.error('Edge telemetry interception failed:', e);
          }
        })()
      );
    }

    // Pass the original request through transparently
    return fetch(request);
  },
};
