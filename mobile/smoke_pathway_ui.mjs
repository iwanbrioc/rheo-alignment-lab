import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import * as contract from './pathway_contract.mjs';

let slots = [], cursor = 0, pendingEffects = [], prompt, appState, hardwareBack;
const react = {
  createElement: (type, props, ...children) => ({ type, props: { ...props, children } }),
  useState: (initial) => {
    const index = cursor++;
    if (!(index in slots)) slots[index] = typeof initial === 'function' ? initial() : initial;
    return [slots[index], (next) => { slots[index] = typeof next === 'function' ? next(slots[index]) : next; }];
  },
  useRef: (value) => { const index = cursor++; return slots[index] ||= { current: value }; },
  useEffect: (callback, deps) => {
    const index = cursor++, previous = slots[index];
    if (!previous || !deps || deps.some((value, i) => value !== previous.deps[i])) {
      pendingEffects.push(() => { previous?.cleanup?.(); slots[index] = { deps, cleanup: callback() }; });
    }
  },
};
const native = { StyleSheet: { create: (value) => value }, View: 'View', Text: 'Text', Pressable: 'Pressable', Switch: 'Switch',
  Keyboard: { dismiss() {} },
  Alert: { alert: (title, message, buttons) => { prompt = { title, message, buttons }; } },
  AppState: { addEventListener: (_type, callback) => { appState = callback; return { remove() { appState = null; } }; } },
  BackHandler: { addEventListener: (_type, callback) => { hardwareBack = callback; return { remove() { hardwareBack = null; } }; } },
};
function load(file, mocks) {
  const module = { exports: {} };
  const { outputText } = ts.transpileModule(readFileSync(new URL(file, import.meta.url), 'utf8'), { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React, esModuleInterop: true,
  } });
  vm.runInNewContext(outputText, { module, exports: module.exports, AbortController, Error, require: (name) => {
    if (name in mocks) return mocks[name];
    if (name === 'react') return react;
    if (name === 'react-native') return native;
    if (name.endsWith('/theme')) return { colors: {}, radii: {}, spacing: {} };
    if (name.endsWith('/utils/format')) return { compactText: (value) => value, formatDateTime: (value) => value };
    if (name.endsWith('/PathwayFields')) return { PathwayField: 'PathwayField', PathwayStatusPicker: 'PathwayStatusPicker' };
    const component = name.split('/').at(-1); return { [component]: component };
  } });
  return module.exports;
}
let id = 0;
const helpers = { createLocalId: (prefix) => `${prefix}-test-${++id}` };
const util = load('./src/utils/pathway.ts', { '../../pathway_contract.mjs': contract, './decisionSession': helpers });
let disk = [], reads = 0, saves = 0, calls = 0, failRead = false, failWrite = false, deletes = 0, returned = 0;
let finishSuggestion, sentSignal;
const storage = {
  listPathways: async () => { reads++; if (failRead) throw new Error('Cannot read pathways.'); return disk; },
  savePathway: async (item) => {
    saves++; if (failWrite) throw new Error('Write failed. Try again.');
    const saved = util.validatePathway(item);
    disk = [saved, ...disk.filter((old) => old.id !== saved.id)]; return saved;
  },
  deletePathway: async (key) => { deletes++; disk = disk.filter((item) => item.id !== key); },
};
const Screen = load('./src/screens/PathwaysScreen.tsx', { '../storage/pathways': storage,
  '../utils/pathway': util, '../utils/decisionSession': helpers,
  '../services/pathwayApi': { suggestPathway: async (_brief, signal) => {
    calls++; sentSignal = signal;
    return new Promise((resolve) => { finishSuggestion = resolve; });
  } },
}).PathwaysScreen;
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));
function nodes(node) { return !node || typeof node !== 'object' ? [] : [node, ...(node.props?.children || []).flat(Infinity).flatMap(nodes)]; }
const render = () => { cursor = 0; pendingEffects = []; const tree = Screen({ onBack: () => returned++ }); for (const effect of pendingEffects) effect(); return tree; };
const find = (type) => nodes(render()).find((node) => node.type === type)?.props;
const label = (value) => nodes(render()).find((node) => node.props.label === value)?.props;
const texts = () => nodes(render()).flatMap((node) => node.props.children || []).filter((value) => typeof value === 'string').join(' ');
const field = (value, text) => label(value).onChange(text);
const tab = (name) => nodes(render()).find((node) => node.props.accessibilityRole === 'tab' && JSON.stringify(node).includes(name)).props.onPress();
const click = async (value) => { const button = label(value); assert.ok(button, value); assert.equal(Boolean(button.disabled), false, value); button.onPress(); await settle(); };
render(); await settle();
assert.equal(reads, 1); assert.equal(calls, 0); assert.equal(saves, 0);
await click('Start a pathway');
assert.equal(label('Save pathway').disabled, true);
field('What is needed?', 'I need a bicycle for work.');
assert.equal(label('Save pathway').disabled, false, 'giving is optional');
assert.equal(label('Suggest a small step').disabled, true);
await click('Save pathway');
assert.equal(disk.length, 1); assert.equal(disk[0].gift, '');
assert.equal(calls, 0, 'saving must work offline without AI');
find('Switch').onValueChange(true);
const button = label('Suggest a small step'); button.onPress(); button.onPress();
assert.equal(calls, 1, 'double tap must not launch duplicate requests');
const result = { kind: 'possibility', provider: 'openai', model: 'test', createdAt: '2026-09-16T12:00:00Z',
  plan: { nextStep: 'Ask about tools.', why: 'Tools could make a repair possible.', check: 'Can you use the tools?',
    care: 'Check the workload.', stopIf: 'Stop if you cannot reach it.', couldRemain: 'A new repair skill could remain.' } };
