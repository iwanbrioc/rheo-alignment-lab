import { fetch } from 'expo/fetch';
import { displayActions, validatePlainActions } from '../../plain_language_contract.mjs';
import type { RecommendationAction, RecommendationSnapshot } from '../types/decision';

const MOBILE_API_URL = process.env.EXPO_PUBLIC_LOCAL_CONTEXT_API_URL || 'http://localhost:8081';

export async function plainLanguageActions(originals: RecommendationAction[], signal?: AbortSignal): Promise<{
  actions: RecommendationAction[]; language: NonNullable<RecommendationSnapshot['language']>;
}> {
  const controller = new AbortController();
  const abort = () => controller.abort();
  signal?.addEventListener('abort', abort);
  if (signal?.aborted) abort();
  const timeout = setTimeout(abort, 20_000);
  try {
    if (controller.signal.aborted) throw new Error('Request stopped');
    const http = await fetch(`${MOBILE_API_URL}/api/plain-actions`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, signal: controller.signal,
      body: JSON.stringify({ actions: displayActions(originals) }),
    });
    if (!http.ok) throw new Error('Plain English is unavailable');
    const text = await http.text();
    if (text.length > 90_000) throw new Error('Response too long');
    const response = JSON.parse(text);
    const simplified = validatePlainActions(response, originals);
    if (signal?.aborted) throw new Error('Request stopped');
    if (response.provider !== 'openai' || typeof response.model !== 'string') throw new Error('Unknown provider');
    return { actions: originals.map((action, index) => ({ ...action, ...simplified[index] })),
      language: { status: 'simple', provider: response.provider, model: response.model } };
  } catch {
    if (signal?.aborted) throw Object.assign(new Error('Request stopped. Your question is still here.'), { name: 'AbortError' });
    return { actions: originals, language: { status: 'original', provider: null, model: null } };
  } finally { clearTimeout(timeout); signal?.removeEventListener('abort', abort); }
}
