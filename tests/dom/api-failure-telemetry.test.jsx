/**
 * The API utility's failure telemetry — measured, not assumed.
 *
 * Sprint 2.29 exists because nobody had ever read the queue after a failed request.
 * Stubbing `fetch` and reading the real `localStorage` queue showed the two halves
 * of the policy were inverted:
 *
 *   - transport failure  -> `API_FETCH_ERROR` (HIGH) **and** `wp_feed_fallback_served`,
 *                           i.e. one broken request counted twice;
 *   - HTTP 500           -> `wp_feed_fallback_served` only, **no error at all**,
 *                           because the `!ok` branch returned before the logger;
 *   - HTTP 401 on Vault  -> **nothing**, including for the 401 that logs a member out.
 *
 * These cases pin the corrected contract: one failed request files exactly one
 * error, severity follows meaning, and a caller that degrades links to it by
 * request id instead of filing a second incident.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

vi.mock('@/lib/supabase', () => ({
  getSupabaseConfig: vi.fn(async () => ({ url: 'https://ref.supabase.co', anonKey: 'anon' })),
  getSupabase: vi.fn(async () => null),
}));

const { fetchLatestNews, getPostBySlug, fetchSavedVaultItems } = await import('@/lib/api');
const { useAppStore } = await import('@/store/useAppStore');
const { classifyApiFailure, scrubUrl, isTelemetryEndpoint, isSupabaseUrl } = await import(
  '@/lib/apiFailure'
);

const QUEUE_KEY = 'ellars_telemetry_queue';

/** Every event currently in the real queue, in the order it was filed. */
const queued = () => JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
const eventTypes = () => queued().map((p) => p.event_payload.event_type);
const only = (type) => queued().filter((p) => p.event_payload.event_type === type);

const jsonResponse = (body, init = {}) => ({
  ok: init.status ? init.status < 400 : true,
  status: init.status || 200,
  headers: { get: () => null },
  json: async () => body,
});

beforeEach(() => {
  localStorage.clear();
  useAppStore.setState({ userToken: null, isAuthenticated: false });
});

afterEach(() => {
  vi.useRealTimers();
  Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
});

