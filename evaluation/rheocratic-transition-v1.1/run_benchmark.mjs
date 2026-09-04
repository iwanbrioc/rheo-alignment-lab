#!/usr/bin/env node
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    if (!argv[i].startsWith('--')) continue;
    const key = argv[i].slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith('--')) out[key] = true;
    else { out[key] = next; i++; }
  }
  return out;
}
function deepClone(x) { return JSON.parse(JSON.stringify(x)); }
function hashText(s) { return crypto.createHash('sha256').update(s).digest('hex'); }
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function shuffled(items) {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = crypto.randomInt(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function extractOutputText(raw) {
  if (typeof raw?.output_text === 'string' && raw.output_text.trim()) return raw.output_text;
  for (const item of raw?.output || []) for (const c of item?.content || []) {
    if (typeof c?.text === 'string' && c.text.trim()) return c.text;
  }
  throw new Error('OpenAI response contained no output text');
}

const argv = parseArgs(process.argv.slice(2));
const SAMPLES = Math.max(1, Number(argv.samples || 2));
const MODEL = process.env.OPENAI_MODEL || 'gpt-5.6';
const PROVIDER = process.env.RHEO_MODEL_PROVIDER || 'fixture';
const API_KEY = process.env.OPENAI_API_KEY || '';
const MAX_TRANSPORT_ATTEMPTS = 3;
const RETRYABLE_HTTP = new Set([408, 429, 500, 502, 503, 504]);
const CONDITIONS = ['neutral_base', 'neutral_transition', 'rheocratic_transition'];
const only = argv.case ? new Set(String(argv.case).split(',').map(x => x.trim()).filter(Boolean)) : null;

const [corpusText, diagnosisPrompt, actionPrompt, neutralTransitionPrompt, rheoTransitionPrompt, finalizerPrompt, comparisonSchemaText, editorSchemaText] = await Promise.all([
  readFile(path.join(HERE, 'CASES.json'), 'utf8'),
  readFile(path.join(ROOT, 'prompts', 'matched-diagnosis-v0.8-system-prompt.md'), 'utf8'),
  readFile(path.join(ROOT, 'prompts', 'matched-action-v0.8-system-prompt.md'), 'utf8'),
  readFile(path.join(ROOT, 'prompts', 'neutral-transition-editor-v1.1-system-prompt.md'), 'utf8'),
  readFile(path.join(ROOT, 'prompts', 'rheocratic-transition-editor-v1.1-system-prompt.md'), 'utf8'),
  readFile(path.join(ROOT, 'prompts', 'transition-finalizer-v1.1-system-prompt.md'), 'utf8'),
  readFile(path.join(ROOT, 'schemas', 'action-comparison-v0.7.schema.json'), 'utf8'),
  readFile(path.join(ROOT, 'schemas', 'transition-editor-v1.1.schema.json'), 'utf8')
]);

const corpus = JSON.parse(corpusText);
const comparisonSchema = JSON.parse(comparisonSchemaText);
const editorSchema = JSON.parse(editorSchemaText);
let cases = corpus.cases.filter(c => !only || only.has(c.caseId));
if (!cases.length) throw new Error('No matching cases.');

const runId = new Date().toISOString().replace(/[:.]/g, '-');
const outDir = path.join(HERE, 'model-runs', runId);
await mkdir(outDir, { recursive: true });
const log = [];
const retryLog = [];

const diagnosisSchema = {
  type: 'object', additionalProperties: false,
  required: ['presentingProblem','plausibleGeneratingCondition','alternativeExplanation','stakeholders','hiddenBurdens','deadlineOrOptionRisk','irreversibleRisks','decisiveQuestions','disconfirmingEvidence','missingInformation'],
  properties: {
    presentingProblem:{type:'string'}, plausibleGeneratingCondition:{type:'string'}, alternativeExplanation:{type:'string'},
    stakeholders:{type:'array',items:{type:'string'},maxItems:10}, hiddenBurdens:{type:'array',items:{type:'string'},maxItems:10},
    deadlineOrOptionRisk:{type:'string'}, irreversibleRisks:{type:'array',items:{type:'string'},maxItems:8},
    decisiveQuestions:{type:'array',items:{type:'string'},maxItems:6}, disconfirmingEvidence:{type:'array',items:{type:'string'},maxItems:6},
    missingInformation:{type:'array',items:{type:'string'},maxItems:8}
  }
};
const selectorSchema = {
  type:'object', additionalProperties:false, required:['firstActionId','firstActionWhy'],
  properties:{ firstActionId:{type:'string',enum:['a1','a2','a3']}, firstActionWhy:{type:'string'} }
};
const selectorInstructions = `Choose which of the three already-proposed actions should be tried first. Do not invent or rewrite an action. Prefer the minimum sufficient action that best balances usefulness, learning, deadline pressure, immediate harm and avoidable downside. Protect live options where cheap. Reject a first move that depends on something another action has not yet produced. Return only the requested JSON.`;

function dynamicComparisonSchema(caseId) {
  const s = deepClone(comparisonSchema);
  s.properties.caseId = { ...s.properties.caseId, enum:[caseId] };
  s.properties.actions.items.properties.id = { ...s.properties.actions.items.properties.id, enum:['a1','a2','a3'] };
  return s;
}
function finalizerSchema(caseId) {
  return {
    type:'object', additionalProperties:false,
    required:['acceptedTransition','acceptanceReason','changedActionId','comparison'],
    properties:{
      acceptedTransition:{type:'boolean'}, acceptanceReason:{type:'string'}, changedActionId:{type:'string',enum:['none','a1','a2','a3']},
      comparison:dynamicComparisonSchema(caseId)
    }
  };
}
function actionPayload(a) {
  return { id:a.id, action:a.action, rationale:a.rationale, makesPossible:a.makesPossible, downsideOrCost:a.downsideOrCost, stopReviseSignal:a.stopReviseSignal };
}
function sameAction(a,b) { return JSON.stringify(actionPayload(a)) === JSON.stringify(actionPayload(b)); }
function normalizeComparison(comparison, c) {
  if (!comparison || !Array.isArray(comparison.actions) || comparison.actions.length !== 3) throw new Error('comparison must contain exactly three actions');
  comparison.schemaVersion = '0.7'; comparison.caseId = c.caseId;
  comparison.actions.forEach((x,i) => { x.id = `a${i+1}`; });
  if (!['a1','a2','a3'].includes(comparison.firstActionId)) comparison.firstActionId = 'a1';
  if (!Array.isArray(comparison.uncertainty)) comparison.uncertainty = [];
  return comparison;
}
function validateEditor(e) {
  if (e.materialTransition) {
    if (e.verdict !== 'MATERIAL TRANSITION') throw new Error('editor verdict/materialTransition mismatch');
    if (e.correctionTarget === 'none') throw new Error('material transition cannot target none');
  } else {
    if (e.verdict !== 'NO MATERIAL TRANSITION') throw new Error('editor verdict/materialTransition mismatch');
    if (e.correctionTarget !== 'none') throw new Error('no-transition finding must target none');
  }
}
function validateFinalized(base, result, editor) {
  const out = result.comparison;
  if (!out || !Array.isArray(out.actions) || out.actions.length !== 3) throw new Error('invalid finalized comparison');
  const changed = out.actions.filter((a,i) => !sameAction(a,base.actions[i])).map(a => a.id);
  if (!editor.materialTransition || !result.acceptedTransition) {
    if (result.acceptedTransition) throw new Error('cannot accept non-material transition');
    if (result.changedActionId !== 'none' || changed.length) throw new Error('rejected/no transition changed action content');
    if (JSON.stringify(out) !== JSON.stringify(base)) throw new Error('rejected/no transition must reproduce base exactly');
    return;
  }
  if (changed.length > 1) throw new Error(`accepted transition changed ${changed.length} actions`);
  if (changed.length === 1 && changed[0] !== editor.correctionTarget) throw new Error('finalizer changed action other than editor target');
  if (changed.length === 1 && result.changedActionId !== changed[0]) throw new Error('changedActionId mismatch');
  if (changed.length === 0 && result.changedActionId !== 'none') throw new Error('changedActionId must be none if action text unchanged');
}

async function fetchResponses(body, callName) {
  let lastError;
  for (let attempt=1; attempt<=MAX_TRANSPORT_ATTEMPTS; attempt++) {
    try {
      const response = await fetch('https://api.openai.com/v1/responses', {
        method:'POST', headers:{ authorization:`Bearer ${API_KEY}`, 'content-type':'application/json' }, body:JSON.stringify(body)
      });
      const text = await response.text();
      let raw; try { raw = JSON.parse(text); } catch { raw = { raw:text }; }
      if (!response.ok) {
        const msg = `OpenAI ${callName} ${response.status}: ${raw?.error?.message || text}`;
        if (RETRYABLE_HTTP.has(response.status) && attempt < MAX_TRANSPORT_ATTEMPTS) {
          retryLog.push({callName,attempt,status:response.status,reason:msg}); await sleep(1000*(2**(attempt-1))); continue;
        }
        throw new Error(msg);
      }
      return raw;
    } catch (e) {
      lastError = e;
      const network = e?.name === 'TypeError' || /fetch failed|ECONNRESET|ETIMEDOUT|EAI_AGAIN|socket|network/i.test(String(e?.message || ''));
      if (network && attempt < MAX_TRANSPORT_ATTEMPTS) { retryLog.push({callName,attempt,status:null,reason:String(e.message||e)}); await sleep(1000*(2**(attempt-1))); continue; }
      throw e;
    }
  }
  throw lastError || new Error(`Unknown failure in ${callName}`);
}
async function structuredCall(instructions, inputText, schema, name) {
  if (!API_KEY) throw new Error('OPENAI_API_KEY is required for openai benchmark runs.');
  const raw = await fetchResponses({
    model:MODEL, instructions,
    input:[{role:'user',content:[{type:'input_text',text:inputText}]}],
    text:{format:{type:'json_schema',name,strict:true,schema}}, store:false
  }, name);
  const value = JSON.parse(extractOutputText(raw));
  return { value, model:raw.model || MODEL, responseId:raw.id || null };
}

function fixtureComparison(c) {
  return {
    schemaVersion:'0.7', caseId:c.caseId,
    actions:[1,2,3].map(i => ({ id:`a${i}`, action:`Fixture neutral action ${i} for ${c.caseId}.`, rationale:'Fixture mode only.', makesPossible:'Exercises paired transition pipeline.', downsideOrCost:'No research inference.', stopReviseSignal:'Replace fixture with real model output.' })),
    firstActionId:'a1', firstActionWhy:'Fixture selector.', uncertainty:['Fixture output is not research evidence.']
  };
}
async function generateNeutral(c) {
  if (PROVIDER === 'fixture') return { comparison:fixtureComparison(c), neutralDecisionMap:{fixture:true}, metadata:{provider:'fixture',model:'fixture-neutral-v1.1'} };
  const d = await structuredCall(diagnosisPrompt, `CASE_ID: ${c.caseId}\n\n${c.vignette}\n\nDecision: ${c.decision}`, diagnosisSchema, 'transition_v11_neutral_diagnosis');
  const a = await structuredCall(actionPrompt, JSON.stringify({caseId:c.caseId,vignette:c.vignette,decision:c.decision,neutralDecisionMap:d.value}), dynamicComparisonSchema(c.caseId), 'transition_v11_neutral_actions');
  const comparison = normalizeComparison(a.value,c);
  const s = await structuredCall(selectorInstructions, JSON.stringify({caseId:c.caseId,vignette:c.vignette,decision:c.decision,actions:comparison.actions}), selectorSchema, 'transition_v11_shared_selector');
  comparison.firstActionId = s.value.firstActionId; comparison.firstActionWhy = s.value.firstActionWhy;
  return { comparison, neutralDecisionMap:d.value, metadata:{provider:'openai',model:a.model,diagnosisResponseId:d.responseId,actionResponseId:a.responseId,selectorResponseId:s.responseId} };
}
function fixtureEditor(kind,c) {
  const material = kind === 'rheocratic_transition' && c.caseId === 'SYN-401';
  return material ? {
    materialTransition:true, verdict:'MATERIAL TRANSITION', observedPathway:'Fixture reusable repair pathway.', persistentEffect:'Fixture capability persists.', reinforcementMechanism:'Repeated use lowers future friction.', affectedBearers:['fixture household','fixture repairer'], immediateAdequacy:'Immediate need remains covered.', viabilityCheck:'Fixture viability check.', smallestRelease:'Add one bounded repair-pathway check.', falsifier:'No reuse or capability gain.', correctionTarget:'a2', proposedChange:'Add a fixture pathway element to action two.'
  } : {
    materialTransition:false, verdict:'NO MATERIAL TRANSITION', observedPathway:'No fixture transition.', persistentEffect:'None.', reinforcementMechanism:'None.', affectedBearers:[], immediateAdequacy:'Base is sufficient.', viabilityCheck:'None needed.', smallestRelease:'None.', falsifier:'None.', correctionTarget:'none', proposedChange:'None.'
  };
}
async function runEditor(kind,c,base) {
  if (PROVIDER === 'fixture') return { value:fixtureEditor(kind,c), model:'fixture-editor-v1.1', responseId:null };
  const prompt = kind === 'neutral_transition' ? neutralTransitionPrompt : rheoTransitionPrompt;
  return structuredCall(prompt, JSON.stringify({caseId:c.caseId,vignette:c.vignette,decision:c.decision,baseComparison:base}), editorSchema, 'transition_v11_editor');
}
async function finalize(c,base,editor) {
  if (!editor.materialTransition) return { value:{acceptedTransition:false,acceptanceReason:'No material transition proposed.',changedActionId:'none',comparison:deepClone(base)}, model:'copy-base', responseId:null };
  if (PROVIDER === 'fixture') {
    const comparison = deepClone(base); const idx = Number(editor.correctionTarget.slice(1))-1;
    comparison.actions[idx].action += ` ${editor.proposedChange}`;
    return { value:{acceptedTransition:true,acceptanceReason:'Fixture accepts material transition.',changedActionId:editor.correctionTarget,comparison}, model:'fixture-finalizer-v1.1', responseId:null };
  }
  return structuredCall(finalizerPrompt, JSON.stringify({caseId:c.caseId,vignette:c.vignette,decision:c.decision,baseComparison:base,transitionFinding:editor}), finalizerSchema(c.caseId), 'transition_v11_finalizer');
}

async function writeRecord(c,condition,sample,sourcePairId,neutral,editor=null,finalizer=null) {
  const comparison = condition === 'neutral_base' ? deepClone(neutral.comparison) : deepClone(finalizer.value.comparison);
  const record = {
    experiment:'rheocratic-transition-v1.1', caseId:c.caseId, caseTitle:c.title, condition, sample, sourcePairId,
    provider:PROVIDER, model:neutral.metadata.model, comparison,
    editor, finalizer:finalizer ? { acceptedTransition:finalizer.value.acceptedTransition, acceptanceReason:finalizer.value.acceptanceReason, changedActionId:finalizer.value.changedActionId, model:finalizer.model, responseId:finalizer.responseId } : null,
    sourceHashes:{case:hashText(JSON.stringify(c)),base:hashText(JSON.stringify(neutral.comparison))}
  };
  const file = `${c.caseId}.${condition}.s${String(sample).padStart(2,'0')}.json`;
  await writeFile(path.join(outDir,file), JSON.stringify(record,null,2)+'\n');
}

console.log(`Rheocratic transition benchmark v1.1 | cases=${cases.length} | pairedSamples=${SAMPLES} | conditions=${CONDITIONS.join(',')} | provider=${PROVIDER} | model=${MODEL}`);
console.log(`Output: ${outDir}`);

for (const c of shuffled(cases)) {
  for (let sample=1; sample<=SAMPLES; sample++) {
    const sourcePairId = `${c.caseId}.s${String(sample).padStart(2,'0')}`;
    const neutralStart = Date.now();
    try {
      const neutral = await generateNeutral(c);
      await writeRecord(c,'neutral_base',sample,sourcePairId,neutral);
      log.push({caseId:c.caseId,condition:'neutral_base',sample,ok:true,ms:Date.now()-neutralStart});
      console.log(`${c.caseId} neutral_base          s${sample} ok ${Date.now()-neutralStart}ms`);
      for (const kind of shuffled(['neutral_transition','rheocratic_transition'])) {
        const started = Date.now();
        try {
          const e = await runEditor(kind,c,neutral.comparison); validateEditor(e.value);
          const f = await finalize(c,neutral.comparison,e.value); f.value.comparison = normalizeComparison(f.value.comparison,c); validateFinalized(neutral.comparison,f.value,e.value);
          await writeRecord(c,kind,sample,sourcePairId,neutral,e.value,f);
          log.push({caseId:c.caseId,condition:kind,sample,ok:true,ms:Date.now()-started});
          console.log(`${c.caseId} ${kind.padEnd(21)} s${sample} ok ${Date.now()-started}ms`);
        } catch (e) {
          log.push({caseId:c.caseId,condition:kind,sample,ok:false,error:String(e.message||e)}); console.error(`${c.caseId} ${kind} s${sample} FAILED: ${e.message||e}`);
        }
      }
    } catch (e) {
      log.push({caseId:c.caseId,condition:'neutral_base',sample,ok:false,error:String(e.message||e)}); console.error(`${c.caseId} neutral_base s${sample} FAILED: ${e.message||e}`);
    }
  }
}

const runLog = {
  experiment:'rheocratic-transition-v1.1', runId, provider:PROVIDER, requestedModel:MODEL, pairedSamplesPerCase:SAMPLES,
  design:{conditions:CONDITIONS,caseCount:cases.length}, log, retryLog,
  promptHashes:{neutralTransition:hashText(neutralTransitionPrompt),rheocraticTransition:hashText(rheoTransitionPrompt),finalizer:hashText(finalizerPrompt)}
};
await writeFile(path.join(outDir,'_run_log.json'), JSON.stringify(runLog,null,2)+'\n');
const failures = log.filter(x => !x.ok).length;
console.log(`${log.length} condition outputs | ${failures} failures | ${retryLog.length} transport/API retries`);
if (failures) process.exitCode = 1;
