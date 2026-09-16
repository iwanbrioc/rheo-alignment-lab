import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';
import { fixtureDecision } from '../experiments/rheo-v0.10/fixture.mjs';
import * as preparationContract from './preparation_contract.mjs';

const root = new URL('.', import.meta.url).pathname;
const clone = (value) => JSON.parse(JSON.stringify(value));
function loader(overrides = {}, env = {}) {
  const cache = new Map();
  function load(relative) {
    const file = path.resolve(root, relative);
    if (cache.has(file)) return cache.get(file).exports;
    const module = { exports: {} }; cache.set(file, module);
    const { outputText } = ts.transpileModule(readFileSync(file, 'utf8'), { compilerOptions: {
      module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React, esModuleInterop: true,
    } });
    vm.runInNewContext(outputText, { module, exports: module.exports, AbortController, Error, Date, setTimeout, clearTimeout, process: { env }, require: (name) => {
      if (name in overrides) return overrides[name];
      if (name.endsWith('preparation_contract.mjs')) return preparationContract;
      if (name.startsWith('.')) {
        const base = path.resolve(path.dirname(file), name);
        const found = [base + '.ts', base + '.tsx'].find(existsSync);
        if (found) return load(found);
      }
      throw new Error(`Unexpected import ${name}`);
    } });
    return module.exports;
  }
  return load;
}
let disk = '[]', readFail = false, writeFail = false, writes = 0;
const memory = { getItem: async () => { if (readFail) throw new Error('read failed'); return disk; },
  setItem: async (_key, value) => { writes++; if (writeFail) throw new Error('write failed'); disk = value; } };
const load = loader({ '@react-native-async-storage/async-storage': memory });
const util = load('src/utils/experimental.ts');
const helpers = load('src/utils/decisionSession.ts');
const storage = load('src/storage/decisionSessions.ts');
const request = { caseId: 'mobile-test', situation: 'Synthetic mobile review test.', localContext: null, review: null };
const result = fixtureDecision(request);
const recommendation = { id: 'r1', caseId: request.caseId, createdAt: new Date().toISOString(), flow: result.flow,
  actions: result.actionSet.actions, flowMeta: { provider: 'fixture' }, actionMeta: { provider: 'fixture' } };
const session = { id: 's1', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), situation: request.situation,
  locationUsed: false, areaLabel: null, localContext: null, recommendation, choice: { kind: 'not_yet', capturedAt: new Date().toISOString() }, researchArm: null };
const review = { ...util.EMPTY_OUTCOME, id: 'review1', createdAt: new Date().toISOString(), recommendationId: 'r1', chosenAction: 'Not yet.', expectedObservation: 'No prediction.', actualAction: 'Asked about the rule.', happened: 'There was no rule.' };
assert.ok(util.experimentalFlow(result.flow));
assert.equal(util.experimentalFlow({ ...result.flow, hypotheses: [] }), null);
assert.ok(util.validOutcomeReview(review));
assert.equal(util.validOutcomeReview({ ...review, latitude: 0 }), false);
assert.equal(util.validOutcomeReview({ ...review, actualAction: ' ' }), false);
assert.equal(util.validOutcomeReview({ ...review, burden: 'x'.repeat(1501) }), false);
assert.throws(() => util.reviewInput(session, { ...review, recommendationId: 'wrong' }), /does not match/);
const input = util.reviewInput(session, review);
assert.equal(input.previousRecommendationId, 'r1'); assert.equal(input.previousHypotheses.length, 1);
assert.equal(input.id, undefined); assert.equal(input.createdAt, undefined);
await storage.upsertDecisionSession(session);
const original = JSON.stringify(session.recommendation);
const updated = await storage.saveOutcomeReview('s1', review);
assert.equal(JSON.stringify(updated.recommendation), original);
assert.equal(updated.outcomes.length, 1);
assert.equal((await storage.saveOutcomeReview('s1', review)).outcomes.length, 1);
await assert.rejects(storage.saveOutcomeReview('s1', { ...review, happened: 'Changed old record.' }), /cannot be overwritten/);
await assert.rejects(storage.saveOutcomeReview('missing', review), /changed or was deleted/);
assert.equal(helpers.withSituationChanged(updated, 'New synthetic question.').outcomes.length, 0);
const safeDisk = disk;
disk = JSON.stringify([{ ...updated, outcomes: [{ ...review, actualAction: null }] }]);
const count = writes;
await assert.rejects(storage.saveOutcomeReview('s1', review), /could not be read/); assert.equal(writes, count);
disk = safeDisk; readFail = true;
await assert.rejects(storage.saveOutcomeReview('s1', review), /could not be read/); readFail = false;
writeFail = true;
await assert.rejects(storage.saveOutcomeReview('s1', { ...review, id: 'review2' }), /write failed/); assert.equal(disk, safeDisk); writeFail = false;

