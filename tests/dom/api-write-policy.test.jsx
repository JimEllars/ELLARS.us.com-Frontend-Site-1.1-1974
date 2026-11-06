/**
 * The dashboard's writes — the one path that had no failure policy.
 *
 * Seven functions called `fetch` directly, so they never reached the policy Sprint
 * 2.29 installed in `fetchWithRetry`. Reading the components showed what that cost:
 * `MediaUploads` and `DispatchPublisher` both clear their in-flight state in a
 * `finally`, and a request with no timeout is a promise that may never settle — so
 * a stalled upload left the button disabled with no way back except a reload.
 *
 * These cases pin the contract each component already relies on (boolean from
 * `publishVaultItem`, `{ isError, message }` from the row-state operations), plus the
 * three things that were missing: an event on failure, a timeout sized to the
 * request, and no write silently retried.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

vi.mock('@/lib/supabase', () => ({
  getSupabaseConfig: vi.fn(async () => ({ url: 'https://ref.supabase.co', anonKey: 'anon' })),
  getSupabase: vi.fn(async () => null),
}));

const api = await import('@/lib/api');
const { useAppStore } = await import('@/store/useAppStore');

const QUEUE_KEY = 'ellars_telemetry_queue';
const queued = () => JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
const only = (type) => queued().filter((p) => p.event_payload.event_type === type);

const jsonResponse = (body, init = {}) => ({
  ok: init.status ? init.status < 400 : true,
  status: init.status || 200,
  headers: { get: () => null },
  json: async () => body,
});

const sent = () => globalThis.fetch.mock.calls.map(([url, options]) => ({ url, options }));

beforeEach(() => {
  localStorage.clear();
  useAppStore.setState({ userToken: 'member-token', isAuthenticated: true });
});

afterEach(() => {
  vi.useRealTimers();
  Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
});

describe('publishVaultItem keeps its boolean contract', () => {
  it('POSTs the row with its tenant, idempotency key and minimal return', async () => {
    globalThis.fetch = vi.fn(async () => jsonResponse(null, { status: 201 }));

    const ok = await api.publishVaultItem({ title: 'A dispatch', content: 'body' });

    expect(ok).toBe(true);
    const [{ url, options }] = sent();
    expect(url).toBe('https://ref.supabase.co/rest/v1/axim_vault');
    expect(options.method).toBe('POST');
    expect(options.headers['Prefer']).toBe('return=minimal');
    expect(options.headers['Authorization']).toBe('Bearer member-token');
    // The credentials Supabase actually reflects back survive...
    expect(options.headers['apikey']).toBe('anon');
    // ...while the headers `requestHeaders.js` strips from a third-party target are
    // gone. These functions used to hand-write `X-AXiM-Tenant` and
    // `X-Client-Telemetry` on every call; the policy now owns that decision, and
    // re-adding them by hand changes nothing (measured: this case stays green with
    // them put back, which is the point — one owner, not seven).
    const names = Object.keys(options.headers).map((name) => name.toLowerCase());
    expect(names).not.toContain('x-axim-tenant');
    expect(names).not.toContain('x-client-telemetry');

    const body = JSON.parse(options.body);
    expect(body.app_id).toBe('ellars.us.com');
    expect(body.client_idempotency_key).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('files one event and returns false when the write is refused', async () => {
    globalThis.fetch = vi.fn(async () => jsonResponse({}, { status: 500 }));

    const ok = await api.publishVaultItem({ title: 'A dispatch' });

    expect(ok).toBe(false);
    const errors = only('API_FETCH_ERROR');
    expect(errors).toHaveLength(1);
    expect(errors[0].event_payload.metadata.failure_kind).toBe('http_server');
    expect(errors[0].event_payload.metadata.url).toBe('https://ref.supabase.co/rest/v1/axim_vault');
  });

  it('treats a rejected session as a logout, not as a silent false', async () => {
    globalThis.fetch = vi.fn(async () => jsonResponse({}, { status: 401 }));

    const ok = await api.publishVaultItem({ title: 'A dispatch' });

    expect(ok).toBe(false);
    expect(useAppStore.getState().userToken).toBeNull();
    const [error] = only('API_FETCH_ERROR');
    expect(error.event_payload.metadata.failure_kind).toBe('auth_rejected');
  });

  it('makes no request at all without a token', async () => {
    useAppStore.setState({ userToken: null, isAuthenticated: false });
    globalThis.fetch = vi.fn(async () => jsonResponse(null));

    expect(await api.publishVaultItem({ title: 'x' })).toBe(false);
    expect(globalThis.fetch).not.toHaveBeenCalled();
    expect(queued()).toHaveLength(0);
  });

  it('files one event and returns false when the transport fails', async () => {
    globalThis.fetch = vi.fn(async () => {
      throw new TypeError('Failed to fetch');
    });

    expect(await api.publishVaultItem({ title: 'x' })).toBe(false);
    expect(only('API_FETCH_ERROR')).toHaveLength(1);
  });
});

describe('the timeout is per-request, not global', () => {
  /** A fetch that only settles when its own signal aborts or its timer fires. */
  const slowFetch = (ms) =>
    vi.fn(
      (_url, options) =>
        new Promise((resolve, reject) => {
          options.signal.addEventListener('abort', () =>
            reject(Object.assign(new Error('aborted'), { name: 'AbortError' }))
          );
          setTimeout(() => resolve(jsonResponse({ Key: 'x' })), ms);
        })
    );

  it('gives a read five seconds and then calls it a timeout', async () => {
    vi.useFakeTimers();
    globalThis.fetch = slowFetch(60_000);

    const pending = api.fetchSavedVaultItems();
    await vi.advanceTimersByTimeAsync(5_100);
    const result = await pending;

    expect(result.isError).toBe(true);
    const [error] = only('API_FETCH_ERROR');
    expect(error.event_payload.metadata.failure_kind).toBe('timeout');
  });

  it('lets an upload run past five seconds, because the file is the clock', async () => {
    vi.useFakeTimers();
    globalThis.fetch = slowFetch(30_000);
    const file = new File(['binary'], 'clip.mp4', { type: 'video/mp4' });

    const pending = api.uploadMediaAsset(file);
    // Past the read timeout: a 5 s abort here would fail every large upload on a
    // phone, which is the regression this case exists to catch.
    await vi.advanceTimersByTimeAsync(10_000);
    await vi.advanceTimersByTimeAsync(25_000);
    const result = await pending;

    expect(result.isError).toBe(false);
    expect(queued()).toHaveLength(0);
    expect(sent()[0].options.body).toBe(file);
    expect(sent()[0].options.headers['Content-Type']).toBe('video/mp4');
  });
});

