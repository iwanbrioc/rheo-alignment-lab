import { sharedMesh, parseMesh, mergeMesh } from '../exchange.mjs';
import { validateState } from '../model.mjs';
import { encodeUTF8 } from '../encoding.mjs';
export const MAX_RECORDS = 12;
export const MAX_PAYLOAD_BYTES = 24000;
export const LIFETIME = 7 * 24 * 60 * 60 * 1000;

// Only explicitly public, real records enter the radio. No device position or My Path.
export function publicPayload(state) {
  const shared = sharedMesh(state);
  const portals = shared.portals.filter(p => !p.demo);
  const ids = new Set(portals.map(p => p.id));
  const payload = JSON.stringify(validateState({ ...shared, portals,
    links: shared.links.filter(l => !l.demo && ids.has(l.from) && ids.has(l.to)),
    sessions: shared.sessions.filter(s => !s.demo && ids.has(s.portalId)), myPath: [] }));
  if (encodeUTF8(payload).length > MAX_PAYLOAD_BYTES) throw new Error('Public map exceeds the 24 KB radio limit. Reduce shared records or use a map file.');
  return payload;
}
export function validateRecord(record, now = Date.now()) {
  if (!record || !/^[a-f0-9]{64}$/.test(record.id) || typeof record.publisher !== 'string' ||
      record.publisher.length !== 44 || typeof record.wire !== 'string' || encodeUTF8(record.wire).length > 48000 ||
      !Number.isInteger(record.hops) || record.hops < 0 || record.hops > 7 ||
      !Number.isSafeInteger(record.createdAt) || record.createdAt > now + 300000 ||
      !Number.isSafeInteger(record.expiresAt) || record.expiresAt <= now ||
      record.expiresAt <= record.createdAt || record.expiresAt - record.createdAt > LIFETIME ||
      typeof record.payload !== 'string' || encodeUTF8(record.payload).length > MAX_PAYLOAD_BYTES)
    throw new Error('Invalid or expired mesh record.');
  const state = parseMesh(record.payload);
  if (state.myPath.length || state.portals.some(p => !p.shareable || p.demo) ||
      state.links.some(l => l.demo) || state.sessions.some(s => s.demo))
    throw new Error('Radio records must contain only public, real mesh data.');
  return state;
}
const canonical = value => {
  const { received, ...rest } = value;
  return JSON.stringify(rest);
};
// Same-key revisions may update untouched received mirrors. Local edits and other publishers cannot be overwritten.
export function applyRecord(local, history, record, now = Date.now(), owners = {}) {
  const incoming = validateRecord(record, now);
  // First observed publishing keys are durable local provenance, not a reputation score.
  // A re-signed duplicate must never grant another key permission to revise a mirror.
  const knownOwners = {...owners};
  for (const older of history.filter(r => r.status === 'accepted' || r.status === 'published')) {
    const snapshot = parseMesh(older.payload);
    for (const kind of ['portals', 'links', 'sessions']) for (const item of snapshot[kind])
      knownOwners[`${kind}:${item.id}`] ??= older.publisher;
  }
  const previous = history.filter(r => r.status === 'accepted' && r.publisher === record.publisher)
    .sort((a,b) => b.createdAt - a.createdAt)[0];
  if (previous && previous.createdAt >= record.createdAt && previous.id !== record.id)
    throw new Error('An older or simultaneous publisher revision was held.');
  let base = validateState(local);
  if (previous && previous.id !== record.id) {
    const old = validateRecord(previous, now);
    const mirrors = new Set();
    const portals = base.portals.filter(p => {
      const prior = old.portals.find(v => v.id === p.id);
      if (prior && knownOwners[`portals:${p.id}`] === record.publisher && p.received && canonical({...p, shareable: true}) === canonical(prior)) {
        mirrors.add(p.id); return false;
      }
      return true;
    });
    const links = base.links.filter(l => !old.links.some(v => v.id === l.id && canonical(v) === canonical(l) && mirrors.has(v.from) && mirrors.has(v.to)));
    const sessions = base.sessions.filter(s => !old.sessions.some(v => v.id === s.id && canonical(v) === canonical(s) && mirrors.has(v.portalId)));
    // mergeMesh validates dependencies; local additions attached to a withdrawn portal hold the revision rather than being erased.
    base = { ...base, portals: [...portals, ...incoming.portals.filter(p => mirrors.has(p.id)).map(p => ({...p, received: true, shareable: false}))], links, sessions };
  }
  const merged = mergeMesh({...base, myPath: []}, incoming);
  merged.myPath = local.myPath.filter(id => merged.sessions.some(s => s.id === id));
  return validateState(merged);
}
export function retainRecords(records, now = Date.now()) {
  const seen = new Set();
  return [...records].reverse().filter(record => {
    if (seen.has(record.id) || record.expiresAt <= now) return false;
    seen.add(record.id); return true;
  }).slice(0, MAX_RECORDS).reverse();
}
export function relayWire(record) {
  if (record.hops >= 7) return null;
  const parsed = JSON.parse(record.wire);
  return JSON.stringify({...parsed, hops: record.hops + 1});
}

export function rememberOwners(owners, record) {
  const next = {...owners};
  const state = parseMesh(record.payload);
  for (const kind of ['portals','links','sessions']) for (const item of state[kind]) {
    const key = `${kind}:${item.id}`;
    if (next[key] === undefined) {
      if (Object.keys(next).length >= 2048) throw new Error('Publisher provenance store is full. Existing records were kept.');
      next[key] = record.publisher;
    }
  }
  return next;
}

export function forwardingRecords(records, offset = 0, now = Date.now()) {
  const byPublisher = new Map();
  for (const record of retainRecords(records, now).filter(r => r.status !== 'held')) {
    const previous = byPublisher.get(record.publisher);
    if (!previous || record.createdAt > previous.createdAt) byPublisher.set(record.publisher, record);
  }
  const usable = [...byPublisher.values()].sort((a,b) => b.createdAt - a.createdAt);
  const start = Math.max(0, Math.floor(offset)) % Math.max(1, usable.length);
  return [...usable.slice(start), ...usable.slice(0, start)];
}
