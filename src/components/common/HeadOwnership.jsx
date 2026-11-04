import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { reconcileHead } from '@/lib/headMeta';

/**
 * Hands head ownership from the static shell to the client, once.
 *
 * index.html declares `description`, `og:*` and `twitter:*` so a crawler that never
 * runs JavaScript gets a coherent document, and the middleware rewrites those bytes
 * per route. Those tags are not React's, so when <RouteMeta> (or ArticleDetail)
 * declares the same key, react-helmet-async appends a second tag instead of
 * replacing the first — two `description`, two `og:title`, two `og:image` per
 * document after hydration.
 *
 * This removes the shell's copy of any key the client has now written, and leaves it
 * alone when the client has not (so a document that never hydrates keeps its
 * metadata, and a route whose page does not declare a field is not left blank).
 *
 * Timing: react-helmet-async commits tags inside a requestAnimationFrame (its
 * `defer: true` default), and it schedules that frame during render — before this
 * component's effect runs. Waiting one frame puts the reconciliation after the
 * commit. Re-running on pathname change is cheap and idempotent, which is what makes
 * it safe under StrictMode's double-invoked effects.
 */
const HeadOwnership = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    let cancelled = false;
    const frame = requestAnimationFrame(() => {
      if (cancelled) return;
      reconcileHead(document.head);
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
    };
  }, [pathname]);

  return null;
};

export default HeadOwnership;
