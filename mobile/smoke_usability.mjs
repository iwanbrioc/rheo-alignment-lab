import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

let slots = [], cursor = 0, effects = [], prompt = null;
const react = {
  createElement: (type, props, ...children) => ({ type, props: { ...props, children } }),
  useState: (value) => {
    const index = cursor++;
    if (!(index in slots)) slots[index] = typeof value === 'function' ? value() : value;
    return [slots[index], (next) => { slots[index] = typeof next === 'function' ? next(slots[index]) : next; }];
  },
  useRef: (value) => {
    const index = cursor++;
    if (!(index in slots)) slots[index] = { current: value };
    return slots[index];
  },
  useMemo: (callback) => callback(), useCallback: (callback) => callback,
  useEffect: (callback) => { effects.push(callback); },
};
const native = { StyleSheet: { create: (value) => value }, ScrollView: 'ScrollView', View: 'View', Text: 'Text',
  Pressable: 'Pressable', Alert: { alert: (title, message, buttons, options) => { prompt = { title, message, buttons, options }; } } };
const actions = ['smallest_release', 'learning_action', 'generative_action'].map((kind, index) => ({
  id: `option-${index}`, kind, title: 'Read for ten minutes', action: 'Read for ten minutes. Keep your phone available for emergencies.',
  whyThisAction: 'A short start may help.', falsifierOrChangeSignal: 'Stop if someone needs you.',
}));
const recommendation = { id: 'recommendation-test', actions, actionMeta: { provider: 'openai' } };
const original = JSON.stringify(recommendation);
let failRead = false, failWrite = true, deletes = 0, writes = 0, asks = 0, searches = 0, counter = 0, disk = [];
let locate = async () => ({ areaLabel: 'Test area' });
let ask = async () => recommendation;
let search = async () => ({ areaLabel: 'Test area', candidates: [], warnings: [] });
const storage = {
  listDecisionSessions: async () => { if (failRead) throw new Error('Read failed'); return disk; },
  upsertDecisionSession: async (session) => {
    writes++;
    if (failWrite) throw new Error('Write failed');
    disk = [JSON.parse(JSON.stringify(session)), ...disk.filter((item) => item.id !== session.id)];
  },
  deleteDecisionSession: async (id) => { deletes++; disk = disk.filter((item) => item.id !== id); },
};
function load(file, overrides = {}) {
  const module = { exports: {} };
  const { outputText } = ts.transpileModule(readFileSync(new URL(file, import.meta.url), 'utf8'), { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React, esModuleInterop: true,
  } });
  vm.runInNewContext(outputText, { module, exports: module.exports, Error, AbortController,
    require: (name) => {
      if (name in overrides) return overrides[name];
      if (name === 'react') return react;
      if (name === 'react-native') return native;
      if (name === 'react-native-safe-area-context') return { SafeAreaProvider: 'SafeAreaProvider', SafeAreaView: 'SafeAreaView' };
      if (name === 'expo-status-bar') return { StatusBar: 'StatusBar' };
      if (name.endsWith('/storage/decisionSessions')) return storage;
      if (name.endsWith('/services/decisionSave')) return load('./src/services/decisionSave.ts');
      if (name.endsWith('/utils/confirm')) return load('./src/utils/confirm.ts');
      if (name.endsWith('/services/rheoApi')) return { askRheo: async (...args) => { asks++; return ask(...args); } };
      if (name.endsWith('/services/localContextApi')) return { fetchLocalContext: async (...args) => { searches++; return search(...args); } };
      if (name.endsWith('/location')) return { getDecisionLocation: (...args) => locate(...args) };
      if (name.endsWith('/utils/decisionSession')) return { createLocalId: () => `test-${++counter}`, sanitizeDecisionSessionForStorage: (value) => value,
        getChosenAction: () => actions[0], describeChoice: () => 'Read for ten minutes', getActionLabel: (kind) => kind };
      if (name.endsWith('/utils/preparation')) return { latestPreparation: () => null, chosenPreparationStep: () => 'Read', preparationTasks: () => [] };
      if (name.endsWith('/utils/format')) return { formatDateTime: () => 'Test date', compactText: (value) => value };
      if (name.endsWith('/theme')) return { colors: {}, spacing: {}, radii: {} };
      const component = name.split('/').at(-1);
      return { [component]: component };
    },
  });
  return module.exports;
}
function nodes(node) {
  if (!node || typeof node !== 'object') return [];
  return [node, ...(node.props?.children || []).flat(Infinity).flatMap(nodes)];
}
const find = (tree, type) => nodes(tree).find((node) => node.type === type)?.props;
const label = (tree, value) => nodes(tree).find((node) => node.props.label === value)?.props;
const text = (tree) => nodes(tree).flatMap((node) => node.props.children || []).filter((value) => typeof value === 'string').join(' ');
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));
function component(file, name, props) {
  const previous = { slots, cursor, effects };
  slots = []; cursor = 0; effects = [];
  const result = load(file)[name](props);
  ({ slots, cursor, effects } = previous);
  return result;
}
const App = load('./App.tsx').default;
const render = () => { cursor = 0; effects = []; return App(); };
const screen = (type) => find(render(), type);

