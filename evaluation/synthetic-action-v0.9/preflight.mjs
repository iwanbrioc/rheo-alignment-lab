#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE=path.dirname(fileURLToPath(import.meta.url));
const ROOT=path.resolve(HERE,'../..');
const BASE=process.env.RHEO_BASE||'http://127.0.0.1:8080';
const PROVIDER=process.env.RHEO_MODEL_PROVIDER||'fixture';
const MODEL=process.env.OPENAI_MODEL||'gpt-5.6';
const API_KEY=process.env.OPENAI_API_KEY||'';

function fail(message){console.error(`v0.9 preflight failed: ${message}`);process.exit(2);}
function looksPlaceholder(v){return !String(v||'').trim()||/YOUR[_ -]?API|API[_ -]?KEY[_ -]?HERE|REPLACE[_ -]?ME|export\s+OPENAI_API_KEY/i.test(String(v));}
function extractOutputText(raw){if(typeof raw?.output_text==='string'&&raw.output_text.trim())return raw.output_text;for(const item of raw?.output||[])for(const c of item?.content||[])if(typeof c?.text==='string'&&c.text.trim())return c.text;throw new Error('OpenAI response contained no output text');}
async function post(url,body){const r=await fetch(url,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});const text=await r.text();let p;try{p=JSON.parse(text);}catch{p={raw:text};}if(!r.ok)fail(`${url} returned ${r.status}: ${p?.error||text}${Array.isArray(p?.details)?` | ${p.details.join(' ; ')}`:''}`);return p;}

const frozenFiles=[
  'docs/RHEO_CANONICAL_OPERATIONAL_LEXICON_v0.9.md',
  'prompts/rheo-v0.9-flow-system-prompt.md',
  'prompts/rheo-actions-v0.9-system-prompt.md',
  'schemas/rheo-flow-v0.9.schema.json',
  'schemas/rheo-actions-v0.9.schema.json',
  'server_v0_9.mjs'
];
try{execFileSync('git',['diff','--quiet','origin/v0.9-operational-freeze','--',...frozenFiles],{cwd:ROOT,stdio:'ignore'});}catch{fail('v0.9 implementation differs from origin/v0.9-operational-freeze. Do not run confirmatory evidence on a drifted implementation.');}

const [corpusText,comparisonSchemaText,matchedDiagnosisPrompt,matchedActionPrompt]=await Promise.all([
  readFile(path.join(HERE,'CASES.json'),'utf8'),
  readFile(path.join(ROOT,'schemas','action-comparison-v0.7.schema.json'),'utf8'),
  readFile(path.join(ROOT,'prompts','matched-diagnosis-v0.8-system-prompt.md'),'utf8'),
  readFile(path.join(ROOT,'prompts','matched-action-v0.8-system-prompt.md'),'utf8')
]);
const corpus=JSON.parse(corpusText),comparisonSchema=JSON.parse(comparisonSchemaText);
if(!Array.isArray(corpus.cases)||corpus.cases.length!==10)fail(`CASES.json must contain exactly 10 cases; found ${corpus.cases?.length}`);
if(new Set(corpus.cases.map(c=>c.caseId)).size!==10)fail('CASES.json contains duplicate caseIds.');
if(corpus.cases.some(c=>!/^SYN-2\d\d$/.test(c.caseId)))fail('v0.9 caseIds must be SYN-2xx.');

let health;
try{const r=await fetch(`${BASE}/api/health`);health=await r.json();if(!r.ok)fail(`v0.9 server health returned ${r.status}: ${JSON.stringify(health)}`);}catch(e){fail(`cannot reach v0.9 server at ${BASE}: ${e.message}`);}
if(!String(health?.version||'').startsWith('0.9'))fail(`expected v0.9 server; got ${health?.version||'unknown'}`);
if(health?.provider!==PROVIDER)fail(`provider mismatch: shell=${PROVIDER}, server=${health?.provider||'unknown'}`);

