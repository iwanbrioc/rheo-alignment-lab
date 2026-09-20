import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import http from 'node:http';
import { once } from 'node:events';
import vm from 'node:vm';
import ts from 'typescript';
import { createRequire } from 'node:module';
import { authenticate, createBudget, digestCode, parseInvites } from './private-beta/access.mjs';
import { createBetaServer } from './private-beta/server.mjs';

const { validateBuildEnvironment } = createRequire(import.meta.url)('./build-config.cjs');
const appConfig = JSON.parse(readFileSync(new URL('./app.json', import.meta.url), 'utf8')).expo;
assert.equal(appConfig.ios.config.usesNonExemptEncryption, false);
const code = `rb1_${'a'.repeat(43)}`;
const otherCode = `rb1_${'b'.repeat(43)}`;
const invites = parseInvites(JSON.stringify([code, otherCode].map((value) => ({ hash: digestCode(value), expiresAt: '2099-01-01T00:00:00.000Z' }))));
assert.equal(authenticate(`Bearer ${code}`, invites), digestCode(code));
assert.equal(authenticate(`Bearer ${code}`, invites, Date.parse('2100-01-01')), null);
assert.equal(authenticate(`Bearer ${code}`, []), null);
for (const input of ['', 'Bearer wrong', `Bearer ${code} `, undefined, ['a']]) assert.equal(authenticate(input, invites), null);
for (const value of ['[]', '{}', 'null', 'oops', '[{"hash":"bad","expiresAt":"2099-01-01"}]']) assert.throws(() => parseInvites(value));
const temp = mkdtempSync(join(tmpdir(), 'rheo-beta-'));
try {
  const file = join(temp, 'usage.json'); let now = Date.parse('2026-09-17T12:00:00Z');
  let budget = createBudget({ file, perInvite: 2, total: 3, now: () => now });
  assert.equal(budget.admit(invites[0].hash, 2), true);
  budget = createBudget({ file, perInvite: 2, total: 3, now: () => now });
  assert.equal(budget.admit(invites[0].hash), false, 'restart must not reset quota');
  assert.equal(budget.admit(invites[1].hash), true);
  assert.equal(budget.admit(invites[1].hash), false, 'global limit applies across codes');
  assert.ok(!readFileSync(file, 'utf8').includes(code));
  now += 86400000; assert.equal(budget.admit(invites[0].hash), true);
  now -= 86400000; assert.throws(() => budget.admit(invites[0].hash), /backwards/);
  writeFileSync(file, 'corrupt'); assert.throws(() => createBudget({ file }), /Refusing/);

  let calls = 0, admissions = 0, helpers = 0;
  const handler = async (req, res) => {
    assert.equal(req.headers.authorization, undefined, 'internal services do not receive access codes');
    assert.equal(req.headers.host, 'localhost');
    calls++; const chunks = []; for await (const chunk of req) chunks.push(chunk);
    res.setHeader('content-type', 'application/json'); res.end(JSON.stringify({ bytes: Buffer.concat(chunks).length }));
  };
  const server = createBetaServer({ invites, budget: { admit: () => { admissions++; return true; } },
    core: http.createServer(handler), helperFactory: () => { helpers++; return http.createServer(handler); } });
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  const url = `http://127.0.0.1:${server.address().port}`;
  const headers = { authorization: `Bearer ${code}`, 'x-forwarded-proto': 'https', 'content-type': 'application/json' };
  const post = (path, overrides = {}, body = '{}') => fetch(url + path, { method: 'POST', headers: { ...headers, ...overrides }, body });
  try {
    assert.equal((await fetch(url + '/api/health')).status, 200);
    assert.equal((await post('/api/v0.10/decision', { authorization: '' })).status, 401);
    assert.equal((await post('/api/v0.10/decision', { 'x-forwarded-proto': 'http' })).status, 403);
    assert.equal((await post('/api/v0.10/decision', { origin: 'https://site.test' })).status, 403);
    assert.equal((await post('/api/v0.10/decision', { 'content-type': 'text/plain' })).status, 415);
    assert.equal((await post('/api/rheo-flow')).status, 404);
    assert.equal((await post('/api/v0.10/decision', {}, 'x'.repeat(48001))).status, 413);
    assert.equal(calls, 0); assert.equal(admissions, 0);
    assert.equal((await fetch(url + '/api/beta/access', { headers })).status, 200); assert.equal(admissions, 0);
    assert.equal((await (await post('/api/v0.10/decision', {}, '{"question":"test"}')).json()).bytes, 19);
    assert.equal((await post('/api/pathway-plan')).status, 200);
    assert.equal((await post('/api/preparation')).status, 200); assert.equal(helpers, 1);
    assert.equal((await post('/api/preparation', { authorization: `Bearer ${otherCode}` })).status, 200); assert.equal(helpers, 2);
  } finally { server.closeAllConnections(); await new Promise((done) => server.close(done)); }

  let finish;
  const busyServer = createBetaServer({ invites, requireHttps: false, budget: createBudget(),
    core: http.createServer(async (req, res) => { for await (const _chunk of req) { /* Drain the synthetic request. */ }
      await new Promise((done) => { finish = done; }); res.end('{}'); }) });
  busyServer.listen(0, '127.0.0.1'); await once(busyServer, 'listening');
  try {
    const busyUrl = `http://127.0.0.1:${busyServer.address().port}/api/v0.10/decision`;
    const first = fetch(busyUrl, { method: 'POST', headers, body: '{}' });
    while (!finish) await new Promise(setImmediate);
    assert.equal((await fetch(busyUrl, { method: 'POST', headers, body: '{}' })).status, 429);
    finish(); await first;
  } finally { busyServer.closeAllConnections(); await new Promise((done) => busyServer.close(done)); }
  const exhausted = createBetaServer({ invites, requireHttps: false, budget: { admit: () => false }, core: http.createServer(handler) });
  exhausted.listen(0, '127.0.0.1'); await once(exhausted, 'listening');
  try {
    const before = calls;
    const response = await fetch(`http://127.0.0.1:${exhausted.address().port}/api/v0.10/decision`, { method: 'POST', headers, body: '{}' });
    assert.equal(response.status, 429); assert.equal(calls, before, 'quota rejection cannot invoke a provider');
  } finally { exhausted.closeAllConnections(); await new Promise((done) => exhausted.close(done)); }

  // Use the real fixture handlers to check dispatch without any paid provider calls.
  const real = createBetaServer({ invites, requireHttps: false, budget: createBudget() });
  real.listen(0, '127.0.0.1'); await once(real, 'listening');
  try {
    const response = await fetch(`http://127.0.0.1:${real.address().port}/api/local-context`, {
      method: 'POST', headers, body: JSON.stringify({ decisionText: 'Synthetic test question', location: { latitude: 51.5, longitude: -0.1, precision: 'approximate', areaLabel: 'Test' }, radiusM: 5000 }),
    });
    assert.equal(response.status, 200); assert.equal((await response.json()).candidates.length, 0);
  } finally { real.closeAllConnections(); await new Promise((done) => real.close(done)); }
} finally { rmSync(temp, { recursive: true, force: true }); }

