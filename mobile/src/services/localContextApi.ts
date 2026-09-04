import type { DecisionLocation } from '../location';
import type { LocalContextApiResponse, LocalContextSnapshot } from '../types/localContext';
import { toLocalContextSnapshot } from '../utils/decisionSession';
import { postJson } from './http';

const LOCAL_CONTEXT_API_URL = process.env.EXPO_PUBLIC_LOCAL_CONTEXT_API_URL || 'http://localhost:8081';

export async function fetchLocalContext(
  decisionText: string,
  location: DecisionLocation,
): Promise<LocalContextSnapshot> {
  const response = await postJson<LocalContextApiResponse>(LOCAL_CONTEXT_API_URL, '/api/local-context', {
    decisionText,
    location,
    radiusM: 5000,
  });

  return toLocalContextSnapshot(response);
}
