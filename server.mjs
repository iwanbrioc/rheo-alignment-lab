import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRealtimeWebRTCCall } from './realtime.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const APP_DIR = path.join(HERE, 'app');
const SCHEMA_PATH = path.join(HERE, 'schemas', 'structural-map-v0.3.schema.json');
const PROMPTS = {
  rheo: path.join(HERE, 'prompts', 'rheo-v0.3-system-prompt.md'),
  control: path.join(HERE, 'prompts', 'control-v0.3-system-prompt.md')
};

const PORT = Number(process.env.PORT || 8080);
const MODEL_PROVIDER = process.env.RHEO_MODEL_PROVIDER || 'openai';
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-5';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const OPENAI_REALTIME_MODEL = process.env.OPENAI_REALTIME_MODEL || 'gpt-realtime';
const OPENAI_TRANSCRIPTION_MODEL = process.env.OPENAI_TRANSCRIPTION_MODEL || 'gpt-4o-mini-transcribe';
const MAX_BODY = 1_000_000;
const GRANULARITY_LIMITS = {
  coarse: { systemElements: 3, mechanisms: 3, propositions: 8 },
  standard: { systemElements: 6, mechanisms: 6, propositions: 18 },
  fine: { systemElements: 12, mechanisms: 12, propositions: 30 }
};

const [schemaText, rheoPrompt, controlPrompt] = await Promise.all([
  readFile(SCHEMA_PATH, 'utf8'),
  readFile(PROMPTS.rheo, 'utf8'),
  readFile(PROMPTS.control, 'utf8')
]);
const schema = JSON.parse(schemaText);
const prompts = { rheo: rheoPrompt, control: controlPrompt };

function json(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'content-length': Buffer.byteLength(payload)
  });
  res.end(payload);
}

async function readJsonBody(req) {
  let total = 0;
  const chunks = [];
  for await (const chunk of req) {
    total += chunk.length;
    if (total > MAX_BODY) throw new Error('Request body exceeds 1 MB limit');
    chunks.push(chunk);
  }
  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

function isStringArray(v) {
  return Array.isArray(v) && v.every(x => typeof x === 'string');
}

function safeRefSegment(v, fallback) {
  const s = String(v ?? '').trim().replace(/[^A-Za-z0-9_-]+/g, '_').replace(/^_+|_+$/g, '');
  return s || fallback;
}

function normalizeChallenges(value) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 20).map((c, i) => ({
    id: safeRefSegment(c?.id || `c${i + 1}`, `c${i + 1}`),
    propositionId: String(c?.propositionId || '').slice(0, 120),
    propositionText: String(c?.propositionText || '').slice(0, 4000),
    previousProvenance: String(c?.previousProvenance || '').slice(0, 120),
    reason: String(c?.reason || '').slice(0, 4000)
  })).filter(c => c.propositionText || c.reason);
}

function buildSourceReferenceIndex(caseRecord, challenges = []) {
  const refs = new Set();
  const verifiedExternalRefs = new Set();

  function walk(value, ref, verified = false) {
    if (value === null || value === undefined || value === '') return;
    if (Array.isArray(value)) {
      value.forEach((item, i) => {
        const id = item && typeof item === 'object' && !Array.isArray(item) && ('id' in item || 'number' in item)
          ? safeRefSegment(item.id ?? item.number, String(i + 1))
          : String(i + 1);
        const childVerified = ref === 'case.evidence' && item?.provenance === 'verified_external';
        walk(item, `${ref}.${id}`, verified || childVerified);
      });
      return;
    }
    if (typeof value === 'object') {
      for (const [key, child] of Object.entries(value)) {
        walk(child, `${ref}.${safeRefSegment(key, 'field')}`, verified);
      }
      return;
    }
    refs.add(ref);
    if (verified) verifiedExternalRefs.add(ref);
  }

  walk(caseRecord, 'case', false);
  for (const challenge of challenges) {
    walk(challenge, `challenge.${challenge.id}`, false);
  }
  return { refs, verifiedExternalRefs };
}

