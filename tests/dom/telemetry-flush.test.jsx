/**
 * The wiring, not just the decision.
 *
 * `telemetry-queue.test.jsx` proves the settlements are right; this file proves
 * `useTelemetry` calls them. Without it the pure module could be perfect while the
 * hook still wrote `[]` over a queue that had grown during the request — which is
 * exactly the defect being fixed, and exactly the kind that a unit test of the
 * helper would happily miss.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import React from 'react';
import { render, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import { useTelemetry } from '@/hooks/useTelemetry';

const QUEUE_KEY = 'ellars_telemetry_queue';
const CONSENT_KEY = 'ellars_privacy_consent';

const record = (id) => ({
  telemetry_envelope: { idempotency_key: id, project_id: 'ELLARS_FRONTEND' },
  event_payload: { event_type: 'page_view', severity: 'LOW', metadata: {} },
  timestamp: Date.now(),
});

const queue = () => JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
const seed = (records) => localStorage.setItem(QUEUE_KEY, JSON.stringify(records));
const sentBodies = () => globalThis.fetch.mock.calls.map(([, options]) => JSON.parse(options.body));

/**
 * The hook dispatches a real `page_view` on mount, so the queue is never only the
 * fixture. Assertions are made about the fixture's own keys, never about the total.
 */
const MINE = /^(a|b|c|d|k\d+)$/;
const keys = (records) => records.map((r) => r.telemetry_envelope.idempotency_key);
const mine = (records) => keys(records).filter((key) => MINE.test(key));

const Harness = () => {
  useTelemetry();
  return null;
};

const mount = () => render(<MemoryRouter><Harness /></MemoryRouter>);

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem(CONSENT_KEY, 'true');
  sessionStorage.clear();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('a flush settles against the queue as it is, not as it was', () => {
  it('keeps records that arrive while the request is still open', async () => {
    let release;
    globalThis.fetch = vi.fn(
      () => new Promise((resolve) => { release = resolve; })
    );

    seed([record('a'), record('b')]);
    mount(); // mounting flushes immediately when online

    await act(async () => { await Promise.resolve(); });
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    expect(keys(sentBodies()[0])).toEqual(expect.arrayContaining(['a', 'b']));

    // A new event lands while the POST is in flight — a page view, an API failure.
    seed([record('a'), record('b'), record('c')]);

    await act(async () => {
      release({ status: 202, ok: true });
      await Promise.resolve();
    });

    // The old code cleared the whole queue here and lost 'c'. It was never sent.
    expect(mine(queue())).toEqual(['c']);
  });

  it('leaves the queue intact when the request never got an answer', async () => {
    globalThis.fetch = vi.fn(async () => {
      throw new TypeError('Failed to fetch');
    });

    seed([record('a')]);
    mount();

    await act(async () => { await Promise.resolve(); });

    expect(mine(queue())).toEqual(['a']);
  });
});

describe('a batch the edge refuses is not resent for the life of the profile', () => {
  it('shrinks the batch after a 413 instead of repeating it forever', async () => {
    vi.useFakeTimers();
    globalThis.fetch = vi.fn(async () => ({ status: 413, ok: false }));

    seed([record('a'), record('b'), record('c'), record('d')]);
    mount();

    await act(async () => { await vi.advanceTimersByTimeAsync(50); });

    // The older half of the batch was dropped, the newer records survive — where the
    // old code would have resent the identical body every five seconds, forever.
    expect(mine(queue())).not.toContain('a');
    expect(mine(queue())).toContain('d');

    await act(async () => { await vi.advanceTimersByTimeAsync(3000); });

    const attempted = sentBodies();
    expect(attempted.length).toBeGreaterThanOrEqual(2);
    expect(attempted[1].length).toBeLessThan(attempted[0].length);
  });

  it('does not retry a 400 three times with the same body', async () => {
    globalThis.fetch = vi.fn(async () => ({ status: 400, ok: false }));

    seed([record('a')]);
    mount();

    await act(async () => { await Promise.resolve(); });

    // A definitive rejection settles the batch once; resending cannot change it.
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    expect(mine(queue())).toEqual([]);
  });
});

describe('unload', () => {
  const beacon = (accepted) =>
    Object.defineProperty(navigator, 'sendBeacon', {
      value: () => accepted,
      configurable: true,
    });

  it('keeps the queue when the platform refuses the beacon', async () => {
    globalThis.fetch = vi.fn(async () => ({ status: 202, ok: true }));
    mount();
    await act(async () => { await Promise.resolve(); });

    seed([record('a')]);
    beacon(false);
    const before = globalThis.fetch.mock.calls.length;
    await act(async () => { window.dispatchEvent(new Event('pagehide')); });

    // `sendBeacon` returns false over its own 64 KiB limit, and the old code cleared
    // the queue anyway — so a large queue was discarded on unload, never delivered.
    expect(mine(queue())).toEqual(['a']);
    // A keepalive fetch is the only remaining transport, and its outcome cannot be
    // observed, so the queue is kept rather than assumed sent.
    const after = globalThis.fetch.mock.calls;
    expect(after.length).toBe(before + 1);
    expect(after.at(-1)[1].keepalive).toBe(true);
  });

  it('removes exactly what an accepted beacon carried', async () => {
    globalThis.fetch = vi.fn(async () => ({ status: 202, ok: true }));
    mount();
    await act(async () => { await Promise.resolve(); });

    seed([record('a'), record('b')]);
    beacon(true);
    await act(async () => { window.dispatchEvent(new Event('pagehide')); });

    expect(mine(queue())).toEqual([]);
  });
});

describe('the queue is bounded before it is sent', () => {
  it('never posts a body larger than the edge accepts', async () => {
    globalThis.fetch = vi.fn(async () => ({ status: 202, ok: true }));

    const big = (id) => ({
      ...record(id),
      event_payload: { event_type: 'page_view', severity: 'LOW', metadata: { pad: 'x'.repeat(20_000) } },
    });
    seed(Array.from({ length: 8 }, (_, i) => big(`k${i}`)));

    mount();
    await act(async () => { await Promise.resolve(); });

    const bodies = sentBodies();
    expect(bodies.length).toBeGreaterThan(0);
    for (const body of bodies) {
      expect(new TextEncoder().encode(JSON.stringify(body)).length).toBeLessThan(64 * 1024);
      expect(body.length).toBeLessThanOrEqual(50);
    }
    // What did not fit is still queued for the next tick, not discarded.
    expect(mine(queue()).length).toBeGreaterThan(0);
  });
});
