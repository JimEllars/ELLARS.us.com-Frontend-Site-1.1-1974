/**
 * Per-URL document metadata for the edge.
 *
 * The trade-off recorded when the client-side <CanonicalUrl /> was introduced:
 * canonical, `og:*` and `<title>` were correct only *after* hydration, so a
 * crawler that does not execute JavaScript saw the site title on every URL and no
 * canonical at all. Absent was better than wrong, but it is still absent.
 *
 * This module builds that metadata from a table that mirrors the router, and
 * rewrites the HTML shell before it is sent. It is deliberately:
 *
 *  - pure (no imports, no DOM, no fetch) so CI can assert the escaping, the
 *    canonical normalisation and the idempotence of the rewrite;
 *  - server-side for every HTML navigation, not only for crawler user agents.
 *    Cloudflare caches HTML by URL and ignores `Vary: User-Agent`, so a
 *    UA-conditional render can leak a crawler view to a browser. Serving one
 *    document for everyone removes the hazard, and browsers get the right title
 *    on first paint as a bonus.
 *
 * The client keeps emitting its own canonical and `og:url` after hydration, so
 * the two must agree: both normalise trailing slashes, both drop query and hash.
 */

export const SITE_ORIGIN = 'https://ellars.us.com';

/**
 * Keep in sync with src/App.jsx (routes), functions/sitemap.xml.js (public URLs)
 * and each page's own <Helmet> title. Titles are copied *verbatim* from the pages
 * so hydration is a no-op: a server title that differs from the client's is a
 * visible flicker on every first load and a mismatch between what a crawler reads
 * and what a reader sees.
 */
const STATIC_ROUTES = {
  '/': {
    title: 'Home | James Ellars | Official',
    description:
      'The official platform of James Ellars: a Negative Income Tax, term limits, an end to Citizens United, universal healthcare, and American-built infrastructure.',
  },
  '/platform': {
    title: 'The Platform | James Ellars | Official',
    description:
      'Six directives: working-class foundation, political reform, the automation dividend, future infrastructure, defunding war corporations, and American home building.',
  },
  '/about': {
    title: 'About James Ellars | Bridging Main Street',
    description:
      'James Ellars on building systems that work for working people: economic equity, civic reform, and technology as leverage for the American worker rather than the extractor.',
  },
  '/news-media': {
    title: 'News & Media Hub | James Ellars | Official',
    description:
      'Dispatches, briefings and long-form audio on the economy, automation, and the politics of work — published by the James Ellars platform.',
  },
};

/** Authenticated or private surfaces. Never indexed, always canonical to themselves. */
const NOINDEX_ROUTES = {
  '/login': 'Auth Gateway | James Ellars',
  '/dashboard': 'Secure Dashboard | James Ellars',
};

/** Mirrors the directive slugs rendered by /platform/:directiveSlug (src/pages/Platform.jsx). */
export const DIRECTIVE_META = {
  'working-class-foundation': {
    title: 'WORKING CLASS FOUNDATION Policy | James Ellars',
    description:
      'Rebuilding the American working class as the foundation of the economy: closing the loopholes the wealthy use to hoard wealth and dodge taxes.',
  },
  'political-reform': {
    title: 'POLITICAL REFORM Policy | James Ellars',
    description:
      'Overturn Citizens United, remove corrupt money from politics, and set strict term limits and age caps for elected officials.',
  },
  'the-automation-dividend-and-taxation': {
    title: 'THE AUTOMATION DIVIDEND & TAXATION Policy | James Ellars',
    description:
      'A Negative Income Tax funded by restoring corporate and top-bracket rates, closing avoidance loopholes, and returning the dividend to workers.',
  },
  'future-infrastructure': {
    title: 'FUTURE INFRASTRUCTURE Policy | James Ellars',
    description:
      'Renewable energy grids, high-speed rail, and American-built housing: infrastructure as an investment in the people who build it.',
  },
  'defunding-war-corporations': {
    title: 'DEFUNDING WAR CORPORATIONS Policy | James Ellars',
    description:
      'Ending endless wars and the defense contractors who profit from them, and spending that money on the needs of ordinary Americans instead.',
  },
  'american-home-building': {
    title: 'AMERICAN HOME BUILDING Policy | James Ellars',
    description:
      'Direct, working-class labor programs to build quality, long-lasting homes and address the housing crisis at its root.',
  },
};

export const DIRECTIVE_SLUGS = Object.keys(DIRECTIVE_META);

const GENERIC_DESCRIPTION =
  'The official platform and civic command hub for James Ellars: economic equity, political reform, and technology that works for working people.';

/** Normalises a path the same way the client canonical does: no trailing slash, no query/hash. */
export const normalizePath = (pathname = '/') => {
  const withoutQuery = String(pathname).split('?')[0].split('#')[0];
  const collapsed = withoutQuery.replace(/\/+$/, '');
  return collapsed || '/';
};

