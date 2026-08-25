#!/usr/bin/env node
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
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
const BASE=a.base||process.env.RHEO_BASE||'http://127.0.0.1:8080';
const HIST_PORT=Number(process.env.RHEO_V08_PORT||8098);
const HIST_INNER_PORT=Number(process.env.RHEO_V08_INNER_PORT||8097);
const HIST_BASE=`http://127.0.0.1:${HIST_PORT}`;
const SAMPLES=Math.max(1,Number(a.samples||3));
const MODEL=process.env.OPENAI_MODEL||'gpt-5.6';
const API_KEY=process.env.OPENAI_API_KEY||'';
const PROVIDER=process.env.RHEO_MODEL_PROVIDER||'fixture';
const only=a.case?new Set(String(a.case).split(',').map(x=>x.trim()).filter(Boolean)):null;
const CONDITIONS=['bare','matched','rheo_v08','rheo_v09'];

const [
  corpusText,barePrompt,matchedDiagnosisPrompt,matchedActionPrompt,comparisonSchemaText,
  rheoV08FlowPrompt,rheoV08ActionPrompt,rheoV09FlowPrompt,rheoV09ActionPrompt,
  serverV06Text,serverV09Text
]=await Promise.all([
  readFile(path.join(HERE,'CASES.json'),'utf8'),
  readFile(path.join(ROOT,'prompts','bare-action-v0.7-system-prompt.md'),'utf8'),
  readFile(path.join(ROOT,'prompts','matched-diagnosis-v0.8-system-prompt.md'),'utf8'),
  readFile(path.join(ROOT,'prompts','matched-action-v0.8-system-prompt.md'),'utf8'),
  readFile(path.join(ROOT,'schemas','action-comparison-v0.7.schema.json'),'utf8'),
  readFile(path.join(ROOT,'prompts','rheo-v0.4-flow-system-prompt.md'),'utf8'),
  readFile(path.join(ROOT,'prompts','rheo-actions-v0.6-system-prompt.md'),'utf8'),
  readFile(path.join(ROOT,'prompts','rheo-v0.9-flow-system-prompt.md'),'utf8'),
  readFile(path.join(ROOT,'prompts','rheo-actions-v0.9-system-prompt.md'),'utf8'),
  readFile(path.join(ROOT,'server_v0_6.mjs'),'utf8'),
  readFile(path.join(ROOT,'server_v0_9.mjs'),'utf8')
]);
const corpus=JSON.parse(corpusText);const comparisonSchema=JSON.parse(comparisonSchemaText);
let cases=corpus.cases.filter(c=>!only||only.has(c.caseId));
if(!cases.length)throw new Error('No matching cases.');

const runId=new Date().toISOString().replace(/[:.]/g,'-');
const outDir=path.join(HERE,'model-runs',runId);await mkdir(outDir,{recursive:true});
const log=[];

const selectorInstructions='Choose which of the three already-proposed actions should be tried first in this case. Do not invent a new action. Base the choice only on the case and the three options. Prefer the minimum sufficient action that best balances usefulness, learning, deadline pressure and avoidable downside. Do not default to delay merely because it is reversible. Reject a first move that depends on something another action has not yet produced. Return only the requested JSON.';

const diagnosisSchema={
  type:'object',additionalProperties:false,
  required:['presentingProblem','plausibleGeneratingCondition','alternativeExplanation','stakeholders','hiddenBurdens','deadlineOrOptionRisk','irreversibleRisks','decisiveQuestions','disconfirmingEvidence','missingInformation'],
  properties:{
    presentingProblem:{type:'string'},plausibleGeneratingCondition:{type:'string'},alternativeExplanation:{type:'string'},
    stakeholders:{type:'array',items:{type:'string'},maxItems:10},hiddenBurdens:{type:'array',items:{type:'string'},maxItems:10},
    deadlineOrOptionRisk:{type:'string'},irreversibleRisks:{type:'array',items:{type:'string'},maxItems:8},
    decisiveQuestions:{type:'array',items:{type:'string'},maxItems:6},disconfirmingEvidence:{type:'array',items:{type:'string'},maxItems:6},
    missingInformation:{type:'array',items:{type:'string'},maxItems:8}
  }
};

