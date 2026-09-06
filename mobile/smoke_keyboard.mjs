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
      if (name.endsWith('/theme')) return { colors: {}, radii: {}, spacing: {} };
      if (name.endsWith('/utils/decisionSession')) return { createLocalId: () => 'test-decision' };
      if (name.startsWith('.') || name === 'expo-status-bar') return {};
      throw new Error(`Unexpected import: ${name}`);
    },
  });
  return module.exports;
}

function findNode(node, type) {
  if (!node || typeof node !== 'object') return null;
  if (node.type === type) return node;
  for (const child of (node.props?.children || []).flat(Infinity)) {
    const found = findNode(child, type);
    if (found) return found;
  }
  return null;
}

const { default: App } = loadComponent('./App.tsx');
const scroll = findNode(App(), 'ScrollView');
assert.ok(scroll);
assert.equal(scroll.props.automaticallyAdjustKeyboardInsets, true);
assert.equal(scroll.props.keyboardDismissMode, 'on-drag');
assert.equal(scroll.props.keyboardShouldPersistTaps, 'handled', 'buttons must respond on the first tap');

const { AskScreen } = loadComponent('./src/screens/AskScreen.tsx');
const { AdviceScreen } = loadComponent('./src/screens/AdviceScreen.tsx');
const inputs = [
  findNode(AskScreen({ situation: 'I need help finding work.', busy: null, recentCount: 0 }), 'TextInput'),
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
