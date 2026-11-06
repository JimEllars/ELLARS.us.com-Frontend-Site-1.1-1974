/**
 * The head, after hydration.
 *
 * These are the assertions the other two suites cannot make. `scripts/smoke-client.mjs`
 * proves the *plan* (`planHeadDedupe`) is correct; it never mounts a component, so it
 * could not see that the plan was computed once, before an article's `<Helmet>`
 * existed. `scripts/probe-production.mjs` reads the bytes the edge sends; it never
 * runs the client, so it could not see two canonicals or two `og:image` in the DOM.
 *
 * Each case below reproduces a state measured in production on 2026-11-05, with the
 * real components — `<RouteMeta>`, `<HeadOwnership>`, and the real `<ArticleDetail>`
 * with only its network call mocked — mounted in a jsdom document that starts out
 * exactly as the edge middleware leaves it.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import React from 'react';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import { Helmet, HelmetProvider } from 'react-helmet-async';
import { MemoryRouter, Routes, Route, Link } from 'react-router-dom';

import RouteMeta from '@/components/common/RouteMeta';
import HeadOwnership from '@/components/common/HeadOwnership';
import { SITE_ORIGIN, SITE_CARD } from '../../lib/edge/meta.js';

/**
 * The dispatch the mocked network returns. `<ArticleDetail>` resolves it only when
 * the test says so: a two-phase assertion needs a fetch that cannot win a race with
 * the assertion, and a sleep cannot promise that on a loaded CI runner.
 */
const gate = vi.hoisted(() => ({ open: null }));

const dispatch = {
  slug: 'a-dispatch',
  title: { rendered: 'A Dispatch' },
  excerpt: { rendered: '<p>The dispatch summary.</p>' },
  content: { rendered: '<p>Body copy.</p>' },
  date: '2026-11-04T10:00:00',
  _embedded: { 'wp:featuredmedia': [{ source_url: 'https://images.unsplash.com/dispatch.jpg' }] },
  acf: { read_time: '10 MIN READ', category_label: 'DISPATCH' },
};

vi.mock('@/lib/api', () => ({
  getPostBySlug: () => new Promise((resolve) => { gate.open = resolve; }),
  formatDate: () => 'Nov 4, 2026',
  stripHtml: (html) => String(html || '').replace(/<[^>]+>/g, ''),
  publishVaultItem: async () => ({ isError: false }),
}));

const ArticleDetail = (await import('@/components/intel/ArticleDetail')).default;

const CARD_URL = `${SITE_ORIGIN}${SITE_CARD.path}`;

/**
 * The head as the edge middleware leaves it: one document's worth of metadata,
 * injected server-side, with no `data-rh` on any of it. `HeadOwnership` exists to
 * remove the parts the client then claims.
 */
const seedShell = ({ path, title = 'Shell title | James Ellars', description = 'SHELL DESCRIPTION', image = CARD_URL, hints = true }) => {
  document.head.innerHTML = '';
  const add = (tag, attrs = {}) => {
    const element = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) element.setAttribute(k, v);
    document.head.appendChild(element);
    return element;
  };

  add('title').textContent = title;
  add('meta', { name: 'description', content: description });
  add('meta', { name: 'robots', content: 'index, follow' });
  add('meta', { property: 'og:title', content: 'Shell title' });
  add('meta', { property: 'og:description', content: description });
  add('meta', { property: 'og:url', content: `${SITE_ORIGIN}${path}` });
  add('meta', { property: 'og:image', content: image });
  add('meta', { name: 'twitter:title', content: 'Shell title' });
  add('meta', { name: 'twitter:description', content: description });
  add('meta', { name: 'twitter:image', content: image });
  if (hints) {
    add('meta', { property: 'og:image:type', content: SITE_CARD.type });
    add('meta', { property: 'og:image:width', content: SITE_CARD.width });
    add('meta', { property: 'og:image:height', content: SITE_CARD.height });
    add('meta', { property: 'og:image:alt', content: SITE_CARD.alt });
  }
  // The edge writes a canonical for crawlers that never run JavaScript; the client
  // writes its own once it takes over the head.
  add('link', { rel: 'canonical', href: `${SITE_ORIGIN}${path}` });
};

const canonicals = () =>
  [...document.querySelectorAll('link[rel="canonical"]')].map((el) => ({
    href: el.getAttribute('href'),
    owned: el.hasAttribute('data-rh'),
  }));
