// Bumped when the framework or asset layout changes: activating the new worker deletes older caches.
const CACHE_NAME = 'mylkio-cache-v4';

const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/icon.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch(() => {
        // Continue even if some individual resources fail to precache
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key.startsWith('mylkio-cache-') && key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  // Authenticated responses and confirmation links must never enter the PWA cache.
  if (url.origin !== self.location.origin || url.pathname.startsWith('/api/') || url.pathname.startsWith('/auth/')) return;
  if (!(url.pathname === '/' || url.pathname === '/manifest.json' || url.pathname === '/icon.svg' || url.pathname.startsWith('/_next/static/'))) return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200 && !networkResponse.headers.get('Cache-Control')?.includes('no-store')) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // If offline and request is an HTML page navigation, fallback to root cached response
          if (event.request.mode === 'navigate') {
            return caches.match('/');
          }
          return cachedResponse;
        });

      return cachedResponse || fetchPromise;
    })
  );
});

// The page tells the worker which scripts, styles and fonts it loaded (they loaded before the worker took control,
// so they never passed through it). Saving them is what lets a phone open the app with no internet right after
// its first visit. Only same-origin /_next/static/ files are accepted.
self.addEventListener('message', (event) => {
  const data = event.data;
  if (!data || data.type !== 'CACHE_URLS' || !Array.isArray(data.urls)) return;
  const urls = data.urls
    .filter((u) => typeof u === 'string' && u.startsWith('/_next/static/') && u.length < 500)
    .slice(0, 200);
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      Promise.all(urls.map((u) => cache.match(u).then((hit) => hit || cache.add(u)).catch(() => {})))
    )
  );
});
