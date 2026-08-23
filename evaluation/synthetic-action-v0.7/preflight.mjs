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
}

console.log(`v0.7 preflight ok | server=${health.version||'unknown'} | provider=${PROVIDER} | model=${health.model||process.env.OPENAI_MODEL||'unknown'}`);
