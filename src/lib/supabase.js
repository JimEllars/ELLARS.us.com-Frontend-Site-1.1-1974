/**
 * Supabase client — a single lazily-initialised instance for the whole app.
 *
 * Two defects lived here, and both were silent in production:
 *
 * 1. The client was created at module scope from `import.meta.env`. If
 *    `VITE_SUPABASE_ANON_KEY` was absent at build time, `createClient` was dead
 *    code, the bundler tree-shook @supabase/supabase-js out of the artifact, and
 *    `supabase` was `null` forever — so login never persisted a session, the
 *    dashboard bounced to /login on every refresh, and the Vault and media
 *    uploads answered `UNAUTHORIZED_MISSING_API_KEY`. Nothing threw, so nothing
 *    looked wrong. Configuration is now resolved at runtime, with the build-time
 *    variable only as a fast path (see functions/api/config.js).
 *
 * 2. Creating a second client throws/queues against the Web Locks API. Every
 *    path goes through `getSupabase()`, which memoises the *promise* — including
 *    the concurrent-await case two callers hit at boot — so exactly one client
 *    is ever constructed.
 *
 * The SDK is imported dynamically so it lands in its own chunk instead of the
 * entry bundle, and so the import cannot be tree-shaken away when the key is
 * supplied at runtime.
 */

const BUILD_SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const BUILD_SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Public project URL. Not a secret: it is the same value in .env.example.
const DEFAULT_SUPABASE_URL = 'https://pvbcdndqjguzqeafhwhw.supabase.co';
const CONFIG_ENDPOINT = '/api/config';
const CONFIG_TIMEOUT_MS = 4000;

const AUTH_OPTIONS = {
  persistSession: true,
  autoRefreshToken: true,
  detectSessionInUrl: true,
  storageKey: 'ellars_us_com_auth_token',
};

let configPromise = null;
let clientPromise = null;
let reported = false;

/**
 * Reports a deployment that cannot authenticate, once, in the places that
 * matter: the console for the engineer, and telemetry for the dashboard.
 */
const reportMissingConfig = (reason) => {
  if (reported) return;
  reported = true;
  console.error(
    `[AXiM Core: Config] Supabase is not configured (${reason}). ` +
      'Login, the dashboard, the Vault and media uploads are unavailable. ' +
      'Bind SUPABASE_ANON_KEY in the Pages project environment.'
  );
  // Imported lazily: telemetry must never be able to break auth, and it must not
  // be in the boot-critical graph.
  import('@/hooks/useTelemetry')
    .then(({ enqueuePayload, generateUUID }) => {
      enqueuePayload({
        telemetry_envelope: {
          project_id: 'ELLARS_FRONTEND',
          environment: 'production',
          timestamp: new Date().toISOString(),
          idempotency_key: generateUUID(),
          session: { context_scope: 'public_facing_umbrella' },
        },
        event_payload: {
          event_type: 'SUPABASE_CONFIG_MISSING',
          severity: 'CRITICAL',
          component_origin: 'SUPABASE_CLIENT',
          error_message: `Supabase config unresolved: ${reason}`,
          metadata: { reason, build_key_present: Boolean(BUILD_SUPABASE_ANON_KEY) },
        },
      });
    })
    .catch(() => {
      /* telemetry is best-effort by design */
    });
};

const fetchEdgeConfig = async () => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CONFIG_TIMEOUT_MS);
  try {
    const response = await fetch(CONFIG_ENDPOINT, {
      headers: { Accept: 'application/json' },
      credentials: 'same-origin',
      signal: controller.signal,
    });
    if (!response.ok) {
      return { error: `edge_config_http_${response.status}` };
    }
    const data = await response.json();
    if (!data?.supabaseAnonKey) {
      return { error: data?.error || 'edge_config_empty' };
    }
    return { url: data.supabaseUrl || BUILD_SUPABASE_URL || DEFAULT_SUPABASE_URL, anonKey: data.supabaseAnonKey };
  } catch (error) {
    return { error: error?.name === 'AbortError' ? 'edge_config_timeout' : 'edge_config_unreachable' };
  } finally {
    clearTimeout(timer);
  }
};

const resolveConfig = async () => {
  // Fast path: the variable was present when this build was made.
  if (BUILD_SUPABASE_ANON_KEY) {
    return {
      url: BUILD_SUPABASE_URL || DEFAULT_SUPABASE_URL,
      anonKey: BUILD_SUPABASE_ANON_KEY,
      source: 'build',
      configured: true,
    };
  }

  const edge = await fetchEdgeConfig();
  if (edge.anonKey) {
    return {
      url: edge.url,
      anonKey: edge.anonKey,
      source: 'edge',
      configured: true,
    };
  }

  reportMissingConfig(edge.error);
  return {
    url: BUILD_SUPABASE_URL || DEFAULT_SUPABASE_URL,
    anonKey: '',
    source: 'missing',
    configured: false,
  };
};

/**
 * Resolves the publishable Supabase configuration once per page load.
 * Never rejects: a failure resolves to `{ configured: false }` so callers can
 * fail honestly instead of hanging.
 */
export const getSupabaseConfig = () => {
  if (!configPromise) configPromise = resolveConfig();
  return configPromise;
};

/**
 * The singleton client, or `null` when the deployment is unconfigured.
 * Concurrent callers share one promise, so only one client is ever built.
 */
export const getSupabase = () => {
  if (!clientPromise) {
    clientPromise = (async () => {
      const config = await getSupabaseConfig();
      if (!config.configured) return null;
      const { createClient } = await import('@supabase/supabase-js');
      return createClient(config.url, config.anonKey, { auth: { ...AUTH_OPTIONS } });
    })().catch((error) => {
      console.error('[AXiM Core: Config] Supabase client construction failed:', error);
      return null;
    });
  }
  return clientPromise;
};

export default getSupabase;
