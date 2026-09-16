import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

let now = 0, timerId = 0;
const timers = new Map();
function tick(ms) {
  now += ms;
  for (const [id, timer] of [...timers]) {
    if (timer.at <= now) { timers.delete(id); timer.fn(); }
  }
}
const clock = {
  setTimeout: (fn, ms) => { const id = ++timerId; timers.set(id, { fn, at: now + ms }); return id; },
  clearTimeout: (id) => timers.delete(id),
};
function load(file, imports = {}) {
  const module = { exports: {} };
  const { outputText } = ts.transpileModule(readFileSync(new URL(file, import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React, esModuleInterop: true },
  });
  vm.runInNewContext(outputText, { module, exports: module.exports, ...clock,
    require: (name) => { if (name in imports) return imports[name]; throw new Error(`Unexpected import: ${name}`); } });
  return module.exports;
}
const { DictationSession, DICTATION_OPTIONS, dictationError } = load('./src/services/dictationSession.ts');
const deferred = () => { let resolve; const promise = new Promise((done) => { resolve = done; }); return { resolve, promise }; };
function setup(overrides = {}) {
  const calls = [], text = [], listeners = new Map();
  const engine = {
    isRecognitionAvailable: () => true,
    requestPermissionsAsync: async () => { calls.push('permission'); return { granted: true }; },
    addListener: (name, callback) => {
      listeners.set(name, callback);
      return { remove: () => { if (listeners.get(name) === callback) listeners.delete(name); } };
    },
    start: (options) => { calls.push('start'); assert.equal(options.interimResults, true); assert.equal(options.recordingOptions.persist, false); },
    stop: () => calls.push('stop'), abort: () => calls.push('abort'),
    ...overrides,
  };
  const session = new DictationSession(engine, (value) => text.push(value), () => {});
  return { session, engine, text, calls, listeners,
    emit: (event, data) => listeners.get(event)?.(data),
    result: (transcript, isFinal = false) => listeners.get('result')?.({ isFinal, results: [{ transcript }] }),
  };
}
const basic = setup();
assert.deepEqual(basic.calls, [], 'mount must not request permission or start listening');
await Promise.all([basic.session.start('My existing question.'), basic.session.start('Duplicate')]);
assert.deepEqual(basic.calls, ['permission', 'start']);
basic.emit('start');
assert.equal(basic.session.state.phase, 'listening');
basic.result('I want'); basic.result('I want to read');
assert.equal(basic.text.at(-1), 'My existing question.\n\nI want to read', 'partials replace each other, not the original question');
basic.result('I want to read.', true);
basic.result('And'); basic.result('And walk.', true);
assert.equal(basic.text.at(-1), 'My existing question.\n\nI want to read. And walk.');
basic.session.stop();
assert.equal(basic.session.state.phase, 'stopping');
basic.result('Before lunch.', true);
basic.emit('end');
assert.equal(basic.session.state.phase, 'idle');
assert.equal(basic.text.at(-1), 'My existing question.\n\nI want to read. And walk. Before lunch.');
assert.equal(basic.listeners.size, 0);
assert.equal(timers.size, 0);

const cancelledPermission = deferred();
const early = setup({ requestPermissionsAsync: () => cancelledPermission.promise });
const pending = early.session.start('Keep me');
early.session.cancel();
cancelledPermission.resolve({ granted: true }); await pending;
assert.deepEqual(early.calls, []);
assert.equal(early.session.state.phase, 'idle');
const denied = setup({ requestPermissionsAsync: async () => ({ granted: false }) });
await denied.session.start('Keep me');
assert.match(denied.session.state.error, /phone settings/);
assert.deepEqual(denied.calls, []); assert.deepEqual(denied.text, []);
const unavailable = setup({ isRecognitionAvailable: () => false });
await unavailable.session.start(''); assert.deepEqual(unavailable.calls, []);
assert.match(unavailable.session.state.error, /not available/);

const cancel = setup();
await cancel.session.start(''); cancel.emit('start'); cancel.result('Keep these words');
const staleResult = cancel.listeners.get('result');
cancel.session.cancel(); cancel.result('Late words');
await cancel.session.start('Not yet');
assert.equal(cancel.calls.filter((value) => value === 'start').length, 1, 'do not restart before native end');
cancel.emit('end');
await cancel.session.start('Edited question'); cancel.emit('start');
staleResult({ results: [{ transcript: 'Old session callback' }], isFinal: true });
cancel.result('New words'); cancel.emit('end');
assert.equal(cancel.text.at(-1), 'Edited question\n\nNew words');
assert.ok(!cancel.text.some((value) => value.includes('Late words') || value.includes('Old session')));

const emptyFinal = setup();
await emptyFinal.session.start(''); emptyFinal.emit('start');
emptyFinal.result('Yes'); emptyFinal.result('', true); emptyFinal.result('please', true); emptyFinal.emit('end');
assert.equal(emptyFinal.text.at(-1), 'Yes please');

const interrupted = setup();
await interrupted.session.start(''); interrupted.emit('start'); interrupted.result('Still here');
interrupted.emit('error', { error: 'network', message: 'private native stack trace' });
interrupted.result('Must be ignored'); interrupted.emit('end');
assert.equal(interrupted.text.at(-1), 'Still here');
assert.match(interrupted.session.state.error, /connection/);
assert.doesNotMatch(interrupted.session.state.error, /private/);
for (const code of ['not-allowed', 'audio-capture', 'interrupted', 'no-speech', 'speech-timeout', 'network', 'busy', 'language-not-supported', 'unknown']) {
  assert.equal(typeof dictationError(code), 'string');
}

