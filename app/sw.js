const CACHE='rheo-v0.3';
const ASSETS=['./','./index.html','./styles.css','./app.js','./app-core.js','./app-analysis.js','./app-report.js','./model.js','./manifest.webmanifest','./icon.svg'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS))));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))))));
self.addEventListener('fetch',e=>{
  const url=new URL(e.request.url);
  if(url.pathname.startsWith('/api/')) return;
  e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request)));
});
