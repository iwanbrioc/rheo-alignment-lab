const CACHE = 'rheo-mesh-v0.4.0';
const ASSETS = ['./', './index.html', './legacy.html', './living.css', './living-data.mjs', './living-engine.mjs', './living-ui.mjs', './mesh.css', './mesh-engine.mjs', './mesh-store.mjs', './mesh-transport.mjs', './mesh-ui.mjs', './mesh-demo.mjs', './manifest.webmanifest', './icon.svg', './lotus.svg', './guide/index.html', './guide/styles.css', './guide/app.js', './guide/app-core.js', './guide/app-analysis.js', './guide/app-report.js'];
self.addEventListener('install', event => event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS))));
self.addEventListener('activate', event => event.waitUntil(Promise.all([
  caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('rheo-') && key !== CACHE).map(key => caches.delete(key)))),
  self.clients.claim()
])));
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) return;
  event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request)));
});
