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
      if(typeof payload === 'object') {
          payload = [payload];
      } else {
        return new Response('Bad Request: Expected array of events', { status: 400, headers: corsHeaders });
      }
    }

    // Capture edge runtime context
    const edgeContext = {
      cf_ray: request.headers.get('cf-ray') || 'unknown',
      ip_hash: request.headers.get('cf-connecting-ip') ? request.headers.get('cf-connecting-ip').substring(0, 16) + '...' : 'unknown',
      country: request.headers.get('cf-ipcountry') || 'unknown',
      user_agent: request.headers.get('user-agent') || 'unknown',
      edge_timestamp: new Date().toISOString()
    };

    // Attach edge context to each payload event
    const enrichedPayload = payload.map(event => {
       if (event.event_payload) {
          event.event_payload.edge_context = edgeContext;
       }
       return event;
    });


    // Verify Cloudflare environment bindings
    if (!env || (!env.TELEMETRY_KV && !env.ANALYTICS)) {
      // Fallback to structured JSON console.log streaming
      console.log(JSON.stringify({ type: "edge_telemetry_log", count: enrichedPayload.length, edge_context: edgeContext, data: enrichedPayload }));

      return new Response(JSON.stringify({ status: "accepted", mode: "edge_log" }), {
        status: 202,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }

    return new Response(null, { status: 204, headers: corsHeaders });

  } catch (error) {
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}
