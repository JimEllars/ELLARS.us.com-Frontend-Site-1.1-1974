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
  readHeadTags,
  reconcileHead,
  resolveRouteMeta,
  ogUrlFor,
  routeCanonicalPath,
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


console.log('\nsrc/lib/headMeta.js — canonical ownership');

/**
 * The canonical was the one head tag the reconciliation never considered, because
 * `readHeadTags` looked at `meta` only. Measured in production on 2026-11-05, in a
 * real browser, after the release that introduced this file:
 *
 *   load /                 -> two identical canonicals (`/` from the edge, `/[rh]`)
 *   home -> news-media     -> `/` plus `/news-media`
 *   news-media -> article  -> `/` and nothing else, i.e. every dispatch reached by
 *                             clicking told a crawler it duplicates the homepage
 *
 * These build the same head shapes in memory and assert the outcome of a reconcile
 * pass, so the sequence is covered without a browser.
 */
{
  const link = (href, owned = false) => ({
    tagName: 'LINK',
    attrs: { rel: 'canonical', href, ...(owned ? { 'data-rh': 'true' } : {}) },
    getAttribute(name) {
      return Object.prototype.hasOwnProperty.call(this.attrs, name) ? this.attrs[name] : null;
    },
    hasAttribute(name) {
      return Object.prototype.hasOwnProperty.call(this.attrs, name);
    },
    remove() {
      this.removed = true;
    },
  });
  const meta = (key, content, owned = false) => ({
    tagName: 'META',
    attrs: { ...(key.startsWith('og:') ? { property: key } : { name: key }), content, ...(owned ? { 'data-rh': 'true' } : {}) },
    getAttribute(name) {
      return Object.prototype.hasOwnProperty.call(this.attrs, name) ? this.attrs[name] : null;
    },
    hasAttribute(name) {
      return Object.prototype.hasOwnProperty.call(this.attrs, name);
    },
    remove() {
      this.removed = true;
    },
  });
  // Only the two selectors the module asks for, so the fake cannot accidentally
  // "pass" by answering a selector the real document would answer differently.
  const fakeHead = (elements) => ({
    querySelectorAll(selector) {
      if (selector === 'meta, link[rel="canonical"]') return elements;
      if (selector === 'meta') return elements.filter((e) => e.tagName === 'META');
      throw new Error(`unexpected selector: ${selector}`);
    },
  });
  const live = (elements) => elements.filter((e) => !e.removed);
  // Links only: a `<meta>` has no href, and a helper that counts one would make the
  // "exactly one canonical" assertions pass for the wrong reason.
  const canonicals = (elements) => live(elements).filter((e) => e.tagName === 'LINK').map((e) => e.attrs.href);

  check('routeCanonicalPath builds an article path', routeCanonicalPath('a-b') === '/articles/a-b', routeCanonicalPath('a-b'));
  check('routeCanonicalPath strips a trailing slash', routeCanonicalPath('/a-b/') === '/articles/a-b', routeCanonicalPath('/a-b/'));
  check('routeCanonicalPath drops query and hash', routeCanonicalPath('a-b?utm=x#top') === '/articles/a-b');
  check('an empty slug yields no path (the edge keeps its own answer)', routeCanonicalPath('') === null);
  check('a missing slug yields no path', routeCanonicalPath(undefined) === null);

  // readHeadTags must see the canonical at all — the actual defect.
  {
    const elements = [meta('description', 'shell'), link(`${SITE_ORIGIN}/about`)];
    const tags = readHeadTags(fakeHead(elements));
    const canonical = tags.find((t) => t.key === 'canonical');
    check('readHeadTags reports the canonical as a key', Boolean(canonical), JSON.stringify(tags.map((t) => t.key)));
    check('the canonical carries its href as content', canonical?.content === `${SITE_ORIGIN}/about`, canonical?.content);
    check('the shell canonical is not owned', canonical?.owned === false);
  }

  // 1. First load of `/`: the edge's canonical plus Helmet's identical one.
  {
    const elements = [meta('description', 'shell'), link(`${SITE_ORIGIN}/`), link(`${SITE_ORIGIN}/`, true)];
    reconcileHead(fakeHead(elements));
    check('an identical client canonical still supersedes the edge copy', canonicals(elements).length === 1, JSON.stringify(canonicals(elements)));
    check('the survivor is the client-owned one', live(elements).find((e) => e.tagName === 'LINK')?.hasAttribute('data-rh') === true);
  }

  // 2. Article opened directly: the client writes its own; the edge's is dropped.
  {
    const path = '/articles/whatever-the-count-brings';
    const elements = [link(`${SITE_ORIGIN}${path}`), link(`${SITE_ORIGIN}${path}`, true), meta('description', 'shell', false), meta('description', 'dispatch', true)];
    reconcileHead(fakeHead(elements));
    check('an article keeps exactly one canonical', canonicals(elements).length === 1, JSON.stringify(canonicals(elements)));
    check('and drops the shell description', live(elements).filter((e) => e.tagName === 'META').length === 1);
  }

  // 3. The navigation that published the homepage as every dispatch's canonical.
  {
    const elements = [
      link(`${SITE_ORIGIN}/articles/whatever-the-count-brings`), // stale, from the entry page
      link(`${SITE_ORIGIN}/about`, true), // the client, after navigating
    ];
    reconcileHead(fakeHead(elements));
    check('an article canonical does not survive navigation', canonicals(elements).length === 1, JSON.stringify(canonicals(elements)));
    check('the surviving canonical is the current route', canonicals(elements)[0] === `${SITE_ORIGIN}/about`, canonicals(elements)[0]);
  }

  // 4. A route which writes no canonical of its own keeps the edge's answer.
  {
    const elements = [link(`${SITE_ORIGIN}/articles/late-render`)];
    reconcileHead(fakeHead(elements));
    check('a shell canonical survives when nothing competes', canonicals(elements).length === 1, JSON.stringify(canonicals(elements)));
    check('reconciling twice changes nothing', reconcileHead(fakeHead(elements)) === 0);
  }
}

console.log(`\n${passed} passed, ${failures.length} failed`);
if (failures.length) {
  console.error(failures.map((line) => ` - ${line}`).join('\n'));
  process.exit(1);
}
