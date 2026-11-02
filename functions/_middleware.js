/**
 * Cloudflare Pages middleware: per-URL metadata in the raw HTML.
 *
 * Pages serves one static shell for every route, so without this a crawler that
 * does not execute JavaScript sees the site title on every URL, no canonical, and
 * one description. The client fixes all of that after hydration; this fixes it in
 * the bytes that arrive first.
 *
 * Scope, deliberately narrow:
 *  - only requests that asked for a document (`Accept: text/html`);
 *  - only paths the router actually serves, via lib/edge/meta.js;
 *  - everything else falls straight through to `next()`.
 *
 * One document for every user agent, on purpose: Cloudflare caches by URL and
 * ignores `Vary: User-Agent`, so a crawler-only render can be served to a
 * browser. The injected values are identical for both, so there is nothing to
 * vary.
 */

import { applyMeta, canonicalOriginFor, isPreviewHost, resolveMeta, wantsDocument } from '../lib/edge/meta.js';

export async function onRequest({ request, next, env }) {
  if (request.method !== 'GET') return next();
  if (!wantsDocument(request)) return next();

  const url = new URL(request.url);
  const meta = resolveMeta(url.pathname, canonicalOriginFor(url), { forceNoindex: isPreviewHost(url) });
  if (!meta) return next();

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
  if (!headers.has('Cache-Control')) headers.set('Cache-Control', 'public, max-age=0, must-revalidate');

  return new Response(applyMeta(html, meta), { status: 200, headers });
}
