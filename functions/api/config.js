/**
 * Cloudflare Pages Function: /api/config
 *
 * Why this exists
 * ---------------
 * The Supabase anon key is a *publishable* key: it is designed to be handed to
 * the browser, and it is Row-Level Security — not secrecy — that protects the
 * data behind it. But the client used to read it from `import.meta.env`, i.e. at
 * build time. When the Pages project had no `VITE_SUPABASE_ANON_KEY`, Vite
 * inlined an empty string, `createClient()` became dead code, the bundler
 * tree-shook @supabase/supabase-js out of the artifact entirely (the empty
 * `vendor-supabase` chunk was the tell), and `supabase` was `null` in
 * production. Login, the dashboard, the Vault and media upload then failed with
 * `UNAUTHORIZED_MISSING_API_KEY` while every public page looked perfectly
 * healthy.
 *
 * Serving the publishable key from a runtime binding means configuration no
 * longer depends on a rebuild, and a misconfigured deployment reports itself
 * (`configured: false`) instead of failing silently.
 *
 * Hard rule: this endpoint may only ever return the anon / publishable key. A
 * service-role key is verified against and refused, because that key bypasses
 * RLS and would hand every visitor full database access.
 */

const ANON_KEY_NAMES = [
  'SUPABASE_ANON_KEY',
  'SUPABASE_PUBLISHABLE_KEY',
  'SUPABASE_KEY',
  'VITE_SUPABASE_ANON_KEY',
];

const URL_NAMES = ['SUPABASE_URL', 'VITE_SUPABASE_URL'];

const DEFAULT_SUPABASE_URL = 'https://pvbcdndqjguzqeafhwhw.supabase.co';

/**
 * Normalises the bound project URL to the *base* origin.
 *
 * The production binding is currently `https://<ref>.supabase.co/rest/v1/`, i.e.
 * the PostgREST endpoint rather than the project root. supabase-js appends its own
 * paths, so that value produces `.../rest/v1//auth/v1/token` and every call 404s.
 * A wrong-but-plausible binding must not be able to break the client, so the
 * service suffixes are stripped and anything unparseable falls back to the
 * default project.
 */
const SUPABASE_PATH_SUFFIXES = ['/rest/v1', '/auth/v1', '/storage/v1', '/realtime/v1', '/functions/v1'];

const normalizeSupabaseUrl = (raw) => {
  const value = String(raw || '').trim();
  if (!value) return DEFAULT_SUPABASE_URL;
  try {
    const url = new URL(value);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return DEFAULT_SUPABASE_URL;
    let path = url.pathname.replace(/\/+$/, '');
    for (const suffix of SUPABASE_PATH_SUFFIXES) {
      if (path.endsWith(suffix)) path = path.slice(0, -suffix.length);
    }
    url.pathname = path || '/';
    url.search = '';
    url.hash = '';
    return url.toString().replace(/\/+$/, '');
  } catch {
    return DEFAULT_SUPABASE_URL;
  }
};

const firstDefined = (env, names) => {
  for (const name of names) {
    const value = env?.[name];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return '';
};

/**
 * Reads the `role` claim out of a Supabase JWT without verifying it.
 *
 * Verification is pointless here: the key is ours, and the only question is
 * "did an operator paste the wrong one". A forged key with role=anon buys an
 * attacker exactly what the real anon key already gives them.
 */
const jwtRole = (token) => {
  const parts = token.split('.');
  if (parts.length < 2) return null;
  try {
    const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = payload.padEnd(payload.length + ((4 - (payload.length % 4)) % 4), '=');
    const json = atob(padded);
    return JSON.parse(json)?.role ?? null;
  } catch {
    return null;
  }
};

const respond = (body, status) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      // Short cache: long enough that every page in a session reuses one fetch,
      // short enough that a key rotation does not need a purge.
      'Cache-Control': status === 200 ? 'public, max-age=300, s-maxage=300' : 'no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });

/**
 * `HEAD /api/config` used to be answered `404` by the `/api/[[path]]` catch-all,
 * because this module exported no handler for it and Pages fell through to the
 * next matching route. `/api/config` is the one endpoint that reports whether a
 * deployment is configured at all, so the cheapest possible health probe — a
 * HEAD — reported the opposite. Same resolution as GET, no body.
 */
export async function onRequestHead(context) {
  const response = await onRequestGet(context);
  return new Response(null, { status: response.status, headers: response.headers });
}

export async function onRequestGet({ env }) {
  const supabaseUrl = normalizeSupabaseUrl(firstDefined(env, URL_NAMES));
  const anonKey = firstDefined(env, ANON_KEY_NAMES);

  if (!anonKey) {
    // A 503 rather than a 200 with an empty key: the client must be able to tell
    // "not configured yet" from "configured, and this is the key".
    return respond(
      {
        configured: false,
        supabaseUrl,
        supabaseAnonKey: '',
        error: 'missing_anon_key',
        message:
          'No Supabase publishable key is bound to this deployment. Set SUPABASE_ANON_KEY in the Pages project environment.',
      },
      503
    );
  }

  const role = jwtRole(anonKey);
  if (role === 'service_role') {
    console.error('config: refusing to serve a service_role key; set the anon/public key instead');
    return respond(
      {
        configured: false,
        supabaseUrl,
        supabaseAnonKey: '',
        error: 'wrong_key_role',
        message: 'The bound Supabase key is a service_role key. Serve the anon/public key only.',
      },
      500
    );
  }

  return respond(
    {
      configured: true,
      supabaseUrl,
      supabaseAnonKey: anonKey,
    },
    200
  );
}
