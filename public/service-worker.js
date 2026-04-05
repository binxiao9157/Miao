const CACHE_NAME = 'miao-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
    ))
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Cache First for media
  if (url.pathname.match(/\.(png|jpg|jpeg|gif|mp4)$/)) {
    event.respondWith(
      caches.match(event.request).then((response) => response || fetch(event.request).then((networkResponse) => {
        const cacheCopy = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, cacheCopy));
        return networkResponse;
      }))
    );
    return;
  }

  // Network First for data
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(event.request).then((networkResponse) => {
        const cacheCopy = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, cacheCopy));
        return networkResponse;
      }).catch(() => caches.match(event.request))
    );
    return;
  }

  // Default: Network First
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
