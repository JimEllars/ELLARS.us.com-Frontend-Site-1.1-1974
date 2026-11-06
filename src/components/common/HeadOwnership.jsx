import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { reconcileHead } from '@/lib/headMeta';

/**
 * Hands head ownership from the static shell to the client, and keeps it.
 *
 * index.html declares `description`, `og:*` and `twitter:*` so a crawler that never
 * runs JavaScript gets a coherent document, and the middleware rewrites those bytes
 * per route. The middleware also injects a per-route `<link rel="canonical">`.
 * Those tags are not React's, so when <RouteMeta> (or ArticleDetail) declares the
 * same key, react-helmet-async appends a second tag instead of replacing the first.
 *
 * ## Why this observes the head instead of reconciling once
 *
 * The first version ran a single pass, one frame after the pathname changed, on the
 * assumption that Helmet's tags were always committed by then. They are — for
 * routes whose metadata is a constant. They are **not** for `/articles/:slug`,
 * because that component renders `<Helmet>` only after its WordPress fetch
 * resolves, which is hundreds of milliseconds after the frame. Measured on a
 * direct load of a live dispatch, 2026-11-05:
 *
 *     og:image      → the site card AND the dispatch's featured image
 *     description   → two
 *     robots        → two
 *     og:image:width/height → 1200/630, describing the card, sitting next to the
 *                     dispatch's image
 *
 * A one-shot snapshot is the wrong shape for a document whose head is written
 * asynchronously. This observes `document.head` and reconciles on the next frame
 * after anything is added, which covers the data-driven route, a late `og:image`,
 * and any future component that writes head tags after mount.
 *
 * Terminating: `reconcileHead` is idempotent, so the pass that follows our own
 * removals plans nothing and the observer settles. Passes are coalesced onto one
 * animation frame, so a hydration that inserts twelve tags costs one pass, not
 * twelve.
 */
const HeadOwnership = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    let cancelled = false;
    let frame = 0;

    const schedule = () => {
      if (cancelled || frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        if (!cancelled) reconcileHead(document.head);
      });
    };

    // The pass for this render's own tags. Helmet schedules its frame during
    // render, before this effect, so its tags land first.
    schedule();

    // One observe() call, not two. A second call on the same target *replaces* that
    // target's options rather than merging them, so observing `childList` and then
    // observing attributes silently stopped watching for insertions — which is the
    // only kind of mutation this component exists to catch. Measured: with two
    // calls, a direct load of a dispatch kept the shell's `description`, `robots`
    // and `og:image` beside the article's own.
    //
    // Attributes matter too: Helmet updates an existing tag in place when only its
    // content changes (the article's `og:image` on a second fetch, for instance).
    const observer = new MutationObserver(schedule);
    observer.observe(document.head, {
      childList: true,
      attributes: true,
      attributeFilter: ['content', 'href'],
    });

    return () => {
      cancelled = true;
      observer.disconnect();
      if (frame) cancelAnimationFrame(frame);
    };
  }, [pathname]);

  return null;
};

export default HeadOwnership;
