#!/usr/bin/env node
/**
 * Post-deploy probe for ellars.us.com.
 *
 * Run against production:  npm run probe
 * Against a preview:       npm run probe -- --base=https://abc.ellars-us-com.pages.dev
 *
 * ## Why this exists
 *
 * Two production defects shipped through a fully green pipeline in November 2026,
 * and neither was catchable where the pipeline looked:
 *
 *  - Sprint 2.21: every WordPress request was blocked by its own CORS preflight, so
 *    the dispatch feed had never loaded and three invented articles filled the
 *    homepage. The site answered `200` throughout.
 *  - Sprint 2.22: the fix for that shipped a sitemap that served a degraded document
 *    from cache for ten minutes — no dispatches at all — because `s-maxage` does not
 *    set a Cache API lifetime. CI ran the same code that passed.
 *
 * `verify.yml` proves the *build* is correct. Nothing proved the *deployment* was.
 * A scheduled probe that asks the origin the same questions a crawler and a browser
 * ask would have caught both in seconds.
 *
 * ## Design
 *
 *  - **Expectations are imported, not re-typed.** Titles, descriptions, robots and
 *    canonicals come from `lib/edge/meta.js`, and the list of advertised URLs from
 *    `functions/sitemap.xml.js` — the same tables the edge serves from. A copy edit
 *    cannot leave a stale probe asserting yesterday's title (the failure mode Sprint
 *    2.17 removed from the site itself).
 *  - **No dependencies and no secrets.** Plain `node`, global `fetch`, public
 *    endpoints only, so it runs in CI without an install step or a token.
 *  - **Requests declare a document.** `Accept: text/html` is what selects the
 *    middleware branch. Probing with `Accept: *\/*` measures the SPA fallback
 *    instead, which is how a healthy deployment can look like a broken one.
 *  - **Retries are for transport, never for assertions.** A 5xx, a 429 or a socket
 *    error is retried (cold workers, deploy propagation). A wrong title or a 200
 *    where a 404 belongs fails immediately — retrying would just hide it.
 *  - **Exit code is the signal.** Any failed check exits 1 and prints the measured
 *    value next to the expected one.
 */

import {
  NOT_FOUND_META,
  SITE_ORIGIN,
  canonicalOriginFor,
  isPreviewHost,
  resolveMeta,
} from '../lib/edge/meta.js';
import { compareDocument, readDocumentIdentity } from '../lib/edge/documentIdentity.js';
import { DIRECTIVE_SLUGS, STATIC_ROUTES } from '../functions/sitemap.xml.js';

const args = process.argv.slice(2);
const option = (name, fallback) => {
  const prefix = `--${name}=`;
  const found = args.find((argument) => argument.startsWith(prefix));
  return found ? found.slice(prefix.length) : fallback;
};

const BASE = option('base', SITE_ORIGIN).replace(/\/+$/, '');
const ATTEMPTS = Math.max(1, Number(option('attempts', '3')) || 3);
const TIMEOUT_MS = Math.max(1000, Number(option('timeout', '15000')) || 15000);
const DOCUMENT_ACCEPT = 'text/html,application/xhtml+xml';

const baseUrl = new URL(BASE);
/**
 * The origin a canonical should name. On production this is the site origin; on a
 * preview host the middleware canonicalises to production and noindexes, and the
 * probe asserts that too — it is the preview deployment's job to be invisible.
 */