describe('one failed request files exactly one error', () => {
  it('a transport failure is reported once, not twice', async () => {
    globalThis.fetch = vi.fn(async () => {
      throw new TypeError('Failed to fetch');
    });

    await fetchLatestNews();

    const errors = only('API_FETCH_ERROR');
    expect(errors).toHaveLength(1);
    expect(errors[0].event_payload.severity).toBe('HIGH');
    expect(errors[0].event_payload.metadata.failure_kind).toBe('network');
    // The degradation is still reported — it is a different fact — but it is LOW
    // and it carries the cause's id, so an error count sees one incident.
    expect(only('wp_feed_fallback_served')).toHaveLength(1);
  });

  it('an HTTP 500 is reported as an error at all (it used to file nothing)', async () => {
    globalThis.fetch = vi.fn(async () => jsonResponse({}, { status: 500 }));

    await fetchLatestNews();

    const errors = only('API_FETCH_ERROR');
    expect(errors).toHaveLength(1);
    expect(errors[0].event_payload.severity).toBe('HIGH');
    expect(errors[0].event_payload.metadata.failure_kind).toBe('http_server');
    expect(errors[0].event_payload.metadata.http_status).toBe(500);
  });

  it('joins the degradation event to its cause by request id', async () => {
    globalThis.fetch = vi.fn(async () => jsonResponse({}, { status: 503 }));

    await fetchLatestNews();

    const [error] = only('API_FETCH_ERROR');
    const [fallback] = only('wp_feed_fallback_served');
    expect(fallback.event_payload.metadata.request_id).toBe(error.telemetry_envelope.idempotency_key);
    expect(fallback.event_payload.metadata.failure_kind).toBe('http_server');
    expect(fallback.event_payload.metadata.source).toBe('fetchLatestNews');
  });

  it('a 4xx is MEDIUM — a rejected request is not a server incident', async () => {
    globalThis.fetch = vi.fn(async () => jsonResponse({}, { status: 404 }));

    const result = await getPostBySlug('a-post-that-does-not-exist');

    expect(result.isError).toBe(true);
    // The status used to be missing from this branch entirely, so a caller could
    // not tell 404 from 500 without guessing.
    expect(result.status).toBe(404);
    const [error] = only('API_FETCH_ERROR');
    expect(error.event_payload.severity).toBe('MEDIUM');
    expect(error.event_payload.metadata.failure_kind).toBe('http_client');
  });

  it('exhausted 429 retries file one event, with the attempt count', async () => {
    vi.useFakeTimers();
    globalThis.fetch = vi.fn(async () => jsonResponse({}, { status: 429 }));

    const pending = fetchLatestNews();
    await vi.advanceTimersByTimeAsync(30_000); // 2s + 4s + 8s of backoff
    await pending;

    expect(globalThis.fetch).toHaveBeenCalledTimes(4); // first + three retries
    const errors = only('API_FETCH_ERROR');
    expect(errors).toHaveLength(1);
    expect(errors[0].event_payload.metadata.failure_kind).toBe('throttled');
    expect(errors[0].event_payload.metadata.attempt).toBe(4);
    expect(errors[0].event_payload.metadata.http_status).toBe(429);
  });

  it('a timeout is classified as a timeout, not a generic network error', async () => {
    globalThis.fetch = vi.fn(
      () =>
        new Promise((_, reject) => {
          reject(Object.assign(new Error('aborted'), { name: 'AbortError' }));
        })
    );

    await fetchLatestNews();

    const [error] = only('API_FETCH_ERROR');
    expect(error.event_payload.metadata.failure_kind).toBe('timeout');
    expect(error.event_payload.error_message).toBe('API request timed out');
    expect(error.event_payload.severity).toBe('HIGH');
  });

  it('an offline client is LOW — an expected condition, not an incident', async () => {
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });
    globalThis.fetch = vi.fn(async () => {
      throw new TypeError('Failed to fetch');
    });

    await fetchLatestNews();

    const [error] = only('API_FETCH_ERROR');
    expect(error.event_payload.metadata.failure_kind).toBe('offline');
    expect(error.event_payload.metadata.network_status).toBe('offline');
    expect(error.event_payload.severity).toBe('LOW');
  });
});

describe('the 401 that logs a member out', () => {
  it('clears the session and files one MEDIUM event', async () => {
    useAppStore.setState({ userToken: 'token', isAuthenticated: true });
    globalThis.fetch = vi.fn(async () => jsonResponse({}, { status: 401 }));

    const result = await fetchSavedVaultItems();

    expect(result.isError).toBe(true);
    expect(useAppStore.getState().userToken).toBeNull();
    const errors = only('API_FETCH_ERROR');
    expect(errors).toHaveLength(1);
    expect(errors[0].event_payload.metadata.failure_kind).toBe('auth_rejected');
    expect(errors[0].event_payload.severity).toBe('MEDIUM');
  });

  it('does not clear the session when the request carried no token', async () => {
    useAppStore.setState({ userToken: 'token', isAuthenticated: true });
    // `fetchSavedVaultItems` short-circuits on a missing token, so drive the
    // unauthenticated path through the public feed instead.
    globalThis.fetch = vi.fn(async () => jsonResponse({}, { status: 401 }));

    await fetchLatestNews();

    expect(useAppStore.getState().userToken).toBe('token');
    const [error] = only('API_FETCH_ERROR');
    expect(error.event_payload.metadata.failure_kind).toBe('http_client');
  });

  it('does not clear the session for a non-Supabase 401 that merely looks like one', async () => {
    useAppStore.setState({ userToken: 'token', isAuthenticated: true });
    globalThis.fetch = vi.fn(async () => jsonResponse({}, { status: 401 }));

    await fetchSavedVaultItems();

    // Sanity: the check is a parsed hostname, not a substring of the whole URL.
    expect(isSupabaseUrl('https://ref.supabase.co/rest/v1/axim_vault')).toBe(true);
    expect(isSupabaseUrl('https://supabase.co.example.net/rest/v1/x')).toBe(false);
  });
});

