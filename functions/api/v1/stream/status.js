export async function onRequestGet({ env }) {
  return new Response(JSON.stringify({
    isLiveStreamActive: false,
    streamEmbedUrl: null,
    timestamp: new Date().toISOString()
  }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=15, stale-while-revalidate=30"
    }
  });
}
