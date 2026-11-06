/**
 * One engagement score per visit — not one per component.
 *
 * ## What was wrong
 *
 * `useEngagementScoring` was a **hook**, so every component that called
 * `useTelemetry()` got its own complete copy of the scorer: its own state, its own
 * `scroll` listener, its own `ellars_engagement_signal` listener, and its own 60 s
 * timer. Measured in jsdom with six consumers mounted (the real count in `Navbar` +
 * the calculator + the playlist + the dashboard):
 *
 *     scroll listeners            6
 *     signal listeners            6
 *     sessionStorage writes       12 per signal   (6 on mount, 6 on change)
 *     re-renders per signal       6               (every consumer, for a counter)
 *
 * The cost was the smaller half of it. Each copy incremented **its own** counters and
 * then wrote the whole object to the same sessionStorage key, so the copies diverged
 * and overwrote each other: "the engagement score" was not one number, it was six, and
 * the value in a telemetry payload depended on which component happened to build it.
 * The 60 s timer made that worse in a way that is visible in the score itself — every
 * instance added the *full* elapsed time, so three minutes of reading scored as three
 * minutes after thirty seconds.
 *
 * ## What this module is
 *
 * A process-wide cell with a pure core, so there is exactly one of everything:
 *
 *  - `computeScore` / `tierFor` are pure and asserted in `npm run test:client`;
 *  - `recordSignal` mutates the one cell and persists immediately (explicit signals
 *    are low-frequency and score-relevant);
 *  - `recordScrollDepth` is **throttled**, because a reader moving down a long article
 *    produces a scroll event per pixel and each persist is a synchronous JSON write;
 *  - `getEngagement()` returns a snapshot for a payload builder to read **without
 *    subscribing**, so engagement state no longer re-renders the telemetry path;
 *  - `startEngagementTracking()` installs the listeners once, from `App`.
 *
 * Time on page is derived from a start timestamp rather than accumulated per tick.
 * The old accumulation is how six instances multiplied the clock; deriving it cannot
 * drift, and a reload inside the same session continues from the stored total.
 *
 * Nothing here subscribes a component, which is deliberate: there is no surface that
 * displays the score, and the one that needs it (telemetry) needs the value at the
 * moment a payload is built, not a render.
 */

export const SESSION_KEY = 'ellars_engagement_signals';

/** How often a scroll position may be written to sessionStorage. */
export const PERSIST_MIN_INTERVAL_MS = 1000;

export const EMPTY_SIGNALS = Object.freeze({
  timeOnPageMs: 0,
  maxScrollDepth: 0,
  calculatorInteractions: 0,
  platformExplorations: 0,
  articleCompletions: 0,
  newsletterActivations: 0,
  newsletterSubmissions: 0,
});

const COUNTERS = Object.keys(EMPTY_SIGNALS).filter((key) => key !== 'timeOnPageMs' && key !== 'maxScrollDepth');

/** Stored counters are numbers or they are not counters. */
export const sanitiseSignals = (value) => {
  const source = value && typeof value === 'object' ? value : {};
  const clean = { ...EMPTY_SIGNALS };

  for (const key of Object.keys(EMPTY_SIGNALS)) {
    const raw = source[key];
    if (typeof raw === 'number' && Number.isFinite(raw) && raw > 0) {
      clean[key] = Math.min(key === 'maxScrollDepth' ? 100 : Number.MAX_SAFE_INTEGER, raw);
    }
  }
  return clean;
};

export const readStoredSignals = () => {
  try {
    return sanitiseSignals(JSON.parse(sessionStorage.getItem(SESSION_KEY) || 'null'));
  } catch {
    return { ...EMPTY_SIGNALS };
  }
};

/**
 * The score, unchanged from the arithmetic it replaces: 20 for time, 20 for depth,
 * 60 for interactions, capped at 100. Pure, so the bands cannot drift through a
 * refactor unnoticed.
 */
export const computeScore = (signals) => {
  const s = sanitiseSignals(signals);
  let score = 0;

  if (s.timeOnPageMs > 3 * 60 * 1000) score += 20;
  else if (s.timeOnPageMs > 60 * 1000) score += 10;

  if (s.maxScrollDepth >= 80) score += 20;
  else if (s.maxScrollDepth >= 50) score += 10;

  score += Math.min(20, s.calculatorInteractions * 10);
  score += Math.min(10, s.platformExplorations * 5);
  score += Math.min(15, s.articleCompletions * 15);
  score += Math.min(10, s.newsletterActivations * 10);
  score += Math.min(25, s.newsletterSubmissions * 25);

  return Math.min(100, Math.max(0, score));
};

