import { enqueuePayload, generateUUID } from '@/hooks/useTelemetry';

const WP_API_URL = import.meta.env.VITE_WP_API_URL || 'https://wp.ellars.us.com/wp-json/wp/v2';

// Fallback data for development and reliability
const FALLBACK_POSTS = [
  {
    id: 101,
    slug: 'siphon-economy',
    title: { rendered: "The Siphon Economy Is Bleeding Us Dry" },
    excerpt: { rendered: "How mega-corporations exploit regional geography and labor pools without reinvesting in the communities that sustain them." },
    content: { rendered: "<p>The mathematical framework required to stop the extraction of local wealth...</p>" },
    date: '2025-09-15T10:00:00',
    acf: { episode_number: "045", read_time: "12 Min Read", category_label: "Dispatch" },
    _embedded: {}
  },
  {
    id: 102,
    slug: 'california-floor',
    title: { rendered: "Post-Labor Economics: The California Floor" },
    excerpt: { rendered: "As AI and automation accelerate, traditional wage models will fail. We must replace bloated welfare with algorithmic stability." },
    content: { rendered: "<p>A modernized Negative Income Tax for national infrastructure...</p>" },
    date: '2025-09-12T14:30:00',
    acf: { episode_number: "044", read_time: "18 Min Read", category_label: "Business Briefing" },
    _embedded: {}
  },
  {
    id: 103,
    slug: 'politicians-future',
    title: { rendered: "Why Politicians Cannot Build The Future" },
    excerpt: { rendered: "The era of the career orator is over. The logistical challenges of the 2030s require leaders who have actually scaled systems." },
    content: { rendered: "<p>Scaling private sector rigor to community leadership...</p>" },
    date: '2025-09-10T09:15:00',
    acf: { episode_number: "043", read_time: "9 Min Read", category_label: "Dispatch" },
    _embedded: {}
  }
];




function logApiErrorToTelemetry(url, error) {
  try {
    if (url.includes('/api/telemetry') || url.includes('v1/telemetry')) {
      if (import.meta.env.DEV) {
        console.warn('Telemetry endpoint failed, skipping telemetry logging loop.');
      } else {
        localStorage.setItem('telemetry_error_flag', 'true');
      }
      return;
    }
    const payload = {
      telemetry_envelope: {
        project_id: 'ELLARS_FRONTEND',
        environment: 'production',
        timestamp: new Date().toISOString(),
        idempotency_key: generateUUID(),
        session: { context_scope: 'public_facing_umbrella' }
      },
      event_payload: {
        event_type: 'API_FETCH_ERROR',
        severity: 'HIGH',
        component_origin: 'API_UTILITY',
        error_message: error.message || 'Unknown API Error',
        stack_trace: error.stack || '',
        metadata: {
          url: url,
          network_status: (typeof navigator !== 'undefined' && navigator.onLine) ? 'online' : 'offline',
        }
      }
    };
    enqueuePayload(payload);
  } catch(e) {
    // Silent
  }
}

async function fetchWithRetry(url, options = {}, retries = 3, backoff = 300) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 seconds timeout

    const defaultHeaders = {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    };

    const fetchOptions = {
      ...options,
      headers: {
        ...defaultHeaders,
        ...(options.headers || {})
      },
      signal: controller.signal
    };

    const response = await fetch(url, fetchOptions);
    clearTimeout(timeoutId);

    if (!response.ok) {
      console.error(`[API Error] HTTP ${response.status} from ${url}`);
      const error = new Error("Our systems are currently experiencing high traffic. We are utilizing fallback protocols to serve you.");
      error.status = response.status;
      throw error;
    }

    return response;
  } catch (error) {
    if (retries > 0) {
      console.warn(`Retrying fetch to ${url} (${retries} retries left) after ${backoff}ms...`);
      await new Promise(resolve => setTimeout(resolve, backoff));
      return fetchWithRetry(url, options, retries - 1, backoff * 2);
    } else {
      let finalError = error;
      if (error.name === 'AbortError') {
        finalError = new Error('API request timed out');
      } else if (typeof navigator !== 'undefined' && !navigator.onLine) {
        finalError = new Error('Network offline');
      }
      logApiErrorToTelemetry(url, finalError);
      return {
        ok: false,
        status: finalError.status || 500,
        isError: true,
        message: finalError.message || 'API request failed',
        json: async () => ({ isError: true, message: finalError.message || 'API request failed' })
      };
    }
  }
}

