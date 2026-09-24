const fs = require('fs');
let content = fs.readFileSync('functions/api/telemetry.js', 'utf8');

// Fix the order of enrichedPayload vs schema validation (enrichedPayload is not defined yet where I placed the schema validation)
content = content.replace(
`    // Schema validation
    const isValidSchema = enrichedPayload.every(event =>
       event.event_payload &&
       event.telemetry_envelope &&
       event.telemetry_envelope.timestamp
    );
    // If strict schema validation is required for eventType, timestamp, sessionId, we check:
    // event_payload.event_type, telemetry_envelope.timestamp, telemetry_envelope.session.context_scope

    // Capture edge runtime context
    const edgeContext = {`,
`    // Capture edge runtime context
    const edgeContext = {`
);

content = content.replace(
`    // Attach edge context to each payload event
    const enrichedPayload = payload.map(event => {
       if (event.event_payload) {
          event.event_payload.edge_context = edgeContext;
       }
       return event;
    });`,
`    // Attach edge context to each payload event
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
    }`
);

fs.writeFileSync('functions/api/telemetry.js', content);
