/**
 * The search overlay, end to end: what actually leaves the component.
 *
 * `searchTelemetry.js` is asserted on its own in `test:client`, which proves the
 * payload's *shape*. This suite proves the component uses it — and that the shape
 * holds through the two states that make the numbers meaningful:
 *
 *  - **the corpus has not arrived yet.** A `result_count: 0` measured mid-flight
 *    would be filed as a content gap that does not exist, so nothing may be recorded
 *    until the archive has settled (one way or the other);
 *  - **the corpus arrives after the term was typed**, which is the common case on a
 *    cold load. The search must be recorded exactly once, with the settled count.
 *
 * The assertion that matters most is the negative one: no part of what was typed
 * appears anywhere in the payload. Version 3 of the privacy policy disclosed that it
 * did; Sprint 2.38 removed it.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import React from 'react';
import { render, act, fireEvent, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const { trackEvent } = vi.hoisted(() => ({ trackEvent: vi.fn() }));

vi.mock('@/hooks/useTelemetry', () => ({
  useTelemetry: () => ({ trackEvent }),
}));

vi.mock('@/lib/api', () => ({
  getLatestPosts: vi.fn(async () => []),
  // `SearchOverlay` matches on the rendered text, so the mock has to strip tags the
  // way the real helper does — the match counts below depend on it.
  stripHtml: (html) => String(html ?? '').replace(/<[^>]+>/g, ''),
}));

import { getLatestPosts } from '@/lib/api';
import { useAppStore } from '@/store/useAppStore';
import SearchOverlay from '@/components/common/SearchOverlay';

const CORPUS = [
  {
    id: 1,
    slug: 'a-count-that-brings-neighbors',
    title: { rendered: 'A Count That Brings Neighbors' },
    excerpt: { rendered: 'What the census missed in our county.' },
  },
  {
    id: 2,
    slug: 'the-siphon-economy',
    title: { rendered: 'The Siphon Economy' },
    excerpt: { rendered: 'Where the money actually goes.' },
  },
];

const searchEvents = () =>
  trackEvent.mock.calls
    .filter(([name]) => name === 'search_execution')
    .map(([, payload]) => payload);

const input = () => screen.getByLabelText('Search operational archives');

const type = async (value) => {
  fireEvent.change(input(), { target: { value } });
  await act(async () => {
    vi.advanceTimersByTime(400); // past the 300 ms debounce
  });
};

const mount = async () => {
  const view = render(
    <MemoryRouter>
      <SearchOverlay isOpen onClose={() => {}} />
    </MemoryRouter>
  );
  // Let the corpus fetch settle before the test drives the box.
  await act(async () => {});
  return view;
};

beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
  useAppStore.setState({ articles: [] });
  vi.mocked(getLatestPosts).mockResolvedValue(CORPUS);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('a search reports its shape, never its text', () => {
  it('records length, word count and result count, and nothing that was typed', async () => {
    await mount();

    await type('siphon economy');

    const events = searchEvents();
    expect(events).toHaveLength(1);
    // 14 characters, 2 words, 1 of the 2 entries matched.
    expect(events[0]).toEqual({
      term_length: 14,
      term_words: 2,
      result_count: 1,
      corpus_loaded: true,
    });
    expect(JSON.stringify(events[0])).not.toContain('siphon');
  });

  it('still reports a miss — the case the data exists for', async () => {
    await mount();

    await type('county broadband');

    expect(searchEvents()[0]).toMatchObject({ result_count: 0, corpus_loaded: true });
  });

  it('records nothing for an empty box', async () => {
    await mount();

    await type('   ');

    expect(searchEvents()).toHaveLength(0);
  });
});

describe('the corpus has to settle before a zero means anything', () => {
  it('records nothing while the archive is still in flight', async () => {
    let release;
    vi.mocked(getLatestPosts).mockImplementationOnce(
      () => new Promise((resolve) => { release = resolve; })
    );

    render(
      <MemoryRouter>
        <SearchOverlay isOpen onClose={() => {}} />
      </MemoryRouter>
    );

    await type('siphon');
    expect(searchEvents()).toHaveLength(0);

    // The archive arrives after the term was typed: now, and only now, it is filed.
    await act(async () => {
      release(CORPUS);
    });

    const events = searchEvents();
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ result_count: 1, corpus_loaded: true });
    expect(JSON.stringify(events[0])).not.toContain('siphon');
  });

  it('does not file the same search twice when the memo recomputes', async () => {
    await mount();
    await type('siphon');

    // More archive arrives (another surface calling `setArticles`), same term.
    await act(async () => {
      useAppStore.setState({ articles: [...CORPUS, { ...CORPUS[0], id: 3, slug: 'third' }] });
    });

    expect(searchEvents()).toHaveLength(1);
  });

  it('marks a failed archive as not loaded, rather than as a gap', async () => {
    vi.mocked(getLatestPosts).mockRejectedValueOnce(new Error('wordpress down'));
    const quiet = vi.spyOn(console, 'error').mockImplementation(() => {});

    await mount();
    await type('siphon');

    expect(searchEvents()[0]).toEqual({
      term_length: 6,
      term_words: 1,
      result_count: 0,
      corpus_loaded: false,
    });

    quiet.mockRestore();
  });
});