const metas = (attribute, key) => [...document.querySelectorAll(`meta[${attribute}="${key}"]`)];
const contents = (attribute, key) => metas(attribute, key).map((m) => m.getAttribute('content'));
const hintCount = () => document.querySelectorAll('meta[property^="og:image:"]').length;

/** The app shell, without the router or the network: metadata + the reconciler. */
const Shell = ({ children }) => (
  <HelmetProvider>
    <RouteMeta />
    <HeadOwnership />
    {children}
  </HelmetProvider>
);

const withRouter = (ui, { route = '/' } = {}) => (
  <MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>
);

const Blank = () => null;

beforeEach(() => {
  document.head.innerHTML = '';
  document.title = '';
});

describe('canonical ownership', () => {
  it('replaces the edge canonical on the entry route instead of adding a second', async () => {
    // Measured before 2.26: load / -> two identical canonicals.
    seedShell({ path: '/' });
    render(withRouter(<Shell><Routes><Route path="/" element={<Blank />} /></Routes></Shell>));

    // Waiting for "one canonical" would be satisfied by the shell's tag alone, and
    // the assertion would race Helmet's frame. Wait for the client's answer.
    await waitFor(() => expect(canonicals()).toEqual([{ href: `${SITE_ORIGIN}/`, owned: true }]));
  });

  it('moves the canonical to the new route on a client-side navigation', async () => {
    // Measured before 2.26: home -> /news-media -> "/" AND "/news-media".
    seedShell({ path: '/' });
    render(
      withRouter(
        <Shell>
          <Routes>
            <Route path="/" element={<Link to="/news-media">Archive</Link>} />
            <Route path="/news-media" element={<Blank />} />
          </Routes>
        </Shell>
      )
    );
    await waitFor(() => expect(canonicals()).toEqual([{ href: `${SITE_ORIGIN}/`, owned: true }]));

    fireEvent.click(screen.getByText('Archive'));

    await waitFor(() => expect(canonicals()).toEqual([{ href: `${SITE_ORIGIN}/news-media`, owned: true }]));
  });

  it('declares the site card itself on a route it owns', async () => {
    // <HeadOwnership> deletes the shell's copy of every key the client claims, and
    // deleting is permanent: a client that claimed `og:image` on one route and not
    // the next left the document with none at all. Measured 2026-11-05: after a
    // dispatch -> /about there was no og:image in the document.
    seedShell({ path: '/' });
    render(withRouter(<Shell><Routes><Route path="/" element={<Blank />} /></Routes></Shell>));

    // Owned, not merely present: on a first load the shell's card would satisfy a
    // "the card is there" assertion, and that is exactly the trap — the card has to
    // be the *client's* so that a route which supersedes it can hand it back.
    await waitFor(() => expect(contents('property', 'og:image')).toEqual([CARD_URL]));
    await waitFor(() => expect(metas('property', 'og:image')[0].hasAttribute('data-rh')).toBe(true));
    expect(metas('property', 'og:image:width')[0].hasAttribute('data-rh')).toBe(true);
    expect(metas('name', 'twitter:image')[0].hasAttribute('data-rh')).toBe(true);
    expect(hintCount()).toBe(4);
  });

  it('keeps the edge canonical when the route declares none of its own', async () => {
    // The fallback a document without JavaScript depends on: nothing competes, so
    // nothing is removed. (The render below has no <RouteMeta> writer for the URL.)
    seedShell({ path: '/articles/edge-only' });
    render(withRouter(<HelmetProvider><HeadOwnership /><Blank /></HelmetProvider>, { route: '/articles/edge-only' }));

    await waitFor(() => expect(canonicals()).toEqual([{ href: `${SITE_ORIGIN}/articles/edge-only`, owned: false }]));
    expect(metas('name', 'description')).toHaveLength(1);
  });
});

