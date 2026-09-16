import { readFileSync } from 'node:fs';
import { decisionSchema } from './schema.mjs';
import { sourceRecords, validateDecision, validateRequest, deriveActionRelationships } from './validation.mjs';
import { fixtureDecision } from './fixture.mjs';

const prompt = readFileSync(new URL('./prompt.md', import.meta.url), 'utf8');
export function schemaForRequest(request) {
  // Break shared schema-node references before adding request-specific constraints.
  const schema = JSON.parse(JSON.stringify(decisionSchema));
  const flow = schema.properties.flow.properties;
  flow.caseId.const = request.caseId;
  schema.properties.actionSet.properties.caseId.const = request.caseId;
  const observation = flow.observations.items;
  observation.properties.sourceRefs.items.enum = Object.keys(sourceRecords(request));
  const reported = structuredClone(observation);
  reported.properties.provenance.enum = ['user_reported_observation', 'user_interpretation', 'absent_party_account'];
  reported.properties.sourceRefs.items.enum = Object.keys(sourceRecords(request)).filter((key) => key !== 'localContext');
  const inferred = structuredClone(observation);
  inferred.properties.provenance.enum = ['ai_inference', 'unknown'];
  inferred.properties.confidence.properties.level.enum = ['low', 'medium'];
  inferred.properties.sourceRefs.items.enum = Object.keys(sourceRecords(request)).filter((key) => key !== 'localContext');
  const variants = [reported, inferred];
  if (request.localContext) {
    const area = structuredClone(observation);
    area.properties.provenance.enum = ['external_context'];
    area.properties.scope.enum = ['area_context'];
    area.properties.sourceRefs.items.enum = ['localContext'];
    variants.push(area);
  }
  flow.observations.items = { anyOf: variants };
  flow.modelUpdate.properties.previousRecommendationId = request.review
    ? { type: 'string', const: request.review.previousRecommendationId } : { type: 'null' };
  flow.modelUpdate.properties.status.enum = request.review
    ? ['insufficient_evidence', 'increase', 'decrease', 'split', 'relocate', 'unchanged'] : ['initial'];
  const action = schema.properties.actionSet.properties.actions.items;
  delete action.properties.agency.properties.relationship;
  action.properties.agency.required = ['systemChangeNeeded'];
  const learning = JSON.parse(JSON.stringify(action));
  learning.properties.kind = { type: 'string', const: 'learning_action' };
  learning.properties.competingPredictions.minItems = 2;
  const practical = JSON.parse(JSON.stringify(action));
  practical.properties.kind.enum = ['smallest_release', 'generative_action'];
  schema.properties.actionSet.properties.actions.items = { anyOf: [learning, practical] };
  return schema;
}
export async function decide(request, { signal, provider = process.env.RHEO_MODEL_PROVIDER || 'fixture', model = process.env.OPENAI_MODEL || 'gpt-5.4-mini', apiKey = process.env.OPENAI_API_KEY, fetchImpl = fetch } = {}) {
  validateRequest(request);
  if (signal?.aborted) throw new Error('Request stopped.');
  if (provider === 'fixture') return { ...validateDecision(fixtureDecision(request), request), provider, model: 'fixture', responseId: null, researchUsable: false };
  if (provider !== 'openai' || !apiKey) throw new Error('The experimental provider is not configured.');
  const response = await fetchImpl('https://api.openai.com/v1/responses', {
    method: 'POST', signal,
    headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model, store: false, reasoning: { effort: process.env.RHEO_REASONING_EFFORT || 'low' }, max_output_tokens: 10000,
      instructions: prompt,
      input: JSON.stringify({ request, sourceRecords: sourceRecords(request) }),
      text: { format: { type: 'json_schema', name: 'rheo_v010_decision', strict: true, schema: schemaForRequest(request) } },
    }),
  });
  if (!response.ok) throw new Error('The experimental provider could not complete this request.');
  const payload = await response.json();
  if (payload.status !== 'completed') throw new Error('The experimental response was incomplete.');
  const content = (payload.output || []).flatMap((item) => item.content || []).filter((item) => item.type === 'output_text').map((item) => item.text).join('');
  const result = deriveActionRelationships(JSON.parse(content));
  try { validateDecision(result, request); }
  catch (error) { error.rejectedOutput = result; throw error; }
  return { ...result, provider, model, responseId: payload.id || null, researchUsable: false };
}
