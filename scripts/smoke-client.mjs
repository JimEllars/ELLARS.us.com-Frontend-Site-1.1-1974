/**
 * Client-side unit tests for the pure helpers behind the PWA update handshake.
 *
 * No DOM, no runner: `src/lib/swPolicy.js` is deliberately free of imports and
 * browser globals so the decisions below can be asserted in CI. Run with
 * `npm run test:client`.
 */

import {
  RELOAD_MARKER,
  decideOnControllerChange,
  isRegistrationCurrent,
} from '../src/lib/swPolicy.js';
import {
  NOT_FOUND_META,
  planHeadDedupe,
  resolveRouteMeta,
  ogUrlFor,
} from '../src/lib/headMeta.js';
import { DIRECTIVE_META, resolveMeta, SITE_ORIGIN } from '../lib/edge/meta.js';
import { buildRequestHeaders, isFirstPartyUrl } from '../src/lib/requestHeaders.js';

/**
 * WordPress only allows `Authorization, X-WP-Nonce, Content-Disposition,
 * Content-MD5, Content-Type, X-Sli-Auth-Token` in `Access-Control-Allow-Headers`.
 * Anything else turns a simple GET into a preflighted request that the browser
 * then refuses to send. Asserted against that literal list rather than against
 * our own constant, so the test fails if WordPress's list is the thing we drift
 * from.
 */
const WP_ALLOWED_REQUEST_HEADERS = new Set([
  'authorization',
  'x-wp-nonce',
  'content-disposition',
  'content-md5',
  'content-type',
  'x-sli-auth-token',
  'accept',
  'accept-language',
  'accept-encoding',
  'user-agent',
  'origin',
  'referer',
  'cache-control',
  'pragma',
  'if-none-match',
]);

const headerNames = (headers) => Object.keys(headers).map((name) => name.toLowerCase());

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

console.log('src/lib/swPolicy.js');

check(
  'first install does not reload (nothing stale to replace)',
  decideOnControllerChange({ hadController: false, audioPlaying: false, alreadyReloaded: false }) === 'ignore'
);
check(
  'update with a controller reloads',
  decideOnControllerChange({ hadController: true, audioPlaying: false, alreadyReloaded: false }) === 'reload'
);
check(
  'audio playing downgrades a reload to a prompt',
  decideOnControllerChange({ hadController: true, audioPlaying: true, alreadyReloaded: false }) === 'prompt'
);
check(
  'second update in one tab prompts instead of looping',
  decideOnControllerChange({ hadController: true, audioPlaying: false, alreadyReloaded: true }) === 'prompt'
);
check(
  'audio plus an earlier reload still prompts (no reload loop for listeners)',
  decideOnControllerChange({ hadController: true, audioPlaying: true, alreadyReloaded: true }) === 'prompt'
);
check('reload marker key is stable', RELOAD_MARKER === 'ellars_sw_reloaded_at', RELOAD_MARKER);
check(
  'a quiet registration is current',
  isRegistrationCurrent({ installing: null, waiting: null }) === true
);
check('an installing worker is not current', isRegistrationCurrent({ installing: {}, waiting: null }) === false);
check('a waiting worker is not current', isRegistrationCurrent({ installing: null, waiting: {} }) === false);
check('missing registration is not current', isRegistrationCurrent(null) === false);

console.log('\nsrc/lib/headMeta.js');

// The client and the edge must resolve the *same* table, or a reader's DOM and the
// bytes a crawler receives disagree. These assert parity with lib/edge/meta.js
// rather than re-stating the strings, so a copy edit cannot make them stale.
for (const path of ['/', '/platform', '/about', '/news-media', '/privacy', '/login', '/dashboard']) {
  const edge = resolveMeta(path, SITE_ORIGIN);
  const client = resolveRouteMeta(path);
  check(`${path} resolves client-side`, client !== null);
  check(
    `${path} title matches the edge exactly`,
    client && edge && client.title === edge.title,
    client && client.title
  );
  check(
    `${path} description matches the edge exactly`,
    client && edge && client.description === edge.description
  );
  check(`${path} robots matches the edge exactly`, client && edge && client.robots === edge.robots);
  check(`${path} canonical matches the edge exactly`, client && edge && client.canonical === edge.canonical);
}

