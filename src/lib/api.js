import { getSupabase, getSupabaseConfig } from './supabase.js';
import { buildRequestHeaders } from './requestHeaders.js';
import { classifyApiFailure, buildApiFailurePayload, isSupabaseUrl } from './apiFailure.js';
import { useAppStore } from '@/store/useAppStore';
import { enqueuePayload, generateUUID } from '@/hooks/useTelemetry';

const WP_API_URL = import.meta.env.VITE_WP_API_URL || 'https://wp.ellars.us.com/wp-json/wp/v2';

/**
 * Supabase base URL and publishable key, resolved at runtime.
 *
 * Both used to be read straight out of `import.meta.env` at build time. When the
 * Pages project shipped without `VITE_SUPABASE_ANON_KEY` the key became the
 * literal `undefined`, every request here was sent with a literal "undefined"
 * apikey header, and Supabase answered `UNAUTHORIZED_MISSING_API_KEY` for login,
 * the Vault and every storage call. The config now comes from ./supabase.js,
 * which resolves it from the build env or from /api/config (runtime binding) and
 * memoises the result for the life of the page.
 */
const supabaseUrl = async () => (await getSupabaseConfig()).url;
const supabaseApiKey = async () => (await getSupabaseConfig()).anonKey;

/**
 * Guards a call that cannot work without a key. Callers return an honest error
 * to the user instead of surfacing a bare 401 from upstream.
 */
const requireSupabaseApiKey = async () => {
  const key = await supabaseApiKey();
  return key || null;
};

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

    // No per-call headers: fetchWithRetry owns them, and a request `Cache-Control`
    // is a no-op that WordPress would reject in the preflight anyway.
    const response = await fetchWithRetry(url, { credentials: "include" });

    if (response.isError) {
      reportFeedFallback('fetchLatestNews', response);
      return { data: FALLBACK_POSTS.slice(0, perPage), totalPages: 1, total: FALLBACK_POSTS.length };
    }

    const totalPages = parseInt(response.headers.get("X-WP-TotalPages") || "1", 10);
    const total = parseInt(response.headers.get("X-WP-Total") || "0", 10);

    const data = await response.json();
    if (data.isError) {
      reportFeedFallback('fetchLatestNews_data', response);
      return { data: FALLBACK_POSTS.slice(0, perPage), totalPages: 1, total: FALLBACK_POSTS.length };
    }

    return { data, totalPages, total };
  } catch (error) {
    console.error("[AXiM Core: Routing Error] Failed to fetch article payload:", error);
    // fetchWithRetry never throws, so reaching here means the server answered and
    // the *body* was unusable. That used to be silent; it is now one event.
    reportApiFailure({ url: `${WP_API_URL}/posts`, transport: 'parse', message: error?.message });
    return { data: FALLBACK_POSTS.slice(0, perPage), totalPages: 1, total: FALLBACK_POSTS.length };
  }
}


/**
 * Files exactly one error event for a failed request and returns the request id.
 *
 * This is the only place a request failure is reported, and `fetchWithRetry` calls
 * it on both failure paths — a non-ok response and a thrown transport error. It
 * used to be called from the `catch` only, so every HTTP failure (a 500 on the
 * feed, a 401 on the Vault) returned before reaching it and filed nothing at all.
 * See ./apiFailure.js for the measured table and the severity policy.
 *
 * Deliberately does not import `window`: the caller has already established a
 * browser context, and a failure in Node is still worth a queue entry.
 */
function reportApiFailure({ url, status = null, transport = null, carriedSession = false, message = '', attempt = 1 }) {
  const requestId = generateUUID();
  try {
    const online = typeof navigator !== 'undefined' ? navigator.onLine : true;
    const classification = classifyApiFailure({ url, status, transport, carriedSession, message });
    const payload = buildApiFailurePayload({ classification, url, requestId, attempt, online });
    if (payload) enqueuePayload(payload);
  } catch (e) {
    // Reporting must never become the failure it is reporting.
  }
  return requestId;
}

/**
 * The WordPress feed degraded and cached dispatches were served in its place.
 *
 * This is a *consequence*, not a cause: the cause was filed once by
 * `reportApiFailure`, and `metadata.request_id` is that event's idempotency key, so
 * the pair is joinable — one broken request, one error, one degradation — instead
 * of two unlinked rows that an error count reads as two incidents.
 */
