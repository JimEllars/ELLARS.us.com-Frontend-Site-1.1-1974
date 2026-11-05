/**
 * Reading a served document back the way a crawler reads it.
 *
 * `applyMeta()` writes a route's identity into the HTML shell: title, description,
 * robots, canonical, `og:*` and `twitter:*`. This module is its counterpart — it
 * parses a document that has already crossed the network and compares it with what
 * the same table says it should contain.
 *
 * Why it exists: every defect of Sprints 2.21 and 2.22 was invisible to CI, because
 * CI runs the code that passed. The build could not tell that a deployed sitemap had
 * lost its dispatches, or that `HEAD` disagreed with `GET`, or that a rewritten
 * document was serving the site title from a stale shell. Only a request to the
 * origin can see those, and the reader below is what turns a response body into a
 * set of assertions a machine can fail on.
 *
 * Pure by construction — no fetch, no clock, no `window` — so the *detection* is
 * itself testable. A probe whose comparison logic is untested is exactly the green
 * gate that checks nothing that Sprint 2.20 had to delete.
 *
 * The comparison is deliberately strict about **duplicates**: Sprints 2.11 and 2.17
 * were both the same defect at different layers (the shell and a page component each
 * writing the same key), and a document with two `og:title` tags has no single
 * identity regardless of which copy is correct.
 */

import { SITE_ORIGIN } from './meta.js';

/** Keys a served document may declare at most once, and which `applyMeta` owns. */
export const MANAGED_KEYS = [
  'description',
  'robots',
  'og:title',
  'og:description',
  'og:url',
  'twitter:title',
  'twitter:description',
];

/** The attribute each managed key is declared with. */
const KEY_ATTRIBUTE = {
  description: 'name',
  robots: 'name',
  'og:title': 'property',
  'og:description': 'property',
  'og:url': 'property',
  'twitter:title': 'name',
  'twitter:description': 'name',
};

const escapeRegExp = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Decodes the five entities `escapeAttr()` emits, in one pass.
 *
 * Needed because comparison happens on values, not on markup: the dividend
 * directive's title is `THE AUTOMATION DIVIDEND & TAXATION Policy`, which reaches
 * the document as `&amp;`. Comparing the raw attribute would fail on a correct
 * document, and the "fix" for that is a test that skips titles containing `&`.
 */
