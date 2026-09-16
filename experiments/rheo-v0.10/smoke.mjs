import assert from 'node:assert/strict';
import { decide, schemaForRequest } from './engine.mjs';
import { fixtureDecision } from './fixture.mjs';
import { validateDecision, validateRequest, deriveActionRelationships } from './validation.mjs';
import { createExperimentalServer } from './server.mjs';
import { triplets } from './schema.mjs';
import { cases } from './cases.mjs';

const request = { caseId: 'synthetic-contract', situation: 'Synthetic contract test, not a real predicament.', localContext: null, review: null };
const fixture = fixtureDecision(request);
const reject = (change, message) => { const result = structuredClone(fixture); change(result); assert.throws(() => validateDecision(result, request), message); };
assert.equal(validateDecision(fixture, request), fixture);
const scoped = schemaForRequest(request).properties.flow.properties;
assert.deepEqual(scoped.observations.items.anyOf[0].properties.sourceRefs.items.enum, ['situation']);
assert.equal(scoped.hypotheses.items.properties.evidenceRefs.items.enum, undefined, 'Constraining source IDs must not constrain evidence IDs to source IDs');
assert.equal(scoped.modelUpdate.properties.observationRefs.items.enum, undefined);
for (const c of cases) {
  const output = await decide({ ...request, caseId: c.id, situation: c.situation }, { provider: 'fixture' });
  assert.equal(output.provider, 'fixture'); assert.equal(output.researchUsable, false);
  assert.match(output.flow.summary, /Fixture/);
  assert.ok(output.actionSet.actions.every((a) => /no advice/.test(a.action)));
}
reject((r) => { r.flow.caseId = 'other'; }, /identity/);
reject((r) => { r.flow.hypotheses[0].evidenceRefs = ['invented']; }, /reference/);
reject((r) => { r.flow.hypotheses.push(structuredClone(r.flow.hypotheses[0])); }, /Duplicate/);
reject((r) => { r.flow.observations[0].sourceRefs = ['unseen']; }, /source/);
reject((r) => { r.flow.observations[0].provenance = 'verified_external'; }, /Invalid experimental/);
reject((r) => { r.flow.observations[0].provenance = 'ai_inference'; r.flow.observations[0].confidence.level = 'high'; }, /inference/);
reject((r) => { r.flow.hypotheses[0].confidence.level = 'high'; }, /converging/);
reject((r) => { r.flow.primaryHypothesisId = 'missing'; }, /Missing primary/);
reject((r) => { r.flow.primaryHypothesisId = 'h1'; }, /handoff/);
reject((r) => { r.actionSet.actions[0].accessCheck.usableNow = false; }, /Invalid experimental/);
reject((r) => { r.actionSet.actions[0].independentNow = false; }, /Invalid experimental/);
reject((r) => { r.actionSet.actions[0].kind = 'learning_action'; }, /distinct/);
reject((r) => { r.actionSet.actions[1].action = r.actionSet.actions[0].action; }, /repeat/);
reject((r) => { r.actionSet.actions[0].hypothesisIds = ['missing']; }, /reference/);
reject((r) => { r.flow.modelUpdate.status = 'increase'; }, /invented outcome/);
reject((r) => { r.flow.score = 1; }, /Invalid experimental/);
reject((r) => { r.flow.hypotheses[0].triplet = 'Marmot'; }, /Invalid experimental/);
reject((r) => { r.flow.hypotheses.push({ ...structuredClone(r.flow.hypotheses[0]), id: 'h2' }); }, /discriminate/);
reject((r) => { r.actionSet.actions[0].agency.relationship = 'same_horizon'; }, /mislabelled/);
const separated = structuredClone(fixture);
separated.flow.hypotheses[0].triplet = triplets[3];
separated.flow.primaryHypothesisId = separated.flow.generatingRestriction.hypothesisId = separated.actionSet.primaryHypothesisId = 'h1';
separated.flow.availableAgency.triplet = triplets[5];
assert.equal(validateDecision(separated, request), separated, 'Cause and available agency may differ');
separated.actionSet.actions[0].horizonTriplet = triplets[5];
deriveActionRelationships(separated);
assert.equal(separated.actionSet.actions[0].agency.relationship, 'different_horizon');
assert.equal(validateDecision(separated, request), separated);
const areaRequest = { ...request, localContext: JSON.stringify({ areaEvidence: [{ scope: 'area_context', observation: 'Synthetic bus coverage' }] }) };
const area = structuredClone(fixture);
area.flow.observations[0].sourceRefs = ['localContext'];
assert.throws(() => validateDecision(area, areaRequest), /Area context/);
area.flow.observations[0].scope = 'area_context'; area.flow.observations[0].provenance = 'external_context';
assert.equal(validateDecision(area, areaRequest), area);
area.flow.hypotheses[0].confidence.level = 'medium';
assert.throws(() => validateDecision(area, areaRequest), /reported observations/);
assert.throws(() => validateRequest({ ...request, localContext: '{' }), /Invalid area/);
assert.throws(() => validateRequest({ ...request, localContext: '{"nested":{"latitude":1}}' }), /Coordinates/);
assert.throws(() => validateRequest({ ...request, extra: 'secret' }), /Invalid decision/);
const review = { previousRecommendationId: 'previous', previousHypotheses: [{ id: 'h1', statement: 'A possible rule barrier.', predictedObservation: 'A rule is confirmed.', confidence: { level: 'low', basis: 'Untested.' } }],
  chosenAction: 'Ask about the rule.', expectedObservation: 'A rule is confirmed.', actualAction: 'Asked.', happened: 'No rule exists.', becamePossible: '', unchanged: '', burden: '', mismatchOrNewExplanation: '' };
