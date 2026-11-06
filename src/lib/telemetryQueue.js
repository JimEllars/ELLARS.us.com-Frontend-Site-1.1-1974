/**
 * How telemetry leaves the browser — bounded batches and honest settlements.
 *
 * Pure: no imports, no `window`, no `import.meta`, so every branch is asserted in
 * CI. The wiring lives in `src/hooks/useTelemetry.js`.
 *
 * ## What was wrong
 *
 * `flushQueue` sent the entire queue, and on any 2xx it wrote `[]` — wiping records
 * that had been enqueued *while* the request was in flight, because nothing related
 * the response to the batch it answered.
 *
 * Two more defects sat on either side of that:
 *
 *  - **A rejection was always retried.** The only statuses excluded from the retry
 *    were 429 and 5xx, so a `413` (the edge rejects any body over 64 KB) was retried
 *    three times with the same oversized body, then abandoned — and the next 5-second
 *    tick repeated it. A queue that grows past the cap stops delivering **forever**,
 *    one doomed request every five seconds for the life of the browser profile.
 *  - **The unload path sent the same unbounded body** and cleared the queue
 *    regardless of whether the platform accepted it. `sendBeacon` returns `false`
 *    over its 64 KiB limit, and the queue was wiped anyway.
 *
 * So this module answers two questions with data instead of control flow: which
 * records may be sent together (`selectBatch`), and what the queue looks like after
 * the server has answered (`settleBatch`).
 */

/** Matches `MAX_RECORDS` in functions/api/telemetry.js. */
export const MAX_BATCH_RECORDS = 50;

/**
 * Deliberately below the edge's `MAX_BODY_BYTES` (64 KB), which is also where
 * browsers cap `sendBeacon` and `keepalive`. The client should never build a body it
 * knows will be refused — the 413 path exists only for the case where a single
 * record is itself too large.
 */
export const MAX_BATCH_BYTES = 60 * 1024;

/** Beyond this age a record is dropped rather than sent: stale telemetry is noise. */
export const MAX_RECORD_AGE_MS = 48 * 60 * 60 * 1000;

const encoder = new TextEncoder();

/** Byte length of what will actually go over the wire. */
export const batchBytes = (records) => {
  try {
    return encoder.encode(JSON.stringify(records)).length;
  } catch {
    return Infinity; // un-serialisable: never send it
  }
};

/**
 * A stable identity for one record, so a response can be matched to the records it
 * answered. `enqueuePayload` stamps `idempotency_key` on everything it writes; the
 * serialised form is the fallback for a payload that arrived some other way.
 */
export const recordKey = (payload) =>
  payload?.telemetry_envelope?.idempotency_key || JSON.stringify(payload ?? null);

/** Newest first, oldest dropped — a fresh failure is worth more than yesterday's. */
export const selectBatch = (queue, { maxRecords = MAX_BATCH_RECORDS, maxBytes = MAX_BATCH_BYTES } = {}) => {
  const records = Array.isArray(queue) ? queue.slice(0, maxRecords) : [];
  if (records.length === 0) return [];

  const kept = [];
  for (let index = records.length - 1; index >= 0; index -= 1) {
    const candidate = [records[index], ...kept];
    // The newest record is always attempted: a single record that busts the cap must
    // reach the server once so the 413 can settle it, rather than sitting in the
    // queue forever behind a size check that quietly refuses to send anything.
    if (kept.length > 0 && batchBytes(candidate) > maxBytes) break;
    kept.unshift(records[index]);
  }
  return kept;
};

/** Drops records that are older than the window, or that cannot be serialised. */
export const dropStale = (queue, { now = Date.now(), maxAgeMs = MAX_RECORD_AGE_MS } = {}) => {
  if (!Array.isArray(queue)) return [];
  return queue.filter((payload) => {
    if (!payload) return false;
    if (!Number.isFinite(payload.timestamp)) return true; // no clock reading: keep it
    return now - payload.timestamp <= maxAgeMs;
  });
};

const withoutKeys = (queue, keys) => queue.filter((payload) => !keys.has(recordKey(payload)));

/**
 * What the queue becomes once the server has answered.
 *
 * @returns {{queue: Array, retry: boolean, reason: string}}
 *   `retry` is whether *this* batch is worth sending again. Nothing here retries a
 *   request whose outcome cannot change.
 */
export const settleBatch = ({ status = null, sent = [], queue = [] } = {}) => {
  const sentKeys = new Set(sent.map(recordKey));

  // No status: the request never got an answer. Keep everything and try again.
  if (status === null || status === undefined) {
    return { queue, retry: true, reason: 'transport' };
  }

  // Accepted. Remove exactly what was sent — anything enqueued during the flight was
  // never in this batch and must survive, which is the race this replaces.
  if (status >= 200 && status < 300) {
    return { queue: withoutKeys(queue, sentKeys), retry: false, reason: 'accepted' };
  }

  // The server is busy, not wrong. Same body, later.
  if (status === 429 || status >= 500) {
    return { queue, retry: true, reason: 'retryable' };
  }

  // Too large. Drop the older half of what was sent so the next attempt is smaller.
  if (status === 413) {
    // One record that is refused on its own can never be delivered — halving it is
    // not possible, so it is dropped rather than retried forever. This is the last
    // step of the convergence below.
    if (sent.length <= 1) {
      return { queue: withoutKeys(queue, sentKeys), retry: false, reason: 'too_large' };
    }
    const keep = new Set(sent.slice(-Math.ceil(sent.length / 2)).map(recordKey));
    const drop = new Set([...sentKeys].filter((key) => !keep.has(key)));
    return { queue: withoutKeys(queue, drop), retry: true, reason: 'too_large' };
  }

  // Any other 4xx is a verdict on the payload itself (400 malformed, 403 origin).
  // Sending it again cannot change that, so it is dropped instead of retried.
  return { queue: withoutKeys(queue, sentKeys), retry: false, reason: 'rejected' };
};

/**
 * The queue to hand to an unload-time beacon: what is stored, plus anything that was
 * in flight, de-duplicated by key and bounded.
 */
export const mergeForUnload = (queue, inFlight = [], options = {}) => {
  const merged = Array.isArray(queue) ? [...queue] : [];
  const seen = new Set(merged.map(recordKey));

  for (const payload of inFlight) {
    const key = recordKey(payload);
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(payload);
  }

  return selectBatch(dropStale(merged, options), options);
};
