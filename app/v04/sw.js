const CACHE = 'rheo-mesh-v04-20261019-updates';
const ASSETS = ['./', './index.html', './style.css', './app.mjs', './model.mjs', './bitchat-carrier.mjs', './manifest.webmanifest'];
self.addEventListener('install', event => event.waitUntil(
  caches.open(CACHE).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting())
));
self.addEventListener('activate', event => event.waitUntil(Promise.all([
  caches.keys().then(keys => Promise.all(keys.filter(key =>
    key.startsWith('rheo-mesh-v04-') && key !== CACHE
  ).map(key => caches.delete(key)))),
  self.clients.claim()
])));
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    try {
      const response = await fetch(event.request, { cache: 'no-cache' });
      if (response.ok) event.waitUntil(cache.put(event.request, response.clone()).catch(() => {}));
      return response;
    } catch {
      const cached = await cache.match(event.request) ||
        (event.request.mode === 'navigate' ? await cache.match(url.origin + url.pathname) : null);
      return cached || Response.error();
    }
  })());
});
