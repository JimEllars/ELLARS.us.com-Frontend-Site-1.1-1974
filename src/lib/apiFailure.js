/**
 * The failure half of the API utility's telemetry policy.
 *
 * Pure: no imports, no `window`, no `import.meta`, so CI can assert every branch
 * without a browser. The wiring lives in ./api.js (`fetchWithRetry`).
 *
 * ## The failure this exists to prevent
 *
 * Sprint 2.29 measured what `fetchWithRetry` actually filed, by stubbing `fetch`
 * and reading the real queue in localStorage. One failed request produced:
 *
 * | failure                | events filed                                    |
 * |------------------------|-------------------------------------------------|
 * | transport (fetch threw)| `API_FETCH_ERROR` (HIGH) + `wp_feed_fallback_served` (LOW) |
 * | HTTP 500               | `wp_feed_fallback_served` (LOW) — **no error at all** |
 * | HTTP 401 on the Vault  | **nothing**                                     |
 * | timeout (abort)        | `API_FETCH_ERROR` (HIGH) + `wp_feed_fallback_served` (LOW) |
 *
 * So the two halves were inverted. The failures that *reached the reporting code*
 * were filed twice, once by the transport catch and again by the caller that then
 * served fallback content — two rows for one broken request in any error count.
 * The failures that never reached it — every non-ok response, including the 401
 * that clears a member's session — were filed **zero** times, because the `!ok`
 * branch returned before the only call site of the logger. A site could answer 500
 * on every dispatch fetch and the error dashboard would show nothing but LOW
 * "fallback served" rows.
 *
 * ## The rule
 *
 *  - One failed request files exactly one `API_FETCH_ERROR`, from the one place
 *    that knows the request failed: `fetchWithRetry`. Severity follows what the
 *    failure means, not how it was thrown.
 *  - A caller that then degrades (serves cached dispatches, renders an empty
 *    vault) files its *own* event, because that is a different fact — a
 *    consequence, not the cause. It carries `metadata.request_id`, the same
 *    idempotency key the error carries, so the pair is joinable and countable
 *    once instead of looking like two incidents.
 *  - Expected conditions are not incidents. An offline client is LOW; WordPress
 *    throttling that we then waited out is MEDIUM; a 5xx is HIGH.
 *  - A failure of the telemetry endpoint itself is never reported. That is the
 *    loop guard, and it is the reason this module returns a decision instead of
 *    always producing an event.
 *  - No credential leaves the browser. Metadata carries origin + path only, never
 *    a query string, and never a header.
 */

/** The single event type for a request that failed. Kept stable: dashboards key on it. */
export const API_ERROR_EVENT = 'API_FETCH_ERROR';

/**
 * How each kind of failure is reported. `failure_kind` is the machine-readable
 * discriminator; `severity` is what an operator sorts by.
 */
export const FAILURE_POLICY = Object.freeze({
  telemetry_self: { report: false, severity: null },
  auth_rejected: { report: true, severity: 'MEDIUM' },
  throttled: { report: true, severity: 'MEDIUM' },
  http_client: { report: true, severity: 'MEDIUM' },
  http_server: { report: true, severity: 'HIGH' },
  timeout: { report: true, severity: 'HIGH' },
  network: { report: true, severity: 'HIGH' },
  parse: { report: true, severity: 'HIGH' },
  offline: { report: true, severity: 'LOW' },
});

const TELEMETRY_PATHS = ['/api/telemetry', 'v1/telemetry'];

const hostOf = (url) => {
  try {
    return new URL(String(url), 'https://ellars.us.com').hostname.toLowerCase();
  } catch {
    return '';
  }
};

/**
 * True for the site's own telemetry sink. A request that fails *here* cannot be
 * reported *here*: enqueueing an event about the telemetry endpoint failing means
 * the next flush retries the same dead endpoint, which is how a client ends up in
 * an infinite reporting loop with a full queue.
 */
export const isTelemetryEndpoint = (url) => {
  const value = String(url ?? '');
  return TELEMETRY_PATHS.some((needle) => value.includes(needle));
};

/** Supabase is the only host whose 401 means "this session is no longer valid". */
export const isSupabaseUrl = (url) => {
  const host = hostOf(url);
  return host === 'supabase.co' || host.endsWith('.supabase.co');
};