describe('a head written after the fetch resolves', () => {
  /**
   * The shape of `<ArticleDetail>`: a `<Helmet>` that exists only once the data has
   * arrived. A component like this is why a one-shot reconciliation is the wrong
   * instrument — it ran, found nothing to reconcile, and never ran again.
   */
  const LateHelmet = () => {
    const [post, setPost] = React.useState(null);
    React.useEffect(() => {
      let alive = true;
      const timer = setTimeout(() => {
        if (alive) setPost({ title: 'A Dispatch', excerpt: 'The dispatch summary.', image: 'https://images.unsplash.com/featured.jpg' });
      }, 20);
      return () => {
        alive = false;
        clearTimeout(timer);
      };
    }, []);

    if (!post) return <div>loading</div>;

    return (
      <React.Fragment>
        <Helmet>
          <title>{post.title}</title>
          <meta name="description" content={post.excerpt} />
          <meta property="og:image" content={post.image} />
        </Helmet>
        <div>{post.title}</div>
      </React.Fragment>
    );
  };

  it('supersedes shell metadata that arrived after mount, not just what existed at mount', async () => {
    seedShell({ path: '/articles/a-dispatch' });
    render(
      withRouter(
        <Shell>
          <Routes><Route path="/articles/:slug" element={<LateHelmet />} /></Routes>
        </Shell>,
        { route: '/articles/a-dispatch' }
      )
    );

    // The late write is the trigger: one description, one og:image, one robots.
    await waitFor(() => expect(screen.getByText('A Dispatch')).toBeTruthy());
    await waitFor(() => expect(contents('name', 'description')).toEqual(['The dispatch summary.']));
    expect(contents('property', 'og:image')).toEqual(['https://images.unsplash.com/featured.jpg']);
    expect(metas('name', 'robots')).toHaveLength(1);
    // The card's size hints describe an image that is no longer declared.
    expect(hintCount()).toBe(0);
    expect(document.querySelectorAll('title')).toHaveLength(1);
  });
});

describe('ArticleDetail', () => {
  const renderDispatch = (route = '/articles/a-dispatch') => {
    seedShell({ path: route });
    return render(
      withRouter(
        <Shell>
          <Routes><Route path="/articles/:slug" element={<ArticleDetail />} /></Routes>
        </Shell>,
        { route }
      )
    );
  };

  beforeEach(() => {
    gate.open = null;
  });

  it('canonicalises to its own URL while loading, before the fetch resolves', async () => {
    // Measured before 2.26: a dispatch reached from the archive carried "/" and
    // nothing else, i.e. it told a search engine it duplicates the homepage.
    renderDispatch();

    expect(screen.getByText('DECRYPTING TRANSMISSION...')).toBeTruthy();
    await waitFor(() =>
      expect(canonicals()).toEqual([{ href: `${SITE_ORIGIN}/articles/a-dispatch`, owned: true }])
    );
    expect(contents('property', 'og:url')).toEqual([`${SITE_ORIGIN}/articles/a-dispatch`]);
  });

  it('keeps one of each after the dispatch lands, and uses its own image', async () => {
    renderDispatch();
    await waitFor(() => expect(gate.open).toBeTypeOf('function'));

    await act(async () => {
      gate.open?.(dispatch);
    });

    await waitFor(() => expect(screen.getByText('A Dispatch')).toBeTruthy());
    await waitFor(() => expect(contents('property', 'og:image')).toEqual(['https://images.unsplash.com/dispatch.jpg']));

    expect(canonicals()).toEqual([{ href: `${SITE_ORIGIN}/articles/a-dispatch`, owned: true }]);
    expect(metas('name', 'description')).toHaveLength(1);
    expect(contents('name', 'robots')).toEqual(['index, follow']);
    expect(hintCount()).toBe(0);
    expect(document.querySelectorAll('title')).toHaveLength(1);
  });
});

describe('navigating away from a dispatch', () => {
  it('restores the site card and its size hints on the route it lands on', async () => {
    gate.open = null;
    seedShell({ path: '/articles/a-dispatch' });
    // One app, one router: the nav link lives outside <Routes> so it survives the
    // route change it causes, which is the only navigation being tested.
    render(
      withRouter(
        <Shell>
          <Link to="/about">To about</Link>
          <Routes>
            <Route path="/articles/:slug" element={<ArticleDetail />} />
            <Route path="/about" element={<Blank />} />
          </Routes>
        </Shell>,
        { route: '/articles/a-dispatch' }
      )
    );

    await waitFor(() => expect(gate.open).toBeTypeOf('function'));
    await act(async () => { gate.open?.(dispatch); });
    await waitFor(() => expect(contents('property', 'og:image')).toEqual(['https://images.unsplash.com/dispatch.jpg']));
    // The dispatch's image superseded the card, and its hints went with it.
    expect(hintCount()).toBe(0);

    fireEvent.click(screen.getByText('To about'));

    // The dispatch's featured image is gone; the card must come back, hints and all.
    await waitFor(() => expect(contents('property', 'og:image')).toEqual([CARD_URL]));
    expect(hintCount()).toBe(4);
    expect(canonicals()).toEqual([{ href: `${SITE_ORIGIN}/about`, owned: true }]);
    expect(contents('name', 'description')).toHaveLength(1);
  });
});