screen('AskScreen').onSituationChange('Synthetic usability question');
await screen('AskScreen').onAskRheo();
assert.equal(screen('SaveNotice').state.status, 'failed');
await screen('AdviceScreen').onChooseRecommended('option-0');
const failed = screen('ConfirmationScreen');
assert.equal(failed.saveStatus, 'failed');
const confirmation = component('./src/screens/ConfirmationScreen.tsx', 'ConfirmationScreen', failed);
assert.match(text(confirmation), /Not saved yet/);
assert.doesNotMatch(text(confirmation), /Your choice is saved/);
assert.equal(label(confirmation, 'Prepare this step').disabled, true);
const pending = JSON.stringify(screen('SaveNotice').state.pending);
failWrite = false;
screen('SaveNotice').onRetry(); await settle();
assert.equal(asks, 1, 'retry must not ask the AI again');
assert.equal(JSON.stringify(disk[0]), pending, 'retry must save the exact failed snapshot and choice');
assert.equal(screen('ConfirmationScreen').saveStatus, 'saved');
assert.equal(JSON.stringify(recommendation), original);

failWrite = true;
screen('ConfirmationScreen').onBackToRecommendation();
await screen('AdviceScreen').onChooseNotYet();
screen('ConfirmationScreen').onStartAnother();
assert.match(prompt.title, /without saving/);
prompt.buttons[0].onPress(); await settle();
assert.ok(screen('ConfirmationScreen'), 'keeping an unsaved decision must not discard it');
screen('SaveNotice').onRetry(); await settle();
assert.equal(screen('SaveNotice').state.status, 'failed');
failWrite = false;
screen('SaveNotice').onRetry(); await settle();
let deletion = screen('ConfirmationScreen').onDelete();
assert.equal(deletes, 0);
assert.match(prompt.message, /drafts/);
prompt.buttons[0].onPress(); await deletion;
assert.equal(deletes, 0, 'Keep it must leave storage untouched');
deletion = screen('ConfirmationScreen').onDelete();
failRead = true;
prompt.buttons[1].onPress(); await deletion;
assert.equal(deletes, 1);
assert.equal(disk.length, 0);
assert.equal(screen('AskScreen').message, 'Saved decision deleted.', 'a history read failure must not misreport a successful deletion');
assert.match(screen('AskScreen').storageMessage, /could not be loaded/);
assert.equal(screen('AskScreen').recentCount, 0);

slots = []; failRead = true;
render();
for (const effect of effects) effect();
await settle();
const askProps = screen('AskScreen');
assert.ok(askProps.storageMessage);
const question = component('./src/screens/AskScreen.tsx', 'AskScreen', askProps);
assert.ok(label(question, 'Recent'), 'history must be reachable even when reading it failed');
askProps.onOpenRecent(); await settle();
assert.ok(screen('RecentDecisionsScreen').storageMessage);
failRead = false;
screen('RecentDecisionsScreen').onRetry(); await settle();
assert.equal(screen('RecentDecisionsScreen').storageMessage, null);
screen('RecentDecisionsScreen').onBack();