const escapeAttr = (value = '') =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

/**
 * Resolves the metadata for a path, or `null` when the shell should be served
 * untouched (unknown, private-internal, or non-page paths).
 */
export const resolveMeta = (pathname, origin = SITE_ORIGIN, options = {}) => {
  const path = normalizePath(pathname);
  const canonical = `${origin.replace(/\/+$/, '')}${path === '/' ? '/' : path}`;
  // A preview or staging host must never be indexed, and must never claim a
  // canonical pointing at itself: *.pages.dev deployments are public URLs.
  const robotsFor = (value) => (options.forceNoindex ? 'noindex, nofollow' : value);

  if (STATIC_ROUTES[path]) {
    return { ...STATIC_ROUTES[path], canonical, robots: robotsFor('index, follow') };
  }

  if (NOINDEX_ROUTES[path]) {
    return {
      title: NOINDEX_ROUTES[path],
      description: GENERIC_DESCRIPTION,
      canonical,
      robots: 'noindex, nofollow',
    };
  }

  const directiveMatch = path.match(/^\/platform\/([^/]+)$/);
  if (directiveMatch) {
    const meta = DIRECTIVE_META[directiveMatch[1]];
    if (!meta) return null;
    return { ...meta, canonical, robots: robotsFor('index, follow') };
  }

  const articleMatch = path.match(/^\/articles\/([^/]+)$/);
  if (articleMatch) {
    // The post's own title lives in WordPress; the raw shell cannot know it
    // without a fetch on the critical path. The canonical is still per-article,
    // which is what keeps dispatches from collapsing into the homepage.
    return {
      title: 'Dispatch | James Ellars',
      description: GENERIC_DESCRIPTION,
      canonical,
      robots: robotsFor('index, follow'),
    };
  }

  return null;
};

/**
 * The origin a canonical should name.
 *
 * Production is pinned to SITE_ORIGIN so a `*.pages.dev` preview never advertises
 * itself as the canonical home of a page. Localhost keeps its own origin so the
 * rewrite is testable, paired with `forceNoindex`.
 */
export const canonicalOriginFor = (url) => {
  const hostname = String(url?.hostname || '');
  const isLocal = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]';
  if (isLocal) return String(url.origin);
  return SITE_ORIGIN;
};

/** True for any host that is not the production domain. Those are noindexed. */
export const isPreviewHost = (url) => {
  const hostname = String(url?.hostname || '');
  const isLocal = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]';
  if (isLocal) return false;
  return hostname !== 'ellars.us.com' && hostname !== 'www.ellars.us.com';
};

/** Replaces the `content` of the first matching meta tag, or inserts the tag before </head>. */
const setMetaTag = (html, attribute, key, content) => {
  const tagPattern = new RegExp(`<meta\\s+[^>]*${attribute}="${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"[^>]*>`, 'i');
  const newTag = `<meta ${attribute}="${key}" content="${escapeAttr(content)}" />`;
  if (tagPattern.test(html)) {
    return html.replace(tagPattern, (existing) =>
      /content="[^"]*"/i.test(existing)
        ? existing.replace(/content="[^"]*"/i, `content="${escapeAttr(content)}"`)
        : existing.replace(/>$/, ` content="${escapeAttr(content)}" />`)
    );
  }
  return html.replace(/<\/head>/i, `    ${newTag}\n  </head>`);
};

const setCanonical = (html, href) => {
  const tag = `<link rel="canonical" href="${escapeAttr(href)}" />`;
  const pattern = /<link\s+[^>]*rel="canonical"[^>]*>/i;
  if (pattern.test(html)) return html.replace(pattern, tag);
  return html.replace(/<\/head>/i, `    ${tag}\n  </head>`);
};

/**
 * Rewrites the shell in place. Idempotent: applying the same metadata twice
 * produces the same document (asserted in CI), so an edge cache that stores an
 * already-rewritten response cannot compound.
 */
export const applyMeta = (html, meta) => {
  if (!html || !meta) return html;

  let output = html;
  output = output.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeAttr(meta.title)}</title>`);
  output = setMetaTag(output, 'name', 'description', meta.description);
  output = setMetaTag(output, 'name', 'robots', meta.robots);
  output = setMetaTag(output, 'property', 'og:title', meta.title);
  output = setMetaTag(output, 'property', 'og:description', meta.description);
  output = setMetaTag(output, 'property', 'og:url', meta.canonical);
  output = setMetaTag(output, 'name', 'twitter:title', meta.title);
  output = setMetaTag(output, 'name', 'twitter:description', meta.description);
  output = setCanonical(output, meta.canonical);

  return output;
};

/**
 * True for a request that expects a document. Browsers send `Accept: text/html`;
 * module, asset, API and sitemap requests do not.
 */
export const wantsDocument = (request) => {
  const accept = request?.headers?.get?.('accept') || '';
  return accept.includes('text/html');
};

export { escapeAttr };
