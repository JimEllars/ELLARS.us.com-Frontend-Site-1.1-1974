export async function onRequestGet(context) {
  const { env } = context;

  // Set up headers for edge caching and CORS
  const headers = {
    'Content-Type': 'application/json',
    'Cache-Control': 'public, s-maxage=15, stale-while-revalidate=30',
    'Access-Control-Allow-Origin': '*',
  };

  const streamId = env.VITE_CF_STREAM_LIVE_UID;
  const token = env.CF_STREAM_API_TOKEN;
  const accountId = env.CF_ACCOUNT_ID;

  // Fallback if environment variables are not properly set
  if (!streamId || !token || !accountId) {
    // We will just return false if not configured in the environment
    return new Response(JSON.stringify({ isLiveStreamActive: false }), {
      status: 200,
      headers
    });
  }

  try {
    const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/stream/live_inputs/${streamId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      const data = await response.json();
      const isActive = data?.result?.status?.current?.state === 'connected';

      return new Response(JSON.stringify({ isLiveStreamActive: isActive }), {
        status: 200,
        headers
      });
    } else {
      console.warn('Failed to fetch stream status from Cloudflare API:', response.status);
      return new Response(JSON.stringify({ isLiveStreamActive: false }), {
        status: 200,
        headers
      });
    }
  } catch (error) {
    console.error('Error fetching stream status:', error);
    return new Response(JSON.stringify({ isLiveStreamActive: false }), {
      status: 200,
      headers
    });
  }
}
