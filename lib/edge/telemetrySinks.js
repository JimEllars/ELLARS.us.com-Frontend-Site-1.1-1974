/**
 * What `/api/telemetry` says about where a batch ended up.
 *
 * The handler has answered `202 {"success":true, …}` since it was written, and for
 * most of the site's life that `202` meant nothing: all three sinks reported
 * `unbound`, so every event from every visitor was accepted and stored nowhere
 * (open item 1b). Nothing measured the difference between "accepted" and "kept",
 * which is why the gap survived so long.
 *
 * Pure: no imports, no globals, so the probe and CI assert the same reading.
 */

/** Sink states the handler can report, and what each one means. */
export const SINK_STATES = Object.freeze({
  ok: 'stored',
  unbound: 'no binding',
  error: 'binding failed',
  skipped: 'not attempted',
});

const PARTIAL = /^partial:/;

/** Is this sink state a deployment defect, as opposed to an absent configuration? */
export const isBrokenSinkState = (state) =>
  state === 'error' || PARTIAL.test(String(state ?? ''));

/** Is this sink state a working store? */
export const isLiveSinkState = (state) => state === 'ok';

/**
 * Reads the handler's `sinks` object.
 *
 * @returns {{live: string[], unbound: string[], broken: string[], degraded: boolean}}
 *   `degraded` mirrors the handler's own flag: no sink is storing anything.
 */
export const sinkVerdict = (sinks = {}) => {
  const entries = Object.entries(sinks ?? {});
  const live = entries.filter(([, state]) => isLiveSinkState(state)).map(([name]) => name);
  const unbound = entries.filter(([, state]) => state === 'unbound').map(([name]) => name);
  const broken = entries.filter(([, state]) => isBrokenSinkState(state)).map(([name]) => name);
  return { live, unbound, broken, degraded: live.length === 0 };
};

/**
 * The sentence to print under a passing check.
 *
 * Deliberately not a failure when every sink is unbound: binding D1, KV or Analytics
 * Engine is a dashboard action, not something a merge can fix, and a pipeline that
 * goes red every run for a known external gap stops being read. A broken binding —
 * one that exists and is failing — *is* a defect, and the caller fails on it.
 */
export const sinkNote = (verdict) => {
  if (verdict.live.length > 0) {
    return `stored by ${verdict.live.join(', ')}`;
  }
  if (verdict.broken.length > 0) {
    return `${verdict.broken.join(', ')} bound but failing`;
  }
  const unbound = verdict.unbound.length > 0 ? verdict.unbound.join(', ') : 'all';
  return `accepted but stored nowhere: ${unbound} unbound (open item 1b) — the queue is correct, the sink is not`;
};