const environment = { EXPO_PUBLIC_RHEO_PRIVATE_BETA: 'true', EXPO_PUBLIC_RHEO_ENGINE: 'v0.10',
  EXPO_PUBLIC_RHEO_API_URL: 'https://rheo-test.onrender.com', EXPO_PUBLIC_LOCAL_CONTEXT_API_URL: 'https://rheo-test.onrender.com' };
assert.equal(validateBuildEnvironment(environment).privateBeta, true);
assert.throws(() => validateBuildEnvironment({ EAS_BUILD_PROFILE: 'preview' }));
for (const url of ['', 'http://rheo-test.onrender.com', 'https://localhost', 'https://192.168.1.3', 'https://127.0.0.1',
  'https://[::1]', 'https://example.invalid', 'https://a:b@rheo-test.onrender.com', 'https://rheo-test.onrender.com/path']) {
  assert.throws(() => validateBuildEnvironment({ ...environment, EXPO_PUBLIC_RHEO_API_URL: url }));
}
assert.throws(() => validateBuildEnvironment({ ...environment, EXPO_PUBLIC_SECRET: code }));
assert.throws(() => validateBuildEnvironment({ ...environment, EXPO_PUBLIC_RHEO_ENGINE: 'v0.9' }));

function client({ env = environment, stored = code, failStore = false, status = 200 } = {}) {
  let value = stored; const calls = [];
  const module = { exports: {} };
  const output = ts.transpileModule(readFileSync(new URL('./src/services/betaAccess.ts', import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(output, { module, exports: module.exports, URL, Headers, Error, process: { env }, require: (name) => {
    if (name === 'expo-secure-store') return { WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'device-only',
      getItemAsync: async () => value, setItemAsync: async (_key, next, options) => { if (failStore) throw new Error('storage unavailable'); assert.equal(options.keychainAccessible, 'device-only'); value = next; },
      deleteItemAsync: async () => { value = null; } };
    if (name === 'expo/fetch') return { fetch: async (url, options) => { calls.push({ url, options }); return Response.json({ ok: true, privateBeta: true }, { status }); } };
    throw new Error(`Unexpected import ${name}`);
  } });
  return { ...module.exports, calls, value: () => value };
}
const clientUrl = environment.EXPO_PUBLIC_RHEO_API_URL + '/api/v0.10/decision';
const working = client(); assert.equal(await working.hasBetaAccess(), true);
await working.authenticatedFetch(clientUrl, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' });
assert.equal(working.calls[0].options.headers.get('Authorization'), `Bearer ${code}`);
assert.equal(working.calls[0].options.redirect, 'error');
await assert.rejects(working.authenticatedFetch('https://other.test/api/v0.10/decision'));
assert.equal(working.calls.length, 1, 'access must never be sent to another host');
const stopped = new AbortController(); stopped.abort();
await assert.rejects(working.authenticatedFetch(clientUrl, { signal: stopped.signal })); assert.equal(working.calls.length, 1);
await working.removeBetaAccess(); await assert.rejects(working.authenticatedFetch(clientUrl), /access code/);
await working.saveBetaAccess(code, new AbortController().signal); assert.equal(working.value(), code);
await assert.rejects(client({ status: 401 }).authenticatedFetch(clientUrl), /expired/);
const badStorage = client({ stored: otherCode, failStore: true });
await assert.rejects(badStorage.saveBetaAccess(code, new AbortController().signal)); assert.equal(badStorage.value(), otherCode);
const development = client({ env: {}, stored: null }); await development.authenticatedFetch('http://localhost:8080/api/test');
assert.equal(development.calls.length, 1, 'trusted LAN development remains available');

// Exercise the real access panel: first-run notice is skippable, no automatic upload,
// double taps cannot connect twice, failures keep entered text, and removal keeps notes.
let slots = [], cursor = 0, effects = [], saves = 0, removes = 0, failConnect = true;
const react = {
  createElement: (type, props, ...children) => ({ type, props: { ...props, children } }),
  useState: (initial) => { const i = cursor++; if (!(i in slots)) slots[i] = initial;
    return [slots[i], (value) => { slots[i] = value; }]; },
  useRef: (initial) => { const i = cursor++; if (!(i in slots)) slots[i] = { current: initial }; return slots[i]; },
  useEffect: (fn) => effects.push(fn),
};
let background;
const panelModule = { exports: {} };
const panelOutput = ts.transpileModule(readFileSync(new URL('./src/components/BetaAccessPanel.tsx', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React, esModuleInterop: true },
}).outputText;
vm.runInNewContext(panelOutput, { module: panelModule, exports: panelModule.exports, Error, AbortController, setTimeout, clearTimeout, require: (name) => {
  if (name === 'react') return react;
  if (name === 'react-native') return { Modal: 'Modal', ScrollView: 'ScrollView', Text: 'Text', TextInput: 'TextInput', View: 'View', StyleSheet: { create: (s) => s }, AppState: { addEventListener: (_event, fn) => { background = fn; return { remove() {} }; } } };
  if (name === 'react-native-safe-area-context') return { SafeAreaView: 'SafeAreaView' };
  if (name === '../theme') return { colors: {} };
  if (name === './AppButton') return { AppButton: 'AppButton' };
  if (name === './RheoBrand') return { RheoBrand: 'RheoBrand' };
  if (name === '../services/betaAccess') return { privateBeta: true, hasBetaAccess: async () => false,
    saveBetaAccess: async () => { saves++; await new Promise(setImmediate); if (failConnect) throw new Error('Invalid test code'); },
    removeBetaAccess: async () => { removes++; } };
  throw new Error(`Unexpected panel import ${name}`);
} });
const nodes = (node) => !node || typeof node !== 'object' ? [] : [node, ...(node.props?.children || []).flat(Infinity).flatMap(nodes)];
const render = () => { cursor = 0; effects = []; return panelModule.exports.BetaAccessPanel({}); };
const button = (tree, label) => nodes(tree).find((node) => node.props.label === label)?.props;
const tick = () => new Promise(setImmediate);
let tree = render(); const cleanups = effects.map((effect) => effect()); await tick(); tree = render();
assert.equal(nodes(tree).find((node) => node.type === 'Modal').props.visible, true);
assert.equal(saves, 0); assert.ok(button(tree, 'Back to Rheo'));
button(tree, 'Back to Rheo').onPress(); tree = render();
assert.equal(nodes(tree).find((node) => node.type === 'Modal').props.visible, false);
button(tree, 'Private test access').onPress(); tree = render();
const input = nodes(tree).find((node) => node.type === 'TextInput').props;
assert.equal(input.secureTextEntry, true); input.onChangeText(code); tree = render();
button(tree, 'Connect').onPress(); button(tree, 'Connect').onPress(); await tick(); await tick(); tree = render();
assert.equal(saves, 1); assert.equal(nodes(tree).find((node) => node.type === 'TextInput').props.value, code);
failConnect = false; button(tree, 'Connect').onPress(); await tick(); await tick(); tree = render();
assert.equal(nodes(tree).find((node) => node.type === 'Modal').props.visible, false);
assert.equal(nodes(tree).find((node) => node.type === 'TextInput').props.value, '');
button(tree, 'Private test access').onPress(); tree = render();
button(tree, 'Remove access from this phone').onPress(); await tick(); tree = render();
assert.equal(removes, 1); assert.equal(button(tree, 'Remove access from this phone'), undefined);
background('background'); cleanups.forEach((cleanup) => cleanup?.());
console.log('mobile private-beta smoke PASS | expiring/revocable access | persistent fail-closed daily limits | HTTPS/auth/origin/size gates | isolated preparation caches | fixture dispatch | secure token storage | no cross-host auth or redirects | cancellation | preview build guards');
