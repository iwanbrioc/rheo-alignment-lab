#!/usr/bin/env node
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 8080);
const PROVIDER = process.env.RHEO_MODEL_PROVIDER || 'fixture';
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-5.6';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';

const [flowSchemaText, actionSchemaText, flowPrompt, actionPrompt] = await Promise.all([
  readFile(path.join(HERE, 'schemas', 'rheo-flow-v0.9.schema.json'), 'utf8'),
  readFile(path.join(HERE, 'schemas', 'rheo-actions-v0.9.schema.json'), 'utf8'),
  readFile(path.join(HERE, 'prompts', 'rheo-v0.9-flow-system-prompt.md'), 'utf8'),
  readFile(path.join(HERE, 'prompts', 'rheo-actions-v0.9-system-prompt.md'), 'utf8')
]);
const flowSchema = JSON.parse(flowSchemaText);
const actionSchema = JSON.parse(actionSchemaText);

const TRIPLETS = {
  environment: 'Re-enchantment → Natural Environment → Resources',
  culture: 'Transformation → Culture → Values',
  infrastructure: 'Creativity → Infrastructure → Affordance',
  society: 'Dialogue → Society → Support',
  outer: 'Curiosity → Outer Self → Capacity',
  inner: 'Participation → Inner Self → Well-being',
  noself: 'Nothing / Everything → No Self → Everything / Nothing'
};
const KINDS = ['smallest_release', 'learning_action', 'generative_action'];
const WAYS = new Set(['Be Active', 'Be Creative', 'Connect', 'Keep Learning', 'Take Notice', 'Give', 'Let Go']);

function json(res, status, body) {
  const text = JSON.stringify(body);
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(text),
    'cache-control': 'no-store'
  });
  res.end(text);
}

async function readJsonBody(req, max = 2_000_000) {
  let size = 0;
  const chunks = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > max) throw Object.assign(new Error('request too large'), { code: 'request_too_large' });
    chunks.push(chunk);
  }
  const raw = Buffer.concat(chunks).toString('utf8');
  if (!raw) return {};
  try { return JSON.parse(raw); }
  catch { throw Object.assign(new Error('invalid JSON'), { code: 'invalid_json' }); }
}

function extractOutputText(raw) {
  if (typeof raw?.output_text === 'string' && raw.output_text.trim()) return raw.output_text;
  for (const item of raw?.output || []) {
    for (const c of item?.content || []) {
      if (typeof c?.text === 'string' && c.text.trim()) return c.text;
    }
  }
  throw new Error('OpenAI response contained no output text');
}

function collectSourceRefs(value, prefix = 'case', out = new Set()) {
  if (value === null || value === undefined) return out;
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    if (String(value).trim()) out.add(prefix);
    return out;
  }
  if (Array.isArray(value)) {
    value.forEach((v, i) => collectSourceRefs(v, `${prefix}[${i}]`, out));
    return out;
  }
  if (typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) collectSourceRefs(v, `${prefix}.${k}`, out);
  }
  return out;
}

function cloneSchema(schema) { return structuredClone(schema); }

function flowStrictSchema(caseId) {
  const s = cloneSchema(flowSchema);
  s.properties.caseId = { ...s.properties.caseId, enum: [caseId] };
  return s;
}

function primarySnapshot(flow) {
  const p = flow?.primaryWorkingHypothesis || {};
  return {
    supported: Boolean(p.supported),
    rowId: p.rowId ?? null,
    triplet: p.triplet ?? null,
    observedRestriction: String(p.observedRestriction || ''),
    rheocraticHypothesis: String(p.rheocraticHypothesis || ''),
    discriminatingQuestion: String(p.discriminatingQuestion || ''),
    smallestRelease: String(p.smallestRelease || ''),
    expectedReciprocalEffect: String(p.expectedReciprocalEffect || ''),
    falsifier: String(p.falsifier || ''),
    confidence: ['low', 'medium', 'high'].includes(p.confidence) ? p.confidence : 'low'
  };
}

function actionStrictSchema(caseId, flow) {
  const s = cloneSchema(actionSchema);
  s.properties.caseId = { ...s.properties.caseId, enum: [caseId] };
  const expected = primarySnapshot(flow);
  const d = s.properties.diagnosisSnapshot.properties;
  for (const [k, v] of Object.entries(expected)) d[k] = { ...d[k], enum: [v] };
  return s;
}

