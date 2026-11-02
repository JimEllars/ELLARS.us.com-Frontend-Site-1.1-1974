/**
 * Service-worker update policy.
 *
 * Pure decisions, no DOM and no imports, so they can be asserted in CI without a
 * browser. The wiring lives in ./serviceWorker.js.
 *
 * The failure this policy exists to prevent, observed live: a client kept a
 * build from three releases earlier because its worker served a precached
 * index.html, that document referenced a chunk hash which had been deleted, and
 * the navigation route happily returned the SPA shell for it. Result: a blank
 * page, no explanation, and no recovery short of clearing site data.
 */

export const RELOAD_MARKER = 'ellars_sw_reloaded_at';

/**
 * What to do when the service worker controlling the page has been replaced.
 *
 * @param {object} input
 * @param {boolean} input.hadController  there was already a controller, so this
 *                                       is an update rather than a first install
 * @param {boolean} input.audioPlaying   the global audio player is mid-track
 * @param {boolean} input.alreadyReloaded this tab has already reloaded once for
 *                                       an update (loop guard)
 * @returns {'ignore'|'reload'|'prompt'}
 */
export const decideOnControllerChange = ({ hadController, audioPlaying, alreadyReloaded }) => {
  // First install: the page was rendered by the network, not by a worker. There
  // is nothing stale to replace, and reloading would be an unexplained flash.
  if (!hadController) return 'ignore';

  // A reload loop is worse than a stale page: one reload per tab, then the user
  // gets the prompt and decides.
  if (alreadyReloaded) return 'prompt';

  // Never cut audio. The station is a flagship surface; a new version can wait
  // for a click.
  if (audioPlaying) return 'prompt';

  return 'reload';
};

/**
 * Whether the registration is already on the current build.
 * Workers activate immediately (workbox skipWaiting + clientsClaim), so a
 * registration without `waiting`/`installing` is up to date.
 */
export const isRegistrationCurrent = (registration) =>
  Boolean(registration) && !registration.installing && !registration.waiting;

export default decideOnControllerChange;
