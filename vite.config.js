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
    sourcemap: true
  },
});
