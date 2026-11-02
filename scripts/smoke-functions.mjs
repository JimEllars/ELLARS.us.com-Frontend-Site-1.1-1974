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

console.log(`\n${passed} passed, ${failures.length} failed`);
if (failures.length) {
  console.error(failures.map((line) => ` - ${line}`).join('\n'));
  process.exit(1);
}
