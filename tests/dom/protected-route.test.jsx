/**
 * `/dashboard` is one of the four surfaces the guardrails say no change may break.
 *
 * It has never had a test. The logic that decides whether a visitor sees it is the
 * most consequential branch on the site — a false "logged out" throws away a working
 * session, and a false "logged in" shows a member dashboard to nobody — and it has
 * already been wrong once: Sprint 2.6 found that `verifySession` collapsed a timeout
 * into an authoritative guest state, so a slow network logged the user out.
 *
 * These cases pin that distinction (hard guest vs transient) and the offline path
 * that depends on it, in the order a cold visit actually takes them.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import { MemoryRouter, Routes, Route, Link } from 'react-router-dom';

import { useAppStore } from '@/store/useAppStore';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { verifySession } from '@/lib/api';

vi.mock('@/hooks/useNetworkStatus', () => ({ useNetworkStatus: vi.fn(() => true) }));
vi.mock('@/lib/api', () => ({ verifySession: vi.fn() }));

const ProtectedRoute = (await import('@/components/common/ProtectedRoute')).default;

const Dashboard = () => <div>MEMBER DASHBOARD</div>;
const Login = () => <div>ACCESS GATEWAY</div>;

const renderDashboard = () =>
  render(
    <MemoryRouter initialEntries={['/dashboard']}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<Dashboard />} />
        </Route>
      </Routes>
    </MemoryRouter>
  );

/** A hydrated store with a persisted token, which is the state a returning member is in. */
const signedIn = () => {
  useAppStore.setState({
    userToken: 'persisted-token',
    isAuthenticated: true,
    _hasHydrated: true,
    isHydrating: false,
    isInitialized: true,
  });
};

const guest = (overrides = {}) => ({
  isGuest: true,
  transient: false,
  ...overrides,
});

beforeEach(() => {
  localStorage.clear();
  useAppStore.setState({
    userToken: null,
    isAuthenticated: false,
    isAuthChecking: true,
    _hasHydrated: true,
    isHydrating: false,
    isInitialized: true,
  });
  useNetworkStatus.mockReturnValue(true);
  verifySession.mockReset();
});

describe('ProtectedRoute', () => {
  it('sends a visitor with no token to the gateway', async () => {
    verifySession.mockResolvedValue(guest());

    renderDashboard();

    await waitFor(() => expect(screen.getByText('ACCESS GATEWAY')).toBeTruthy());
    expect(screen.queryByText('MEMBER DASHBOARD')).toBeNull();
  });

  it('renders the dashboard for a verified session', async () => {
    signedIn();
    verifySession.mockResolvedValue({ isGuest: false, access_token: 'persisted-token' });

    renderDashboard();

    await waitFor(() => expect(screen.getByText('MEMBER DASHBOARD')).toBeTruthy());
  });

  it('clears the session when the server says the token is not valid', async () => {
    signedIn();
    // A hard guest: the server answered, and the answer was no.
    verifySession.mockResolvedValue(guest({ transient: false }));

    renderDashboard();

    await waitFor(() => expect(screen.getByText('ACCESS GATEWAY')).toBeTruthy());
    expect(useAppStore.getState().userToken).toBeNull();
    expect(useAppStore.getState().isAuthenticated).toBe(false);
  });

  it('keeps the session when verification is inconclusive (the 2.6 regression)', async () => {
    signedIn();
    // Transport failure, not a verdict. Clearing here is what logged people out on a
    // slow network: the store was wiped before the token could be re-verified.
    verifySession.mockResolvedValue(guest({ transient: true }));

    renderDashboard();

    await waitFor(() => expect(screen.getByText('MEMBER DASHBOARD')).toBeTruthy());
    expect(useAppStore.getState().userToken).toBe('persisted-token');
    expect(useAppStore.getState().isAuthenticated).toBe(true);
  });

  it('trusts a persisted token while offline, and says so', async () => {
    signedIn();
    useNetworkStatus.mockReturnValue(false);

    renderDashboard();

    await waitFor(() => expect(screen.getByText('MEMBER DASHBOARD')).toBeTruthy());
    // No point asking a server that cannot be reached; the token is preserved and the
    // reader is told why the dashboard is in a reduced state.
    expect(verifySession).not.toHaveBeenCalled();
    expect(screen.getByText(/Offline Mode/i)).toBeTruthy();
    expect(useAppStore.getState().userToken).toBe('persisted-token');
  });

  it('decides nothing until storage has been read', async () => {
    // A cold refresh of a valid session must not flash the gateway: the token has not
    // been read out of storage yet, so "no token" is not yet an answer. The assertion
    // is made *after* the validation tick has settled, because a synchronous one would
    // be satisfied by the initial `isValidating` flag alone and would pass even if the
    // hydration term were removed from the skeleton condition.
    useAppStore.setState({ _hasHydrated: false, isHydrating: true, userToken: null });
    verifySession.mockResolvedValue({ isGuest: false, access_token: 'persisted-token' });

    const { container } = renderDashboard();
    expect(container.querySelector('.skeleton-loader')).toBeTruthy();

    await act(async () => { await Promise.resolve(); });

    expect(screen.queryByText('ACCESS GATEWAY')).toBeNull();
    expect(container.querySelector('.skeleton-loader')).toBeTruthy();
    expect(verifySession).not.toHaveBeenCalled();

    // The read completes, and the token it finds is what the guard acts on.
    act(() => {
      useAppStore.setState({ _hasHydrated: true, isHydrating: false, userToken: 'persisted-token', isAuthenticated: true });
    });

    await waitFor(() => expect(screen.getByText('MEMBER DASHBOARD')).toBeTruthy());
  });
});

describe('ProtectedRoute — the five-minute heartbeat', () => {
  it('re-verifies in the background and clears a session that has expired', async () => {
    // The dashboard can be open for hours. Without the heartbeat an expired token is
    // only discovered on the next request, which surfaces as a failure in whatever
    // the member was doing rather than as a return to the gateway.
    vi.useFakeTimers();
    try {
      signedIn();
      verifySession.mockResolvedValue({ isGuest: false, access_token: 'persisted-token' });

      renderDashboard();
      await act(async () => { await vi.advanceTimersByTimeAsync(50); });
      expect(screen.getByText('MEMBER DASHBOARD')).toBeTruthy();
      expect(verifySession).toHaveBeenCalledTimes(1);

      // Five minutes later the server has changed its mind.
      verifySession.mockResolvedValue(guest());
      await act(async () => { await vi.advanceTimersByTimeAsync(5 * 60 * 1000); });

      expect(verifySession).toHaveBeenCalledTimes(2);
      expect(useAppStore.getState().userToken).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });
});