export async function getLatestPosts(limit = 10, categoryId = null) {
  const cacheKey = `posts-${limit}-${categoryId}`;

  try {
    let url = `${WP_API_URL}/posts?per_page=${limit}&_embed`;
    if (categoryId) url += `&categories=${categoryId}`;
    
    // Check sessionStorage for cache
    const cachedItem = sessionStorage.getItem(cacheKey);
    let cachedData = null;
    const now = Date.now();
    const CACHE_DURATION = 1000 * 60 * 5; // 5 minutes

    if (cachedItem) {
      try {
        const parsed = JSON.parse(cachedItem);
        if (now - parsed.timestamp < CACHE_DURATION) {
          cachedData = parsed.data;
        }
      } catch (e) {
        // Silent
      }
    }

    const networkFetch = fetchWithRetry(url, {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      }
    }).then(async res => {
      const data = await res.json();
      if (data.isError) return FALLBACK_POSTS.slice(0, limit);
      try {
        const oldDataString = sessionStorage.getItem(cacheKey);
        const newDataString = JSON.stringify({ data, timestamp: Date.now() });
        sessionStorage.setItem(cacheKey, newDataString);

        if (oldDataString) {
          const oldData = JSON.parse(oldDataString);
          if (JSON.stringify(oldData.data) !== JSON.stringify(data)) {
            window.dispatchEvent(new CustomEvent('swr-update', { detail: { endpoint: 'posts', newData: data } }));
          }
        }
      } catch (e) { /* silent */ }
      return data;
    });

    if (cachedData) {
      // Revalidate in background without awaiting
      networkFetch.catch(() => { /* handle background error silently */ });
      return cachedData;
    }

    return await networkFetch;
  } catch (error) {
    console.error("[AXiM Core: Routing Error] Failed to fetch article payload:", error);
    console.warn("API Error, utilizing fallback protocol:", error.message);
    return FALLBACK_POSTS.slice(0, limit);
  }
}

export async function getPostBySlug(slug) {
  const cacheKey = `post-${slug}`;

  try {
    // Check sessionStorage for cache
    const cachedItem = sessionStorage.getItem(cacheKey);
    let cachedData = null;
    const now = Date.now();
    const CACHE_DURATION = 1000 * 60 * 5; // 5 minutes

    if (cachedItem) {
      try {
        const parsed = JSON.parse(cachedItem);
        if (now - parsed.timestamp < CACHE_DURATION) {
          cachedData = parsed.data;
        }
      } catch (e) {
        // Silent
      }
    }

    const networkFetch = fetchWithRetry(`${WP_API_URL}/posts?slug=${slug}&_embed`, {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      }
    }).then(async res => {
      const data = await res.json();
      if (data.isError) return data;
      const result = data[0] || null;
      try {
        sessionStorage.setItem(cacheKey, JSON.stringify({ data: result, timestamp: Date.now() }));
      } catch (e) { /* silent */ }
      return result;
    });

    if (cachedData) {
      networkFetch.catch(() => { /* silent */ });
      return cachedData;
    }

    return await networkFetch;
  } catch (error) {
    console.error("[AXiM Core: Routing Error] Failed to fetch article payload:", error);
    console.warn("API Error, utilizing fallback protocol for post:", error.message);
    return { isError: true, message: error.message };
  }
}

export function stripHtml(html) {
  if (!html) return '';
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return doc.body.textContent || "";
}

export function formatDate(dateString) {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

const SOCIAL_FALLBACK = [
  {
    id: 's1',
    isSocialError: true,
    acf: { category_label: 'SOCIAL' },
    title: { rendered: 'Spotlight Feed Unavailable' },
    excerpt: { rendered: 'The social feed is currently offline.' },
    slug: '#',
    date: new Date().toISOString(),
  }
];

export async function getSocialFeed(limit = 10) {
  const cacheKey = `social-${limit}`;

  try {
    // Check sessionStorage for cache
    const cachedItem = sessionStorage.getItem(cacheKey);
    let cachedData = null;
    const now = Date.now();
    const CACHE_DURATION = 1000 * 60 * 5; // 5 minutes

    if (cachedItem) {
      try {
        const parsed = JSON.parse(cachedItem);
        if (now - parsed.timestamp < CACHE_DURATION) {
          cachedData = parsed.data;
        }
      } catch (e) {
        // Silent
      }
    }

    const url = `${WP_API_URL.replace('/wp/v2', '/spotlight/v1')}/instagram?feed=390&per_page=${limit}`;

    const networkFetch = fetchWithRetry(url, {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      }
    }).then(async res => {
      const data = await res.json();
      if (data.isError) return SOCIAL_FALLBACK;

      const mappedData = (data.media || data).map((item, index) => ({
          id: `social-${index}-${item.id || index}`,
          slug: item.permalink || '#',
          title: { rendered: "Social Update" },
          excerpt: { rendered: item.caption || '' },
          date: item.timestamp || new Date().toISOString(),
          acf: { category_label: "SOCIAL", read_time: "1 Min" },
          _embedded: {},
          isExternal: true, // Marker for social links
          externalUrl: item.permalink,
          imageUrl: item.media_url || item.thumbnail_url || null
      }));

      try {
        const oldDataString = sessionStorage.getItem(cacheKey);
        const newDataString = JSON.stringify({ data: mappedData, timestamp: Date.now() });
        sessionStorage.setItem(cacheKey, newDataString);

        if (oldDataString) {
          const oldData = JSON.parse(oldDataString);
          if (JSON.stringify(oldData.data) !== JSON.stringify(mappedData)) {
            window.dispatchEvent(new CustomEvent('swr-update', { detail: { endpoint: 'social', newData: mappedData } }));
          }
        }
      } catch (e) { /* silent */ }
      return mappedData;
    });

    if (cachedData) {
      networkFetch.catch(() => { /* silent */ });
      return cachedData;
    }

    return await networkFetch;
  } catch (error) {
    console.error("[AXiM Core: Routing Error] Failed to fetch article payload:", error);
    console.warn("API Error, utilizing fallback protocol for social:", error.message);
    return SOCIAL_FALLBACK;
  }
}