function reportFeedFallback(source, response) {
  if (typeof window === 'undefined') return;
  try {
    enqueuePayload({
      telemetry_envelope: {
        project_id: 'ELLARS_FRONTEND',
        environment: 'production',
        timestamp: new Date().toISOString(),
        idempotency_key: generateUUID(),
        session: { context_scope: 'public_facing_umbrella' }
      },
      event_payload: {
        event_type: 'wp_feed_fallback_served',
        severity: 'LOW',
        component_origin: 'API_UTILITY',
        error_message: 'WordPress API degraded or timed out',
        stack_trace: '',
        metadata: {
          source,
          // Joins this row to the API_FETCH_ERROR it followed. Present even when the
          // cause was not reported (the telemetry loop guard), so its absence is not
          // read as "there was no cause".
          request_id: response?.requestId || null,
          failure_kind: response?.failureKind || null,
          http_status: response?.status ?? null,
          network_status: (typeof navigator !== 'undefined' && navigator.onLine) ? 'online' : 'offline'
        }
      }
    });
  } catch (e) {
    // Silent: a full localStorage is not a reason to break the page.
  }
}

/**
 * A read has five seconds to answer before the caller is told it failed.
 *
 * The timeout is per-call now, not global: it was hard-coded at 5 s inside this
 * function, which is right for a JSON read and wrong for the one request that
 * legitimately takes longer — a media upload. Every write used to bypass this
 * function entirely, so the constant had never been asked the question.
 */
const REQUEST_TIMEOUT_MS = 5000;

/**
 * A media upload is bounded by the file size and the member's uplink, not by our
 * patience: 5 s would abort a 20 MB file on a phone on purpose.
 */
const UPLOAD_TIMEOUT_MS = 120000;

async function fetchWithRetry(url, options = {}, { retries = 3, attempt = 1, timeoutMs = REQUEST_TIMEOUT_MS } = {}) {
  // Whether this request carried a session decides how its 401 is read: a rejected
  // token (the member must be logged out) or a request that had no credential to
  // begin with (not our session's problem).
  const carriedSession = Boolean(options?.headers?.Authorization);

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    // Headers are built per *target*, not once for everything. The vendor
    // provenance headers were previously attached to every request regardless of
    // destination, and WordPress rejects them in its fixed CORS allow-list — so
    // the browser refused every dispatch fetch and the fabricated fallback
    // articles were served in their place. See src/lib/requestHeaders.js.
    const fetchOptions = {
      ...options,
      headers: buildRequestHeaders({
        url,
        origin: typeof window !== 'undefined' ? window.location.origin : undefined,
        method: options.method || 'GET',
        hasBody: options.body !== undefined && options.body !== null,
        headers: options.headers || {},
      }),
      signal: controller.signal
    };

    const response = await fetch(url, fetchOptions);
    clearTimeout(timeoutId);

    if (!response.ok) {
      if (response.status === 401) {
        // Only requests that actually carried a session token can indicate an
        // expired session. This used to fire for ANY Supabase 401 — including a
        // newsletter subscribe — and did a full 'window.location.href' reload,
        // discarding SPA state. The store is cleared instead and ProtectedRoute
        // performs the router-native <Navigate to="/login">.
        // `isSupabaseUrl` parses the hostname; the previous check was a substring
        // search, which also matched `supabase.co.example.net`.
        if (carriedSession && isSupabaseUrl(url) && typeof window !== 'undefined') {
          useAppStore.getState().clearAuth();
        }
      }
      if (response.status === 429 && retries > 0) {
        console.warn(`[429 Too Many Requests] Retrying fetch to ${url} (attempt ${attempt}, ${retries} retries left)...`);
        const backoffMs = (2 ** attempt) * 1000;
        await new Promise(resolve => setTimeout(resolve, backoffMs));
        // Headers are rebuilt by the recursion, which is why only `options` travels.
        return fetchWithRetry(url, options, { retries: retries - 1, attempt: attempt + 1, timeoutMs });
      }
      console.error(`[API Error] HTTP ${response.status} from ${url}`);
      const requestId = reportApiFailure({
        url,
        status: response.status,
        carriedSession,
        attempt,
        message: `HTTP ${response.status} from ${url}`
      });
      const error = new Error("Our systems are currently experiencing high traffic. We are utilizing fallback protocols to serve you.");
      error.status = response.status;
      return {
        isError: true,
        // `status` was absent from this branch entirely, while the catch below set
        // it — so a caller could not tell a 404 from a 500 without guessing.
        status: response.status,
        message: error.message || 'An unknown network error occurred.',
        requestId,
        failureKind: response.status >= 500 ? 'http_server' : (response.status === 429 ? 'throttled' : 'http_client'),
      };
    }

    return response;
  } catch (error) {
    let finalError = error;
    let transport = 'network';
    if (error.name === 'AbortError') {
      finalError = new Error('API request timed out');
      transport = 'timeout';
    } else if (typeof navigator !== 'undefined' && !navigator.onLine) {
      finalError = new Error('Network offline');
      transport = 'offline';
    }
    const requestId = reportApiFailure({
      url,
      transport,
      carriedSession,
      attempt,
      message: finalError.message,
    });
    return {
      ok: false,
      status: finalError.status || 500,
      isError: true,
      message: finalError.message || 'API request failed',
      requestId,
      failureKind: transport,
      json: async () => ({ isError: true, message: finalError.message || 'API request failed' })
    };
  }
}

