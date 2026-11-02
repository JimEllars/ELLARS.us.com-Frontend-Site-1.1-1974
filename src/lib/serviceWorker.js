import { useAppStore } from '@/store/useAppStore';
import { RELOAD_MARKER, decideOnControllerChange } from './swPolicy';

/**
 * Service-worker registration and update handshake.
 *
 * Previous behaviour: a bare `navigator.serviceWorker.register('/sw.js')` on
 * load, no explicit update check, and a `updatefound` listener that set a store
 * flag nothing rendered (`<UpdatePrompt />` is mounted nowhere). Combined with a
 * workbox NavigationRoute bound to a precached `index.html`, a returning visitor
 * could be pinned to an old build indefinitely — and once that build's chunk
 * hashes were deleted, the page was simply blank.
 *
 * Now: check for a new worker on load and whenever the tab becomes visible, and
 * reload once when a new worker actually takes control — unless audio is playing,
 * in which case the user is offered the prompt instead.
 */

const UPDATE_CHECK_THROTTLE_MS = 5 * 60 * 1000;

export const registerServiceWorker = () => {
  if (!('serviceWorker' in navigator)) return;
  if (!import.meta.env.PROD) return; // never serve a cached dev shell

  const start = async () => {
    let registration;
    try {
      // updateViaCache: 'none' — /sw.js is served no-store, but this also stops
      // the browser reusing an HTTP-cached copy of the worker script itself,
      // which is how a stale worker outlives several deploys.
      registration = await navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' });
    } catch (error) {
      console.warn('[PWA] Service worker registration failed:', error);
      return;
    }

    const hadController = Boolean(navigator.serviceWorker.controller);
    let lastCheck = Date.now();

    const checkForUpdate = () => {
      const now = Date.now();
      if (now - lastCheck < UPDATE_CHECK_THROTTLE_MS) return;
      lastCheck = now;
      registration.update().catch(() => {
        /* offline or throttled: the next visibility change retries */
      });
    };

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') checkForUpdate();
    });
    window.addEventListener('online', checkForUpdate);

    registration.addEventListener('updatefound', () => {
      const installing = registration.installing;
      if (!installing) return;
      installing.addEventListener('statechange', () => {
        if (installing.state === 'installed' && navigator.serviceWorker.controller) {
          useAppStore.getState().setUpdateAvailable(true);
        }
      });
    });

    navigator.serviceWorker.addEventListener('controllerchange', () => {
      const alreadyReloaded = sessionStorage.getItem(RELOAD_MARKER) === 'true';
      const decision = decideOnControllerChange({
        hadController,
        audioPlaying: useAppStore.getState().audioIsPlaying,
        alreadyReloaded,
      });

      if (decision === 'prompt') {
        useAppStore.getState().setUpdateAvailable(true);
        return;
      }
      if (decision === 'reload') {
        sessionStorage.setItem(RELOAD_MARKER, 'true');
        window.location.reload();
      }
    });
  };

  if (document.readyState === 'complete') start();
  else window.addEventListener('load', start, { once: true });
};

export default registerServiceWorker;
