// A separate product experiment. Frozen v0.9 files are read, never rewritten.
import { readFileSync } from 'node:fs';

const legacy = JSON.parse(readFileSync(new URL('../../schemas/rheo-actions-v0.9.schema.json', import.meta.url)));
export const triplets = legacy.properties.actions.items.properties.horizonTriplet.enum;
export const kinds = ['smallest_release', 'learning_action', 'generative_action'];
const text = (maxLength = 600) => ({ type: 'string', minLength: 1, maxLength });
const list = (items, maxItems = 6, minItems = 0) => ({ type: 'array', items, minItems, maxItems });
const object = (properties) => ({ type: 'object', additionalProperties: false, required: Object.keys(properties), properties });
const choice = (...values) => ({ type: 'string', enum: values });
const nullableId = { type: ['string', 'null'], maxLength: 100 };
const triplet = { type: ['string', 'null'], enum: triplets };
const refs = list(text(100), 8);
const confidence = object({ level: choice('low', 'medium', 'high'), basis: text(300) });
const distribution = object({ whoActs: text(240), whoBenefits: text(240), whoBearsBurden: text(300), displacedBurden: text(300), compensatingForSystemFailure: text(300) });

export const flowSchema = object({
  schemaVersion: { type: 'string', const: '0.10-experimental' },
  caseId: text(100),
  summary: text(360),
  observations: list(object({
    id: text(100), statement: text(400),
    provenance: choice('user_reported_observation', 'user_interpretation', 'ai_inference', 'external_context', 'absent_party_account', 'unknown'),
    sourceRefs: refs, confidence, scope: choice('person_report', 'other_person_report', 'area_context', 'unknown'),
  }), 10, 1),
  hypotheses: list(object({
    id: text(100), statement: text(400), triplet, evidenceRefs: refs, evidenceAgainstOrMissing: list(text(300), 4, 1),
    confidence, discriminatingQuestion: text(300), predictedObservation: text(300), falsifierOrRelocation: text(300),
  }), 4, 1),
  primaryHypothesisId: nullableId,
  // The referenced hypothesis owns triplet/evidence/confidence/falsifier, avoiding two drifting copies.
  generatingRestriction: object({ hypothesisId: nullableId, observedRelationship: text(400) }),
  availableAgency: object({ triplet, influenceNow: text(400), limits: text(300), evidenceRefs: refs }),
  systemAgency: list(object({ actor: text(120), changeRequired: text(300), uncertainty: text(240), evidenceRefs: refs }), 4),
  relevantConditions: list(object({
    category: choice('material_security', 'work', 'housing', 'care', 'time_control', 'transport_access', 'rules_services', 'support', 'power_exclusion', 'environment'),
    relevance: text(300), evidenceRefs: refs, unknown: text(240),
  }), 5),
  upstreamCheck: object({ individualExplanation: text(300), upstreamExplanation: text(300), whyPrimaryOrUnresolved: text(400) }),
  distributionalEffect: distribution,
  safeguards: object({
    liveDecision: text(300), urgentNeedsAndDeadlines: text(300), safetyLevel: choice('unknown', 'none_detected', 'caution', 'high'),
    powerAndExit: text(400), irreversibleLoss: text(300), wholeCycleEffects: text(400), regeneration: text(300),
  }),
  modelUpdate: object({
    previousRecommendationId: nullableId,
    status: choice('initial', 'insufficient_evidence', 'increase', 'decrease', 'split', 'relocate', 'unchanged'),
    observationRefs: refs, mismatch: text(400), explanation: text(400),
  }),
});

const action = structuredClone(legacy.properties.actions.items);
// Bound inherited free text without changing any frozen contract.
function bound(schema) {
  if (schema.type === 'string' && !schema.enum) Object.assign(schema, { minLength: 1, maxLength: 600 });
  if (schema.type === 'array' && schema.maxItems === undefined) schema.maxItems = 6;
  if (schema.properties) Object.values(schema.properties).forEach(bound);
  if (schema.items) bound(schema.items);
}
bound(action);
Object.assign(action.properties, {
  hypothesisIds: list(text(100), 4, 1),
  agency: object({ relationship: choice('same_horizon', 'different_horizon', 'unresolved'), systemChangeNeeded: text(300) }),
  accessCheck: object({ usableNow: { type: 'boolean', const: true }, basis: text(300), ifUnavailable: text(300) }),
  distributionalEffect: distribution,
  independentNow: { type: 'boolean', const: true },
  competingPredictions: list(object({ hypothesisId: text(100), observation: text(300) }), 4),
});
action.required = Object.keys(action.properties);
export const decisionSchema = object({
  flow: flowSchema,
  actionSet: object({
    schemaVersion: { type: 'string', const: '0.10-experimental' }, caseId: text(100),
    primaryHypothesisId: nullableId, actions: list(action, 3, 3), noneIsValid: { type: 'boolean', const: true },
  }),
});

export const reviewSchema = object({
  previousRecommendationId: text(100),
  previousHypotheses: list(object({ id: text(100), statement: text(400), predictedObservation: text(300), confidence }), 4, 1),
  chosenAction: text(1200), expectedObservation: text(600),
  actualAction: text(1500), happened: text(1500), becamePossible: { type: 'string', maxLength: 1500 },
  unchanged: { type: 'string', maxLength: 1500 }, burden: { type: 'string', maxLength: 1500 },
  mismatchOrNewExplanation: { type: 'string', maxLength: 1500 },
});
export const requestSchema = object({
  caseId: text(100), situation: { ...text(6000), minLength: 12 },
  // Context is bounded JSON text; it is never promoted to verified personal evidence.
  localContext: { type: ['string', 'null'], maxLength: 16000 },
  review: { anyOf: [reviewSchema, { type: 'null' }] },
});
