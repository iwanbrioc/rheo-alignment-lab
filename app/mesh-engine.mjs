/** Transport-independent Rheo rules. No AI, price, person score or hidden ranking. */
export const CATEGORIES = ['Essentials', 'Belonging', 'Learning', 'Creativity', 'Nature', 'Purpose'];
export const HORIZONS = [
  ['Natural environment', 'Re-enchantment', 'Resources'], ['Culture', 'Transformation', 'Values'],
  ['Infrastructure', 'Creativity', 'Affordance'], ['Society', 'Dialogue', 'Support'],
  ['Outer self', 'Curiosity', 'Capacity'], ['Inner self', 'Participation', 'Wellbeing'],
  ['No self', 'Nothing / Everything', 'Everything / Nothing']
];
export const MAX_EVENTS = 4000;
export const MAX_PACKET_BYTES = 2_000_000;
const encoder = new TextEncoder();
export function canonical(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  return '{' + Object.keys(value).sort().map(k => JSON.stringify(k) + ':' + canonical(value[k])).join(',') + '}';
}
export function bytes(value) { return encoder.encode(canonical(value)); }
const validText = (v, max = 2000) => typeof v === 'string' && v.length > 0 && v.length <= max;
const date = v => typeof v === 'string' && /^\d{4}-\d\d-\d\dT/.test(v) && Number.isFinite(Date.parse(v));
export function validateEvent(event) {
  if (!event || canonical(event).length > 18000) throw new Error('Invalid or oversized event.');
  if (event.v !== 1 || !validText(event.id, 80) || !validText(event.actor, 80) || !date(event.at)) throw new Error('Invalid event envelope.');
  if (!['offer', 'attestation', 'outcome', 'retract'].includes(event.kind)) throw new Error('Unknown event type.');
  if (!event.key || event.key.kty !== 'EC' || event.key.crv !== 'P-256' || !validText(event.key.x, 80) || !validText(event.key.y, 80) || event.key.d) throw new Error('Invalid public key.');
  if (!validText(event.signature, 200)) throw new Error('Missing signature.');
  const b = event.body;
  if (!b || !['private', 'shared'].includes(b.visibility)) throw new Error('Sharing choice required.');
  if (event.kind === 'offer') {
    if (!validText(b.recordId, 80) || !validText(b.title, 100) || !validText(b.description) || !CATEGORIES.includes(b.category)) throw new Error('Invalid opportunity.');
    if (!b.parents?.length && b.recordId !== event.id) throw new Error('Creation ID must identify the record.');
    if (!Array.isArray(b.parents) || b.parents.length > 20 || b.parents.some(p => !validText(p, 80))) throw new Error('Invalid revision history.');
    if (!b.location || !Number.isFinite(b.location.lat) || Math.abs(b.location.lat) > 90 || !Number.isFinite(b.location.lon) || Math.abs(b.location.lon) > 180 || !validText(b.location.label, 120)) throw new Error('Valid GPS coordinates and a place label are required.');
    if (b.location.w3w && !/^[^\s.]+\.[^\s.]+\.[^\s.]+$/.test(b.location.w3w)) throw new Error('Use three words separated by dots.');
    if (!date(b.expires) || !['open', 'ask'].includes(b.access) || !['active', 'paused'].includes(b.status)) throw new Error('Invalid availability.');
    if (!Number.isInteger(b.capacity) || b.capacity < 0 || b.capacity > 10000) throw new Error('Invalid capacity.');
    for (const field of ['conditions', 'care', 'purpose', 'steward']) if (!validText(b[field], 2000)) throw new Error('Missing ' + field + '.');
    if (!Array.isArray(b.needs) || b.needs.length > 20 || b.needs.some(n => !validText(n, 100))) throw new Error('Invalid enabling conditions.');
    if (!Array.isArray(b.dependencies) || b.dependencies.length > 20 || b.dependencies.some(n => !validText(n, 80))) throw new Error('Invalid dependencies.');
  } else if (event.kind === 'attestation') {
    if (!validText(b.target, 80) || !['availability', 'care', 'skill'].includes(b.scope) || !['confirmed', 'concern'].includes(b.verdict) || !validText(b.note) || !date(b.expires)) throw new Error('Invalid contextual trust record.');
  } else if (event.kind === 'outcome') {
    if (!validText(b.target, 80) || !validText(b.note) || !['participated', 'repaired', 'unavailable'].includes(b.result)) throw new Error('Invalid participation record.');
  } else if (!validText(b.target, 80)) throw new Error('Invalid withdrawal.');
  return event;
}
function payload(event) { const { signature, ...signed } = event; return signed; }
export function base64url(data) {
  return btoa(String.fromCharCode(...new Uint8Array(data))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function unbase64(text) { const s = atob(text.replace(/-/g, '+').replace(/_/g, '/')); return Uint8Array.from(s, c => c.charCodeAt(0)); }
export async function actorFor(key, cryptoApi = globalThis.crypto) {
  return base64url(await cryptoApi.subtle.digest('SHA-256', bytes({ kty: key.kty, crv: key.crv, x: key.x, y: key.y })));
}
export async function createIdentity(cryptoApi = globalThis.crypto) {
  const keys = await cryptoApi.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign', 'verify']);
  const key = await cryptoApi.subtle.exportKey('jwk', keys.publicKey);
  return { actor: await actorFor(key, cryptoApi), key, privateKey: keys.privateKey };
}
export async function signEvent(identity, kind, body, cryptoApi = globalThis.crypto) {
  const event = { v: 1, id: cryptoApi.randomUUID(), actor: identity.actor, key: identity.key, at: new Date().toISOString(), kind, body };
  if (kind === 'offer' && !body.parents.length) event.id = body.recordId;
  event.signature = base64url(await cryptoApi.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, identity.privateKey, bytes(event)));
  return validateEvent(event);
}
export async function verifyEvent(event, cryptoApi = globalThis.crypto) {
  validateEvent(event);
  if (event.actor !== await actorFor(event.key, cryptoApi)) throw new Error('Author fingerprint does not match the key.');
  const publicKey = await cryptoApi.subtle.importKey('jwk', event.key, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']);
  if (!await cryptoApi.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, publicKey, unbase64(event.signature), bytes(payload(event)))) throw new Error('Signature verification failed.');
  return event;
}
export function mergeEvents(left, right) {
  const byId = new Map();
  for (const e of [...left, ...right]) {
    if (byId.has(e.id) && canonical(byId.get(e.id)) !== canonical(e)) throw new Error('Conflicting event IDs; nothing imported.');
    byId.set(e.id, e);
  }
  if (byId.size > MAX_EVENTS) throw new Error('Local event capacity reached.');
  return [...byId.values()].sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
}
export function materialize(events, now = Date.now()) {
  const byId = new Map(events.map(e => [e.id, e]));
  const withdrawn = new Set(events.filter(e => e.kind === 'retract' && byId.get(e.body.target)?.actor === e.actor).map(e => e.body.target));
  const groups = new Map();
  for (const e of events.filter(e => e.kind === 'offer')) {
    // The record ID names the creation event; another device cannot rewrite it.
    const root = byId.get(e.body.recordId);
    if (!root || root.kind !== 'offer' || root.body.parents.length || root.actor !== e.actor || root.body.visibility !== e.body.visibility) continue;
    if (!groups.has(e.body.recordId)) groups.set(e.body.recordId, []);
    groups.get(e.body.recordId).push(e);
  }
  const offers = [];
  for (const [id, revisions] of groups) {
    const accepted = new Set(revisions.filter(e => !e.body.parents.length).map(e => e.id));
    let changed = true;
    while (changed) {
      changed = false;
      for (const e of revisions) if (!accepted.has(e.id) && e.body.parents.every(p => accepted.has(p)) && e.body.parents.length) { accepted.add(e.id); changed = true; }
    }
    const valid = revisions.filter(e => accepted.has(e.id));
    const referenced = new Set(valid.flatMap(e => e.body.parents));
    const heads = valid.filter(e => !referenced.has(e.id)).sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
    if (!heads.length) continue;
    const revision = heads[0];
    const history = new Set(valid.map(e => e.id));
    const evidence = events.filter(e => !withdrawn.has(e.id) && history.has(e.body.target) && ['attestation', 'outcome'].includes(e.kind));
    const current = evidence.filter(e => e.body.target === revision.id && (e.kind !== 'attestation' || Date.parse(e.body.expires) > now));
    offers.push({ ...revision.body, id, actor: revision.actor, revision: revision.id, updatedAt: revision.at, heads: heads.map(e => e.id), conflict: heads.length > 1, withdrawn: withdrawn.has(revision.id), evidence, current });
  }
  return offers.sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
}
export function distanceKm(a, b) {
  if (!a || !b) return null;
  const rad = x => x * Math.PI / 180;
  const dlat = rad(b.lat - a.lat), dlon = rad(b.lon - a.lon);
  const h = Math.sin(dlat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dlon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(Math.max(0, 1 - h)));
}
export function assess(offer, offers, { now = Date.now(), origin = null, relationships = [] } = {}, visited = new Set(), memo = new Map()) {
  if (memo.has(offer.id)) return memo.get(offer.id);
  const blocks = [], checks = [];
  if (visited.size >= 64) blocks.push('Dependency chain is too deep to verify locally.');
  if (offer.conflict) blocks.push('Conflicting revisions need the steward’s resolution.');
  if (offer.withdrawn || offer.status === 'paused') blocks.push('The steward has paused or withdrawn this opportunity.');
  if (Date.parse(offer.expires) <= now) blocks.push('Availability has expired.');
  if (offer.capacity === 0) blocks.push('No capacity is currently offered.');
  if (visited.has(offer.id)) blocks.push('A circular dependency needs resolution.');
  else if (visited.size < 64) {
    const next = new Set([...visited, offer.id]);
    for (const id of offer.dependencies) {
      const dep = offers.find(o => o.id === id);
      if (!dep) blocks.push('An enabling opportunity is missing from this map.');
      else {
        const state = assess(dep, offers, { now, origin, relationships }, next, memo);
        if (state.blocks.length) blocks.push('Requires “' + dep.title + '”, which is not currently actionable.');
        else if (state.checks.length) checks.push('Confirm the enabling opportunity: ' + dep.title + '.');
      }
    }
  }
  if (offer.access === 'ask') checks.push('The steward’s agreement is required before joining.');
  checks.push(...offer.needs.map(n => 'Enabling condition: ' + n));
  const concerns = offer.current.filter(e => e.kind === 'attestation' && e.body.verdict === 'concern');
  if (concerns.length) checks.push('A current concern needs a response; inspect the trust record.');
  const unavailable = offer.current.filter(e => e.kind === 'outcome' && e.body.result === 'unavailable');
  if (unavailable.length) checks.push('Someone reported this unavailable; confirm before travelling.');
  const witnesses = new Set(offer.current.filter(e => e.kind === 'attestation' && e.body.scope === 'availability' && e.body.verdict === 'confirmed' && e.actor !== offer.actor).map(e => e.actor));
  const trustedWitness = relationships.some(r => witnesses.has(r.actor) && r.scope === 'availability' && r.recordId === offer.id && Date.parse(r.expires) > now);
  const result = { state: blocks.length ? 'blocked' : checks.length ? 'confirm' : 'ready', blocks, checks, corroborated: witnesses.size > 0, trustedWitness, distance: distanceKm(origin, offer.location) };
  memo.set(offer.id, result);
  return result;
}
export function pathways(offers, { category = 'All', query = '', origin = null, now = Date.now(), relationships = [] } = {}) {
  const order = { ready: 0, confirm: 1, blocked: 2 };
  const memo = new Map();
  return offers.filter(o => (category === 'All' || o.category === category) && `${o.title} ${o.description} ${o.location.label} ${o.purpose}`.toLowerCase().includes(query.toLowerCase()))
    .map(offer => ({ offer, ...assess(offer, offers, { now, origin, relationships }, new Set(), memo) }))
    .sort((a, b) => order[a.state] - order[b.state] || ((a.distance ?? Infinity) - (b.distance ?? Infinity) || a.offer.title.localeCompare(b.offer.title)));
}
export function sharedPacket(events) {
  const shared = events.filter(e => e.body.visibility === 'shared');
  const ids = new Set(shared.map(e => e.id));
  // Do not leak references or evidence belonging to private opportunities.
  const safe = shared.filter(e => e.kind === 'offer' ? e.body.parents.every(p => ids.has(p)) : ids.has(e.body.target));
  return { protocol: 'rheo-mesh', version: 1, events: safe };
}
export async function readPacket(text, cryptoApi = globalThis.crypto) {
  if (encoder.encode(text).byteLength > MAX_PACKET_BYTES) throw new Error('Exchange file exceeds 2 MB.');
  const packet = JSON.parse(text);
  if (packet.protocol !== 'rheo-mesh' || packet.version !== 1 || !Array.isArray(packet.events) || packet.events.length > MAX_EVENTS) throw new Error('Unsupported Rheo exchange file.');
  // Entire batch verifies before any storage mutation.
  for (const e of packet.events) { await verifyEvent(e, cryptoApi); if (e.body.visibility !== 'shared') throw new Error('Private data is not accepted through shared exchange.'); }
  return packet.events;
}
