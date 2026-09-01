const CACHE_NAME = 'ellars-us-com-v1.1';

const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/favicon.svg',
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS);
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      ).catch(() => {});
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Only cache GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  const url = new URL(event.request.url);

  // Stale-While-Revalidate for Intelligence Feeds (/wp-json/wp/v2/posts*)
  if (url.pathname.includes('/wp-json/wp/v2/posts')) {
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) => {
        return cache.match(event.request).then((cachedResponse) => {
          const fetchPromise = fetch(event.request).then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              cache.put(event.request, networkResponse.clone());
            }
            return networkResponse;
          }).catch(() => {
            // Ignore fetch errors in background if we have cache
          });

          return cachedResponse || fetchPromise;
        });
      })
    );
    return;
  }

  // Try network first, then cache for other requests
  event.respondWith(
    fetch(event.request).then((response) => {
      // If we got a valid response, clone it and put it in cache
      if (!response || response.status !== 200 || response.type !== 'basic') {
        return response;
      }

      const responseToCache = response.clone();
      caches.open(CACHE_NAME).then((cache) => {
        cache.put(event.request, responseToCache);
      });

      return response;
    }).catch(() => {
      return caches.match(event.request).then((response) => {
        if (response) {
          return response;
        }
        // Fallback for navigation requests (HTML pages)
        if (event.request.mode === 'navigate') {
          return caches.match('/');
        }
      });
    })
  );
});