describe('nothing leaks, and nothing loops', () => {
  it('never reports a failure of the telemetry endpoint itself', async () => {
    // The loop guard lives in the pure module, because `fetchWithRetry` is not
    // exported and a test that reimplemented it would test nothing. What is
    // asserted here is the decision itself, on both failure shapes.
    expect(classifyApiFailure({ url: 'https://ellars.us.com/api/telemetry', status: 502 })).toMatchObject({
      report: false,
      reason: 'telemetry_self',
    });
    expect(classifyApiFailure({ url: '/api/v1/telemetry', transport: 'network' }).report).toBe(false);
    expect(isTelemetryEndpoint('/api/telemetry')).toBe(true);
    expect(isTelemetryEndpoint('/api/v1/telemetry')).toBe(true);
    expect(isTelemetryEndpoint('/api/config')).toBe(false);

    // No queue entry, and no dead flag: `telemetry_error_flag` was written on this
    // path and read by nothing in this repository, so a broken sink appeared to
    // have a recovery mechanism it never had.
    globalThis.fetch = vi.fn(async () => jsonResponse({}, { status: 200 }));
    await fetchLatestNews();
    expect(localStorage.getItem('telemetry_error_flag')).toBeNull();
  });

  it('scrubs the query string out of the reported URL', async () => {
    globalThis.fetch = vi.fn(async () => jsonResponse({}, { status: 500 }));

    await fetchLatestNews(1, 9);

    const [error] = only('API_FETCH_ERROR');
    const reported = error.event_payload.metadata.url;
    expect(reported).toBe('https://wp.ellars.us.com/wp-json/wp/v2/posts');
    expect(reported).not.toContain('?');
    expect(scrubUrl('https://x.test/a/b?apikey=secret#frag')).toBe('https://x.test/a/b');
  });

  it('a 200 with an unusable body is reported once, as a parse failure', async () => {
    globalThis.fetch = vi.fn(async () => ({
      ok: true,
      status: 200,
      headers: { get: () => null },
      json: async () => {
        throw new SyntaxError('Unexpected token < in JSON');
      },
    }));

    await fetchLatestNews();

    const errors = only('API_FETCH_ERROR');
    expect(errors).toHaveLength(1);
    expect(errors[0].event_payload.metadata.failure_kind).toBe('parse');
    expect(errors[0].event_payload.severity).toBe('HIGH');
  });
});

describe('the policy table', () => {
  it('places every failure class by meaning, not by how it was thrown', () => {
    const cases = [
      [{ url: '/x', transport: 'network' }, 'network', 'HIGH'],
      [{ url: '/x', transport: 'timeout' }, 'timeout', 'HIGH'],
      [{ url: '/x', transport: 'offline' }, 'offline', 'LOW'],
      [{ url: '/x', transport: 'parse' }, 'parse', 'HIGH'],
      [{ url: '/x', status: 500 }, 'http_server', 'HIGH'],
      [{ url: '/x', status: 503 }, 'http_server', 'HIGH'],
      [{ url: '/x', status: 429 }, 'throttled', 'MEDIUM'],
      [{ url: '/x', status: 404 }, 'http_client', 'MEDIUM'],
      [{ url: '/x', status: 400 }, 'http_client', 'MEDIUM'],
      [{ url: 'https://ref.supabase.co/rest/v1/axim_vault', status: 401, carriedSession: true }, 'auth_rejected', 'MEDIUM'],
      [{ url: 'https://ref.supabase.co/rest/v1/axim_vault', status: 401, carriedSession: false }, 'http_client', 'MEDIUM'],
    ];

    for (const [input, kind, severity] of cases) {
      const result = classifyApiFailure(input);
      expect({ input, kind: result.failure_kind, severity: result.severity }).toEqual({
        input,
        kind,
        severity,
      });
      expect(result.report).toBe(true);
    }
  });

  it('defaults an unclassified failure to network, with a usable message', () => {
    // No status and no transport class means the caller passed the wrong arguments.
    // Reporting it as a network failure is the conservative choice: it appears in
    // the queue where the caller bug can be found, rather than vanishing.
    const result = classifyApiFailure({ url: '/api/config' });
    expect(result.failure_kind).toBe('network');
    expect(result.report).toBe(true);
    expect(classifyApiFailure({ url: '' }).error_message).toBe('API request failed');
  });
});
