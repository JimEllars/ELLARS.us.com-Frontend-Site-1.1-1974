/**
 * The gateway. `/login` is one of the four surfaces the guardrails protect, and it is
 * the only place a member's credentials meet the network — so every one of its states
 * is a security-adjacent behaviour, not a cosmetic one:
 *
 *  - a failure must say what the server said, and must not navigate anywhere;
 *  - a deployment with no credential bound must say *that*, rather than reporting a
 *    Supabase 401 as "wrong password" (the failure that made an unconfigured
 *    deployment look like a user error);
 *  - a success must store the token and land on `/dashboard`, because the token is what
 *    `ProtectedRoute` reads on the next render.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import React from 'react';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

import { useAppStore } from '@/store/useAppStore';
import { loginUser } from '@/lib/api';

vi.mock('@/lib/api', () => ({ loginUser: vi.fn() }));

const Login = (await import('@/pages/Login')).default;

const Dashboard = () => <div>MEMBER DASHBOARD</div>;

const renderGateway = () =>
  render(
    <MemoryRouter initialEntries={['/login']}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
      </Routes>
    </MemoryRouter>
  );

const submit = async (email = 'member@ellars.us.com', password = 'correct horse battery staple') => {
  if (email) fireEvent.change(document.getElementById('email'), { target: { value: email } });
  if (password) fireEvent.change(document.getElementById('password'), { target: { value: password } });
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: /Initialize Session/i }));
  });
};

beforeEach(() => {
  localStorage.clear();
  useAppStore.setState({ userToken: null, isAuthenticated: false, toastMessage: null });
  loginUser.mockReset();
});

describe('the login form', () => {
  it('states the server’s reason and stays put when the credentials are rejected', async () => {
    loginUser.mockResolvedValue({ success: false, message: 'Invalid login credentials' });

    renderGateway();
    await submit();

    await waitFor(() => expect(screen.getByText(/Invalid login credentials/i)).toBeTruthy());
    // The form is still the only thing on screen, and the button is usable again —
    // a rejected attempt must not strand the reader on a spinner.
    expect(screen.getByRole('button', { name: /Initialize Session/i })).toBeTruthy();
    expect(screen.queryByText('MEMBER DASHBOARD')).toBeNull();
    expect(useAppStore.getState().userToken).toBeNull();
  });

  it('names a missing deployment credential instead of blaming the password', async () => {
    // The exact message lib/api.js returns when no anon key is bound. Reporting
    // Supabase's 401 as bad credentials sent people to reset a password that was fine.
    loginUser.mockResolvedValue({
      success: false,
      message: 'Sign-in is unavailable on this deployment. The site is missing its Supabase configuration.',
    });

    renderGateway();
    await submit();

    await waitFor(() => expect(screen.getByText(/missing its Supabase configuration/i)).toBeTruthy());
    expect(screen.queryByText(/Invalid login credentials/i)).toBeNull();
  });

  it('stores the token and lands on the dashboard when the credentials are accepted', async () => {
    loginUser.mockResolvedValue({ success: true, data: { access_token: 'fresh-token', refresh_token: 'r' } });

    renderGateway();
    await submit();

    await waitFor(() => expect(screen.getByText('MEMBER DASHBOARD')).toBeTruthy());
    expect(useAppStore.getState().userToken).toBe('fresh-token');
    expect(useAppStore.getState().isAuthenticated).toBe(true);
  });

  it('sends the email the input yields and the password exactly as typed', async () => {
    // Measured, not assumed: an `<input type="email">` strips surrounding whitespace
    // as part of the platform's value sanitisation, so a pasted address that arrived
    // with spaces is still valid — and the password keeps its spaces, because a
    // password is opaque and trimming it would silently change the credential.
    loginUser.mockResolvedValue({ success: false, message: 'nope' });

    renderGateway();
    await submit('  Member@Ellars.us.com ', '  spaced pass  ');

    expect(loginUser).toHaveBeenCalledWith('Member@Ellars.us.com', '  spaced pass  ');
  });

  it('treats a thrown transport failure as an error, not as a rejection', async () => {
    loginUser.mockRejectedValue(new Error('network down'));

    renderGateway();
    await submit();

    await waitFor(() => expect(screen.getByText(/connection error occurred/i)).toBeTruthy());
    expect(screen.queryByText('MEMBER DASHBOARD')).toBeNull();
  });

  it('disables the form while a request is in flight', async () => {
    let release;
    loginUser.mockImplementation(() => new Promise((resolve) => { release = resolve; }));

    renderGateway();
    await submit();

    // Double submission is how a password is sent twice and rate-limited.
    const button = screen.getByRole('button', { name: /Authenticating/i });
    expect(button.disabled).toBe(true);
    expect(document.getElementById('password').disabled).toBe(true);

    await act(async () => { release({ success: false, message: 'slow rejection' }); });
    await waitFor(() => expect(screen.getByRole('button', { name: /Initialize Session/i })).toBeTruthy());
  });
});
