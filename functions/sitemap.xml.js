/**
 * Cloudflare Pages Function: /sitemap.xml
 *
 * Built at the edge from two sources: the static routes the router actually
 * serves, and the published dispatches in WordPress.
 *
 * ## What Sprint 2.21 changed, and why
 *
 * 1. **The edge cache never actually engaged.** The handler returned
 *    `Cache-Control: public, max-age=600, s-maxage=3600` and its own comment
 *    claimed a crawler sweep cost one WordPress round trip. It did not:
 *    Cloudflare does not implicitly cache a Pages *Function* response, and
 *    `cf-cache-status` measured `DYNAMIC` on repeated identical requests, so
 *    every crawl — and every crawler — paid a fresh WordPress round trip to a
 *    shared Bluehost origin. The response is now stored explicitly in
 *    `caches.default`, which is the only mechanism that makes the claim true.
 * 2. **`HEAD` was answered by the SPA shell.** Only `onRequestGet` was exported,
 *    so `HEAD /sitemap.xml` fell through to `_redirects` (`/* /index.html 200`)
 *    and returned the HTML shell as `text/html` with a `200`. Any tool that
 *    probes a sitemap before fetching it was told the sitemap is an HTML page.
 * 3. **The WordPress fetch had no timeout.** A hung origin held the worker until
 *    the platform killed it; measured cold at 4.0 s against a 0.7 s origin.
 *
 * ## What the first deploy of the above taught, measured in production
 *
 * A 2.5 s timeout was too tight for a cold worker, and `s-maxage` alone does not
 * control a Cache API entry: the stored response also carried `max-age=600`, so
 * the **degraded** document (4 static routes and 6 directives, no dispatches)
 * was served from cache for ten minutes after the origin had recovered. `s-maxage`
 * is a hint for intermediary proxies; `caches.default` read `max-age`. Two rules
 * follow, and both are now enforced here:
 *
 *  - `Cache-Control` on a stored response states the same lifetime in `max-age`
 *    that the code intends. One number, honoured by everything.
 *  - A failure never erases what it cannot see. The post list is kept in its own
 *    cache entry, and a failed origin reuses the last good one instead of
 *    publishing a sitemap that pretends the dispatches do not exist.
 *
 * The cache keys are versioned and synthetic for the same reason: an entry
 * written by an older deployment cannot be inherited by this one, and a crawler
 * adding `?utm=` cannot fan the document out into a hundred cache entries.
 *
 * Two details that matter:
 *
 * 1. WordPress returns naive local timestamps ("2026-10-30T06:00:00", no zone).
 *    Parsed raw, the same post produces a different <lastmod> depending on which
 *    colo renders the sitemap, so they are pinned to UTC.
 * 2. Entities must be decoded before re-escaping. WordPress hands back
 *    "Siphon Economy &amp; You"; escaping that verbatim yields "&amp;amp;",
 *    which renders literally in a preview.
 */

const SITE_ORIGIN = "https://ellars.us.com";
const DEFAULT_WP_API = "https://wp.ellars.us.com/wp-json/wp/v2";

/** How long a good sitemap is reused, and how long a degraded one is. */
const CACHE_SECONDS_OK = 3600;
const CACHE_SECONDS_DEGRADED = 60;

/** How long a post list is reused when the origin is unreachable. */
const CACHE_SECONDS_STALE_POSTS = 300;

/**
 * A shared origin that has not answered in this long is not going to.
 * 2.5 s was measured to be too tight for a cold worker against this origin; the
 * same fetch took ~0.9 s warm and 4.0 s on the first request after a deploy.
 */
const WP_TIMEOUT_MS = 6000;

/**
 * Cache keys. Deliberately synthetic and versioned: they are not routable paths,
 * so they cannot collide with a page, and a document written by an older
 * deployment cannot be served by this one.
 */
export const CACHE_KEY_PATH = "/__edge-cache/sitemap-v2";
export const POSTS_CACHE_KEY_PATH = "/__edge-cache/sitemap-posts-v2";

