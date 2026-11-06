import { Helmet } from 'react-helmet-async';
import { useLocation } from 'react-router-dom';
import { ogUrlFor, resolveRouteMeta } from '@/lib/headMeta';
import { SITE_CARD, siteCardUrl } from '../../../lib/edge/meta.js';

/**
 * The single client writer for route-level document metadata.
 *
 * `<title>`, `description`, `robots`, `og:*`, `twitter:*`, the canonical and
 * `og:url` are all emitted here, from the table the edge middleware and sitemap
 * already share (lib/edge/meta.js). Pages no longer declare any of them: eight
 * hand-copied sets had drifted from the edge, so a reader's DOM disagreed with the
 * bytes a crawler received, and the same keys appeared twice per document.
 *
 * It replaces <CanonicalUrl />, which owned only canonical and og:url — a third
 * writer for a pair of fields that belong with the rest of the route identity.
 * Normalisation is unchanged: the table strips trailing slashes and drops query
 * and hash, so /platform/ and /platform?utm=x canonicalise to /platform.
 *
 * `/articles/:slug` deliberately returns null here. A dispatch's title, excerpt and
 * share image come from WordPress, so ArticleDetail.jsx owns that route's head;
 * two writers on one route is the defect this component exists to remove.
 */
const RouteMeta = () => {
  const { pathname } = useLocation();
  const meta = resolveRouteMeta(pathname);

  if (!meta) return null;

  return (
    <Helmet>
      <title>{meta.title}</title>
      <meta name="description" content={meta.description} />
      <meta name="robots" content={meta.robots} />
      <meta property="og:type" content="website" />
      <meta property="og:title" content={meta.title} />
      <meta property="og:description" content={meta.description} />
      <meta property="og:url" content={ogUrlFor(meta)} />
      <meta name="twitter:title" content={meta.title} />
      <meta name="twitter:description" content={meta.description} />
      {/* The site card, declared by the client on every route it owns.
          <HeadOwnership /> deletes the shell's copy of any key the client has
          claimed, so a route that claims `og:image` and then hands the head to a
          route that does not would leave the document with no share image at all.
          Stating it here keeps ownership total, and ArticleDetail's featured image
          still supersedes it on a dispatch (its size hints go with it). */}
      <meta property="og:image" content={siteCardUrl} />
      <meta property="og:image:type" content={SITE_CARD.type} />
      <meta property="og:image:width" content={SITE_CARD.width} />
      <meta property="og:image:height" content={SITE_CARD.height} />
      <meta property="og:image:alt" content={SITE_CARD.alt} />
      <meta name="twitter:image" content={siteCardUrl} />
      <meta name="twitter:image:alt" content={SITE_CARD.alt} />
      {meta.canonical ? <link rel="canonical" href={meta.canonical} /> : null}
    </Helmet>
  );
};

export default RouteMeta;