export async function getLatestPosts(limit = 10, categoryId = null) {
  try {
    let url = `${WP_API_URL}/posts?per_page=${limit}&_embed`;
    if (categoryId) url += `&categories=${categoryId}`;

    const response = await fetchWithRetry(url, { credentials: 'include' });

    if (response.isError) {
      reportFeedFallback('getLatestPosts', response);
      return FALLBACK_POSTS.slice(0, limit);
    }
    const data = await response.json();
    if (data.isError) {
      reportFeedFallback('getLatestPosts_data', response);
      return FALLBACK_POSTS.slice(0, limit);
    }

    return data;
  } catch (error) {
    console.error("[AXiM Core: Routing Error] Failed to fetch article payload:", error);
    console.warn("API Error, utilizing fallback protocol:", error.message);
    reportApiFailure({ url: `${WP_API_URL}/posts`, transport: 'parse', message: error?.message });
    return FALLBACK_POSTS.slice(0, limit);
  }
}

export async function getPostBySlug(slug) {
  try {
    const response = await fetchWithRetry(`${WP_API_URL}/posts?slug=${slug}&_embed`, {
      credentials: 'include'
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

    const response = await fetchWithRetry(url, { credentials: 'include' });

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

/**
 * One Supabase write, under the same policy as every read.
 *
 * Seven functions used to call `fetch` directly: `publishVaultItem`,
 * `uploadMediaAsset`, `fetchUploadedMedia`, and the four row-state operations.
 * That cost three things, none of them theoretical:
 *
 *  - **No telemetry.** Sprint 2.29 put the failure policy in `fetchWithRetry`, and
 *    these calls never reached it — so a failed publish, a rejected upload and a
 *    refused delete filed nothing at all and reported themselves only in the
 *    console of whoever happened to have devtools open.
 *  - **No timeout.** A stalled request left the dashboard's button disabled in
 *    `pending` forever, because nothing ever settled the promise. Measured by
 *    reading the components: `MediaUploads` and `DispatchPublisher` both clear
 *    their in-flight state in a `finally`, which a promise that never settles
 *    never reaches.
 *  - **Headers that should not leave the origin.** These calls sent
 *    `X-AXiM-Tenant` and `X-Client-Telemetry` to `*.supabase.co` by hand.
 *    `requestHeaders.js` deliberately strips exactly those from a third-party
 *    target, because they are ours and nobody reads them; the hand-written copies
 *    were re-adding them one function at a time.
 *
 * Writes are **not** retried. A 429 on a read can be retried for free; a POST or
 * PATCH that may already have been applied is the caller's decision to repeat, not
 * a transport policy's. `client_idempotency_key` makes a retry safe for a dispatch
 * draft, and that decision stays where the key is minted.
 */
async function supabaseWrite({
  path,
  method = 'POST',
  token,
  headers = {},
  body,
  timeoutMs = REQUEST_TIMEOUT_MS,
  parse = false,
}) {
  const response = await fetchWithRetry(
    `${await supabaseUrl()}${path}`,
    {
      method,
      headers: {
        'apikey': await supabaseApiKey(),
        'Authorization': `Bearer ${token}`,
        ...headers,
      },
      ...(body === undefined ? {} : { body }),
    },
    { retries: 0, timeoutMs }
  );

  if (response.isError) {
    return { isError: true, status: response.status, message: response.message, data: null };
  }

  if (!parse) return { isError: false, status: response.status, data: null };

  try {
    return { isError: false, status: response.status, data: await response.json() };
  } catch (error) {
    // A 2xx whose body is not JSON is a failure the dashboard must be told about.
    reportApiFailure({ url: path, transport: 'parse', message: error?.message, carriedSession: true });
    return { isError: true, status: 502, message: 'Response body was not usable JSON', data: null };
  }
}

/**
 * The Vault row-state operations, which were four copies of one request.
 *
 * `updateVaultItem`, `archiveVaultItem`, `restoreVaultItem` and `deleteVaultItem`
 * differed in a verb and a body literal. Copying a request four times is how the
 * four of them drifted: two sent `X-Client-Telemetry`, two did not, and all four
 * reported failure as a status number interpolated into a sentence with no
 * telemetry behind it.
 */
async function vaultRowWrite({ itemId, method, body, prefer, token }) {
  return supabaseWrite({
    path: `/rest/v1/axim_vault?id=eq.${itemId}&app_id=eq.ellars.us.com`,
    method,
    token,
    headers: prefer ? { 'Prefer': prefer } : {},
    body,
  });
}

export async function publishVaultItem(payload) {
  const token = useAppStore.getState().userToken;
  if (!token) {
     console.warn("[AXiM Core] Unauthenticated attempt to publish to vault.");
     return false;
  }

  const finalPayload = {
    ...payload,
    app_id: "ellars.us.com",
    client_idempotency_key: payload.client_idempotency_key || generateUUID()
  };

  const result = await supabaseWrite({
    path: '/rest/v1/axim_vault',
    method: 'POST',
    token,
    headers: { 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
    body: JSON.stringify(finalPayload),
  });

  if (result.isError) {
    console.error("[AXiM Core] Failed to save to vault", result.status);
    return false;
  }

  // No cache purge is attempted here. This used to POST /api/v1/cache/purge-tag
  // fire-and-forget; the endpoint does not exist (the /api/[[path]] catch-all
  // answered {"error":"not_found"}), so every publish produced one guaranteed
  // 404 in the network panel and in telemetry, and a poisoned edge entry still
  // had no eviction route. Restoring tag invalidation means building the Function
  // and binding CF_ZONE_ID/CF_PURGE_TOKEN first — see open item 12 in
  // PlanForContinuedDevelopment.md. A failing request that nobody reads is not a
  // purge strategy.

  return true;
}

/**
 * Sign-in is deliberately NOT on the write path.
 *
 * A rejected credential is the expected outcome of a typo, and it must never
 * become an error event: the 2.28 suite pins the exact message the form shows, and
 * a wrong password that filed `API_FETCH_ERROR` would make every member's typo an
 * incident. The one failure here that *is* worth reporting — a 5xx from the auth
 * endpoint, which currently reads to the member as "invalid credentials" — is
 * recorded as open item 20 rather than half-solved here.
 *
 * Session states are deliberately distinguishable. A 'transient' failure means we
 * could not reach the auth server (timeout, offline, 5xx) and MUST NOT be read as
 * "the user is logged out" — clearing auth on a slow network was one of the three
 * defects that made a refresh log the user out.
 */
const guestState = (transient = false) => ({ user: null, session: null, isGuest: true, transient });

export async function loginUser(email, password) {
  try {
    const apiKey = await requireSupabaseApiKey();
    if (!apiKey) {
      // No key means no deployment credential: say so, instead of forwarding a
      // literal "undefined" apikey and reporting Supabase's 401 as bad
      // credentials.
      return {
        success: false,
        message: 'Sign-in is unavailable on this deployment. The site is missing its Supabase configuration.',
      };
    }

    const response = await fetch(`${await supabaseUrl()}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': apiKey,
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

    // Hand the tokens to supabase-js. Login used to bypass the SDK entirely, so
    // supabase.auth.getSession() was always null, onAuthStateChange never fired
    // and verifySession() reported a guest on every hard refresh. setSession also
    // persists the refresh token, which is what keeps a tab alive past the ~1h
    // access-token lifetime.
    const client = await getSupabase();
    if (client && data?.access_token) {
      const { error: adoptError } = await client.auth.setSession({
        access_token: data.access_token,
        refresh_token: data.refresh_token || '',
      });
      if (adoptError) {
        console.warn('[AXiM Core: Auth] supabase-js did not adopt the session:', adoptError.message);
      }
    } else if (!client) {
      console.warn('[AXiM Core: Auth] No Supabase client; the session will not survive a refresh.');
    }

    return { success: true, data };
  } catch (error) {
    console.error("[AXiM Core: Auth Error]", error);
    return { success: false, message: error.message };
  }
}

export async function fetchSavedVaultItems(page = 1, limit = 20) {
  const token = useAppStore.getState().userToken;
  if (!token) {
    return { data: [], isError: true, message: 'No active session' };
  }

  try {
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    // Postgres does not guarantee row order across range requests, so paginating
    // without ORDER BY duplicates and skips records at page boundaries. The
    // order column must match the pagination cursor.
    const url = `${await supabaseUrl()}/rest/v1/axim_vault?select=*&app_id=eq.ellars.us.com&order=created_at.desc`;

    const response = await fetchWithRetry(url, {
      headers: {
        'apikey': await supabaseApiKey(),
        'Authorization': `Bearer ${token}`,
        'X-AXiM-Tenant': 'ELLARS_PERSONAL',
        'Content-Type': 'application/json',
        'Prefer': 'count=exact',
        'Range': `${from}-${to}`
      }
    });

    if (response.isError) {
      return { data: [], isError: true, message: response.message };
    }


    let total = 0;
    const contentRange = response.headers.get('Content-Range');
    if (contentRange) {
      // Content-Range is either '0-19/57' or '*/0' when nothing matches.
      const rangeParts = contentRange.split('/');
      if (rangeParts.length > 1) {
        const parsedTotal = Number.parseInt(rangeParts[1], 10);
        total = Number.isFinite(parsedTotal) ? parsedTotal : 0;
      }
    }

    const data = await response.json();
    if (data.isError) {
      return { data: [], total, hasMore: false, isError: true, message: data.message };
    }

    const rows = Array.isArray(data) ? data : [];
    // Trust the server count when we have one; fall back to "a full page means
    // there may be another" only when Content-Range was absent.
    const hasMore = total > 0 ? (from + rows.length) < total : rows.length === limit;

    return { data: rows, total, hasMore, isError: false };
  } catch (error) {
    console.error("[AXiM Core: Vault Error] Failed to fetch saved items:", error);
    return { data: [], isError: true, message: error.message };
  }
}


/**
 * The newsletter form is also off this path, for a reason that expires.
 *
 * `VITE_CF_FORM_ENDPOINT` is unset and `/api/v1/subscribe` has no Pages Function
 * (open item 7), so every attempt today answers 404 by design. Routing it through
 * the policy now would file one MEDIUM event per subscriber against a queue that
 * holds 50 and has no sink — drowning real failures to restate a known gap. Item 7
 * builds the route; this function joins `supabaseWrite`'s policy in the same cycle
 * that gives it an endpoint to talk to.
 */
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
        return { isError: true, message: "Transmission rejected: Invalid format" };
      } else if (response.status === 500) {
        return { isError: true, message: "Core server offline" };
      } else {
        return { isError: true, message: `Subscription failed with status: ${response.status}` };
      }
    }
    return await response.json();
  } catch (error) {
    console.error("[EmailIt] Network or parsing error during subscription:", error);
    return { isError: true, message: error.message || 'An unknown network error occurred.' };
  }
}

export async function verifySession() {
  try {
    // An unconfigured deployment is a transient condition, not proof that the
    // user is logged out: it must never clear a persisted session.
    const client = await getSupabase();
    if (!client) {
      console.warn("Supabase client not initialized for verifySession.");
      return guestState(true);
    }

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Session verification timeout')), 3000)
    );

    const sessionPromise = client.auth.getSession();
    const result = await Promise.race([sessionPromise, timeoutPromise]);
    const { data: { session } = {}, error } = result || {};

    if (error) {
       console.error("Session verification error:", error.message);
       if (error.status === 401 || error.status === 403) {
           return guestState(false); // Explicitly unauthenticated
       }
       return guestState(true); // Network/transport failure: unknown, not "logged out"
    }

    return session ? session : guestState(false);
  } catch (error) {
    // A rejected race is a timeout, which is a transport problem, not a verdict
    // on the token. Reporting it as a hard guest state is what made a slow
    // network look like an expired session.
    console.warn("Session verification did not resolve in time:", error?.message);
    return guestState(true);
  }
}


export async function uploadMediaAsset(file) {
  const token = useAppStore.getState().userToken;
  if (!token) return { data: null, isError: true, message: 'No active session' };

  const filename = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;

  // The binary body goes straight through: `fetch` accepts a `File`, and reading
  // it into memory first would double the peak for no benefit.
  const result = await supabaseWrite({
    path: `/storage/v1/object/ellars-media/${filename}`,
    method: 'POST',
    token,
    headers: { 'Content-Type': file.type || 'application/octet-stream' },
    body: file,
    // The one request whose duration is the member's uplink, not our patience.
    timeoutMs: UPLOAD_TIMEOUT_MS,
    parse: true,
  });

  if (result.isError) {
    console.error("[AXiM Core: Storage Error] Failed to upload media:", result.message);
    return { data: null, isError: true, message: result.message };
  }

  return { data: result.data, isError: false };
}

export async function fetchUploadedMedia() {
  const token = useAppStore.getState().userToken;
  if (!token) {
    return { data: [], isError: true, message: 'No active session' };
  }

  // A POST that reads, so it keeps the read policy: a retry is free and the body
  // is small. Only the envelope's status codes tell it apart from a write.
  const result = await supabaseWrite({
    path: '/storage/v1/object/list/ellars-media',
    method: 'POST',
    token,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prefix: '',
      limit: 100,
      offset: 0,
      sortBy: { column: 'created_at', order: 'desc' }
    }),
    parse: true,
  });

  if (result.isError) {
    console.error("[AXiM Core: Storage Error] Failed to fetch media:", result.message);
    return { data: [], isError: true, message: result.message };
  }

  const rows = Array.isArray(result.data) ? result.data : [];

  // Resolve the base URL once, outside the map: `supabaseUrl()` is async and a
  // map callback is not.
  const baseUrl = await supabaseUrl();
  const mappedData = rows.map(item => ({
    ...item,
    url: `${baseUrl}/storage/v1/object/public/ellars-media/${item.name}`
  }));

  return { data: mappedData, isError: false };
}

export async function deleteUploadedMedia(filename) {
  const token = useAppStore.getState().userToken;
  if (!token) return false;

  const result = await supabaseWrite({
    path: `/storage/v1/object/ellars-media/${filename}`,
    method: 'DELETE',
    token,
  });

  return !result.isError;
}




export async function updateVaultItem(itemId, payload) {
  const token = useAppStore.getState().userToken;
  if (!token) return { isError: true, message: 'No active session' };

  const result = await vaultRowWrite({
    itemId,
    method: 'PATCH',
    token,
    prefer: 'return=representation',
    body: JSON.stringify({ ...payload, app_id: 'ellars.us.com' }),
  });

  if (result.isError) {
    console.error("[AXiM Core: Vault Error] Failed to update item", result.status);
    return { isError: true, message: `Failed to update item with status ${result.status}` };
  }

  return { isError: false, message: 'Item updated successfully' };
}

export async function deleteVaultItem(itemId) {
  const token = useAppStore.getState().userToken;
  if (!token) return { isError: true, message: 'No active session' };

  const result = await vaultRowWrite({ itemId, method: 'DELETE', token });

  if (result.isError) {
    console.error("[AXiM Core: Vault Error] Failed to delete item", result.status);
    return { isError: true, message: `Failed to delete item with status ${result.status}` };
  }

  return { isError: false, message: 'Item deleted successfully' };
}

export async function archiveVaultItem(itemId) {
  const token = useAppStore.getState().userToken;
  if (!token) return { isError: true, message: 'No active session' };

  const result = await vaultRowWrite({
    itemId,
    method: 'PATCH',
    token,
    prefer: 'return=minimal',
    body: JSON.stringify({ status: 'archived' }),
  });

  if (result.isError) {
    console.error("[AXiM Core: Vault Error] Failed to archive item", result.status);
    return { isError: true, message: `Failed to archive item with status ${result.status}` };
  }

  return { isError: false, message: 'Item archived successfully' };
}

export async function restoreVaultItem(itemId) {
  const token = useAppStore.getState().userToken;
  if (!token) return { isError: true, message: 'No active session' };

  const result = await vaultRowWrite({
    itemId,
    method: 'PATCH',
    token,
    prefer: 'return=minimal',
    body: JSON.stringify({ status: 'published' }),
  });

  if (result.isError) {
    console.error("[AXiM Core: Vault Error] Failed to restore item", result.status);
    return { isError: true, message: `Failed to restore item with status ${result.status}` };
  }

  return { isError: false, message: 'Item restored successfully' };
}
