import { displayActions, validatePlainActions } from '../../plain_language_contract.mjs';
import type { RecommendationAction, RecommendationSnapshot } from '../types/decision';

const MOBILE_API_URL = process.env.EXPO_PUBLIC_LOCAL_CONTEXT_API_URL || 'http://localhost:8081';

export async function plainLanguageActions(originals: RecommendationAction[]): Promise<{
  actions: RecommendationAction[]; language: NonNullable<RecommendationSnapshot['language']>;
}> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 50_000);
  try {
    const http = await fetch(`${MOBILE_API_URL}/api/plain-actions`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, signal: controller.signal,
      body: JSON.stringify({ actions: displayActions(originals) }),
    });
    if (!http.ok) throw new Error('Plain English is unavailable');
    const text = await http.text();
    if (text.length > 90_000) throw new Error('Response too long');
    const response = JSON.parse(text);
    const simplified = validatePlainActions(response, originals);
    if (response.provider !== 'openai' || typeof response.model !== 'string') throw new Error('Unknown provider');
    return { actions: originals.map((action, index) => ({ ...action, ...simplified[index] })),
      language: { status: 'simple', provider: response.provider, model: response.model } };
  } catch {
    return { actions: originals, language: { status: 'original', provider: null, model: null } };
  } finally { clearTimeout(timeout); }
}
import { fetch } from 'expo/fetch';
