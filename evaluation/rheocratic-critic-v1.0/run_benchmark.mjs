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
    const v = argv[i];
    if (!v.startsWith('--')) continue;
    const key = v.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith('--')) out[key] = true;
    else { out[key] = next; i++; }
  }
  return out;
}
function shuffled(items) {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = crypto.randomInt(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function hashText(s) { return crypto.createHash('sha256').update(s).digest('hex'); }
function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }
function deepClone(x) { return JSON.parse(JSON.stringify(x)); }
function extractOutputText(raw) {
  if (typeof raw?.output_text === 'string' && raw.output_text.trim()) return raw.output_text;
  for (const item of raw?.output || []) {
    for (const c of item?.content || []) {
      if (typeof c?.text === 'string' && c.text.trim()) return c.text;
    }
  }
  throw new Error('OpenAI response contained no output text');
}

const argv = parseArgs(process.argv.slice(2));
const SAMPLES = Math.max(1, Number(argv.samples || 2));
const MODEL = process.env.OPENAI_MODEL || 'gpt-5.6';
const API_KEY = process.env.OPENAI_API_KEY || '';
const PROVIDER = process.env.RHEO_MODEL_PROVIDER || 'fixture';
const only = argv.case ? new Set(String(argv.case).split(',').map(x => x.trim()).filter(Boolean)) : null;
const CONDITIONS = ['neutral_base', 'neutral_sham_critic', 'rheocratic_critic'];
const MAX_TRANSPORT_ATTEMPTS = 3;
const RETRYABLE_HTTP = new Set([408, 429, 500, 502, 503, 504]);

const [
  corpusText,
  matchedDiagnosisPrompt,
  matchedActionPrompt,
  neutralCriticPrompt,
  rheoCriticPrompt,
  finalizerPrompt,
  comparisonSchemaText,
  neutralCriticSchemaText,
  rheoCriticSchemaText
] = await Promise.all([
  readFile(path.join(HERE, 'CASES.json'), 'utf8'),
  readFile(path.join(ROOT, 'prompts', 'matched-diagnosis-v0.8-system-prompt.md'), 'utf8'),
  readFile(path.join(ROOT, 'prompts', 'matched-action-v0.8-system-prompt.md'), 'utf8'),
  readFile(path.join(ROOT, 'prompts', 'neutral-sham-critic-v1.0-system-prompt.md'), 'utf8'),
  readFile(path.join(ROOT, 'prompts', 'rheocratic-critic-v1.0-system-prompt.md'), 'utf8'),
  readFile(path.join(ROOT, 'prompts', 'critic-finalizer-v1.0-system-prompt.md'), 'utf8'),
  readFile(path.join(ROOT, 'schemas', 'action-comparison-v0.7.schema.json'), 'utf8'),
  readFile(path.join(ROOT, 'schemas', 'neutral-critic-v1.0.schema.json'), 'utf8'),
  readFile(path.join(ROOT, 'schemas', 'rheocratic-critic-v1.0.schema.json'), 'utf8')
]);

const corpus = JSON.parse(corpusText);
const comparisonSchema = JSON.parse(comparisonSchemaText);
const neutralCriticSchema = JSON.parse(neutralCriticSchemaText);
const rheoCriticSchema = JSON.parse(rheoCriticSchemaText);
let cases = corpus.cases.filter(c => !only || only.has(c.caseId));
if (!cases.length) throw new Error('No matching cases.');

const runId = new Date().toISOString().replace(/[:.]/g, '-');
const outDir = path.join(HERE, 'model-runs', runId);
await mkdir(outDir, { recursive: true });
const log = [];
const retryLog = [];

const diagnosisSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'presentingProblem', 'plausibleGeneratingCondition', 'alternativeExplanation',
    'stakeholders', 'hiddenBurdens', 'deadlineOrOptionRisk', 'irreversibleRisks',
    'decisiveQuestions', 'disconfirmingEvidence', 'missingInformation'
  ],
  properties: {
    presentingProblem: { type: 'string' },
    plausibleGeneratingCondition: { type: 'string' },
    alternativeExplanation: { type: 'string' },
    stakeholders: { type: 'array', items: { type: 'string' }, maxItems: 10 },
    hiddenBurdens: { type: 'array', items: { type: 'string' }, maxItems: 10 },
    deadlineOrOptionRisk: { type: 'string' },
    irreversibleRisks: { type: 'array', items: { type: 'string' }, maxItems: 8 },
    decisiveQuestions: { type: 'array', items: { type: 'string' }, maxItems: 6 },
    disconfirmingEvidence: { type: 'array', items: { type: 'string' }, maxItems: 6 },
    missingInformation: { type: 'array', items: { type: 'string' }, maxItems: 8 }
  }
};

