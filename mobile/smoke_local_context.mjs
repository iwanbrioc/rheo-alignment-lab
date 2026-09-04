#!/usr/bin/env node
import assert from 'node:assert/strict';
import { getLocalAffordanceContext, validateLocalContextRequest } from './local_context_v0_1.mjs';

process.env.LOCAL_CONTEXT_PROVIDER = 'fixture';

const request = {
  decisionText: 'My washing machine has broken and I need a reliable solution this week.',
  location: { latitude: 51.745, longitude: -2.217, areaLabel: 'Prototype area' },
  radiusM: 5000
};

const validated = validateLocalContextRequest(request);
if (validated.radiusM !== 5000) throw new Error('radius validation failed');
const result = await getLocalAffordanceContext(request);
if (result.provider !== 'fixture') throw new Error('fixture provider not used');
if (!Array.isArray(result.searchQueries) || !result.searchQueries.includes('appliance repair')) throw new Error('decision query planner did not identify repair context');
if (result.candidates.length !== 0) throw new Error('fixture must never invent places');
if (!result.warnings.length) throw new Error('fixture must warn that no real place data was returned');
console.log(`mobile local-context smoke PASS | provider=${result.provider} | queries=${result.searchQueries.join(',')} | candidates=${result.candidates.length}`);

const workRequest = { ...request, decisionText: 'I am looking for work and want to build my skills.' };
const workFixture = await getLocalAffordanceContext(workRequest);
assert.deepEqual(workFixture.searchQueries, ['employment agency', 'college', 'library']);
assert.deepEqual(workFixture.candidates, []);

const originalFetch = globalThis.fetch;
const originalAgent = process.env.NOMINATIM_USER_AGENT;
const originalBaseUrl = process.env.NOMINATIM_BASE_URL;
const calls = [];
let failNext = false;
process.env.LOCAL_CONTEXT_PROVIDER = 'nominatim';
process.env.NOMINATIM_USER_AGENT = 'RheoMobileSmoke/0.2';
process.env.NOMINATIM_BASE_URL = 'https://places.example.test';
globalThis.fetch = async (input, options) => {
  const url = new URL(input);
  assert.equal(url.hostname, 'places.example.test');
  assert.equal(url.searchParams.get('bounded'), '1');
  assert.ok(workFixture.searchQueries.includes(url.searchParams.get('q')));
  assert.ok(!url.toString().includes(workRequest.decisionText));
  assert.equal(options.headers['user-agent'], 'RheoMobileSmoke/0.2');
  assert.ok(options.signal instanceof AbortSignal);
  calls.push(Date.now());
  if (failNext) {
    failNext = false;
    throw new DOMException('Timed out', 'TimeoutError');
  }
  return Response.json([
    { place_id: 1, name: 'Mock college', type: 'college', lat: '51.746', lon: '-2.217', display_name: 'Mock address' },
    { place_id: 2, name: 'Outside radius', lat: '52.745', lon: '-2.217' },
  ]);
};
try {
  const [first, second] = await Promise.all([
    getLocalAffordanceContext(workRequest),
    getLocalAffordanceContext(workRequest),
  ]);
  assert.equal(calls.length, 3, 'concurrent identical lookups should share cached results');
  assert.deepEqual(first, second);
  assert.equal(first.candidates.length, 1, 'deduplicate listings and exclude distant results');
  assert.equal(first.candidates[0].source, 'OpenStreetMap / Nominatim');
  assert.ok(first.candidates[0].sourceUrl.startsWith('https://www.openstreetmap.org/'));
  assert.ok(first.attribution.includes('OpenStreetMap'));
  for (let i = 1; i < calls.length; i++) {
    assert.ok(calls[i] - calls[i - 1] >= 1000, 'provider requests must stay below one per second');
  }
  failNext = true;
  const retryRequest = { ...workRequest, radiusM: 6000 };
  await assert.rejects(getLocalAffordanceContext(retryRequest), { name: 'TimeoutError' });
  const recovered = await getLocalAffordanceContext(retryRequest);
  assert.equal(recovered.candidates.length, 1, 'a failed request must not block later searches');
  console.log('mobile live-local smoke PASS | employment queries | bounded evidence | shared rate limit/cache | failure recovery (mock provider)');
} finally {
  globalThis.fetch = originalFetch;
  process.env.LOCAL_CONTEXT_PROVIDER = 'fixture';
  if (originalAgent === undefined) delete process.env.NOMINATIM_USER_AGENT;
  else process.env.NOMINATIM_USER_AGENT = originalAgent;
  if (originalBaseUrl === undefined) delete process.env.NOMINATIM_BASE_URL;
  else process.env.NOMINATIM_BASE_URL = originalBaseUrl;
}
