/**
 * Cloudflare Pages Function: /api/telemetry
 */
export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Project-Scope",
      "Access-Control-Max-Age": "86400",
    },
  });
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const corsHeaders = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
  };

  try {
    const payload = await request.json();
    const records = Array.isArray(payload) ? payload : [payload];
    const timestamp = new Date().toISOString();
    const clientIp = request.headers.get("cf-connecting-ip") || "unknown";
    const country = request.headers.get("cf-ipcountry") || "unknown";
    const userAgent = request.headers.get("user-agent") || "unknown";

    const sanitizedRecords = records.map((entry) => ({
      ...entry,
      receivedAt: timestamp,
      clientIp,
      country,
      userAgent,
    }));

    // If Cloudflare KV binding is available, persist events
    if (env && env.TELEMETRY_KV) {
      const batchKey = `telemetry:${timestamp}:${crypto.randomUUID()}`;
      await env.TELEMETRY_KV.put(batchKey, JSON.stringify(sanitizedRecords), {
        expirationTtl: 60 * 60 * 24 * 30, // 30-day retention
      });
    }

    // D1 database insertion
    if (env && env.DB) {
      try {
        const stmt = env.DB.prepare(
          "INSERT INTO telemetry (id, event_type, timestamp, session_id, payload, client_ip, country, user_agent, received_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)"
        );
        const batch = sanitizedRecords.map((record) => {
          const id = record.telemetry_envelope?.idempotency_key || crypto.randomUUID();
          const eventType = record.event_payload?.event_type || 'unknown';
          const recordTimestamp = record.telemetry_envelope?.timestamp || timestamp;
          const sessionId = record.telemetry_envelope?.session?.context_scope || null;
          const payloadStr = JSON.stringify(record);

          return stmt.bind(
            id,
            eventType,
            recordTimestamp,
            sessionId,
            payloadStr,
            clientIp,
            country,
            userAgent,
            timestamp
          );
        });
        await env.DB.batch(batch);
      } catch (dbError) {
        console.error("D1 Insert Error:", dbError);
      }
    }

    // Analytics Engine insertion
    if (env && env.ANALYTICS) {
      try {
        sanitizedRecords.forEach(record => {
           env.ANALYTICS.writeDataPoint({
             blobs: [
               record.event_payload?.event_type || 'unknown',
               record.telemetry_envelope?.session?.context_scope || 'unknown',
               country,
               record.event_payload?.metadata?.current_route || 'unknown'
             ],
             doubles: [
                1.0 // Count
             ],
             indexes: [
               clientIp
             ]
           });
        });
      } catch (analyticsError) {
        console.error("Analytics Write Error:", analyticsError);
      }
    }

    // Async Upstream Dispatch
    if (context.waitUntil) {
      context.waitUntil(
        fetch('https://api.axim.us.com/api/v1/telemetry/ingest', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Project-Scope': 'ELLARS_FRONTEND',
            'Authorization': request.headers.get('Authorization') || ''
          },
          body: JSON.stringify(sanitizedRecords)
        }).then(async res => {
          if (!res.ok) {
             console.error("Upstream telemetry dispatch failed:", res.status);
          }
        }).catch(err => {
          console.error("Upstream telemetry dispatch error:", err);
        })
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed: sanitizedRecords.length,
        timestamp,
      }),
      { status: 200, headers: corsHeaders }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({
        success: false,
        error: "Invalid payload format or telemetry ingestion failure",
      }),
      { status: 400, headers: corsHeaders }
    );
  }
}
