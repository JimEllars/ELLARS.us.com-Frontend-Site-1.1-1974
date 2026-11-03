import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { copyFile } from 'node:fs/promises';
import { VitePWA } from 'vite-plugin-pwa';

// Vite 8 loads this config through its native loader, where `__dirname` is not
// defined. Resolve the project root from the module URL instead, which is valid
// on every loader.
const rootDir = path.dirname(fileURLToPath(import.meta.url));

/**
 * Cloudflare Pages serves `dist/200.html` for the SPA catch-all. It must be the
 * built shell, byte for byte.
 *
 * The copy happens in `writeBundle`, not `closeBundle`. Under Rollup both ran
 * after the output was flushed; under Rolldown (Vite 8) `closeBundle` fires
 * before `dist/index.html` is on disk, so the copy threw ENOENT and the build
 * died. `writeBundle` is documented as "called after the bundle has been
 * written" and is empirically true on both bundlers (verified with an
 * existsSync probe). `generateBundle` is not an option either: Rolldown's
 * bundle object holds only the JS/CSS graph, so there is no index.html asset to
 * clone there.
 */
function cloudflarePagesSpaFallback() {
  return {
    name: 'cloudflare-pages-spa-fallback',
    apply: 'build',
    async writeBundle() {
      const shell = path.resolve(rootDir, 'dist/index.html');
      await copyFile(shell, path.resolve(rootDir, 'dist/200.html'));
    }
  };
}

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // One worker, one design: generateSW is authoritative and the hand-written
      // public/sw.js is gone. It was never deployed (the plugin overwrites it) but
      // it looked editable, so its feed/font strategies were carried into
      // workbox.runtimeCaching above instead.
      //
      // autoUpdate activates a new worker immediately (skipWaiting + clientsClaim).
      // src/lib/serviceWorker.js then reloads the tab once when it takes control —
      // or offers the prompt when audio is playing — which is what stops a client
      // being pinned to a build whose chunk hashes no longer exist.
      registerType: 'autoUpdate',
      injectRegister: false,
      includeAssets: ['favicon.svg', 'favicon-32x32.png', 'apple-touch-icon.png', 'masked-icon.svg'],
      manifest: {
        id: '/',
        name: 'James Ellars',
        short_name: 'Ellars',
        description: 'Official platform and civic command hub for James Ellars.',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait-primary',
        lang: 'en-US',
        categories: ['news', 'politics', 'education'],
        theme_color: '#050505',
        background_color: '#050505',
        // Every icon referenced here must exist in public/. The previous config
        // pointed at four files that were never committed, so installs showed a
        // blank icon and Chrome's installability audit failed.
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'pwa-maskable-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          },
          {
            src: 'masked-icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any'
          }
        ]
      },

      workbox: {
        // Declared explicitly, and that is load-bearing. vite-plugin-pwa only
        // implies these two flags for `registerType: 'autoUpdate'` when
        // `injectRegister` is 'auto' or unset (dist/index.js: `if ((injectRegister
        // === 'auto' || injectRegister == null) && registerType === 'autoUpdate')`).
        // This project sets `injectRegister: false` because registration is ours
        // (src/lib/serviceWorker.js), so the implication never fired and the
        // generated worker shipped **without** install-time skipWaiting and without
        // clientsClaim.
        //
        // Consequence, reproduced on the deployed worker in 2.16: update() finds
        // the new script, it installs, and it sits in `waiting` forever. No
        // controllerchange, so the reload branch of the update policy is dead
        // code and a visitor stays on the old build until every tab is closed —
        // the exact failure 2.10 set out to end. The Refresh prompt still worked
        // (it posts SKIP_WAITING), but only if the user noticed and clicked it.
        skipWaiting: true,
        clientsClaim: true,
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        // The social card is fetched by scrapers, never by the app, so caching it
        // in every visitor's service worker only costs install bandwidth.
        globIgnores: ['**/og-card.png'],
        runtimeCaching: [
          {
            urlPattern: /^https?:\/\/.*\/api\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              networkTimeoutSeconds: 5,
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 24 * 60 * 60 // 1 day
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: /.*\.(?:js|css)$/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'static-resources',
            }
          },
          {
            // Carried over from the hand-written public/sw.js this config
            // replaced: the intelligence feed is stale-while-revalidate so a
            // returning visitor sees dispatches instantly and the refresh lands
            // in the background.
            urlPattern: /\/wp-json\/wp\/v2\/posts.*/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'intel-feed',
              expiration: { maxEntries: 40, maxAgeSeconds: 24 * 60 * 60 }
            }
          },
          {
            urlPattern: /^https:\/\/fonts\.(?:googleapis|gstatic)\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts',
              expiration: { maxEntries: 20, maxAgeSeconds: 365 * 24 * 60 * 60 },
              cacheableResponse: { statuses: [0, 200] }
            }
          },
          {
            urlPattern: /.*\.(?:png|jpg|jpeg|svg|gif|woff2|woff)$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'image-font-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 30 * 24 * 60 * 60 // 30 days
              }
            }
          }
        ]
      }

    }),
    cloudflarePagesSpaFallback()
  ],
  base: '/',
  resolve: {
    alias: {
      '@': path.resolve(rootDir, './src')
    }
  },
  server: {
    historyApiFallback: true,
  },
  build: {
    outDir: 'dist',
    // Was `true`, which shipped ~4.0 MB of sourcemaps to the CDN for a ~900 kB
    // JS payload — the whole TypeScript/JSX source of every module, publicly
    // readable at /assets/<chunk>.js.map. Nothing consumes them: there is no
    // error-reporting service that uploads them, and the browser only fetches a
    // map when devtools is open. `hidden` would still write the files, so the only
    // value that stops the exposure is the one that emits nothing. If symbolicated
    // stack traces are ever wanted, upload maps to the error reporter at build
    // time — do not serve them from the public origin.
    sourcemap: false,
    rollupOptions: {
      output: {
        // The whole vendor graph used to be one 599 kB chunk, so any dependency
        // change invalidated the entry for every returning visitor. Splitting the
        // long-lived libraries out means the app chunk can change without
        // re-downloading React or the Supabase client.
        //
        // @supabase/supabase-js is deliberately NOT listed here. It is imported
        // dynamically in src/lib/supabase.js, so Rollup emits it as its own
        // async chunk. Naming it as a manual chunk produced an empty 0.05 kB
        // `vendor-supabase` file and left the SDK wherever it happened to land —
        // which was nowhere at all once the anon key was missing at build time.
        //
        // Function form, not an object: Rolldown (Vite 8) rejects the object
        // shape outright ("Expected Function but received Object") and then
        // silently emits a single vendor chunk, which is the regression this
        // split exists to prevent. Matching on the resolved module id keeps the
        // same four groups under both bundlers.
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (/node_modules[\\/](react|react-dom|react-router|react-router-dom)[\\/]/.test(id)) {
            return 'vendor-react';
          }
          if (/node_modules[\\/](framer-motion|motion-dom|motion-utils)[\\/]/.test(id)) {
            return 'vendor-motion';
          }
          if (/node_modules[\\/]dompurify[\\/]/.test(id)) return 'vendor-sanitize';
          if (/node_modules[\\/](swr|zustand|jwt-decode)[\\/]/.test(id)) return 'vendor-data';
          return undefined;
        },
      },
    },
  },
});