finishSuggestion(result); await settle();
assert.equal(disk[0].suggestion, null, 'AI must not autosave or mark a pathway available');
assert.ok(texts().includes('Not checked.'));
await click('Use this step');
assert.equal(label('My next step').value, 'Ask about tools.');
await click('Save pathway');
assert.equal(disk[0].status, 'idea'); assert.equal(disk[0].reviews.length, 0);
const frozenSuggestion = JSON.stringify(disk[0].suggestion);
tab('Check-in');
find('PathwayStatusPicker').onChange('helped');
assert.equal(label('Save check-in').disabled, true, 'status must require an observation');
field('What did you try or find out?', 'I could borrow a tool and fixed the bicycle.');
field('What was it like for you?', 'Less pressure.');
field('Who carried the work? What needs rest or care?', 'I need to return the tool; the helper can say no next time.');
failWrite = true;
await click('Save check-in');
assert.ok(texts().includes('Not saved.'));
assert.equal(disk[0].status, 'idea');
assert.equal(label('What did you try or find out?').value, 'I could borrow a tool and fixed the bicycle.');
failWrite = false;
await click('Save check-in');
assert.equal(disk[0].status, 'helped'); assert.equal(disk[0].reviews.length, 1);
assert.equal(JSON.stringify(disk[0].suggestion), frozenSuggestion);
assert.equal(calls, 1, 'save retry must not call AI again');
tab('Possibility');
field('What is needed?', 'A different need for tomorrow.');
assert.equal(find('Switch').value, false);
tab('Next step'); assert.ok(texts().includes('No AI suggestion added'));
assert.equal(label('My next step').value, '', 'old AI step is cleared after the need changes');
const beforeSaves = saves;
hardwareBack(); assert.match(prompt.title, /without saving/);
prompt.buttons[0].onPress(); await settle();
assert.ok(label('Save pathway')); assert.equal(saves, beforeSaves);
tab('Possibility'); find('Switch').onValueChange(true);
await click('Suggest a small step');
appState('background');
assert.equal(sentSignal.aborted, true);
finishSuggestion(result); await settle();
assert.ok(texts().includes('Suggestion stopped'));
tab('Next step'); assert.ok(texts().includes('No AI suggestion added'), 'late background results must be ignored');
await click('Save pathway');
label('Delete pathway').onPress(); assert.equal(deletes, 0);
prompt.buttons[0].onPress(); await settle(); assert.equal(deletes, 0);
label('Delete pathway').onPress(); prompt.buttons[1].onPress(); await settle();
assert.equal(deletes, 1); assert.equal(disk.length, 0);
assert.ok(texts().includes('Pathway deleted.'));
await click('Back to question'); assert.equal(returned, 1);

for (const slot of slots) slot?.cleanup?.();
slots = []; failRead = true;
render(); await settle();
assert.ok(label('Retry loading pathways'));
assert.equal(label('Start a pathway').disabled, true);
failRead = false;
await click('Retry loading pathways');
assert.equal(label('Start a pathway').disabled, false);
await click('Start a pathway'); field('What is needed?', 'An unsaved synthetic need.');
find('Switch').onValueChange(true); await click('Suggest a small step');
for (const slot of slots) slot?.cleanup?.();
assert.equal(sentSignal.aborted, true, 'unmount cancels suggestion');
finishSuggestion(result); await settle();
assert.equal(disk.length, 0, 'unmount never saves a late result');
console.log('mobile pathway UI smoke PASS | offline create/save | optional gifts | explicit one-run consent | no auto action/status | double-tap guard | manual adoption | check-ins | failed save retry | stale suggestion clearing | Android back and delete confirmation | background/unmount cancellation | late-result guard | corrupt history recovery');