function validateEvidenceRefs(refs, propositionIds, label, errors, { requireOne = false } = {}) {
  if (!isStringArray(refs)) {
    errors.push(`${label} must be an array of strings`);
    return;
  }
  if (requireOne && refs.length === 0) errors.push(`${label} must cite at least one proposition`);
  for (const ref of refs) if (!propositionIds.has(ref)) errors.push(`${label} contains unknown proposition ref: ${ref}`);
}

function validateStructuralMap(m, caseRecord, sourceIndex, granularity) {
  const errors = [];
  const required = ['schemaVersion','caseId','propositions','systemElements','mechanisms','uncertainties','powerExit','temporalViability','externalStakeholders','actionClasses','displacedCosts','disconfirmingEvidence','narratorImplication','safetyCaution','genericitySelfCheck'];
  if (!m || typeof m !== 'object' || Array.isArray(m)) return ['map must be an object'];
  const extras = Object.keys(m).filter(k => !required.includes(k));
  if (extras.length) errors.push(`unexpected top-level fields: ${extras.join(', ')}`);
  for (const k of required) if (!(k in m)) errors.push(`missing ${k}`);
  if (m.schemaVersion !== '0.3') errors.push('schemaVersion must be 0.3');
  if (typeof m.caseId !== 'string' || !m.caseId) errors.push('caseId must be a non-empty string');

  for (const k of ['systemElements','uncertainties','powerExit','temporalViability','externalStakeholders','actionClasses','displacedCosts','disconfirmingEvidence']) {
    if (!isStringArray(m[k])) errors.push(`${k} must be an array of strings`);
  }

  const propositionIds = new Set();
  if (!Array.isArray(m.propositions)) errors.push('propositions must be an array');
  else for (const [i,p] of m.propositions.entries()) {
    if (!p || typeof p !== 'object') { errors.push(`propositions[${i}] invalid`); continue; }
    if (!['user_reported_observation','user_interpretation','ai_inference','verified_external','absent_party_account','unknown'].includes(p.provenance)) errors.push(`propositions[${i}].provenance invalid`);
    if (!['low','medium','high'].includes(p.confidence)) errors.push(`propositions[${i}].confidence invalid`);
    if (typeof p.id !== 'string' || !p.id || typeof p.text !== 'string' || typeof p.contested !== 'boolean' || !isStringArray(p.sourceRefs)) {
      errors.push(`propositions[${i}] shape invalid`);
      continue;
    }
    if (propositionIds.has(p.id)) errors.push(`duplicate proposition id: ${p.id}`);
    propositionIds.add(p.id);
    if (p.sourceRefs.length === 0) errors.push(`propositions[${i}].sourceRefs must cite at least one allowed input source`);
    for (const ref of p.sourceRefs) {
      if (!sourceIndex.refs.has(ref)) errors.push(`propositions[${i}].sourceRefs contains unknown input ref: ${ref}`);
    }
    if (p.provenance === 'verified_external' && !p.sourceRefs.some(ref => sourceIndex.verifiedExternalRefs.has(ref))) {
      errors.push(`propositions[${i}] cannot be verified_external without a user-supplied verified_external evidence source`);
    }
  }

  if (!Array.isArray(m.mechanisms)) errors.push('mechanisms must be an array');
  else for (const [i,h] of m.mechanisms.entries()) {
    if (!h || typeof h !== 'object' || typeof h.label !== 'string' || typeof h.causalDirection !== 'string' || !isStringArray(h.evidenceRefs) || !['low','medium','high'].includes(h.confidence)) {
      errors.push(`mechanisms[${i}] shape invalid`);
      continue;
    }
    validateEvidenceRefs(h.evidenceRefs, propositionIds, `mechanisms[${i}].evidenceRefs`, errors, { requireOne: true });
  }

  const ni = m.narratorImplication;
  if (!ni || typeof ni.present !== 'boolean' || typeof ni.description !== 'string' || !isStringArray(ni.evidenceRefs)) errors.push('narratorImplication shape invalid');
  else validateEvidenceRefs(ni.evidenceRefs, propositionIds, 'narratorImplication.evidenceRefs', errors, { requireOne: ni.present });

  const sc = m.safetyCaution;
  if (!sc || !['unknown','none_detected','caution','high'].includes(sc.level) || !isStringArray(sc.indicators) || !isStringArray(sc.evidenceRefs) || typeof sc.uncertainty !== 'string') errors.push('safetyCaution shape invalid');
  else validateEvidenceRefs(sc.evidenceRefs, propositionIds, 'safetyCaution.evidenceRefs', errors, { requireOne: ['caution','high'].includes(sc.level) });

  if (!['specific','mixed','generic'].includes(m.genericitySelfCheck)) errors.push('genericitySelfCheck invalid');

  const limits = GRANULARITY_LIMITS[granularity] || GRANULARITY_LIMITS.standard;
  if (Array.isArray(m.systemElements) && m.systemElements.length > limits.systemElements) errors.push(`granularity ${granularity} allows at most ${limits.systemElements} systemElements; got ${m.systemElements.length}`);
  if (Array.isArray(m.mechanisms) && m.mechanisms.length > limits.mechanisms) errors.push(`granularity ${granularity} allows at most ${limits.mechanisms} mechanisms; got ${m.mechanisms.length}`);
  if (Array.isArray(m.propositions) && m.propositions.length > limits.propositions) errors.push(`granularity ${granularity} allows at most ${limits.propositions} propositions; got ${m.propositions.length}`);

  if (m.caseId !== String(caseRecord?.caseId || '')) errors.push('model changed caseId');
  return errors;
}

