#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE=path.dirname(fileURLToPath(import.meta.url));
const ROOT=path.resolve(HERE,'../..');
const BASE=process.env.RHEO_BASE||'http://127.0.0.1:8080';
const PROVIDER=process.env.RHEO_MODEL_PROVIDER||'fixture';
const MODEL=process.env.OPENAI_MODEL||'gpt-5.6';
const API_KEY=process.env.OPENAI_API_KEY||'';

function looksPlaceholder(value){
  const v=String(value||'').trim();
  return !v || /YOUR[_ -]?API|API[_ -]?KEY[_ -]?HERE|REPLACE[_ -]?ME|export\s+OPENAI_API_KEY/i.test(v);
}

async function fail(message){
  console.error(`v0.7 preflight failed: ${message}`);
  process.exit(2);
}

async function post(url,body){
  const r=await fetch(url,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});
  const text=await r.text();let parsed;try{parsed=JSON.parse(text);}catch{parsed={raw:text};}
  if(!r.ok){
    const details=Array.isArray(parsed?.details)&&parsed.details.length?` | details: ${parsed.details.join(' ; ')}`:'';
    await fail(`${url} returned ${r.status}: ${parsed?.error||text}${details}`);
  }
  return parsed;
}

let health;
try{
  const r=await fetch(`${BASE}/api/health`);
  health=await r.json();
  if(!r.ok)await fail(`Rheo server health check returned ${r.status}: ${JSON.stringify(health)}`);
}catch(e){
  await fail(`cannot reach Rheo server at ${BASE}: ${e.message}`);
}

if(health?.provider!==PROVIDER){
  await fail(`provider mismatch: benchmark shell says ${PROVIDER}, but Rheo server says ${health?.provider||'unknown'}. Export RHEO_MODEL_PROVIDER consistently in both terminals.`);
}

if(PROVIDER==='openai'){
  if(looksPlaceholder(API_KEY)){
    await fail('OPENAI_API_KEY is missing or still contains placeholder/command text. Set the real key locally; do not paste it into chat.');
  }
  if(health?.modelConfigured===false){
    await fail('Rheo server reports modelConfigured=false. Restart the server after setting the real OPENAI_API_KEY.');
  }
  try{
    const r=await fetch('https://api.openai.com/v1/models',{headers:{authorization:`Bearer ${API_KEY}`}});
    const body=await r.json();
    if(!r.ok)await fail(`OpenAI rejected the benchmark-shell API key (${r.status}): ${body?.error?.message||'authentication failed'}`);
  }catch(e){
    await fail(`could not validate the benchmark-shell API key: ${e.message}`);
  }

  const probeText='Preflight only: a small team has an unclear practical decision and insufficient evidence. Generate only a schema-valid diagnostic/action probe; this is not benchmark evidence.';
  const caseRecord={
    schemaVersion:'0.2',guideVersion:'0.7.0-preflight',caseId:'PREFLIGHT-ONLY',createdAt:new Date().toISOString(),
    context:{situation:probeText,whatMatters:'',stakeholders:'',uncertainties:'',decisionHorizon:'',recoveryHorizon:'',urgency:'Low'},
    evidence:[{id:'t1',text:probeText,provenance:'unknown',about:'system',confidence:'low'}],
    horizons:[],contractions:{primary:'',disconfirmingEvidence:'',missingPerspective:'',narratorImplicated:false},
    powerSafety:{fearRetaliation:'Unknown',constrainedExit:'Unknown',surveillanceControl:'Unknown',materialDependence:'Unknown',powerAsymmetry:'Unknown',notes:''},
    safetyGateActive:false,safetyUnresolved:true,
    viability:{foreclose:'',regenerate:'',viabilityFloor:'',trajectoryConcern:''},moves:[],admin:'',commandSignal:''
  };
  const flowResp=await post(`${BASE}/api/rheo-flow`,{caseRecord});
  await post(`${BASE}/api/rheo-actions`,{
    caseId:'PREFLIGHT-ONLY',
    flow:flowResp.flow,
    testimony:[{role:'participant',text:probeText}]
  });

  const comparisonSchema=JSON.parse(await readFile(path.join(ROOT,'schemas','action-comparison-v0.7.schema.json'),'utf8'));
  const r=await fetch('https://api.openai.com/v1/responses',{
    method:'POST',
    headers:{authorization:`Bearer ${API_KEY}`,'content-type':'application/json'},
    body:JSON.stringify({
      model:MODEL,
      instructions:'Preflight only. Return exactly three simple placeholder practical actions in the requested schema. Use caseId PREFLIGHT-ONLY and select one of a1, a2, a3 first. Do not do substantive analysis.',
      input:[{role:'user',content:[{type:'input_text',text:'CASE_ID: PREFLIGHT-ONLY. Schema compatibility probe only.'}]}],
      text:{format:{type:'json_schema',name:'action_comparison_v0_7_preflight',strict:true,schema:comparisonSchema}},
      store:false
    })
  });
  const raw=await r.json();
  if(!r.ok)await fail(`bare structured-output schema probe returned ${r.status}: ${raw?.error?.message||JSON.stringify(raw)}`);
}

console.log(`v0.7 preflight ok | server=${health.version||'unknown'} | provider=${PROVIDER} | model=${health.model||MODEL}`);
