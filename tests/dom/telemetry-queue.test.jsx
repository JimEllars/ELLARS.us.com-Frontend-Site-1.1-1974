/**
 * How telemetry leaves the browser.
 *
 * Three defects, all measured by reading `useTelemetry.js` against the edge handler
 * it talks to:
 *
 *  1. the flush cleared the **whole** queue on a 2xx, so anything enqueued while the
 *     request was in flight was wiped — the response was never matched to its batch;
 *  2. any rejection was retried, so a `413` (the edge refuses bodies over 64 KB) was
 *     resent verbatim three times, then abandoned, then repeated on the next 5-second
 *     tick — a queue that grows past the cap stops delivering **forever**;
 *  3. the unload beacon sent the same unbounded body and cleared the queue whether or
 *     not the platform accepted it (`sendBeacon` returns false over its own 64 KiB
 *     limit), so a large queue was discarded on unload rather than delivered.
 *
 * The decisions live in `src/lib/telemetryQueue.js` as pure functions, so they are
 * asserted here without a browser and without a network.
 */

import { describe, it, expect } from 'vitest';

import {
  MAX_BATCH_BYTES,
  MAX_BATCH_RECORDS,
  MAX_RECORD_AGE_MS,
  batchBytes,
  dropStale,
  mergeForUnload,
  recordKey,
  selectBatch,
  settleBatch,
} from '@/lib/telemetryQueue';

const record = (id, pad = 0) => ({
  telemetry_envelope: {
    project_id: 'ELLARS_FRONTEND',
    idempotency_key: `key-${id}`,
    session: { context_scope: 'public_facing_umbrella' },
  },
  event_payload: {
    event_type: 'page_view',
    severity: 'LOW',
    metadata: { note: 'x'.repeat(pad) },
  },
  // Recent, so the 48-hour window does not drop it: the fixtures are read by
  // `mergeForUnload`, which applies the age filter.
  timestamp: Date.now(),
});

const ids = (records) => records.map((r) => r.telemetry_envelope.idempotency_key);

describe('the edge contract this obeys', () => {
  it('matches the handler: 50 records, and a body under its 64 KB limit', () => {
    // functions/api/telemetry.js: MAX_RECORDS = 50, MAX_BODY_BYTES = 64 * 1024.
    expect(MAX_BATCH_RECORDS).toBe(50);
    expect(MAX_BATCH_BYTES).toBeLessThan(64 * 1024);
  });

  it('measures the bytes that actually go over the wire', () => {
    const records = [record(1), record(2)];
    expect(batchBytes(records)).toBe(new TextEncoder().encode(JSON.stringify(records)).length);
  });
});

describe('selectBatch never builds a body the edge refuses', () => {
  it('takes everything when it fits', () => {
    const queue = [record(1), record(2), record(3)];
    expect(ids(selectBatch(queue))).toEqual(['key-1', 'key-2', 'key-3']);
  });

  it('keeps the newest records when the bytes do not fit, and stays under the cap', () => {
    // Ten records of ~12 KB each: 120 KB, well past the limit.
    const queue = Array.from({ length: 10 }, (_, i) => record(i, 12_000));

    const batch = selectBatch(queue);

    expect(batchBytes(batch)).toBeLessThanOrEqual(MAX_BATCH_BYTES);
    expect(batch.length).toBeGreaterThan(0);
    expect(batch.length).toBeLessThan(queue.length);
    // Freshest first-class: the tail of the queue survives, the head is deferred.
    expect(ids(batch)).toEqual(ids(queue).slice(-batch.length));
  });

  it('caps the count even when the bytes are tiny', () => {
    const queue = Array.from({ length: 80 }, (_, i) => record(i));
    expect(selectBatch(queue)).toHaveLength(MAX_BATCH_RECORDS);
  });

  it('still attempts a single record that busts the cap, so a 413 can settle it', () => {
    // Refusing client-side to send anything would leave the monster record blocking
    // the queue for every later flush.
    const queue = [record('monster', MAX_BATCH_BYTES + 1_000)];
    expect(selectBatch(queue)).toHaveLength(1);
  });

  it('is empty for an empty or malformed queue', () => {
    expect(selectBatch([])).toEqual([]);
    expect(selectBatch(null)).toEqual([]);
  });
});