if(PROVIDER==='openai'){
  if(looksPlaceholder(API_KEY))fail('OPENAI_API_KEY is missing or contains placeholder/command text. Set it locally; never paste it into chat or files.');
  try{const r=await fetch('https://api.openai.com/v1/models',{headers:{authorization:`Bearer ${API_KEY}`}});const body=await r.json();if(!r.ok)fail(`OpenAI rejected API key (${r.status}): ${body?.error?.message||'authentication failed'}`);}catch(e){fail(`could not validate API key: ${e.message}`);}

  const probe='Preflight only: an organisation faces a time-limited practical decision with uncertain evidence. This is not benchmark evidence.';
  const caseRecord={schemaVersion:'0.2',guideVersion:'0.9.0-preflight',caseId:'PREFLIGHT-ONLY',createdAt:new Date().toISOString(),context:{situation:probe,whatMatters:'',stakeholders:'',uncertainties:'',decisionHorizon:'',recoveryHorizon:'',urgency:'Low'},evidence:[{id:'t1',text:probe,provenance:'unknown',about:'system',confidence:'low'}],horizons:[],contractions:{primary:'',disconfirmingEvidence:'',missingPerspective:'',narratorImplicated:false},powerSafety:{fearRetaliation:'Unknown',constrainedExit:'Unknown',surveillanceControl:'Unknown',materialDependence:'Unknown',powerAsymmetry:'Unknown',notes:''},safetyGateActive:false,safetyUnresolved:true,viability:{foreclose:'',regenerate:'',viabilityFloor:'',trajectoryConcern:''},moves:[],admin:'',commandSignal:''};
  const flow=await post(`${BASE}/api/rheo-flow`,{caseRecord});
  await post(`${BASE}/api/rheo-actions`,{caseId:'PREFLIGHT-ONLY',flow:flow.flow,testimony:[{role:'participant',text:probe}]});

  const diagnosisSchema={type:'object',additionalProperties:false,required:['presentingProblem','plausibleGeneratingCondition','alternativeExplanation','stakeholders','hiddenBurdens','deadlineOrOptionRisk','irreversibleRisks','decisiveQuestions','disconfirmingEvidence','missingInformation'],properties:{presentingProblem:{type:'string'},plausibleGeneratingCondition:{type:'string'},alternativeExplanation:{type:'string'},stakeholders:{type:'array',items:{type:'string'},maxItems:10},hiddenBurdens:{type:'array',items:{type:'string'},maxItems:10},deadlineOrOptionRisk:{type:'string'},irreversibleRisks:{type:'array',items:{type:'string'},maxItems:8},decisiveQuestions:{type:'array',items:{type:'string'},maxItems:6},disconfirmingEvidence:{type:'array',items:{type:'string'},maxItems:6},missingInformation:{type:'array',items:{type:'string'},maxItems:8}}};
  const d=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{authorization:`Bearer ${API_KEY}`,'content-type':'application/json'},body:JSON.stringify({model:MODEL,instructions:matchedDiagnosisPrompt,input:[{role:'user',content:[{type:'input_text',text:`CASE_ID: PREFLIGHT-ONLY\n\n${probe}`}]}],text:{format:{type:'json_schema',name:'matched_diagnosis_v0_9_preflight',strict:true,schema:diagnosisSchema}},store:false})});
  const dr=await d.json();if(!d.ok)fail(`matched diagnosis probe returned ${d.status}: ${dr?.error?.message||JSON.stringify(dr)}`);const diagnosis=JSON.parse(extractOutputText(dr));
  const ar=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{authorization:`Bearer ${API_KEY}`,'content-type':'application/json'},body:JSON.stringify({model:MODEL,instructions:matchedActionPrompt,input:[{role:'user',content:[{type:'input_text',text:JSON.stringify({caseId:'PREFLIGHT-ONLY',vignette:probe,decision:'What should happen next?',neutralDecisionMap:diagnosis})}]}],text:{format:{type:'json_schema',name:'action_comparison_v0_9_preflight',strict:true,schema:comparisonSchema}},store:false})});
  const raw=await ar.json();if(!ar.ok)fail(`matched action probe returned ${ar.status}: ${raw?.error?.message||JSON.stringify(raw)}`);
}

console.log(`v0.9 preflight ok | cases=10 | server=${health.version} | provider=${PROVIDER} | model=${health.model||MODEL} | implementation=frozen`);