export const tierFor = (score) => {
  if (score >= 70) return 'STRATEGIC_HOT';
  if (score >= 30) return 'CIVIC_WARM';
  return 'OBSERVER_COLD';
};

/**
 * Which engagement signal an event name implies, if any.
 *
 * The order and the `/platform` clause are carried over **exactly** from the chain
 * this replaces, including the odd part: on `/platform`, any event that is not a
 * calculator event counts as a platform exploration, so a `page_view` there scores.
 * That is preserved rather than corrected, because changing it would change the
 * scoring of every visit already recorded; it is recorded as an open item instead.
 */
export const signalForEvent = (eventName, pathname) => {
  if (eventName === 'calculator_interaction' || eventName === 'calculator_update') {
    return 'calculator_interaction';
  }
  if (eventName === 'platform_click' || eventName === 'platform_exploration' || pathname === '/platform') {
    return 'platform_click';
  }
  if (eventName === 'newsletter_activation' || eventName === 'newsletter_modal_open') {
    return 'newsletter_activation';
  }
  if (eventName === 'newsletter_submission' || eventName === 'newsletter_success') {
    return 'newsletter_submission';
  }
  if (eventName === 'article_completion' || eventName === 'article_read') {
    return 'article_completion';
  }
  return null;
};

// ---------------------------------------------------------------------------
// The cell
// ---------------------------------------------------------------------------

let signals = readStoredSignals();
let baseTimeOnPageMs = signals.timeOnPageMs;
let startedAt = Date.now();
let lastPersistedAt = 0;
let teardown = null;

const timeOnPageMs = () => baseTimeOnPageMs + Math.max(0, Date.now() - startedAt);

/** The object that goes into a payload. A copy: a caller cannot mutate the cell. */
export const getEngagement = () => {
  const snapshot = { ...signals, timeOnPageMs: timeOnPageMs() };
  const score = computeScore(snapshot);
  return { score, tier: tierFor(score), signals: snapshot };
};

const persist = (now, force) => {
  if (!force && now - lastPersistedAt < PERSIST_MIN_INTERVAL_MS) return false;
  lastPersistedAt = now;
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({ ...signals, timeOnPageMs: timeOnPageMs() }));
  } catch {
    // A full or disabled sessionStorage is not a reason to break a page.
  }
  return true;
};

/** An explicit signal: low frequency, score-relevant, written immediately. */
export const recordSignal = (type) => {
  const counter = {
    calculator_interaction: 'calculatorInteractions',
    platform_click: 'platformExplorations',
    article_completion: 'articleCompletions',
    newsletter_activation: 'newsletterActivations',
    newsletter_submission: 'newsletterSubmissions',
  }[type];

  if (!counter) return false;
  signals = { ...signals, [counter]: signals[counter] + 1 };
  persist(Date.now(), true);
  return true;
};

/**
 * A scroll position. The in-memory peak is exact — the payload reports the real
 * depth — but the write is throttled, because a synchronous JSON write per pixel is
 * the cost this cycle exists to remove. A trailing flush on `pagehide` keeps the last
 * reading from being lost when a reader leaves mid-article.
 */
export const recordScrollDepth = (depth, now = Date.now()) => {
  const clamped = Math.max(0, Math.min(100, Math.round(depth)));
  if (!Number.isFinite(clamped) || clamped <= signals.maxScrollDepth) return false;

  signals = { ...signals, maxScrollDepth: clamped };
  return persist(now, false);
};

/** Install the listeners once. Returns a teardown, so StrictMode can mount twice. */
export const startEngagementTracking = () => {
  if (teardown) return teardown;

  const handleScroll = () => {
    const viewportHeight = window.innerHeight;
    const documentHeight = document.documentElement.scrollHeight;
    if (!documentHeight) return; // jsdom, and a page with no content
    const bottom = window.scrollY + viewportHeight;
    recordScrollDepth((bottom / documentHeight) * 100);
  };

  const flush = () => persist(Date.now(), true);

  window.addEventListener('scroll', handleScroll, { passive: true });
  window.addEventListener('pagehide', flush);
  document.addEventListener('visibilitychange', flush);

  const stop = () => {
    window.removeEventListener('scroll', handleScroll);
    window.removeEventListener('pagehide', flush);
    document.removeEventListener('visibilitychange', flush);
    teardown = null;
  };
  teardown = stop;
  return stop;
};

/** Start from a known state. For tests; never called in production. */
export const resetEngagementScoring = () => {
  if (teardown) teardown();
  signals = { ...EMPTY_SIGNALS };
  baseTimeOnPageMs = 0;
  startedAt = Date.now();
  lastPersistedAt = 0;
};