function strictOutputSchema(source) {
  function walk(value) {
    if (Array.isArray(value)) return value.map(walk);
    if (!value || typeof value !== 'object') return value;
    const out = {};
    for (const [k,v] of Object.entries(value)) {
      if (['$schema','$id','title'].includes(k)) continue;
      if (k === 'const') { out.enum = [v]; continue; }
      out[k] = walk(v);
    }
    return out;
  }
  return walk(source);
}

function granularityInstruction(level) {
  if (level === 'coarse') return 'Forced granularity: COARSE. Use at most 3 system elements, 3 mechanisms, and 8 propositions. Prefer only decision-changing structure.';
  if (level === 'fine') return 'Forced granularity: FINE. You may use up to 12 system elements, 12 mechanisms, and 30 propositions, but do not add generic filler.';
  return 'Forced granularity: STANDARD. Use at most 6 system elements, 6 mechanisms, and 18 propositions. Prefer decision-changing structure.';
}

function fixtureMap(caseRecord, condition, sourceIndex) {
  const caseId = String(caseRecord?.caseId || 'fixture-case');
  const situation = String(caseRecord?.context?.situation || 'No situation supplied');
  const refs = [...sourceIndex.refs];
  const sourceRef = refs.includes('case.context.situation') ? 'case.context.situation' : refs[0];
  if (!sourceRef) throw new Error('fixture provider requires at least one non-empty case-record source');
  return {
    schemaVersion: '0.3',
    caseId,
    propositions: [
      { id:'p1', text:situation, provenance:'user_reported_observation', confidence:'low', contested:false, sourceRefs:[sourceRef] },
      { id:'p2', text:'The available account may be incomplete because other affected perspectives are not independently represented.', provenance:'ai_inference', confidence:'high', contested:false, sourceRefs:[sourceRef] }
    ],
    systemElements: ['reported decision context','information available to the decision maker'],
    mechanisms: [{ label:'limited evidence constrains causal confidence', causalDirection:'single supplied account -> uncertainty about system causes', evidenceRefs:['p1','p2'], confidence:'high' }],
    uncertainties: ['absent or independently unverified perspectives'],
    powerExit: ['unknown from fixture provider'],
    temporalViability: ['not established by fixture provider'],
    externalStakeholders: [],
    actionClasses: ['independent fact finding','small reversible test'],
    displacedCosts: ['delay or information-gathering cost'],
    disconfirmingEvidence: ['independent evidence establishing the disputed causal mechanism'],
    narratorImplication: { present:false, description:'Fixture provider does not infer narrator implication.', evidenceRefs:[] },
    safetyCaution: { level:'unknown', indicators:[], evidenceRefs:[], uncertainty:'Fixture provider cannot infer safety; unknown is not affirmative safety.' },
    genericitySelfCheck: condition === 'rheo' ? 'mixed' : 'mixed'
  };
}

