#!/usr/bin/env node
import http from 'node:http';
import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE=path.dirname(fileURLToPath(import.meta.url));
const PORT=Number(process.env.PORT||8080);
const INNER_PORT=Number(process.env.RHEO_INNER_PORT||PORT+1);
const PROVIDER=process.env.RHEO_MODEL_PROVIDER||'fixture';
const OPENAI_MODEL=process.env.OPENAI_MODEL||'gpt-5.6';
const OPENAI_API_KEY=process.env.OPENAI_API_KEY||'';

const [schemaText,instructions]=await Promise.all([
  readFile(path.join(HERE,'schemas','rheo-actions-v0.6.schema.json'),'utf8'),
  readFile(path.join(HERE,'prompts','rheo-actions-v0.6-system-prompt.md'),'utf8')
]);
const actionSchema=JSON.parse(schemaText);

const inner=spawn(process.execPath,['server_v0_4.mjs'],{
  cwd:HERE,
  env:{...process.env,PORT:String(INNER_PORT)},
  stdio:['ignore','pipe','pipe']
});
inner.stdout.on('data',d=>process.stdout.write(`[v0.4] ${d}`));
inner.stderr.on('data',d=>process.stderr.write(`[v0.4] ${d}`));
inner.on('exit',(code,signal)=>{
  if(!shuttingDown){
    console.error(`Inner v0.4 server exited unexpectedly code=${code} signal=${signal}`);
    process.exitCode=code||1;
  }
});
let shuttingDown=false;

const json=(res,status,body)=>{
  const text=JSON.stringify(body);
  res.writeHead(status,{'content-type':'application/json; charset=utf-8','content-length':Buffer.byteLength(text),'cache-control':'no-store'});
  res.end(text);
};

async function readJsonBody(req,max=2_000_000){
  let size=0;const chunks=[];
  for await(const chunk of req){
    size+=chunk.length;
    if(size>max){const e=new Error('request too large');e.code='request_too_large';throw e;}
    chunks.push(chunk);
  }
  const raw=Buffer.concat(chunks).toString('utf8');
  if(!raw)return {};
  try{return JSON.parse(raw);}catch{const e=new Error('invalid JSON');e.code='invalid_json';throw e;}
}

function extractOutputText(raw){
  if(typeof raw?.output_text==='string'&&raw.output_text.trim())return raw.output_text;
  for(const item of raw?.output||[]){
    for(const c of item?.content||[]){
      if(typeof c?.text==='string'&&c.text.trim())return c.text;
    }
  }
  throw new Error('OpenAI response contained no output text');
}

const ACTIVATORS=new Set(['Be Active','Be Creative','Connect','Keep Learning','Take Notice','Give','Let Go']);
const KINDS=['smallest_release','learning_action','generative_action'];

function diagnosisFromFlow(flow){
  const p=flow?.primaryRestriction||{};
  return {
    rowId:String(p.rowId||''),organ:String(p.organ||''),horizon:String(p.horizon||''),
    alignedIntervention:String(p.alignedIntervention||flow?.alignedIntervention?.intervention||''),
    confidence:['low','medium','high'].includes(p.confidence)?p.confidence:'low'
  };
}

function strictSchema(schema,caseId,flow){
  const s=structuredClone(schema);
  const expected=diagnosisFromFlow(flow);
  s.properties.caseId={...s.properties.caseId,enum:[caseId]};
  const d=s.properties.diagnosisSnapshot.properties;
  for(const [k,v] of Object.entries(expected))d[k]={...d[k],enum:[v]};
  const actionProps=s.properties.actions.items.properties;
  actionProps.alignedIntervention={...actionProps.alignedIntervention,enum:[expected.alignedIntervention]};
  return s;
}

