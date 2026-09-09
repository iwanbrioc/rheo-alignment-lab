export const PLAIN_ENGLISH = `Use simple English for an adult reader. Use everyday words, active voice and short sentences, usually under 20 words. Split long lists into short sentences. Be warm and direct, not childish. Put the useful answer first. Give one clear action per step. Avoid jargon, abstract theory, long introductions and repeated disclaimers. Explain any necessary technical term in a few words. Say what you found or could not confirm; do not talk about internal notes or your processing. Keep important costs, dates, risks, conditions and uncertainty, even when they need extra words. Never make an uncertain claim sound certain.`;

export const DISPLAY_FIELDS = ['title', 'action', 'whyThisAction', 'falsifierOrChangeSignal'];
const FIELDS = ['id', 'kind', ...DISPLAY_FIELDS];
const KINDS = ['smallest_release', 'learning_action', 'generative_action'];
export const PLAIN_ACTION_SCHEMA = {
  type: 'object', additionalProperties: false, required: ['actions'], properties: {
    actions: { type: 'array', minItems: 3, maxItems: 3, items: {
      type: 'object', additionalProperties: false, required: FIELDS,
      properties: Object.fromEntries(FIELDS.map((field) => [field, { type: 'string' }])),
    } },
  },
};

export function displayActions(actions) {
  if (!Array.isArray(actions) || actions.length !== 3) throw new Error('Three options are required.');
  const result = actions.map((item, index) => {
    if (!item || item.kind !== KINDS[index]) throw new Error('The option order changed.');
    return Object.fromEntries(FIELDS.map((field) => {
      const text = item[field];
      if (typeof text !== 'string' || text.length > (field === 'id' ? 200 : 6000)
        || (['id', 'title', 'action'].includes(field) && !text.trim())) throw new Error('An option could not be read.');
      return [field, text];
    }));
  });
  if (new Set(result.map((item) => item.id)).size !== 3) throw new Error('Option IDs must be distinct.');
  return result;
}

export function validatePlainActions(value, originals) {
  const before = displayActions(originals);
  const after = displayActions(value?.actions);
  for (let i = 0; i < before.length; i++) {
    if (before[i].id !== after[i].id) throw new Error('An option ID changed.');
    for (const field of DISPLAY_FIELDS) {
      if (Boolean(before[i][field].trim()) !== Boolean(after[i][field].trim())) throw new Error('Option text was removed or added.');
      // Numbers and links must stay in the same field; meaning also needs human review.
      const tokens = (text) => [...text.matchAll(/https?:\/\/[^\s]+|\d+(?:[.,:]\d+)*/g)].map((match) => match[0]).sort();
      if (JSON.stringify(tokens(before[i][field])) !== JSON.stringify(tokens(after[i][field]))) throw new Error('A number or link changed.');
    }
  }
  return after;
}
