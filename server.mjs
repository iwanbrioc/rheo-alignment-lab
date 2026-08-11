import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

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
const MAX_BODY = 1_000_000;

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

function validateStructuralMap(m) {
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
  if (!Array.isArray(m.propositions)) errors.push('propositions must be an array');
  else for (const [i,p] of m.propositions.entries()) {
    if (!p || typeof p !== 'object') { errors.push(`propositions[${i}] invalid`); continue; }
    if (!['user_reported_observation','user_interpretation','ai_inference','verified_external','absent_party_account','unknown'].includes(p.provenance)) errors.push(`propositions[${i}].provenance invalid`);
    if (!['low','medium','high'].includes(p.confidence)) errors.push(`propositions[${i}].confidence invalid`);
    if (typeof p.id !== 'string' || typeof p.text !== 'string' || typeof p.contested !== 'boolean' || !isStringArray(p.sourceRefs)) errors.push(`propositions[${i}] shape invalid`);
  }
  if (!Array.isArray(m.mechanisms)) errors.push('mechanisms must be an array');
  else for (const [i,h] of m.mechanisms.entries()) {
    if (!h || typeof h !== 'object' || typeof h.label !== 'string' || typeof h.causalDirection !== 'string' || !isStringArray(h.evidenceRefs) || !['low','medium','high'].includes(h.confidence)) errors.push(`mechanisms[${i}] shape invalid`);
  }
  const ni = m.narratorImplication;
  if (!ni || typeof ni.present !== 'boolean' || typeof ni.description !== 'string' || !isStringArray(ni.evidenceRefs)) errors.push('narratorImplication shape invalid');
  const sc = m.safetyCaution;
  if (!sc || !['unknown','none_detected','caution','high'].includes(sc.level) || !isStringArray(sc.indicators) || !isStringArray(sc.evidenceRefs) || typeof sc.uncertainty !== 'string') errors.push('safetyCaution shape invalid');
  if (!['specific','mixed','generic'].includes(m.genericitySelfCheck)) errors.push('genericitySelfCheck invalid');
  return errors;
}

function strictOutputSchema(source) {
  function walk(value) {
    if (Array.isArray(value)) return value.map(walk);
    if (!value || typeof value !== 'object') return value;
    const out = {};
    for (const [k,v] of Object.entries(value)) {
      if (['$schema','$id','title','description'].includes(k)) continue;
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

function fixtureMap(caseRecord, condition) {
  const caseId = String(caseRecord?.caseId || 'fixture-case');
  const situation = String(caseRecord?.context?.situation || 'No situation supplied');
  return {
    schemaVersion: '0.3',
    caseId,
    propositions: [
      { id:'p1', text:situation, provenance:'user_reported_observation', confidence:'low', contested:false, sourceRefs:['case.context.situation'] },
      { id:'p2', text:'The available account may be incomplete because other affected perspectives are not independently represented.', provenance:'ai_inference', confidence:'high', contested:false, sourceRefs:['case'] }
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

async function analyzeWithOpenAI(caseRecord, condition, granularity) {
  if (!OPENAI_API_KEY) throw new Error('OPENAI_API_KEY is not configured');
  const userText = [
    'Analyze the CASE_RECORD below. Treat user-entered labels and dropdown selections as narrator-supplied metadata, not independently verified facts.',
    'Preserve CASE_RECORD.caseId exactly in the output.',
    granularityInstruction(granularity),
    'CASE_RECORD:',
    JSON.stringify(caseRecord)
  ].join('\n\n');

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
  if (!response.ok) throw new Error(`OpenAI Responses API ${response.status}: ${raw?.error?.message || JSON.stringify(raw)}`);
  const map = JSON.parse(extractOutputText(raw));
  return { map, model: raw.model || OPENAI_MODEL, responseId: raw.id || null };
}

async function analyze(caseRecord, condition, granularity) {
  if (MODEL_PROVIDER === 'fixture') return { map:fixtureMap(caseRecord, condition), model:'fixture-v0.3', responseId:null };
  if (MODEL_PROVIDER !== 'openai') throw new Error(`Unsupported RHEO_MODEL_PROVIDER: ${MODEL_PROVIDER}`);
  return analyzeWithOpenAI(caseRecord, condition, granularity);
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
      return json(res, 200, { ok:true, version:'0.3', provider:MODEL_PROVIDER, model:MODEL_PROVIDER === 'openai' ? OPENAI_MODEL : 'fixture-v0.3', modelConfigured:MODEL_PROVIDER === 'fixture' || Boolean(OPENAI_API_KEY) });
    }
    if (req.method === 'GET' && url.pathname === '/api/schema') return json(res, 200, schema);
    if (req.method === 'POST' && url.pathname === '/api/analyze') {
      const body = await readJsonBody(req);
      const condition = body.condition === 'control' ? 'control' : body.condition === 'rheo' ? 'rheo' : null;
      if (!condition) return json(res, 400, {error:'condition must be rheo or control'});
      const granularity = ['coarse','standard','fine'].includes(body.granularity) ? body.granularity : 'standard';
      if (!body.caseRecord || typeof body.caseRecord !== 'object') return json(res, 400, {error:'caseRecord object is required'});
      const result = await analyze(body.caseRecord, condition, granularity);
      const errors = validateStructuralMap(result.map);
      if (errors.length) return json(res, 502, {error:'model output failed structural-map validation', details:errors});
      if (result.map.caseId !== String(body.caseRecord.caseId)) return json(res, 502, {error:'model changed caseId'});
      return json(res, 200, { version:'0.3', condition, granularity, model:result.model, responseId:result.responseId, map:result.map });
    }
    if (req.method === 'GET') return serveStatic(req, res);
    json(res, 405, {error:'method not allowed'});
  } catch (err) {
    console.error(err);
    json(res, 500, {error:err.message || 'internal error'});
  }
});

server.listen(PORT, () => {
  console.log(`Rheo v0.3 server listening on http://localhost:${PORT} (provider=${MODEL_PROVIDER})`);
});