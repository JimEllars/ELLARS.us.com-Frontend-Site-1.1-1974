export async function onRequest(context) {
  const { request, env } = context;

  const corsHeaders = {
    'Cache-Control': 'no-store, private',
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
    // Enforce payload size limit (< 32KB)
    const contentLength = request.headers.get('content-length');
    if (contentLength && parseInt(contentLength, 10) > 32768) {
      return new Response(JSON.stringify({ success: false, error: 'Payload too large' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Attempt to read the payload
    let payload;
    try {
        payload = await request.json();
    } catch(e) {
        if (!env || (!env.TELEMETRY_KV && !env.ANALYTICS)) {
            console.log(JSON.stringify({ type: "edge_telemetry_log_error", error: "invalid_json" }));
            return new Response(JSON.stringify({ status: "queued_locally", timestamp: Date.now() }), { status: 202, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
        return new Response(JSON.stringify({ success: false, error: 'Invalid JSON' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Basic validation
    if (!payload || !Array.isArray(payload)) {
      if(typeof payload === 'object') {
          payload = [payload];
      } else {
        return new Response(JSON.stringify({ success: false, error: 'Expected array of events' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
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

    // Schema validation
    const isValidSchema = enrichedPayload.every(event =>
       event.event_payload &&
       event.event_payload.event_type &&
       event.telemetry_envelope &&
       event.telemetry_envelope.timestamp &&
       event.telemetry_envelope.session
    );

    if (!isValidSchema) {
        return new Response(JSON.stringify({ success: false, error: 'Invalid payload schema: expected eventType, timestamp, and session data' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }


    // Verify Cloudflare environment bindings
    if (!env || (!env.TELEMETRY_KV && !env.ANALYTICS)) {
      // Fallback to structured JSON console.log streaming
      console.log(JSON.stringify({ type: "edge_telemetry_log", count: enrichedPayload.length, edge_context: edgeContext, data: enrichedPayload }));

      return new Response(JSON.stringify({
        success: true,
        count: enrichedPayload.length,
        status: "queued_locally",
        timestamp: Date.now()
      }), {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }

    return new Response(JSON.stringify({
        success: true,
        count: enrichedPayload.length,
        status: "accepted",
        mode: "production",
        receivedAt: edgeContext.edge_timestamp,
        edgeRegion: edgeContext.country,
    }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: 'Internal Server Error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}
