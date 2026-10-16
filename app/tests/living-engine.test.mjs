import test from "node:test";
import assert from "node:assert/strict";
import { PORTALS, ROUTES, SESSIONS, EMERGENCE } from "../living-data.mjs";
import { timeText,requireValidSession,itineraryCheck,findRoute,openPossibilities,curatorEligible,simulateTithe,START_DEVICES,encounter } from "../living-engine.mjs";
test("all fictional portals are unique and all routes lead to known portals",()=>{
 const ids=new Set(PORTALS.map(p=>p.id));assert.equal(ids.size,PORTALS.length);
 for(const [a,b,type] of ROUTES){assert.ok(ids.has(a)&&ids.has(b));assert.ok(["foot","cycle"].includes(type));}
 for(const s of SESSIONS)assert.ok(ids.has(s.portal));
});
test("the initial Open Space matrix has events in a bounded fictional day",()=>{
 assert.ok(SESSIONS.length>=12);for(const s of SESSIONS)assert.equal(requireValidSession(s,[]),s);
 assert.equal(timeText(570),"09:30");
 assert.ok(findRoute("garden","riverside",ROUTES)?.length>1);
});
test("two chosen gatherings generate a clear overlap warning",()=>{
 const s=[{id:"a",portal:"garden",start:600,duration:90,title:"Garden"},{id:"b",portal:"hall",start:610,duration:60,title:"Talk"}];
 assert.match(itineraryCheck(["b","a"],s).warnings[0],/Overlap/);
});
test("brief intervals at different places require checking transition, not guessed routing time",()=>{
 const s=[{id:"a",portal:"garden",start:600,duration:60,title:"Garden"},{id:"b",portal:"hall",start:665,duration:60,title:"Talk"}];
 assert.match(itineraryCheck(["b","a"],s).warnings[0],/illustrative buffer/);
 assert.equal(itineraryCheck(["a"],s).warnings.length,0);
});
test("missing links do not invent a navigable pathway",()=>{
 assert.equal(findRoute("garden","unmapped",ROUTES),null);
 assert.deepEqual(findRoute("garden","garden",ROUTES),["garden"]);
});
test("emergence requires both conditions instead of rewarding clicks",()=>{
 assert.equal(openPossibilities(["garden"],EMERGENCE).length,0);
 assert.ok(openPossibilities(["garden","kitchen"],EMERGENCE).some(e=>e.id==="soil"));
});
test("curator readiness requires both paths and consensus; other participation has no gate",()=>{
 assert.equal(curatorEligible({innerCompleted:true,outerCompleted:true,readinessApproved:true}),true);
 assert.equal(curatorEligible({innerCompleted:true,outerCompleted:true}),false);
 assert.equal(curatorEligible({innerCompleted:false,outerCompleted:true,readinessApproved:true}),false);
});
test("10% tithe is not a coin balance or tax refund",()=>{
 const t=simulateTithe({netRealisedGains:10000,reserve:4000,curators:1,monthlyBasic:1000,overhead:100,year:1});
 assert.equal(t.contribution,1000);assert.equal(t.centralMonthly,1000);assert.equal(t.closing,3900);
 assert.equal("token" in t,false);assert.equal("taxRelief" in t,false);
});
test("support tapers only when independently pledged replacement can cover it",()=>{
 const hold=simulateTithe({year:5,curators:2,monthlyBasic:1500,localMonthly:0});
 assert.equal(hold.feasible,false);assert.equal(hold.supportShare,1);
 const tapered=simulateTithe({year:3,curators:2,monthlyBasic:1500,localMonthly:1500});
 assert.equal(tapered.feasible,true);assert.equal(tapered.supportShare,0.5);
 const notQuite=simulateTithe({year:3,curators:2,monthlyBasic:1500,localMonthly:500});
 assert.equal(notQuite.feasible,false);assert.ok(notQuite.supportShare>0.5);
});
test("insolvency remains visible and is never presented as a viable grant",()=>{
 const x=simulateTithe({netRealisedGains:0,reserve:0,curators:1,monthlyBasic:1600,overhead:100});
 assert.equal(x.solvent,false);assert.ok(x.closing<0);
});
test("fictional device meeting is local, bounded to participants, and idempotent",()=>{
 const base=START_DEVICES.map(d=>({...d,events:d.events.slice()}));
 const one=encounter(base,"A","B");
 assert.equal(one[0].events.length,2);assert.equal(one[1].events.length,2);
 assert.equal(one[2].events.length,1);
 assert.equal(encounter(one,"A","B")[0].events.length,2);
 const later=encounter(one,"B","C");assert.equal(later[0].events.length,2);assert.equal(later[2].events.length,3);
 assert.equal(base[0].events.length,1);
});
test("encounters cannot disseminate private records or self-connect",()=>{
 const source=[{id:"A",events:[{id:"secret",public:false},{id:"shared",public:true}]},{id:"B",events:[]}];
 const merged=encounter(source,"A","B");
 assert.deepEqual(merged[0].events.map(e=>e.id),["secret","shared"]);
 assert.deepEqual(merged[1].events.map(e=>e.id),["shared"]);
 assert.throws(()=>encounter(source,"A","A"),/different/);
});
