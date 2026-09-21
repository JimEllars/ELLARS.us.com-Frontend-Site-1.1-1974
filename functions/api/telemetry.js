export async function onRequest(context) {
  const { request } = context;

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*', // Adjust based on origin checking
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, Accept, X-Project-Scope',
  };

  // Handle CORS preflight requests
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405, headers: corsHeaders });
  }

  try {
    const origin = request.headers.get('Origin');
    const allowedOrigins = ['https://ellars.us.com', 'https://www.ellars.us.com', 'https://ellars.io', 'http://localhost:5173', 'http://127.0.0.1:5173'];

    if (origin && allowedOrigins.includes(origin)) {
      corsHeaders['Access-Control-Allow-Origin'] = origin;
    }

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

    // NOTE: Here we would forward the payload to the AXiM Core API.
    // For now, we simulate successful ingestion by returning 200/204 to the client
    // This allows the SPA to clear its local queue.

    // Example: Forwarding to AXiM Core (pseudo-code)
    /*
    const aximApiKey = context.env.AXIM_API_KEY;
    const aximUrl = context.env.AXIM_API_URL || 'https://api.axim.us.com/v1/telemetry';

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
