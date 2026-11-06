/**
 * One navigation, one `page_view` — the wiring, and the identity that made it fail.
 *
 * `useTelemetry` emitted `page_view` from an effect keyed on the identities of
 * `createTelemetryPayload` and `dispatchTelemetry`. Both were rebuilt whenever the
 * engagement score moved (`signals` is a fresh object for every scroll position
 * deeper than the last), so the effect re-ran — and each component that calls
 * `useTelemetry()` ran its own copy, so one navigation produced one page view *per
 * consumer*.
 *
 * Two things are pinned here:
 *
 *  - **the count**, which is the defect: N consumers and M engagement transitions
 *    must still produce one page view per history entry;
 *  - **the identity**, which is the cause: `trackEvent` must not change when the
 *    score does. If it does, every effect that depends on it re-runs, and the count
 *    assertion would only be catching the symptom.
 *
 * What this suite cannot see: the scroll path. jsdom reports `scrollHeight` as 0, so
 * the depth handler returns before it changes a signal. The engagement signal is
 * therefore recorded directly, which is the same state transition the scroll produces
 * — and `advanceGate` is asserted on its own in `npm run test:client` so the decision
 * does not depend on any of this.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import React, { useEffect } from 'react';
import { render, act, fireEvent, screen } from '@testing-library/react';
import { MemoryRouter, useNavigate } from 'react-router-dom';

import { useTelemetry } from '@/hooks/useTelemetry';
import { resetPageViewGate } from '@/lib/pageViewGate';
import { getEngagement, recordSignal, resetEngagementScoring } from '@/lib/engagementScoring';

const QUEUE_KEY = 'ellars_telemetry_queue';
const CONSENT_KEY = 'ellars_privacy_consent';

const queue = () => {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
  } catch {
    return [];
  }
};

const pageViews = () =>
  queue().filter((record) => record?.event_payload?.event_type === 'page_view');

const routeOf = (record) => record?.event_payload?.metadata?.current_route;

/** A consumer of the hook — the shape of every modal in `Navbar` and the dashboard. */
const Consumer = () => {
  useTelemetry();
  return null;
};

const Nav = ({ to, label }) => {
  const navigate = useNavigate();
  return <button onClick={() => navigate(to)}>{label}</button>;
};

/**
 * The real transition the score makes, through the real cell. Until Sprint 2.39 this
 * was a CustomEvent that six hook instances each listened for; it is now a direct
 * call, and the assertion that the score actually moved keeps the test non-vacuous.
 */
const signal = (type) => recordSignal(type);

/**
 * Counts how many times an effect keyed on `trackEvent` runs. With a captured
 * closure this increments on every score change, which is the root cause.
 */
const identity = { runs: 0 };

const IdentityProbe = () => {
  const { trackEvent } = useTelemetry();
  useEffect(() => {
    identity.runs += 1;
  }, [trackEvent]);
  return null;
};

const tree = (consumers) => (
  <MemoryRouter initialEntries={['/platform']}>
    {Array.from({ length: consumers }, (_, index) => (
      <Consumer key={index} />
    ))}
  </MemoryRouter>
);

beforeEach(() => {
  // The 5-second flush interval must not settle the queue underneath an assertion.
  vi.useFakeTimers();
  localStorage.clear();
  localStorage.setItem(CONSENT_KEY, 'true');
  sessionStorage.clear();
  resetPageViewGate();
  resetEngagementScoring();
  identity.runs = 0;
});

afterEach(() => {
  vi.useRealTimers();
});

describe('a page view belongs to a history entry', () => {
  it('emits one page view no matter how many components consume the hook', () => {
    render(tree(4));

    expect(pageViews()).toHaveLength(1);
    expect(routeOf(pageViews()[0])).toBe('/platform');
  });

  it('does not emit for a component that mounts after the entry was claimed', () => {
    // The real shape: three of these live inside `Navbar` and are always mounted.
    const { rerender } = render(tree(1));
    expect(pageViews()).toHaveLength(1);

    rerender(tree(4));

    expect(pageViews()).toHaveLength(1);
  });

  it('emits exactly one more on navigation, carrying the new route', () => {
    render(
      <MemoryRouter initialEntries={['/platform']}>
        <Consumer />
        <Consumer />
        <Nav to="/about" label="about" />
      </MemoryRouter>
    );
    expect(pageViews()).toHaveLength(1);

    fireEvent.click(screen.getByText('about'));

    expect(pageViews()).toHaveLength(2);
    expect(pageViews().map(routeOf)).toEqual(['/platform', '/about']);
  });

  it('emits again when the reader goes back to an entry they already saw', () => {
    render(
      <MemoryRouter initialEntries={['/platform', '/about']} initialIndex={1}>
        <Consumer />
        <Nav to={-1} label="back" />
      </MemoryRouter>
    );
    expect(pageViews().map(routeOf)).toEqual(['/about']);

    fireEvent.click(screen.getByText('back'));

    expect(pageViews().map(routeOf)).toEqual(['/about', '/platform']);
  });

  it('emits nothing at all without consent', () => {
    localStorage.removeItem(CONSENT_KEY);

    render(tree(3));

    expect(pageViews()).toHaveLength(0);
  });
});

describe('engagement state does not produce page views', () => {
  it('a score transition adds no page view', () => {
    render(tree(2));
    expect(pageViews()).toHaveLength(1);
    const before = getEngagement().score;

    // One calculator interaction: 0 → 10 points, a real score transition.
    act(() => {
      signal('calculator_interaction');
    });

    // The transition has to have happened, or this proves nothing.
    expect(getEngagement().score).toBeGreaterThan(before);
    // Before the fix this was 3: two consumers and the shared effect each re-ran.
    expect(pageViews()).toHaveLength(1);
  });

  it('six score-affecting signals add no page view', () => {
    render(tree(2));

    act(() => {
      for (let i = 0; i < 6; i += 1) signal('calculator_interaction');
    });

    expect(pageViews()).toHaveLength(1);
  });

  it('trackEvent keeps its identity across a score transition', () => {
    render(
      <MemoryRouter initialEntries={['/platform']}>
        <IdentityProbe />
      </MemoryRouter>
    );
    // One consumer and one dependency: exactly one run, or the count is meaningless.
    expect(identity.runs).toBe(1);

    const before = getEngagement().score;
    act(() => {
      signal('calculator_interaction');
    });

    expect(getEngagement().score).toBeGreaterThan(before);
    expect(identity.runs).toBe(1);
  });
});
