#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

// Check component wiring without a native runtime; device checks cover keyboard layout.
const events = [];
const react = {
  createElement: (type, props, ...children) => ({ type, props: { ...props, children } }),
  useCallback: (callback) => callback,
  useEffect: () => {},
  useMemo: (callback) => callback(),
  useRef: (value) => ({ current: value }),
  useState: (initial) => [typeof initial === 'function' ? initial() : initial, () => {}],
};
const native = {
  Keyboard: { dismiss: () => events.push('dismiss') },
  StyleSheet: { create: (styles) => styles },
  ScrollView: 'ScrollView',
  View: 'View',
  Text: 'Text',
  TextInput: 'TextInput',
  Pressable: 'Pressable',
};

function loadComponent(file) {
  const source = readFileSync(new URL(file, import.meta.url), 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.React,
      esModuleInterop: true,
    },
  });
  const module = { exports: {} };
  vm.runInNewContext(outputText, {
    module,
    exports: module.exports,
    require: (name) => {
      if (name === 'react') return react;
      if (name === 'react-native') return native;
      if (name === 'react-native-safe-area-context') return { SafeAreaProvider: 'SafeAreaProvider', SafeAreaView: 'SafeAreaView', initialWindowMetrics: null };
      if (name === 'expo-audio') return {
        RecordingPresets: { HIGH_QUALITY: {} },
        useAudioRecorder: () => ({}),
        useAudioRecorderState: () => ({ durationMillis: 0 }),
      };
      if (name === 'expo-file-system' || name === 'expo-image' || name.endsWith('.svg')) return {};
      if (name.endsWith('/services/voiceSession')) return { VoiceSession: class {} };
      if (name.endsWith('/services/decisionSave')) return loadComponent('./src/services/decisionSave.ts');
      if (name.endsWith('/theme')) return { colors: {}, radii: {}, spacing: {} };
      if (name.endsWith('/utils/decisionSession')) return { createLocalId: () => 'test-decision' };
      if (name.endsWith('/components/AppButton')) return { AppButton: 'AppButton' };
      if (name.startsWith('.') || name === 'expo-status-bar') return {};
      throw new Error(`Unexpected import: ${name}`);
    },
  });
  return module.exports;
}

function findNode(node, type, matches = () => true) {
  if (!node || typeof node !== 'object') return null;
  if (node.type === type && matches(node.props)) return node;
  for (const child of (node.props?.children || []).flat(Infinity)) {
    const found = findNode(child, type, matches);
    if (found) return found;
  }
  return null;
}

const { default: App } = loadComponent('./App.tsx');
const scroll = findNode(App(), 'ScrollView');
assert.ok(findNode(App(), 'SafeAreaView'), 'all screens must stay inside device safe areas');
assert.ok(scroll);
assert.equal(scroll.props.automaticallyAdjustKeyboardInsets, true);
assert.equal(scroll.props.keyboardDismissMode, 'on-drag');
assert.equal(scroll.props.keyboardShouldPersistTaps, 'handled', 'buttons must respond on the first tap');
assert.equal(scroll.props.contentInsetAdjustmentBehavior, 'never', 'safe area padding must not be applied twice');

const { AskScreen } = loadComponent('./src/screens/AskScreen.tsx');
const asking = AskScreen({ situation: 'Public test question', busy: 'rheo', canAsk: false,
  onCancelRheo: () => events.push('stop'), onAskRheo: () => events.push('ask') });
const stop = findNode(asking, 'AppButton', (props) => props.label === 'Stop');
assert.ok(stop);
assert.equal(stop.props.disabled, false, 'Stop must remain available while other controls are disabled');
events.length = 0;
stop.props.onPress();
assert.deepEqual(events, ['stop'], 'Stop must cancel rather than ask again');
const saving = AskScreen({ situation: 'Public test question', busy: 'storage', canAsk: false });
assert.equal(findNode(saving, 'AppButton', (props) => props.label === 'Saving...').props.disabled, true,
  'saving a completed answer must not offer cancellation of an already finished request');

const { VoiceInput } = loadComponent('./src/components/VoiceInput.tsx');
const { AdviceScreen } = loadComponent('./src/screens/AdviceScreen.tsx');
const inputs = [
  findNode(VoiceInput({ value: 'I need help finding work.', onBusyChange: () => {} }), 'TextInput'),
  findNode(AdviceScreen({ recommendation: { actions: [] }, customChoiceVisible: true, customChoiceText: '' }), 'TextInput'),
];
for (const input of inputs) {
  assert.ok(input);
  assert.equal(input.props.multiline, true);
  assert.equal(input.props.returnKeyType, 'done');
  assert.equal(input.props.submitBehavior, 'blurAndSubmit');
  events.length = 0;
  input.props.onSubmitEditing();
  assert.deepEqual(events, ['dismiss'], 'Done must dismiss without requesting advice or saving');
}

const { AppButton } = loadComponent('./src/components/AppButton.tsx');
events.length = 0;
const button = AppButton({ label: 'Ask Rheo', onPress: () => events.push('ask') });
button.props.onPress();
assert.deepEqual(events, ['dismiss', 'ask'], 'one tap must dismiss and perform the action');
const disabled = AppButton({ label: 'Ask Rheo', onPress: () => {}, disabled: true });
assert.equal(disabled.props.disabled, true);
assert.equal(disabled.props.accessibilityState.disabled, true);

console.log('mobile keyboard smoke PASS | keyboard insets | drag dismissal | Done on both inputs | single-tap actions | disabled state');
