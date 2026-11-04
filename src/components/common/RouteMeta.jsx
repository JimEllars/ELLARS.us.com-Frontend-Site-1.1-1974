import { Helmet } from 'react-helmet-async';
import { useLocation } from 'react-router-dom';
import { ogUrlFor, resolveRouteMeta } from '@/lib/headMeta';

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
      {meta.canonical ? <link rel="canonical" href={meta.canonical} /> : null}
    </Helmet>
  );
};

export default RouteMeta;