function caseRecord(c){
  const text=`${c.vignette}\n\nDecision: ${c.decision}`;
  return {
    schemaVersion:'0.2',guideVersion:'0.9.0',caseId:c.caseId,createdAt:new Date().toISOString(),
    context:{situation:text,whatMatters:'',stakeholders:'',uncertainties:'',decisionHorizon:'',recoveryHorizon:'',urgency:'Medium'},
    evidence:[{id:'t1',text,provenance:'unknown',about:'system',confidence:'medium'}],
    horizons:[],contractions:{primary:'',disconfirmingEvidence:'',missingPerspective:'',narratorImplicated:false},
    powerSafety:{fearRetaliation:'Unknown',constrainedExit:'Unknown',surveillanceControl:'Unknown',materialDependence:'Unknown',powerAsymmetry:'Unknown',notes:''},
    safetyGateActive:false,safetyUnresolved:true,
    viability:{foreclose:'',regenerate:'',viabilityFloor:'',trajectoryConcern:''},moves:[],admin:'',commandSignal:''
  };
}

async function post(url,body){const r=await fetch(url,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});const text=await r.text();let parsed;try{parsed=JSON.parse(text);}catch{parsed={raw:text};}if(!r.ok)throw new Error(`${r.status} ${parsed?.error||text}${Array.isArray(parsed?.details)?` | ${parsed.details.join(' ; ')}`:''}`);return parsed;}

async function structuredCall(instructions,inputText,schema,name){
  if(!API_KEY)throw new Error('OPENAI_API_KEY is required for openai benchmark runs.');
  const response=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{authorization:`Bearer ${API_KEY}`,'content-type':'application/json'},body:JSON.stringify({model:MODEL,instructions,input:[{role:'user',content:[{type:'input_text',text:inputText}]}],text:{format:{type:'json_schema',name,strict:true,schema}},store:false})});
  const raw=await response.json();if(!response.ok)throw new Error(`OpenAI ${name} ${response.status}: ${raw?.error?.message||JSON.stringify(raw)}`);
  return {value:JSON.parse(extractOutputText(raw)),model:raw.model||MODEL,responseId:raw.id||null};
}

function neutralizeRheo(actionSet,c){
  return {
    schemaVersion:'0.7',caseId:c.caseId,
    actions:actionSet.actions.map((x,i)=>({
      id:`a${i+1}`,
      action:x.action,
      rationale:x.whyThisAction,
      makesPossible:x.prediction?.whatShouldBecomeMorePossible||'Not specified.',
      downsideOrCost:Array.isArray(x.displacedCosts)&&x.displacedCosts.length?x.displacedCosts.join(' | '):'No specific downside identified.',
      stopReviseSignal:x.falsifierOrChangeSignal||x.stopOrChangeSignal||'Revise if new evidence changes the assessment.'
    })),
    firstActionId:'a1',
    firstActionWhy:'Selection is performed by the shared condition-neutral selector.',
    uncertainty:Array.isArray(actionSet.actions)?[...new Set(actionSet.actions.flatMap(x=>x.assumptions||[]))].slice(0,8):[]
  };
}

function fixtureComparison(c,label){return {schemaVersion:'0.7',caseId:c.caseId,actions:[1,2,3].map(i=>({id:`a${i}`,action:`Fixture ${label} action ${i}`,rationale:'Fixture mode only.',makesPossible:'Exercises the comparison schema.',downsideOrCost:'No real case inference in fixture mode.',stopReviseSignal:'Replace fixture output with a real model run.'})),firstActionId:'a1',firstActionWhy:'Fixture mode only.',uncertainty:['Fixture output is not research evidence.']};}

function normalizeComparison(comparison,c){
  if(!comparison||!Array.isArray(comparison.actions)||comparison.actions.length!==3)throw new Error('comparison must contain exactly three actions');
  comparison.schemaVersion='0.7';comparison.caseId=c.caseId;comparison.actions.forEach((x,i)=>{x.id=`a${i+1}`;});
  comparison.firstActionId='a1';comparison.firstActionWhy='Selection is performed by the shared condition-neutral selector.';return comparison;
}

async function runRheo(c,base,label){
  const cr=caseRecord(c);
  const flowResp=await post(`${base}/api/rheo-flow`,{caseRecord:cr});
  const testimony=[{role:'participant',text:`${c.vignette}\n\nDecision: ${c.decision}`}];
  const actionResp=await post(`${base}/api/rheo-actions`,{caseId:c.caseId,flow:flowResp.flow,testimony});
  return {comparison:neutralizeRheo(actionResp.actionSet,c),diagnostic:{flow:flowResp.flow,actionSet:actionResp.actionSet},metadata:{provider:actionResp.provider,model:actionResp.model,responseId:actionResp.responseId,researchUsable:Boolean(actionResp.researchUsable),pipeline:label}};
}

