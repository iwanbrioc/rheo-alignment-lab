import type {
  ActionKind,
  DecisionChoice,
  DecisionSession,
  RecommendationAction,
} from '../types/decision';
import type {
  LocalContextApiResponse,
  LocalContextCandidate,
  LocalContextSnapshot,
} from '../types/localContext';

export const ACTION_KIND_LABELS: Record<ActionKind, string> = {
  smallest_release: 'Do the smallest useful thing',
  learning_action: 'Find something out',
  generative_action: 'Open a pathway',
};

const FORBIDDEN_COORDINATE_KEYS = new Set(['latitude', 'longitude']);
const VALID_RESEARCH_ARMS = new Set([
  null,
  'neutral_base',
  'neutral_transition',
  'rheocratic_transition',
]);

function isValidResearchArm(value: unknown): boolean {
  return value === null || (typeof value === 'string' && VALID_RESEARCH_ARMS.has(value));
}

function normaliseString(value: unknown, fallback = ''): string {
  return typeof value === 'string' && value.trim() ? value : fallback;
}

function normaliseNullableString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null;
}

function normaliseNullableNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export function createLocalId(prefix: string): string {
  const cryptoApi = globalThis.crypto;

  if (typeof cryptoApi?.randomUUID === 'function') {
    return `${prefix}-${cryptoApi.randomUUID()}`;
  }

  if (typeof cryptoApi?.getRandomValues === 'function') {
    const bytes = new Uint8Array(16);
    cryptoApi.getRandomValues(bytes);
    const entropy = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
    return `${prefix}-${entropy}`;
  }

  const timePart = Date.now().toString(36);
  const randomPart = Math.random().toString(36).slice(2, 14);
  return `${prefix}-${timePart}-${randomPart}`;
}

export function toLocalContextSnapshot(response: LocalContextApiResponse): LocalContextSnapshot {
  return {
    provider: normaliseString(response.provider, 'unknown'),
    attribution: normaliseNullableString(response.attribution),
    retrievedAt: normaliseString(response.retrievedAt, new Date().toISOString()),
    areaLabel: normaliseNullableString(response.areaLabel),
    searchQueries: Array.isArray(response.searchQueries)
      ? response.searchQueries.filter((query): query is string => typeof query === 'string')
      : [],
    candidates: Array.isArray(response.candidates)
      ? response.candidates.map((candidate): LocalContextCandidate => ({
          id: normaliseString(candidate.id, createLocalId('candidate')),
          name: normaliseString(candidate.name, 'Unnamed possibility'),
          category: normaliseString(candidate.category, 'local possibility'),
          distanceM: normaliseNullableNumber(candidate.distanceM),
          address: normaliseNullableString(candidate.address),
          source: normaliseString(candidate.source, response.provider || 'local-context provider'),
          sourceUrl: normaliseNullableString(candidate.sourceUrl),
          whyRelevant: normaliseString(
            candidate.whyRelevant,
            'Returned by the configured local-context provider. Check suitability before relying on it.',
          ),
        }))
      : [],
    warnings: Array.isArray(response.warnings)
      ? response.warnings.filter((warning): warning is string => typeof warning === 'string')
      : [],
  };
}

export function removeCoordinateFields(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(removeCoordinateFields);
  if (!value || typeof value !== 'object') return value;

  const output: Record<string, unknown> = {};
  for (const [key, nestedValue] of Object.entries(value)) {
    if (FORBIDDEN_COORDINATE_KEYS.has(key)) continue;
    output[key] = removeCoordinateFields(nestedValue);
  }
  return output;
}

export function containsCoordinateFields(value: unknown): boolean {
  if (Array.isArray(value)) return value.some(containsCoordinateFields);
  if (!value || typeof value !== 'object') return false;

  return Object.entries(value).some(([key, nestedValue]) => (
    FORBIDDEN_COORDINATE_KEYS.has(key) || containsCoordinateFields(nestedValue)
  ));
}

export function sanitizeDecisionSessionForStorage(session: DecisionSession): DecisionSession {
  return removeCoordinateFields(session) as DecisionSession;
}

export function serializeDecisionSessions(sessions: DecisionSession[]): string {
  return JSON.stringify(sessions.map(sanitizeDecisionSessionForStorage));
}

export function parseDecisionSessions(raw: string | null): DecisionSession[] {
  if (!raw) return [];
  const parsed: unknown = JSON.parse(raw);
  if (!Array.isArray(parsed)) return [];

  return parsed.filter((item): item is DecisionSession => {
    if (!item || typeof item !== 'object') return false;
    const maybe = item as Partial<DecisionSession>;
    return (
      typeof maybe.id === 'string'
      && typeof maybe.createdAt === 'string'
      && typeof maybe.updatedAt === 'string'
      && typeof maybe.situation === 'string'
      && typeof maybe.locationUsed === 'boolean'
      && isValidResearchArm(maybe.researchArm)
    );
  });
}

export function withRecordedChoice(
  session: DecisionSession,
  choice: DecisionChoice,
  updatedAt = new Date().toISOString(),
): DecisionSession {
  return sanitizeDecisionSessionForStorage({
    ...session,
    choice,
    updatedAt,
  });
}

export function withSituationChanged(
  session: DecisionSession,
  situation: string,
  updatedAt = new Date().toISOString(),
): DecisionSession {
  return sanitizeDecisionSessionForStorage({
    ...session,
    updatedAt,
    situation,
    locationUsed: false,
    areaLabel: null,
    localContext: null,
    recommendation: null,
    choice: null,
    researchArm: null,
  });
}

export function getActionLabel(kind: string): string {
  return ACTION_KIND_LABELS[kind as ActionKind] || 'A way forward';
}

export function getChosenAction(
  session: Pick<DecisionSession, 'choice' | 'recommendation'>,
): RecommendationAction | null {
  const choice = session.choice;
  if (choice?.kind !== 'recommended') return null;
  return session.recommendation?.actions.find((action) => action.id === choice.actionId) || null;
}

export function describeChoice(session: Pick<DecisionSession, 'choice' | 'recommendation'>): string {
  if (!session.choice) return 'No choice recorded yet.';
  if (session.choice.kind === 'not_yet') return 'Not yet.';
  if (session.choice.kind === 'custom') return session.choice.text;

  const action = getChosenAction(session);
  return action ? action.action : 'A recommended action.';
}
