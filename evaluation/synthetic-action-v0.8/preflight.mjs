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

function looksPlaceholder(value){const v=String(value||'').trim();return !v||/YOUR[_ -]?API|API[_ -]?KEY[_ -]?HERE|REPLACE[_ -]?ME|export\s+OPENAI_API_KEY/i.test(v);}
function fail(message){console.error(`v0.8 preflight failed: ${message}`);process.exit(2);}
function extractOutputText(raw){if(typeof raw?.output_text==='string'&&raw.output_text.trim())return raw.output_text;for(const item of raw?.output||[])for(const c of item?.content||[])if(typeof c?.text==='string'&&c.text.trim())return c.text;throw new Error('OpenAI response contained no output text');}

async function post(url,body){const r=await fetch(url,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});const text=await r.text();let parsed;try{parsed=JSON.parse(text);}catch{parsed={raw:text};}if(!r.ok){const details=Array.isArray(parsed?.details)&&parsed.details.length?` | details: ${parsed.details.join(' ; ')}`:'';fail(`${url} returned ${r.status}: ${parsed?.error||text}${details}`);}return parsed;}

const [corpusText,comparisonSchemaText,matchedDiagnosisPrompt,matchedActionPrompt]=await Promise.all([
  readFile(path.join(HERE,'CASES.json'),'utf8'),
  readFile(path.join(ROOT,'schemas','action-comparison-v0.7.schema.json'),'utf8'),
  readFile(path.join(ROOT,'prompts','matched-diagnosis-v0.8-system-prompt.md'),'utf8'),
  readFile(path.join(ROOT,'prompts','matched-action-v0.8-system-prompt.md'),'utf8')
]);
const corpus=JSON.parse(corpusText);const comparisonSchema=JSON.parse(comparisonSchemaText);
if(!Array.isArray(corpus.cases)||corpus.cases.length!==10)fail(`CASES.json must contain exactly 10 cases; found ${corpus.cases?.length}`);
if(new Set(corpus.cases.map(c=>c.caseId)).size!==10)fail('CASES.json contains duplicate caseIds.');
if(corpus.cases.some(c=>!/^SYN-1\d\d$/.test(c.caseId)))fail('v0.8 caseIds must be SYN-1xx to remain distinct from v0.7.');

let health;
try{const r=await fetch(`${BASE}/api/health`);health=await r.json();if(!r.ok)fail(`Rheo server health check returned ${r.status}: ${JSON.stringify(health)}`);}catch(e){fail(`cannot reach Rheo server at ${BASE}: ${e.message}`);}
if(health?.provider!==PROVIDER)fail(`provider mismatch: benchmark shell says ${PROVIDER}, server says ${health?.provider||'unknown'}.`);

if(PROVIDER==='openai'){
  if(looksPlaceholder(API_KEY))fail('OPENAI_API_KEY is missing or still contains placeholder/command text. Set it locally; do not paste it into chat.');
  try{const r=await fetch('https://api.openai.com/v1/models',{headers:{authorization:`Bearer ${API_KEY}`}});const body=await r.json();if(!r.ok)fail(`OpenAI rejected the benchmark-shell API key (${r.status}): ${body?.error?.message||'authentication failed'}`);}catch(e){fail(`could not validate the benchmark-shell API key: ${e.message}`);}

  const probe='Preflight only: a small organisation has a time-limited decision, uncertain evidence and several affected stakeholders. This is not benchmark evidence.';
  const caseRecord={schemaVersion:'0.2',guideVersion:'0.8.0-preflight',caseId:'PREFLIGHT-ONLY',createdAt:new Date().toISOString(),context:{situation:probe,whatMatters:'',stakeholders:'',uncertainties:'',decisionHorizon:'',recoveryHorizon:'',urgency:'Low'},evidence:[{id:'t1',text:probe,provenance:'unknown',about:'system',confidence:'low'}],horizons:[],contractions:{primary:'',disconfirmingEvidence:'',missingPerspective:'',narratorImplicated:false},powerSafety:{fearRetaliation:'Unknown',constrainedExit:'Unknown',surveillanceControl:'Unknown',materialDependence:'Unknown',powerAsymmetry:'Unknown',notes:''},safetyGateActive:false,safetyUnresolved:true,viability:{foreclose:'',regenerate:'',viabilityFloor:'',trajectoryConcern:''},moves:[],admin:'',commandSignal:''};
  const flowResp=await post(`${BASE}/api/rheo-flow`,{caseRecord});
  await post(`${BASE}/api/rheo-actions`,{caseId:'PREFLIGHT-ONLY',flow:flowResp.flow,testimony:[{role:'participant',text:probe}]});

  const diagnosisSchema={type:'object',additionalProperties:false,required:['presentingProblem','plausibleGeneratingCondition','alternativeExplanation','stakeholders','hiddenBurdens','deadlineOrOptionRisk','irreversibleRisks','decisiveQuestions','disconfirmingEvidence','missingInformation'],properties:{presentingProblem:{type:'string'},plausibleGeneratingCondition:{type:'string'},alternativeExplanation:{type:'string'},stakeholders:{type:'array',items:{type:'string'},maxItems:10},hiddenBurdens:{type:'array',items:{type:'string'},maxItems:10},deadlineOrOptionRisk:{type:'string'},irreversibleRisks:{type:'array',items:{type:'string'},maxItems:8},decisiveQuestions:{type:'array',items:{type:'string'},maxItems:6},disconfirmingEvidence:{type:'array',items:{type:'string'},maxItems:6},missingInformation:{type:'array',items:{type:'string'},maxItems:8}}};
  const diagResp=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{authorization:`Bearer ${API_KEY}`,'content-type':'application/json'},body:JSON.stringify({model:MODEL,instructions:matchedDiagnosisPrompt,input:[{role:'user',content:[{type:'input_text',text:`CASE_ID: PREFLIGHT-ONLY\n\n${probe}`}]}],text:{format:{type:'json_schema',name:'matched_diagnosis_v0_8_preflight',strict:true,schema:diagnosisSchema}},store:false})});
  const diagRaw=await diagResp.json();if(!diagResp.ok)fail(`matched diagnosis probe returned ${diagResp.status}: ${diagRaw?.error?.message||JSON.stringify(diagRaw)}`);
  const diagnosis=JSON.parse(extractOutputText(diagRaw));

  const actionResp=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{authorization:`Bearer ${API_KEY}`,'content-type':'application/json'},body:JSON.stringify({model:MODEL,instructions:matchedActionPrompt,input:[{role:'user',content:[{type:'input_text',text:JSON.stringify({caseId:'PREFLIGHT-ONLY',vignette:probe,decision:'What should happen next?',neutralDecisionMap:diagnosis})}]}],text:{format:{type:'json_schema',name:'action_comparison_v0_8_preflight',strict:true,schema:comparisonSchema}},store:false})});
  const actionRaw=await actionResp.json();if(!actionResp.ok)fail(`matched action schema probe returned ${actionResp.status}: ${actionRaw?.error?.message||JSON.stringify(actionRaw)}`);
}

console.log(`v0.8 preflight ok | cases=10 | server=${health.version||'unknown'} | provider=${PROVIDER} | model=${health.model||MODEL}`);
