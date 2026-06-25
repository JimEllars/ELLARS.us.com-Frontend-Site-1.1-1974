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

const POSTS_CACHE = {
  data: null,
  timestamp: null,
  CACHE_DURATION: 1000 * 60 * 5 // 5 minutes
};


function logApiErrorToTelemetry(url, error) {
  try {
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
  const cacheKey = `${limit}-${categoryId}`;

  if (!POSTS_CACHE[cacheKey]) {
    POSTS_CACHE[cacheKey] = { data: null, timestamp: null };
  }

  const now = Date.now();
  if (POSTS_CACHE[cacheKey].data && POSTS_CACHE[cacheKey].timestamp && (now - POSTS_CACHE[cacheKey].timestamp < POSTS_CACHE.CACHE_DURATION)) {
    return POSTS_CACHE[cacheKey].data;
  }

  try {
    let url = `${WP_API_URL}/posts?per_page=${limit}&_embed`;
    if (categoryId) url += `&categories=${categoryId}`;
    
    const res = await fetchWithRetry(url, {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const data = await res.json();
    if (data.isError) return FALLBACK_POSTS.slice(0, limit);
    POSTS_CACHE[cacheKey].data = data;
    POSTS_CACHE[cacheKey].timestamp = now;
    return data;
  } catch (error) {
    console.error("[AXiM Core: Routing Error] Failed to fetch article payload:", error);
    console.warn("API Error, utilizing fallback protocol:", error.message);
    return FALLBACK_POSTS.slice(0, limit);
  }
}

export async function getPostBySlug(slug) {
  try {
    const res = await fetchWithRetry(`${WP_API_URL}/posts?slug=${slug}&_embed`, {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const data = await res.json();
    if (data.isError) return data; // Return the standardized error object
    return data[0] || null; // Trigger fallback
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

  if (!POSTS_CACHE[cacheKey]) {
    POSTS_CACHE[cacheKey] = { data: null, timestamp: null };
  }

  const now = Date.now();
  if (POSTS_CACHE[cacheKey].data && POSTS_CACHE[cacheKey].timestamp && (now - POSTS_CACHE[cacheKey].timestamp < POSTS_CACHE.CACHE_DURATION)) {
    return POSTS_CACHE[cacheKey].data;
  }

  try {
    const url = `${WP_API_URL.replace('/wp/v2', '/spotlight/v1')}/instagram?feed=390&per_page=${limit}`;

    const res = await fetchWithRetry(url, {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const data = await res.json();
    if (data.isError) return SOCIAL_FALLBACK;

    // Map Spotlight format to match WordPress Posts format for generic rendering
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

    POSTS_CACHE[cacheKey].data = mappedData;
    POSTS_CACHE[cacheKey].timestamp = now;
    return mappedData;
  } catch (error) {
    console.error("[AXiM Core: Routing Error] Failed to fetch article payload:", error);
    console.warn("API Error, utilizing fallback protocol for social:", error.message);
    return SOCIAL_FALLBACK;
  }
}
