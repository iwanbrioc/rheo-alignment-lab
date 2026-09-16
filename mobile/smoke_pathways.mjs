import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import http from 'node:http';
import vm from 'node:vm';
import ts from 'typescript';
import * as contract from './pathway_contract.mjs';
import { createPathwayHandler, PATHWAY_INSTRUCTIONS, planPathway } from './pathway_planner.mjs';

function load(file, mocks) {
  const module = { exports: {} };
  const source = readFileSync(new URL(file, import.meta.url), 'utf8');
  const { outputText } = ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true,
  } });
  vm.runInNewContext(outputText, { module, exports: module.exports, Error, AbortController, process: { env: {} },
    require: (name) => { if (name in mocks) return mocks[name]; throw new Error(`Unexpected import ${name}`); } });
  return module.exports;
}
let id = 0;
const util = load('./src/utils/pathway.ts', {
  '../../pathway_contract.mjs': contract, './decisionSession': { createLocalId: (prefix) => `${prefix}-test-${++id}` },
});
const brief = { need: 'I need a working bicycle to get to work.', gift: '', enablers: '', limits: 'I cannot take on unpaid work.' };
const request = { ...brief, consent: contract.PATHWAY_CONSENT };
assert.equal(contract.validatePathwayRequest(request).gift, '', 'receiving must not require a gift');
for (const bad of [{ ...request, consent: false }, { ...request, latitude: 51 }, { ...request, history: [] },
  { ...request, need: '' }, { ...request, gift: 'x'.repeat(1501) }]) assert.throws(() => contract.validatePathwayRequest(bad));
const plan = { nextStep: 'Ask whether you can use a repair session.', why: 'Shared tools could make a repair possible.',
  check: 'Is there a session you can reach and afford?', care: 'Check how the repairer wants to be supported; do not assume free labour.',
  stopIf: 'Keep your current transport if this would risk getting to work.', couldRemain: 'A way to repair the bicycle again could remain.' };
const result = { plan, provider: 'openai', model: 'test-model', createdAt: '2026-09-16T10:00:00Z', kind: 'possibility' };
assert.equal(contract.validatePathwayResult(result).kind, 'possibility');
assert.throws(() => contract.validatePathwayResult({ ...result, kind: 'available' }));
assert.throws(() => contract.validatePathwayResult({ ...result, plan: { ...plan, completed: true } }));
assert.throws(() => contract.validatePathwayResult({ ...result, plan: { ...plan, care: '' } }));
assert.throws(() => contract.validatePathwayResult({ ...result, plan: { ...plan, why: '\u0634\u0631\u0637' } }), /English/);

const original = { ...util.createPathway(brief.need), ...brief, nextStep: plan.nextStep, suggestion: result,
  latitude: 50, longitude: 2, memberId: 'private-person', score: 40, decisionHistory: ['private'] };
const clean = util.validatePathway(original);
assert.equal(clean.status, 'idea');
assert.equal(clean.reviews.length, 0);
for (const key of ['latitude', 'longitude', 'memberId', 'score', 'decisionHistory']) assert.equal(key in clean, false);
const review = { id: 'review-one', createdAt: '2026-09-16T11:00:00Z', status: 'helped', happened: 'I repaired the bicycle.',
  felt: 'I felt less rushed.', burden: 'The volunteer needs a break.', remains: 'I learned to mend a puncture.', latitude: 1 };
const checked = util.withPathwayReview(clean, review);
assert.equal(clean.status, 'idea'); assert.equal(clean.reviews.length, 0);
assert.equal(checked.status, 'helped'); assert.equal(checked.reviews.length, 1);
assert.equal(JSON.stringify(checked.suggestion), JSON.stringify(result), 'observation must not change the AI snapshot');
assert.equal('latitude' in checked.reviews[0], false);
assert.throws(() => util.validatePathway({ ...clean, status: 'helped' }), /observation/);
assert.throws(() => util.withPathwayReview(clean, { ...review, happened: '' }));
assert.throws(() => util.parsePathways('broken'));
assert.throws(() => util.parsePathways(JSON.stringify([clean, clean])));
assert.equal(util.parsePathways(null).length, 0);