const selectorInstructions = `Choose which of the three already-proposed actions should be tried first in this case. Do not invent or rewrite an action. Base the choice only on the case and the three options. Prefer the minimum sufficient action that best balances usefulness, learning, deadline pressure, immediate harm and avoidable downside. Protect live options where cheap. Do not default to delay merely because it is reversible. Reject a first move that depends on something another action has not yet produced. Return only the requested JSON.`;

function dynamicComparisonSchema(caseId) {
  const s = deepClone(comparisonSchema);
  s.properties.caseId = { ...s.properties.caseId, enum: [caseId] };
  s.properties.actions.items.properties.id = {
    ...s.properties.actions.items.properties.id,
    enum: ['a1', 'a2', 'a3']
  };
  return s;
}

function finalizerSchema(caseId) {
  return {
    type: 'object',
    additionalProperties: false,
    required: ['acceptedCritique', 'acceptanceReason', 'changedActionId', 'comparison'],
    properties: {
      acceptedCritique: { type: 'boolean' },
      acceptanceReason: { type: 'string' },
      changedActionId: { type: 'string', enum: ['none', 'a1', 'a2', 'a3'] },
      comparison: dynamicComparisonSchema(caseId)
    }
  };
}

function validateCritique(critique, rheocratic = false) {
  if (critique.materialCorrection) {
    if (critique.verdict !== 'MATERIAL CORRECTION') throw new Error('critic verdict/materialCorrection mismatch');
    if (critique.correctionTarget === 'none') throw new Error('material critic finding cannot target none');
    if (rheocratic && critique.canonicalBasis === 'None') throw new Error('material Rheocratic critique requires canonicalBasis');
  } else {
    if (critique.verdict !== 'NO MATERIAL CORRECTION') throw new Error('critic verdict/materialCorrection mismatch');
    if (critique.correctionTarget !== 'none') throw new Error('no-correction critic finding must target none');
    if (rheocratic && critique.canonicalBasis !== 'None') throw new Error('no-correction Rheocratic critique must use canonicalBasis None');
  }
}

function actionPayload(a) {
  return {
    id: a.id,
    action: a.action,
    rationale: a.rationale,
    makesPossible: a.makesPossible,
    downsideOrCost: a.downsideOrCost,
    stopReviseSignal: a.stopReviseSignal
  };
}
function sameAction(a, b) { return JSON.stringify(actionPayload(a)) === JSON.stringify(actionPayload(b)); }
function normalizeComparison(comparison, c) {
  if (!comparison || !Array.isArray(comparison.actions) || comparison.actions.length !== 3) {
    throw new Error('comparison must contain exactly three actions');
  }
  comparison.schemaVersion = '0.7';
  comparison.caseId = c.caseId;
  comparison.actions.forEach((x, i) => { x.id = `a${i + 1}`; });
  if (!['a1', 'a2', 'a3'].includes(comparison.firstActionId)) comparison.firstActionId = 'a1';
  if (!Array.isArray(comparison.uncertainty)) comparison.uncertainty = [];
  return comparison;
}

