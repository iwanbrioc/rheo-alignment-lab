#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const PROVIDER = process.env.RHEO_MODEL_PROVIDER || 'fixture';
const MODEL = process.env.OPENAI_MODEL || 'gpt-5.6';
const API_KEY = process.env.OPENAI_API_KEY || '';

function fail(msg) {
  console.error(`v1.0 critic preflight failed: ${msg}`);
  process.exit(1);
}
function suspiciousKey(v) {
  const s = String(v || '').trim();
  if (!s) return true;
  return /^(echo|export|read|your[_ -]?key|openai_api_key|placeholder|null|undefined)$/i.test(s) ||
    /\s(export|echo|read)\s/i.test(s);
}
function assertSchema(schema, name) {
  if (!schema || schema.type !== 'object') fail(`${name} must be an object schema`);
  if (schema.additionalProperties !== false) fail(`${name} must set additionalProperties=false`);
  if (!Array.isArray(schema.required) || !schema.required.length) fail(`${name} requires a non-empty required array`);
  for (const key of schema.required) {
    if (!schema.properties?.[key]) fail(`${name} required property missing schema: ${key}`);
  }
}

const [
  corpusText,
  neutralSchemaText,
  rheoSchemaText,
  comparisonSchemaText,
  neutralPrompt,
  rheoPrompt,
  finalizerPrompt,
  mechanismText,
  caseNotesText
] = await Promise.all([
  readFile(path.join(HERE, 'CASES.json'), 'utf8'),
  readFile(path.join(ROOT, 'schemas', 'neutral-critic-v1.0.schema.json'), 'utf8'),
  readFile(path.join(ROOT, 'schemas', 'rheocratic-critic-v1.0.schema.json'), 'utf8'),
  readFile(path.join(ROOT, 'schemas', 'action-comparison-v0.7.schema.json'), 'utf8'),
  readFile(path.join(ROOT, 'prompts', 'neutral-sham-critic-v1.0-system-prompt.md'), 'utf8'),
  readFile(path.join(ROOT, 'prompts', 'rheocratic-critic-v1.0-system-prompt.md'), 'utf8'),
  readFile(path.join(ROOT, 'prompts', 'critic-finalizer-v1.0-system-prompt.md'), 'utf8'),
  readFile(path.join(HERE, 'MECHANISM_HYPOTHESIS.md'), 'utf8'),
  readFile(path.join(HERE, 'CASE_DESIGN_NOTES.md'), 'utf8')
]);

let corpus, neutralSchema, rheoSchema, comparisonSchema;
try {
  corpus = JSON.parse(corpusText);
  neutralSchema = JSON.parse(neutralSchemaText);
  rheoSchema = JSON.parse(rheoSchemaText);
  comparisonSchema = JSON.parse(comparisonSchemaText);
} catch (e) {
  fail(`invalid JSON: ${e.message}`);
}

if (corpus.version !== '1.0' || corpus.status !== 'prospective') fail('CASES.json must be prospective version 1.0');
if (!Array.isArray(corpus.cases) || corpus.cases.length !== 10) fail(`expected 10 cases, found ${corpus.cases?.length}`);
const ids = corpus.cases.map(c => c.caseId);
if (new Set(ids).size !== ids.length) fail('duplicate case IDs');
for (let i = 301; i <= 310; i++) {
  if (!ids.includes(`SYN-${i}`)) fail(`missing SYN-${i}`);
}
for (const c of corpus.cases) {
  if (!c.title || !c.vignette || !c.decision) fail(`${c.caseId} missing title/vignette/decision`);
}

assertSchema(neutralSchema, 'neutral critic schema');
assertSchema(rheoSchema, 'Rheocratic critic schema');
assertSchema(comparisonSchema, 'comparison schema');

if (!neutralPrompt.includes('NO MATERIAL CORRECTION')) fail('neutral critic prompt lacks abstention rule');
if (!rheoPrompt.includes('NO MATERIAL CORRECTION')) fail('Rheocratic critic prompt lacks abstention rule');
if (!rheoPrompt.includes('Re-enchantment') || !rheoPrompt.includes('No Self')) fail('Rheocratic critic prompt lacks canonical boundary lenses');
if (!finalizerPrompt.includes('at most one') && !finalizerPrompt.includes('at most the minimum')) fail('finalizer prompt lacks minimal revision constraint');
if (!mechanismText.includes('rheocratic_critic vs neutral_sham_critic')) fail('mechanism document lacks primary contrast');
if (!caseNotesText.includes('Prospectively expected abstention')) fail('case design notes lack abstention cases');

if (!['fixture', 'openai'].includes(PROVIDER)) fail(`unsupported RHEO_MODEL_PROVIDER=${PROVIDER}`);

if (PROVIDER === 'openai') {
  if (suspiciousKey(API_KEY)) fail('OPENAI_API_KEY is missing or contains placeholder/command text. Set it locally; never paste it into chat or files.');
  let response;
  try {
    response = await fetch('https://api.openai.com/v1/models', {
      headers: { authorization: `Bearer ${API_KEY}` }
    });
  } catch (e) {
    fail(`cannot reach OpenAI API: ${e.message}`);
  }
  if (!response.ok) {
    let text = await response.text();
    if (text.length > 300) text = `${text.slice(0, 300)}…`;
    fail(`OpenAI rejected API key (${response.status}): ${text}`);
  }
}

console.log(`v1.0 critic preflight ok | cases=10 | provider=${PROVIDER} | model=${PROVIDER === 'fixture' ? 'fixture' : MODEL} | pairedSamples=2 | conditions=hidden | transportRetries=3`);
