/**
 * Cloudflare Pages Function: /api/telemetry
 */
export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
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

    const sanitizedRecords = records.map((entry) => ({
      ...entry,
      receivedAt: timestamp,
      clientIp: request.headers.get("cf-connecting-ip") || "unknown",
      country: request.headers.get("cf-ipcountry") || "unknown",
      userAgent: request.headers.get("user-agent") || "unknown",
    }));

    // If Cloudflare KV binding is available, persist events
    if (env && env.TELEMETRY_KV) {
      const batchKey = `telemetry:${timestamp}:${crypto.randomUUID()}`;
      await env.TELEMETRY_KV.put(batchKey, JSON.stringify(sanitizedRecords), {
        expirationTtl: 60 * 60 * 24 * 30, // 30-day retention
      });
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