describe('settleBatch: one response, one honest outcome', () => {
  const queue = [record(1), record(2), record(3)];
  const sent = [record(1), record(2)];

  it('removes exactly what was sent on a 2xx, keeping what arrived during the flight', () => {
    // The race: record 3 was enqueued while the POST was open. `[]` used to wipe it.
    const result = settleBatch({ status: 202, sent, queue });
    expect(result).toMatchObject({ retry: false, reason: 'accepted' });
    expect(ids(result.queue)).toEqual(['key-3']);
  });

  it('keeps everything when the server was busy (429 / 5xx) and asks to retry', () => {
    for (const status of [429, 500, 502, 503]) {
      const result = settleBatch({ status, sent, queue });
      expect(result).toMatchObject({ retry: true, reason: 'retryable' });
      expect(result.queue).toHaveLength(3);
    }
  });

  it('keeps everything when the request never got an answer', () => {
    const result = settleBatch({ status: null, sent, queue });
    expect(result).toMatchObject({ retry: true, reason: 'transport' });
    expect(result.queue).toHaveLength(3);
  });

  it('halves the batch on a 413 instead of resending the same oversized body', () => {
    // This is the permanent-loop fix: two records sent, the older one is dropped, the
    // newer one is retried alone — and converges.
    const result = settleBatch({ status: 413, sent, queue });
    expect(result).toMatchObject({ retry: true, reason: 'too_large' });
    expect(ids(result.queue)).toEqual(['key-2', 'key-3']);
  });

  it('converges: repeated 413s leave one record, then drop it', () => {
    let current = [record('a', 70_000), record('b', 70_000)];
    let attempts = 0;

    for (;;) {
      const batch = selectBatch(current);
      const decision = settleBatch({ status: 413, sent: batch, queue: current });
      current = decision.queue;
      attempts += 1;
      if (attempts > 10) throw new Error('did not converge');
      if (current.length <= 1) {
        // A single record that alone exceeds the cap is dropped, not retried forever.
        const last = settleBatch({ status: 413, sent: selectBatch(current), queue: current });
        expect(last.queue).toEqual([]);
        expect(last).toMatchObject({ retry: false, reason: 'too_large' });
        break;
      }
    }
    expect(attempts).toBeLessThanOrEqual(3);
  });

  it('drops a batch a 4xx refused outright, because resending cannot change it', () => {
    for (const status of [400, 403, 415]) {
      const result = settleBatch({ status, sent, queue });
      expect(result).toMatchObject({ retry: false, reason: 'rejected' });
      expect(ids(result.queue)).toEqual(['key-3']);
    }
  });

  it('treats an unknown or non-numeric status as a transport failure', () => {
    expect(settleBatch({ status: undefined, sent, queue }).retry).toBe(true);
  });
});

describe('age and unload', () => {
  it('drops records past the window, and keeps ones with no clock reading', () => {
    const now = 1_700_000_000_000;
    const queue = [
      { ...record(1), timestamp: now - MAX_RECORD_AGE_MS - 1 },
      { ...record(2), timestamp: now - 1000 },
      { ...record(3), timestamp: undefined },
    ];

    expect(ids(dropStale(queue, { now }))).toEqual(['key-2', 'key-3']);
  });

  it('merges in-flight records into the unload batch without duplicating them', () => {
    const queue = [record(1), record(2)];
    const inFlight = [record(2), record(3)];

    const merged = mergeForUnload(queue, inFlight);

    expect(ids(merged)).toEqual(['key-1', 'key-2', 'key-3']);
  });

  it('bounds the unload batch too, because sendBeacon refuses a large payload', () => {
    const queue = Array.from({ length: 10 }, (_, i) => record(i, 12_000));
    expect(batchBytes(mergeForUnload(queue, []))).toBeLessThanOrEqual(MAX_BATCH_BYTES);
  });

  it('identifies a record by its idempotency key, falling back to its serialised form', () => {
    expect(recordKey(record(1))).toBe('key-1');
    expect(recordKey({ telemetry_envelope: {} })).toBe(JSON.stringify({ telemetry_envelope: {} }));
    expect(recordKey(null)).toBe('null');
  });
});
