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
 *
 * The rule itself lives in lib/edge/assets.js, shared with the root middleware
 * that applies it to every other file extension (`/screenshot_home.png` had the
 * same defect and was live for a month).
 */

import { serveFileOr404 } from '../../lib/edge/assets.js';

export async function onRequest({ request, env }) {
  return serveFileOr404(request, env);
}
