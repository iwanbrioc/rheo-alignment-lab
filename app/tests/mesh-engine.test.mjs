import test from 'node:test';
import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import { createIdentity, signEvent, verifyEvent, materialize, assess, pathways, mergeEvents, sharedPacket, readPacket, canonical } from '../mesh-engine.mjs';
import { PacketAssembler, BluetoothBridge } from '../mesh-transport.mjs';
const now = Date.now();
const future = new Date(now + 86400000).toISOString();
const past = new Date(now - 86400000).toISOString();
const alice = await createIdentity(webcrypto), bob = await createIdentity(webcrypto), mallory = await createIdentity(webcrypto);
function body(overrides = {}) {
  return { recordId:webcrypto.randomUUID(), parents:[], title:'Shared table', description:'A meal and company', category:'Essentials', location:{lat:52.04,lon:-4.31,label:'Kitchen'}, steward:'Kitchen circle', capacity:6, access:'open', status:'active', expires:future, conditions:'Welcome without obligation', care:'Replenish collectively', purpose:'Food and belonging', needs:[], dependencies:[], visibility:'shared', ...overrides };
}
async function offer(identity = alice, overrides = {}) { return signEvent(identity,'offer',body(overrides),webcrypto); }
async function attestation(target, overrides = {}, identity = bob) { return signEvent(identity,'attestation',{target,scope:'availability',verdict:'confirmed',note:'I visited this morning',expires:future,visibility:'shared',...overrides},webcrypto); }
function only(events) { return materialize(events,now)[0]; }
test('signature binds the contents and actor to a non-exportable signing key', async () => {
  const e = await offer(); await verifyEvent(e,webcrypto);
  await assert.rejects(() => webcrypto.subtle.exportKey('jwk',alice.privateKey));
  await assert.rejects(() => verifyEvent({...e,body:{...e.body,title:'Forged invitation'}},webcrypto),/Signature/);
  await assert.rejects(() => verifyEvent({...e,actor:bob.actor},webcrypto),/fingerprint/);
});
test('basic help can be approached without endorsements or reciprocity', async () => {
  const e = await offer(), o = only([e]);
  assert.equal(assess(o,[o],{now}).state,'ready');
  assert.equal(assess(o,[o],{now}).corroborated,false);
});
test('self-confirmation, skill context and expired claims do not corroborate availability', async () => {
  const e = await offer();
  for (const a of [await attestation(e.id,{},alice),await attestation(e.id,{scope:'skill'}),await attestation(e.id,{expires:past})]) {
    const o = only([e,a]); assert.equal(assess(o,[o],{now}).corroborated,false);
  }
  const o = only([e,await attestation(e.id)]); assert.equal(assess(o,[o],{now}).corroborated,true);
});
test('endorsements never override consent or resource limits', async () => {
  const e = await offer(alice,{access:'ask'}), o = only([e,await attestation(e.id)]);
  assert.equal(assess(o,[o],{now}).state,'confirm');
  for (const changes of [{capacity:0},{status:'paused'},{expires:past}]) {
    const blocked = only([await offer(alice,changes)]); assert.equal(assess(blocked,[blocked],{now}).state,'blocked');
  }
});
test('revocation belongs to the signer; another actor cannot withdraw it', async () => {
  const e = await offer(), a = await attestation(e.id);
  const bad = await signEvent(mallory,'retract',{target:a.id,visibility:'shared'},webcrypto);
  let o = only([e,a,bad]); assert.equal(assess(o,[o],{now}).corroborated,true);
  const good = await signEvent(bob,'retract',{target:a.id,visibility:'shared'},webcrypto);
  o = only([e,a,bad,good]); assert.equal(assess(o,[o],{now}).corroborated,false);
});
test('offline merge is commutative and idempotent, and concurrent edits remain visible', async () => {
  const root = await offer();
  const left = await offer(alice,{...root.body,parents:[root.id],title:'Left revision'});
  const right = await offer(alice,{...root.body,parents:[root.id],title:'Right revision'});
  const a = mergeEvents([root,left],[root,right]), b = mergeEvents([root,right],[root,left]);
  assert.equal(canonical(a),canonical(b)); assert.equal(canonical(mergeEvents(a,a)),canonical(a));
  const conflicted = only(a); assert.equal(conflicted.conflict,true); assert.equal(assess(conflicted,[conflicted],{now}).state,'blocked');
  const resolved = await offer(alice,{...root.body,parents:conflicted.heads,title:'Agreed revision'});
  assert.equal(only([...a,resolved]).conflict,false);
});
test('another device cannot rewrite the steward’s opportunity, including a forged root', async () => {
  const root = await offer();
  const edit = await offer(mallory,{...root.body,parents:[root.id],title:'Hijacked'});
  assert.equal(only([root,edit]).title,root.body.title);
  const forgedRoot = await offer(mallory,{recordId:root.body.recordId});
  assert.throws(() => mergeEvents([root],[forgedRoot]), /Conflicting event IDs/);
});
test('missing revision ancestors are held until they arrive', async () => {
  const root = await offer(); const next = await offer(alice,{...root.body,parents:[root.id],title:'Renewed'});
  assert.equal(materialize([next],now).length,0);
  assert.equal(only([next,root]).title,'Renewed');
});
test('a revision invalidates older endorsements without erasing their provenance', async () => {
  const root = await offer(), a = await attestation(root.id);
  const edit = await offer(alice,{...root.body,parents:[root.id],title:'Renewed'});
  const o = only([root,a,edit]); assert.equal(o.evidence.length,1); assert.equal(assess(o,[o],{now}).corroborated,false);
});
test('missing, blocked and circular dependencies cannot produce a ready pathway', async () => {
  const missing = only([await offer(alice,{dependencies:['missing']})]); assert.equal(assess(missing,[missing],{now}).state,'blocked');
  const aId = webcrypto.randomUUID(), bId = webcrypto.randomUUID();
  const a = await offer(alice,{recordId:aId,dependencies:[bId]}); const b = await offer(bob,{recordId:bId,dependencies:[aId]});
  const all = materialize([a,b],now); assert.equal(assess(all[0],all,{now}).state,'blocked');
});
test('unavailability reports and concerns require confirmation, and repair is not a trust currency', async () => {
  const e = await offer(), report = await signEvent(bob,'outcome',{target:e.id,note:'Closed when I visited',result:'unavailable',visibility:'shared'},webcrypto);
  const o = only([e,report]); assert.equal(assess(o,[o],{now}).state,'confirm'); assert.equal(assess(o,[o],{now}).corroborated,false);
});
test('shared exports exclude private records, private evidence and signing keys', async () => {
  const privateOffer = await offer(alice,{visibility:'private'}), shared = await offer();
  const privateEvidence = await attestation(privateOffer.id,{visibility:'private'});
  const packet = sharedPacket([privateOffer,privateEvidence,shared]);
  assert.deepEqual(packet.events.map(e=>e.id),[shared.id]);
  assert.equal(JSON.stringify(packet).includes('privateKey'),false);
  assert.equal((await readPacket(JSON.stringify(packet),webcrypto)).length,1);
});
test('bad batches are rejected in full before import', async () => {
  const e = await offer(); const packet = sharedPacket([e]);
  packet.events.push({...e,id:webcrypto.randomUUID()});
  await assert.rejects(() => readPacket(JSON.stringify(packet),webcrypto));
  const privateEvent = await offer(alice,{visibility:'private'});
  await assert.rejects(() => readPacket(JSON.stringify({protocol:'rheo-mesh',version:1,events:[privateEvent]}),webcrypto),/Private/);
  await assert.rejects(() => readPacket('x'.repeat(2000001),webcrypto),/2 MB/);
});
test('event ID collisions reject rather than silently overwrite', async () => {
  const e = await offer(); assert.throws(() => mergeEvents([e],[{...e,at:future}]),/Conflicting event IDs/);
});
test('pathways sort by availability and distance without aggregate wellbeing or person scores', async () => {
  const far = await offer(alice,{title:'Far',location:{lat:53,lon:-4,label:'Far'}});
  const near = await offer(alice,{title:'Near'}); const paused = await offer(alice,{title:'Closest but paused',status:'paused'});
  const rows = pathways(materialize([far,near,paused]),{origin:{lat:52.04,lon:-4.31},now});
  assert.deepEqual(rows.map(r=>r.offer.title),['Near','Far','Closest but paused']);
  assert.ok(rows.every(r=>!('score' in r)));
});
test('BLE framing handles arbitrary boundaries and Unicode; partial transfers expire', () => {
  const assembler = new PacketAssembler(), bytes = new TextEncoder().encode('{"note":"Croeso 🌱"}\n{"next":1}\n');
  const packets = []; for (const byte of bytes) packets.push(...assembler.push(Uint8Array.of(byte)));
  assert.deepEqual(packets,['{"note":"Croeso 🌱"}','{"next":1}']);
  assembler.push(new TextEncoder().encode('unfinished'),1000);
  assert.deepEqual(assembler.push(new TextEncoder().encode('new\n'),32001),['new']);
});
test('BLE bridge writes at the default ATT size with backpressure', async () => {
  const chunks = [], bridge = new BluetoothBridge(async()=>{}); bridge.status='connected'; bridge.rx={writeValueWithResponse:async data=>chunks.push(data)};
  await bridge.send('x'.repeat(65)); assert.ok(chunks.every(c=>c.length<=20));
  assert.equal(new TextDecoder().decode(Buffer.concat(chunks)),'x'.repeat(65)+'\n');
});

test('personal trust is private, scoped to an opportunity and context, and expires', async () => {
  const e = await offer(), a = await attestation(e.id), o = only([e,a]);
  const relationship = {actor:bob.actor,recordId:o.id,name:'Neighbour',scope:'availability',expires:future};
  assert.equal(assess(o,[o],{now,relationships:[relationship]}).trustedWitness,true);
  for (const changed of [{scope:'skill'},{recordId:'other-place'},{expires:past},{actor:mallory.actor}]) {
    assert.equal(assess(o,[o],{now,relationships:[{...relationship,...changed}]}).trustedWitness,false);
  }
  assert.equal(assess(o,[o],{now}).state,'ready');
});
test('long dependency chains fail conservatively instead of overflowing the stack', async () => {
  const ids = Array.from({length:70},()=>webcrypto.randomUUID()), events=[];
  for (let i=0;i<ids.length;i++) events.push(await offer(alice,{recordId:ids[i],dependencies:i<ids.length-1?[ids[i+1]]:[]}));
  const all = materialize(events,now); const o=all.find(o=>o.id===ids[0]);
  assert.equal(assess(o,all,{now}).state,'blocked');
});
