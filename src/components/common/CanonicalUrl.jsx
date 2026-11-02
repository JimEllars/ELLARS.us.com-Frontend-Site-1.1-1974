import { Helmet } from 'react-helmet-async';
import { useLocation } from 'react-router-dom';

export const SITE_ORIGIN = 'https://ellars.us.com';

/**
 * Canonical and og:url for the current route.
 *
 * index.html used to carry a single static <link rel="canonical"
 * href="https://ellars.us.com"> on every URL, which tells a crawler that
 * /platform, /about and every dispatch are duplicates of the homepage. That
 * suppresses indexing for the whole site, so it is emitted per route instead.
 *
 * Route handlers keep ownership of their own title and description; this
 * component only owns the two fields that must never be page-local.
 *
 * Normalisation: trailing slashes are stripped and query strings/fragments are
 * dropped, so /platform/ and /platform?utm=x both canonicalise to /platform
 * rather than manufacturing duplicate URLs.
 */
const CanonicalUrl = () => {
  const { pathname } = useLocation();
  const normalised = pathname.replace(/\/+$/, '');
  const canonical = `${SITE_ORIGIN}${normalised || '/'}`;

  return (
    <Helmet>
      <link rel="canonical" href={canonical} />
      <meta property="og:url" content={canonical} />
    </Helmet>
  );
};

export default CanonicalUrl;
