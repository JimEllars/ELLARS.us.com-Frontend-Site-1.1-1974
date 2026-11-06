/**
 * One navigation, one `page_view`.
 *
 * ## What was wrong
 *
 * `useTelemetry` emitted `page_view` from an effect keyed on the **identities** of
 * `createTelemetryPayload` and `dispatchTelemetry`. Those callbacks were rebuilt
 * whenever the engagement score moved, because `createTelemetryPayload` closed over
 * `score`, `tier` and `signals` — and `signals` is a fresh object for every scroll
 * position deeper than the last. So the effect re-ran on scroll, and a reader moving
 * down a long dispatch produced a page view per scroll tick.
 *
 * Two multipliers sat on top of that:
 *
 *  - every component that calls `useTelemetry()` ran its own copy of the effect, so
 *    one navigation produced one page view **per consumer** — three in `Navbar`
 *    alone (search, donate, newsletter), plus the calculator, the playlist and the
 *    dashboard's status panel;
 *  - a page view is enqueued into a **50-record** queue (`telemetryQueue.js`), so the
 *    flood evicted the records that carry information — `api_failure` — and the
 *    queue's bound became an eviction policy for diagnostics.
 *
 * Measured in jsdom against the unfixed hook: two consumers, one calculator
 * interaction → **two extra page views** (one each); six interactions → six. The
 * scroll path could not be modelled there (jsdom has no layout, so `scrollHeight` is
 * 0 and the depth handler returns early) — which is why the decision below is
 * asserted on its own, and the DOM suite asserts only what jsdom can see.
 *
 * ## The rule
 *
 * A page view belongs to a **history entry**, not to a component and not to a
 * render. React Router stamps every entry with a `key` that is stable across
 * re-renders and across consumers, and differs for a navigation — including a
 * navigation *back* to a page visited earlier. So the gate admits the first claim
 * for a key and refuses the rest, and `resetPageViewGate()` exists for tests and for
 * a hot reload to start from a known state.
 *
 * Deliberately not keyed on `pathname`: two entries can share a path (back/forward),
 * and a reader who returns to an article has taken a second look at it. The entry
 * key distinguishes them; the path would collapse them.
 */

/** No entry has been claimed yet. */
export const INITIAL_GATE = Object.freeze({ key: null });

/**
 * The identity of the history entry a location belongs to.
 *
 * A location without a key (an older router, or a hand-built test location) falls
 * back to the path, which is weaker — one page view per path rather than per visit —
 * but still refuses to emit per consumer.
 */
export const navigationKey = (location) => {
  const key = location?.key;
  if (typeof key === 'string' && key.length > 0) return key;
  return `path:${location?.pathname || '/'}`;
};

/**
 * Whether to emit, and the gate to carry forward. Pure: no clock, no globals, so
 * every branch is asserted in CI.
 */
export const advanceGate = (gate, key) => {
  const current = gate || INITIAL_GATE;
  if (!key) return { gate: current, emit: false };
  return { gate: { key }, emit: current.key !== key };
};

/**
 * The process-wide gate.
 *
 * Every `useTelemetry()` instance reads the same cell, which is what makes the
 * count per entry rather than per component. Module scope is the narrowest lifetime
 * that is shared by every consumer on the page; it is not persisted, so a fresh
 * document starts empty — correct, because a reload is a new page view.
 */
let shared = INITIAL_GATE;

/** Claim the page view for `location`'s entry. True for exactly one caller. */
export const claimPageView = (location) => {
  const outcome = advanceGate(shared, navigationKey(location));
  shared = outcome.gate;
  return outcome.emit;
};

/** Start from a known state. For tests and hot reload; never called in production. */
export const resetPageViewGate = () => {
  shared = INITIAL_GATE;
};
