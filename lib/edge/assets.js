/**
 * Static-file requests that reach the edge and find nothing.
 *
 * `public/_redirects` is a single `/* /index.html 200`. That is right for SPA
 * routes and wrong for everything that is a *file*: a request for
 * `/screenshot_home.png` — which is what every social scraper asks for, because
 * index.html names it as the `og:image` — came back as the HTML shell with a
 * **200**. A scraper receives `<!doctype html>` where an image was promised and
 * renders nothing; a browser shows a broken image; a module loader fails with a
 * MIME-type error nobody sees.
 *
 * Sprint 2.9 fixed this for `/assets/*` only, which is where the visible damage
 * was (hashed chunk → white page). The same defect existed for every other file
 * extension and was found by probing the live site for the og:image. Both call
 * sites now share this module so the rule cannot drift again.
 *
 * Deliberately narrow: only binary/media extensions count as "a file". `xml`,
 * `json`, `txt` and `html` are excluded because they have their own handlers
 * (`/sitemap.xml` is a Pages Function, and a middleware fetch through
 * `env.ASSETS` would miss it and 404 the sitemap).
 */

export const FILE_EXTENSIONS = new Set([
  'js',
  'mjs',
  'css',
  'map',
  'png',
  'jpg',
  'jpeg',
  'gif',
  'svg',
  'webp',
  'avif',
  'ico',
  'bmp',
  'woff',
  'woff2',
  'ttf',
  'otf',
  'eot',
  'mp4',
  'webm',
  'mov',
  'mp3',
  'm4a',
  'ogg',
  'wav',
  'pdf',
  'zip',
]);

/**
 * Paths the middleware must never reinterpret.
 *
 * `/api/*` owns its responses (an unknown API route is a JSON 404, not an HTML
 * one). `/sitemap.xml` is a Pages Function: a middleware fetch through
 * `env.ASSETS` misses it, and treating the path as a document 404s the sitemap
 * for any client that sends `Accept: text/html` — which is every browser.
 * `/200.html` and `/index.html` are the shell itself; a 404 there would break the
 * SPA fallback Pages derives from them.
 */
export const isReservedPath = (pathname = '/') => {
  const path = String(pathname);
  return (
    path.startsWith('/api/') ||
    path.startsWith('/cdn-cgi/') ||
    path === '/sitemap.xml' ||
    path === '/200.html' ||
    path === '/index.html'
  );
};

/**
 * Text files that are still files, not routes: `/robots.txt` is fetched by every
 * crawler, `/manifest.webmanifest` by every install, and neither is an SPA path.
 *
 * These were missed by the first version of this rule, which treated only
 * binary/media extensions as files — so `/robots.txt` fell through to the
 * document branch, found no route, and answered `404` to any client that sent
 * `Accept: text/html`. `/sitemap.xml` is deliberately **not** here: it is a Pages
 * Function and is listed in `isReservedPath` instead.
 */
export const DOCUMENT_EXTENSIONS = new Set(['txt', 'xml', 'json', 'webmanifest', 'csv', 'ics']);

const extensionOf = (pathname = '/') => {
  const path = String(pathname).split('?')[0].split('#')[0];
  const lastSegment = path.slice(path.lastIndexOf('/') + 1);
  const dot = lastSegment.lastIndexOf('.');
  if (dot <= 0) return null;
  return lastSegment.slice(dot + 1).toLowerCase();
};

/**
 * True when the last segment of a path carries a binary/media extension.
 * A dispatch slug containing a dot (`/articles/prices.and.paychecks`) does not
 * match, because only the listed extensions qualify.
 */
export const isFileRequest = (pathname = '/') => FILE_EXTENSIONS.has(extensionOf(pathname));

/** A path that must be answered by the asset pipeline: binary/media or a text file. */
export const isStaticFileRequest = (pathname = '/') => {
  const extension = extensionOf(pathname);
  return Boolean(extension) && (FILE_EXTENSIONS.has(extension) || DOCUMENT_EXTENSIONS.has(extension));
};

/**
 * An HTML response for a file path is the SPA shell, never a file: the asset
 * pipeline routes misses through `_redirects`. Measured on a live deployment.
 */
export const isSpaShell = (response) => /text\/html/i.test(response?.headers?.get?.('Content-Type') || '');

/**
 * The miss response. `no-store` because the next deploy may legitimately contain
 * the file — caching a 404 is how a recovered asset stays broken for a day.
 */
export const assetMissResponse = () =>
  new Response('Asset not found. This build no longer contains that file; reload the page.\n', {
    status: 404,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });

/**
 * Serves a real file through untouched (headers, including the `immutable`
 * cache rule, belong to the asset) and turns a miss into a real 404.
 */
export const serveFileOr404 = async (request, env) => {
  if (!env?.ASSETS?.fetch) return assetMissResponse();
  const asset = await env.ASSETS.fetch(request);
  if (asset.status === 404 || isSpaShell(asset)) return assetMissResponse();
  return asset;
};
