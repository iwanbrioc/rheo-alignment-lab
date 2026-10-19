// Keep the established /app/ address current, including previously installed apps.
const CACHE = 'rheo-app-shell-20261019';
const ASSETS = ['./', './index.html', './v03.html', './mesh.css', './mesh-engine.mjs', './mesh-store.mjs', './mesh-transport.mjs', './mesh-ui.mjs', './mesh-demo.mjs', './manifest.webmanifest', './icon.svg', './lotus.svg', './guide/index.html', './guide/styles.css', './guide/app.js', './guide/app-core.js', './guide/app-analysis.js', './guide/app-report.js', './v04/', './v04/index.html', './v04/style.css', './v04/app.mjs', './v04/model.mjs', './v04/bitchat-carrier.mjs', './v04/manifest.webmanifest'];
self.addEventListener('install', event => event.waitUntil(
  caches.open(CACHE).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting())
));
self.addEventListener('activate', event => event.waitUntil(Promise.all([
  caches.keys().then(keys => Promise.all(keys.filter(key =>
    (key.startsWith('rheo-app-shell-') || key.startsWith('rheo-mesh-v0.3.')) && key !== CACHE
  ).map(key => caches.delete(key)))),
  self.clients.claim()
])));
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) return;
  // Mutable app files must refresh online. Retain this app's cached shell offline.
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
