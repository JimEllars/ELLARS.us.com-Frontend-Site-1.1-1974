/**
 * Edge-function smoke tests.
 *
 * There is no test runner in this project yet (vitest is an open item in
 * PlanForContinuedDevelopment.md), but two Pages Functions carry decisions that
 * fail *silently* when they break — which is exactly how the site shipped for
 * weeks with no working Supabase credential:
 *
 *   functions/api/config.js      — if this mis-resolves, auth/dashboard/vault die
 *                                  while every public page still looks healthy.
 *   functions/sitemap.xml.js     — a double-escaped entity or a colo-dependent
 *                                  <lastmod> is invisible until a crawler notices.
 *
 * Plain `node`, no dependencies, so it can gate CI without an install step
 * beyond the one the build already needs. Run with: npm run test:functions
 */

import { onRequestGet as configHandler } from '../functions/api/config.js';
import { onRequest as assetsHandler } from '../functions/assets/[[path]].js';
import { onRequest as middleware } from '../functions/_middleware.js';
import {
  DIRECTIVE_SLUGS as META_DIRECTIVE_SLUGS,
  NOT_FOUND_META,
  SITE_CARD,
  SITE_ORIGIN,
  applyMeta,
  canonicalOriginFor,
  isPreviewHost,
  resolveMeta,
  siteCardUrl,
  wantsDocument,
} from '../lib/edge/meta.js';
import { isFileRequest, isReservedPath, isStaticFileRequest } from '../lib/edge/assets.js';
import { sinkNote, sinkVerdict } from '../lib/edge/telemetrySinks.js';
import { MANAGED_KEYS, compareDocument, readDocumentIdentity } from '../lib/edge/documentIdentity.js';
import { readFileSync, readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import {
  CACHE_KEY_PATH,
  DIRECTIVE_SLUGS,
  POSTS_CACHE_KEY_PATH,
  STATIC_ROUTES,
  buildSitemap,
  escapeXml,
  onRequestGet as sitemapGet,
  onRequestHead as sitemapHead,
  toUtcIso,
} from '../functions/sitemap.xml.js';

const b64url = (value) =>
  Buffer.from(JSON.stringify(value)).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

const fakeJwt = (role) =>
  `${b64url({ alg: 'HS256', typ: 'JWT' })}.${b64url({ iss: 'supabase', ref: 'test', role })}.sig`;

let passed = 0;
const failures = [];

const check = (name, condition, detail = '') => {
  if (condition) {
    passed += 1;
    console.log(`  ok   ${name}`);
    return;
  }
  failures.push(`${name}${detail ? ` :: ${detail}` : ''}`);
  console.log(`  FAIL ${name}${detail ? ` :: ${detail}` : ''}`);
};

const describe = (label) => console.log(`\n${label}`);

/**
 * Guards read code, not prose. Several comments in this codebase quote the exact
 * patterns being banned (and one of them was written by this very guard's predecessor),
 * so a source check that trips on documentation gets deleted rather than fixed.
 */
const stripComments = (source) =>
  source
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
    .split('\n')
    .filter((line) => !/^\s*\/\//.test(line))
    .join('\n');


describe('functions/api/config.js');
{
  const response = await configHandler({ env: {} });
  const body = await response.json();
  check('unbound deployment -> 503', response.status === 503, String(response.status));
  check('unbound deployment -> configured:false', body.configured === false && body.supabaseAnonKey === '');
  check('unbound deployment -> uncacheable', response.headers.get('Cache-Control') === 'no-store');
  check(
    'unbound deployment still names the project url',
    body.supabaseUrl === 'https://pvbcdndqjguzqeafhwhw.supabase.co',
    body.supabaseUrl
  );
}
{
  const key = fakeJwt('anon');
  const response = await configHandler({ env: { SUPABASE_ANON_KEY: key } });
  const body = await response.json();
  check('anon key -> 200', response.status === 200, String(response.status));
  check('anon key served verbatim', body.supabaseAnonKey === key);
  check('anon key -> short edge cache', /max-age=300/.test(response.headers.get('Cache-Control') || ''));
  check('anon key -> json content type', /application\/json/.test(response.headers.get('Content-Type') || ''));
}
{
  const response = await configHandler({
    env: { VITE_SUPABASE_ANON_KEY: fakeJwt('anon'), SUPABASE_URL: 'https://example.supabase.co' },
  });
  const body = await response.json();
  check('VITE_ alias accepted', response.status === 200 && body.supabaseAnonKey.length > 0);
  check('SUPABASE_URL honoured', body.supabaseUrl === 'https://example.supabase.co', body.supabaseUrl);
}
{
  const response = await configHandler({ env: { SUPABASE_ANON_KEY: fakeJwt('service_role') } });
  const body = await response.json();
  check('service_role key refused -> 500', response.status === 500, String(response.status));
  check('service_role key never leaves the edge', body.supabaseAnonKey === '');
  check('service_role key reported as wrong_key_role', body.error === 'wrong_key_role');
}
{
  const response = await configHandler({ env: { SUPABASE_ANON_KEY: 'opaque-key-without-claims' } });
  check('non-JWT publishable key tolerated', response.status === 200, String(response.status));
}
{
  // The production binding is the PostgREST endpoint, not the project root.
  const response = await configHandler({
    env: { SUPABASE_ANON_KEY: fakeJwt('anon'), SUPABASE_URL: 'https://abc.supabase.co/rest/v1/' },
  });
  const body = await response.json();
  check('service path stripped from the project url', body.supabaseUrl === 'https://abc.supabase.co', body.supabaseUrl);
}
{
  const response = await configHandler({
    env: { SUPABASE_ANON_KEY: fakeJwt('anon'), SUPABASE_URL: 'https://abc.supabase.co/auth/v1' },
  });
  const body = await response.json();
  check('auth path stripped from the project url', body.supabaseUrl === 'https://abc.supabase.co', body.supabaseUrl);
}
{
  const response = await configHandler({
    env: { SUPABASE_ANON_KEY: fakeJwt('anon'), SUPABASE_URL: 'https://abc.supabase.co//' },
  });
  const body = await response.json();
  check('trailing slashes stripped', body.supabaseUrl === 'https://abc.supabase.co', body.supabaseUrl);
}
{
  const response = await configHandler({ env: { SUPABASE_ANON_KEY: fakeJwt('anon'), SUPABASE_URL: 'not a url' } });
  const body = await response.json();
  check(
    'unparseable url falls back to the default project',
    body.supabaseUrl === 'https://pvbcdndqjguzqeafhwhw.supabase.co',
    body.supabaseUrl
  );
}

describe('functions/assets/[[path]].js');
{
  const request = new Request('https://ellars.us.com/assets/index-abc123.js');
  const upstream = new Response('console.log(1)', {
    status: 200,
    headers: { 'Content-Type': 'application/javascript', 'Cache-Control': 'public, max-age=31536000, immutable' },
  });
  const response = await assetsHandler({ request, env: { ASSETS: { fetch: async () => upstream } } });
  check('existing asset passed through untouched', response.status === 200);
  check('existing asset keeps its content type', response.headers.get('Content-Type') === 'application/javascript');
  check('existing asset keeps its immutable cache rule', /immutable/.test(response.headers.get('Cache-Control') || ''));
}
{
  const request = new Request('https://ellars.us.com/assets/gone-abc123.js');
  const response = await assetsHandler({
    request,
    env: { ASSETS: { fetch: async () => new Response('not found', { status: 404 }) } },
  });
  check('missing asset -> 404, not the SPA shell', response.status === 404, String(response.status));
  check('missing asset -> never cached', response.headers.get('Cache-Control') === 'no-store');
  check('missing asset -> nosniff', response.headers.get('X-Content-Type-Options') === 'nosniff');
}
{
  // The real failure mode: env.ASSETS.fetch routes through _redirects, so a miss
  // comes back as index.html with a 200 rather than a 404.
  const request = new Request('https://ellars.us.com/assets/gone-abc123.js');
  const shell = new Response('<!doctype html><html></html>', {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
  const response = await assetsHandler({ request, env: { ASSETS: { fetch: async () => shell } } });
  check('SPA shell returned for an asset -> 404', response.status === 404, String(response.status));
  check('SPA shell is not passed through', !/doctype/i.test(await response.text()));
}
{
  const request = new Request('https://ellars.us.com/assets/gone-abc123.js');
  const response = await assetsHandler({ request, env: {} });
  check('no assets binding degrades to 404, not a crash', response.status === 404, String(response.status));
}

describe('functions/sitemap.xml.js');
check(
  'entity is not double-escaped',
  escapeXml('Siphon Economy &amp; You') === 'Siphon Economy &amp; You',
  escapeXml('Siphon Economy &amp; You')
);
check('raw ampersand escaped exactly once', escapeXml('A & B') === 'A &amp; B', escapeXml('A & B'));
check('quotes escaped', escapeXml('say "hi"') === 'say &quot;hi&quot;', escapeXml('say "hi"'));
check(
  'naive WordPress timestamp pinned to UTC',
  toUtcIso('2026-10-30T06:00:00') === '2026-10-30T06:00:00.000Z',
  toUtcIso('2026-10-30T06:00:00')
);
check(
  'already-zoned timestamp trusted',
  toUtcIso('2026-10-30T12:00:00+05:00') === '2026-10-30T07:00:00.000Z',
  toUtcIso('2026-10-30T12:00:00+05:00')
);
check('unparseable timestamp -> omitted', toUtcIso('nope') === null);
// Assert the paths themselves rather than a count. A bare `length === 4` passes when one
// route is swapped for another and fails when one is legitimately added — which is exactly
// backwards. This is also the guard that would have caught /privacy being added to the
// router without a sitemap entry, or the reverse.
const EXPECTED_STATIC_PATHS = ['/', '/platform', '/about', '/news-media', '/privacy'];
check(
  'static route table mirrors the router',
  JSON.stringify(STATIC_ROUTES.map((route) => route.path)) === JSON.stringify(EXPECTED_STATIC_PATHS),
  STATIC_ROUTES.map((route) => route.path).join(', ')
);
check('directive slug table mirrors DirectiveDetail', DIRECTIVE_SLUGS.length === 6, String(DIRECTIVE_SLUGS.length));

// A HEAD on /sitemap.xml used to fall through `_redirects` to the SPA shell, so a
// tool that probed the sitemap first was told `text/html`. And the response
// advertised an hour of edge caching while `cf-cache-status` measured DYNAMIC on
// every repeat: a Pages Function is not implicitly cached, so the Cache API is
// now what holds the document. Its *first* deploy then taught the other two
// lessons asserted here — `s-maxage` alone does not set a Cache API lifetime, and
// a failed origin must not be allowed to erase the dispatches it could not see.
{
  // Deterministic failure: port 1 refuses immediately, so "WordPress is down" is
  // exercised without reaching the network.
  const deadOrigin = { WP_API_URL: 'http://127.0.0.1:1/wp-json/wp/v2' };
  const request = new Request('https://ellars.us.com/sitemap.xml');
  const documentKey = `https://ellars.us.com${CACHE_KEY_PATH}`;
  const postsKey = `https://ellars.us.com${POSTS_CACHE_KEY_PATH}`;

  const head = await sitemapHead({ request: new Request(request, { method: 'HEAD' }), env: deadOrigin });
  check('HEAD /sitemap.xml is answered by the sitemap, not the SPA shell', head.status === 200, String(head.status));
  check(
    'HEAD /sitemap.xml declares XML',
    head.headers.get('content-type') === 'application/xml; charset=utf-8',
    head.headers.get('content-type')
  );
  check('HEAD /sitemap.xml carries no body', (await head.text()) === '');

  const get = await sitemapGet({ request, env: deadOrigin });
  const xml = await get.text();
  check('a degraded sitemap still serves the static routes', xml.includes('<loc>https://ellars.us.com/platform</loc>'));
  check('a degraded sitemap keeps all six directives', DIRECTIVE_SLUGS.every((slug) => xml.includes(`/platform/${slug}<`)));
  check(
    'a degraded sitemap lives for a minute, not an hour',
    get.headers.get('x-sitemap-ttl') === '60',
    get.headers.get('x-sitemap-ttl')
  );
  // The measured regression: `max-age=600, s-maxage=60` was stored for ten
  // minutes. One number, in the directive the Cache API reads.
  check(
    'the stored lifetime is stated in max-age, which the Cache API honours',
    get.headers.get('cache-control') === 'public, max-age=60',
    get.headers.get('cache-control')
  );
  check('no s-maxage is advertised for a Pages Function', !/s-maxage/.test(get.headers.get('cache-control') || ''));
  check('an uncached response says so', get.headers.get('x-sitemap-cache') === 'miss-degraded', get.headers.get('x-sitemap-cache'));

  // A fake cache with the same contract caches.default offers.
  const stored = new Map();
  // `caches.default` returns a *new* response per match, whose body can be read
  // once; a fake that hands back the same object fails on the second read.
  const fakeCache = {
    match: async (key) => stored.get(key)?.clone(),
    put: async (key, response) => {
      stored.set(key, response.clone());
      return undefined;
    },
  };
  const previous = globalThis.caches;
  globalThis.caches = { default: fakeCache };
  try {
    const cold = await sitemapGet({ request, env: deadOrigin });
    await cold.text();
    check('a cold response is stored under the versioned synthetic key', stored.has(documentKey), [...stored.keys()].join(','));
    check('nothing is stored under the incoming URL', !stored.has('https://ellars.us.com/sitemap.xml'));

    const warm = await sitemapGet({ request, env: deadOrigin });
    const warmXml = await warm.text();
    check('a warm response is served from the edge cache', warm.headers.get('x-sitemap-cache') === 'hit', warm.headers.get('x-sitemap-cache'));
    check('the cached document is the one that was built', warmXml === xml);
    check('the cached lifetime survives the hit', warm.headers.get('x-sitemap-ttl') === '60', warm.headers.get('x-sitemap-ttl'));
    const warmHead = await sitemapHead({ request: new Request(request, { method: 'HEAD' }), env: deadOrigin });
    check('HEAD is served from the same cache', warmHead.headers.get('x-sitemap-cache') === 'hit');
    check('HEAD from cache still has no body', (await warmHead.text()) === '');

    // A query string must not fan the document out into a second cache entry.
    const withQuery = await sitemapGet({ request: new Request('https://ellars.us.com/sitemap.xml?utm_source=x'), env: deadOrigin });
    check('a query string still hits the one document entry', withQuery.headers.get('x-sitemap-cache') === 'hit', withQuery.headers.get('x-sitemap-cache'));
    // One document entry, keyed by the synthetic path — not one per query string,
    // and (with the origin down) no posts entry to accompany it.
    check('no second document entry was created', stored.size === 1, [...stored.keys()].join(','));

    // Now the case the first deploy got wrong: a previously good post list must
    // survive an outage instead of the sitemap quietly dropping every dispatch.
    stored.delete(documentKey);
    stored.set(
      postsKey,
      new Response(JSON.stringify([{ loc: 'https://ellars.us.com/articles/known-good', lastmod: '2026-10-30T06:00:00', changefreq: 'monthly', priority: '0.8' }]), {
        status: 200,
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=3600' },
      })
    );
    const stale = await sitemapGet({ request, env: deadOrigin });
    const staleXml = await stale.text();
    check(
      'an outage reuses the last good post list instead of dropping it',
      staleXml.includes('<loc>https://ellars.us.com/articles/known-good</loc>'),
      staleXml.match(/<loc>[^<]*articles[^<]*<\/loc>/)?.[0]
    );
    check('the response reports the stale post list', stale.headers.get('x-sitemap-cache') === 'miss-stale-posts', stale.headers.get('x-sitemap-cache'));
    check('a stale-post document is cached for five minutes', stale.headers.get('x-sitemap-ttl') === '300', stale.headers.get('x-sitemap-ttl'));
  } finally {
    globalThis.caches = previous;
  }

  const built = buildSitemap([{ loc: 'https://ellars.us.com/articles/example', lastmod: '2026-10-30T06:00:00' }]);
  check('the sitemap declares its namespace', built.includes('xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"'));
  check('post entries reach the document', built.includes('<loc>https://ellars.us.com/articles/example</loc>'));
  check('every static route is present', STATIC_ROUTES.every((route) => built.includes(`<loc>https://ellars.us.com${route.path}</loc>`)));

  // Two hand-maintained tables decide what a crawler can see: STATIC_ROUTES here
  // and STATIC_ROUTES in lib/edge/meta.js. A path listed for the sitemap with no
  // metadata entry is advertised and then answered as a 404; a noindex surface in
  // the sitemap is a page asking not to be indexed while telling crawlers it
  // exists. Assert the invariant rather than the two lists separately.
  check(
    'every sitemap route has an indexable metadata entry',
    STATIC_ROUTES.every((route) => {
      const meta = resolveMeta(route.path, SITE_ORIGIN);
      return meta && meta.robots === 'index, follow' && meta.canonical === `https://ellars.us.com${route.path}`;
    }),
    STATIC_ROUTES.filter((route) => {
      const meta = resolveMeta(route.path, SITE_ORIGIN);
      return !meta || meta.robots !== 'index, follow';
    })
      .map((route) => route.path)
      .join(', ')
  );
  check(
    'noindex surfaces are never advertised in the sitemap',
    ['/login', '/dashboard'].every((path) => !built.includes(`<loc>https://ellars.us.com${path}</loc>`))
  );
}

describe('lib/edge/meta.js');
{
  const home = resolveMeta('/', SITE_ORIGIN);
  check('home gets a real title', /James Ellars/.test(home.title) && home.title !== 'James Ellars | Official Hub & Policy Platform');
  check('home canonical is the origin', home.canonical === 'https://ellars.us.com/', home.canonical);
  check('home is indexable', home.robots === 'index, follow');

  const trailing = resolveMeta('/platform/', SITE_ORIGIN);
  check('trailing slash normalised out of the canonical', trailing.canonical === 'https://ellars.us.com/platform', trailing.canonical);

  const directive = resolveMeta('/platform/political-reform', SITE_ORIGIN);
  check(
    'directive slug resolves to its own copy',
    directive.title === 'POLITICAL REFORM Policy | James Ellars',
    directive.title
  );
  check(
    'server title matches the client Helmet title (no flicker)',
    resolveMeta('/platform', SITE_ORIGIN).title === 'The Platform | James Ellars | Official' &&
      resolveMeta('/', SITE_ORIGIN).title === 'Home | James Ellars | Official' &&
      resolveMeta('/about', SITE_ORIGIN).title === 'About James Ellars | Bridging Main Street' &&
      resolveMeta('/news-media', SITE_ORIGIN).title === 'News & Media Hub | James Ellars | Official' &&
      resolveMeta('/dashboard', SITE_ORIGIN).title === 'Secure Dashboard | James Ellars'
  );
  check('unknown directive falls through to the shell', resolveMeta('/platform/not-a-directive', SITE_ORIGIN) === null);

  const login = resolveMeta('/login', SITE_ORIGIN);
  check('login is noindex', login.robots === 'noindex, nofollow', login.robots);
  const dashboard = resolveMeta('/dashboard', SITE_ORIGIN);
  check('dashboard is noindex', dashboard.robots === 'noindex, nofollow', dashboard.robots);

  const article = resolveMeta('/articles/prices-and-paychecks', SITE_ORIGIN);
  check(
    'dispatch gets its own canonical, not the homepage',
    article.canonical === 'https://ellars.us.com/articles/prices-and-paychecks',
    article.canonical
  );

  check('api paths are left alone', resolveMeta('/api/config', SITE_ORIGIN) === null);
  check('the build fallback page is left alone', resolveMeta('/200.html', SITE_ORIGIN) === null);
  check('query strings do not reach the canonical', resolveMeta('/about?utm=x', SITE_ORIGIN).canonical.endsWith('/about'));

  const previewUrl = new URL('https://abc123.ellars-us-com-frontend-site-1-1-1974.pages.dev/platform');
  check('preview host detected', isPreviewHost(previewUrl) === true);
  check('preview canonical points at production', canonicalOriginFor(previewUrl) === SITE_ORIGIN, canonicalOriginFor(previewUrl));
  check('preview pages are noindexed', resolveMeta('/platform', SITE_ORIGIN, { forceNoindex: true }).robots === 'noindex, nofollow');
  check(
    'production host keeps its own canonical',
    canonicalOriginFor(new URL('https://ellars.us.com/platform')) === SITE_ORIGIN
  );
  check('localhost keeps its own origin', canonicalOriginFor(new URL('http://127.0.0.1:8791/')) === 'http://127.0.0.1:8791');
  check('localhost is not treated as a preview', isPreviewHost(new URL('http://localhost:5173/')) === false);

  check(
    'directive table matches the sitemap',
    JSON.stringify([...META_DIRECTIVE_SLUGS].sort()) === JSON.stringify([...DIRECTIVE_SLUGS].sort())
  );
}

{
  const shell = `<!doctype html><html><head>
    <meta name="description" content="old description" />
    <meta property="og:title" content="old og title" />
    <meta property="og:description" content="old og description" />
    <meta property="og:url" content="https://ellars.us.com" />
    <meta name="twitter:title" content="old twitter title" />
    <meta name="twitter:description" content="old twitter description" />
    <title>James Ellars | Official Hub & Policy Platform</title>
  </head><body><div id="root"></div></body></html>`;

  const meta = resolveMeta('/platform/american-home-building', SITE_ORIGIN);
  const once = applyMeta(shell, meta);
  const twice = applyMeta(once, meta);

  check('title replaced', /<title>AMERICAN HOME BUILDING Policy \| James Ellars<\/title>/.test(once));
  check('old fallback title gone', !once.includes('Official Hub & Policy Platform'));
  check('description replaced', once.includes('housing crisis'));
  check('og:title replaced', once.includes('property="og:title" content="AMERICAN HOME BUILDING Policy | James Ellars"'));
  check('og:url is the canonical', once.includes('property="og:url" content="https://ellars.us.com/platform/american-home-building"'));
  check('twitter:title replaced', once.includes('name="twitter:title" content="AMERICAN HOME BUILDING Policy | James Ellars"'));
  check('exactly one canonical', (once.match(/rel="canonical"/g) || []).length === 1, String((once.match(/rel="canonical"/g) || []).length));
  check('exactly one robots tag', (once.match(/name="robots"/g) || []).length === 1);
  check('rewrite is idempotent', once === twice);
  check('no duplicated title tags', (once.match(/<title>/g) || []).length === 1);
}

{
  const meta = resolveMeta('/', SITE_ORIGIN);
  const nasty = { ...meta, description: 'A & B "quoted" <tag>' };
  const html = applyMeta('<head><title>x</title></head>', nasty);
  check('attribute values are escaped', html.includes('content="A &amp; B &quot;quoted&quot; &lt;tag&gt;"'), html);
  // The description appears three times (description, og:description,
  // twitter:description); what matters is that nothing was escaped twice.
  check('nothing is double-escaped', !html.includes('&amp;amp;'), html);
  check('every copy escaped once', (html.match(/&amp;/g) || []).length === 3, String((html.match(/&amp;/g) || []).length));
}

{
  const browserRequest = new Request('https://ellars.us.com/platform', {
    headers: { accept: 'text/html,application/xhtml+xml' },
  });
  const assetRequest = new Request('https://ellars.us.com/assets/index-abc.js', {
    headers: { accept: '*/*' },
  });
  check('browser navigation wants a document', wantsDocument(browserRequest) === true);
  check('asset request does not', wantsDocument(assetRequest) === false);

  const shell = '<head><meta name="description" content="x" /><title>fallback</title></head>';
  const env = {
    ASSETS: {
      fetch: async () =>
        new Response(shell, {
          status: 200,
          headers: {
            'Content-Type': 'text/html',
            'Cache-Control': 'public, max-age=0',
            // Present because public/_headers applies to the asset; a Functions
            // response does not inherit it, so the handler must pass it through.
            'Content-Security-Policy': "default-src 'self'",
            'Strict-Transport-Security': 'max-age=63072000',
            ETag: 'stale-validator',
            'Content-Length': '9999',
          },
        }),
    },
  };
  const injected = await middleware({ request: browserRequest, env, next: () => new Response(null, { status: 204 }) });
  const body = await injected.text();
  check('middleware injects for a navigation', injected.status === 200 && /<title>The Platform \| James Ellars \| Official<\/title>/.test(body), String(injected.status));
  check('middleware keeps the html content type', /text\/html/.test(injected.headers.get('Content-Type') || ''));
  check(
    'middleware passes the CSP through (a Functions response inherits no _headers)',
    injected.headers.get('Content-Security-Policy') === "default-src 'self'",
    String(injected.headers.get('Content-Security-Policy'))
  );
  check('middleware passes HSTS through', injected.headers.get('Strict-Transport-Security') === 'max-age=63072000');
  check('middleware drops the stale ETag', injected.headers.get('ETag') === null);
  check('middleware drops the stale content-length', injected.headers.get('Content-Length') === null);
  check('middleware sets one canonical', (body.match(/rel="canonical"/g) || []).length === 1);

  // The file rule is shared with functions/assets/[[path]].js, so the middleware
  // answers an asset path itself rather than letting _redirects turn the miss
  // into the HTML shell.
  const assetMiss = await middleware({ request: assetRequest, env, next: () => new Response(null, { status: 204 }) });
  check('middleware answers an asset miss with 404', assetMiss.status === 404, String(assetMiss.status));
  check('an asset miss is plain text, not HTML', /text\/plain/.test(assetMiss.headers.get('Content-Type') || ''));

  const nonDocument = new Request('https://ellars.us.com/platform', { headers: { accept: 'application/json' } });
  const passedThrough = await middleware({ request: nonDocument, env, next: () => new Response(null, { status: 204 }) });
  check('middleware passes non-document, non-file requests through', passedThrough.status === 204);

  const unknownRoute = new Request('https://ellars.us.com/api/config', { headers: { accept: 'text/html' } });
  const passedUnknown = await middleware({ request: unknownRoute, env, next: () => new Response(null, { status: 204 }) });
  check('middleware never touches /api/*', passedUnknown.status === 204);

  // HEAD must agree with GET. Before Sprint 2.21 the handler bailed out on
  // anything that was not GET, so `_redirects` answered every HEAD with the SPA
  // shell and a 200 — including for files and routes that do not exist.
  const headRoute = new Request('https://ellars.us.com/about', { method: 'HEAD', headers: { accept: 'text/html' } });
  const headDocument = await middleware({ request: headRoute, env, next: () => new Response(null, { status: 204 }) });
  check('HEAD is answered by the middleware, not the rewrite', headDocument.status === 200, String(headDocument.status));
  check('HEAD carries no body', (await headDocument.text()) === '');
  check(
    'HEAD keeps the document content type',
    /text\/html/.test(headDocument.headers.get('Content-Type') || ''),
    headDocument.headers.get('Content-Type')
  );

  const headUnknown = new Request('https://ellars.us.com/not-a-route', { method: 'HEAD', headers: { accept: 'text/html' } });
  const headNotFound = await middleware({ request: headUnknown, env, next: () => new Response(null, { status: 204 }) });
  check('HEAD on an unknown route is a 404, exactly like GET', headNotFound.status === 404, String(headNotFound.status));

  const headAsset = new Request('https://ellars.us.com/foo.png', { method: 'HEAD', headers: { accept: '*/*' } });
  const headAssetMiss = await middleware({ request: headAsset, env, next: () => new Response(null, { status: 204 }) });
  check('HEAD on a missing asset is a 404, not the shell', headAssetMiss.status === 404, String(headAssetMiss.status));
  check('HEAD on a missing asset carries no body', (await headAssetMiss.text()) === '');

  const headPost = new Request('https://ellars.us.com/about', { method: 'POST', headers: { accept: 'text/html' } });
  const postPassed = await middleware({ request: headPost, env, next: () => new Response(null, { status: 204 }) });
  check('a non-GET, non-HEAD verb is still passed through untouched', postPassed.status === 204);
}

describe('lib/edge/assets.js');
{
  check('og:image path is a file request', isFileRequest('/og-image.png') === true);
  check('a hashed chunk is a file request', isFileRequest('/assets/index-abc123.js') === true);
  check('an SPA route is not a file request', isFileRequest('/platform') === false);
  check(
    'a slug containing dots is not a file request',
    isFileRequest('/articles/prices.and.paychecks') === false,
    '/articles/prices.and.paychecks'
  );
  // Excluded on purpose: a middleware fetch through env.ASSETS misses /sitemap.xml
  // (it is a Pages Function), so treating it as a file would 404 the sitemap.
  check('/sitemap.xml is not a file request', isFileRequest('/sitemap.xml') === false);
  // regression: robots.txt fell through to the document branch and 404'd for any
  // client sending Accept: text/html. It is a file, not a route.
  check('/robots.txt is a static file request', isStaticFileRequest('/robots.txt') === true);
  check('/manifest.webmanifest is a static file request', isStaticFileRequest('/manifest.webmanifest') === true);
  check('/sw.js is a static file request', isStaticFileRequest('/sw.js') === true);
  check('/platform is not a static file request', isStaticFileRequest('/platform') === false);
  check(
    'an article slug ending in a known extension is not a file',
    isStaticFileRequest('/articles/prices.and.paychecks') === false,
    '/articles/prices.and.paychecks'
  );
  check('/200.html is not a file request', isFileRequest('/200.html') === false);
  check('/api/* is reserved', isReservedPath('/api/telemetry') === true);
  check('/cdn-cgi/* is reserved', isReservedPath('/cdn-cgi/trace') === true);
  check('an ordinary route is not reserved', isReservedPath('/dashboard') === false);
}

describe('functions/_middleware.js — files and 404s');
{
  // A factory, not a shared Response: an undici body can only be read once, and
  // every request in production gets its own.
  const shellResponse = () =>
    new Response('<!doctype html><html><head><title>James Ellars | Official Hub & Policy Platform</title></head></html>', {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=0, must-revalidate' },
    });
  const shellEnv = { ASSETS: { fetch: async () => shellResponse() } };
  const nextStub = () => new Response(null, { status: 204 });

  // The live defect: /screenshot_home.png was the og:image and did not exist, so
  // the scraper received the app shell with a 200 and rendered nothing.
  const missingImage = await middleware({
    request: new Request('https://ellars.us.com/screenshot_home.png', { headers: { accept: 'image/png,image/*' } }),
    env: shellEnv,
    next: nextStub,
  });
  check('a missing image is a 404, not the shell', missingImage.status === 404, String(missingImage.status));
  check('a missing image is never cached', missingImage.headers.get('Cache-Control') === 'no-store');
  check('a missing image is not HTML', !/doctype/i.test(await missingImage.text()));

  // robots.txt must survive a browser-style Accept header.
  const robotsRequest = new Request('https://ellars.us.com/robots.txt', { headers: { accept: 'text/html' } });
  const robots = await middleware({
    request: robotsRequest,
    env: {
      ASSETS: {
        fetch: async () =>
          new Response('User-agent: *\nDisallow: /dashboard\n', {
            status: 200,
            headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=86400' },
          }),
      },
    },
    next: nextStub,
  });
  check('robots.txt is served, not 404ed', robots.status === 200, String(robots.status));
  check('robots.txt keeps text/plain', /text\/plain/.test(robots.headers.get('Content-Type') || ''));

  const missingText = await middleware({ request: new Request('https://ellars.us.com/gone.txt'), env: shellEnv, next: nextStub });
  check('a missing text file is a 404, not the shell', missingText.status === 404, String(missingText.status));

  const realImage = await middleware({
    request: new Request('https://ellars.us.com/og-image.png', { headers: { accept: 'image/png,image/*' } }),
    env: {
      ASSETS: {
        fetch: async () => new Response('pngbytes', { status: 200, headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=31536000, immutable' } }),
      },
    },
    next: nextStub,
  });
  check('a real image passes through with its own type', realImage.headers.get('Content-Type') === 'image/png');
  check('a real image keeps its cache rule', /immutable/.test(realImage.headers.get('Cache-Control') || ''));

  // Unknown route: indexable 200 shell before, real 404 with the NotFound
  // identity now. `_redirects` cannot express a status other than 200.
  const notFound = await middleware({
    request: new Request('https://ellars.us.com/platform/not-a-directive', { headers: { accept: 'text/html' } }),
    env: shellEnv,
    next: nextStub,
  });
  const notFoundBody = await notFound.text();
  check('an unknown route answers 404', notFound.status === 404, String(notFound.status));
  check('an unknown route is not cached', notFound.headers.get('Cache-Control') === 'no-store');
  check('an unknown route carries the NotFound title', notFoundBody.includes(`<title>${NOT_FOUND_META.title}</title>`));
  check('an unknown route is noindex', /<meta name="robots" content="noindex, follow" \/>/.test(notFoundBody), notFoundBody.slice(0, 200));
  check('an unknown route carries no canonical', !/rel="canonical"/.test(notFoundBody));

  const unknownArticleSlug = await middleware({
    request: new Request('https://ellars.us.com/articles/anything-at-all', { headers: { accept: 'text/html' } }),
    env: shellEnv,
    next: nextStub,
  });
  check('a dispatch path stays 200 (its id is validated by WordPress, not here)', unknownArticleSlug.status === 200);
}

describe('router ↔ edge table drift');
{
  // The table in lib/edge/meta.js mirrors src/App.jsx by hand, which is how a
  // route ends up serving the site title and an indexable 200 to a crawler.
  const appSource = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8');
  const routerPaths = [...appSource.matchAll(/<Route\s+path="([^"]+)"/g)].map((match) => match[1]);
  check('router paths were found', routerPaths.length >= 8, String(routerPaths.length));

  const wildcardOnly = routerPaths.filter((path) => path !== '*');
  for (const path of wildcardOnly) {
    const probe = path === '/articles/:slug' ? '/articles/some-dispatch' : path.replace(':directiveSlug', 'working-class-foundation');
    check(`router path ${path} has edge metadata`, resolveMeta(probe, SITE_ORIGIN) !== null, probe);
  }
}

describe('document metadata has one owner');
{
  // Three pages assigned document.title in an effect and two of them also rewrote
  // <meta name="description"> by hand. Effects run after <Helmet> commits, so the
  // imperative value won: the tab read "Ellars for Congress | News & Media" for a
  // page whose canonical title (edge shell + Helmet) was "News & Media Hub | James
  // Ellars | Official", and the description a reader's DOM ended up with was not
  // the one the edge had written. The losing tag changed with effect ordering,
  // which is why this is a mechanical guard and not a convention.
  const pagesDir = new URL('../src/pages/', import.meta.url);
  const pageFiles = readdirSync(pagesDir).filter((name) => name.endsWith('.jsx'));
  check('page components were found', pageFiles.length >= 5, String(pageFiles.length));

  const offenders = pageFiles.filter((name) =>
    /document\.title\s*=/.test(readFileSync(new URL(name, pagesDir), 'utf8'))
  );
  check('no page assigns document.title outside <Helmet>', offenders.length === 0, offenders.join(', '));

  const descriptionWriters = pageFiles.filter((name) =>
    /querySelector\(\s*['"]meta\[name="description"\]/i.test(
      stripComments(readFileSync(new URL(name, pagesDir), 'utf8'))
    )
  );
  check(
    'no page rewrites the description meta tag by hand',
    descriptionWriters.length === 0,
    descriptionWriters.join(', ')
  );

  // 2.17: the same defect one layer up. Eight pages declared title/description/og:*
  // from hand-copied strings alongside the shell, so every hydrated document carried
  // two of each — and the copies had drifted from the edge, one of them still naming
  // the legacy WordPress host as its share image. Route metadata has exactly one
  // client writer now: components/common/RouteMeta.jsx, fed by src/lib/headMeta.js.
  const metaOwners = pageFiles.filter((name) => {
    const source = stripComments(readFileSync(new URL(name, pagesDir), 'utf8'));
    return /<title[>\s]/.test(source) || /<meta\s+property="og:/.test(source) || /<meta\s+name="(?:description|twitter:)/.test(source);
  });
  check(
    'no page component writes route metadata (RouteMeta owns it)',
    metaOwners.length === 0,
    metaOwners.join(', ')
  );

  // The table, not a copy of it: if this import ever points somewhere else, the client
  // and the edge can drift again while every other assertion here still passes.
  const headMetaSource = readFileSync(new URL('../src/lib/headMeta.js', import.meta.url), 'utf8');
  check(
    'the client resolves metadata from the edge table',
    /from\s+'\.\.\/\.\.\/lib\/edge\/meta\.js'/.test(headMetaSource),
    'src/lib/headMeta.js no longer imports lib/edge/meta.js'
  );
  check(
    'a dispatch path yields the head to the page component',
    /articles/.test(headMetaSource) && /return null/.test(headMetaSource)
  );

  const appSource = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8');
  check('RouteMeta is mounted', /<RouteMeta\s*\/>/.test(appSource));
  check('HeadOwnership is mounted', /<HeadOwnership\s*\/>/.test(appSource));
  check('the superseded CanonicalUrl is gone', !/CanonicalUrl/.test(appSource));

  // DirectiveDetail carries its own slug list for the page body. The metadata comes
  // from DIRECTIVE_META, so a slug added to one and not the other would render a
  // policy page under the 404's title.
  const directivePage = readFileSync(new URL('../src/pages/DirectiveDetail.jsx', import.meta.url), 'utf8');
  const pageSlugs = [...directivePage.matchAll(/slug:\s*"([^"]+)"/g)].map((match) => match[1]);
  check('directive page slugs were found', pageSlugs.length === META_DIRECTIVE_SLUGS.length, String(pageSlugs.length));
  check(
    'directive page slugs and DIRECTIVE_META agree',
    pageSlugs.every((slug) => META_DIRECTIVE_SLUGS.includes(slug)),
    pageSlugs.filter((slug) => !META_DIRECTIVE_SLUGS.includes(slug)).join(', ')
  );
}

describe('the shell declares each head key once');
{
  // The shell is the no-JS document *and* the document the client hydrates into, so a
  // second copy of a key inside it is a contradiction no scanner can resolve: the first
  // wins for a crawler, react-helmet-appended copies win in the DOM.
  const shell = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const keys = [...shell.matchAll(/<meta\s+(?:property|name)="([^"]+)"/g)].map((match) => match[1]);
  const managed = ['description', 'og:title', 'og:description', 'og:type', 'og:url', 'og:image', 'twitter:title', 'twitter:description', 'twitter:image'];
  const duplicated = managed.filter((key) => keys.filter((candidate) => candidate === key).length > 1);
  check('no head key appears twice in the shell', duplicated.length === 0, duplicated.join(', '));

  const ogImage = shell.match(/<meta\s+property="og:image"\s+content="([^"]+)"/);
  check('the shell declares an og:image', Boolean(ogImage));
  check(
    'the shell share image is served from the site origin',
    ogImage && ogImage[1].startsWith(`${SITE_ORIGIN}/`),
    ogImage && ogImage[1]
  );

  // The legacy WordPress host is still used for body imagery (Hero, About, article
  // fallbacks), so the guard is scoped to what a scraper reads as the page's identity.
  const srcDir = new URL('../src/', import.meta.url);
  const legacyMeta = readdirSync(srcDir, { recursive: true })
    .filter((name) => String(name).endsWith('.jsx'))
    .filter((name) => /property="og:[a-z:]+"[\s\S]{0,120}wp\.axim\.us\.com/.test(readFileSync(new URL(name, srcDir), 'utf8')));
  check('no og:* tag points at the legacy WordPress host', legacyMeta.length === 0, legacyMeta.join(', '));
}

describe('the update handshake can reload but not loop');
{
  // Measured in 2.19 with two real builds behind `vite preview`: a returning visit
  // served the old shell, the handshake fired, the tab reloaded once and landed on the
  // new one (3.1 s from old document start to new document start, marker set, no
  // waiting worker). The two properties that make that safe are mechanical.
  const sw = readFileSync(new URL('../src/lib/serviceWorker.js', import.meta.url), 'utf8');
  const markerAt = sw.indexOf('sessionStorage.setItem(RELOAD_MARKER');
  const reloadAt = sw.indexOf('window.location.reload()');
  check('the reload path writes the loop marker', markerAt !== -1);
  check('the marker is written before the reload', markerAt !== -1 && reloadAt !== -1 && markerAt < reloadAt);
  check('the policy is consulted, not inlined', /decideOnControllerChange\s*\(/.test(sw));
  check(
    'hadController is mutable (a first install becomes an update)',
    /let\s+hadController/.test(sw),
    'captured once at registration = every later activation looks like a first install'
  );

  // The prompt is shown only when the reload was held back (audio, or a loop guard), and
  // the new worker is already active by then — `skipWaiting` is set in the build and
  // dist/sw.js has no message listener. Posting SKIP_WAITING is a message to nobody.
  const prompt = stripComments(readFileSync(new URL('../src/components/common/UpdatePrompt.jsx', import.meta.url), 'utf8'));
  check('the prompt does not post SKIP_WAITING to a worker that never waits', !/postMessage\s*\(/.test(prompt));
  check('the prompt does not pass the ignored force-reload argument', !/reload\s*\(\s*true\s*\)/.test(prompt));
}

describe('repo root is not a screenshot folder');
{
  // Open item 10: 1.9 MB of loose PNGs at the repo root — including two byte-identical
  // 548 kB copies — plus a `commit_message.txt` and a tracked playwright
  // `test-results/.last-run.json`, all of it shipped to every clone and none of it
  // referenced by a single line of code. Real assets live in public/, where the edge's
  // static-file rules apply to them. The guard is mechanical so the next dump does not
  // quietly re-enter the history.
  const rootDir = new URL('../', import.meta.url);
  const media = readdirSync(rootDir)
    .filter((name) => /^[^.].*\.(png|jpe?g|webp|gif|mp4|mov|zip)$/i.test(String(name)));
  check('no binaries at the repo root (public/ owns assets)', media.length === 0, media.join(', '));

  const drafts = readdirSync(rootDir).filter((name) => /^commit_message\.txt$/i.test(String(name)));
  check('no commit-message drafts at the repo root', drafts.length === 0, drafts.join(', '));

  // `dist` and `test-results` are build output. Tracked output is how a stale artifact
  // ends up looking like source.
  const tracked = execFileSync('git', ['ls-files', 'dist', 'test-results'], {
    cwd: rootDir,
    encoding: 'utf8',
  }).trim();
  check('no build or test output is tracked', tracked === '', tracked.split('\n').slice(0, 5).join(', '));
}

describe('public/_headers');
{
  // Pages merges the headers of every matching rule rather than overriding, so a
  // `Cache-Control` on `/*` is concatenated onto each specific rule. Production
  // served `/sw.js` as `public, max-age=0, must-revalidate, no-cache, no-store,
  // must-revalidate` — contradictory directives on the one file that decides
  // whether a client ever picks up a new build.
  const source = readFileSync(new URL('../public/_headers', import.meta.url), 'utf8');
  const rules = source
    .split(/\n\s*\n/)
    .map((block) => ({
      selector: block.split('\n')[0].trim(),
      headers: block
        .split('\n')
        .slice(1)
        .map((line) => line.trim())
        .filter((line) => line && !line.startsWith('#')),
    }))
    .filter((rule) => rule.selector && !rule.selector.startsWith('#'));

  check('header rules were parsed', rules.length >= 10, String(rules.length));

  const wildcard = rules.find((rule) => rule.selector === '/*');
  check('the wildcard rule exists', Boolean(wildcard));
  check('the wildcard rule declares no Cache-Control', !wildcard.headers.some((line) => /^cache-control:/i.test(line)));

  for (const rule of rules) {
    const cacheLines = rule.headers.filter((line) => /^cache-control:/i.test(line));
    check(`${rule.selector} declares Cache-Control at most once`, cacheLines.length <= 1, String(cacheLines.length));
  }

  const shell = rules.find((rule) => rule.selector === '/');
  check('the shell has its own cache rule', Boolean(shell) && /max-age=0/.test(shell.headers.join(' ')));

  // `immutable` is a promise that the URL's bytes never change, and only Vite's
  // content-hashed /assets/* filenames can keep it. A root-level `/*.png` at a
  // year, immutable, is how the HTML shell ended up cached as an image for a
  // year (see Sprint 2.13).
  const cacheControlOf = (rule) => rule.headers.find((line) => /^cache-control:/i.test(line)) || '';
  const immutableRules = rules.filter((rule) => /immutable/i.test(cacheControlOf(rule)));
  check('immutable is only declared on content-hashed assets', immutableRules.length === 1 && immutableRules[0].selector === '/assets/*', immutableRules.map((rule) => rule.selector).join(','));

  const maxAgeOf = (rule) => Number(cacheControlOf(rule).match(/max-age=(\d+)/)?.[1] ?? 0);
  const longLived = rules.filter((rule) => rule.selector !== '/assets/*' && maxAgeOf(rule) > 86400);
  check('no rule caches an unhashed path longer than a day', longLived.length === 0, longLived.map((rule) => `${rule.selector}=${maxAgeOf(rule)}`).join(','));
  const serviceWorker = rules.find((rule) => rule.selector === '/sw.js');
  check(
    'the service worker is never storable',
    Boolean(serviceWorker) && !/max-age=[1-9]/.test(serviceWorker.headers.join(' ')),
    serviceWorker?.headers.join(' ')
  );
}

describe('index.html social card');
{
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const ogImage = html.match(/<meta property="og:image" content="([^"]+)"/i)?.[1] || '';
  check('og:image is declared', Boolean(ogImage), ogImage);
  check('og:image is absolute', /^https:\/\/ellars\.us\.com\//.test(ogImage), ogImage);

  const relative = ogImage.replace('https://ellars.us.com/', '');
  const png = readFileSync(new URL(`../public/${relative}`, import.meta.url));
  check('og:image exists in public/', png.length > 0, relative);
  check('og:image is a PNG', png.subarray(1, 4).toString() === 'PNG', png.subarray(0, 8).toString('hex'));
  const width = png.readUInt32BE(16);
  const height = png.readUInt32BE(20);
  check('og:image is 1200x630', width === 1200 && height === 630, `${width}x${height}`);
  check('og:image stays under the 300 kB scraper limit', png.length < 300 * 1024, String(png.length));

  const twitterImage = html.match(/<meta name="twitter:image" content="([^"]+)"/i)?.[1] || '';
  check('twitter:image matches og:image', twitterImage === ogImage, twitterImage);

  // The client now declares this card on every route it owns, because <HeadOwnership>
  // deletes the shell's copy of any key the client has claimed: a route that claimed
  // `og:image` and handed the head to one that did not would leave the document with
  // no share image. Two declarations of the same card is the only way that works, so
  // they must agree — asserted against the shell's bytes, not against a copy.
  check('SITE_CARD is the card the shell declares', siteCardUrl === ogImage, `${siteCardUrl} vs ${ogImage}`);
  check(
    'SITE_CARD describes the shell card exactly',
    html.includes(`property="og:image:width" content="${SITE_CARD.width}"`) &&
      html.includes(`property="og:image:height" content="${SITE_CARD.height}"`) &&
      html.includes(`property="og:image:type" content="${SITE_CARD.type}"`) &&
      html.includes(`property="og:image:alt" content="${SITE_CARD.alt}"`),
    JSON.stringify(SITE_CARD)
  );
}

describe('lib/edge/documentIdentity.js — the probe reads what a crawler reads');
{
  // `applyMeta` replaces the title and inserts any tag it cannot find, so a minimal
  // shell with a <head> is enough to produce a complete document.
  const shell = () =>
    '<!doctype html><html><head><title>James Ellars | Official Hub & Policy Platform</title></head><body></body></html>';

  // The dividend directive's title contains an ampersand, which reaches the document
  // as `&amp;`. Comparison happens on values, so the reader has to decode or this
  // — a perfectly correct document — would be the case that fails.
  const dividend = resolveMeta('/platform/the-automation-dividend-and-taxation', SITE_ORIGIN);
  const document = applyMeta(shell(), dividend);
  const identity = readDocumentIdentity(document);

  check('reads the title back', identity.title === dividend.title, identity.title);
  check('the ampersand survives decoding', dividend.title.includes('&') && identity.title.includes('&'));
  check('reads the canonical', identity.canonical === dividend.canonical, identity.canonical);
  check('reads robots', identity.robots === dividend.robots, identity.robots);
  check('reads og:title', identity.ogTitle === dividend.title, identity.ogTitle);
  check('reads og:url', identity.ogUrl === dividend.canonical, identity.ogUrl);
  check('reads a description', Boolean(identity.description));
  check('counts exactly one title', identity.counts.title === 1, String(identity.counts.title));
  check(
    'counts exactly one of each managed key',
    MANAGED_KEYS.every((key) => identity.counts[key] === 1),
    MANAGED_KEYS.filter((key) => identity.counts[key] !== 1).map((key) => `${key}=${identity.counts[key]}`).join(', ')
  );
}

{
  const meta = resolveMeta('/about', SITE_ORIGIN);
  const good = applyMeta(
    '<!doctype html><html><head><title>James Ellars | Official Hub & Policy Platform</title></head><body></body></html>',
    meta
  );
  const compare = (overrides = {}) =>
    compareDocument({ path: '/about', status: 200, expectedStatus: 200, html: good, meta, ...overrides });

  // Non-vacuity is the point of this block. A probe that cannot fail is the green gate
  // that checks nothing — the shape Sprint 2.20 deleted from the workflow. Every case
  // below is a defect the deployment probe exists to catch, so every one must produce
  // a failure rather than a pass.
  check('a correct document produces no failures', compare().length === 0, compare().join(' | '));
  check(
    'a wrong status fails',
    compare({ status: 500 }).some((failure) => /answered 500, expected 200/.test(failure)),
    compare({ status: 500 }).join(' | ')
  );
  check(
    'the site title instead of the route title fails',
    compare({ html: good.replace(meta.title, 'James Ellars | Official Hub & Policy Platform') }).some((failure) =>
      /title/.test(failure)
    )
  );
  check(
    'a duplicated description fails (Sprint 2.17 returning)',
    compare({ html: good.replace('</head>', '<meta name="description" content="second" /></head>') }).some((failure) =>
      /declares description 2 times/.test(failure)
    )
  );
  check(
    'a missing canonical fails',
    compare({ html: good.replace(/<link rel="canonical"[^>]*>/, '') }).some((failure) => /canonical "absent"|canonical absent/.test(failure)),
    compare({ html: good.replace(/<link rel="canonical"[^>]*>/, '') }).join(' | ')
  );
  check(
    'two <title> tags fail',
    compare({ html: good.replace('</head>', '<title>late</title></head>') }).some((failure) => /2 <title> tags/.test(failure))
  );
  check('a null expectation fails instead of passing', compareDocument({ path: '/x', status: 200, html: good, meta: null }).length > 0);

  // The 404 document: right title, noindex, no canonical, og:url back at the root.
  const notFoundMeta = { ...NOT_FOUND_META, canonical: null };
  const notFoundHtml = applyMeta(
    '<!doctype html><html><head><title>James Ellars | Official Hub & Policy Platform</title></head><body></body></html>',
    notFoundMeta
  );
  const notFound = (overrides = {}) =>
    compareDocument({ path: '/not-a-route', status: 404, expectedStatus: 404, html: notFoundHtml, meta: notFoundMeta, ...overrides });

  check('a correct 404 produces no failures', notFound().length === 0, notFound().join(' | '));
  check('a 404 declares no canonical', readDocumentIdentity(notFoundHtml).canonical === null);
  check('a 404 points og:url at the site root', readDocumentIdentity(notFoundHtml).ogUrl === `${SITE_ORIGIN}/`, readDocumentIdentity(notFoundHtml).ogUrl);
  check(
    'a soft 404 that self-canonicalises fails',
    notFound({ html: applyMeta(notFoundHtml, { ...NOT_FOUND_META, canonical: 'https://ellars.us.com/not-a-route' }) }).some((failure) =>
      /canonical/.test(failure)
    )
  );
  check(
    'a 404 answered as 200 fails',
    notFound({ status: 200 }).some((failure) => /answered 200, expected 404/.test(failure)),
    notFound({ status: 200 }).join(' | ')
  );
}

describe('the deployment probe measures the deployment, not itself');
{
  const probe = stripComments(readFileSync(new URL('./probe-production.mjs', import.meta.url), 'utf8'));

  // `Accept: text/html` is what selects the middleware branch. Probing with `*/*`
  // measures the SPA fallback and reports the site title on every route — a healthy
  // deployment looking broken, which is exactly what happened while writing this.
  check('the probe declares a document Accept header', probe.includes('text/html,application/xhtml+xml'));
  check(
    'the probe takes its expectations from the edge table',
    /resolveMeta\(/.test(probe) && /from '\.\.\/lib\/edge\/meta\.js'/.test(probe)
  );
  check(
    'the probe takes its route list from the sitemap',
    /from '\.\.\/functions\/sitemap\.xml\.js'/.test(probe)
  );
  // A re-typed title is a probe that asserts yesterday's copy (the drift Sprint 2.17
  // removed from the site itself).
  check('the probe does not re-type a route title', !/Home \| James Ellars \| Official/.test(probe));
  check('the probe exits non-zero when a check fails', /process\.exit\(1\)/.test(probe));
  // `/api/config` answers 503 when it is unbound — a fact about the deployment, not a
  // glitch. Without this the retry layer buries it as "failed after 3 attempts" and the
  // reader cannot tell an unbound key from a flaky origin.
  check(
    'a documented 503 from /api/config is read as an answer, not retried into a transport error',
    /acceptStatuses:\s*\[503\]/.test(probe),
    'the retry layer must not hide the unbound-config message'
  );
  check('the probe compares documents through the shared comparator', /compareDocument\(/.test(probe));

  const workflow = readFileSync(new URL('../.github/workflows/probe.yml', import.meta.url), 'utf8');
  check('the probe runs after a merge', /workflow_run:/.test(workflow) && /workflows: \[verify\]/.test(workflow));
  check('the probe runs on a schedule', /cron:/.test(workflow));
  check('the probe can be dispatched by hand', /workflow_dispatch:/.test(workflow));
  check('the probe does not depend on a secret', !/secrets\./.test(workflow));
  check('the probe runs the repo script', /npm run probe/.test(workflow));

  const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
  check('`npm run probe` exists', typeof pkg.scripts?.probe === 'string', pkg.scripts?.probe);
}

describe('lib/edge/telemetrySinks.js — a 202 is not proof of storage');
{
  // The handler has answered `202 {"success":true}` since it was written, and for most
  // of the site's life every sink behind it was unbound: accepted, stored nowhere.
  const verdictOf = (sinks) => sinkVerdict(sinks);

  check('every sink stored is live', verdictOf({ kv: 'ok', d1: 'ok', analytics: 'ok' }).live.length === 3);
  check(
    'no sink live is degraded',
    verdictOf({ kv: 'unbound', d1: 'unbound', analytics: 'unbound' }).degraded === true
  );
  check(
    'one live sink is not degraded',
    verdictOf({ kv: 'ok', d1: 'unbound', analytics: 'unbound' }).degraded === false
  );
  check(
    'a bound sink that errors is broken, not merely unbound',
    verdictOf({ kv: 'error', d1: 'unbound', analytics: 'unbound' }).broken.includes('kv')
  );
  check(
    'a partial D1 batch counts as broken',
    verdictOf({ kv: 'unbound', d1: 'partial:7', analytics: 'unbound' }).broken.includes('d1')
  );
  check(
    'unbound is reported as unbound, never as broken',
    verdictOf({ kv: 'unbound', d1: 'unbound', analytics: 'unbound' }).broken.length === 0
  );
  check(
    'the note names the unbound sinks and the open item',
    /kv, d1, analytics unbound/.test(sinkNote(verdictOf({ kv: 'unbound', d1: 'unbound', analytics: 'unbound' }))) &&
      /item 1b/.test(sinkNote(verdictOf({ kv: 'unbound', d1: 'unbound', analytics: 'unbound' })))
  );
  check(
    'the note names what is storing the batch',
    sinkNote(verdictOf({ kv: 'ok', d1: 'unbound', analytics: 'unbound' })) === 'stored by kv'
  );
  check('an empty sink object is degraded, not an error', verdictOf({}).degraded === true);

  const probe = stripComments(readFileSync(new URL('./probe-production.mjs', import.meta.url), 'utf8'));
  check(
    'the probe asks the telemetry endpoint where a batch went',
    /'\/api\/telemetry'/.test(probe) && /sinkVerdict\(/.test(probe)
  );
  // The load-bearing distinction: an external binding gap must not turn every merge
  // red, and a *failing* binding must. Both are asserted from the source, because the
  // only other way to observe them is against a deployment with a broken binding.
  check(
    'a degraded sink is a note, not a failure',
    /return \{ failures, note: sinkNote\(verdict\) \};/.test(probe)
  );
  check(
    'a bound-but-failing sink is a failure',
    /if \(verdict\.broken\.length > 0\)/.test(probe)
  );
  check(
    'the probe labels its synthetic record so it is findable in the table',
    /probe_binding_check/.test(probe) && /idempotency_key: `probe-\$\{Date\.now\(\)\}`/.test(probe)
  );
}

describe('the bindings runbook names the bindings the handler reads');
{
  // A runbook that names a binding differently from the code sends the reader to create
  // a variable the handler never reads — and they will believe it, because a `202` comes
  // back either way. The names are extracted from the handler, so a rename fails here.
  const handler = stripComments(readFileSync(new URL('../functions/api/telemetry.js', import.meta.url), 'utf8'));
  const runbook = readFileSync(new URL('../docs/telemetry-and-vault-bindings.md', import.meta.url), 'utf8');

  const envNames = [...new Set([...handler.matchAll(/env\.([A-Z][A-Z0-9_]*)/g)].map((m) => m[1]))].sort();
  check('the handler reads at least three bindings', envNames.length >= 3, envNames.join(', '));

  const missing = envNames.filter((name) => !runbook.includes(`\`${name}\``));
  check('the runbook names every binding the handler reads', missing.length === 0, missing.join(', '));

  // The table name is what the reader is told to query, and `telemetry` is what 0001
  // creates. Asserted against the migration, not against the sentence.
  const migration = readFileSync(new URL('../migrations/0001_create_telemetry_table.sql', import.meta.url), 'utf8');
  const table = migration.match(/CREATE TABLE IF NOT EXISTS\s+(\w+)/)?.[1];
  check('the runbook queries the table the migration creates', Boolean(table) && runbook.includes(`FROM ${table}`), table);

  check('the runbook says a 202 is not proof of storage', /202/.test(runbook) && /stored nowhere|storage/.test(runbook));
  check(
    'the runbook names the item each step closes',
    ['1b', '2b', '2'].every((item) => runbook.includes(item))
  );
}

describe('the typefaces are self-hosted, and nothing asks Google for them');
{
  // `src/index.css` used to `@import fonts.googleapis.com`, so Google received every
  // visitor's IP address before any interaction — the one third-party request that
  // happened on every visit, to every page. /privacy disclosed it and named the fix.
  // The files live in public/fonts/ now and the policy section is gone, so the guards
  // below are what keep a future copy-paste from re-adding the import.
  const stripCssComments = (source) =>
    source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|\n)\s*\/\/.*/g, '$1');

  const cssFiles = ['../src/index.css', '../src/fonts.css'];
  const offendingImports = cssFiles.filter((name) =>
    /fonts\.(?:googleapis|gstatic)\.com/.test(stripCssComments(readFileSync(new URL(name, import.meta.url), 'utf8')))
  );
  check('no stylesheet loads a font from Google', offendingImports.length === 0, offendingImports.join(', '));

  const indexCss = readFileSync(new URL('../src/index.css', import.meta.url), 'utf8');
  check('index.css imports the local faces', /@import\s+'\.\/fonts\.css'/.test(indexCss));

  // _headers is a config file, so only active directives count: the note above the CSP
  // names the hosts it removed, and a guard that trips on its own documentation gets
  // deleted rather than fixed.
  const headers = readFileSync(new URL('../public/_headers', import.meta.url), 'utf8');
  const activeHeaders = headers
    .split('\n')
    .filter((line) => !/^\s*#/.test(line))
    .join('\n');
  check('no active header points at Google Fonts', !/fonts\.(?:googleapis|gstatic)\.com/.test(activeHeaders),
    activeHeaders.match(/fonts\.(?:googleapis|gstatic)\.com/)?.[0] ?? '');

  // Pinned rather than inferred from the platform's MIME table: the probe asserts
  // `font/woff2` exactly, and a font served as octet-stream under `nosniff` is the kind
  // of thing that renders on one browser and not another.
  const fontRule = headers.split(/\n\s*\n/).find((block) => block.trimStart().startsWith('/fonts/*')) ?? '';
  check('the font rule pins its content type', /Content-Type:\s*font\/woff2/.test(fontRule), fontRule.trim().split('\n').pop());
  check('the font rule caches for a day, not a year', /max-age=86400/.test(fontRule), fontRule.match(/max-age=\d+/)?.[0]);

  const csp = headers.match(/Content-Security-Policy:\s*(.+)/)?.[1] ?? '';
  check('font-src is the site origin only', /font-src 'self' data:;/.test(csp), csp.match(/font-src[^;]*/)?.[0]);
  check(
    'style-src no longer allow-lists a font host',
    !/style-src[^;]*fonts\./.test(csp),
    csp.match(/style-src[^;]*/)?.[0]
  );
  check(
    'connect-src no longer allow-lists a font host',
    !/connect-src[^;]*fonts\./.test(csp),
    csp.match(/connect-src[^;]*/)?.[0]
  );

  const viteConfig = readFileSync(new URL('../vite.config.js', import.meta.url), 'utf8');
  check('no service-worker route caches a Google font host', !/fonts\\\.\(\?:googleapis/.test(viteConfig) && !/'google-fonts'/.test(viteConfig));
  // Precaching four families would put ~108 kB of typeface in every install, including
  // the three a given page never renders. They are cached on first use instead.
  check(
    'the fonts are not precached',
    !/globPatterns:\s*\[[^\]]*woff2/.test(viteConfig),
    viteConfig.match(/globPatterns:\s*\[[^\]]*\]/)?.[0]
  );

  // The policy is code: a sentence claiming a request that no longer happens is as
  // wrong as a sentence omitting one that does. Version 2 removed the disclosure.
  const privacy = readFileSync(new URL('../src/pages/Privacy.jsx', import.meta.url), 'utf8');
  check('the policy no longer discloses a Google Fonts request', !/Google Fonts/.test(privacy));
  check('the policy no longer names Google as a sub-processor', !/fonts\.googleapis/.test(privacy));
  // Asserted where a reader sees it, in the header line — not as "the string Version 2
  // appears somewhere in the file". That was the previous check, and it kept passing
  // after a bump to Version 3 simply because the new prose mentioned Version 2 while
  // explaining what it had left out. A guard that can be satisfied by an accident is
  // not a guard.
  check(
    'the policy records its revision in the header a reader sees',
    /const LAST_UPDATED = '[^']+';/.test(privacy) &&
      /Last updated \{LAST_UPDATED\} &middot; Version \d+/.test(privacy)
  );

  // And the files are actually there, are actually WOFF2, and every one is declared.
  // A @font-face whose URL 404s is silent: the browser falls back and nobody notices
  // except on a machine that has never loaded the site.
  const fontsDir = new URL('../public/fonts/', import.meta.url);
  const fontFiles = readdirSync(fontsDir).filter((name) => name.endsWith('.woff2'));
  check('four families are committed', fontFiles.length === 4, fontFiles.join(', '));
  for (const file of fontFiles) {
    const bytes = readFileSync(new URL(file, fontsDir));
    check(`${file} is a WOFF2 file`, bytes.subarray(0, 4).toString() === 'wOF2', bytes.subarray(0, 4).toString('hex'));
    check(`${file} is not empty`, bytes.length > 5000, String(bytes.length));
  }

  // Counted on the comment-stripped source: the file's own header explains that
  // `font-display: swap` is carried over, and a guard that trips on prose is a guard
  // that gets deleted rather than fixed.
  const fontsCss = stripCssComments(readFileSync(new URL('../src/fonts.css', import.meta.url), 'utf8'));
  const declared = [...fontsCss.matchAll(/src:\s*url\('\/fonts\/([^']+)'\)/g)].map((match) => match[1]);
  check('every committed font is declared', fontFiles.every((file) => declared.includes(file)), declared.join(', '));
  check('no declaration points at a missing file', declared.every((file) => fontFiles.includes(file)), declared.join(', '));
  check(
    'every face uses font-display: swap',
    (fontsCss.match(/font-display:\s*swap/g) || []).length === declared.length,
    `${(fontsCss.match(/font-display:\s*swap/g) || []).length} of ${declared.length}`
  );

  // One @font-face per family, not per weight: Google serves a variable font and repeats
  // its URL, so a per-weight migration downloads five identical 48 kB Inter files.
  const families = [...fontsCss.matchAll(/font-family:\s*'([^']+)'/g)].map((match) => match[1]);
  check('families are declared once each', new Set(families).size === families.length, families.join(', '));
  check(
    'variable weights are declared as a range',
    /font-weight:\s*300 800;/.test(fontsCss) && /font-weight:\s*400 900;/.test(fontsCss),
    'Inter 300-800 / Cinzel 400-900'
  );

  // The Tailwind tokens are what the components actually apply; a family renamed in one
  // place and not the other renders the fallback silently.
  const tailwind = readFileSync(new URL('../tailwind.config.js', import.meta.url), 'utf8');
  const tokens = ['Inter', 'Cinzel', 'Marcellus', 'VT323'];
  check(
    'every Tailwind family has a self-hosted face',
    tokens.every((token) => families.includes(token)),
    tokens.filter((token) => !families.includes(token)).join(', ')
  );
  check(
    'tailwind still declares the four families',
    tokens.every((token) => new RegExp(`'${token}'`).test(tailwind)),
    tokens.filter((token) => !new RegExp(`'${token}'`).test(tailwind)).join(', ')
  );
}

console.log(`\n${passed} passed, ${failures.length} failed`);
if (failures.length) {
  console.error(failures.map((line) => ` - ${line}`).join('\n'));
  process.exit(1);
}