function validateFinalized(base, result, critique) {
  const out = result.comparison;
  if (!out || !Array.isArray(out.actions) || out.actions.length !== 3) throw new Error('finalizer returned invalid comparison');
  const changed = out.actions.filter((a, i) => !sameAction(a, base.actions[i])).map(a => a.id);

  if (!critique.materialCorrection || !result.acceptedCritique) {
    if (result.acceptedCritique) throw new Error('cannot accept a non-material critique');
    if (result.changedActionId !== 'none') throw new Error('rejected/no critique must use changedActionId none');
    if (changed.length !== 0) throw new Error('rejected/no critique changed action content');
    if (JSON.stringify(out.uncertainty) !== JSON.stringify(base.uncertainty)) throw new Error('rejected/no critique changed uncertainty');
    if (out.firstActionId !== base.firstActionId) throw new Error('rejected/no critique changed first action');
    return;
  }

  if (changed.length > 1) throw new Error(`accepted critique changed ${changed.length} actions; maximum is one`);
  if (changed.length === 1 && result.changedActionId !== changed[0]) {
    throw new Error(`changedActionId ${result.changedActionId} does not match changed action ${changed[0]}`);
  }
  if (changed.length === 0 && result.changedActionId !== 'none') {
    throw new Error('changedActionId must be none when only sequencing/uncertainty changes');
  }
}

async function fetchResponses(body, callName) {
  let lastError;
  for (let attempt = 1; attempt <= MAX_TRANSPORT_ATTEMPTS; attempt++) {
    try {
      const response = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: { authorization: `Bearer ${API_KEY}`, 'content-type': 'application/json' },
        body: JSON.stringify(body)
      });
      const text = await response.text();
      let raw;
      try { raw = JSON.parse(text); } catch { raw = { raw: text }; }

      if (!response.ok) {
        const msg = `OpenAI ${callName} ${response.status}: ${raw?.error?.message || text}`;
        if (RETRYABLE_HTTP.has(response.status) && attempt < MAX_TRANSPORT_ATTEMPTS) {
          retryLog.push({ callName, attempt, status: response.status, reason: msg });
          await sleep(1000 * (2 ** (attempt - 1)));
          continue;
        }
        throw new Error(msg);
      }
      return raw;
    } catch (e) {
      lastError = e;
      const isNetwork = e?.name === 'TypeError' || /fetch failed|ECONNRESET|ETIMEDOUT|EAI_AGAIN|socket|network/i.test(String(e?.message || ''));
      if (isNetwork && attempt < MAX_TRANSPORT_ATTEMPTS) {
        retryLog.push({ callName, attempt, status: null, reason: String(e.message || e) });
        await sleep(1000 * (2 ** (attempt - 1)));
        continue;
      }
      throw e;
    }
  }
  throw lastError || new Error(`Unknown failure in ${callName}`);
}

async function structuredCall(instructions, inputText, schema, name) {
  if (!API_KEY) throw new Error('OPENAI_API_KEY is required for openai benchmark runs.');
  const raw = await fetchResponses({
    model: MODEL,
    instructions,
    input: [{ role: 'user', content: [{ type: 'input_text', text: inputText }] }],
    text: { format: { type: 'json_schema', name, strict: true, schema } },
    store: false
  }, name);
  let value;
  try { value = JSON.parse(extractOutputText(raw)); }
  catch (e) { throw new Error(`Could not parse ${name}: ${e.message}`); }
  return { value, model: raw.model || MODEL, responseId: raw.id || null };
}

function fixtureComparison(c) {
  return {
    schemaVersion: '0.7',
    caseId: c.caseId,
    actions: [1, 2, 3].map(i => ({
      id: `a${i}`,
      action: `Fixture neutral action ${i} for ${c.caseId}.`,
      rationale: 'Fixture mode only.',
      makesPossible: 'Exercises the paired critic pipeline.',
      downsideOrCost: 'No real-case inference in fixture mode.',
      stopReviseSignal: 'Replace fixture output with a real model run.'
    })),
    firstActionId: 'a1',
    firstActionWhy: 'Fixture selector.',
    uncertainty: ['Fixture output is not research evidence.']
  };
}

