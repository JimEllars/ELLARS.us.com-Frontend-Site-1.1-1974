export async function onRequest(context) {
  const { request, env } = context;

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, Accept, X-Project-Scope',
  };

  const origin = request.headers.get('Origin');
  const allowedOrigins = ['https://ellars.us.com', 'https://www.ellars.us.com', 'https://ellars.io', 'http://localhost:5173', 'http://127.0.0.1:5173'];

  if (origin && allowedOrigins.includes(origin)) {
    corsHeaders['Access-Control-Allow-Origin'] = origin;
  }

  // Handle CORS preflight requests
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405, headers: corsHeaders });
  }

  try {
    // Attempt to read the payload
    let payload;
    try {
        payload = await request.json();
    } catch(e) {
        return new Response('Bad Request: Invalid JSON', { status: 400, headers: corsHeaders });
    }

    // Basic validation
    if (!payload || !Array.isArray(payload)) {
      // It might be a single payload object from standard fetch
      if(typeof payload === 'object') {
          payload = [payload];
      } else {
        return new Response('Bad Request: Expected array of events', { status: 400, headers: corsHeaders });
      }
    }

    // Verify Cloudflare environment bindings
    if (!env || (!env.TELEMETRY_KV && !env.ANALYTICS)) {
      // Fallback to structured JSON console.log streaming
      console.log(JSON.stringify({ type: "edge_telemetry_log", count: payload.length, data: payload }));

      return new Response(JSON.stringify({ status: "accepted", mode: "edge_log" }), {
        status: 202,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }

    // Example: Forwarding to AXiM Core (pseudo-code)
    /*
    const aximApiKey = env.AXIM_API_KEY;
    const aximUrl = env.AXIM_API_URL || 'https://api.axim.us.com/v1/telemetry';

    if (aximApiKey) {
       await fetch(aximUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${aximApiKey}`
          },
          body: JSON.stringify(payload)
       });
    }
    */

    return new Response(null, { status: 204, headers: corsHeaders });

  } catch (error) {
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}
