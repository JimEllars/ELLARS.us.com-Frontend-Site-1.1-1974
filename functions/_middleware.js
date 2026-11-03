/**
 * Cloudflare Pages middleware: per-URL metadata in the raw HTML, and a real
 * status for paths and files that do not exist.
 *
 * Pages serves one static shell for every route, so without this a crawler that
 * does not execute JavaScript sees the site title on every URL, no canonical, and
 * one description. The client fixes all of that after hydration; this fixes it in
 * the bytes that arrive first.
 *
 * This runs before every Pages Function, so it is also the only place that can
 * see a request the router does not serve. Two rules live here:
 *
 *  1. A filename-shaped path — binary media (`/screenshot_home.png`) or a text
 *     file (`/robots.txt`) — is served by the asset pipeline or answered with a
 *     real 404, never the HTML shell with a 200. The same defect that blanked
 *     pages on a stale chunk hash (Sprint 2.9) applied to every file extension,
 *     including the og:image and, briefly, robots.txt.
 *  2. A document request for a path the router does not serve gets the shell with
 *     a **404** status, the NotFound page's own title and `noindex, follow`.
 *     `_redirects` can only answer 200, so `/platform/typo` was an indexable soft
 *     404 — the canonical was absent, the title was the site title, and a crawler
 *     had no reason to drop it.
 *
 * Scope, deliberately narrow:
 *  - only GET;
 *  - never `/api/*`, `/cdn-cgi/*`, `/sitemap.xml` or the shell itself (those own
 *    their responses, and an unknown API route is a JSON 404, not an HTML one);
 *  - `/assets/*` shares the file rule with functions/assets/[[path]].js;
 *  - only known extensions count as a file, so an article slug containing a dot
 *    is still a route, and `/sitemap.xml` / the `.html` fallback are reserved.
 *
 * One document for every user agent, on purpose: Cloudflare caches by URL and
 * ignores `Vary: User-Agent`, so a crawler-only render can be served to a
 * browser. The injected values are identical for both, so there is nothing to
 * vary.
 */

import {
  NOT_FOUND_META,
  applyMeta,
  canonicalOriginFor,
  isPreviewHost,
  resolveMeta,
  wantsDocument,
} from '../lib/edge/meta.js';
import { isReservedPath, isStaticFileRequest, serveFileOr404 } from '../lib/edge/assets.js';

export async function onRequest({ request, next, env }) {
  if (request.method !== 'GET') return next();

  const url = new URL(request.url);
  if (isReservedPath(url.pathname)) return next();

  // A file request is answered by the asset pipeline, or not at all. `/assets/*`
  // is included: its own Function applies the same rule, so a module loader gets
  // a text/plain 404 whichever layer sees the request first.
  //
  // `/robots.txt`, `/manifest.webmanifest` and friends are *files*, not routes.
  // They were missed by the first version of this rule and fell through to the
  // document branch, where `/robots.txt` answered `404` to any client sending
  // `Accept: text/html`.
  if (isStaticFileRequest(url.pathname)) {
    return serveFileOr404(request, env);
  }

  if (!wantsDocument(request)) return next();

  const resolved = resolveMeta(url.pathname, canonicalOriginFor(url), { forceNoindex: isPreviewHost(url) });
  const isNotFound = !resolved;
  const meta = resolved || NOT_FOUND_META;

  // The shell is a static asset; fetching it through ASSETS keeps the Pages cache
  // in play instead of duplicating the file here. Fetch the root, not
  // /index.html: Pages 308s the .html path, and the root is the URL that carries
  // the `public/_headers` rules.
  if (!env?.ASSETS?.fetch) return next();

  const shellResponse = await env.ASSETS.fetch(new Request(new URL('/', url), { headers: request.headers }));
  if (!shellResponse.ok) return next();

  const html = await shellResponse.text();

  // Pass the shell's headers through instead of writing our own list. A Functions
  // response does NOT inherit `public/_headers`, so hand-rolling them here would
  // silently drop the Content-Security-Policy (and HSTS, COOP, frame-options,
  // Permissions-Policy) from the one surface that most needs them. Verified: the
  // first version of this handler shipped exactly that hole.
  const headers = new Headers(shellResponse.headers);
  headers.delete('content-length');
  headers.delete('content-encoding');
  headers.delete('etag'); // the body was rewritten; a stale validator would be a lie
  headers.set('Content-Type', 'text/html; charset=utf-8');
  if (isNotFound) {
    // A 404 must never be cached: the path may exist after the next deploy.
    headers.set('Cache-Control', 'no-store');
  } else if (!headers.has('Cache-Control')) {
    headers.set('Cache-Control', 'public, max-age=0, must-revalidate');
  }

  return new Response(applyMeta(html, meta), { status: isNotFound ? 404 : 200, headers });
}
