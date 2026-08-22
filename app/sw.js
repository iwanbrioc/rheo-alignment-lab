const CACHE='rheo-v0.6-action-outcome2';
const ASSETS=['./','./index.html','./styles.css','./flow.css','./interview.css','./action-outcome.css','./app.js','./app-core.js','./flow-ui.js','./app-analysis.js','./app-report.js','./model.js','./interview-ui.js','./interview-compat.js','./action-outcome-ui.js','./v06-shell.js','./voice.js','./manifest.webmanifest','./icon.svg'];

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