let calls = 0, sent, broken = false;
const apiLoad = loader({ './http': { postJson: async (_base, endpoint, body) => {
  calls++; sent = body; assert.equal(endpoint, '/api/v0.10/decision');
  const data = fixtureDecision(body);
  if (broken) data.actionSet.actions = [];
  return { ...data, provider: 'fixture', model: 'fixture', responseId: null };
} } });
const api = apiLoad('src/services/experimentalApi.ts');
const snapshot = await api.askExperimental(request.situation, { latitude: 1, nested: { longitude: 2 } });
assert.equal(calls, 1); assert.equal(snapshot.actions.length, 3); assert.doesNotMatch(sent.localContext, /latitude|longitude/);
await api.askExperimental(request.situation, null, { areaLabel: 'Synthetic area after a failed place search' });
assert.equal(JSON.parse(sent.localContext).areaLabel, 'Synthetic area after a failed place search');
broken = true; await assert.rejects(api.askExperimental(request.situation, null), /incomplete experimental/); broken = false;
const aborted = new AbortController(); aborted.abort();
const beforeAbort = calls;
await assert.rejects(api.askExperimental(request.situation, null, { signal: aborted.signal }), /stopped/);
assert.equal(calls, beforeAbort);

// A small native-component harness exercises review state and failed-write recovery.
let slots = [], cursor = 0, effects = [], cleanups = [], appState, androidBack, prompt, asks = 0, newDecision, savedSession;
const react = { createElement: (type, props, ...children) => ({ type, props: { ...props, children } }),
  useState: (value) => { const i = cursor++; if (!(i in slots)) slots[i] = typeof value === 'function' ? value() : value;
    return [slots[i], (next) => { slots[i] = typeof next === 'function' ? next(slots[i]) : next; }]; },
  useRef: (value) => { const i = cursor++; return slots[i] ||= { current: value }; },
  useEffect: (effect, deps) => { const i = cursor++; if (!deps || !(i in slots)) { slots[i] = true; effects.push(effect); } },
};
const native = { View: 'View', Text: 'Text', TextInput: 'TextInput', Keyboard: { dismiss() {} }, StyleSheet: { create: (value) => value },
  Alert: { alert: (_title, _text, buttons) => { prompt = buttons; } }, AppState: { addEventListener: (_name, fn) => { appState = fn; return { remove() {} }; } },
  BackHandler: { addEventListener: (_name, fn) => { androidBack = fn; return { remove() {} }; } } };
let ask = async () => snapshot;
const uiLoad = loader({ react, 'react-native': native, '../components/AppButton': { AppButton: 'AppButton' }, '../components/RheoBrand': { RheoBrand: 'RheoBrand' },
  '../services/experimentalApi': { askExperimental: async (...args) => { asks++; return ask(...args); } },
  '../storage/decisionSessions': storage,
});
const Screen = uiLoad('src/screens/OutcomeReviewScreen.tsx').OutcomeReviewScreen;
let props = { session, onBack: () => {}, onSaved: (s) => { savedSession = s; props.session = s; }, onNewDecision: (s) => { newDecision = s; } };
const render = () => { cursor = 0; effects = []; const tree = Screen(props); cleanups.push(...effects.map((effect) => effect()).filter(Boolean)); return tree; };
const nodes = (node) => !node || typeof node !== 'object' ? [] : [node, ...(node.props?.children || []).flat(Infinity).flatMap(nodes)];
const button = (label) => nodes(render()).find((n) => n.props.label === label)?.props;
const field = (label) => nodes(render()).find((n) => n.props.accessibilityLabel === label)?.props;
const settle = async () => { for (let i = 0; i < 5; i++) await new Promise((resolve) => setTimeout(resolve, 0)); };
render(); assert.equal(asks, 0);
field('What did you actually do?').onChangeText('Made one call.'); field('What happened?').onChangeText('The service said the rule had changed.');
androidBack(); assert.ok(prompt); assert.equal(prompt[0].text, 'Stay here');
writeFail = true; button('Save this review').onPress(); await settle();
assert.equal(field('What happened?').value, 'The service said the rule had changed.');
writeFail = false; button('Save this review').onPress(); await settle();
assert.ok(savedSession); assert.equal(JSON.stringify(savedSession.recommendation), original);
writeFail = true; const askButton = button('Ask Rheo with this update'); askButton.onPress(); askButton.onPress(); await settle();
assert.equal(asks, 1); assert.ok(button('Retry saving new options'));
writeFail = false; button('Retry saving new options').onPress(); await settle();
assert.equal(asks, 1); assert.ok(newDecision); assert.equal(newDecision.previousDecisionId, session.id);
assert.notEqual(newDecision.id, session.id); assert.equal(newDecision.choice, null);
assert.equal((await storage.getDecisionSession(session.id)).recommendation.id, 'r1');

slots = []; props = { ...props, session: savedSession }; render(); newDecision = null;
let finish;
ask = () => new Promise((resolve) => { finish = resolve; });
button('Ask Rheo with this update').onPress(); appState('background'); finish(snapshot); await settle();
assert.equal(newDecision, null, 'late response after backgrounding must not be saved');
for (const cleanup of cleanups) cleanup();
await storage.deleteDecisionSession('s1'); assert.equal(await storage.getDecisionSession('s1'), null);
console.log('mobile experimental smoke PASS | typed output guards | coordinate stripping | immutable review/choice | corrupt/read/write recovery | explicit revision | storage-only retry | double-tap and background guards | deletion');