check(
  'a trailing slash canonicalises identically to the edge',
  resolveRouteMeta('/platform/').canonical === resolveMeta('/platform/', SITE_ORIGIN).canonical
);

for (const slug of Object.keys(DIRECTIVE_META)) {
  const client = resolveRouteMeta(`/platform/${slug}`);
  check(
    `directive ${slug} title matches the edge`,
    client && client.title === resolveMeta(`/platform/${slug}`, SITE_ORIGIN).title,
    client && client.title
  );
}

check(
  'an unknown directive resolves to the same 404 identity the edge serves',
  resolveRouteMeta('/platform/not-a-directive') === NOT_FOUND_META
);
check('an unknown path resolves to the 404 identity', resolveRouteMeta('/no-such-page') === NOT_FOUND_META);
check('the 404 identity carries no canonical', !NOT_FOUND_META.canonical);
check('og:url falls back to the site root when there is no canonical', ogUrlFor(NOT_FOUND_META) === `${SITE_ORIGIN}/`);

// A dispatch's title, excerpt and share image come from WordPress, so the page
// component owns that route's head. Two writers on one route is the defect this
// whole change removes.
check('a dispatch path yields to ArticleDetail', resolveRouteMeta('/articles/prices-and-paychecks') === null);
check('the bare /articles path is not a dispatch', resolveRouteMeta('/articles') === NOT_FOUND_META);

console.log('\nhead ownership plan');

const tag = (key, content, owned) => ({ key, content, owned });
const removalKeys = (tags) => planHeadDedupe(tags).map((index) => tags[index].key);

// Measured on /news-media before the fix: the shell's description plus Helmet's.
check(
  'the shell description is dropped once the client writes one',
  JSON.stringify(removalKeys([tag('description', 'shell', false), tag('description', 'client', true)])) ===
    JSON.stringify(['description'])
);
check(
  'a second client copy is not touched (helmet owns its own dedupe)',
  planHeadDedupe([tag('description', 'a', true), tag('description', 'b', true)]).length === 0
);
check(
  'a key the client does not write keeps the shell value',
  planHeadDedupe([tag('description', 'shell', false), tag('keywords', 'keep me', false)]).length === 0
);
check(
  'tags outside the client-managed set are never removed',
  !removalKeys([tag('keywords', 'x', false), tag('author', 'x', false), tag('theme-color', '#000', false)]).length
);

const siteCard = [tag('og:image', `${SITE_ORIGIN}/og-card.png`, false)];
const hints = [tag('og:image:type', 'image/png', false), tag('og:image:width', '1200', false)];
check(
  'shell image hints survive when no client image competes',
  planHeadDedupe([...siteCard, ...hints]).length === 0
);
check(
  'identical client image keeps the shell size hints',
  planHeadDedupe([...siteCard, tag('og:image', `${SITE_ORIGIN}/og-card.png`, true), ...hints]).length === 1
);
{
  const tags = [...siteCard, tag('og:image', 'https://images.unsplash.com/featured.jpg', true), ...hints];
  const removed = removalKeys(tags);
  check('a featured image supersedes the shell image', removed.includes('og:image'), removed.join(','));
  check('and its stale size hints go with it', removed.includes('og:image:width') && removed.includes('og:image:type'));
  check('exactly one image survives', tags.filter((t) => t.key === 'og:image').length - 1 === 1);
}

// Idempotence: a route change that renders twice, or StrictMode running the effect
// twice, must not keep eating tags.
{
  const tags = [
    tag('description', 'shell', false),
    tag('description', 'client', true),
    ...siteCard,
    tag('og:image', 'https://images.unsplash.com/featured.jpg', true),
    ...hints,
  ];
  const removals = new Set(planHeadDedupe(tags));
  const survivors = tags.filter((_, index) => !removals.has(index));
  check('the plan is idempotent', planHeadDedupe(survivors).length === 0, String(planHeadDedupe(survivors).length));
}


console.log('\nsrc/lib/requestHeaders.js');