async function generateNeutral(c) {
  if (PROVIDER === 'fixture') {
    return {
      comparison: fixtureComparison(c),
      neutralDecisionMap: { fixture: true },
      metadata: { provider: 'fixture', model: 'fixture-neutral-v1.0', diagnosisResponseId: null, actionResponseId: null, selectorResponseId: null }
    };
  }
  const d = await structuredCall(
    matchedDiagnosisPrompt,
    `CASE_ID: ${c.caseId}\n\n${c.vignette}\n\nDecision: ${c.decision}`,
    diagnosisSchema,
    'critic_v1_neutral_diagnosis'
  );
  const a = await structuredCall(
    matchedActionPrompt,
    JSON.stringify({ caseId: c.caseId, vignette: c.vignette, decision: c.decision, neutralDecisionMap: d.value }),
    dynamicComparisonSchema(c.caseId),
    'critic_v1_neutral_actions'
  );
  const comparison = normalizeComparison(a.value, c);
  const selectorSchema = {
    type: 'object',
    additionalProperties: false,
    required: ['firstActionId', 'firstActionWhy'],
    properties: {
      firstActionId: { type: 'string', enum: ['a1', 'a2', 'a3'] },
      firstActionWhy: { type: 'string' }
    }
  };
  const s = await structuredCall(
    selectorInstructions,
    JSON.stringify({ caseId: c.caseId, vignette: c.vignette, decision: c.decision, actions: comparison.actions }),
    selectorSchema,
    'critic_v1_shared_selector'
  );
  comparison.firstActionId = s.value.firstActionId;
  comparison.firstActionWhy = s.value.firstActionWhy;
  return {
    comparison,
    neutralDecisionMap: d.value,
    metadata: { provider: 'openai', model: a.model, diagnosisResponseId: d.responseId, actionResponseId: a.responseId, selectorResponseId: s.responseId }
  };
}

function fixtureCritique(kind, c) {
  if (kind === 'rheocratic_critic' && c.caseId === 'SYN-301') {
    return {
      materialCorrection: true,
      verdict: 'MATERIAL CORRECTION',
      canonicalBasis: 'Creativity → Infrastructure → Affordance',
      observedRelationship: 'Fixture: nominal access may not be usable access.',
      affectedBearers: ['fixture users'],
      whyActionChanges: 'Fixture exercises the one-action revision path.',
      cheapestCheckOrRelease: 'Fixture check.',
      falsifier: 'Fixture falsifier.',
      correctionTarget: 'a1',
      confidence: 'medium'
    };
  }
  const base = {
    materialCorrection: false,
    verdict: 'NO MATERIAL CORRECTION',
    observedRelationship: 'Fixture: no additional material omission.',
    affectedBearers: [],
    whyActionChanges: 'No action change is warranted in fixture mode.',
    cheapestCheckOrRelease: 'None.',
    falsifier: 'Not applicable.',
    correctionTarget: 'none',
    confidence: 'medium'
  };
  if (kind === 'rheocratic_critic') return { ...base, canonicalBasis: 'None' };
  return base;
}

async function runCritic(kind, c, baseComparison) {
  if (PROVIDER === 'fixture') return { critique: fixtureCritique(kind, c), model: `fixture-${kind}`, responseId: null };
  const rheocratic = kind === 'rheocratic_critic';
  const prompt = rheocratic ? rheoCriticPrompt : neutralCriticPrompt;
  const schema = rheocratic ? rheoCriticSchema : neutralCriticSchema;
  const r = await structuredCall(
    prompt,
    JSON.stringify({ caseId: c.caseId, vignette: c.vignette, decision: c.decision, neutralAdvice: baseComparison }),
    schema,
    rheocratic ? 'rheocratic_critic_v1' : 'neutral_sham_critic_v1'
  );
  validateCritique(r.value, rheocratic);
  return { critique: r.value, model: r.model, responseId: r.responseId };
}

