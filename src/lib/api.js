import { useAppStore } from '@/store/useAppStore';
import { enqueuePayload, generateUUID } from '@/hooks/useTelemetry';

const WP_API_URL = import.meta.env.VITE_WP_API_URL || 'https://wp.ellars.us.com/wp-json/wp/v2';
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://pvbcdndqjguzqeafhwhw.supabase.co';
if (!SUPABASE_URL) {
  console.warn('VITE_SUPABASE_URL is missing in environment variables.');
}

const FALLBACK_POSTS = [
  {
    id: 101,
    slug: 'siphon-economy',
    title: { rendered: "The Siphon Economy Is Bleeding Us Dry" },
    excerpt: { rendered: "How mega-corporations exploit regional geography and labor pools without reinvesting in the communities that sustain them." },
    content: { rendered: "<p>The mathematical framework required to stop the extraction of local wealth...</p>" },
    date: '2025-09-15T10:00:00',
    acf: { episode_number: "045", read_time: "12 Min Read", category_label: "Dispatch" },
    _embedded: {
      'wp:featuredmedia': [
        {
          source_url: null
        }
      ]
    }
  },
  {
    id: 102,
    slug: 'california-floor',
    title: { rendered: "Post-Labor Economics: The California Floor" },
    excerpt: { rendered: "As AI and automation accelerate, traditional wage models will fail. We must replace bloated welfare with algorithmic stability." },
    content: { rendered: "<p>A modernized Negative Income Tax for national infrastructure...</p>" },
    date: '2025-09-12T14:30:00',
    acf: { episode_number: "044", read_time: "18 Min Read", category_label: "Business Briefing" },
    _embedded: {
      'wp:featuredmedia': [
        {
          source_url: null
        }
      ]
    }
  },
  {
    id: 103,
    slug: 'politicians-future',
    title: { rendered: "Why Politicians Cannot Build The Future" },
    excerpt: { rendered: "The era of the career orator is over. The logistical challenges of the 2030s require leaders who have actually scaled systems." },
    content: { rendered: "<p>Scaling private sector rigor to community leadership...</p>" },
    date: '2025-09-10T09:15:00',
    acf: { episode_number: "043", read_time: "9 Min Read", category_label: "Dispatch" },
    _embedded: {
      'wp:featuredmedia': [
        {
          source_url: null
        }
      ]
    }
  }
];

export async function fetchLatestNews(page = 1, perPage = 9) {
  try {
    let url = `${WP_API_URL}/posts?page=${page}&per_page=${perPage}&_embed`;

    const response = await fetchWithRetry(url, {
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        "X-Project-Domain": "ellars.us.com",
        "Cache-Control": "s-maxage=3600, stale-while-revalidate=86400"
      }
    });

    if (response.isError) {
      return { data: FALLBACK_POSTS.slice(0, perPage), totalPages: 1, total: FALLBACK_POSTS.length };
    }

    const totalPages = parseInt(response.headers.get("X-WP-TotalPages") || "1", 10);
    const total = parseInt(response.headers.get("X-WP-Total") || "0", 10);

    const data = await response.json();
    if (data.isError) {
      return { data: FALLBACK_POSTS.slice(0, perPage), totalPages: 1, total: FALLBACK_POSTS.length };
    }

    return { data, totalPages, total };
  } catch (error) {
    console.error("[AXiM Core: Routing Error] Failed to fetch article payload:", error);
    return { data: FALLBACK_POSTS.slice(0, perPage), totalPages: 1, total: FALLBACK_POSTS.length };
  }
}


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

async function fetchWithRetry(url, options = {}, retries = 3, attempt = 1) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 seconds timeout

    const defaultHeaders = {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'X-Project-Domain': 'ellars.us.com',
      'X-Client-Telemetry': 'AXiM-Frontend-v1'
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
      if (response.status === 401) {
        if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
          useAppStore.getState().clearAuth();
          window.location.href = '/login';
        }
      }
      if (response.status === 429 && retries > 0) {
        console.warn(`[429 Too Many Requests] Retrying fetch to ${url} (attempt ${attempt}, ${retries} retries left)...`);
        const backoffMs = (2 ** attempt) * 1000;
        await new Promise(resolve => setTimeout(resolve, backoffMs));
        return fetchWithRetry(url, options, retries - 1, attempt + 1);
      }
      console.error(`[API Error] HTTP ${response.status} from ${url}`);
      const error = new Error("Our systems are currently experiencing high traffic. We are utilizing fallback protocols to serve you.");
      error.status = response.status;
      throw error;
    }

    return response;
  } catch (error) {
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

export async function getLatestPosts(limit = 10, categoryId = null) {
  try {
    let url = `${WP_API_URL}/posts?per_page=${limit}&_embed`;
    if (categoryId) url += `&categories=${categoryId}`;

    const response = await fetchWithRetry(url, {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'X-Project-Domain': 'ellars.us.com'
      }
    });

    if (response.isError) return FALLBACK_POSTS.slice(0, limit);
    const data = await response.json();
    if (data.isError) return FALLBACK_POSTS.slice(0, limit);

    return data;
  } catch (error) {
    console.error("[AXiM Core: Routing Error] Failed to fetch article payload:", error);
    console.warn("API Error, utilizing fallback protocol:", error.message);
    return FALLBACK_POSTS.slice(0, limit);
  }
}