async function runBare(c){
  if(PROVIDER==='fixture')return {comparison:fixtureComparison(c,'bare'),metadata:{provider:'fixture',model:'fixture-bare-v0.9',responseId:null,researchUsable:false}};
  const r=await structuredCall(barePrompt,`CASE_ID: ${c.caseId}\n\n${c.vignette}\n\nDecision: ${c.decision}\n\nPreserve CASE_ID exactly as caseId.`,comparisonSchema,'action_comparison_v0_9_bare');
  return {comparison:r.value,metadata:{provider:'openai',model:r.model,responseId:r.responseId,researchUsable:true}};
}

async function runMatched(c){
  if(PROVIDER==='fixture')return {comparison:fixtureComparison(c,'matched'),diagnostic:{neutralDecisionMap:{fixture:true}},metadata:{provider:'fixture',model:'fixture-matched-v0.9',responseId:null,diagnosisResponseId:null,researchUsable:false}};
  const d=await structuredCall(matchedDiagnosisPrompt,`CASE_ID: ${c.caseId}\n\n${c.vignette}\n\nDecision: ${c.decision}`,diagnosisSchema,'matched_diagnosis_v0_9');
  const actionInput=JSON.stringify({caseId:c.caseId,vignette:c.vignette,decision:c.decision,neutralDecisionMap:d.value});
  const r=await structuredCall(matchedActionPrompt,actionInput,comparisonSchema,'action_comparison_v0_9_matched');
  return {comparison:r.value,diagnostic:{neutralDecisionMap:d.value},metadata:{provider:'openai',model:r.model,responseId:r.responseId,diagnosisResponseId:d.responseId,researchUsable:true}};
}

async function chooseFirst(comparison,c){
  if(PROVIDER==='fixture')return {firstActionId:'a1',firstActionWhy:'Fixture mode selects the first option only to exercise the pipeline.',model:'fixture-v0.9-selector',responseId:null,researchUsable:false};
  const items=comparison.actions.map((x,i)=>({id:`a${i+1}`,action:x.action,rationale:x.rationale,makesPossible:x.makesPossible,downsideOrCost:x.downsideOrCost,stopReviseSignal:x.stopReviseSignal}));
  const schema={type:'object',additionalProperties:false,required:['firstActionId','firstActionWhy'],properties:{firstActionId:{type:'string',enum:['a1','a2','a3']},firstActionWhy:{type:'string',minLength:1}}};
  const r=await structuredCall(selectorInstructions,JSON.stringify({caseId:c.caseId,vignette:c.vignette,decision:c.decision,actions:items}),schema,'shared_first_action_v0_9');
  return {...r.value,model:r.model,responseId:r.responseId,researchUsable:true};
}

function actionChars(comparison){return comparison.actions.reduce((n,x)=>n+String(x.action||'').length+String(x.rationale||'').length+String(x.makesPossible||'').length+String(x.downsideOrCost||'').length+String(x.stopReviseSignal||'').length,0);}

async function waitForHealth(base,expectedVersion,timeoutMs=20000){
  const start=Date.now();let last='';
  while(Date.now()-start<timeoutMs){try{const r=await fetch(`${base}/api/health`);const h=await r.json();if(r.ok&&String(h.version||'').startsWith(expectedVersion))return h;last=JSON.stringify(h);}catch(e){last=e.message;}await new Promise(r=>setTimeout(r,250));}
  throw new Error(`Timed out waiting for ${base} health ${expectedVersion}; last=${last}`);
}

let historical=null;let shuttingDown=false;
function stopHistorical(){if(!historical)return;try{historical.kill('SIGTERM');}catch{}historical=null;}
function shutdown(signal){if(shuttingDown)return;shuttingDown=true;console.log(`Stopping benchmark (${signal})`);stopHistorical();process.exit(signal==='SIGTERM'?0:1);}
process.on('SIGINT',()=>shutdown('SIGINT'));process.on('SIGTERM',()=>shutdown('SIGTERM'));

if(PROVIDER!=='fixture'){
  historical=spawn(process.execPath,['server_v0_6.mjs'],{cwd:ROOT,env:{...process.env,PORT:String(HIST_PORT),RHEO_INNER_PORT:String(HIST_INNER_PORT)},stdio:['ignore','pipe','pipe']});
  historical.stdout.on('data',d=>process.stdout.write(`[rheo_v08] ${d}`));
  historical.stderr.on('data',d=>process.stderr.write(`[rheo_v08] ${d}`));
  historical.on('exit',(code,signal)=>{if(!shuttingDown&&code!==0){console.error(`Historical Rheo server exited code=${code} signal=${signal}`);}});
  await waitForHealth(HIST_BASE,'0.6');
}