function commonCritique(critique) {
  const {
    materialCorrection, verdict, observedRelationship, affectedBearers, whyActionChanges,
    cheapestCheckOrRelease, falsifier, correctionTarget, confidence
  } = critique;
  return {
    materialCorrection, verdict, observedRelationship, affectedBearers, whyActionChanges,
    cheapestCheckOrRelease, falsifier, correctionTarget, confidence
  };
}

async function applyCritique(c, baseComparison, critique) {
  if (!critique.materialCorrection) {
    return {
      comparison: deepClone(baseComparison),
      audit: { acceptedCritique: false, acceptanceReason: 'Critic returned NO MATERIAL CORRECTION.', changedActionId: 'none' },
      model: null,
      responseId: null
    };
  }

  if (PROVIDER === 'fixture') {
    const comparison = deepClone(baseComparison);
    comparison.actions[0] = {
      ...comparison.actions[0],
      action: `${comparison.actions[0].action} Fixture material correction applied.`
    };
    comparison.firstActionId = 'a1';
    comparison.firstActionWhy = 'Fixture material correction.';
    const audit = { acceptedCritique: true, acceptanceReason: 'Fixture exercises accepted correction.', changedActionId: 'a1' };
    validateFinalized(baseComparison, { comparison, ...audit }, critique);
    return { comparison, audit, model: 'fixture-finalizer-v1.0', responseId: null };
  }

  const r = await structuredCall(
    finalizerPrompt,
    JSON.stringify({
      caseId: c.caseId,
      vignette: c.vignette,
      decision: c.decision,
      originalNeutralAdvice: baseComparison,
      criticFinding: commonCritique(critique)
    }),
    finalizerSchema(c.caseId),
    'critic_finalizer_v1'
  );
  normalizeComparison(r.value.comparison, c);
  validateFinalized(baseComparison, r.value, critique);
  return {
    comparison: r.value.comparison,
    audit: {
      acceptedCritique: r.value.acceptedCritique,
      acceptanceReason: r.value.acceptanceReason,
      changedActionId: r.value.changedActionId
    },
    model: r.model,
    responseId: r.responseId
  };
}

function actionChars(comparison) {
  return comparison.actions.reduce((n, x) =>
    n + String(x.action || '').length + String(x.rationale || '').length +
    String(x.makesPossible || '').length + String(x.downsideOrCost || '').length +
    String(x.stopReviseSignal || '').length, 0);
}

async function writeEnvelope(c, condition, sample, sourcePairId, comparison, diagnostic, metadata, started) {
  const file = `${c.caseId}.${condition}.s${String(sample).padStart(2, '0')}.json`;
  const envelope = {
    experiment: 'rheocratic-critic-v1.0',
    caseId: c.caseId,
    caseTitle: c.title,
    caseHash: hashText(`${c.vignette}\n${c.decision}`),
    condition,
    sample,
    sourcePairId,
    createdAt: new Date().toISOString(),
    provider: metadata.provider,
    model: metadata.model,
    researchUsable: PROVIDER === 'openai',
    comparison,
    diagnostic
  };
  await writeFile(path.join(outDir, file), JSON.stringify(envelope, null, 2));
  log.push({
    caseId: c.caseId,
    condition,
    sample,
    sourcePairId,
    ok: true,
    ms: Date.now() - started,
    file,
    provider: metadata.provider,
    model: metadata.model,
    researchUsable: envelope.researchUsable,
    actionContentChars: actionChars(comparison),
    critiqueTriggered: Boolean(diagnostic?.critique?.materialCorrection),
    critiqueAccepted: Boolean(diagnostic?.finalizer?.acceptedCritique)
  });
  console.log(`${c.caseId} ${condition.padEnd(20)} s${sample} ok ${Date.now() - started}ms`);
}

