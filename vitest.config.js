import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * A DOM test runner, for the invariants that only exist after hydration.
 *
 * The gate has two halves that both stop at the document's bytes: `npm run probe`
 * fetches the deployment before any JavaScript runs, and the two smoke suites are
 * pure modules with no DOM. Three defects in three cycles lived in the gap —
 * 2.24's probe could not see them, and the 370 assertions could not either:
 *
 *   - canonical tags written by both the edge and the client, never reconciled
 *     (2.26): a dispatch reached from the archive advertised the homepage;
 *   - the one-shot reconciliation that ran before a data-driven `<Helmet>`
 *     existed (2.26): duplicate description, robots and og:image on every article;
 *   - `observe()` called twice on one target, so `childList` was never watched.
 *
 * Deliberately NOT the project's `vite.config.js`: that one loads the PWA plugin,
 * which generates a service worker and precache manifest at build time. A test
 * runner has no business doing either, and importing it would make the two suites
 * depend on build output. The alias table is two lines and is duplicated here.
 */
const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(rootDir, './src'),
    },
  },
  test: {
    environment: 'jsdom',
    environmentOptions: {
      jsdom: {
        // react-helmet-async commits its tags inside a requestAnimationFrame, and
        // <HeadOwnership> reconciles on the frame after a mutation. Neither fires
        // in jsdom unless it is in "visual" mode, so without this the suite would
        // assert against a head that has not been written yet and pass by timing.
        pretendToBeVisual: true,
        // The production origin, so anything that reads window.location agrees with
        // what a reader's browser reports.
        url: 'https://ellars.us.com/',
      },
    },
    // `globals` gives @testing-library/react the `afterEach` it looks for when it
    // registers its automatic cleanup. Tests still import what they use.
    globals: true,
    include: ['tests/dom/**/*.test.jsx'],
    restoreMocks: true,
    clearMocks: true,
  },
});