console.log(`Synthetic action benchmark v0.9 | cases=${cases.length} | samples=${SAMPLES} | conditions=${CONDITIONS.join(',')} | provider=${PROVIDER} | model=${MODEL}`);
console.log(`v0.9 base=${BASE} | historical v0.8 base=${HIST_BASE}`);
console.log(`Output: ${outDir}`);

try{
  for(const c of shuffled(cases)){
    for(let sample=1;sample<=SAMPLES;sample++){
      for(const condition of shuffled(CONDITIONS)){
        const started=Date.now();
        try{
          let result;
          if(condition==='bare')result=await runBare(c);
          else if(condition==='matched')result=await runMatched(c);
          else if(condition==='rheo_v08')result=PROVIDER==='fixture'?{comparison:fixtureComparison(c,'rheo_v08'),metadata:{provider:'fixture',model:'fixture-rheo-v08',responseId:null,researchUsable:false}}:await runRheo(c,HIST_BASE,'rheo_v08');
          else result=PROVIDER==='fixture'?{comparison:fixtureComparison(c,'rheo_v09'),metadata:{provider:'fixture',model:'fixture-rheo-v09',responseId:null,researchUsable:false}}:await runRheo(c,BASE,'rheo_v09');
          normalizeComparison(result.comparison,c);
          const selected=await chooseFirst(result.comparison,c);
          result.comparison.firstActionId=selected.firstActionId;result.comparison.firstActionWhy=selected.firstActionWhy;
          const envelope={experiment:'synthetic-action-v0.9',caseId:c.caseId,caseTitle:c.title,caseHash:hashText(`${c.vignette}\n${c.decision}`),condition,sample,createdAt:new Date().toISOString(),...result.metadata,selectorModel:selected.model,selectorResponseId:selected.responseId,researchUsable:Boolean(result.metadata.researchUsable&&selected.researchUsable),comparison:result.comparison};
          if(result.diagnostic)envelope.diagnostic=result.diagnostic;
          const file=`${c.caseId}.${condition}.s${String(sample).padStart(2,'0')}.json`;
          await writeFile(path.join(outDir,file),JSON.stringify(envelope,null,2));
          log.push({caseId:c.caseId,condition,sample,ok:true,ms:Date.now()-started,file,provider:result.metadata.provider,model:result.metadata.model,researchUsable:envelope.researchUsable,comparisonChars:JSON.stringify(result.comparison).length,actionContentChars:actionChars(result.comparison)});
          console.log(`${c.caseId} ${condition.padEnd(9)} s${sample} ok ${Date.now()-started}ms`);
        }catch(e){log.push({caseId:c.caseId,condition,sample,ok:false,ms:Date.now()-started,error:e.message});console.error(`${c.caseId} ${condition.padEnd(9)} s${sample} FAIL ${e.message}`);}
      }
    }
  }
}finally{stopHistorical();}

await writeFile(path.join(outDir,'_run_log.json'),JSON.stringify({
  experiment:'synthetic-action-v0.9',runId,createdAt:new Date().toISOString(),samplesPerCondition:SAMPLES,provider:PROVIDER,model:MODEL,base:BASE,historicalBase:HIST_BASE,
  design:{conditions:CONDITIONS,sharedSelector:true,matchedControlStages:['neutral diagnosis','action generation','shared selector'],rheoV08Stages:['frozen v0.4 flow diagnosis','frozen v0.6 action generation','shared selector'],rheoV09Stages:['frozen v0.9 reciprocal map','frozen v0.9 action generation','shared selector'],operationalFreezeCommit:'2f6f6a72403b068cbb8908aa40ccc26c6b555eb8'},
  hashes:{corpusSha256:hashText(corpusText),barePromptSha256:hashText(barePrompt),matchedDiagnosisPromptSha256:hashText(matchedDiagnosisPrompt),matchedActionPromptSha256:hashText(matchedActionPrompt),rheoV08FlowPromptSha256:hashText(rheoV08FlowPrompt),rheoV08ActionPromptSha256:hashText(rheoV08ActionPrompt),rheoV09FlowPromptSha256:hashText(rheoV09FlowPrompt),rheoV09ActionPromptSha256:hashText(rheoV09ActionPrompt),serverV06Sha256:hashText(serverV06Text),serverV09Sha256:hashText(serverV09Text),comparisonSchemaSha256:hashText(comparisonSchemaText),selectorInstructionsSha256:hashText(selectorInstructions)},
  log
},null,2));
const failures=log.filter(x=>!x.ok);console.log(`\n${log.length} attempts | ${failures.length} failures`);if(failures.length)process.exitCode=2;
