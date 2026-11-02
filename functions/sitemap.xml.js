/**
 * Cloudflare Pages Function: /sitemap.xml
 *
 * Built at the edge from two sources: the static routes the router actually
 * serves, and the published dispatches in WordPress. Cached for an hour at the
 * edge so a crawler sweep costs one WordPress round trip.
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

const parsePosts = async (wpApi) => {
  const endpoint = `${wpApi}/posts?per_page=100&_fields=slug,modified,date,status`;
  const response = await fetch(endpoint, {
    headers: { Accept: "application/json" },
  });
  if (!response.ok) return [];
  const posts = await response.json();
  if (!Array.isArray(posts)) return [];
  return posts
    .filter((post) => post?.slug && (!post.status || post.status === "publish"))
    .map((post) => ({
      loc: `${SITE_ORIGIN}/articles/${post.slug}`,
      lastmod: post.modified || post.date,
      changefreq: "monthly",
      priority: "0.8",
    }));
};

export async function onRequestGet({ env }) {
  const wpApi = env?.WP_API_URL || DEFAULT_WP_API;

  let postEntries = [];
  try {
    postEntries = await parsePosts(wpApi);
  } catch (error) {
    // A WordPress outage must not take the sitemap down with it; the static
    // routes and directives are still valid, and the response is cached for an
    // hour so the failure is not sticky.
    console.warn("sitemap: WordPress unavailable", error?.message);
  }

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

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...entries.map(urlEntry),
    "</urlset>",
    "",
  ].join("\n");

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=600, s-maxage=3600",
    },
  });
}

export { DEFAULT_WP_API, DIRECTIVE_SLUGS, SITE_ORIGIN, STATIC_ROUTES, escapeXml, toUtcIso };
