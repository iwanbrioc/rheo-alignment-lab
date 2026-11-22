import test from 'node:test';
import assert from 'node:assert/strict';
import { FAIRNESS_SCENARIOS, freshFairnessSession, chooseBehindVeil, reviseAfterReveal, observeSimulatedConsequences, reopenForRevision, validateFairnessSession } from './veil-core.mjs';

test('all fictional choices have distinct outcomes for every disclosed position', () => {
  for (const scenario of FAIRNESS_SCENARIOS) {
    assert.ok(scenario.positions.length >= 3);
    assert.ok(scenario.choices.length >= 3);
    for (const choice of scenario.choices) {
      assert.equal(choice.impacts.length, scenario.positions.length);
      assert.ok(choice.observed.includes('Fictional'));
      assert.ok(choice.prediction);
    }
  }
});
test('veil, reveal, revision and consequences are ordered and role lottery is bounded', () => {
  const start = freshFairnessSession('pathway');
  assert.throws(() => reviseAfterReveal(start, 'adapted'));
  assert.throws(() => chooseBehindVeil(start, 'direct', 1));
  const revealed = chooseBehindVeil(start, 'direct', 0.999);
  assert.equal(revealed.stage, 'reveal');
  assert.equal(revealed.roleIndex, 3);
  assert.equal(revealed.initial, 'direct');
  const review = reviseAfterReveal(revealed, 'adapted');
  assert.equal(review.revised, 'adapted');
  assert.equal(review.revisions, 1);
  const observed = observeSimulatedConsequences(review);
  assert.equal(observed.stage, 'observed');
  assert.equal(reopenForRevision(observed).stage, 'reveal');
});
test('local session validation drops malformed or invented decisions', () => {
  assert.equal(validateFairnessSession({ stage: 'observed', scenarioId: 'repair', revised: 'made-up' }).stage, 'veil');
  assert.equal(validateFairnessSession({ stage: 'veil', scenarioId: 'unknown' }).scenarioId, 'repair');
  const choice = chooseBehindVeil(freshFairnessSession(), 'supported', 0);
  assert.deepEqual(validateFairnessSession(choice), choice);
});
