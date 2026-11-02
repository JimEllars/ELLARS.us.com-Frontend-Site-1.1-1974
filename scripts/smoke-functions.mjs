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
  SITE_ORIGIN,
  applyMeta,
  canonicalOriginFor,
  isPreviewHost,
  resolveMeta,
  wantsDocument,
} from '../lib/edge/meta.js';
import {
  DIRECTIVE_SLUGS,
  STATIC_ROUTES,
  escapeXml,
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
check('static route table mirrors the router', STATIC_ROUTES.length === 4, String(STATIC_ROUTES.length));
check('directive slug table mirrors DirectiveDetail', DIRECTIVE_SLUGS.length === 6, String(DIRECTIVE_SLUGS.length));

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

  const passedThrough = await middleware({ request: assetRequest, env, next: () => new Response(null, { status: 204 }) });
  check('middleware passes assets through untouched', passedThrough.status === 204);

  const unknownRoute = new Request('https://ellars.us.com/api/config', { headers: { accept: 'text/html' } });
  const passedUnknown = await middleware({ request: unknownRoute, env, next: () => new Response(null, { status: 204 }) });
  check('middleware passes unmapped paths through', passedUnknown.status === 204);
}

console.log(`\n${passed} passed, ${failures.length} failed`);
if (failures.length) {
  console.error(failures.map((line) => ` - ${line}`).join('\n'));
  process.exit(1);
}