screen('AskScreen').onSituationChange('Public local-search test question');
let finishLocation;
locate = () => new Promise((resolve) => { finishLocation = resolve; });
const locationRun = screen('AskScreen').onLookAround();
assert.equal(screen('AskScreen').busy, 'location');
screen('AskScreen').onCancelLocal();
assert.equal(screen('AskScreen').busy, null);
let finishAsk;
ask = () => new Promise((resolve) => { finishAsk = resolve; });
const answerRun = screen('AskScreen').onAskRheo();
finishLocation({ areaLabel: 'Late area' }); await locationRun;
assert.equal(searches, 0, 'a stopped GPS lookup must not start a network search');
assert.equal(screen('AskScreen').busy, 'rheo', 'late GPS completion must not unlock another request');
assert.equal(screen('AskScreen').areaLabel, null);
finishAsk(recommendation); await answerRun;

screen('AdviceScreen').onBackToAsk(); await settle();
locate = async () => ({ areaLabel: 'Test area' });
let finishSearch;
search = () => new Promise((resolve) => { finishSearch = resolve; });
const localRun = screen('AskScreen').onLookAround(); await settle();
assert.equal(screen('AskScreen').busy, 'local');
screen('AskScreen').onCancelLocal();
finishSearch({ areaLabel: 'Late result', candidates: [], warnings: [] }); await localRun;
assert.equal(screen('AskScreen').localContext, null);
assert.equal(screen('AskScreen').areaLabel, null);

const cardProps = { action: actions[0], index: 0, onChoose: () => {} };
const collapsed = component('./src/components/ActionCard.tsx', 'ActionCard', cardProps);
assert.ok(label(collapsed, 'Read this option'));
assert.equal(nodes(collapsed).some((node) => node.props.accessibilityLabel?.startsWith('Choose ')), false,
  'a compact preview must not allow choosing before the complete action and warnings are opened');
const expanded = component('./src/components/ActionCard.tsx', 'ActionCard', { ...cardProps, expanded: true });
assert.ok(text(expanded).includes(actions[0].action));
assert.ok(text(expanded).includes(actions[0].falsifierOrChangeSignal));
assert.ok(nodes(expanded).some((node) => node.props.accessibilityLabel?.startsWith('Choose ')));
const overview = component('./src/screens/AdviceScreen.tsx', 'AdviceScreen', { recommendation, choice: null });
assert.equal(nodes(overview).filter((node) => node.type === 'ActionCard').length, 3);
assert.ok(label(overview, 'Something else')); assert.ok(label(overview, 'Not yet'));
const withPlaces = component('./src/screens/AskScreen.tsx', 'AskScreen', { situation: 'Public question',
  localContext: { candidates: [], warnings: ['Check opening hours.'] }, busy: null, canAsk: true });
const ordered = nodes(withPlaces);
assert.ok(ordered.indexOf(ordered.find((node) => node.props.label === 'Ask Rheo')) < ordered.indexOf(ordered.find((node) => node.props.label === 'Look around me')));
assert.ok(text(withPlaces).includes('Check opening hours.'), 'local warnings must remain visible when results are collapsed');
assert.equal(find(render(), 'StatusBar').style, 'dark');

const { DecisionSave } = load('./src/services/decisionSave.ts');
let finishWrite, writeCount = 0;
const saver = new DecisionSave(() => { writeCount++; return new Promise((resolve) => { finishWrite = resolve; }); }, () => {});
const first = saver.save({ id: 'test' });
assert.equal(await saver.save({ id: 'other' }), false);
assert.equal(saver.reset(), false);
assert.equal(writeCount, 1);
finishWrite(); assert.equal(await first, true);
assert.equal(saver.state.pending, null);
console.log('mobile usability smoke PASS | truthful save/retry | exact snapshots | write locking | delete confirmation | unsaved protection | visible history retry | local cancellation and late results | compact options with full warnings | primary action order | dark status bar');
