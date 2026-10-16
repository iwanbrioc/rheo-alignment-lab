import test from 'node:test';
import assert from 'node:assert/strict';
import { sampleState,validateState,newPortal,connect } from './model.mjs';
import {makePortalToken,parsePortalToken,mergeReceivedPortal,encodeBitchatPrivateTLV,decodeBitchatPrivateTLV} from './bitchat-carrier.mjs';
test('starter mycelium is valid and explicit',()=>{const s=validateState(sampleState());assert.equal(s.portals.length,10);assert.equal(s.links.length,13);});
test('add portal and connect with no AI services',()=>{let s=newPortal(sampleState(),{name:'Volunteer library',description:'Knowledge is shared',category:'Learning',kind:'Skill',steward:'',shareable:false});assert.equal(s.portals.length,11);s=connect(s,s.portals.at(-1).id,'p2','Share repair skills');assert.equal(s.links.length,14);});
test('bad references are rejected',()=>{const s=sampleState();s.links[0].to='no-such';assert.throws(()=>validateState(s));});
test('bitchat TLV adaptation roundtrip with multibyte utf8',()=>{const p=encodeBitchatPrivateTLV('rheo','Gofal ↔ care');assert.deepEqual(decodeBitchatPrivateTLV(p),{messageId:'rheo',content:'Gofal ↔ care'});});
test('RHEO4 token imports as unverified and deduplicates',()=>{const s=sampleState();const t=makePortalToken(s.portals[1]);const p=parsePortalToken(t.text);assert.equal(p.name,s.portals[1].name);assert.equal(p.shareable,false);assert.equal(p.received,true);const empty={version:4,portals:[],links:[]};const merged=mergeReceivedPortal(empty,p);assert.equal(merged.state.portals.length,1);assert.equal(mergeReceivedPortal(merged.state,p).added,false);});
test('non-shareable portals cannot generate token',()=>{let s=sampleState();s.portals[0].shareable=false;assert.throws(()=>makePortalToken(s.portals[0]));});
test('malformed tokens rejected',()=>{assert.throws(()=>parsePortalToken('RHEO4:%%%'));assert.throws(()=>parsePortalToken('wrong'));});

test('receiving a sample portal into another sample map is idempotent',()=>{const original=sampleState();const t=makePortalToken(original.portals[0]);const result=mergeReceivedPortal(original,parsePortalToken(t.text));assert.equal(result.added,false);});

import {proposeSession,togglePath,myPathSessions,pathHasOverlap} from './model.mjs';
test('time/space sample and self-curated My Path',()=>{const base=sampleState();assert.equal(base.sessions.length,9);const chosen=togglePath(base,'s1');assert.equal(myPathSessions(chosen).length,1);assert.equal(pathHasOverlap(chosen),false);const overlapping=togglePath(chosen,'s2');assert.equal(pathHasOverlap(overlapping),true);assert.deepEqual(togglePath(overlapping,'s2').myPath,['s1']);});
test('validates and preserves proposed sessions',()=>{const start=sampleState();const updated=proposeSession(start,{portalId:'p3',title:'Soil and stories',start:'14:30',end:'15:30',space:'Garden',description:''});assert.equal(updated.sessions.length,10);assert.throws(()=>proposeSession(start,{portalId:'p3',title:'Bad time',start:'14:15',end:'15:30',space:'Garden',description:''}));assert.throws(()=>proposeSession(start,{portalId:'p3',title:'Bad time',start:'16:00',end:'15:30',space:'Garden',description:''}));});
test('accepts old v0.4 export without matrix and path',()=>{const base=sampleState();delete base.sessions;delete base.myPath;const parsed=validateState(base);assert.deepEqual(parsed.sessions,[]);assert.deepEqual(parsed.myPath,[]);});