let disk = null, writes = 0, failWrite = false, failRead = false;
const storage = load('./src/storage/pathways.ts', {
  '../utils/pathway': util,
  '@react-native-async-storage/async-storage': {
    getItem: async (key) => { assert.equal(key, '@rheo/private-pathways/v1'); if (failRead) throw new Error('No read'); return disk; },
    setItem: async (_key, value) => { writes++; if (failWrite) throw new Error('No write'); disk = value; },
  },
});
await storage.savePathway(clean);
failWrite = true;
await assert.rejects(storage.savePathway(checked));
assert.equal((await storage.listPathways())[0].status, 'idea');
failWrite = false;
await storage.savePathway(checked);
assert.equal((await storage.listPathways())[0].reviews.length, 1);
const other = util.createPathway('Another synthetic need.');
await Promise.all([storage.savePathway(other), storage.deletePathway(clean.id)]);
assert.deepEqual(JSON.parse(disk).map((item) => item.id), [other.id], 'ordered writes must not revive deletions');
disk = '{corrupt'; const before = writes;
await assert.rejects(storage.savePathway(clean)); await assert.rejects(storage.deletePathway(other.id));
assert.equal(writes, before); assert.equal(disk, '{corrupt');
disk = JSON.stringify(Array.from({ length: util.MAX_PATHWAYS }, (_, i) => ({ ...clean, id: `pathway-${i}` })));
await assert.rejects(storage.savePathway(other), /50 saved/);
assert.equal(JSON.parse(disk).length, 50, 'never silently evict a pathway');
await storage.savePathway({ ...clean, id: 'pathway-0' });
failRead = true; await assert.rejects(storage.savePathway(other)); failRead = false;

let sent;
const client = load('./src/services/pathwayApi.ts', { '../../pathway_contract.mjs': contract,
  './http': { postJson: async (base, path, body, options) => { sent = { base, path, body, options }; return result; } },
});
const abort = new AbortController();
await client.suggestPathway({ ...original, reviews: [review] }, abort.signal);
assert.equal(sent.path, '/api/pathway-plan');
assert.deepEqual(sent.body, request, 'only the reviewed four fields and consent may leave the device');
assert.equal(sent.options.signal, abort.signal);

const oldEnv = { provider: process.env.RHEO_PATHWAY_PROVIDER, key: process.env.OPENAI_API_KEY };
process.env.RHEO_PATHWAY_PROVIDER = 'openai'; process.env.OPENAI_API_KEY = 'synthetic-test-key';
let providerCalls = 0;
try {
  const received = await planPathway(request, { fetchImpl: async (url, options) => {
    providerCalls++; assert.equal(url, 'https://api.openai.com/v1/responses');
    const payload = JSON.parse(options.body);
    assert.equal(payload.store, false); assert.deepEqual(payload.tools, []);
    assert.equal(payload.text.format.strict, true);
    assert.deepEqual(JSON.parse(payload.input[0].content[0].text), brief);
    assert.equal(payload.instructions, PATHWAY_INSTRUCTIONS);
    return Response.json({ status: 'completed', output: [{ type: 'message', content: [{ type: 'output_text', text: JSON.stringify(plan) }] }] });
  } });
  assert.equal(received.kind, 'possibility'); assert.equal(providerCalls, 1);
  for (const phrase of ['No required repayment', 'not seven boxes', 'Immediate safety', 'Do not invent',
    'say no and leave safely', 'living systems', 'no personalised']) {
    // Case-insensitive policy contract checks supplement, but cannot prove, model behaviour.
    assert.ok(PATHWAY_INSTRUCTIONS.toLowerCase().includes(phrase.toLowerCase()), phrase);
  }
  await assert.rejects(planPathway(request, { fetchImpl: async () => Response.json({ status: 'incomplete', output: [] }) }));
  process.env.RHEO_PATHWAY_PROVIDER = 'fixture';
  await assert.rejects(planPathway(request, { fetchImpl: async () => { throw new Error('Fixture must not call a provider'); } }), /not enabled/);
} finally {
  for (const [key, value] of [['RHEO_PATHWAY_PROVIDER', oldEnv.provider], ['OPENAI_API_KEY', oldEnv.key]]) {
    if (value === undefined) delete process.env[key]; else process.env[key] = value;
  }
}

let runs = 0;
const handler = createPathwayHandler({ run: async () => { runs++; return result; } });
const server = http.createServer((req, res) => handler(req, res, (target, status, body) => {
  target.writeHead(status, { 'content-type': 'application/json' }); target.end(JSON.stringify(body));
}));
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const url = `http://127.0.0.1:${server.address().port}`;
try {
  const send = (body, headers = {}) => fetch(url, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body) });
  assert.equal((await send(request, { origin: 'https://example.invalid' })).status, 403);
  assert.equal((await send(request, { 'content-type': 'text/plain' })).status, 415);
  assert.equal((await send({ ...request, consent: false })).status, 400);
  assert.equal((await send({ ...request, extra: 'x'.repeat(31000) })).status, 413);
  assert.equal(runs, 0);
  for (let i = 0; i < 20; i++) assert.equal((await send(request)).status, 200);
  assert.equal((await send(request)).status, 429); assert.equal(runs, 20);
} finally { server.closeAllConnections(); await new Promise((resolve) => server.close(resolve)); }
console.log('mobile pathway smoke PASS | optional giving | consent and payload minimisation | RWB prompt contract | no-tool suggestion | fixture refuses fabrication | observed status only | immutable suggestions | bounded local storage | corruption and retry | ordered writes | no silent eviction | HTTP limits');
