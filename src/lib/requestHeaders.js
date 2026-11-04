/**
 * Request-header policy per target origin.
 *
 * Pure: no imports, no `window`, no `import.meta`, so CI can assert it without a
 * browser. The wiring lives in ./api.js (`fetchWithRetry`).
 *
 * ## The failure this exists to prevent
 *
 * `fetchWithRetry` used to attach two provenance headers to *every* request it
 * made — `X-Project-Domain: ellars.us.com` and `X-Client-Telemetry:
 * AXiM-Frontend-v1` — regardless of who the request was going to. Neither is
 * read by anything: not by a Pages Function, not by WordPress, not by Supabase.
 * They were decoration, and on the one cross-origin service that matters they
 * were fatal.
 *
 * WordPress sends a fixed CORS allow-list from `rest_send_cors_headers()`:
 *
 *     Authorization, X-WP-Nonce, Content-Disposition, Content-MD5,
 *     Content-Type, X-Sli-Auth-Token
 *
 * A custom request header makes the browser send an `OPTIONS` preflight. The
 * preflight is answered `200` with that allow-list, the browser compares it
 * against the headers the request actually carries, finds `x-client-telemetry`
 * missing, and **refuses to send the request at all**. Measured in production
 * on 2026-11-04, from a real browser on every page that reads the feed:
 *
 *     Cross-Origin Request Blocked: ... header 'x-client-telemetry' is not
 *     allowed according to header 'Access-Control-Allow-Headers' from CORS
 *     preflight. (Reason: CORS request did not succeed)
 *
 * So every dispatch fetch failed, and `FALLBACK_POSTS` in ./api.js supplied
 * three wholly invented articles in its place — on the homepage, the archive and
 * the platform page. The site looked healthy. That is the same shape as the
 * `npm audit -> 0` claim Sprint 2.20 corrected: a green surface over a dead
 * mechanism.
 *
 * ## The rule
 *
 *  - First-party targets (`ellars.us.com`, `www.ellars.us.com`, localhost, or a
 *    relative URL) keep the vendor headers. Behaviour there is unchanged.
 *  - Third-party targets never receive a header that only we understand. That
 *    drops the preflight where the preflight was the defect, without touching
 *    any credentialed header a third party does accept (`apikey`,
 *    `Authorization`, `Prefer`, `Range` — Supabase reflects those back).
 *  - A bodyless GET/HEAD to a third party does not declare `Content-Type`. It
 *    has no body to describe, and declaring one is a non-simple header that buys
 *    a wasted `OPTIONS` round trip on every feed read.
 */

/** Provenance headers. Ours to define, ours to read — and nobody reads them. */
export const VENDOR_HEADERS = {
  'X-Project-Domain': 'ellars.us.com',
  'X-Client-Telemetry': 'AXiM-Frontend-v1',
};

/**
 * Headers that are meaningful only to infrastructure we operate. A third party is
 * entitled to reject any of these in its CORS allow-list, and WordPress does.
 */
export const THIRD_PARTY_UNSAFE_HEADERS = [
  'x-client-telemetry',
  'x-project-domain',
  'x-axim-tenant',
  'cache-control',
];

/** Hosts we operate. Everything else is third-party, `*.pages.dev` previews included. */
const FIRST_PARTY_HOSTS = new Set([
  'ellars.us.com',
  'www.ellars.us.com',
  'localhost',
  '127.0.0.1',
  '[::1]',
]);

const hostOf = (url, origin) => {
  try {
    // Relative URLs resolve against the page origin; without one (SSR, tests)
    // a relative path can only be first-party, so fall back to a sentinel.
    return new URL(String(url), origin || 'https://ellars.us.com').hostname.toLowerCase();
  } catch {
    return '';
  }
};

/**
 * True when the request goes to infrastructure we operate.
 *
 * Deliberately conservative: an unparseable URL is treated as first-party (it is
 * almost certainly a relative path), and the production brand hosts are listed
 * explicitly so a fetch from a `*.pages.dev` preview that is *targeting*
 * production still counts as first-party.
 */
export const isFirstPartyUrl = (url, origin) => {
  const path = String(url ?? '');
  if (!/^[a-z][a-z0-9+.-]*:/i.test(path)) return true; // relative: same origin
  const host = hostOf(path, origin);
  if (!host) return true;
  return FIRST_PARTY_HOSTS.has(host);
};

export const isBodylessMethod = (method) => {
  const verb = String(method || 'GET').toUpperCase();
  return verb === 'GET' || verb === 'HEAD';
};

/**
 * Builds the final header set for one request.
 *
 * @param {object} input
 * @param {string} input.url            absolute or relative target
 * @param {string} [input.origin]       the page origin (relative-URL resolution)
 * @param {string} [input.method]       request verb, defaults to GET
 * @param {boolean} [input.hasBody]     true when a body will be sent
 * @param {object} [input.headers]      caller-supplied headers, merged last
 * @returns {object} a plain object of header name -> value
 */
export const buildRequestHeaders = ({ url, origin, method = 'GET', hasBody = false, headers = {} } = {}) => {
  const merged = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    ...VENDOR_HEADERS,
    ...(headers || {}),
  };

  if (isFirstPartyUrl(url, origin)) return merged;

  const out = {};
  for (const [name, value] of Object.entries(merged)) {
    if (THIRD_PARTY_UNSAFE_HEADERS.includes(name.toLowerCase())) continue;
    if (!hasBody && isBodylessMethod(method) && name.toLowerCase() === 'content-type') continue;
    out[name] = value;
  }
  return out;
};

export default buildRequestHeaders;
