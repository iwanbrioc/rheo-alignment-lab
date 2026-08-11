const CACHE='rheo-v0.3.1-ui2';
const ASSETS=['./','./index.html','./styles.css','./app.js','./app-core.js','./app-analysis.js','./app-report.js','./model.js','./manifest.webmanifest','./icon.svg'];

self.addEventListener('install',e=>{
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)));
});

self.addEventListener('activate',e=>{
  e.waitUntil(Promise.all([
    caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))),
    self.clients.claim()
  ]));
});

self.addEventListener('fetch',e=>{
  const url=new URL(e.request.url);
  if(url.pathname.startsWith('/api/')) return;

  // Prefer the live local/server copy so UI wording and scripts do not remain
  // stuck behind an older service-worker cache. Fall back to cache offline.
  if(e.request.mode==='navigate' || ['document','script','style'].includes(e.request.destination)){
    e.respondWith(fetch(e.request).then(response=>{
      const copy=response.clone();
      caches.open(CACHE).then(c=>c.put(e.request,copy));
      return response;
    }).catch(()=>caches.match(e.request)));
    return;
  }

  e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request)));
});
