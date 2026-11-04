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

/** A shared origin that has not answered in this long is not going to. */
const WP_TIMEOUT_MS = 2500;

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
  // Kept honest: `s-maxage` is advisory only for a Pages Function, so the Cache
  // API below is what actually enforces the hour. `X-Sitemap-Cache` makes the
  // difference visible from a single curl instead of an inference, and
  // `X-Sitemap-TTL` carries the stored lifetime across a cache hit (a degraded
  // document is stored for a minute, not an hour).
  "Cache-Control": `public, max-age=600, s-maxage=${ttl}`,
  "X-Sitemap-Cache": cacheState,
  "X-Sitemap-TTL": String(ttl),
  "X-Content-Type-Options": "nosniff",
});

const xmlResponse = (xml, method, meta) =>
  new Response(method === "HEAD" ? null : xml, {
    status: 200,
    headers: headersFor(meta),
  });

async function serve({ request, env, waitUntil }, method = "GET") {
  const cache = typeof caches !== "undefined" && caches?.default ? caches.default : null;

  if (cache) {
    try {
      const hit = await cache.match(request);
      if (hit) {
        const storedTtl = Number(hit.headers.get("X-Sitemap-TTL"));
        const ttl = Number.isFinite(storedTtl) && storedTtl > 0 ? storedTtl : CACHE_SECONDS_OK;
        return new Response(method === "HEAD" ? null : await hit.text(), {
          status: 200,
          headers: headersFor({ cacheState: "hit", ttl }),
        });
      }
    } catch (error) {
      console.warn("sitemap: edge cache read failed", error?.message);
    }
  }

  const wpApi = env?.WP_API_URL || DEFAULT_WP_API;

  let postEntries = null;
  try {
    postEntries = await parsePosts(wpApi);
  } catch (error) {
    // A WordPress outage must not take the sitemap down with it; the static
    // routes and directives are still valid.
    console.warn("sitemap: WordPress unavailable", error?.message);
  }

  const degraded = postEntries === null;
  const xml = buildSitemap(postEntries || []);
  const ttl = degraded ? CACHE_SECONDS_DEGRADED : CACHE_SECONDS_OK;

  // Only cache what we are willing to serve for the whole TTL. A degraded
  // document is cached briefly on purpose, so a crawler that arrives during an
  // outage is not answered from a truncated sitemap for the next hour.
  if (cache) {
    const store = cache
      .put(
        request,
        new Response(xml, {
          status: 200,
          headers: headersFor({ cacheState: "stored", ttl }),
        })
      )
      .catch((error) => console.warn("sitemap: edge cache write failed", error?.message));
    if (typeof waitUntil === "function") waitUntil(store);
    else await store;
  }

  return xmlResponse(xml, method, { cacheState: degraded ? "miss-degraded" : "miss", ttl });
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
