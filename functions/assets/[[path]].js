/**
 * Cloudflare Pages Function: /assets/* (catch-all)
 *
 * Hashed build assets are immutable, so a request for one that does not exist is
 * never a client typo — it is a stale reference. The `/* /index.html 200`
 * catch-all in public/_redirects answers it with the HTML shell and a **200**,
 * so the browser receives `<!doctype html>` where it expected a JavaScript
 * module, refuses to execute it, and the app dies with nothing on screen and
 * nothing in the UI to explain it.
 *
 * That is not hypothetical: after a deploy, a document served from the service
 * worker cache (or from a colo still holding the previous release) references a
 * chunk hash that has just been deleted. The user gets a white page and a
 * MIME-type error in a console they will never open.
 *
 * This handler proxies real assets through untouched — headers, including the
 * `immutable` cache rule, are the asset's own — and turns a miss into a real 404
 * with `no-store`, which a module loader can fail cleanly and a recovery path can
 * recognise.
 */

export async function onRequest({ request, env }) {
  if (env?.ASSETS?.fetch) {
    const asset = await env.ASSETS.fetch(request);
    if (asset.status !== 404) return asset;
  }

  return new Response('Asset not found. This build no longer contains that file; reload the page.\n', {
    status: 404,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      // Never let a miss be cached: the next deploy may legitimately contain it.
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
