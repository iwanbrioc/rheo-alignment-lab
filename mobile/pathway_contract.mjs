export const PATHWAY_CONSENT = 'pathway-possibility-v1';
export const PATHWAY_FIELDS = ['need', 'gift', 'enablers', 'limits'];
export const PLAN_FIELDS = ['nextStep', 'why', 'check', 'care', 'stopIf', 'couldRemain'];
export const PLAN_SCHEMA = {
  type: 'object', additionalProperties: false, required: PLAN_FIELDS,
  properties: Object.fromEntries(PLAN_FIELDS.map((key) => [key, { type: 'string' }])),
};

function object(value, keys) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
    || Object.keys(value).some((key) => !keys.includes(key))) throw new Error('Unexpected pathway fields.');
}

function text(value, max, required = false) {
  if (typeof value !== 'string' || value.length > max || (required && !value.trim())) {
    throw new Error('Check the pathway text.');
  }
  return value.trim();
}

export function validatePathwayRequest(value) {
  object(value, [...PATHWAY_FIELDS, 'consent']);
  if (value.consent !== PATHWAY_CONSENT) throw new Error('Approve sharing these four fields first.');
  const fields = Object.fromEntries(PATHWAY_FIELDS.map((key) => [key, text(value[key], 1500, key === 'need')]));
  if (fields.need.length < 12) throw new Error('Add a little more about what is needed.');
  return { ...fields, consent: PATHWAY_CONSENT };
}

export function validatePathwayPlan(value) {
  object(value, PLAN_FIELDS);
  return Object.fromEntries(PLAN_FIELDS.map((key) => {
    const field = text(value[key], 1000, true);
    if ([...field.matchAll(/\p{L}/gu)].some(([letter]) => !/\p{Script=Latin}/u.test(letter))) {
      throw new Error('The suggestion was not returned in English.');
    }
    return [key, field];
  }));
}

export function validatePathwayResult(value) {
  object(value, ['plan', 'provider', 'model', 'createdAt', 'kind']);
  if (value.provider !== 'openai' || value.kind !== 'possibility'
    || typeof value.createdAt !== 'string' || !Number.isFinite(Date.parse(value.createdAt))) {
    throw new Error('This is not a pathway suggestion.');
  }
  return { plan: validatePathwayPlan(value.plan), provider: 'openai', model: text(value.model, 100, true),
    createdAt: value.createdAt, kind: 'possibility' };
}
