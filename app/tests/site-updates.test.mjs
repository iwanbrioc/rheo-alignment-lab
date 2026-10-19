import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';

async function worker(path, base) {
  const handlers = new Map(), stores = new Map();
  const keyFor = request => new URL(typeof request === 'string' ? request : request.url, base).href;
  function cache(name) {
    if (!stores.has(name)) stores.set(name, new Map());
    const records = stores.get(name);
    return {
      addAll: async paths => { for (const path of paths) records.set(keyFor(path), 'precache:' + keyFor(path)); },
      put: async (request, response) => { records.set(keyFor(request), await response.text()); },
      match: async request => records.has(keyFor(request)) ? new Response(records.get(keyFor(request))) : undefined
    };
  }
  const env = {
    offline: false, requests: [], skipped: false, claimed: false,
    self: {
      location: { origin: new URL(base).origin },
      addEventListener: (name, handler) => handlers.set(name, handler),
      skipWaiting: async () => { env.skipped = true; },
      clients: { claim: async () => { env.claimed = true; } }
    },
    caches: { open: async name => cache(name), keys: async () => [...stores.keys()], delete: async name => stores.delete(name) },
    URL, Response,
    fetch: async (request, options) => {
      env.requests.push({ request, options });
      if (env.offline) throw new Error('offline');
      return new Response('latest network content');
    }
  };
  vm.runInNewContext(await readFile(new URL(path, import.meta.url), 'utf8'), env);
  const lifecycle = async name => {
    const pending = []; handlers.get(name)({ waitUntil: promise => pending.push(promise) }); await Promise.all(pending);
  };
  await lifecycle('install');
  return {
    env, stores, cache, lifecycle,
    async request(url, mode = 'navigate', method = 'GET') {
      let response; const pending = [];
      handlers.get('fetch')({ request: { url, mode, method }, waitUntil: promise => pending.push(promise), respondWith: promise => { response = promise; } });
      const result = await response; await Promise.all(pending); return result;
    }
  };
}
for (const [path, base, label] of [
  ['../sw.js', 'https://rheocracy.org/app/', 'established app'],
  ['../v04/sw.js', 'https://rheocracy.org/app/v04/', 'v0.4 app']
]) {
  test(`${label}: refreshes cached content online, then retains the refreshed copy offline`, async () => {
    const w = await worker(path, base);
    assert.equal(w.env.skipped, true);
    const online = await w.request(base);
    assert.equal(await online.text(), 'latest network content');
    assert.equal(w.env.requests[0].options.cache, 'no-cache');
    w.env.offline = true;
    assert.equal(await (await w.request(base)).text(), 'latest network content');
    assert.equal(await (await w.request(base + '?release=20261019')).text(), 'latest network content');
  });
  test(`${label}: does not intercept POSTs or cross-origin requests`, async () => {
    const w = await worker(path, base);
    assert.equal(await w.request(base, 'cors', 'POST'), undefined);
    assert.equal(await w.request('https://example.org/asset.js', 'cors'), undefined);
    assert.equal(w.env.requests.length, 0);
  });
}
test('parent worker retires v0.3 cache without deleting v0.4 or unrelated data', async () => {
  const w = await worker('../sw.js', 'https://rheocracy.org/app/');
  await w.env.caches.open('rheo-mesh-v0.3.0'); await w.env.caches.open('rheo-mesh-v04-20261019-updates'); await w.env.caches.open('other-app');
  await w.lifecycle('activate');
  assert.equal(w.stores.has('rheo-mesh-v0.3.0'), false);
  assert.equal(w.stores.has('rheo-mesh-v04-20261019-updates'), true);
  assert.equal(w.stores.has('other-app'), true);
  assert.equal(w.env.claimed, true);
});
test('v0.4 worker retires only its own older caches', async () => {
  const w = await worker('../v04/sw.js', 'https://rheocracy.org/app/v04/');
  await w.env.caches.open('rheo-mesh-v04-20261016-matrix'); await w.env.caches.open('rheo-app-shell-20261019');
  await w.lifecycle('activate');
  assert.equal(w.stores.has('rheo-mesh-v04-20261016-matrix'), false);
  assert.equal(w.stores.has('rheo-app-shell-20261019'), true);
});
test('established app entry leads to v0.4 and preserves the signed trust map', async () => {
  const entry = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  const legacy = await readFile(new URL('../v03.html', import.meta.url), 'utf8');
  assert.match(entry, /http-equiv="refresh" content="0;url=.\/v04\/"/);
  assert.match(entry, /href=".\/v03.html"/);
  assert.match(legacy, /src="mesh-ui.mjs"/);
  assert.match(legacy, /href="v04\/"/);
  const workerText = await readFile(new URL('../sw.js', import.meta.url), 'utf8');
  assert.match(workerText, /'.\/v03.html'/);
  assert.doesNotMatch(workerText, /indexedDB|localStorage|deleteDatabase/);
});
