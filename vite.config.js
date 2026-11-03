import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { copyFile } from 'node:fs/promises';
import { VitePWA } from 'vite-plugin-pwa';

function cloudflarePagesSpaFallback() {
  return {
    name: 'cloudflare-pages-spa-fallback',
    apply: 'build',
    async closeBundle() {
      await copyFile(
        path.resolve(__dirname, 'dist/index.html'),
        path.resolve(__dirname, 'dist/200.html')
      );
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
      '@': path.resolve(__dirname, './src')
    }
  },
  server: {
    historyApiFallback: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
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
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-motion': ['framer-motion'],
          'vendor-sanitize': ['dompurify'],
          'vendor-data': ['swr', 'zustand', 'jwt-decode'],
        },
      },
    },
  },
});
