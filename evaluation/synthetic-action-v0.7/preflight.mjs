#!/usr/bin/env node

const BASE=process.env.RHEO_BASE||'http://127.0.0.1:8080';
const PROVIDER=process.env.RHEO_MODEL_PROVIDER||'fixture';
const API_KEY=process.env.OPENAI_API_KEY||'';

function looksPlaceholder(value){
  const v=String(value||'').trim();
  return !v || /YOUR[_ -]?API|API[_ -]?KEY[_ -]?HERE|REPLACE[_ -]?ME/i.test(v);
}

async function fail(message){
  console.error(`v0.7 preflight failed: ${message}`);
  process.exit(2);
}

async function post(url,body){
  const r=await fetch(url,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});
  const text=await r.text();let parsed;try{parsed=JSON.parse(text);}catch{parsed={raw:text};}
  if(!r.ok)await fail(`${url} returned ${r.status}: ${parsed?.error||text}`);
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
    await fail('OPENAI_API_KEY is missing or still contains the placeholder text. Set the real key locally; do not paste it into chat.');
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

  const probeText='Preflight only: identify whether there is enough information to locate a flow restriction. Do not treat this as benchmark evidence.';
  const caseRecord={
    schemaVersion:'0.2',guideVersion:'0.7.0-preflight',caseId:'PREFLIGHT-ONLY',createdAt:new Date().toISOString(),
    context:{situation:probeText,whatMatters:'',stakeholders:'',uncertainties:'',decisionHorizon:'',recoveryHorizon:'',urgency:'Low'},
    evidence:[{id:'t1',text:probeText,provenance:'unknown',about:'system',confidence:'low'}],
    horizons:[],contractions:{primary:'',disconfirmingEvidence:'',missingPerspective:'',narratorImplicated:false},
    powerSafety:{fearRetaliation:'Unknown',constrainedExit:'Unknown',surveillanceControl:'Unknown',materialDependence:'Unknown',powerAsymmetry:'Unknown',notes:''},
    safetyGateActive:false,safetyUnresolved:true,
    viability:{foreclose:'',regenerate:'',viabilityFloor:'',trajectoryConcern:''},moves:[],admin:'',commandSignal:''
  };
  await post(`${BASE}/api/rheo-flow`,{caseRecord});
}

console.log(`v0.7 preflight ok | server=${health.version||'unknown'} | provider=${PROVIDER} | model=${health.model||process.env.OPENAI_MODEL||'unknown'}`);