const expectedOrigin = canonicalOriginFor(baseUrl);
const onPreviewHost = isPreviewHost(baseUrl);
const metaFor = (path) => resolveMeta(path, expectedOrigin, { forceNoindex: onPreviewHost });

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const typeOf = (response) => (response.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();

/** Prints a measured value next to the expected one without printing `undefined`. */
const quote = (value) => (value === null || value === undefined ? 'absent' : JSON.stringify(value));

/**
 * One request, with retries only where they cannot mask a defect.
 */
const request = async (path, { method = 'GET', accept = DOCUMENT_ACCEPT, acceptStatuses = [] } = {}) => {
  const url = new URL(path, BASE).toString();
  let lastError = null;

  for (let attempt = 1; attempt <= ATTEMPTS; attempt += 1) {
    try {
      const response = await fetch(url, {
        method,
        redirect: 'follow',
        headers: { accept, 'user-agent': 'ellars-postdeploy-probe/1.0 (+https://ellars.us.com)' },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      // A platform 5xx or a rate limit is transient; a 404 or a 200 is an answer, and
      // so is any status the endpoint documents as meaningful — `/api/config` answers
      // 503 when it is unbound, which is a fact about the deployment, not a glitch to
      // retry until it becomes an unreadable transport error.
      const isAnswer = response.status < 500 && response.status !== 429;
      if (isAnswer || acceptStatuses.includes(response.status)) return response;
      lastError = new Error(`HTTP ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    if (attempt < ATTEMPTS) await sleep(500 * attempt * attempt);
  }

  throw new Error(`${method} ${url} failed after ${ATTEMPTS} attempts: ${lastError?.message ?? 'unknown error'}`);
};

const getDocument = async (path) => {
  const response = await request(path, { accept: DOCUMENT_ACCEPT });
  return { response, html: await response.text() };
};

const results = [];

/**
 * A check returns either an array of failures, or `{ failures, note }` when it has
 * something measured to report that is not a defect (an environment-dependent state).
 * The note prints under `ok`, so a passing check explains itself instead of hiding.
 */
const test = async (name, run) => {
  try {
    const outcome = await run();
    if (Array.isArray(outcome)) {
      results.push({ name, failures: outcome });
      return;
    }
    results.push({ name, failures: outcome?.failures ?? [], note: outcome?.note });
  } catch (error) {
    results.push({ name, failures: [`request failed: ${error.message}`] });
  }
};

const decodeJwtClaim = (token, claim) => {
  const payload = String(token).split('.')[1];
  if (!payload) return null;
  try {
    const json = Buffer.from(payload.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
    return JSON.parse(json)[claim] ?? null;
  } catch {
    return null;
  }
};

const locsOf = (xml) => [...String(xml).matchAll(/<loc>([^<]*)<\/loc>/g)].map((match) => match[1]);

// Randomised so the probe can never collide with a path that later becomes real.
const missingPath = `/probe-not-a-route-${Date.now().toString(36)}`;
const missingAsset = `/probe-not-an-asset-${Date.now().toString(36)}.png`;

console.log(`POST-DEPLOY PROBE — ${BASE}`);
console.log(onPreviewHost ? `  (preview host: canonicals must point at ${expectedOrigin}, robots must be noindex)` : '');

/* ---------------------------------------------------------------------------
 * 1. Every route the sitemap advertises serves the identity the edge table declares.
 *
 * This is the crawler's view of the site in raw bytes: a middleware regression, a
 * stale shell, a title that drifted from the table, or a route advertised and then
 * 404'd all fail here. `compareDocument` also counts each key, so the two-of-each
 * defect of Sprint 2.17 cannot return unnoticed.
 * ------------------------------------------------------------------------- */
const advertisedPaths = [
  ...STATIC_ROUTES.map((route) => route.path),
  ...DIRECTIVE_SLUGS.map((slug) => `/platform/${slug}`),
  '/login',
  '/dashboard',
];

for (const path of advertisedPaths) {
  await test(`${path} → 200 with the edge table's identity`, async () => {
    const { response, html } = await getDocument(path);
    return compareDocument({
      path,
      status: response.status,
      expectedStatus: 200,
      html,
      meta: metaFor(path),
      siteOrigin: expectedOrigin,
    });
  });
}

/* ---------------------------------------------------------------------------
 * 2. The 404 surface.
 *
 * Before Sprint 2.12 an unknown path was an indexable 200 carrying the site title;
 * `_redirects` can only answer 200, so this is answered by the middleware and is
 * worth asserting from outside the repo.
 * ------------------------------------------------------------------------- */
await test(`${missingPath} → 404 with the NotFound identity and no canonical`, async () => {
  const { response, html } = await getDocument(missingPath);
  return compareDocument({
    path: missingPath,
    status: response.status,
    expectedStatus: 404,
    html,
    meta: { ...NOT_FOUND_META, canonical: null },
    siteOrigin: expectedOrigin,
  });
});

await test('/platform/<unknown-slug> → 404', async () => {
  const { response, html } = await getDocument('/platform/probe-not-a-directive');
  return compareDocument({
    path: '/platform/probe-not-a-directive',
    status: response.status,
    expectedStatus: 404,
    html,
    meta: { ...NOT_FOUND_META, canonical: null },
    siteOrigin: expectedOrigin,
  });
});

/**
 * A missing file must be a real 404 in text/plain, never the HTML shell with a 200.
 * Sprint 2.9: a stale chunk hash was answered with `<!doctype html>`, the module
 * loader refused it, and the page went blank.
 */
for (const path of [missingAsset, `/assets/probe-not-a-chunk-${Date.now().toString(36)}.js`]) {
  await test(`${path} → 404 text/plain (never the SPA shell)`, async () => {
    const response = await request(path, { accept: 'image/png,image/*' });
    const failures = [];
    if (response.status !== 404) failures.push(`answered ${response.status}, expected 404`);
    if (typeOf(response) !== 'text/plain') failures.push(`content-type ${typeOf(response)}, expected text/plain`);
    const body = await response.text();
    if (/doctype|<html/i.test(body)) failures.push('body is the HTML shell');
    if (response.headers.get('cache-control') !== 'no-store') {
      failures.push(`cache-control ${response.headers.get('cache-control')}, expected no-store`);
    }
    return failures;
  });
}

/* ---------------------------------------------------------------------------
 * 3. robots.txt is a file, not a route.
 *
 * The first version of the file rule treated only binary extensions as files, so
 * `/robots.txt` fell into the document branch and answered 404 to every client
 * that sent `Accept: text/html` — which is every browser and every crawler.
 * ------------------------------------------------------------------------- */
await test('/robots.txt → 200 text/plain with a Sitemap directive', async () => {
  const response = await request('/robots.txt', { accept: DOCUMENT_ACCEPT });
  const failures = [];
  if (response.status !== 200) failures.push(`answered ${response.status}, expected 200`);
  if (typeOf(response) !== 'text/plain') failures.push(`content-type ${typeOf(response)}, expected text/plain`);
  const body = await response.text();
  if (!/^\s*Sitemap:\s*https:\/\//im.test(body)) failures.push('no Sitemap directive');
  if (!/Disallow:\s*\/dashboard/i.test(body)) failures.push('no Disallow for /dashboard');
  return failures;
});

/* ---------------------------------------------------------------------------
 * 4. /api/config is bound, normalised, and never serves a service_role key.
 *
 * Sprint 2.8/2.9: an unbound or mis-set binding disabled login, the dashboard and
 * the Vault while every public page looked healthy. The project URL was the
 * PostgREST endpoint (`/rest/v1/`), which supabase-js then doubled into a 404.
 * ------------------------------------------------------------------------- */
const CONFIG_OPTIONS = { accept: 'application/json', acceptStatuses: [503] };

await test('/api/config → configured:true with a normalised project origin', async () => {
  const response = await request('/api/config', CONFIG_OPTIONS);
  const failures = [];
  if (response.status !== 200) {
    // Measured 2026-11-05: the anon key is bound for Production only, so every
    // preview deployment answers 503 here while production answers 200. That is a
    // dashboard setting (open item 1c), not a defect in the deployment being probed
    // — but it is exactly what this check exists to catch on production.
    if (onPreviewHost && response.status === 503) {
      return {
        failures: [],
        note: 'preview deployment: no anon key is bound here, so /api/config answers 503 by design (open item 1c) — auth is untestable from a preview',
      };
    }
    failures.push(`answered ${response.status}, expected 200 (unbound config)`);
    return failures;
  }
  const body = await response.json();
  if (body.configured !== true) failures.push(`configured ${quote(body.configured)}, expected true`);
  if (!/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(body.supabaseUrl || '')) {
    failures.push(`supabaseUrl ${quote(body.supabaseUrl)}, expected a bare https://<ref>.supabase.co origin`);
  }
  if ((body.supabaseAnonKey || '').length < 40) failures.push('supabaseAnonKey is missing or truncated');
  if (decodeJwtClaim(body.supabaseAnonKey, 'role') === 'service_role') {
    failures.push('the served key has role service_role — a live RLS bypass');
  }
  return failures;
});

/* ---------------------------------------------------------------------------
 * 5. The sitemap is a sitemap, and it knows about the dispatches.
 *
 * Sprint 2.22's defect was exactly this document: 1,538 bytes, no `/articles/`
 * URLs, served from cache with the right status and content type for ten minutes.
 * A status check alone would have passed all night.
 * ------------------------------------------------------------------------- */
let sitemapLocs = [];

await test('/sitemap.xml → 200 application/xml, cached, with live dispatches', async () => {
  const response = await request('/sitemap.xml', { accept: 'application/xml' });
  const xml = await response.text();
  const failures = [];

  if (response.status !== 200) failures.push(`answered ${response.status}, expected 200`);
  if (typeOf(response) !== 'application/xml') failures.push(`content-type ${typeOf(response)}, expected application/xml`);
  if (!xml.includes('<urlset')) failures.push('no <urlset> element');

  sitemapLocs = locsOf(xml);
  const articles = sitemapLocs.filter((loc) => loc.startsWith(`${expectedOrigin}/articles/`));
  if (sitemapLocs.length === 0) failures.push('no <loc> entries at all');
  if (articles.length === 0) failures.push('no /articles/ URLs — the dispatch feed contributed nothing');

  const offOrigin = sitemapLocs.filter((loc) => !loc.startsWith(`${expectedOrigin}/`) && loc !== expectedOrigin);
  if (offOrigin.length) failures.push(`${offOrigin.length} loc(s) off-origin, e.g. ${offOrigin[0]}`);

  // WordPress hands back `Siphon Economy &amp; You`; escaping that verbatim renders
  // literally, which a preview shows as `&amp;amp;`.
  if (xml.includes('&amp;amp;')) failures.push('a URL is double-escaped (&amp;amp;)');

  const cacheControl = response.headers.get('cache-control') || '';
  if (!/max-age=\d+/.test(cacheControl)) failures.push(`cache-control ${quote(cacheControl)}, expected an explicit max-age`);
  // A Pages Function is not implicitly cached; `s-maxage` is ignored by the Cache API
  // and splitting the lifetime across two directives is what produced 2.22.
  if (/s-maxage/.test(cacheControl)) failures.push(`cache-control ${quote(cacheControl)} still carries s-maxage`);

  const cacheState = response.headers.get('x-sitemap-cache') || '';
  if (!/^(hit|miss|miss-degraded|miss-stale-posts)$/.test(cacheState)) {
    failures.push(`x-sitemap-cache ${quote(cacheState)}, expected hit/miss/miss-degraded/miss-stale-posts`);
  }
  // `miss-degraded` on a document that still has dispatches is fine (stale post
  // list); `miss-degraded` with none is the outage this probe is here to see.

  return failures;
});

/* ---------------------------------------------------------------------------
 * 6. A dispatch really serves a dispatch document.
 *
 * Sampled rather than exhaustive: the sitemap carries dozens of posts, and the
 * point is that the template answers with per-article identity instead of
 * collapsing every post onto the homepage canonical.
 * ------------------------------------------------------------------------- */
const articleSample = sitemapLocs.filter((loc) => loc.startsWith(`${expectedOrigin}/articles/`)).slice(0, 2);

for (const loc of articleSample) {
  const path = new URL(loc).pathname;
  await test(`${path} (a live dispatch) → 200 with its own canonical`, async () => {
    const { response, html } = await getDocument(path);
    return compareDocument({
      path,
      status: response.status,
      expectedStatus: 200,
      html,
      meta: metaFor(path),
      siteOrigin: expectedOrigin,
    });
  });
}

/* ---------------------------------------------------------------------------
 * 7. HEAD answers what GET answers.
 *
 * Sprint 2.21: only GET was handled, so every HEAD fell through `_redirects` and was
 * told `200 text/html` — including paths and files that do not exist. Every uptime
 * monitor and link checker was reading the opposite of the truth.
 * ------------------------------------------------------------------------- */
const parityProbes = [
  { path: '/sitemap.xml', accept: 'application/xml', expected: 200 },
  { path: '/platform', accept: DOCUMENT_ACCEPT, expected: 200 },
  { path: missingPath, accept: DOCUMENT_ACCEPT, expected: 404 },
  { path: missingAsset, accept: 'image/png,image/*', expected: 404 },
  // On a preview host the expected status is whatever the environment answers (503
  // when the anon key is unbound); HEAD must still agree with GET, which is the
  // property this check owns.
  { path: '/api/config', ...CONFIG_OPTIONS, expected: onPreviewHost ? null : 200 },
];

for (const probe of parityProbes) {
  await test(`HEAD ${probe.path} matches GET`, async () => {
    const failurePrefix = `${probe.path}:`;
    const getResponse = await request(probe.path, { accept: probe.accept, acceptStatuses: probe.acceptStatuses });
    const headResponse = await request(probe.path, {
      accept: probe.accept,
      acceptStatuses: probe.acceptStatuses,
      method: 'HEAD',
    });
    const failures = [];

    if (probe.expected !== null && getResponse.status !== probe.expected) {
      failures.push(`${failurePrefix} GET answered ${getResponse.status}, expected ${probe.expected}`);
    }
    if (headResponse.status !== getResponse.status) {
      failures.push(`${failurePrefix} HEAD answered ${headResponse.status} where GET answered ${getResponse.status}`);
    }
    if (typeOf(headResponse) !== typeOf(getResponse)) {
      failures.push(`${failurePrefix} HEAD content-type ${typeOf(headResponse)}, GET ${typeOf(getResponse)}`);
    }
    if ((await headResponse.text()) !== '') failures.push(`${failurePrefix} HEAD carried a body`);
    return failures;
  });
}

/* ---------------------------------------------------------------------------
 * 8. The document carries the security headers that live in public/_headers.
 *
 * A Functions response does not inherit `_headers`, so the middleware passes the
 * shell's headers through by hand. Its first version dropped exactly this set —
 * the CSP silently vanished from the one surface that most needs it.
 * ------------------------------------------------------------------------- */
await test("/ → the shell's security headers survived the middleware rewrite", async () => {
  const { response, html } = await getDocument('/');
  const failures = [];
  const csp = response.headers.get('content-security-policy') || '';
  const hsts = response.headers.get('strict-transport-security') || '';

  if (!/default-src 'self'/.test(csp)) failures.push(`CSP ${quote(csp.slice(0, 60))} has no default-src 'self'`);
  if (/connect-src\s+'https:'/.test(csp)) failures.push("CSP connect-src is 'https:' — that permits exfiltration to any host");
  if (!/frame-ancestors 'none'/.test(csp)) failures.push("CSP is missing frame-ancestors 'none'");
  if (!/max-age=(\d{7,})/.test(hsts)) failures.push(`HSTS ${quote(hsts)} is missing or under ~115 days`);
  if (response.headers.get('x-frame-options') !== 'DENY') failures.push(`x-frame-options ${quote(response.headers.get('x-frame-options'))}`);
  if (response.headers.get('x-content-type-options') !== 'nosniff') failures.push('x-content-type-options is not nosniff');

  // A rewritten body must not keep the shell's validator.
  if (response.headers.get('etag') && !/W\//.test(response.headers.get('etag'))) {
    failures.push(`etag ${quote(response.headers.get('etag'))} — a rewritten document cannot keep the shell's validator`);
  }

  // And the document itself is the homepage, not the shell default.
  const identity = readDocumentIdentity(html);
  if (identity.title !== metaFor('/').title) failures.push(`title ${quote(identity.title)}`);
  return failures;
});

/* ---------------------------------------------------------------------------
 * 9. The advertised social card resolves.
 *
 * index.html pointed og:image at /screenshot_home.png for a month. The file was
 * never committed, and the request was answered by the SPA shell with a 200 — so no
 * check noticed, and every shared link previewed blank.
 * ------------------------------------------------------------------------- */
await test('og:image resolves as a real PNG on the site origin', async () => {
  const { html } = await getDocument('/');
  const declared = html.match(/<meta\s+property="og:image"\s+content="([^"]+)"/i)?.[1];
  const failures = [];
  if (!declared) return ['no og:image declared on /'];
  if (!declared.startsWith(`${SITE_ORIGIN}/`)) failures.push(`og:image ${quote(declared)} is not on ${SITE_ORIGIN}`);

  const card = await request(new URL(declared).pathname, { accept: 'image/png,image/*' });
  if (card.status !== 200) {
    failures.push(`og:image answered ${card.status}, expected 200`);
    return failures;
  }
  if (typeOf(card) !== 'image/png') failures.push(`og:image content-type ${typeOf(card)}, expected image/png`);
  const bytes = (await card.arrayBuffer()).byteLength;
  if (bytes < 1000) failures.push(`og:image is ${bytes} bytes`);
  if (bytes > 300 * 1024) failures.push(`og:image is ${bytes} bytes, over the 300 kB scraper limit`);
  return failures;
});

/* ---------------------------------------------------------------------------
 * 10. The self-hosted typefaces are served from this origin.
 *
 * Sprint 2.25 replaced an `@import fonts.googleapis.com` with four WOFF2 files here.
 * The failure mode is silent — the browser falls back to sans-serif and nobody notices
 * except on a machine that has never cached the site — so the file, its content type
 * and its magic number are asserted rather than assumed. It also proves the edge's
 * file rule covers .woff2 (a font answered by the SPA shell would be a `text/html` 200).
 * ------------------------------------------------------------------------- */
for (const font of ['inter-variable.woff2', 'cinzel-variable.woff2']) {
  await test(`/fonts/${font} → 200 font/woff2 from the origin`, async () => {
    const response = await request(`/fonts/${font}`, { accept: 'font/woff2,*/*' });
    const failures = [];
    if (response.status !== 200) failures.push(`answered ${response.status}, expected 200`);
    if (typeOf(response) !== 'font/woff2') failures.push(`content-type ${typeOf(response)}, expected font/woff2`);
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.byteLength < 5000) failures.push(`${bytes.byteLength} bytes, expected a real font file`);
    if (String.fromCharCode(...bytes.subarray(0, 4)) !== 'wOF2') failures.push('body is not a WOFF2 file');
    return failures;
  });
}

/* ---------------------------------------------------------------------------
 * Report.
 * ------------------------------------------------------------------------- */
const failed = results.filter((result) => result.failures.length > 0);

for (const result of results) {
  if (result.failures.length === 0) {
    console.log(`  ok   ${result.name}`);
    if (result.note) console.log(`         ${result.note}`);
    continue;
  }
  console.log(`  FAIL ${result.name}`);
  for (const failure of result.failures) console.log(`         ${failure}`);
}

console.log(`\n${results.length - failed.length} passed, ${failed.length} failed`);

if (failed.length > 0) {
  console.error('\nThe deployment does not match the repository. See the measured values above.');
  process.exit(1);
}
