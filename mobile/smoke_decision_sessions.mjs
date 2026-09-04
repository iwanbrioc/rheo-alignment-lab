#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { existsSync, rmSync } from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const buildDir = path.join(HERE, '.smoke-build');

rmSync(buildDir, { force: true, recursive: true });
execFileSync(
  process.platform === 'win32' ? 'npx.cmd' : 'npx',
  [
    'tsc',
    '--ignoreConfig',
    '--module', 'Node16',
    '--target', 'es2022',
    '--moduleResolution', 'node16',
    '--esModuleInterop',
    '--skipLibCheck',
    '--outDir', buildDir,
    'src/utils/decisionSession.ts',
    'src/types/decision.ts',
    'src/types/localContext.ts',
  ],
  { cwd: HERE, stdio: 'pipe' },
);

const require = createRequire(import.meta.url);
const helperPath = [
  path.join(buildDir, 'utils', 'decisionSession.js'),
  path.join(buildDir, 'src', 'utils', 'decisionSession.js'),
].find((candidate) => existsSync(candidate));

if (!helperPath) throw new Error('compiled decisionSession helper was not found');

const {
  containsCoordinateFields,
  serializeDecisionSessions,
  toLocalContextSnapshot,
  withRecordedChoice,
  withSituationChanged,
} = require(helperPath);

function fail(message) {
  throw new Error(message);
}

const localContext = toLocalContextSnapshot({
  provider: 'fixture',
  attribution: null,
  retrievedAt: '2026-09-04T22:10:00.000Z',
  areaLabel: 'Prototype area',
  searchQueries: ['appliance repair'],
  candidates: [{
    id: 'place-1',
    name: 'Repair listing',
    category: 'repair',
    distanceM: 320,
    address: 'Example street',
    latitude: 51.745,
    longitude: -2.217,
    source: 'test fixture',
    sourceUrl: 'https://example.test/place-1',
    whyRelevant: 'Only used to verify coordinate stripping.',
  }],
  warnings: [],
});

if (containsCoordinateFields(localContext)) fail('local-context snapshot retained coordinate fields');

const recommendation = {
  id: 'recommendation-1',
  caseId: 'case-1',
  createdAt: '2026-09-04T22:11:00.000Z',
  flow: { proposition: 'snapshot should remain unchanged' },
  flowMeta: { provider: 'fixture', model: 'fixture-v0.9', responseId: null, researchUsable: false },
  actionMeta: { provider: 'fixture', model: 'fixture-v0.9-actions', responseId: null, researchUsable: false },
  actions: [
    {
      id: 'a1',
      kind: 'smallest_release',
      title: 'Small step',
      action: 'Call one repair service.',
      whyThisAction: 'It tests a live option quickly.',
      falsifierOrChangeSignal: 'No appointment is available.',
    },
    {
      id: 'a2',
      kind: 'learning_action',
      title: 'Find out',
      action: 'Ask what the likely fault means.',
      whyThisAction: 'It reduces uncertainty.',
      falsifierOrChangeSignal: 'The diagnosis is already clear.',
    },
    {
      id: 'a3',
      kind: 'generative_action',
      title: 'Open a path',
      action: 'Check whether borrowing a machine buys time.',
      whyThisAction: 'It keeps options live.',
      falsifierOrChangeSignal: 'No borrowing option is available.',
    },
  ],
};

const session = {
  id: 'decision-1',
  createdAt: '2026-09-04T22:12:00.000Z',
  updatedAt: '2026-09-04T22:12:00.000Z',
  situation: 'My washing machine has broken and I need a reliable solution this week.',
  locationUsed: true,
  areaLabel: 'Prototype area',
  localContext,
  recommendation,
  choice: null,
  researchArm: null,
  accidentalRawLocation: { latitude: 51.745, longitude: -2.217 },
};

const serialized = serializeDecisionSessions([session]);
const parsed = JSON.parse(serialized);
if (containsCoordinateFields(parsed)) fail('serialized session retained raw latitude/longitude fields');

const beforeRecommendation = JSON.stringify(session.recommendation);
const withChoice = withRecordedChoice(session, {
  kind: 'recommended',
  actionId: 'a1',
  capturedAt: '2026-09-04T22:13:00.000Z',
}, '2026-09-04T22:13:00.000Z');

if (JSON.stringify(withChoice.recommendation) !== beforeRecommendation) {
  fail('recording a choice mutated the recommendation snapshot');
}
if (session.choice !== null) fail('recording a choice mutated the original session');

const staleReset = withSituationChanged(
  withChoice,
  'I now need to solve a different practical decision.',
  '2026-09-04T22:14:00.000Z',
);

if (staleReset.recommendation !== null) fail('stale recommendation was not cleared');
if (staleReset.choice !== null) fail('stale choice was not cleared');
if (staleReset.localContext !== null) fail('stale local context was not cleared');
if (staleReset.researchArm !== null) fail('ordinary alpha session assigned a research arm');

rmSync(buildDir, { force: true, recursive: true });
console.log('mobile decision-session smoke PASS | no coordinate fields persisted | snapshot immutable | stale state cleared');
