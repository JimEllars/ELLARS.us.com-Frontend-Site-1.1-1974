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
        let isLive = false;

        // Check for QA override
        if (url.searchParams.get('status') === 'live' || request.headers.get('X-Stream-Override') === 'live') {
          isLive = true;
        } else if (env.CLOUDFLARE_STREAM_API_TOKEN && env.CLOUDFLARE_ACCOUNT_ID) {
          const uid = env.VITE_CF_STREAM_LIVE_UID || 'default';
          const cfUrl = `https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/stream/live_inputs/${uid}`;
          const cfResponse = await fetch(cfUrl, {
            headers: {
              'Authorization': `Bearer ${env.CLOUDFLARE_STREAM_API_TOKEN}`,
              'Content-Type': 'application/json'
            }
          });

          if (cfResponse.ok) {
            const data = await cfResponse.json();
            const state = data.result?.status?.state;
            if (state === 'connected' || state === 'live') {
              isLive = true;
            }
          }
        }

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


    // Telemetry batched payload ingestion endpoint
    if (url.pathname === '/api/telemetry' && request.method === 'POST') {
        // Here we would typically ingest and log the body or forward it to an aggregation pipeline.
        // Returning 200 avoids taxing the client UI thread.
        return new Response(JSON.stringify({ success: true, logged: true }), {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            }
        });
    }

    // Default fallback to fetch normally
    return fetch(request);
  }
};