// Mirrors the router in src/App.jsx. Keep in sync when a route is added.
const STATIC_ROUTES = [
  { path: "/", changefreq: "daily", priority: "1.0" },
  { path: "/platform", changefreq: "weekly", priority: "0.9" },
  { path: "/about", changefreq: "monthly", priority: "0.7" },
  { path: "/news-media", changefreq: "weekly", priority: "0.6" },
];

// Mirrors the directive slugs rendered by /platform/:directiveSlug.
const DIRECTIVE_SLUGS = [
  "working-class-foundation",
  "political-reform",
  "the-automation-dividend-and-taxation",
  "future-infrastructure",
  "defunding-war-corporations",
  "american-home-building",
];

const decodeEntities = (value = "") =>
  String(value)
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&#8217;/g, "\u2019")
    .replace(/&#8211;/g, "\u2013")
    .replace(/&#8212;/g, "\u2014");

const escapeXml = (value = "") =>
  decodeEntities(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

const toUtcIso = (value) => {
  if (!value) return null;
  // Already zoned (Z or +hh:mm)? Trust it. Otherwise pin the naive value to UTC.
  const zoned = /(Z|[+-]\d{2}:?\d{2})$/.test(value) ? value : `${value}Z`;
  const parsed = new Date(zoned);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
};

const urlEntry = ({ loc, lastmod, changefreq, priority }) => {
  const parts = [`    <loc>${escapeXml(loc)}</loc>`];
  const stamp = toUtcIso(lastmod);
  if (stamp) parts.push(`    <lastmod>${stamp}</lastmod>`);
  if (changefreq) parts.push(`    <changefreq>${changefreq}</changefreq>`);
  if (priority) parts.push(`    <priority>${priority}</priority>`);
  return `  <url>\n${parts.join("\n")}\n  </url>`;
};

/**
 * Fetches the published posts, or `null` when WordPress does not answer.
 *
 * `null` and `[]` are different facts: "the origin is down" must not be cached
 * for an hour, because it would keep a healthy site's dispatches out of the
 * sitemap long after the origin recovered.
 */
const parsePosts = async (wpApi) => {
  const endpoint = `${wpApi}/posts?per_page=100&_fields=slug,modified,date,status`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), WP_TIMEOUT_MS);
  try {
    const response = await fetch(endpoint, {
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
    if (!response.ok) return null;
    const posts = await response.json();
    if (!Array.isArray(posts)) return null;
    return posts
      .filter((post) => post?.slug && (!post.status || post.status === "publish"))
      .map((post) => ({
        loc: `${SITE_ORIGIN}/articles/${post.slug}`,
        lastmod: post.modified || post.date,
        changefreq: "monthly",
        priority: "0.8",
      }));
  } finally {
    clearTimeout(timer);
  }
};

/** The document itself. Pure: no fetch, no cache, so it is assertable in CI. */
const buildSitemap = (postEntries = []) => {
  const entries = [
    ...STATIC_ROUTES.map((route) => ({
      loc: `${SITE_ORIGIN}${route.path}`,
      changefreq: route.changefreq,
      priority: route.priority,
    })),
    ...DIRECTIVE_SLUGS.map((slug) => ({
      loc: `${SITE_ORIGIN}/platform/${slug}`,
      changefreq: "monthly",
      priority: "0.7",
    })),
    ...postEntries,
  ];

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...entries.map(urlEntry),
    "</urlset>",
    "",
  ].join("\n");
};

const headersFor = ({ cacheState, ttl }) => ({
  "Content-Type": "application/xml; charset=utf-8",
  // One lifetime, stated in `max-age`, because that is the directive the Cache
  // API actually reads. `s-maxage` alone was measured to be ignored: a degraded
  // document stored with `max-age=600, s-maxage=60` was still being served ten
  // minutes later, with its dispatches missing.
  "Cache-Control": `public, max-age=${ttl}`,
  // Visible from one curl instead of inferred from a payload diff.
  "X-Sitemap-Cache": cacheState,
  "X-Sitemap-TTL": String(ttl),
  "X-Content-Type-Options": "nosniff",
});

/**
 * Reads a cache entry as text, tolerating a missing cache or a failed read.
 * Returns `null` when there is nothing usable.
 */
const cacheRead = async (cache, key) => {
  if (!cache) return null;
  try {
    const hit = await cache.match(key);
    if (!hit) return null;
    return hit;
  } catch (error) {
    console.warn("sitemap: edge cache read failed", error?.message);
    return null;
  }
};

const cacheWrite = async (cache, key, response, waitUntil) => {
  if (!cache) return;
  const write = cache
    .put(key, response)
    .catch((error) => console.warn("sitemap: edge cache write failed", error?.message));
  if (typeof waitUntil === "function") waitUntil(write);
  else await write;
};

async function serve({ request, env, waitUntil }, method = "GET") {
  const cache = typeof caches !== "undefined" && caches?.default ? caches.default : null;
  const origin = new URL(request.url).origin;
  const documentKey = `${origin}${CACHE_KEY_PATH}`;
  const postsKey = `${origin}${POSTS_CACHE_KEY_PATH}`;

  const hit = await cacheRead(cache, documentKey);
  if (hit) {
    const storedTtl = Number(hit.headers.get("X-Sitemap-TTL"));
    const ttl = Number.isFinite(storedTtl) && storedTtl > 0 ? storedTtl : CACHE_SECONDS_OK;
    return new Response(method === "HEAD" ? null : await hit.text(), {
      status: 200,
      headers: headersFor({ cacheState: "hit", ttl }),
    });
  }

  const wpApi = env?.WP_API_URL || DEFAULT_WP_API;

  let postEntries = null;
  try {
    postEntries = await parsePosts(wpApi);
  } catch (error) {
    // A WordPress outage must not take the sitemap down with it; the static
    // routes and directives are still valid, and so is the last good post list.
    console.warn("sitemap: WordPress unavailable", error?.message);
  }

  let cacheState = "miss";
  let ttl = CACHE_SECONDS_OK;

  if (postEntries === null) {
    // The origin did not answer. Reusing the last good post list is the whole
    // point of keeping it separately: a sitemap that silently drops every
    // dispatch because of one failed fetch is a worse answer than a stale one.
    const stale = await cacheRead(cache, postsKey);
    const staleEntries = stale ? await stale.json().catch(() => null) : null;
    if (Array.isArray(staleEntries) && staleEntries.length) {
      postEntries = staleEntries;
      cacheState = "miss-stale-posts";
      ttl = CACHE_SECONDS_STALE_POSTS;
    } else {
      cacheState = "miss-degraded";
      ttl = CACHE_SECONDS_DEGRADED;
    }
  } else {
    await cacheWrite(
      cache,
      postsKey,
      new Response(JSON.stringify(postEntries), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": `public, max-age=${CACHE_SECONDS_OK}`,
        },
      }),
      waitUntil
    );
  }

  const xml = buildSitemap(postEntries || []);

  // Cache the document for exactly the lifetime it is allowed to live. A
  // degraded document is short-lived on purpose, so a crawler that arrives
  // during an outage is not answered from a truncated sitemap for an hour.
  await cacheWrite(
    cache,
    documentKey,
    new Response(xml, { status: 200, headers: headersFor({ cacheState: "stored", ttl }) }),
    waitUntil
  );

  return new Response(method === "HEAD" ? null : xml, {
    status: 200,
    headers: headersFor({ cacheState, ttl }),
  });
}

export async function onRequestGet(context) {
  return serve(context, "GET");
}

/**
 * `HEAD` must answer as `GET` would, minus the body. Without this export the
 * request falls through to the SPA rewrite and is answered with the HTML shell,
 * so a prober is told the sitemap is an HTML page.
 */
export async function onRequestHead(context) {
  return serve(context, "HEAD");
}

export { DEFAULT_WP_API, DIRECTIVE_SLUGS, SITE_ORIGIN, STATIC_ROUTES, buildSitemap, escapeXml, toUtcIso };
