import type { RecommendationAction, RecommendationSnapshot } from '../types/decision';
import type { LocalContextSnapshot } from '../types/localContext';
import type { ReviewInput } from '../types/experimental';
import { createLocalId, removeCoordinateFields } from '../utils/decisionSession';
import { experimentalFlow } from '../utils/experimental';
import { postJson } from './http';

export async function askExperimental(situation: string, localContext: LocalContextSnapshot | null,
  options: { signal?: AbortSignal; review?: ReviewInput; areaLabel?: string | null } = {}): Promise<RecommendationSnapshot> {
  if (options.signal?.aborted) throw Object.assign(new Error('Request stopped.'), { name: 'AbortError' });
  const caseId = createLocalId('mobile-case');
  const context = localContext || (options.areaLabel ? { areaLabel: options.areaLabel } : null);
  const response = await postJson<{
    provider: string; model: string; responseId: string | null; researchUsable: false;
    flow: unknown; actionSet: { caseId: string; schemaVersion: string; actions: RecommendationAction[]; noneIsValid: true };
  }>(process.env.EXPO_PUBLIC_RHEO_API_URL || 'http://localhost:8080', '/api/v0.10/decision', {
    caseId, situation, localContext: context ? JSON.stringify(removeCoordinateFields(context)) : null,
    review: options.review || null,
  }, options);
  const flow = experimentalFlow(response.flow);
  const actions = response.actionSet?.actions;
  const kinds = ['smallest_release', 'learning_action', 'generative_action'];
  if (!flow || flow.caseId !== caseId || response.actionSet?.caseId !== caseId || response.actionSet?.schemaVersion !== '0.10-experimental'
    || response.actionSet?.noneIsValid !== true || !Array.isArray(actions) || actions.length !== 3
    || !kinds.every((kind) => actions.some((a) => a.kind === kind)) || new Set(actions.map((a) => a.id)).size !== 3
    || !actions.every((a) => [a.id, a.title, a.action, a.whyThisAction, a.falsifierOrChangeSignal].every((v) => typeof v === 'string' && v.trim())
      && a.accessCheck?.usableNow === true && typeof a.accessCheck.basis === 'string' && typeof a.accessCheck.ifUnavailable === 'string'
      && a.distributionalEffect && (['whoActs', 'whoBenefits', 'whoBearsBurden', 'displacedBurden', 'compensatingForSystemFailure'] as const)
        .every((key) => typeof a.distributionalEffect?.[key] === 'string' && a.distributionalEffect[key].trim())
      && a.agency && typeof a.agency.systemChangeNeeded === 'string'
      && ['same_horizon', 'different_horizon', 'unresolved'].includes(a.agency.relationship))
    || (options.review && flow.modelUpdate.previousRecommendationId !== options.review.previousRecommendationId)) {
    throw new Error('Rheo sent incomplete experimental options. Please try again.');
  }
  if (options.signal?.aborted) throw Object.assign(new Error('Request stopped.'), { name: 'AbortError' });
  const meta = { provider: response.provider, model: response.model, responseId: response.responseId, researchUsable: false };
  return { id: createLocalId('recommendation'), caseId, createdAt: new Date().toISOString(),
    flow: response.flow, flowMeta: meta, actionMeta: meta, actions, originalActions: actions };
}