describe('writes are not retried', () => {
  it('a 429 on a write is one attempt and one event (a read gets four)', async () => {
    globalThis.fetch = vi.fn(async () => jsonResponse({}, { status: 429 }));

    const ok = await api.publishVaultItem({ title: 'x' });

    expect(ok).toBe(false);
    // A POST that may already have been applied is the caller's decision to
    // repeat — `client_idempotency_key` exists so that decision is safe, and it
    // belongs where the key is minted, not in a transport policy.
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    const [error] = only('API_FETCH_ERROR');
    expect(error.event_payload.metadata.failure_kind).toBe('throttled');
    expect(error.event_payload.metadata.attempt).toBe(1);
  });
});

describe('the four row-state operations are one request', () => {
  const cases = [
    // updateVaultItem also stamps the tenant onto the row it is editing.
    ['updateVaultItem', 'PATCH', () => JSON.stringify({ title: 'edited', app_id: 'ellars.us.com' }), 'return=representation'],
    ['archiveVaultItem', 'PATCH', () => JSON.stringify({ status: 'archived' }), 'return=minimal'],
    ['restoreVaultItem', 'PATCH', () => JSON.stringify({ status: 'published' }), 'return=minimal'],
  ];

  for (const [name, method, buildBody, prefer] of cases) {
    it(`${name} targets one row in one tenant with ${method}`, async () => {
      globalThis.fetch = vi.fn(async () => jsonResponse(null, { status: 204 }));

      const result = await api[name]('row-1', { title: 'edited' });

      expect(result.isError).toBe(false);
      const [{ url, options }] = sent();
      expect(url).toBe('https://ref.supabase.co/rest/v1/axim_vault?id=eq.row-1&app_id=eq.ellars.us.com');
      expect(options.method).toBe(method);
      expect(options.headers['Prefer']).toBe(prefer);
      expect(options.body).toBe(buildBody());
    });
  }

  it('deleteVaultItem sends no body and reports the status it got', async () => {
    globalThis.fetch = vi.fn(async () => jsonResponse({}, { status: 400 }));

    const result = await api.deleteVaultItem('row-1');

    expect(result).toEqual({ isError: true, message: 'Failed to delete item with status 400' });
    const [{ url, options }] = sent();
    expect(url).toBe('https://ref.supabase.co/rest/v1/axim_vault?id=eq.row-1&app_id=eq.ellars.us.com');
    expect(options.method).toBe('DELETE');
    expect(options.body).toBeUndefined();
    // A refused delete is MEDIUM: the request was rejected, the server is fine.
    const [error] = only('API_FETCH_ERROR');
    expect(error.event_payload.severity).toBe('MEDIUM');
    expect(error.event_payload.metadata.failure_kind).toBe('http_client');
  });
});

describe('media', () => {
  it('maps a listing to public URLs on the project origin', async () => {
    globalThis.fetch = vi.fn(async () => jsonResponse([{ name: 'a.png' }, { name: 'b.png' }]));

    const result = await api.fetchUploadedMedia();

    expect(result.isError).toBe(false);
    expect(result.data.map((row) => row.url)).toEqual([
      'https://ref.supabase.co/storage/v1/object/public/ellars-media/a.png',
      'https://ref.supabase.co/storage/v1/object/public/ellars-media/b.png',
    ]);
  });

  it('a failed listing is an empty list plus the reason, never a throw', async () => {
    globalThis.fetch = vi.fn(async () => jsonResponse({}, { status: 403 }));

    const result = await api.fetchUploadedMedia();

    expect(result).toEqual({
      data: [],
      isError: true,
      message: 'Our systems are currently experiencing high traffic. We are utilizing fallback protocols to serve you.',
    });
    expect(only('API_FETCH_ERROR')).toHaveLength(1);
  });

  it('a 2xx whose body cannot be read is a failure, not a success', async () => {
    globalThis.fetch = vi.fn(async () => ({
      ok: true,
      status: 200,
      headers: { get: () => null },
      json: async () => {
        throw new SyntaxError('Unexpected token < in JSON');
      },
    }));

    const result = await api.uploadMediaAsset(new File(['x'], 'clip.mp4', { type: 'video/mp4' }));

    expect(result.isError).toBe(true);
    expect(result.data).toBeNull();
    const [error] = only('API_FETCH_ERROR');
    expect(error.event_payload.metadata.failure_kind).toBe('parse');
  });

  it('sanitises the filename it stores', async () => {
    globalThis.fetch = vi.fn(async () => jsonResponse({ Key: 'stored' }));

    const file = new File(['x'], 'my clip (final)?.mp4', { type: 'video/mp4' });
    await api.uploadMediaAsset(file);

    const [{ url }] = sent();
    expect(url).toMatch(/\/storage\/v1\/object\/ellars-media\/\d+_my_clip__final__\.mp4$/);
  });
});
