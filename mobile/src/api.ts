import type { DecisionLocation } from './location';

export type LocalContextCandidate = {
  id: string;
  name: string;
  category: string;
  distanceM: number | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  source: string;
  sourceUrl: string | null;
  whyRelevant: string;
};

export type LocalContextResponse = {
  provider: string;
  attribution: string | null;
  retrievedAt: string;
  areaLabel: string | null;
  searchQueries: string[];
  candidates: LocalContextCandidate[];
  warnings: string[];
};

export type RheoAction = {
  id: string;
  kind: string;
  title: string;
  action: string;
  whyThisAction: string;
  falsifierOrChangeSignal: string;
};

export type RheoDecisionResponse = {
  localContext: LocalContextResponse | null;
  flow: unknown;
  actions: RheoAction[];
};

const RHEO_API_URL = process.env.EXPO_PUBLIC_RHEO_API_URL || 'http://localhost:8080';
const LOCAL_CONTEXT_API_URL = process.env.EXPO_PUBLIC_LOCAL_CONTEXT_API_URL || 'http://localhost:8081';

async function postJson<T>(baseUrl: string, path: string, body: unknown): Promise<T> {
  const response = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data?.error || `Request failed: ${response.status}`);
  return data as T;
}

export async function getLocalContext(
  decisionText: string,
  location: DecisionLocation,
): Promise<LocalContextResponse> {
  return postJson<LocalContextResponse>(LOCAL_CONTEXT_API_URL, '/api/local-context', {
    decisionText,
    location,
    radiusM: 5000,
  });
}

export async function askRheo(
  decisionText: string,
  location: DecisionLocation | null,
  localContext: LocalContextResponse | null,
): Promise<RheoDecisionResponse> {
  const caseId = `mobile-${Date.now()}`;
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
      localContext: localContext
        ? {
            provider: localContext.provider,
            attribution: localContext.attribution,
            retrievedAt: localContext.retrievedAt,
            candidates: localContext.candidates.map((candidate) => ({
              id: candidate.id,
              name: candidate.name,
              category: candidate.category,
              distanceM: candidate.distanceM,
              address: candidate.address,
              source: candidate.source,
              sourceUrl: candidate.sourceUrl,
              whyRelevant: candidate.whyRelevant,
            })),
            warnings: localContext.warnings,
          }
        : null,
    },
  };

  const flowResult = await postJson<any>(RHEO_API_URL, '/api/rheo-flow', { caseRecord });
  const actionResult = await postJson<any>(RHEO_API_URL, '/api/rheo-actions', {
    caseId,
    flow: flowResult.flow,
    testimony: [{ role: 'participant', text: decisionText, questionType: 'decision' }],
  });

  return {
    localContext,
    flow: flowResult.flow,
    actions: actionResult.actionSet?.actions || [],
  };
}
