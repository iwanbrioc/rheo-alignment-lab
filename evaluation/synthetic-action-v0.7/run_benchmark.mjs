#!/usr/bin/env node
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const HERE=path.dirname(fileURLToPath(import.meta.url));
const ROOT=path.resolve(HERE,'../..');

function args(argv){const o={};for(let i=0;i<argv.length;i++){const v=argv[i];if(!v.startsWith('--'))continue;const k=v.slice(2),n=argv[i+1];if(!n||n.startsWith('--'))o[k]=true;else{o[k]=n;i++;}}return o;}
function shuffled(items){const a=[...items];for(let i=a.length-1;i>0;i--){const j=crypto.randomInt(i+1);[a[i],a[j]]=[a[j],a[i]];}return a;}
function hashText(s){return crypto.createHash('sha256').update(s).digest('hex');}
function extractOutputText(raw){if(typeof raw?.output_text==='string'&&raw.output_text.trim())return raw.output_text;for(const item of raw?.output||[])for(const c of item?.content||[])if(typeof c?.text==='string'&&c.text.trim())return c.text;throw new Error('OpenAI response contained no output text');}

const a=args(process.argv.slice(2));
const BASE=a.base||'http://127.0.0.1:8080';
const SAMPLES=Math.max(1,Number(a.samples||3));
const MODEL=process.env.OPENAI_MODEL||'gpt-5.6';
const API_KEY=process.env.OPENAI_API_KEY||'';
const PROVIDER=process.env.RHEO_MODEL_PROVIDER||'fixture';
const only=a.case?new Set(String(a.case).split(',').map(x=>x.trim()).filter(Boolean)):null;

const [corpusText,barePrompt,comparisonSchemaText]=await Promise.all([
  readFile(path.join(HERE,'CASES.json'),'utf8'),
  readFile(path.join(ROOT,'prompts','bare-action-v0.7-system-prompt.md'),'utf8'),
  readFile(path.join(ROOT,'schemas','action-comparison-v0.7.schema.json'),'utf8')
]);
const corpus=JSON.parse(corpusText);const comparisonSchema=JSON.parse(comparisonSchemaText);
let cases=corpus.cases.filter(c=>!only||only.has(c.caseId));
if(!cases.length)throw new Error('No matching cases.');

const runId=new Date().toISOString().replace(/[:.]/g,'-');
const outDir=path.join(HERE,'model-runs',runId);await mkdir(outDir,{recursive:true});
const log=[];

function caseRecord(c){
  const text=`${c.vignette}\n\nDecision: ${c.decision}`;
  return {
    schemaVersion:'0.2',guideVersion:'0.7.0',caseId:c.caseId,createdAt:new Date().toISOString(),
    context:{situation:text,whatMatters:'',stakeholders:'',uncertainties:'',decisionHorizon:'',recoveryHorizon:'',urgency:'Medium'},
    evidence:[{id:'t1',text,provenance:'unknown',about:'system',confidence:'medium'}],
    horizons:[],contractions:{primary:'',disconfirmingEvidence:'',missingPerspective:'',narratorImplicated:false},
    powerSafety:{fearRetaliation:'Unknown',constrainedExit:'Unknown',surveillanceControl:'Unknown',materialDependence:'Unknown',powerAsymmetry:'Unknown',notes:''},
    safetyGateActive:false,safetyUnresolved:true,
    viability:{foreclose:'',regenerate:'',viabilityFloor:'',trajectoryConcern:''},moves:[],admin:'',commandSignal:''
  };
}

async function post(url,body){const r=await fetch(url,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});const text=await r.text();let parsed;try{parsed=JSON.parse(text);}catch{parsed={raw:text};}if(!r.ok)throw new Error(`${r.status} ${parsed?.error||text}`);return parsed;}

function neutralizeRheo(actionSet,firstActionId,firstActionWhy,c){
  return {
    schemaVersion:'0.7',caseId:c.caseId,
    actions:actionSet.actions.map((x,i)=>({
      id:`a${i+1}`,
      action:x.action,
      rationale:x.whyThisAction,
      makesPossible:x.prediction?.whatShouldBecomeMorePossible||'Not specified.',
      downsideOrCost:Array.isArray(x.displacedCosts)&&x.displacedCosts.length?x.displacedCosts.join(' | '):'No specific downside identified.',
      stopReviseSignal:x.stopOrChangeSignal||'Revise if new evidence changes the assessment.'
    })),
    firstActionId,
    firstActionWhy,
    uncertainty:Array.isArray(actionSet.actions)?[...new Set(actionSet.actions.flatMap(x=>x.assumptions||[]))].slice(0,8):[]
  };
}

async function chooseRheoFirst(actionSet,c){
  if(PROVIDER==='fixture')return {firstActionId:'a1',firstActionWhy:'Fixture mode selects the first option only to exercise the pipeline.',model:'fixture-v0.7-selector',responseId:null,researchUsable:false};
  if(!API_KEY)throw new Error('OPENAI_API_KEY is required for openai benchmark runs.');
  const items=actionSet.actions.map((x,i)=>({id:`a${i+1}`,action:x.action,rationale:x.whyThisAction,signal:x.prediction?.observableSignal||'',stop:x.stopOrChangeSignal||''}));
  const schema={type:'object',additionalProperties:false,required:['firstActionId','firstActionWhy'],properties:{firstActionId:{type:'string',enum:['a1','a2','a3']},firstActionWhy:{type:'string',minLength:1}}};
  const response=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{authorization:`Bearer ${API_KEY}`,'content-type':'application/json'},body:JSON.stringify({model:MODEL,instructions:'Choose which of the three already-proposed actions should be tried first in this case. Do not invent a new action. Base the choice only on the case and the three options. Prefer the action that best balances usefulness, learning and avoidable downside; do not default to delay merely because it is reversible. Return only the requested JSON.',input:[{role:'user',content:[{type:'input_text',text:JSON.stringify({caseId:c.caseId,vignette:c.vignette,decision:c.decision,actions:items})}]}],text:{format:{type:'json_schema',name:'rheo_first_action_v0_7',strict:true,schema}},store:false})});
  const raw=await response.json();if(!response.ok)throw new Error(`OpenAI selector ${response.status}: ${raw?.error?.message||JSON.stringify(raw)}`);const out=JSON.parse(extractOutputText(raw));return {...out,model:raw.model||MODEL,responseId:raw.id||null,researchUsable:true};
}