// The production defect, stated as an assertion: a dispatch fetch now carries no
// header that WordPress's allow-list omits, so there is no preflight to fail.
{
  const wpUrl = 'https://wp.ellars.us.com/wp-json/wp/v2/posts?per_page=5&_embed';
  const sent = buildRequestHeaders({ url: wpUrl, origin: 'https://ellars.us.com', method: 'GET' });
  const offenders = headerNames(sent).filter((name) => !WP_ALLOWED_REQUEST_HEADERS.has(name));
  check('the WordPress feed request sends no header WordPress will reject', offenders.length === 0, offenders.join(', '));
  check(
    'the provenance headers are gone from the feed request',
    !('X-Client-Telemetry' in sent) && !('X-Project-Domain' in sent),
    JSON.stringify(sent)
  );
  check('a bodyless GET no longer declares Content-Type', !('Content-Type' in sent), JSON.stringify(sent));
  check('the feed request still accepts JSON', sent.Accept === 'application/json', String(sent.Accept));
}

// Third-party means "not ours". A Supabase URL keeps its credentialed headers —
// Supabase reflects whatever the preflight asks for — but loses ours.
{
  const supabase = buildRequestHeaders({
    url: 'https://pvbcdndqjguzqeafhwhw.supabase.co/rest/v1/axim_vault?select=*',
    origin: 'https://ellars.us.com',
    headers: { apikey: 'k', Authorization: 'Bearer t', Prefer: 'count=exact', Range: '0-19' },
  });
  check('third-party calls keep their credentialed headers', supabase.apikey === 'k' && supabase.Authorization === 'Bearer t');
  check('third-party calls keep Prefer and Range', supabase.Prefer === 'count=exact' && supabase.Range === '0-19');
  check('third-party calls drop the vendor headers', !('X-Client-Telemetry' in supabase), JSON.stringify(Object.keys(supabase)));
}

{
  const same = buildRequestHeaders({ url: '/api/telemetry', origin: 'https://ellars.us.com', method: 'POST', hasBody: true });
  check('same-origin keeps the vendor headers', same['X-Project-Domain'] === 'ellars.us.com' && same['X-Client-Telemetry'] === 'AXiM-Frontend-v1');
  check('a request with a body keeps Content-Type', same['Content-Type'] === 'application/json');

  const absoluteOwn = buildRequestHeaders({ url: 'https://ellars.us.com/api/config', origin: 'https://abc.pages.dev' });
  check(
    'a preview build targeting production still counts as first-party',
    absoluteOwn['X-Project-Domain'] === 'ellars.us.com',
    JSON.stringify(absoluteOwn)
  );

  const absoluteLocal = buildRequestHeaders({ url: 'http://127.0.0.1:8788/api/config', origin: 'http://127.0.0.1:8788' });
  check('localhost is first-party', absoluteLocal['X-Project-Domain'] === 'ellars.us.com');

  const crossOriginOwn = buildRequestHeaders({ url: 'https://www.ellars.us.com/api/x', origin: 'https://ellars.us.com' });
  check('the www host is first-party', crossOriginOwn['X-Project-Domain'] === 'ellars.us.com');
}

check('a relative URL is first-party', isFirstPartyUrl('/api/config', 'https://ellars.us.com') === true);
check('the WordPress host is third-party', isFirstPartyUrl('https://wp.ellars.us.com/wp-json/wp/v2/posts') === false);
check('a pages.dev preview host is third-party', isFirstPartyUrl('https://abc.ellars-us-com.pages.dev/api/config') === false);
check('an unparseable target is treated as first-party', isFirstPartyUrl('http://[::bad') === true);

// A POST to a third party that rejects our headers would still be an asset we
// own: the body must keep its Content-Type.
{
  const post = buildRequestHeaders({
    url: 'https://wp.ellars.us.com/wp-json/contact/v1/send',
    origin: 'https://ellars.us.com',
    method: 'POST',
    hasBody: true,
  });
  check('a third-party POST keeps Content-Type', post['Content-Type'] === 'application/json');
  check('a third-party POST drops the vendor headers', !('X-Client-Telemetry' in post));
}

console.log(`\n${passed} passed, ${failures.length} failed`);
if (failures.length) {
  console.error(failures.map((line) => ` - ${line}`).join('\n'));
  process.exit(1);
}