const disposedPermission = deferred();
const disposed = setup({ requestPermissionsAsync: () => disposedPermission.promise });
const disposing = disposed.session.start('Keep this'); disposed.session.dispose();
disposedPermission.resolve({ granted: true }); await disposing;
assert.deepEqual(disposed.calls, []); assert.deepEqual(disposed.text, []);
const recording = setup();
await recording.session.start(''); recording.emit('start'); recording.result('Keep this too'); recording.session.dispose();
assert.equal(recording.calls.at(-1), 'abort'); assert.equal(recording.listeners.size, 0);

const noStart = setup(); await noStart.session.start(''); tick(10_000);
assert.equal(noStart.calls.at(-1), 'abort'); noStart.emit('end');
const bounded = setup(); await bounded.session.start(''); bounded.emit('start'); tick(120_000);
assert.equal(bounded.calls.at(-1), 'stop'); bounded.result('Final words', true); bounded.emit('end');
const timeout = setup(); await timeout.session.start(''); timeout.emit('start'); timeout.result('Preview'); timeout.session.stop();
tick(5_000); assert.equal(timeout.calls.at(-1), 'abort');
tick(3_000); assert.equal(timeout.session.state.phase, 'idle');
assert.match(timeout.session.state.error, /Reopen Rheo/);
await timeout.session.start('No unsafe restart'); assert.equal(timeout.calls.filter((value) => value === 'start').length, 1);
assert.equal(timeout.text.at(-1), 'Preview');
const long = setup(); await long.session.start('x'.repeat(12_000)); assert.deepEqual(long.calls, []);
await long.session.start('Keep this'); long.emit('start'); long.result('x'.repeat(12_000));
assert.equal(long.calls.at(-1), 'stop'); assert.deepEqual(long.text, []); long.emit('end');
assert.equal(timers.size, 0, 'all native-session timers must be released');

let slots = [], cursor = 0, effects = [];
const react = {
  createElement: (type, props, ...children) => ({ type, props: { ...props, children } }),
  useState: (initial) => { const index = cursor++; if (!(index in slots)) slots[index] = typeof initial === 'function' ? initial() : initial;
    return [slots[index], (value) => { slots[index] = value; }]; },
  useRef: (value) => { const index = cursor++; if (!(index in slots)) slots[index] = { current: value }; return slots[index]; },
  useEffect: (effect) => { effects.push(effect); },
};
const native = { StyleSheet: { create: (value) => value }, Platform: { OS: 'ios' }, View: 'View', Text: 'Text', TextInput: 'TextInput',
  Pressable: 'Pressable', Keyboard: { dismiss: () => {} }, AppState: { addEventListener: (_event, callback) => { background = callback; return { remove() {} }; } } };
const theme = { colors: {}, radii: {}, spacing: {} };
const ui = setup(); let value = 'Original question', busy = false, background;
const { LiveVoiceInput } = load('./src/components/LiveVoiceInput.tsx', {
  react, 'react-native': native, 'expo-image': { Image: 'Image' }, '../theme': theme,
  '../services/dictationSession': { DictationSession }, '../../assets/voice-icons/mic.svg': {}, '../../assets/voice-icons/square.svg': {},
});
const render = () => { cursor = 0; effects = []; return LiveVoiceInput({ value, engine: ui.engine, onChangeText: (next) => { value = next; }, onBusyChange: (next) => { busy = next; } }); };
const nodes = (node) => !node || typeof node !== 'object' ? [] : [node, ...(node.props.children || []).flat(Infinity).flatMap(nodes)];
const input = (tree) => nodes(tree).find((node) => node.type === 'TextInput').props;
const mic = (tree) => nodes(tree).find((node) => node.props.accessibilityLabel?.endsWith('dictation')).props;
let tree = render(); const cleanup = effects.map((effect) => effect());
assert.deepEqual(ui.calls, []); assert.equal(input(tree).editable, true);
mic(tree).onPress(); await new Promise(setImmediate);
ui.emit('start'); tree = render(); effects[0]();
assert.equal(busy, true); assert.equal(input(tree).editable, false);
ui.result('Live words'); tree = render();
assert.equal(input(tree).value, 'Original question\n\nLive words', 'interim text must be visible before Stop');
mic(tree).onPress(); ui.result('Live words corrected.', true); ui.emit('end'); tree = render(); effects[0]();
assert.equal(busy, false); assert.equal(input(tree).editable, true);
assert.equal(value, 'Original question\n\nLive words corrected.');
mic(tree).onPress(); await new Promise(setImmediate); ui.emit('start');
background('background'); assert.equal(ui.calls.at(-1), 'abort'); ui.emit('end');
cleanup.forEach((fn) => fn?.());

const wrapperImports = { react, 'react-native': native, '../theme': theme,
  './LiveVoiceInput': { LiveVoiceInput: 'LiveVoiceInput' }, './RecordedVoiceInput': { RecordedVoiceInput: 'RecordedVoiceInput' } };
for (const available of [true, false]) {
  const { VoiceInput } = load('./src/components/VoiceInput.tsx', { ...wrapperImports, '../services/nativeSpeech': { nativeSpeech: available ? ui.engine : null } });
  const tree = VoiceInput({ value: '' });
  assert.ok(nodes(tree).some((node) => node.type === (available ? 'LiveVoiceInput' : 'RecordedVoiceInput')));
}
const config = JSON.parse(readFileSync(new URL('./app.json', import.meta.url)));
assert.ok(config.expo.plugins.some((plugin) => Array.isArray(plugin) && plugin[0] === 'expo-speech-recognition'));
assert.equal(DICTATION_OPTIONS.recordingOptions.persist, false);
assert.equal(timers.size, 0);
console.log('mobile live-dictation smoke PASS | tap-only start | live partial replacement | final segments | text preservation | no audio file | permissions | stop/cancel/late events | interruptions | time and text limits | editable review | no automatic Ask | Expo Go fallback');
