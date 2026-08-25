#!/usr/bin/env node
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const PORT = Number(process.env.RHEO_SMOKE_PORT || 8099);
const BASE = `http://127.0.0.1:${PORT}`;
const PROVIDER = process.env.RHEO_MODEL_PROVIDER || 'fixture';

const devCase = {
  schemaVersion: '0.2',
  guideVersion: '0.9-dev-smoke',
  caseId: 'DEV-001',
  context: {
    situation: 'A public library has been told to identify an 8% visible budget saving within three weeks. Management is considering closing two evening sessions. Evening cover has also generated recurring overtime and difficult shift swaps. It is not known whether the council would count a rota-based staffing saving as sufficiently visible. Several community groups rely on the evening sessions.',
    whatMatters: 'Meet the budget requirement without unnecessary loss of access or hidden transfer of burden to staff.',
    stakeholders: 'Library staff, evening users, community groups, library management, council budget lead.',
    uncertainties: 'What counts as a visible saving; true cause and concentration of overtime; whether alternative rota arrangements are workable.',
    decisionHorizon: 'Three weeks.',
    recoveryHorizon: 'Staffing and community access consequences may persist beyond the budget submission.',
    urgency: 'High'
  },
  evidence: [
    { id: 'e1', text: 'The council has requested an 8% visible saving within three weeks.', provenance: 'user_reported_observation', about: 'system', confidence: 'medium' },
    { id: 'e2', text: 'Management is considering closing two evening sessions.', provenance: 'user_reported_observation', about: 'system', confidence: 'medium' },
    { id: 'e3', text: 'Evening cover has involved recurring overtime and difficult swaps.', provenance: 'user_reported_observation', about: 'staff', confidence: 'medium' },
    { id: 'e4', text: 'It is unknown whether a rota-based saving would satisfy the council requirement.', provenance: 'unknown', about: 'system', confidence: 'low' }
  ]
};

function fail(message) { throw new Error(message); }
function assert(condition, message) { if (!condition) fail(message); }

async function post(pathname, body) {
  const r = await fetch(`${BASE}${pathname}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  const text = await r.text();
  let parsed;
  try { parsed = JSON.parse(text); } catch { parsed = { raw: text }; }
  if (!r.ok) fail(`${pathname} returned ${r.status}: ${parsed?.error || text}${parsed?.details ? ` | ${JSON.stringify(parsed.details)}` : ''}`);
  return parsed;
}

async function waitForServer(child, timeoutMs = 12000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (child.exitCode !== null) fail(`server exited before health check, code=${child.exitCode}`);
    try {
      const r = await fetch(`${BASE}/api/health`);
      if (r.ok) return r.json();
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  fail(`server did not become healthy within ${timeoutMs}ms`);
}

function checkNoDeadLabelLanguage(actionSet) {
  const banned = [
    /relocate\s+(?:the\s+diagnosis\s+)?toward/i,
    /relocate\s+(?:the\s+diagnosis\s+)?towards/i,
    /the\s+problem\s+is\s+(?:resources|values|affordance|support|capacity|well-?being)/i,
    /(?:resources|values|affordance|support|capacity|well-?being)\s+(?:is|are)\s+(?:the\s+)?(?:primary\s+)?(?:problem|contraction)/i
  ];
  for (const a of actionSet.actions || []) {
    const practical = [a.action, a.whyThisAction, a.prediction?.whatShouldBecomeMorePossible, a.falsifierOrChangeSignal].filter(Boolean).join(' ');
    for (const re of banned) if (re.test(practical)) fail(`dead-label language detected in ${a.id}: ${re}`);
  }
}

const child = spawn(process.execPath, ['server_v0_9.mjs'], {
  cwd: ROOT,
  env: { ...process.env, PORT: String(PORT), RHEO_MODEL_PROVIDER: PROVIDER },
  stdio: ['ignore', 'pipe', 'pipe']
});
child.stdout.on('data', d => process.stdout.write(`[server] ${d}`));
child.stderr.on('data', d => process.stderr.write(`[server] ${d}`));

try {
  const health = await waitForServer(child);
  assert(health.version === '0.9.0', 'health endpoint is not v0.9.0');
  assert(health.canonicalOperationalGrammar === true, 'canonical operational grammar flag missing');

  const flowResp = await post('/api/rheo-flow', { caseRecord: devCase });
  const flow = flowResp.flow;
  assert(flow.schemaVersion === '0.9', 'flow schemaVersion mismatch');
  assert(flow.caseId === 'DEV-001', 'flow changed case id');
  assert(Array.isArray(flow.workingReciprocalMap), 'workingReciprocalMap missing');
  assert(flow.primaryWorkingHypothesis && typeof flow.primaryWorkingHypothesis.supported === 'boolean', 'primaryWorkingHypothesis missing');

  const testimony = [{ role: 'participant', text: `${devCase.context.situation}\n\nDecision: identify the first practical move before the three-week budget deadline.` }];
  const actionResp = await post('/api/rheo-actions', { caseId: devCase.caseId, flow, testimony });
  const actions = actionResp.actionSet;
  assert(actions.schemaVersion === '0.9', 'action schemaVersion mismatch');
  assert(Array.isArray(actions.actions) && actions.actions.length === 3, 'expected exactly three actions');
  assert(new Set(actions.actions.map(a => a.kind)).size === 3, 'action kinds are not distinct');
  for (const a of actions.actions) {
    assert(typeof a.action === 'string' && a.action.trim(), `${a.id} lacks concrete action`);
    assert(typeof a.observedRelationship === 'string' && a.observedRelationship.trim(), `${a.id} lacks observedRelationship`);
    assert(typeof a.discriminatingQuestion === 'string' && a.discriminatingQuestion.trim(), `${a.id} lacks discriminatingQuestion`);
    assert(typeof a.falsifierOrChangeSignal === 'string' && a.falsifierOrChangeSignal.trim(), `${a.id} lacks falsifier/change signal`);
  }
  checkNoDeadLabelLanguage(actions);

  console.log('\nv0.9 smoke PASS');
  console.log(`provider=${flowResp.provider} model=${flowResp.model} researchUsable=${Boolean(flowResp.researchUsable && actionResp.researchUsable)}`);
  console.log(`working horizons=${flow.workingReciprocalMap.length}`);
  console.log(`primary supported=${flow.primaryWorkingHypothesis.supported}`);
  if (flow.primaryWorkingHypothesis.supported) {
    console.log(`primary triplet=${flow.primaryWorkingHypothesis.triplet}`);
    console.log(`discriminating question=${flow.primaryWorkingHypothesis.discriminatingQuestion}`);
    console.log(`smallest release=${flow.primaryWorkingHypothesis.smallestRelease}`);
  }
  console.log('\nActions:');
  for (const a of actions.actions) console.log(`- ${a.kind}: ${a.action}`);
  if (PROVIDER === 'fixture') console.log('\nFixture mode validates plumbing/schema only. Re-run with RHEO_MODEL_PROVIDER=openai for the behavioural development probe.');
  else console.log('\nDevelopment probe only. DEV-001 must not be used as confirmatory v0.9 benchmark evidence.');
} finally {
  child.kill('SIGTERM');
  await new Promise(resolve => {
    const timer = setTimeout(resolve, 3000);
    child.once('exit', () => { clearTimeout(timer); resolve(); });
  });
}