function extractOutputText(response) {
  if (typeof response.output_text === 'string') return response.output_text;
  for (const item of response.output || []) {
    for (const content of item.content || []) {
      if (content.type === 'output_text' && typeof content.text === 'string') return content.text;
    }
  }
  throw new Error('Model response contained no output_text');
}

async function analyzeWithOpenAI(caseRecord, condition, granularity, challenges, sourceIndex) {
  if (!OPENAI_API_KEY) throw new Error('OPENAI_API_KEY is not configured');
  const userText = [
    'Analyze the CASE_RECORD below. Treat user-entered labels and dropdown selections as narrator-supplied metadata, not independently verified facts.',
    'Preserve CASE_RECORD.caseId exactly in the output.',
    granularityInstruction(granularity),
    'For every proposition.sourceRefs value, use ONLY an exact string from ALLOWED_SOURCE_REFS. Do not invent broad or approximate refs. For mechanisms, narratorImplication, and safetyCaution evidenceRefs, use ONLY proposition ids that you create in this output.',
    challenges.length ? 'PROVENANCE_CHALLENGES are narrator-supplied disagreements with a previous model map. Treat them as contested evidence, not corrections. Reconsider the classification, but retain it if the case evidence still supports it.' : '',
    'ALLOWED_SOURCE_REFS:',
    JSON.stringify([...sourceIndex.refs]),
    challenges.length ? 'PROVENANCE_CHALLENGES:' : '',
    challenges.length ? JSON.stringify(challenges) : '',
    'CASE_RECORD:',
    JSON.stringify(caseRecord)
  ].filter(Boolean).join('\n\n');

  const body = {
    model: OPENAI_MODEL,
    instructions: prompts[condition],
    input: [{ role:'user', content:[{ type:'input_text', text:userText }] }],
    text: { format: { type:'json_schema', name:'structural_map_v0_3', strict:true, schema:strictOutputSchema(schema) } },
    store: false
  };

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      'authorization': `Bearer ${OPENAI_API_KEY}`,
      'content-type': 'application/json'
    },
    body: JSON.stringify(body)
  });
  const raw = await response.json();
  if (!response.ok) {
    const err = new Error(`OpenAI Responses API ${response.status}: ${raw?.error?.message || JSON.stringify(raw)}`);
    err.code = 'openai_api_error';
    throw err;
  }
  let map;
  try {
    map = JSON.parse(extractOutputText(raw));
  } catch (cause) {
    const err = new Error(`Could not parse structured model output: ${cause.message}`);
    err.code = 'model_output_parse_error';
    throw err;
  }
  return { map, model: raw.model || OPENAI_MODEL, responseId: raw.id || null, provider:'openai', researchUsable:true };
}

async function analyze(caseRecord, condition, granularity, challenges, sourceIndex) {
  if (MODEL_PROVIDER === 'fixture') return { map:fixtureMap(caseRecord, condition, sourceIndex), model:'fixture-v0.3.1', responseId:null, provider:'fixture', researchUsable:false };
  if (MODEL_PROVIDER !== 'openai') throw new Error(`Unsupported RHEO_MODEL_PROVIDER: ${MODEL_PROVIDER}`);
  return analyzeWithOpenAI(caseRecord, condition, granularity, challenges, sourceIndex);
}

