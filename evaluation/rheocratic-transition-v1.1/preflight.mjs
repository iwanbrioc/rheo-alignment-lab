#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const PROVIDER = process.env.RHEO_MODEL_PROVIDER || 'fixture';
const MODEL = process.env.OPENAI_MODEL || 'gpt-5.6';
const API_KEY = process.env.OPENAI_API_KEY || '';

function fail(msg) { throw new Error(msg); }
function strictObject(schema,name) {
  if (schema?.type !== 'object' || schema.additionalProperties !== false) fail(`${name} must be strict object`);
  for (const k of schema.required || []) if (!schema.properties?.[k]) fail(`${name} missing required property ${k}`);
}

try {
  if (!['fixture','openai'].includes(PROVIDER)) fail('RHEO_MODEL_PROVIDER must be fixture or openai');
  const [casesText,editorSchemaText,comparisonSchemaText,neutralPrompt,rheoPrompt,finalizerPrompt,designText,analysisText,raterText] = await Promise.all([
    readFile(path.join(HERE,'CASES.json'),'utf8'),
    readFile(path.join(ROOT,'schemas','transition-editor-v1.1.schema.json'),'utf8'),
    readFile(path.join(ROOT,'schemas','action-comparison-v0.7.schema.json'),'utf8'),
    readFile(path.join(ROOT,'prompts','neutral-transition-editor-v1.1-system-prompt.md'),'utf8'),
    readFile(path.join(ROOT,'prompts','rheocratic-transition-editor-v1.1-system-prompt.md'),'utf8'),
    readFile(path.join(ROOT,'prompts','transition-finalizer-v1.1-system-prompt.md'),'utf8'),
    readFile(path.join(HERE,'BENCHMARK_DESIGN.md'),'utf8'),
    readFile(path.join(HERE,'ANALYSIS_PLAN.md'),'utf8'),
    readFile(path.join(HERE,'RATER_PROMPT.md'),'utf8')
  ]);
  const corpus = JSON.parse(casesText);
  if (corpus.version !== '1.1' || corpus.status !== 'prospective') fail('CASES must be version 1.1 prospective');
  if (!Array.isArray(corpus.cases) || corpus.cases.length !== 12) fail('CASES must contain exactly 12 cases');
  const expected = Array.from({length:12},(_,i)=>`SYN-${401+i}`);
  const ids = corpus.cases.map(c=>c.caseId);
  if (new Set(ids).size !== 12 || expected.some(id=>!ids.includes(id))) fail('CASES must contain unique SYN-401 through SYN-412');
  for (const c of corpus.cases) if (!c.title || !c.vignette || !c.decision) fail(`${c.caseId} missing title/vignette/decision`);

  const editorSchema = JSON.parse(editorSchemaText); const comparisonSchema = JSON.parse(comparisonSchemaText);
  strictObject(editorSchema,'transition editor schema'); strictObject(comparisonSchema,'comparison schema');
  if (!editorSchema.properties?.correctionTarget?.enum?.includes('none')) fail('editor schema must allow correctionTarget none');

  for (const [name,p] of [['neutral editor',neutralPrompt],['Rheocratic editor',rheoPrompt]]) {
    if (!p.includes('NO MATERIAL TRANSITION')) fail(`${name} missing abstention rule`);
    if (!p.includes('at most one') && !p.includes('at most one'.toUpperCase())) fail(`${name} missing one-change discipline`);
  }
  if (!rheoPrompt.includes('attention → traversal → reinforcement → connection → easier future traversal')) fail('Rheocratic prompt missing pathway mechanism');
  if (!rheoPrompt.includes('Regeneration:') || !rheoPrompt.includes('Real affordance:') || !rheoPrompt.includes('Consequential participation:')) fail('Rheocratic prompt missing RWB viability tests');
  if (neutralPrompt.includes('Rheocracy') && !neutralPrompt.includes('Do not use')) fail('neutral prompt leaks Rheocracy');
  if (!finalizerPrompt.includes('at most the targeted action')) fail('finalizer missing minimal revision rule');
  if (!designText.includes('rheocratic_transition` versus `neutral_transition')) fail('design missing primary contrast');
  if (!analysisText.includes('midrank') || !analysisText.includes('case is the inferential unit')) fail('analysis plan missing collapse rule');
  if (!raterText.includes('Immediate practical quality') || !raterText.includes('Transition / pathway value')) fail('rater prompt missing two-axis judgement');

  if (PROVIDER === 'openai') {
    if (!API_KEY || API_KEY === 'YOUR_KEY' || /YOUR_KEY|placeholder/i.test(API_KEY)) fail('OPENAI_API_KEY is missing or contains placeholder text. Set it locally; never paste it into chat or files.');
    const r = await fetch('https://api.openai.com/v1/models',{headers:{authorization:`Bearer ${API_KEY}`}});
    if (!r.ok) fail(`OpenAI connectivity check failed: ${r.status}`);
  }

  console.log(`v1.1 transition preflight ok | cases=12 | provider=${PROVIDER} | model=${MODEL} | pairedSamples=2 | conditions=hidden | transportRetries=3`);
} catch (e) {
  console.error(`v1.1 transition preflight failed: ${e.message || e}`);
  process.exit(1);
}
