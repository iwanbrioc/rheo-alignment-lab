import { decisionSchema, kinds } from './schema.mjs';

function example(schema) {
  if ('const' in schema) return schema.const;
  if (schema.enum) return schema.enum.includes(null) ? null : schema.enum[0];
  if (schema.type === 'object') return Object.fromEntries(Object.entries(schema.properties).map(([key, value]) => [key, example(value)]));
  if (schema.type === 'array') return Array.from({ length: schema.minItems || 0 }, () => example(schema.items));
  if (Array.isArray(schema.type) && schema.type.includes('null')) return null;
  if (schema.type === 'boolean') return true;
  return 'Fixture plumbing only. No interpretation or real advice.';
}
export function fixtureDecision(request) {
  const result = example(decisionSchema);
  const { flow, actionSet } = result;
  flow.caseId = actionSet.caseId = request.caseId;
  flow.observations[0].id = 'o1';
  flow.observations[0].sourceRefs = ['situation'];
  flow.hypotheses[0].id = 'h1';
  flow.hypotheses[0].evidenceRefs = ['o1'];
  flow.modelUpdate.observationRefs = [];
  if (request.review) {
    flow.observations.push({ ...structuredClone(flow.observations[0]), id: 'o2', sourceRefs: ['review.happened'] });
    flow.modelUpdate.previousRecommendationId = request.review.previousRecommendationId;
    flow.modelUpdate.status = 'insufficient_evidence';
    flow.modelUpdate.observationRefs = ['o2'];
  }
  for (const [i, action] of actionSet.actions.entries()) {
    action.id = `a${i + 1}`;
    action.kind = kinds[i];
    action.title = `Fixture ${kinds[i]}`;
    action.action = `Fixture ${i + 1}: checks transport only; no advice is generated.`;
    action.hypothesisIds = ['h1'];
    action.agency.relationship = 'unresolved';
  }
  return result;
}
