import type { DecisionLocation } from '../location';
import type {
  RecommendationAction,
  RecommendationMeta,
  RecommendationSnapshot,
} from '../types/decision';
import type { LocalContextSnapshot } from '../types/localContext';
import { createLocalId, removeCoordinateFields } from '../utils/decisionSession';
import { postJson } from './http';
import { plainLanguageActions } from './plainLanguage';
import { askExperimental } from './experimentalApi';

const RHEO_API_URL = process.env.EXPO_PUBLIC_RHEO_API_URL || 'http://localhost:8080';
export type RheoStage = 'understanding' | 'options' | 'wording';

function checkActive(signal?: AbortSignal) {
  if (signal?.aborted) throw Object.assign(new Error('Request stopped. Your question is still here.'), { name: 'AbortError' });
}

type RheoFlowResponse = {
  provider?: string;
  model?: string;
  responseId?: string | null;
  researchUsable?: boolean;
  flow: unknown;
};

type RheoActionSetResponse = {
  provider?: string;
  model?: string;
  responseId?: string | null;
  researchUsable?: boolean;
  actionSet?: {
    actions?: RecommendationAction[];
  };
};

function metaFromResponse(response: RheoFlowResponse | RheoActionSetResponse): RecommendationMeta {
  return {
    provider: typeof response.provider === 'string' ? response.provider : null,
    model: typeof response.model === 'string' ? response.model : null,
    responseId: typeof response.responseId === 'string' ? response.responseId : null,
    researchUsable: typeof response.researchUsable === 'boolean' ? response.researchUsable : null,
  };
}

function normaliseActions(actions: RecommendationAction[] | undefined): RecommendationAction[] {
  if (!Array.isArray(actions)) return [];
  return actions.map((action) => ({
    ...action,
    id: String(action.id || createLocalId('action')),
    kind: String(action.kind || 'unknown'),
    title: String(action.title || 'Untitled action'),
    action: String(action.action || ''),
    whyThisAction: String(action.whyThisAction || ''),
    falsifierOrChangeSignal: String(action.falsifierOrChangeSignal || ''),
  }));
}

export async function askRheo(
  decisionText: string,
  location: DecisionLocation | null,
  localContext: LocalContextSnapshot | null,
  options: { signal?: AbortSignal; onStage?: (stage: RheoStage) => void } = {},
): Promise<RecommendationSnapshot> {
  checkActive(options.signal);
  if (process.env.EXPO_PUBLIC_RHEO_ENGINE !== 'v0.9') {
    options.onStage?.('understanding');
    return askExperimental(decisionText, localContext, { ...options, areaLabel: location?.areaLabel });
  }
  const caseId = createLocalId('mobile-case');
  const cleanedLocalContext = localContext
    ? removeCoordinateFields(localContext)
    : null;
  const caseRecord = {
    caseId,
    context: {
      situation: decisionText,
      location: location
        ? {
            areaLabel: location.areaLabel,
            precision: location.precision,
          }
        : null,
      localContext: cleanedLocalContext,
    },
  };

  options.onStage?.('understanding');
  const flowResult = await postJson<RheoFlowResponse>(RHEO_API_URL, '/api/rheo-flow', { caseRecord }, options);
  checkActive(options.signal);
  options.onStage?.('options');
  const actionResult = await postJson<RheoActionSetResponse>(RHEO_API_URL, '/api/rheo-actions', {
    caseId,
    flow: flowResult.flow,
    testimony: [{ role: 'participant', text: decisionText, questionType: 'decision' }],
  }, options);
  const actions = normaliseActions(actionResult.actionSet?.actions);

  if (actions.length !== 3) {
    throw new Error('Rheo did not return the three action options expected for this alpha.');
  }
  checkActive(options.signal);
  if (actionResult.provider !== 'fixture') options.onStage?.('wording');
  const presentation = actionResult.provider === 'fixture' ? { actions } : await plainLanguageActions(actions, options.signal);
  checkActive(options.signal);

  return {
    id: createLocalId('recommendation'),
    caseId,
    createdAt: new Date().toISOString(),
    flow: flowResult.flow,
    flowMeta: metaFromResponse(flowResult),
    actionMeta: metaFromResponse(actionResult),
    originalActions: actions,
    ...presentation,
  };
}
