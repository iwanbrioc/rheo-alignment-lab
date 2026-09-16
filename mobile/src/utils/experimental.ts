import type { DecisionSession } from '../types/decision';
import type { ExperimentalFlow, OutcomeFields, OutcomeReview, ReviewInput } from '../types/experimental';

export const OUTCOME_KEYS = ['actualAction', 'happened', 'becamePossible', 'unchanged', 'burden', 'mismatchOrNewExplanation'] as const;
export const EMPTY_OUTCOME: OutcomeFields = { actualAction: '', happened: '', becamePossible: '', unchanged: '', burden: '', mismatchOrNewExplanation: '' };
const record = (value: unknown): value is Record<string, unknown> => Boolean(value && typeof value === 'object' && !Array.isArray(value));
const string = (value: unknown): value is string => typeof value === 'string' && Boolean(value.trim());
export function experimentalFlow(value: unknown): ExperimentalFlow | null {
  if (!record(value) || value.schemaVersion !== '0.10-experimental' || !string(value.caseId) || !string(value.summary)) return null;
  if (!Array.isArray(value.hypotheses) || value.hypotheses.length < 1 || value.hypotheses.length > 4 || !value.hypotheses.every((h) => record(h)
    && string(h.id) && string(h.statement) && string(h.predictedObservation) && record(h.confidence)
    && ['low', 'medium', 'high'].includes(String(h.confidence.level)) && string(h.confidence.basis))) return null;
  if (!record(value.availableAgency) || !string(value.availableAgency.influenceNow) || !string(value.availableAgency.limits)
    || !record(value.generatingRestriction) || !string(value.generatingRestriction.observedRelationship)
    || !Array.isArray(value.systemAgency) || !value.systemAgency.every((a) => record(a) && string(a.actor) && string(a.changeRequired) && string(a.uncertainty))
    || !record(value.safeguards) || !string(value.safeguards.powerAndExit) || !string(value.safeguards.urgentNeedsAndDeadlines)
    || !record(value.modelUpdate) || !string(value.modelUpdate.explanation) || !string(value.modelUpdate.mismatch)) return null;
  return value as unknown as ExperimentalFlow;
}
export function validOutcomeReview(value: unknown): value is OutcomeReview {
  if (!record(value)) return false;
  const allowed = [...OUTCOME_KEYS, 'id', 'createdAt', 'recommendationId', 'chosenAction', 'expectedObservation'];
  return Object.keys(value).length === allowed.length && Object.keys(value).every((key) => allowed.includes(key))
    && OUTCOME_KEYS.every((key) => typeof value[key] === 'string' && value[key].length <= 1500)
    && string(value.actualAction) && string(value.happened) && string(value.id) && string(value.recommendationId)
    && string(value.chosenAction) && value.chosenAction.length <= 1200
    && string(value.expectedObservation) && value.expectedObservation.length <= 600
    && typeof value.createdAt === 'string' && Number.isFinite(Date.parse(value.createdAt));
}
export function reviewInput(session: DecisionSession, review: OutcomeReview): ReviewInput {
  const flow = experimentalFlow(session.recommendation?.flow);
  if (!flow || review.recommendationId !== session.recommendation?.id || !validOutcomeReview(review)) throw new Error('This review does not match the saved options.');
  return {
    previousRecommendationId: review.recommendationId,
    previousHypotheses: flow.hypotheses.map(({ id, statement, predictedObservation, confidence }) => ({ id, statement, predictedObservation, confidence })),
    chosenAction: review.chosenAction, expectedObservation: review.expectedObservation,
    actualAction: review.actualAction, happened: review.happened, becamePossible: review.becamePossible,
    unchanged: review.unchanged, burden: review.burden, mismatchOrNewExplanation: review.mismatchOrNewExplanation,
  };
}