async function runRheo(c){
  const cr=caseRecord(c);
  const flowResp=await post(`${BASE}/api/rheo-flow`,{caseRecord:cr});
  const testimony=[{role:'participant',text:`${c.vignette}\n\nDecision: ${c.decision}`}];
  const actionResp=await post(`${BASE}/api/rheo-actions`,{caseId:c.caseId,flow:flowResp.flow,testimony});
  const selected=await chooseRheoFirst(actionResp.actionSet,c);
  return {comparison:neutralizeRheo(actionResp.actionSet,selected.firstActionId,selected.firstActionWhy,c),diagnostic:{flow:flowResp.flow,actionSet:actionResp.actionSet},metadata:{provider:actionResp.provider,model:actionResp.model,responseId:actionResp.responseId,selectorModel:selected.model,selectorResponseId:selected.responseId,researchUsable:Boolean(actionResp.researchUsable&&selected.researchUsable)}};
}

function fixtureBare(c){return {comparison:{schemaVersion:'0.7',caseId:c.caseId,actions:[1,2,3].map(i=>({id:`a${i}`,action:`Fixture baseline action ${i}`,rationale:'Fixture mode only.',makesPossible:'Exercises the comparison schema.',downsideOrCost:'No real case inference in fixture mode.',stopReviseSignal:'Replace fixture output with a real model run.'})),firstActionId:'a1',firstActionWhy:'Fixture mode only.',uncertainty:['Fixture output is not research evidence.']},metadata:{provider:'fixture',model:'fixture-bare-v0.7',responseId:null,researchUsable:false}};}

async function runBare(c){
  if(PROVIDER==='fixture')return fixtureBare(c);
  if(!API_KEY)throw new Error('OPENAI_API_KEY is required for openai benchmark runs.');
  const response=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{authorization:`Bearer ${API_KEY}`,'content-type':'application/json'},body:JSON.stringify({model:MODEL,instructions:barePrompt,input:[{role:'user',content:[{type:'input_text',text:`CASE_ID: ${c.caseId}\n\n${c.vignette}\n\nDecision: ${c.decision}\n\nPreserve CASE_ID exactly as caseId.`}]}],text:{format:{type:'json_schema',name:'action_comparison_v0_7',strict:true,schema:comparisonSchema}},store:false})});
  const raw=await response.json();if(!response.ok)throw new Error(`OpenAI bare ${response.status}: ${raw?.error?.message||JSON.stringify(raw)}`);const comparison=JSON.parse(extractOutputText(raw));return {comparison,metadata:{provider:'openai',model:raw.model||MODEL,responseId:raw.id||null,researchUsable:true}};
}

console.log(`Synthetic action benchmark v0.7 | cases=${cases.length} | samples=${SAMPLES} | provider=${PROVIDER} | model=${MODEL}`);
console.log(`Output: ${outDir}`);

for(const c of shuffled(cases)){
  for(let sample=1;sample<=SAMPLES;sample++){
    for(const condition of shuffled(['bare','rheo'])){
      const started=Date.now();
      try{
        const result=condition==='bare'?await runBare(c):await runRheo(c);
        const envelope={experiment:'synthetic-action-v0.7',caseId:c.caseId,caseTitle:c.title,caseHash:hashText(`${c.vignette}\n${c.decision}`),condition,sample,createdAt:new Date().toISOString(),...result.metadata,comparison:result.comparison};
        if(result.diagnostic)envelope.diagnostic=result.diagnostic;
        const file=`${c.caseId}.${condition}.s${String(sample).padStart(2,'0')}.json`;
        await writeFile(path.join(outDir,file),JSON.stringify(envelope,null,2));
        log.push({caseId:c.caseId,condition,sample,ok:true,ms:Date.now()-started,file,provider:result.metadata.provider,model:result.metadata.model,researchUsable:result.metadata.researchUsable});
        console.log(`${c.caseId} ${condition.padEnd(4)} s${sample} ok ${Date.now()-started}ms`);
      }catch(e){log.push({caseId:c.caseId,condition,sample,ok:false,ms:Date.now()-started,error:e.message});console.error(`${c.caseId} ${condition.padEnd(4)} s${sample} FAIL ${e.message}`);}
    }
  }
}

await writeFile(path.join(outDir,'_run_log.json'),JSON.stringify({experiment:'synthetic-action-v0.7',runId,createdAt:new Date().toISOString(),corpusSha256:hashText(corpusText),barePromptSha256:hashText(barePrompt),comparisonSchemaSha256:hashText(comparisonSchemaText),samplesPerCondition:SAMPLES,provider:PROVIDER,model:MODEL,base:BASE,log},null,2));
const failures=log.filter(x=>!x.ok);console.log(`\n${log.length} attempts | ${failures.length} failures`);if(failures.length)process.exitCode=2;
