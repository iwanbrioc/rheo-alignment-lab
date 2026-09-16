import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

function load(file, mocks) {
  const module = { exports: {} };
  const source = readFileSync(new URL(file, import.meta.url), 'utf8');
  const { outputText } = ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true,
  } });
  vm.runInNewContext(outputText, { module, exports: module.exports, AbortController, Error, SyntaxError,
    process: { env: { EXPO_PUBLIC_RHEO_ENGINE: 'v0.9' } }, setTimeout, clearTimeout, require: (name) => {
      if (name in mocks) return mocks[name];
      throw new Error(`Unexpected import ${name}`);
    } });
  return module.exports;
}
function pending(_url, { signal }) {
  return new Promise((_resolve, reject) => {
    const abort = () => reject(Object.assign(new Error('Aborted'), { name: 'AbortError' }));
    if (signal.aborted) abort(); else signal.addEventListener('abort', abort, { once: true });
  });
}
const http = load('./src/services/http.ts', { 'expo/fetch': { fetch: pending } });
await assert.rejects(http.postJson('https://example.invalid', '/test', {}, { timeoutMs: 5 }), (error) => error.name === 'TimeoutError');
const cancel = new AbortController();
const stopping = http.postJson('https://example.invalid', '/test', {}, { signal: cancel.signal });
cancel.abort();
await assert.rejects(stopping, (error) => error.name === 'AbortError');
let calls = 0;
const success = load('./src/services/http.ts', { 'expo/fetch': { fetch: async () => { calls++; return Response.json({ ok: true }); } } });
await assert.rejects(success.postJson('https://example.invalid', '/test', {}, { signal: cancel.signal }));
assert.equal(calls, 0, 'already stopped requests must not reach the network');
assert.equal((await success.postJson('https://example.invalid', '/test', {})).ok, true);
const broken = load('./src/services/http.ts', { 'expo/fetch': { fetch: async () => new Response('not JSON') } });
await assert.rejects(broken.postJson('https://example.invalid', '/test', {}), /could not be read/);
const unavailable = load('./src/services/http.ts', { 'expo/fetch': { fetch: async () => Response.json({ error: 'Try later' }, { status: 503 }) } });
await assert.rejects(unavailable.postJson('https://example.invalid', '/test', {}), /Try later/);

const actions = ['smallest_release', 'learning_action', 'generative_action'].map((kind, index) => ({
  id: `test-${index}`, kind, title: 'Test option', action: 'Check a public source.', whyThisAction: 'Check the rule.', falsifierOrChangeSignal: 'Stop if unsafe.',
}));
const wording = load('./src/services/plainLanguage.ts', {
  'expo/fetch': { fetch: pending },
  '../../plain_language_contract.mjs': { displayActions: (values) => values },
});
const wordingCancel = new AbortController();
const wordingRequest = wording.plainLanguageActions(actions, wordingCancel.signal);
wordingCancel.abort();
await assert.rejects(wordingRequest, (error) => error.name === 'AbortError', 'Stop must not return original options as a wording fallback');
const shared = { '../utils/decisionSession': { createLocalId: () => 'test-id', removeCoordinateFields: (value) => value } };
function pipeline({ provider = 'openai', onRequest = () => {}, onWording = () => {} } = {}) {
  const paths = []; let formatted = 0;
  const api = load('./src/services/rheoApi.ts', { ...shared,
    './experimentalApi': { askExperimental: () => { throw new Error('Legacy smoke must use the legacy engine.'); } },
    './http': { postJson: async (_base, path, _body, options) => {
      paths.push(path); onRequest(path, options);
      return path.endsWith('flow') ? { provider, flow: { checked: true } } : { provider, actionSet: { actions } };
    } },
    './plainLanguage': { plainLanguageActions: async (originals, signal) => {
      formatted++; onWording(signal); return { actions: originals, language: { status: 'simple', provider: 'openai', model: 'test' } };
    } },
  });
  return { ...api, paths, formats: () => formatted };
}
const normal = pipeline(); const stages = [];
const record = await normal.askRheo('Public test question', null, null, { onStage: (stage) => stages.push(stage) });
assert.deepEqual(stages, ['understanding', 'options', 'wording']);
assert.equal(record.actions.length, 3); assert.equal(record.originalActions.length, 3);
assert.equal(normal.formats(), 1);
const fixture = pipeline({ provider: 'fixture' });
await fixture.askRheo('Public test question', null, null);
assert.equal(fixture.formats(), 0);
for (const at of ['before', 'flow', 'options', 'wording']) {
  const controller = new AbortController();
  const api = pipeline({ onRequest: (path, options) => {
    assert.equal(options.signal, controller.signal);
    if (path.endsWith(at === 'options' ? 'actions' : at)) controller.abort();
  }, onWording: (signal) => { if (at === 'wording') { assert.equal(signal, controller.signal); controller.abort(); } } });
  if (at === 'before') controller.abort();
  await assert.rejects(api.askRheo('Public test question', null, null, { signal: controller.signal }), (error) => error.name === 'AbortError');
  assert.equal(api.paths.length, at === 'before' ? 0 : at === 'flow' ? 1 : 2);
  assert.equal(api.formats(), at === 'wording' ? 1 : 0, 'later stages must not run after cancellation');
}
console.log('mobile request smoke PASS | request timeouts | Stop before/during each stage | no late recommendations | real progress stages | fixture isolation | clear errors');