function validateActions(out,caseId,flow){
  const errors=[];
  if(!out||typeof out!=='object'||Array.isArray(out))return ['output must be an object'];
  if(out.schemaVersion!=='0.6')errors.push('schemaVersion must be 0.6');
  if(out.caseId!==caseId)errors.push('caseId changed');
  if(out.noneIsValid!==true)errors.push('noneIsValid must be true');
  if(!Array.isArray(out.actions)||out.actions.length!==3)errors.push('actions must contain exactly three items');
  const expected=diagnosisFromFlow(flow);
  const got=out.diagnosisSnapshot||{};
  for(const k of ['rowId','organ','horizon','alignedIntervention']){
    if(expected[k]&&got[k]!==expected[k])errors.push(`diagnosisSnapshot.${k} must match frozen flow diagnosis`);
  }
  if(Array.isArray(out.actions)){
    const kinds=new Set(out.actions.map(a=>a.kind));
    for(const k of KINDS)if(!kinds.has(k))errors.push(`missing action kind ${k}`);
    if(kinds.size!==3)errors.push('action kinds must be unique');
    const ids=new Set();const signatures=new Set();
    for(const [i,a] of out.actions.entries()){
      if(!a?.id||ids.has(a.id))errors.push(`actions[${i}].id must be unique`);else ids.add(a.id);
      const sig=String(a?.action||'').trim().toLowerCase();
      if(!sig)errors.push(`actions[${i}].action required`);
      if(signatures.has(sig))errors.push('actions must not be identical');signatures.add(sig);
      if(expected.alignedIntervention&&a?.alignedIntervention!==expected.alignedIntervention)errors.push(`actions[${i}].alignedIntervention must match diagnosis`);
      if(!Array.isArray(a?.activators))errors.push(`actions[${i}].activators must be array`);
      else{
        const seen=new Set();
        for(const x of a.activators){if(!ACTIVATORS.has(x))errors.push(`unknown activator ${x}`);if(seen.has(x))errors.push(`duplicate activator ${x}`);seen.add(x);}
      }
      if(!a?.prediction?.whatShouldBecomeMorePossible||!a?.prediction?.observableSignal)errors.push(`actions[${i}] needs falsifiable prediction`);
      if(!a?.stopOrChangeSignal)errors.push(`actions[${i}] needs stop/change signal`);
    }
  }
  return errors;
}

function fixtureActions(caseId,flow){
  const d=diagnosisFromFlow(flow);
  const next=String(flow?.propagationPrediction?.nextDownsweepOrgan||'the next part of the flow');
  const base=d.alignedIntervention||'the aligned intervention';
  const common=(id,kind,title,action,why,signal)=>({
    id,kind,title,action,whyThisAction:why,alignedIntervention:base,
    activators:kind==='smallest_release'?['Take Notice','Be Active']:kind==='learning_action'?['Keep Learning','Take Notice']:['Be Creative','Connect','Give'],
    prediction:{nextOrgan:next,whatShouldBecomeMorePossible:`If the diagnosis is right, ${next} should become more viable.`,observableSignal:signal,reviewHorizon:'Set a short review point appropriate to the real situation.'},
    stopOrChangeSignal:'Stop or revise if the predicted signal does not appear, important harm emerges, or new evidence relocates the diagnosis.',
    displacedCosts:['Unknown in fixture mode; ask who bears time, effort, risk or lost options.'],
    irreversibilityCaution:'Keep the first move proportionate unless delay itself closes a viable option.',
    assumptions:['Fixture mode does not establish that this action is suitable in the real case.']
  });
  return {schemaVersion:'0.6',caseId,diagnosisSnapshot:d,actions:[
    common('a1','smallest_release','Smallest release',`Try one bounded, reversible expression of ${base} at the diagnosed restriction.`,`Tests whether a small intervention at ${d.organ||'the diagnosed organ'} releases flow.`,`A concrete sign that ${next} is easier or newly possible.`),
    common('a2','learning_action','Learning action',`Run a discriminating test that could show whether ${d.organ||'the current diagnosis'} is actually the primary restriction.`,`Prioritises learning over confirmation of the current map.`,`Evidence either strengthens the current diagnosis or clearly points elsewhere.`),
    common('a3','generative_action','Generative action',`Create or strengthen a capability that lets people generate further options through ${base}.`,`Tests whether the system can produce future capability rather than merely recover a prior state.`,`A new usable capability or relationship persists beyond the immediate intervention.`)
  ],noneIsValid:true,researchNote:'Fixture output only. Do not use as research evidence or practical advice.'};
}