function validateEvidenceRefs(flow, sourceRefs) {
  const errors = [];
  const propIds = new Set();
  if (!Array.isArray(flow?.propositions)) return ['propositions must be an array'];
  for (const [i, p] of flow.propositions.entries()) {
    if (!p?.id) errors.push(`propositions[${i}].id required`);
    else if (propIds.has(p.id)) errors.push(`duplicate proposition id ${p.id}`);
    else propIds.add(p.id);
    if (!Array.isArray(p?.sourceRefs) || p.sourceRefs.length === 0) errors.push(`propositions[${i}].sourceRefs must cite supplied input`);
    else for (const ref of p.sourceRefs) if (!sourceRefs.has(ref)) errors.push(`unknown source ref ${ref}`);
  }
  const check = (refs, label, requireOne = false) => {
    if (!Array.isArray(refs)) { errors.push(`${label} must be an array`); return; }
    if (requireOne && refs.length === 0) errors.push(`${label} must cite at least one proposition`);
    for (const ref of refs) if (!propIds.has(ref)) errors.push(`${label} contains unknown proposition ref ${ref}`);
  };
  for (const [i, row] of (flow.workingReciprocalMap || []).entries()) check(row.evidenceRefs, `workingReciprocalMap[${i}].evidenceRefs`);
  check(flow?.primaryWorkingHypothesis?.evidenceRefs, 'primaryWorkingHypothesis.evidenceRefs', Boolean(flow?.primaryWorkingHypothesis?.supported));
  check(flow?.irreversibility?.evidenceRefs, 'irreversibility.evidenceRefs');
  check(flow?.safetyCaution?.evidenceRefs, 'safetyCaution.evidenceRefs', ['caution', 'high'].includes(flow?.safetyCaution?.level));
  return errors;
}

function validateFlow(flow, caseId, sourceRefs) {
  const errors = [];
  if (!flow || typeof flow !== 'object' || Array.isArray(flow)) return ['flow must be an object'];
  if (flow.schemaVersion !== '0.9') errors.push('schemaVersion must be 0.9');
  if (flow.caseId !== caseId) errors.push('caseId changed');
  const rows = flow.workingReciprocalMap || [];
  const seen = new Set();
  for (const row of rows) {
    if (!TRIPLETS[row.rowId]) errors.push(`unknown rowId ${row.rowId}`);
    else if (row.triplet !== TRIPLETS[row.rowId]) errors.push(`${row.rowId} triplet mismatch`);
    if (seen.has(row.rowId)) errors.push(`duplicate working map row ${row.rowId}`);
    seen.add(row.rowId);
    if (!row.observedRestriction || !row.rheocraticHypothesis || !row.discriminatingQuestion || !row.smallestRelease || !row.falsifier) {
      errors.push(`${row.rowId || 'unknown'} does not complete the canonical operational grammar`);
    }
  }
  const p = flow.primaryWorkingHypothesis || {};
  if (p.supported) {
    if (!TRIPLETS[p.rowId]) errors.push('supported primaryWorkingHypothesis requires valid rowId');
    else if (p.triplet !== TRIPLETS[p.rowId]) errors.push('primaryWorkingHypothesis triplet mismatch');
    for (const k of ['observedRestriction', 'rheocraticHypothesis', 'discriminatingQuestion', 'smallestRelease', 'expectedReciprocalEffect', 'observableSignal', 'falsifier']) {
      if (!String(p[k] || '').trim()) errors.push(`primaryWorkingHypothesis.${k} required when supported`);
    }
  }
  if (!Array.isArray(flow.waysToWellbeing)) errors.push('waysToWellbeing must be array');
  else for (const x of flow.waysToWellbeing) if (!WAYS.has(x)) errors.push(`unknown Way to Wellbeing ${x}`);
  errors.push(...validateEvidenceRefs(flow, sourceRefs));
  return errors;
}

