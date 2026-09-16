import Ajv from 'ajv';
import { decisionSchema, requestSchema, kinds } from './schema.mjs';

const ajv = new Ajv({ allErrors: true, strict: true });
const validRequest = ajv.compile(requestSchema);
const validDecision = ajv.compile(decisionSchema);
const fail = (message) => { throw new Error(message); };
const unique = (items) => new Set(items).size === items.length;
export function sourceRecords(request) {
  const sources = { situation: request.situation };
  if (request.localContext) sources.localContext = request.localContext;
  if (request.review) for (const key of ['actualAction', 'happened', 'becamePossible', 'unchanged', 'burden', 'mismatchOrNewExplanation']) {
    if (request.review[key].trim()) sources[`review.${key}`] = request.review[key];
  }
  return sources;
}
export function validateRequest(request) {
  if (!validRequest(request)) fail('Invalid decision request.');
  if (!request.situation.trim() || request.situation.trim().length < 12) fail('Add a little more about your question.');
  if (request.localContext) {
    let context;
    try { context = JSON.parse(request.localContext); } catch { fail('Invalid area context.'); }
    const inspect = (value) => {
      if (Array.isArray(value)) return value.forEach(inspect);
      if (value && typeof value === 'object') for (const [key, child] of Object.entries(value)) {
        if (/^(latitude|longitude|lat|lon|lng)$/i.test(key)) fail('Coordinates are not accepted by the decision engine.');
        inspect(child);
      }
    };
    inspect(context);
  }
  if (request.review && (!request.review.actualAction.trim() || !request.review.happened.trim())) fail('Describe the action and what happened.');
  return request;
}
export function validateDecision(result, request) {
  if (!validDecision(result)) fail(`Invalid experimental output: ${ajv.errorsText(validDecision.errors, { separator: '; ' })}`);
  const { flow, actionSet } = result;
  if (flow.caseId !== request.caseId || actionSet.caseId !== request.caseId) fail('Case identity changed.');
  const sources = sourceRecords(request);
  const observations = new Map(flow.observations.map((o) => [o.id, o]));
  const hypotheses = new Map(flow.hypotheses.map((h) => [h.id, h]));
  if (observations.size !== flow.observations.length || hypotheses.size !== flow.hypotheses.length) fail('Duplicate evidence or hypothesis IDs.');
  const evidence = (refs) => {
    if (!unique(refs) || refs.some((ref) => !observations.has(ref))) fail('Unknown or repeated evidence reference.');
  };
  for (const o of flow.observations) {
    if (!unique(o.sourceRefs) || o.sourceRefs.some((ref) => !(ref in sources))) fail('Unknown source reference.');
    if (['user_reported_observation', 'user_interpretation', 'absent_party_account', 'external_context'].includes(o.provenance) && !o.sourceRefs.length) fail('Claim without source.');
    if (o.sourceRefs.includes('localContext') && (o.scope !== 'area_context' || o.provenance !== 'external_context')) fail('Area context cannot establish personal circumstances.');
    if (o.provenance === 'external_context' && (!o.sourceRefs.length || o.sourceRefs.some((ref) => ref !== 'localContext'))) fail('External claim has no external context.');
    if (o.provenance === 'ai_inference' && o.confidence.level === 'high') fail('An inference alone is not high-confidence observation.');
  }
  for (const h of flow.hypotheses) {
    evidence(h.evidenceRefs);
    const direct = h.evidenceRefs.filter((ref) => observations.get(ref).provenance === 'user_reported_observation');
    if (h.confidence.level !== 'low' && !direct.length) fail('Cause confidence needs reported observations, not area or inferred evidence alone.');
    if (h.confidence.level === 'high' && direct.length < 2) fail('High cause confidence requires converging observations.');
  }
  const primary = flow.primaryHypothesisId === null ? null : hypotheses.get(flow.primaryHypothesisId);
  if (flow.primaryHypothesisId !== null && !primary) fail('Missing primary hypothesis.');
  const restriction = flow.generatingRestriction;
  if (restriction.hypothesisId !== flow.primaryHypothesisId || actionSet.primaryHypothesisId !== flow.primaryHypothesisId) fail('Primary handoff mismatch.');
  evidence(flow.availableAgency.evidenceRefs);
  for (const condition of [...flow.relevantConditions, ...flow.systemAgency]) evidence(condition.evidenceRefs);
  const update = flow.modelUpdate;
  evidence(update.observationRefs);
  if (!request.review && (update.status !== 'initial' || update.previousRecommendationId !== null || update.observationRefs.length)) fail('No invented outcome update.');
  if (request.review) {
    if (update.previousRecommendationId !== request.review.previousRecommendationId || update.status === 'initial') fail('Review identity missing.');
    if (!update.observationRefs.some((ref) => observations.get(ref).sourceRefs.some((source) => source.startsWith('review.')))) fail('Model update must refer to new outcome evidence.');
  }
  const actions = actionSet.actions;
  if (!unique(actions.map((a) => a.id)) || !kinds.every((kind) => actions.some((a) => a.kind === kind))) fail('Three distinct action kinds required.');
  if (!unique(actions.map((a) => a.action.trim().toLowerCase()))) fail('Actions cannot repeat.');
  for (const a of actions) {
    if (!unique(a.hypothesisIds) || a.hypothesisIds.some((id) => !hypotheses.has(id))) fail('Action hypothesis reference missing.');
    const relationship = !primary?.triplet || !a.horizonTriplet ? 'unresolved' : a.horizonTriplet === primary.triplet ? 'same_horizon' : 'different_horizon';
    if (a.agency.relationship !== relationship) fail('Action horizon relationship mislabelled.');
    if ((hypotheses.size > 1 && !unique(a.competingPredictions.map((p) => p.hypothesisId))) || a.competingPredictions.some((p) => !hypotheses.has(p.hypothesisId))) fail('Prediction reference missing.');
    if (a.kind === 'learning_action' && flow.hypotheses.length > 1 && (a.competingPredictions.length < 2 || !unique(a.competingPredictions.map((p) => p.observation.trim().toLowerCase())))) fail('Learning must discriminate between alternatives.');
  }
  return result;
}

// Mechanical comparison, not a claim that an action fixes its generating cause.
export function deriveActionRelationships(result) {
  const primary = result.flow?.hypotheses?.find((h) => h.id === result.flow.primaryHypothesisId);
  for (const action of result.actionSet?.actions || []) {
    if (action.agency) action.agency.relationship = !primary?.triplet || !action.horizonTriplet ? 'unresolved'
      : primary.triplet === action.horizonTriplet ? 'same_horizon' : 'different_horizon';
  }
  return result;
}
