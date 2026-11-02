/**
 * Cloudflare Pages Function: /api/telemetry
 *
 * Ingress for client-side telemetry. Three independent sinks:
 *   KV        — raw batch retention, 30 days
 *   D1        — queryable rows (telemetry table)
 *   Analytics   — Workers Analytics Engine time-series
 *
 * Each sink is guarded on its own. One unbound or failing binding must never
 * suppress the others, and the handler must always tell the client which sinks
 * actually accepted the batch. A 200 with no storage behind it is worse than an
 * error, because nothing downstream can distinguish it from success.
 *
 * Privacy: the caller's IP is hashed with a per-deployment salt before it
 * reaches any sink, and the User-Agent is not stored. Country is retained
 * (coarse, non-identifying).
 */

const MAX_RECORDS = 50;
const MAX_BODY_BYTES = 64 * 1024;

const ALLOWED_ORIGINS = new Set([
  "https://ellars.us.com",
  "https://www.ellars.us.com",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
]);

function corsHeaders(request) {
  const origin = request.headers.get("Origin") || "";
  const headers = {
    "Content-Type": "application/json",
    "Vary": "Origin",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Project-Scope",
    "Access-Control-Max-Age": "86400",
  };
  if (ALLOWED_ORIGINS.has(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
  }
  return headers;
}

/**
 * Salted, truncated SHA-256 of the client IP. Not reversible, and stable
 * enough to count distinct-origin traffic for a single day without retaining
 * an identifier for a person.
 */
async function hashIp(ip, salt) {
  if (!ip || ip === "unknown") return null;
  const data = new TextEncoder().encode(`${salt}:${ip}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .slice(0, 16)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function onRequestOptions({ request }) {
  return new Response(null, { status: 204, headers: corsHeaders(request) });
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const headers = corsHeaders(request);

  let records;
  let bodyBytes = 0;
  try {
    const raw = await request.text();
    bodyBytes = raw.length;
    if (bodyBytes > MAX_BODY_BYTES) {
      return new Response(
        JSON.stringify({ success: false, error: "payload_too_large", limit_bytes: MAX_BODY_BYTES }),
        { status: 413, headers }
      );
    }
    const parsed = JSON.parse(raw);
    records = Array.isArray(parsed) ? parsed : [parsed];
  } catch {
    return new Response(
      JSON.stringify({ success: false, error: "invalid_json" }),
      { status: 400, headers }
    );
  }

  if (records.length === 0) {
    return new Response(
      JSON.stringify({ success: false, error: "empty_batch" }),
      { status: 400, headers }
    );
  }

  const accepted = records.slice(0, MAX_RECORDS).filter(
    (entry) => entry && typeof entry === "object"
  );

  if (accepted.length === 0) {
    return new Response(
      JSON.stringify({ success: false, error: "no_valid_records" }),
      { status: 400, headers }
    );
  }

  const receivedAt = new Date().toISOString();
  const country = request.headers.get("cf-ipcountry") || "unknown";
  const ipHash = await hashIp(
    request.headers.get("cf-connecting-ip") || "unknown",
    env?.TELEMETRY_SALT || "ellars-telemetry"
  );

  const sanitized = accepted.map((entry) => ({ ...entry, receivedAt, country }));

  const sinks = { kv: "skipped", d1: "skipped", analytics: "skipped" };

  // --- Sink 1: KV (raw batch retention) ------------------------------------
  if (env?.TELEMETRY_KV) {
    try {
      await env.TELEMETRY_KV.put(
        `telemetry:${receivedAt}:${crypto.randomUUID()}`,
        JSON.stringify(sanitized),
        { expirationTtl: 60 * 60 * 24 * 30 }
      );
      sinks.kv = "ok";
    } catch (error) {
      console.error("telemetry: kv sink failed", error?.message);
      sinks.kv = "error";
    }
  } else {
    sinks.kv = "unbound";
  }

  // --- Sink 2: D1 (queryable rows) -----------------------------------------
  if (env?.DB) {
    try {
      const stmt = env.DB.prepare(
        "INSERT INTO telemetry (id, event_type, timestamp, session_id, payload, client_ip, country, user_agent, received_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)"
      );
      const batch = sanitized.map((record) => {
        const envelope = record.telemetry_envelope || {};
        const eventPayload = record.event_payload || {};
        return stmt.bind(
          envelope.idempotency_key || crypto.randomUUID(),
          eventPayload.event_type || "unknown",
          envelope.timestamp || receivedAt,
          envelope.session?.context_scope || null,
          JSON.stringify(record),
          ipHash,
          country,
          null, // user_agent deliberately not stored
          receivedAt
        );
      });
      const results = await env.DB.batch(batch);
      const failed = Array.isArray(results)
        ? results.filter((result) => result?.success === false).length
        : 0;
      sinks.d1 = failed === 0 ? "ok" : `partial:${failed}`;
    } catch (error) {
      console.error("telemetry: d1 sink failed", error?.message);
      sinks.d1 = "error";
    }
  } else {
    sinks.d1 = "unbound";
  }

  // --- Sink 3: Analytics Engine --------------------------------------------
  if (env?.ANALYTICS) {
    try {
      for (const record of sanitized) {
        const envelope = record.telemetry_envelope || {};
        const eventPayload = record.event_payload || {};
        env.ANALYTICS.writeDataPoint({
          blobs: [
            eventPayload.event_type || "unknown",
            envelope.session?.context_scope || "unknown",
            country,
            eventPayload.metadata?.current_route || "unknown",
          ],
          doubles: [1.0],
          indexes: [ipHash || "unknown"],
        });
      }
      sinks.analytics = "ok";
    } catch (error) {
      console.error("telemetry: analytics sink failed", error?.message);
      sinks.analytics = "error";
    }
  } else {
    sinks.analytics = "unbound";
  }

  const degraded = Object.values(sinks).every((state) => state !== "ok");

  return new Response(
    JSON.stringify({
      success: true,
      accepted: sanitized.length,
      skipped: Math.max(0, records.length - accepted.length),
      received_at: receivedAt,
      degraded,
      sinks,
    }),
    { status: 202, headers: { ...headers, "Cache-Control": "no-store" } }
  );
}

export { MAX_BODY_BYTES, MAX_RECORDS, corsHeaders, hashIp, ALLOWED_ORIGINS };
