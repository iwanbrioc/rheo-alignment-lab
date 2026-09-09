import { fetch } from 'expo/fetch';
import { PREPARATION_CONSENT, validatePreparationRequest, validatePreparationResult } from '../../preparation_contract.mjs';
import type { PreparationResult } from '../types/preparation';

const BASE_URL = process.env.EXPO_PUBLIC_LOCAL_CONTEXT_API_URL || 'http://localhost:8081';

export async function prepareStep(id: string, brief: string, signal: AbortSignal): Promise<PreparationResult> {
  const request = validatePreparationRequest({ id, brief, consent: PREPARATION_CONSENT });
  const controller = new AbortController();
  const abort = () => controller.abort();
  signal.addEventListener('abort', abort);
  if (signal.aborted) abort();
  const timeout = setTimeout(abort, 135_000);
  try {
    const response = await fetch(`${BASE_URL}/api/preparation`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify(request), signal: controller.signal,
    });
    const raw = await response.text();
    if (raw.length > 80_000) throw new Error('Research returned too much data. Try a narrower brief.');
    const data = JSON.parse(raw);
    if (!response.ok) throw Object.assign(new Error(typeof data?.error === 'string' && data.error.length < 1000
      ? data.error : 'Research is unavailable. Your choice is still saved.'), { name: 'PreparationServiceError' });
    return validatePreparationResult(data);
  } catch (error) {
    if (controller.signal.aborted) throw new Error('Research stopped or took too long. Nothing has been acted on.');
    if (error instanceof SyntaxError) throw new Error('The research response could not be read. Try again.');
    throw error;
  } finally {
    clearTimeout(timeout);
    signal.removeEventListener('abort', abort);
  }
}