const decodeEntities = (value = '') =>
  String(value).replace(/&(amp|lt|gt|quot|#39);/g, (_, entity) =>
    ({ amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'" })[entity]
  );

const metaTags = (html, attribute, key) => {
  const pattern = new RegExp(`<meta\\s+[^>]*\\b${attribute}="${escapeRegExp(key)}"[^>]*>`, 'gi');
  return [...String(html).matchAll(pattern)].map((match) => match[0]);
};

const contentOfTag = (tag) => {
  const match = tag.match(/\bcontent="([^"]*)"/i);
  return match ? decodeEntities(match[1]) : null;
};

const canonicalTags = (html) => [...String(html).matchAll(/<link\s+[^>]*\brel="canonical"[^>]*>/gi)].map((match) => match[0]);

const hrefOfTag = (tag) => {
  const match = tag.match(/\bhref="([^"]*)"/i);
  return match ? decodeEntities(match[1]) : null;
};

/**
 * Parses a served document into the facts a crawler acts on, plus the count of each
 * managed key so duplication is detectable rather than averaged away.
 */
export const readDocumentIdentity = (html = '') => {
  const text = String(html);
  const titles = [...text.matchAll(/<title>([\s\S]*?)<\/title>/gi)].map((match) => decodeEntities(match[1].trim()));
  const canonicals = canonicalTags(text).map(hrefOfTag);

  const read = (key) => {
    const tags = metaTags(text, KEY_ATTRIBUTE[key], key);
    return { content: tags.length ? contentOfTag(tags[0]) : null, count: tags.length };
  };

  const facts = Object.fromEntries(MANAGED_KEYS.map((key) => [key, read(key)]));

  return {
    titles,
    title: titles[0] ?? null,
    canonicals,
    canonical: canonicals[0] ?? null,
    description: facts.description.content,
    robots: facts.robots.content,
    ogTitle: facts['og:title'].content,
    ogDescription: facts['og:description'].content,
    ogUrl: facts['og:url'].content,
    twitterTitle: facts['twitter:title'].content,
    twitterDescription: facts['twitter:description'].content,
    counts: {
      title: titles.length,
      canonical: canonicals.length,
      ...Object.fromEntries(MANAGED_KEYS.map((key) => [key, facts[key].count])),
    },
  };
};

const quote = (value) => (value === null || value === undefined ? 'absent' : JSON.stringify(value));

/**
 * Compares a served document with the metadata the edge table says it carries.
 *
 * Returns an array of human-readable failures — empty means the document is what it
 * claims to be. Every message states the measured value, because the reader of a red
 * probe is deciding whether the site or the probe is wrong.
 *
 * @param {object}  input
 * @param {string}  input.path            Requested path, for the message.
 * @param {number}  input.status          Status the origin answered with.
 * @param {number}  input.expectedStatus  Status it must answer with (200, or 404).
 * @param {string}  input.html            Response body.
 * @param {object}  input.meta            `resolveMeta()` result, or `NOT_FOUND_META`.
 * @param {string}  [input.siteOrigin]    Origin an `og:url` falls back to.
 */
export const compareDocument = ({ path, status, expectedStatus = 200, html, meta, siteOrigin = SITE_ORIGIN }) => {
  const failures = [];
  const label = `${path}:`;
  const identity = readDocumentIdentity(html);

  if (!meta) {
    failures.push(`${label} no expected metadata was supplied (resolveMeta returned null for this path)`);
    return failures;
  }

  if (status !== expectedStatus) {
    failures.push(`${label} answered ${status}, expected ${expectedStatus}`);
  }

  // One <title> per document. Two is a contradiction: the first wins for a crawler
  // and react-helmet-appended copies win in the DOM (Sprint 2.17).
  if (identity.counts.title !== 1) {
    failures.push(`${label} declares ${identity.counts.title} <title> tags, expected 1`);
  }
  if (identity.title !== meta.title) {
    failures.push(`${label} title ${quote(identity.title)}, expected ${quote(meta.title)}`);
  }

  if (identity.description !== meta.description) {
    failures.push(`${label} description ${quote(identity.description)}, expected ${quote(meta.description)}`);
  }
  if (identity.robots !== meta.robots) {
    failures.push(`${label} robots ${quote(identity.robots)}, expected ${quote(meta.robots)}`);
  }

  // A canonical is either the route's own URL or absent. Absent is correct only for a
  // 404: a self-canonical is how a soft 404 stays in an index.
  const expectedCanonical = meta.canonical ?? null;
  if (identity.counts.canonical > 1) {
    failures.push(`${label} declares ${identity.counts.canonical} canonical links, expected at most 1`);
  }
  if (identity.canonical !== expectedCanonical) {
    failures.push(`${label} canonical ${quote(identity.canonical)}, expected ${quote(expectedCanonical)}`);
  }

  const expectedOgUrl = meta.canonical ?? `${String(siteOrigin).replace(/\/+$/, '')}/`;
  if (identity.ogUrl !== expectedOgUrl) {
    failures.push(`${label} og:url ${quote(identity.ogUrl)}, expected ${quote(expectedOgUrl)}`);
  }
  if (identity.ogTitle !== meta.title) {
    failures.push(`${label} og:title ${quote(identity.ogTitle)}, expected ${quote(meta.title)}`);
  }
  if (identity.twitterTitle !== meta.title) {
    failures.push(`${label} twitter:title ${quote(identity.twitterTitle)}, expected ${quote(meta.title)}`);
  }

  for (const key of MANAGED_KEYS) {
    if (identity.counts[key] > 1) {
      failures.push(`${label} declares ${key} ${identity.counts[key]} times, expected at most 1`);
    }
  }

  return failures;
};
