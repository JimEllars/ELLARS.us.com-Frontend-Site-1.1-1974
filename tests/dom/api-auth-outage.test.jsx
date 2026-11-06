/**
 * Sign-in's failure states — the one place where "failed" is usually the user's
 * typo and occasionally an outage that nobody could see.
 *
 * `loginUser` mapped every non-ok response to the server's `error_description`. A
 * 500 does not carry one, so `status 500` surfaced as **"Invalid login
 * credentials"**: the member was told to reset a password that was fine, during an
 * outage, and nothing anywhere recorded the outage. A 5xx body is also very often
 * an HTML gateway page, and `response.json()` throwing on it turned a server fault
 * into a parse error attributed to the person typing.
 *
 * The deliberate distinction, asserted below: **a rejected credential files
 * nothing** — a typo must never become an incident — while an unavailable service
 * files exactly one event and says so in words a person can act on.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const getSupabase = vi.fn(async () => null);

vi.mock('@/lib/supabase', () => ({
  getSupabaseConfig: vi.fn(async () => ({ url: 'https://ref.supabase.co', anonKey: 'anon' })),
  getSupabase: (...args) => getSupabase(...args),
}));

const { loginUser } = await import('@/lib/api');

const QUEUE_KEY = 'ellars_telemetry_queue';
const queued = () => JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
const only = (type) => queued().filter((p) => p.event_payload.event_type === type);

const reply = (body, status = 200, { json = true } = {}) => ({
  ok: status < 400,
  status,
  headers: { get: () => null },
  json: async () => {
    if (!json) throw new SyntaxError('Unexpected token < in JSON');
    return body;
  },
});

beforeEach(() => {
  localStorage.clear();
  getSupabase.mockResolvedValue(null);
});

afterEach(() => {
  Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
});

describe('an unavailable authentication service', () => {
  it('says so instead of blaming the password, and files one HIGH event', async () => {
    globalThis.fetch = vi.fn(async () => reply({}, 500));

    const result = await loginUser('member@ellars.us.com', 'correct horse');

    expect(result.success).toBe(false);
    expect(result.unavailable).toBe(true);
    expect(result.message).toMatch(/temporarily unavailable/i);
    expect(result.message).not.toMatch(/invalid login credentials/i);

    const errors = only('API_FETCH_ERROR');
    expect(errors).toHaveLength(1);
    expect(errors[0].event_payload.severity).toBe('HIGH');
    expect(errors[0].event_payload.metadata.failure_kind).toBe('http_server');
    expect(errors[0].event_payload.metadata.http_status).toBe(500);
  });

  it('survives a 502 that answers with an HTML error page', async () => {
    // A gateway error page is HTML. Because the 5xx branch returns before it reads
    // the body, the member never sees a parser's complaint.
    globalThis.fetch = vi.fn(async () => reply(null, 502, { json: false }));

    const result = await loginUser('member@ellars.us.com', 'pw');

    expect(result.success).toBe(false);
    expect(result.message).toMatch(/temporarily unavailable/i);
    expect(only('API_FETCH_ERROR')[0].event_payload.metadata.failure_kind).toBe('http_server');
  });

  it('treats throttling as unavailable, not as a bad password, and files one MEDIUM', async () => {
    globalThis.fetch = vi.fn(async () => reply({}, 429));

    const result = await loginUser('member@ellars.us.com', 'pw');

    expect(result.success).toBe(false);
    expect(result.unavailable).toBe(true);
    const [error] = only('API_FETCH_ERROR');
    expect(error.event_payload.metadata.failure_kind).toBe('throttled');
    expect(error.event_payload.severity).toBe('MEDIUM');
  });
});

describe('a rejected credential', () => {
  it('passes the server reason through and files nothing at all', async () => {
    globalThis.fetch = vi.fn(async () => reply({ error_description: 'Invalid login credentials' }, 400));

    const result = await loginUser('member@ellars.us.com', 'wrong');

    expect(result).toEqual({ success: false, message: 'Invalid login credentials' });
    // A typo is the expected outcome of typing. Filing it would make every member's
    // mistyped password an incident, which is how an error dashboard becomes noise.
    expect(queued()).toHaveLength(0);
  });

  it('does not surface a parser error when a 4xx answers with HTML', async () => {
    // A WAF or CDN in front of the auth endpoint can refuse with an HTML page. The
    // body is unreadable, so the cause is unknown at this layer — but "Unexpected
    // token < in JSON" is not an answer a member should ever be shown.
    globalThis.fetch = vi.fn(async () => reply(null, 403, { json: false }));

    const result = await loginUser('member@ellars.us.com', 'pw');

    expect(result.success).toBe(false);
    expect(result.message).toBe('Invalid login credentials');
    expect(result.message).not.toMatch(/unexpected token/i);
  });

  it('still has a sentence when the rejection carries no message', async () => {
    globalThis.fetch = vi.fn(async () => reply({}, 400));

    expect(await loginUser('member@ellars.us.com', 'pw')).toEqual({
      success: false,
      message: 'Invalid login credentials',
    });
    expect(queued()).toHaveLength(0);
  });

  it('does not report a 401 and does not clear a session', async () => {
    globalThis.fetch = vi.fn(async () => reply({ error_description: 'invalid_grant' }, 401));

    const result = await loginUser('member@ellars.us.com', 'pw');

    expect(result.message).toBe('invalid_grant');
    expect(queued()).toHaveLength(0);
  });
});

describe('the request itself', () => {
  it('never puts the credential in telemetry, and normalises the URL', async () => {
    globalThis.fetch = vi.fn(async () => reply({}, 500));

    await loginUser('member@ellars.us.com', 'correct horse');

    const [error] = only('API_FETCH_ERROR');
    // The grant type lives in the query string; metadata carries origin + path only.
    expect(error.event_payload.metadata.url).toBe('https://ref.supabase.co/auth/v1/token');
    expect(JSON.stringify(error)).not.toContain('correct horse');
    expect(JSON.stringify(error)).not.toContain('member@ellars.us.com');
  });

  it('reports a transport failure once and replaces the platform wording', async () => {
    globalThis.fetch = vi.fn(async () => {
      throw new TypeError('Failed to fetch');
    });

    const result = await loginUser('member@ellars.us.com', 'pw');

    expect(result.success).toBe(false);
    expect(result.message).toMatch(/connection error/i);
    expect(result.message).not.toBe('Failed to fetch');
    const [error] = only('API_FETCH_ERROR');
    expect(error.event_payload.metadata.failure_kind).toBe('network');
  });

  it('accepts the credential and adopts the session', async () => {
    const setSession = vi.fn(async () => ({ error: null }));
    getSupabase.mockResolvedValue({ auth: { setSession } });
    globalThis.fetch = vi.fn(async () =>
      reply({ access_token: 'fresh-token', refresh_token: 'refresh-token' }, 200)
    );

    const result = await loginUser('member@ellars.us.com', 'pw');

    expect(result.success).toBe(true);
    expect(result.data.access_token).toBe('fresh-token');
    expect(setSession).toHaveBeenCalledWith({ access_token: 'fresh-token', refresh_token: 'refresh-token' });
    expect(queued()).toHaveLength(0);
  });

  it('posts the password verbatim, never trimmed', async () => {
    globalThis.fetch = vi.fn(async () => reply({ error_description: 'nope' }, 400));

    await loginUser('member@ellars.us.com', '  spaced pass  ');

    const body = JSON.parse(globalThis.fetch.mock.calls[0][1].body);
    expect(body.password).toBe('  spaced pass  ');
  });
});