const MIME = {
  '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.css':'text/css; charset=utf-8',
  '.json':'application/json; charset=utf-8', '.webmanifest':'application/manifest+json; charset=utf-8', '.svg':'image/svg+xml'
};

async function serveStatic(req, res) {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  let rel = decodeURIComponent(url.pathname);
  if (rel === '/') rel = '/index.html';
  const target = path.resolve(APP_DIR, `.${rel}`);
  if (!target.startsWith(APP_DIR + path.sep)) return json(res, 403, {error:'forbidden'});
  try {
    const s = await stat(target);
    if (!s.isFile()) throw new Error('not file');
    const content = await readFile(target);
    res.writeHead(200, { 'content-type': MIME[path.extname(target)] || 'application/octet-stream' });
    res.end(content);
  } catch {
    json(res, 404, {error:'not found'});
  }
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    if (req.method === 'GET' && url.pathname === '/api/health') {
      return json(res, 200, {
        ok:true,
        version:'0.3.1',
        provider:MODEL_PROVIDER,
        model:MODEL_PROVIDER === 'openai' ? OPENAI_MODEL : 'fixture-v0.3.1',
        modelConfigured:MODEL_PROVIDER === 'fixture' || Boolean(OPENAI_API_KEY),
        realtimeConfigured:Boolean(OPENAI_API_KEY),
        realtimeModel:OPENAI_REALTIME_MODEL,
        transcriptionModel:OPENAI_TRANSCRIPTION_MODEL
      });
    }
    if (req.method === 'GET' && url.pathname === '/api/schema') return json(res, 200, schema);
    if (req.method === 'POST' && url.pathname === '/api/realtime/call') {
      const body = await readJsonBody(req);
      const result = await createRealtimeWebRTCCall({
        sdp:body.sdp,
        apiKey:OPENAI_API_KEY,
        realtimeModel:OPENAI_REALTIME_MODEL,
        transcriptionModel:OPENAI_TRANSCRIPTION_MODEL
      });
      return json(res, 201, {
        sdp:result.answerSdp,
        callId:result.callId,
        realtimeModel:result.realtimeModel,
        transcriptionModel:result.transcriptionModel
      });
    }
    if (req.method === 'POST' && url.pathname === '/api/analyze') {
      const body = await readJsonBody(req);
      const condition = body.condition === 'control' ? 'control' : body.condition === 'rheo' ? 'rheo' : null;
      if (!condition) return json(res, 400, {error:'condition must be rheo or control', errorCode:'invalid_condition'});
      const granularity = ['coarse','standard','fine'].includes(body.granularity) ? body.granularity : 'standard';
      if (!body.caseRecord || typeof body.caseRecord !== 'object') return json(res, 400, {error:'caseRecord object is required', errorCode:'missing_case_record'});
      const challenges = normalizeChallenges(body.challenges);
      const sourceIndex = buildSourceReferenceIndex(body.caseRecord, challenges);
      if (!sourceIndex.refs.size) return json(res, 400, {error:'caseRecord must contain at least one non-empty source value', errorCode:'empty_case_record'});
      const result = await analyze(body.caseRecord, condition, granularity, challenges, sourceIndex);
      const errors = validateStructuralMap(result.map, body.caseRecord, sourceIndex, granularity);
      if (errors.length) return json(res, 502, {error:'model output failed v0.3.1 validation', errorCode:'model_output_validation_failed', details:errors});
      return json(res, 200, {
        version:'0.3.1', condition, granularity,
        provider:result.provider, researchUsable:result.researchUsable,
        model:result.model, responseId:result.responseId, map:result.map
      });
    }
    if (req.method === 'GET') return serveStatic(req, res);
    json(res, 405, {error:'method not allowed'});
  } catch (err) {
    console.error(err);
    json(res, 500, {error:err.message || 'internal error', errorCode:err.code || 'server_error'});
  }
});

server.listen(PORT, () => {
  console.log(`Rheo v0.3.1 server listening on http://localhost:${PORT} (provider=${MODEL_PROVIDER})`);
});