function validateActions(out, caseId, flow) {
  const errors = [];
  if (!out || typeof out !== 'object' || Array.isArray(out)) return ['action set must be an object'];
  if (out.schemaVersion !== '0.9') errors.push('schemaVersion must be 0.9');
  if (out.caseId !== caseId) errors.push('caseId changed');
  if (out.noneIsValid !== true) errors.push('noneIsValid must be true');
  const expected = primarySnapshot(flow);
  const got = out.diagnosisSnapshot || {};
  for (const [k, v] of Object.entries(expected)) if (got[k] !== v) errors.push(`diagnosisSnapshot.${k} must match frozen reciprocal map`);
  if (!Array.isArray(out.actions) || out.actions.length !== 3) errors.push('actions must contain exactly three items');
  else {
    const kinds = new Set(out.actions.map(a => a.kind));
    for (const k of KINDS) if (!kinds.has(k)) errors.push(`missing action kind ${k}`);
    if (kinds.size !== 3) errors.push('action kinds must be unique');
    const ids = new Set();
    const actions = new Set();
    for (const [i, a] of out.actions.entries()) {
      if (!a?.id || ids.has(a.id)) errors.push(`actions[${i}].id must be unique`); else ids.add(a.id);
      const sig = String(a?.action || '').trim().toLowerCase();
      if (!sig) errors.push(`actions[${i}].action required`);
      if (actions.has(sig)) errors.push('actions must be materially distinct');
      actions.add(sig);
      if (a.horizonTriplet !== null && !Object.values(TRIPLETS).includes(a.horizonTriplet)) errors.push(`actions[${i}].horizonTriplet invalid`);
      if (!String(a?.observedRelationship || '').trim()) errors.push(`actions[${i}].observedRelationship required`);
      if (!String(a?.discriminatingQuestion || '').trim()) errors.push(`actions[${i}].discriminatingQuestion required`);
      if (!Array.isArray(a?.waysToWellbeing)) errors.push(`actions[${i}].waysToWellbeing must be array`);
      else for (const x of a.waysToWellbeing) if (!WAYS.has(x)) errors.push(`unknown Way to Wellbeing ${x}`);
      if (!a?.prediction?.whatShouldBecomeMorePossible || !a?.prediction?.observableSignal) errors.push(`actions[${i}] needs a falsifiable prediction`);
      if (!a?.falsifierOrChangeSignal) errors.push(`actions[${i}] needs falsifier/change signal`);
    }
  }
  return errors;
}

function fixtureFlow(caseId, caseRecord, sourceRefs) {
  const firstRef = [...sourceRefs][0] || 'case.caseId';
  return {
    schemaVersion: '0.9',
    caseId,
    propositions: [{
      id: 'p1',
      text: String(caseRecord?.context?.situation || 'Fixture case supplied.'),
      provenance: 'user_reported_observation',
      confidence: 'low',
      contested: false,
      sourceRefs: [firstRef]
    }],
    liveDecision: {
      decision: String(caseRecord?.context?.situation || 'Fixture decision.'),
      deadlineOrOptionRisk: 'Fixture mode does not infer a real deadline.',
      immediateHarmDuringDelay: 'Fixture mode does not infer real harm.'
    },
    workingReciprocalMap: [],
    primaryWorkingHypothesis: {
      supported: false,
      rowId: null,
      triplet: null,
      observedRestriction: 'No real restriction is inferred in fixture mode.',
      rheocraticHypothesis: 'No real Rheocratic hypothesis is inferred in fixture mode.',
      discriminatingQuestion: 'What evidence would justify a real working hypothesis?',
      smallestRelease: 'Replace fixture mode with a research-capable model before acting.',
      expectedReciprocalEffect: 'None claimed.',
      observableSignal: 'A research-capable output replaces this fixture.',
      reviewHorizon: 'Immediately before practical use.',
      falsifier: 'Any real model-grounded case analysis supersedes this fixture.',
      evidenceRefs: [],
      confidence: 'low'
    },
    wholeCycleCausalMap: 'Fixture mode does not construct a causal map.',
    waysToWellbeing: [],
    frameRelocation: {
      actionRelevant: false,
      privilegedCentre: 'Unknown in fixture mode.',
      whatBecomesVisible: 'Nothing is claimed.',
      actionImplication: 'None.',
      falsifier: 'Any evidence that frame relocation changes the action tree.'
    },
    irreversibility: {
      boundaryToProtect: 'Unknown.',
      liveOptionToPreserve: 'Unknown.',
      emergenceNotToConstrain: 'Unknown.',
      displacedCosts: [],
      regenerationRisk: 'Unknown.',
      evidenceRefs: []
    },
    safetyCaution: { level: 'unknown', indicators: [], evidenceRefs: [], uncertainty: 'Fixture mode cannot assess safety.' },
    specificitySelfCheck: 'generic'
  };
}

