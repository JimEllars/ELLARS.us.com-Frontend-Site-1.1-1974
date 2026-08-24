export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Check if this is the cache purge route
    if (url.pathname === '/api/v1/cache/purge-tag' && request.method === 'POST') {
      const purgeTag = request.headers.get('X-Purge-Tag');
      const telemetry = request.headers.get('X-Client-Telemetry');

      // Verify basic headers are present
      if (purgeTag === 'ellars-intel-feed' && telemetry === 'AXiM-Frontend-v1') {

        // We use ctx.waitUntil to process the purge asynchronously without blocking the response
        ctx.waitUntil(
          (async () => {
            try {
              // Note: Real implementation would use Cloudflare API to purge cache by tag here
              // e.g., await fetch('https://api.cloudflare.com/client/v4/zones/.../purge_cache', { ... })
              console.log(`[Edge] Successfully queued purge for tag: ${purgeTag}`);
            } catch (err) {
              console.error('[Edge] Purge execution failed:', err);
            }
          })()
        );

        return new Response(JSON.stringify({ success: true, message: 'Cache purge signal received.' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      return new Response(JSON.stringify({ error: 'Unauthorized or missing headers' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Stream status route
    if (url.pathname === '/api/v1/stream/status' && request.method === 'GET') {
      try {
        // Here we would typically fetch the live input status from Cloudflare Stream API using env.CF_ACCOUNT_ID / API keys.
        // For now, we mock the response or determine based on a KV or static edge flag.

        // Simulating the check
        const isLive = false; // By default offline. In production, this checks the actual CF input.

        const responseData = {
          isLiveStreamActive: isLive,
          timestamp: new Date().toISOString()
        };

        return new Response(JSON.stringify(responseData), {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'public, s-maxage=30, max-age=15', // 30-second edge cache
            'Access-Control-Allow-Origin': '*' // Adjust if needed
          }
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: 'Failed to fetch stream status' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    // Default fallback to fetch normally
    return fetch(request);
  }
};