async function generateActions(body){
  const caseId=String(body?.caseId||body?.flow?.caseId||'');
  if(!caseId)throw Object.assign(new Error('caseId required'),{code:'invalid_action_request'});
  const flow=body?.flow;
  if(!flow?.primaryRestriction)throw Object.assign(new Error('frozen flow diagnosis required'),{code:'invalid_action_request'});
  const testimony=Array.isArray(body?.testimony)?body.testimony:[];
  if(PROVIDER==='fixture')return {actions:fixtureActions(caseId,flow),provider:'fixture',model:'fixture-v0.6',responseId:null,researchUsable:false};
  if(PROVIDER!=='openai')throw Object.assign(new Error(`Unsupported RHEO_MODEL_PROVIDER: ${PROVIDER}`),{code:'unsupported_provider'});
  if(!OPENAI_API_KEY)throw Object.assign(new Error('OPENAI_API_KEY is not configured'),{code:'missing_api_key'});

  const input={
    caseId,
    testimony:testimony.map(t=>({role:t.role||'participant',text:String(t.text||''),questionType:t.questionType||null})),
    frozenFlowDiagnosis:flow
  };
  const response=await fetch('https://api.openai.com/v1/responses',{
    method:'POST',
    headers:{'authorization':`Bearer ${OPENAI_API_KEY}`,'content-type':'application/json'},
    body:JSON.stringify({
      model:OPENAI_MODEL,
      instructions,
      input:[{role:'user',content:[{type:'input_text',text:`Generate the three action experiments from this frozen interview/diagnosis record. Preserve all frozen diagnosis metadata exactly.\n\n${JSON.stringify(input)}`}]}],
      text:{format:{type:'json_schema',name:'rheo_actions_v0_6',strict:true,schema:strictSchema(actionSchema,caseId,flow)}},
      store:false
    })
  });
  const raw=await response.json();
  if(!response.ok)throw Object.assign(new Error(`OpenAI Responses API ${response.status}: ${raw?.error?.message||JSON.stringify(raw)}`),{code:'openai_api_error'});
  let out;
  try{out=JSON.parse(extractOutputText(raw));}catch(e){throw Object.assign(new Error(`Could not parse action output: ${e.message}`),{code:'model_output_parse_error'});}
  return {actions:out,provider:'openai',model:raw.model||OPENAI_MODEL,responseId:raw.id||null,researchUsable:true};
}

function proxy(req,res){
  const options={hostname:'127.0.0.1',port:INNER_PORT,path:req.url,method:req.method,headers:{...req.headers,host:`127.0.0.1:${INNER_PORT}`}};
  const p=http.request(options,innerRes=>{
    res.writeHead(innerRes.statusCode||502,innerRes.headers);
    innerRes.pipe(res);
  });
  p.on('error',e=>json(res,502,{error:`Inner Rheo server unavailable: ${e.message}`,errorCode:'inner_server_unavailable'}));
  req.pipe(p);
}

const server=http.createServer(async(req,res)=>{
  const url=new URL(req.url||'/',`http://${req.headers.host||'localhost'}`);
  try{
    if(req.method==='POST'&&url.pathname==='/api/rheo-actions'){
      const body=await readJsonBody(req);
      const result=await generateActions(body);
      const caseId=String(body?.caseId||body?.flow?.caseId||'');
      const errors=validateActions(result.actions,caseId,body.flow);
      if(errors.length)return json(res,502,{error:'action output failed v0.6 validation',errorCode:'action_output_validation_failed',details:errors});
      return json(res,200,{version:'0.6.0',condition:'rheo_v0_6_actions',provider:result.provider,model:result.model,responseId:result.responseId,researchUsable:result.researchUsable,actionSet:result.actions});
    }
    if(req.method==='GET'&&url.pathname==='/api/health'){
      try{
        const r=await fetch(`http://127.0.0.1:${INNER_PORT}/api/health`);const h=await r.json();
        return json(res,r.ok?200:502,{...h,version:'0.6.0',actionOutcomeLoop:true,innerVersion:h.version||null,provider:PROVIDER});
      }catch(e){return json(res,503,{version:'0.6.0',actionOutcomeLoop:true,provider:PROVIDER,error:`inner server not ready: ${e.message}`});}
    }
    proxy(req,res);
  }catch(e){
    const status=['invalid_json','request_too_large','invalid_action_request'].includes(e.code)?400:500;
    json(res,status,{error:e.message,errorCode:e.code||'server_error'});
  }
});

server.listen(PORT,()=>console.log(`Rheo v0.6 action-outcome server listening on http://localhost:${PORT} (provider=${PROVIDER}, inner=${INNER_PORT})`));

function shutdown(signal){
  if(shuttingDown)return;shuttingDown=true;
  console.log(`Shutting down v0.6 (${signal})`);
  server.close(()=>{try{inner.kill('SIGTERM');}catch{} process.exit(0);});
  setTimeout(()=>{try{inner.kill('SIGKILL');}catch{} process.exit(1);},2500).unref();
}
process.on('SIGINT',()=>shutdown('SIGINT'));
process.on('SIGTERM',()=>shutdown('SIGTERM'));
