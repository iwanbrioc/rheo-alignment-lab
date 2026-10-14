import { createIdentity, signEvent, mergeEvents, readPacket, sharedPacket, verifyEvent } from './mesh-engine.mjs';
const DB = 'rheo-mesh-v1';
export class MeshStore extends EventTarget {
  constructor() { super(); this.events = []; this.identity = null; this.queue = Promise.resolve(); }
  async open() {
    this.db = await new Promise((resolve, reject) => {
      const request = indexedDB.open(DB, 1);
      request.onupgradeneeded = () => { request.result.createObjectStore('state'); };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(new Error('Device storage could not be opened.'));
    });
    // Identity creation holds the browser-wide lock; two tabs cannot generate competing identities.
    await this.lock(async () => {
      let identity = await this.get('identity');
      if (!identity) identity = await this.installIdentity(await createIdentity());
      this.identity = identity;
      this.events = await this.get('events') || [];
      this.relationships = await this.get('relationships') || [];
      for (const event of this.events) await verifyEvent(event);
    });
    if (typeof BroadcastChannel !== 'undefined') {
      this.channel = new BroadcastChannel(DB);
      this.channel.onmessage = async () => { const identity = await this.get('identity'); if (!identity || identity.actor !== this.identity.actor) { location.reload(); return; } this.events = await this.get('events') || []; this.relationships = await this.get('relationships') || []; this.dispatchEvent(new Event('change')); };
    }
    return this;
  }
  async lock(fn) {
    if (navigator.locks) return navigator.locks.request(DB, fn);
    // IDB transaction below still makes event merges atomic without Web Locks.
    const task = this.queue.then(fn); this.queue = task.catch(() => {}); return task;
  }
  installIdentity(candidate) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('state', 'readwrite'), state = tx.objectStore('state');
      let chosen; const read = state.get('identity');
      read.onsuccess = () => { chosen = read.result || candidate; if (!read.result) state.put(chosen, 'identity'); };
      tx.oncomplete = () => resolve(chosen); tx.onerror = () => reject(tx.error); tx.onabort = () => reject(tx.error);
    });
  }
  get(key) {
    return new Promise((resolve, reject) => {
      const req = this.db.transaction('state').objectStore('state').get(key);
      req.onsuccess = () => resolve(req.result); req.onerror = () => reject(req.error);
    });
  }
  put(key, value) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('state', 'readwrite');
      tx.objectStore('state').put(value, key);
      tx.oncomplete = resolve; tx.onerror = () => reject(tx.error); tx.onabort = () => reject(tx.error);
    });
  }
  commit(incoming) {
    return this.lock(() => new Promise((resolve, reject) => {
      const tx = this.db.transaction('state', 'readwrite');
      const store = tx.objectStore('state');
      let merged, failure;
      const req = store.get('events');
      req.onsuccess = () => {
        try { merged = mergeEvents(req.result || [], incoming); store.put(merged, 'events'); }
        catch (error) { failure = error; tx.abort(); }
      };
      tx.oncomplete = () => { this.events = merged; this.channel?.postMessage('changed'); this.dispatchEvent(new Event('change')); resolve(merged); };
      tx.onerror = () => reject(failure || tx.error); tx.onabort = () => reject(failure || tx.error);
    }));
  }
  async add(kind, body) { const event = await signEvent(this.identity, kind, body); await this.commit([event]); return event; }
  async import(text) {
    const incoming = await readPacket(text);
    const oldIds = new Set(this.events.map(e => e.id));
    await this.commit(incoming);
    return incoming.filter(e => !oldIds.has(e.id)).length;
  }
  async trustRelationship(relationship) {
    await this.lock(async () => {
      const relationships = await this.get('relationships') || [];
      this.relationships = relationships.filter(r => !(r.actor === relationship.actor && r.scope === relationship.scope && r.recordId === relationship.recordId));
      this.relationships.push(relationship);
      await this.put('relationships', this.relationships);
    });
    this.channel?.postMessage('changed'); this.dispatchEvent(new Event('change'));
  }
  async removeRelationship(actor, scope, recordId) {
    await this.lock(async () => {
      this.relationships = (await this.get('relationships') || []).filter(r => !(r.actor === actor && r.scope === scope && r.recordId === recordId));
      await this.put('relationships', this.relationships);
    });
    this.channel?.postMessage('changed'); this.dispatchEvent(new Event('change'));
  }
  export() { return JSON.stringify(sharedPacket(this.events), null, 2); }
  async clear() {
    await this.lock(async () => {
      const tx = this.db.transaction('state', 'readwrite'); tx.objectStore('state').clear();
      await new Promise((resolve, reject) => { tx.oncomplete = resolve; tx.onerror = () => reject(tx.error); });
    });
    this.channel?.postMessage('changed');
    location.reload();
  }
}
