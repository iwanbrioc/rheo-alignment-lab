import { PATHWAY_CONSENT, validatePathwayRequest, validatePathwayResult, type PathwayBrief } from '../../pathway_contract.mjs';
import { postJson } from './http';

const BASE_URL = process.env.EXPO_PUBLIC_LOCAL_CONTEXT_API_URL || 'http://localhost:8081';
export async function suggestPathway(brief: PathwayBrief, signal: AbortSignal) {
  const request = validatePathwayRequest({ need: brief.need, gift: brief.gift,
    enablers: brief.enablers, limits: brief.limits, consent: PATHWAY_CONSENT });
  return validatePathwayResult(await postJson(BASE_URL, '/api/pathway-plan', request, { signal, timeoutMs: 55_000 }));
}
