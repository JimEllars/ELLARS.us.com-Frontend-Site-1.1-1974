/**
 * One scorer for the document.
 *
 * The defect this pins was measured before it was fixed, with six consumers mounted —
 * the real count in `Navbar` (search, donate, newsletter) plus the calculator, the
 * playlist and the dashboard's status panel:
 *
 *     scroll listeners        6      → 1
 *     signal listeners        6      → 0 (the CustomEvent hop is gone)
 *     sessionStorage writes   12     → 1 per explicit signal
 *     re-renders per signal   6      → 0
 *
 * The cost was the smaller half. Each copy incremented **its own** counters and wrote
 * the whole object to the same key, so the copies diverged and overwrote each other;
 * and the 60 s timer added the full elapsed time per instance, so six instances
 * reached the three-minute band in thirty seconds. Both are asserted below, because
 * a suite that only counted listeners would let the score stay wrong.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import React from 'react';
import { render, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import { useTelemetry } from '@/hooks/useTelemetry';
import {
  EMPTY_SIGNALS,
  PERSIST_MIN_INTERVAL_MS,
  SESSION_KEY,
  computeScore,
  getEngagement,
  readStoredSignals,
  recordScrollDepth,
  recordSignal,
  resetEngagementScoring,
  signalForEvent,
  startEngagementTracking,
  tierFor,
} from '@/lib/engagementScoring';

const renders = { count: 0 };
const scores = [];

const Consumer = () => {
  const { trackEvent } = useTelemetry();
  renders.count += 1;
  scores.push(getEngagement().score);
  return <button onClick={() => trackEvent('probe', {})}>{renders.count}</button>;
};

const stored = () => {
  try {
    return JSON.parse(sessionStorage.getItem(SESSION_KEY) || 'null');
  } catch {
    return null;
  }
};

const writeCount = (spy) => spy.mock.calls.filter(([key]) => key === SESSION_KEY).length;

beforeEach(() => {
  vi.useFakeTimers();
  sessionStorage.clear();
  localStorage.clear();
  localStorage.setItem('ellars_privacy_consent', 'false'); // keep the flush quiet
  resetEngagementScoring();
  renders.count = 0;
  scores.length = 0;
});

afterEach(() => {
  vi.useRealTimers();
});

describe('the scorer is one per document', () => {
  it('registers one scroll listener no matter how often it is started', () => {
    const addSpy = vi.spyOn(window, 'addEventListener');

    startEngagementTracking();
    startEngagementTracking();
    startEngagementTracking();

    expect(addSpy.mock.calls.filter(([type]) => type === 'scroll')).toHaveLength(1);
  });

  it('has no per-consumer listeners left', () => {
    const addSpy = vi.spyOn(window, 'addEventListener');

    render(
      <MemoryRouter>
        {[0, 1, 2, 3, 4, 5].map((i) => <Consumer key={i} />)}
      </MemoryRouter>
    );

    expect(addSpy.mock.calls.filter(([type]) => type === 'scroll')).toHaveLength(0);
    expect(addSpy.mock.calls.filter(([type]) => type === 'ellars_engagement_signal')).toHaveLength(0);
  });

  it('writes once per explicit signal, not once per consumer', () => {
    render(
      <MemoryRouter>
        {[0, 1, 2, 3, 4, 5].map((i) => <Consumer key={i} />)}
      </MemoryRouter>
    );

    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');
    recordSignal('calculator_interaction');

    expect(writeCount(setItemSpy)).toBe(1);
    expect(readStoredSignals().calculatorInteractions).toBe(1);
  });

  it('does not re-render a consumer when engagement moves', () => {
    render(
      <MemoryRouter>
        {[0, 1, 2, 3, 4, 5].map((i) => <Consumer key={i} />)}
      </MemoryRouter>
    );
    const atMount = renders.count;

    act(() => {
      recordSignal('calculator_interaction');
      recordSignal('newsletter_submission');
    });

    expect(renders.count).toBe(atMount);
  });
});

describe('the score is one number, and the clock does not multiply', () => {
  it('six consumers do not turn one minute into six', () => {
    render(
      <MemoryRouter>
        {[0, 1, 2, 3, 4, 5].map((i) => <Consumer key={i} />)}
      </MemoryRouter>
    );

    act(() => {
      vi.advanceTimersByTime(61 * 1000);
    });

    const { score, signals } = getEngagement();
    // 61 s is the first band (10 points). Per-instance accumulation reached the
    // three-minute band (20) in thirty seconds.
    expect(signals.timeOnPageMs).toBeGreaterThanOrEqual(61 * 1000);
    expect(signals.timeOnPageMs).toBeLessThan(6 * 61 * 1000);
    expect(score).toBe(10);
  });

  it('every payload carries the same score, whichever consumer built it', () => {
    vi.useRealTimers();
    localStorage.setItem('ellars_privacy_consent', 'true');
    render(
      <MemoryRouter>
        <Consumer />
        <Consumer />
      </MemoryRouter>
    );

    act(() => {
      recordSignal('newsletter_submission'); // 25 points
    });

    const buttons = document.querySelectorAll('button');
    act(() => {
      buttons[0].click();
      buttons[1].click();
    });

    const queue = JSON.parse(localStorage.getItem('ellars_telemetry_queue') || '[]');
    const fromProbes = queue
      .filter((r) => r.event_payload.event_type === 'probe')
      .map((r) => r.event_payload.metadata.lead_score_payload);

    expect(fromProbes).toHaveLength(2);
    expect(fromProbes[0].score).toBe(fromProbes[1].score);
    expect(fromProbes[0].score).toBeGreaterThan(0);
  });
});

describe('a scroll writes at most once a second, and keeps the real depth', () => {
  it('throttles the write without losing the peak', () => {
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');
    const now = 10_000;

    expect(recordScrollDepth(10, now)).toBe(true);

    // Ten more positions inside the window: no writes.
    for (let depth = 20; depth <= 100; depth += 10) {
      expect(recordScrollDepth(depth, now + 100)).toBe(false);
    }
    expect(writeCount(setItemSpy)).toBe(1);

    // The in-memory peak is exact — the payload reports 100, not 10.
    expect(getEngagement().signals.maxScrollDepth).toBe(100);

    // The window has passed but the depth has not grown: still no write.
    expect(recordScrollDepth(100, now + PERSIST_MIN_INTERVAL_MS + 1)).toBe(false);
    expect(writeCount(setItemSpy)).toBe(1);
  });

  it('writes the exact depth once the window has passed and the depth grew', () => {
    const now = 10_000;
    recordScrollDepth(60, now);
    expect(recordScrollDepth(90, now + PERSIST_MIN_INTERVAL_MS + 1)).toBe(true);
    expect(stored().maxScrollDepth).toBe(90);
  });

  it('never lets the depth exceed 100 or go negative', () => {
    recordScrollDepth(400, 1_000);
    expect(getEngagement().signals.maxScrollDepth).toBe(100);

    resetEngagementScoring();
    recordScrollDepth(-20, 1_000);
    expect(getEngagement().signals.maxScrollDepth).toBe(0);
  });

  it('reads the real depth from the listener and flushes on pagehide', () => {
    Object.defineProperty(document.documentElement, 'scrollHeight', { value: 2000, configurable: true });
    Object.defineProperty(window, 'innerHeight', { value: 1000, configurable: true });
    Object.defineProperty(window, 'scrollY', { value: 800, configurable: true });

    startEngagementTracking();
    act(() => {
      window.dispatchEvent(new Event('scroll'));
    });

    // 800 + 1000 of 2000 → 90 %.
    expect(getEngagement().signals.maxScrollDepth).toBe(90);

    act(() => {
      window.dispatchEvent(new Event('pagehide'));
    });
    expect(stored().maxScrollDepth).toBe(90);

    startEngagementTracking()(); // teardown so the next test starts clean
  });
});

describe('a killed tab keeps its visit', () => {
  it('continues from the stored counters after a reload', async () => {
    recordSignal('newsletter_submission');
    recordScrollDepth(85, 1_000);
    const before = getEngagement();

    // A reload: a new module instance reading the same sessionStorage.
    resetEngagementScoring();
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({ ...before.signals, timeOnPageMs: 0 }));
    vi.resetModules();
    const fresh = await import('@/lib/engagementScoring');

    expect(fresh.getEngagement().signals.maxScrollDepth).toBe(85);
    expect(fresh.getEngagement().signals.newsletterSubmissions).toBe(1);
    expect(fresh.getEngagement().score).toBe(before.score);
  });

  it('refuses garbage in storage rather than scoring NaN', () => {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({ maxScrollDepth: 'deep', calculatorInteractions: -3 }));
    const signals = readStoredSignals();
    expect(signals).toEqual(EMPTY_SIGNALS);

    sessionStorage.setItem(SESSION_KEY, 'not json');
    expect(readStoredSignals()).toEqual(EMPTY_SIGNALS);
  });
});

describe('the event mapping is carried over exactly', () => {
  it('keeps the /platform clause and the order it had', () => {
    // The quirk, preserved deliberately: any non-calculator event on /platform scores.
    expect(signalForEvent('page_view', '/platform')).toBe('platform_click');
    expect(signalForEvent('page_view', '/about')).toBe(null);
    // Order: calculator first, so it is not swallowed by the /platform clause.
    expect(signalForEvent('calculator_update', '/platform')).toBe('calculator_interaction');
    expect(signalForEvent('newsletter_success', '/platform')).toBe('platform_click');
    expect(signalForEvent('newsletter_success', '/about')).toBe('newsletter_submission');
  });

  it('scores the bands the arithmetic always did', () => {
    expect(computeScore({ ...EMPTY_SIGNALS })).toBe(0);
    expect(computeScore({ ...EMPTY_SIGNALS, timeOnPageMs: 61_000 })).toBe(10);
    expect(computeScore({ ...EMPTY_SIGNALS, timeOnPageMs: 181_000 })).toBe(20);
    expect(computeScore({ ...EMPTY_SIGNALS, maxScrollDepth: 50 })).toBe(10);
    expect(computeScore({ ...EMPTY_SIGNALS, maxScrollDepth: 80 })).toBe(20);
    expect(computeScore({ ...EMPTY_SIGNALS, newsletterSubmissions: 9 })).toBe(25);
    // The counter caps are per-counter, and the total is capped at 100.
    expect(computeScore({ ...EMPTY_SIGNALS, calculatorInteractions: 99 })).toBe(20);
    expect(
      computeScore({ ...EMPTY_SIGNALS, timeOnPageMs: 200_000, maxScrollDepth: 95, calculatorInteractions: 9, platformExplorations: 9, articleCompletions: 9, newsletterActivations: 9, newsletterSubmissions: 9 })
    ).toBe(100);
  });

  it('maps the score to the three tiers', () => {
    expect(tierFor(0)).toBe('OBSERVER_COLD');
    expect(tierFor(29)).toBe('OBSERVER_COLD');
    expect(tierFor(30)).toBe('CIVIC_WARM');
    expect(tierFor(69)).toBe('CIVIC_WARM');
    expect(tierFor(70)).toBe('STRATEGIC_HOT');
    expect(tierFor(100)).toBe('STRATEGIC_HOT');
  });
});