/**
 * Origin + path, never the query string and never a fragment.
 *
 * `url` used to be logged verbatim. Nothing in this codebase puts a credential in
 * a query string today, and the point of scrubbing is that nothing has to notice
 * on the day something does — a PostgREST filter, a signed storage URL or a
 * `?apikey=` are all one careless line away.
 */
export const scrubUrl = (url) => {
  try {
    const parsed = new URL(String(url), 'https://ellars.us.com');
    return `${parsed.origin}${parsed.pathname}`;
  } catch {
    return '';
  }
};

/**
 * Decides whether one failed request is reported, and as what.
 *
 * Exactly one of `status` and `transport` is expected. `transport` is the class of
 * a thrown fetch: 'timeout' (our own AbortController fired), 'offline'
 * (`navigator.onLine` is false), or 'network' (anything else the platform threw —
 * a CORS refusal, a DNS failure, a dropped connection).
 *
 * @param {object} input
 * @param {string} input.url                 the request that failed
 * @param {number|null} [input.status]       HTTP status, when the server answered
 * @param {string|null} [input.transport]    transport class, when it did not
 * @param {boolean} [input.carriedSession]   the request carried an Authorization header
 * @param {string} [input.message]           the underlying error message, if any
 * @returns {{report: boolean, reason: string, severity: string|null, failure_kind: string|null,
 *            status: number|null, error_message: string}}
 */
export const classifyApiFailure = ({
  url,
  status = null,
  transport = null,
  carriedSession = false,
  message = '',
} = {}) => {
  const none = (reason) => ({
    report: false,
    reason,
    severity: null,
    failure_kind: null,
    status: status ?? null,
    error_message: message || '',
  });

  if (isTelemetryEndpoint(url)) return none('telemetry_self');

  const kind = (() => {
    if (transport) return transport in FAILURE_POLICY ? transport : 'network';
    if (status === null) return 'network';
    // A rejected session is the one 401 worth filing: the client has just logged
    // the member out, and that is invisible everywhere else.
    if (status === 401 && carriedSession && isSupabaseUrl(url)) return 'auth_rejected';
    // A 401 anywhere else (WordPress, a Pages Function) is an authorization bug in
    // our own request, not an incident on the reader's behalf.
    if (status === 429) return 'throttled';
    if (status >= 500) return 'http_server';
    if (status >= 400) return 'http_client';
    return 'http_client';
  })();

  const policy = FAILURE_POLICY[kind] ?? FAILURE_POLICY.network;

  return {
    report: policy.report,
    reason: kind,
    severity: policy.severity,
    failure_kind: kind,
    status: status ?? null,
    error_message: message || defaultMessage(kind),
  };
};

const defaultMessage = (kind) => {
  switch (kind) {
    case 'timeout':
      return 'API request timed out';
    case 'offline':
      return 'Network offline';
    case 'auth_rejected':
      return 'Session rejected by the server';
    case 'throttled':
      return 'Rate limited, retries exhausted';
    case 'http_server':
      return 'Server error';
    case 'http_client':
      return 'Request rejected';
    case 'parse':
      return 'Response body was not usable JSON';
    default:
      return 'API request failed';
  }
};

/**
 * The full telemetry record for one classified failure, or `null` when the policy
 * says nothing should be filed.
 *
 * The envelope shape is the one `functions/api/telemetry.js` already accepts, and
 * the idempotency key is supplied by the caller so the *same* key can be attached
 * to whatever consequence event the caller files next.
 */
export const buildApiFailurePayload = ({
  classification,
  url,
  requestId,
  attempt = 1,
  online = true,
  timestamp = null,
} = {}) => {
  if (!classification?.report) return null;

  return {
    telemetry_envelope: {
      project_id: 'ELLARS_FRONTEND',
      environment: 'production',
      timestamp: timestamp || new Date().toISOString(),
      idempotency_key: requestId,
      session: { context_scope: 'public_facing_umbrella' },
    },
    event_payload: {
      event_type: API_ERROR_EVENT,
      severity: classification.severity,
      component_origin: 'API_UTILITY',
      error_message: classification.error_message,
      stack_trace: '',
      metadata: {
        url: scrubUrl(url),
        failure_kind: classification.failure_kind,
        http_status: classification.status,
        attempt,
        network_status: online ? 'online' : 'offline',
        request_id: requestId,
      },
    },
  };
};
