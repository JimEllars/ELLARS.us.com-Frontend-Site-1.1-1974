/**
 * Client-side document metadata, derived from the edge's own table.
 *
 * The shell in index.html declares `description`, `og:*` and `twitter:*` so a
 * crawler that never runs JavaScript still gets a coherent document, and
 * functions/_middleware.js rewrites those bytes per route. Eight page components
 * then declared the same fields again from hand-copied strings — measured on
 * /news-media after hydration: two `description`, two `og:title`, two
 * `og:description`, two `og:type`, two `og:url`, two `og:image`. The copies had
 * already drifted (the tab said "News & Media Hub | James Ellars" while the edge
 * and the <title> said "…| Official"), one of them still pointed `og:image` at the
 * legacy WordPress host, and the surviving `og:image:width/height` described a
 * different file than the `og:image` they sat next to.
 *
 * There is now one table — lib/edge/meta.js, which the middleware and the sitemap
 * already share — and one client writer that reads it (components/common/
 * RouteMeta.jsx). Because both sides resolve the same table, hydration is a no-op
 * by construction rather than by eight hand-copied strings staying in sync.
 *
 * This module is the seam between the two, and it is deliberately pure: no React,
 * no DOM at import time, so scripts/smoke-client.mjs can assert the resolution and
 * the dedupe plan without a browser.
 */

import {
  NOT_FOUND_META,
  SITE_ORIGIN,
  normalizePath,
  resolveMeta,
} from '../../lib/edge/meta.js';

export { NOT_FOUND_META, SITE_ORIGIN };

/** Routes whose metadata is data-driven, and therefore owned by the page component. */
const DATA_DRIVEN = /^\/articles\/[^/]+$/;

/**
 * Metadata for a client route, or `null` when the page component owns the head.
 *
 * `/articles/:slug` returns null: the title, description and share image come from
 * WordPress after the post is fetched, so ArticleDetail.jsx is the only component
 * that can write them. Every other route resolves from the shared table, and an
 * unknown path resolves to the same NOT_FOUND_META the middleware serves with a 404.
 */
export const resolveRouteMeta = (pathname) => {
  const path = normalizePath(pathname);
  if (DATA_DRIVEN.test(path)) return null;
  return resolveMeta(path, SITE_ORIGIN) || NOT_FOUND_META;
};

/**
 * The canonical path for a dispatch, from the slug alone.
 *
 * `/articles/:slug` is the one route with no `RouteMeta` writer, so the page
 * component builds its own identity. Building it here rather than in the component
 * keeps the rule testable without a browser and in one place: trailing slashes,
 * query and fragment are stripped exactly as `normalizePath` strips them, and an
 * empty slug returns `null` so the caller keeps the edge's answer instead of
 * inventing `/articles`.
 */
export const routeCanonicalPath = (slug) => {
  const clean = String(slug ?? '')
    .split(/[?#]/)[0]
    .replace(/^\/+|\/+$/g, '');
  return clean ? `/articles/${clean}` : null;
};

/** The og:url a document advertises. Same fallback the middleware applies. */
export const ogUrlFor = (meta) => (meta && meta.canonical) || `${SITE_ORIGIN}/`;

/**
 * Open Graph hints that describe a *specific* image. They are only meaningful next
 * to the `og:image` they were written for.
 */
const OG_IMAGE_HINTS = new Set(['og:image:type', 'og:image:width', 'og:image:height', 'og:image:alt']);

/**
 * Decides which head tags must go, given a snapshot of the document's meta tags.
 *
 * Two rules, both mechanical:
 *
 *  1. A tag the client manages (react-helmet-async marks its output `data-rh`)
 *     supersedes the shell's copy of the same key — `<meta>` or `<link
 *     rel="canonical">`. Until such a copy exists the shell's tag stays, so a
 *     document that never hydrates keeps its metadata, and a route whose page does
 *     not declare a field is not left blank.
 *  2. If the client's `og:image` names a different image than the shell's, the
 *     shell's `og:image:*` hints are dropped too — they size an image that is no
 *     longer declared. This is the article case: a dispatch shares its featured
 *     image, not the site card.
 *
 * Returns indexes into `tags` to remove, so the caller can delete the nodes and the
 * test can assert the decision without touching a document.
 */
export const planHeadDedupe = (tags = []) => {
  const ownedKeys = new Set(tags.filter((tag) => tag.owned).map((tag) => tag.key));
  const removable = new Set();

  tags.forEach((tag, index) => {
    if (!tag.owned && ownedKeys.has(tag.key)) removable.add(index);
  });

  const clientImage = tags.find((tag) => tag.owned && tag.key === 'og:image');
  const shellImage = tags.find((tag) => !tag.owned && tag.key === 'og:image');
  if (clientImage && shellImage && clientImage.content !== shellImage.content) {
    tags.forEach((tag, index) => {
      if (!tag.owned && OG_IMAGE_HINTS.has(tag.key)) removable.add(index);
    });
  }

  return [...removable];
};

/**
 * The head as records the planner understands.
 *
 * `<link rel="canonical">` is included, and it is the reason this selector is not
 * just `meta`. The shell's canonical is written by the edge middleware (so a
 * crawler that never runs JavaScript gets one); react-helmet then writes the
 * client's own. Nothing removed the shell's, so:
 *
 *   - `/` carried **two identical** canonicals after hydration;
 *   - an article reached by clicking from the archive carried the **homepage**
 *     canonical and nothing else, because `/articles/:slug` has no `RouteMeta`
 *     writer and the previous route's tag was never replaced. That tells a search
 *     engine every dispatch is a duplicate of `/`;
 *   - an article opened directly carried the site card's `og:image:width/height`
 *     next to the dispatch's own `og:image`.
 *
 * One rule, applied to both: a client-owned tag supersedes the shell's copy of the
 * same key. The canonical is a key like any other.
 */
export const HEAD_TAG_SELECTOR = 'meta, link[rel="canonical"]';

export const readHeadTags = (head) => {
  if (!head || typeof head.querySelectorAll !== 'function') return [];
  return [...head.querySelectorAll(HEAD_TAG_SELECTOR)].map((element) => {
    const isCanonical = element.tagName === 'LINK' || element.getAttribute('rel') === 'canonical';
    return {
      element,
      // The canonical's "key" is the string the client writer also uses, so the
      // supersede rule applies without a special case.
      key: isCanonical ? 'canonical' : element.getAttribute('property') || element.getAttribute('name') || '',
      content: isCanonical ? element.getAttribute('href') || '' : element.getAttribute('content') || '',
      owned: element.hasAttribute('data-rh'),
    };
  });
};

/**
 * Applies the plan to a live document head. Idempotent: the second pass over an
 * already-reconciled head plans nothing, so a route change that renders twice (or
 * StrictMode running an effect twice) cannot remove a tag it should keep.
 */
export const reconcileHead = (head) => {
  const tags = readHeadTags(head);
  const removals = planHeadDedupe(tags);
  removals.forEach((index) => tags[index].element.remove());
  return removals.length;
};
