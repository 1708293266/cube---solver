const CACHE_NAME = 'rubiks-solver-pwa-v2';
const APP_SCOPE = self.registration.scope;
const STATIC_ASSETS = [
  APP_SCOPE,
  new URL('manifest.webmanifest', APP_SCOPE).href,
  new URL('app-icon.svg', APP_SCOPE).href,
  new URL('pwa-192.png', APP_SCOPE).href,
  new URL('pwa-512.png', APP_SCOPE).href,
];

const normalizeSameOriginUrl = rawUrl => {
  try {
    const url = new URL(rawUrl, APP_SCOPE);
    return url.origin === self.location.origin ? url.href : null;
  } catch {
    return null;
  }
};

const cacheUrls = urls => caches.open(CACHE_NAME).then(cache => {
  const sameOriginUrls = [...new Set(urls.map(normalizeSameOriginUrl).filter(Boolean))];
  return cache.addAll(sameOriginUrls);
});

self.addEventListener('install', event => {
  event.waitUntil(
    cacheUrls(STATIC_ASSETS)
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('message', event => {
  if (!event.data || event.data.type !== 'CACHE_URLS' || !Array.isArray(event.data.urls)) return;

  event.waitUntil(cacheUrls(event.data.urls));
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
          return response;
        })
        .catch(() => caches.match(request).then(cached => cached || caches.match(APP_SCOPE))),
    );
    return;
  }

  event.respondWith(
    caches.match(request).then(cached => {
      const network = fetch(request)
        .then(response => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => cached);

      return cached || network;
    }),
  );
});