export async function getPostBySlug(slug) {
  try {
    const response = await fetchWithRetry(`${WP_API_URL}/posts?slug=${slug}&_embed`, {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'X-Project-Domain': 'ellars.us.com'
      }
    });

    if (response.isError) return response;
    const data = await response.json();
    if (data.isError) return data;

    return data[0] || null;
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
  try {
    const url = `${WP_API_URL.replace('/wp/v2', '/spotlight/v1')}/instagram?feed=390&per_page=${limit}`;

    const response = await fetchWithRetry(url, {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'X-Project-Domain': 'ellars.us.com'
      }
    });

    if (response.isError) return SOCIAL_FALLBACK;
    const data = await response.json();
    if (data.isError) return SOCIAL_FALLBACK;

    const mappedData = (data.media || data).map((item, index) => ({
        id: `social-${index}-${item.id || index}`,
        slug: item.permalink || '#',
        title: { rendered: "Social Update" },
        excerpt: { rendered: item.caption || '' },
        date: item.timestamp || new Date().toISOString(),
        acf: { category_label: "SOCIAL", read_time: "1 Min" },
        _embedded: {},
        isExternal: true,
        externalUrl: item.permalink,
        imageUrl: item.media_url || item.thumbnail_url || null
    }));

    return mappedData;
  } catch (error) {
    console.error("[AXiM Core: Routing Error] Failed to fetch article payload:", error);
    console.warn("API Error, utilizing fallback protocol for social:", error.message);
    return SOCIAL_FALLBACK;
  }
}

export async function saveToAximCore(payload) {
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/axim_vault?app_id=eq.ellars.us.com`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        'X-AXiM-Tenant': 'ELLARS_PERSONAL',
        'Prefer': 'return=minimal',
        'X-Client-Telemetry': 'AXiM-Frontend-v1'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      console.error("[AXiM Core] Failed to save to vault", response.status);
      return false;
    }

    return true;
  } catch (error) {
    console.error("[AXiM Core: Save Error]", error);
    return false;
  }
}

export async function loginUser(email, password) {
  try {
    const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        'X-AXiM-Tenant': 'ELLARS_PERSONAL',
        'X-Client-Telemetry': 'AXiM-Frontend-v1'
      },
      body: JSON.stringify({ email, password })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error_description || errorData.msg || 'Invalid login credentials');
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    console.error("[AXiM Core: Auth Error]", error);
    return { success: false, message: error.message };
  }
}

export async function fetchSavedVaultItems() {
  const token = useAppStore.getState().userToken;
  if (!token) {
    return { data: [], isError: true, message: 'No active session' };
  }

  try {
    const url = `${SUPABASE_URL}/rest/v1/axim_vault?select=*&app_id=eq.ellars.us.com`;
    const response = await fetchWithRetry(url, {
      headers: {
        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${token}`,
        'X-AXiM-Tenant': 'ELLARS_PERSONAL',
        'Content-Type': 'application/json'
      }
    });

    if (response.isError) {
      return { data: [], isError: true, message: response.message };
    }

    const data = await response.json();
    if (data.isError) {
      return { data: [], isError: true, message: data.message };
    }

    return { data, isError: false };
  } catch (error) {
    console.error("[AXiM Core: Vault Error] Failed to fetch saved items:", error);
    return { data: [], isError: true, message: error.message };
  }
}


export async function subscribeToNewsletter(email, turnstileToken) {
  const url = import.meta.env.VITE_CF_FORM_ENDPOINT || '/api/v1/subscribe';
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Client-Telemetry': 'AXiM-Frontend-v1'
      },
      body: JSON.stringify({
        email,
        turnstileToken,
        source: "Ellars_Web_App",
        footprint: "v5.40-core",
        form_version: "v5.40-core",
        source_url: typeof window !== "undefined" ? window.location.href : "",
        signup_timestamp: new Date().toISOString()
      })
    });

    if (!response.ok) {
      if (response.status === 400) {
        throw new Error("Transmission rejected: Invalid format");
      } else if (response.status === 500) {
        throw new Error("Core server offline");
      } else {
        throw new Error(`Subscription failed with status: ${response.status}`);
      }
    }
    return await response.json();
  } catch (error) {
    console.error("[EmailIt] Network or parsing error during subscription:", error);
    throw error;
  }
}

export async function verifySession() {
  try {
    const supabaseClient = await import('@supabase/supabase-js').then(module => {
      const url = import.meta.env.VITE_SUPABASE_URL || 'https://pvbcdndqjguzqeafhwhw.supabase.co';
      const key = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
      if (!url || !key) return null;
      return module.createClient(url, key);
    });

    if (!supabaseClient) {
      console.warn("Supabase client not initialized for verifySession.");
      return null;
    }

    const { data: { session }, error } = await supabaseClient.auth.getSession();

    if (error) {
       console.error("Session verification error:", error.message);
       return null;
    }

    return session;
  } catch (error) {
    console.error("Session verification failed:", error);
    return null;
  }
}
