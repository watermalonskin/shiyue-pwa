const CACHE_NAME = 'shiyue-pwa-shell-v1';
const APP_SCOPE = self.registration.scope;
const APP_SHELL = [
  new URL('./', APP_SCOPE).href,
  new URL('./index.html', APP_SCOPE).href,
  new URL('./styles.css', APP_SCOPE).href,
  new URL('./app.js', APP_SCOPE).href,
  new URL('./manifest.webmanifest', APP_SCOPE).href,
  new URL('./icons/icon.svg', APP_SCOPE).href
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key.startsWith('shiyue-pwa-shell-') && key !== CACHE_NAME).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const requestUrl = new URL(request.url);
  if (requestUrl.origin !== self.location.origin || !requestUrl.href.startsWith(APP_SCOPE)) return;

  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        return await fetch(request);
      } catch {
        return (await caches.match(new URL('./index.html', APP_SCOPE).href))
          || (await caches.match(new URL('./', APP_SCOPE).href))
          || Response.error();
      }
    })());
    return;
  }

  event.respondWith((async () => {
    const cached = await caches.match(request);
    if (cached) return cached;
    const response = await fetch(request);
    if (response.ok && response.type === 'basic') {
      const cache = await caches.open(CACHE_NAME);
      await cache.put(request, response.clone());
    }
    return response;
  })());
});
