const fs = require('fs');

let content = fs.readFileSync('functions/api/telemetry.js', 'utf8');

// 1. Add size limit validation
content = content.replace(
  '// Attempt to read the payload',
  `// Enforce payload size limit (< 32KB)
    const contentLength = request.headers.get('content-length');
    if (contentLength && parseInt(contentLength, 10) > 32768) {
      return new Response(JSON.stringify({ success: false, error: 'Payload too large' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Attempt to read the payload`
);

// 2. Add schema check
content = content.replace(
  '// Capture edge runtime context',
  `// Schema validation
    const isValidSchema = enrichedPayload.every(event =>
       event.event_payload &&
       event.telemetry_envelope &&
       event.telemetry_envelope.timestamp
    );
    // If strict schema validation is required for eventType, timestamp, sessionId, we check:
    // event_payload.event_type, telemetry_envelope.timestamp, telemetry_envelope.session.context_scope

    // Capture edge runtime context`
);

content = content.replace(
  '// Basic validation\n    if (!payload || !Array.isArray(payload)) {',
  `// Basic validation
    if (!payload || !Array.isArray(payload)) {`
);

content = content.replace(
  `// Verify Cloudflare environment bindings
    if (!env || (!env.TELEMETRY_KV && !env.ANALYTICS)) {
      // Fallback to structured JSON console.log streaming
      console.log(JSON.stringify({ type: "edge_telemetry_log", count: enrichedPayload.length, edge_context: edgeContext, data: enrichedPayload }));

      return new Response(JSON.stringify({
        status: "queued_locally",
        timestamp: Date.now()
      }), {
        status: 202,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }

    return new Response(JSON.stringify({
        status: "accepted",
        mode: "production",
        receivedAt: edgeContext.edge_timestamp,
        edgeRegion: edgeContext.country,
        batchCount: enrichedPayload.length
    }), { status: 202, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });`,
  `// Verify Cloudflare environment bindings
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
    }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });`
);

content = content.replace(
    "return new Response('Bad Request: Expected array of events', { status: 400, headers: corsHeaders });",
    "return new Response(JSON.stringify({ success: false, error: 'Expected array of events' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });"
);

content = content.replace(
    "return new Response('Bad Request: Invalid JSON', { status: 400, headers: corsHeaders });",
    "return new Response(JSON.stringify({ success: false, error: 'Invalid JSON' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });"
);

content = content.replace(
    "return new Response(JSON.stringify({ error: 'Internal Server Error' }), {",
    "return new Response(JSON.stringify({ success: false, error: 'Internal Server Error' }), {"
);

fs.writeFileSync('functions/api/telemetry.js', content);