function fixtureActions(caseId, flow) {
  const d = primarySnapshot(flow);
  const common = (id, kind, title, action) => ({
    id, kind, title, action,
    whyThisAction: 'Fixture mode exercises the v0.9 action schema only.',
    horizonTriplet: d.triplet,
    observedRelationship: d.observedRestriction || 'No real relationship inferred.',
    discriminatingQuestion: d.discriminatingQuestion || 'What evidence would change the map?',
    waysToWellbeing: [],
    prediction: {
      whatShouldBecomeMorePossible: 'A research-capable test of the v0.9 pipeline.',
      observableSignal: 'The endpoint returns a valid schema-conforming result.',
      reviewHorizon: 'Immediately.'
    },
    falsifierOrChangeSignal: 'Any schema or validation failure.',
    displacedCosts: ['Fixture mode has no decision-valid practical content.'],
    irreversibilityCaution: 'Do not use fixture output as practical advice.',
    assumptions: ['Fixture mode is being used only as a plumbing test.']
  });
  return {
    schemaVersion: '0.9',
    caseId,
    diagnosisSnapshot: d,
    actions: [
      common('a1', 'smallest_release', 'Fixture smallest release', 'Verify that the v0.9 flow-to-action pipeline responds.'),
      common('a2', 'learning_action', 'Fixture learning action', 'Verify that the v0.9 frozen-map handoff validates.'),
      common('a3', 'generative_action', 'Fixture option-space action', 'Verify that all three action kinds remain distinct in the transport schema.')
    ],
    noneIsValid: true,
    researchNote: 'Fixture output only. Not research evidence and not practical advice.'
  };
}