const reviewed = { ...request, review };
const update = fixtureDecision(reviewed);
assert.equal(validateDecision(update, reviewed), update);
update.flow.modelUpdate.observationRefs = ['o1'];
assert.throws(() => validateDecision(update, reviewed), /new outcome evidence/);

let sent;
const response = await decide(request, { provider: 'openai', apiKey: 'synthetic-key', fetchImpl: async (_url, options) => {
  sent = JSON.parse(options.body);
  return Response.json({ status: 'completed', id: 'test-response', output: [{ content: [{ type: 'output_text', text: JSON.stringify(fixture) }] }] });
} });
assert.equal(response.researchUsable, false); assert.equal(sent.store, false); assert.equal(sent.tools, undefined);
assert.equal(sent.text.format.strict, true);
await assert.rejects(decide(request, { provider: 'openai', apiKey: 'synthetic-key', fetchImpl: async () => Response.json({ status: 'incomplete' }) }), /incomplete/);
await assert.rejects(decide(request, { provider: 'invalid' }), /not configured/);

const server = createExperimentalServer({ timeoutMs: 50, run: async (data, options) => {
  if (data.caseId === 'redaction') throw new Error('sensitive test detail');
  if (data.caseId === 'timeout') return new Promise((_resolve, reject) => options.signal.addEventListener('abort', () => reject(new Error('stopped')), { once: true }));
  return decide(data, { provider: 'fixture' });
} });
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}`;
const post = (body, headers = {}) => fetch(`${base}/api/v0.10/decision`, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body) });
try {
  assert.equal((await fetch(`${base}/api/health`)).status, 200);
  assert.equal((await post(request)).status, 200);
  assert.equal((await post(request, { origin: 'https://untrusted.invalid' })).status, 403);
  assert.equal((await post(request, { 'content-type': 'text/plain' })).status, 415);
  assert.equal((await post({ ...request, caseId: 'timeout' })).status, 504);
  const redacted = await post({ ...request, caseId: 'redaction' });
  assert.equal(redacted.status, 502); assert.doesNotMatch(await redacted.text(), /sensitive/);
  assert.equal((await post({ ...request, situation: 'x'.repeat(49000) })).status, 413);
  assert.equal((await post({ ...request, review: {} })).status, 400);
} finally { server.closeAllConnections(); await new Promise((resolve) => server.close(resolve)); }
console.log('v0.10 experimental smoke PASS | 8 fixture-only case transports | strict schema/identity/provenance/area isolation | cause vs agency | three independent options | outcome evidence | provider privacy | HTTP errors/timeouts/redaction');
