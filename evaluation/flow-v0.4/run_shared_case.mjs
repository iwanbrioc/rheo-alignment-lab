#!/usr/bin/env node
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

function args(argv){
  const o={};
  for(let i=0;i<argv.length;i++){
    const v=argv[i];if(!v.startsWith('--'))continue;
    const k=v.slice(2),n=argv[i+1];
    if(!n||n.startsWith('--'))o[k]=true;else{o[k]=n;i++;}
  }
  return o;
}
function shuffled(items){
  const a=[...items];
  for(let i=a.length-1;i>0;i--){const j=crypto.randomInt(i+1);[a[i],a[j]]=[a[j],a[i]];}
  return a;
}

const a=args(process.argv.slice(2));
if(!a.case)throw new Error('Usage: node evaluation/flow-v0.4/run_shared_case.mjs --case /path/to/T0.json --conditions rheo_v0_4,control --base http://localhost:8080 --samples 3');
const CASE=path.resolve(a.case);
const BASE=a.base||'http://localhost:8080';
const SAMPLES=Math.max(1,Number(a.samples||3));
const GRAN=a.granularity||'standard';
if(!['coarse','standard','fine'].includes(GRAN))throw new Error('granularity must be coarse, standard or fine');
const requested=String(a.conditions||'rheo_v0_4,control').split(',').map(x=>x.trim()).filter(Boolean);
const allowed=new Set(['rheo_v0_4','rheo','control','future_generations']);
if(requested.length<2)throw new Error('At least two conditions are required');
for(const c of requested)if(!allowed.has(c))throw new Error(`Unknown condition: ${c}`);
if(new Set(requested).size!==requested.length)throw new Error('Conditions must be unique');

const t0Raw=await readFile(CASE);
const t0=JSON.parse(t0Raw.toString('utf8'));
if(t0.schemaVersion!=='unseen-case-t0-v2')throw new Error('Input must be a v2 T0 file. This runner deliberately does not read T1/T2.');
if(!t0.caseId)throw new Error('T0.caseId required');
const hash=crypto.createHash('sha256').update(t0Raw).digest('hex');
const runId=new Date().toISOString().replace(/[:.]/g,'-');
const outDir=path.join(path.dirname(CASE),'model-runs',`${runId}-FLOW-V0-4`);
await mkdir(outDir,{recursive:true});
const conditions=shuffled(requested);
const log=[];

console.log(`Rheo v0.4 shared-map rerun | case=${t0.caseId} | T0 sha256=${hash.slice(0,12)}… | samples=${SAMPLES} | granularity=${GRAN}`);
console.log('T1/T2 are not read by this runner.');
console.log(`Condition execution order (not a scoring label): ${conditions.join(' -> ')}\n`);

for(const condition of conditions){
  for(let sample=1;sample<=SAMPLES;sample++){
    const started=Date.now();let r,raw,body;
    try{
      r=await fetch(`${BASE}/api/analyze`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({caseRecord:t0,condition,granularity:GRAN})});
      raw=await r.text();try{body=JSON.parse(raw);}catch{body=null;}
    }catch(e){
      log.push({condition,sample,ok:false,status:0,ms:Date.now()-started,error:e.message});
      console.log(`${condition.padEnd(20)} s${String(sample).padStart(2,'0')} FAIL transport ${e.message}`);continue;
    }
    const rec={condition,sample,ok:r.ok,status:r.status,ms:Date.now()-started,provider:body?.provider||null,model:body?.model||null,responseId:body?.responseId||null,researchUsable:Boolean(body?.researchUsable),error:r.ok?null:(body||raw)};
    log.push(rec);
    if(r.ok&&body?.map){
      const env={experiment:'flow-v0.4-shared-map-rerun-v1',caseId:t0.caseId,t0Sha256:hash,condition,sample,granularity:GRAN,provider:body.provider,model:body.model,responseId:body.responseId,researchUsable:body.researchUsable,map:body.map};
      await writeFile(path.join(outDir,`${t0.caseId}.${condition}.s${String(sample).padStart(2,'0')}.json`),JSON.stringify(env,null,2));
    }
    console.log(`${condition.padEnd(20)} s${String(sample).padStart(2,'0')} ${r.ok?'ok  ':'FAIL'} ${r.status} ${rec.ms}ms`);
  }
}
const failures=log.filter(x=>!x.ok);
const meta={experiment:'flow-v0.4-shared-map-rerun-v1',runId,caseId:t0.caseId,t0Sha256:hash,createdAt:new Date().toISOString(),base:BASE,samplesPerCondition:SAMPLES,granularity:GRAN,conditionsRequested:requested,conditionExecutionOrder:conditions,log};
await writeFile(path.join(outDir,'_run_log.json'),JSON.stringify(meta,null,2));
console.log(`\nOutputs frozen locally in ${outDir}`);
console.log(`${log.length} attempts | ${failures.length} failures`);
if(failures.length)process.exitCode=2;