async function openaiStructured(instructions, inputText, schema, name) {
  if (!OPENAI_API_KEY) throw Object.assign(new Error('OPENAI_API_KEY is not configured'), { code: 'missing_api_key' });
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: { authorization: `Bearer ${OPENAI_API_KEY}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      instructions,
      input: [{ role: 'user', content: [{ type: 'input_text', text: inputText }] }],
      text: { format: { type: 'json_schema', name, strict: true, schema } },
      store: false
    })
  });
  const raw = await response.json();
  if (!response.ok) throw Object.assign(new Error(`OpenAI Responses API ${response.status}: ${raw?.error?.message || JSON.stringify(raw)}`), { code: 'openai_api_error' });
  let value;
  try { value = JSON.parse(extractOutputText(raw)); }
  catch (e) { throw Object.assign(new Error(`Could not parse structured output: ${e.message}`), { code: 'model_output_parse_error' }); }
  return { value, model: raw.model || OPENAI_MODEL, responseId: raw.id || null };
}

async function generateFlow(caseRecord) {
  const caseId = String(caseRecord?.caseId || '');
  if (!caseId) throw Object.assign(new Error('caseRecord.caseId is required'), { code: 'invalid_flow_request' });
  const sourceRefs = collectSourceRefs(caseRecord);
  if (!sourceRefs.size) throw Object.assign(new Error('caseRecord must contain source material'), { code: 'invalid_flow_request' });
  if (PROVIDER === 'fixture') return { flow: fixtureFlow(caseId, caseRecord, sourceRefs), sourceRefs, provider: 'fixture', model: 'fixture-v0.9', responseId: null, researchUsable: false };
  if (PROVIDER !== 'openai') throw Object.assign(new Error(`Unsupported RHEO_MODEL_PROVIDER: ${PROVIDER}`), { code: 'unsupported_provider' });
  const inputText = [
    'Construct the v0.9 working reciprocal map for CASE_RECORD.',
    'Preserve CASE_RECORD.caseId exactly.',
    'Do not force all seven horizons into workingReciprocalMap. Include only action-relevant horizons.',
    'Every proposition.sourceRefs entry must be an exact string from ALLOWED_SOURCE_REFS.',
    'Every later evidenceRefs entry must refer only to proposition ids created in this output.',
    'ALLOWED_SOURCE_REFS:', JSON.stringify([...sourceRefs]),
    'CASE_RECORD:', JSON.stringify(caseRecord)
  ].join('\n\n');
  const r = await openaiStructured(flowPrompt, inputText, flowStrictSchema(caseId), 'rheo_flow_v0_9');
  return { flow: r.value, sourceRefs, provider: 'openai', model: r.model, responseId: r.responseId, researchUsable: true };
}

async function generateActions(caseId, flow, testimony) {
  if (!flow?.primaryWorkingHypothesis) throw Object.assign(new Error('frozen v0.9 reciprocal map required'), { code: 'invalid_action_request' });
  if (PROVIDER === 'fixture') return { actionSet: fixtureActions(caseId, flow), provider: 'fixture', model: 'fixture-v0.9-actions', responseId: null, researchUsable: false };
  if (PROVIDER !== 'openai') throw Object.assign(new Error(`Unsupported RHEO_MODEL_PROVIDER: ${PROVIDER}`), { code: 'unsupported_provider' });
  const input = {
    caseId,
    testimony: Array.isArray(testimony) ? testimony.map(t => ({ role: t.role || 'participant', text: String(t.text || ''), questionType: t.questionType || null })) : [],
    frozenReciprocalMap: flow
  };
  const r = await openaiStructured(
    actionPrompt,
    `Generate exactly three v0.9 action experiments from this frozen record. Preserve the diagnosisSnapshot exactly as constrained by the schema.\n\n${JSON.stringify(input)}`,
    actionStrictSchema(caseId, flow),
    'rheo_actions_v0_9'
  );
  return { actionSet: r.value, provider: 'openai', model: r.model, responseId: r.responseId, researchUsable: true };
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  try {
    if (req.method === 'GET' && url.pathname === '/api/health') {
      return json(res, 200, { version: '0.9.0', condition: 'rheo_v0_9', canonicalOperationalGrammar: true, provider: PROVIDER, model: PROVIDER === 'openai' ? OPENAI_MODEL : 'fixture-v0.9' });
    }
    if (req.method === 'POST' && url.pathname === '/api/rheo-flow') {
      const body = await readJsonBody(req);
      if (!body.caseRecord || typeof body.caseRecord !== 'object') return json(res, 400, { error: 'caseRecord object is required', errorCode: 'missing_case_record' });
      const result = await generateFlow(body.caseRecord);
      const caseId = String(body.caseRecord.caseId || '');
      const errors = validateFlow(result.flow, caseId, result.sourceRefs);
      if (errors.length) return json(res, 502, { error: 'flow output failed v0.9 validation', errorCode: 'flow_output_validation_failed', details: errors });
      return json(res, 200, { version: '0.9.0', condition: 'rheo_v0_9', provider: result.provider, model: result.model, responseId: result.responseId, researchUsable: result.researchUsable, flow: result.flow });
    }
    if (req.method === 'POST' && url.pathname === '/api/rheo-actions') {
      const body = await readJsonBody(req);
      const caseId = String(body?.caseId || body?.flow?.caseId || '');
      if (!caseId) return json(res, 400, { error: 'caseId is required', errorCode: 'invalid_action_request' });
      if (!body?.flow || body.flow.schemaVersion !== '0.9') return json(res, 400, { error: 'v0.9 flow object is required', errorCode: 'invalid_action_request' });
      if (body.flow.caseId !== caseId) return json(res, 400, { error: 'caseId does not match frozen flow', errorCode: 'invalid_action_request' });
      const result = await generateActions(caseId, body.flow, body.testimony);
      const errors = validateActions(result.actionSet, caseId, body.flow);
      if (errors.length) return json(res, 502, { error: 'action output failed v0.9 validation', errorCode: 'action_output_validation_failed', details: errors });
      return json(res, 200, { version: '0.9.0', condition: 'rheo_v0_9_actions', provider: result.provider, model: result.model, responseId: result.responseId, researchUsable: result.researchUsable, actionSet: result.actionSet });
    }
    return json(res, 404, { error: 'not found', errorCode: 'not_found' });
  } catch (e) {
    const status = ['invalid_json', 'request_too_large', 'invalid_flow_request', 'invalid_action_request'].includes(e.code) ? 400 : e.code === 'missing_api_key' ? 503 : 500;
    return json(res, status, { error: e.message, errorCode: e.code || 'server_error' });
  }
});

server.listen(PORT, () => console.log(`Rheo v0.9 canonical operational server listening on http://localhost:${PORT} (provider=${PROVIDER}, model=${PROVIDER === 'openai' ? OPENAI_MODEL : 'fixture-v0.9'})`));

function shutdown(signal) {
  console.log(`Shutting down v0.9 (${signal})`);
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 2500).unref();
}
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