console.log(`Rheocratic critic benchmark v1.0 | cases=${cases.length} | pairedSamples=${SAMPLES} | conditions=${CONDITIONS.join(',')} | provider=${PROVIDER} | model=${MODEL}`);
console.log(`Output: ${outDir}`);

for (const c of shuffled(cases)) {
  for (let sample = 1; sample <= SAMPLES; sample++) {
    const sourcePairId = `${c.caseId}.s${String(sample).padStart(2, '0')}`;
    const pairStarted = Date.now();
    let neutral;
    try {
      neutral = await generateNeutral(c);
    } catch (e) {
      for (const condition of CONDITIONS) {
        log.push({ caseId: c.caseId, condition, sample, sourcePairId, ok: false, ms: Date.now() - pairStarted, error: `shared neutral source failed: ${e.message}` });
        console.error(`${c.caseId} ${condition.padEnd(20)} s${sample} FAIL shared neutral source: ${e.message}`);
      }
      continue;
    }

    await writeEnvelope(
      c, 'neutral_base', sample, sourcePairId, deepClone(neutral.comparison),
      { neutralDecisionMap: neutral.neutralDecisionMap, sourcePair: true },
      neutral.metadata, pairStarted
    );

    for (const condition of shuffled(['neutral_sham_critic', 'rheocratic_critic'])) {
      const started = Date.now();
      try {
        const critic = await runCritic(condition, c, neutral.comparison);
        const revised = await applyCritique(c, neutral.comparison, critic.critique);
        await writeEnvelope(
          c, condition, sample, sourcePairId, revised.comparison,
          {
            sourcePair: true,
            critique: critic.critique,
            finalizer: revised.audit,
            neutralSourceResponseIds: neutral.metadata
          },
          {
            provider: PROVIDER,
            model: critic.model || neutral.metadata.model,
            criticResponseId: critic.responseId,
            finalizerResponseId: revised.responseId
          },
          started
        );
      } catch (e) {
        log.push({ caseId: c.caseId, condition, sample, sourcePairId, ok: false, ms: Date.now() - started, error: e.message });
        console.error(`${c.caseId} ${condition.padEnd(20)} s${sample} FAIL ${e.message}`);
      }
    }
  }
}

await writeFile(path.join(outDir, '_run_log.json'), JSON.stringify({
  experiment: 'rheocratic-critic-v1.0',
  runId,
  createdAt: new Date().toISOString(),
  pairedSamplesPerCase: SAMPLES,
  provider: PROVIDER,
  model: MODEL,
  design: {
    conditions: CONDITIONS,
    pairedNeutralSource: true,
    primaryContrast: ['rheocratic_critic', 'neutral_sham_critic'],
    secondaryContrasts: [
      ['rheocratic_critic', 'neutral_base'],
      ['neutral_sham_critic', 'neutral_base']
    ],
    maxTransportAttemptsPerModelCall: MAX_TRANSPORT_ATTEMPTS,
    retryableHttpStatuses: [...RETRYABLE_HTTP],
    revisionLimit: 'at most one action; no whole-plan regeneration'
  },
  hashes: {
    corpusSha256: hashText(corpusText),
    matchedDiagnosisPromptSha256: hashText(matchedDiagnosisPrompt),
    matchedActionPromptSha256: hashText(matchedActionPrompt),
    neutralCriticPromptSha256: hashText(neutralCriticPrompt),
    rheoCriticPromptSha256: hashText(rheoCriticPrompt),
    finalizerPromptSha256: hashText(finalizerPrompt),
    comparisonSchemaSha256: hashText(comparisonSchemaText),
    neutralCriticSchemaSha256: hashText(neutralCriticSchemaText),
    rheoCriticSchemaSha256: hashText(rheoCriticSchemaText)
  },
  retryLog,
  log
}, null, 2));

const failures = log.filter(x => !x.ok);
console.log(`\n${log.length} condition outputs | ${failures.length} failures | ${retryLog.length} transport/API retries`);
if (failures.length) process.exitCode = 2;
