export const PREPARATION_CONSENT = 'research-and-draft-v1';
export const MAX_BRIEF_LENGTH = 2500;

const string = { type: 'string' };
const strings = { type: 'array', items: string };
export const PREPARATION_SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['summary', 'findings', 'draft', 'remainingSteps', 'uncertainties'],
  properties: {
    summary: string,
    findings: { type: 'array', items: {
      type: 'object', additionalProperties: false, required: ['text', 'sourceIds'],
      properties: { text: string, sourceIds: strings },
    } },
    draft: { type: 'object', additionalProperties: false, required: ['title', 'body'], properties: { title: string, body: string } },
    remainingSteps: strings,
    uncertainties: strings,
  },
};

export function safeSourceUrl(value) {
  if (typeof value !== 'string' || value.length > 2048) return null;
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase().replace(/\.$/, '');
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password
      || !host.includes('.') || host.includes(':') || /^\d+(\.\d+){3}$/.test(host)
      || /\.(local|localhost|internal|test|invalid)$/.test(host)) return null;
    return url.href;
  } catch { return null; }
}

function text(value, max) {
  if (typeof value !== 'string' || !value.trim() || value.length > max) throw new Error('Invalid preparation text');
  return value.trim();
}
function list(value, maxItems, maxLength) {
  if (!Array.isArray(value) || value.length > maxItems) throw new Error('Invalid preparation list');
  return value.map((item) => text(item, maxLength));
}
function timestamp(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d\d-\d\dT/.test(value) || !Number.isFinite(Date.parse(value))) throw new Error('Invalid preparation time');
  return value;
}

export function validatePreparationRequest(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
    || Object.keys(value).some((key) => !['id', 'brief', 'consent'].includes(key))
    || value.consent !== PREPARATION_CONSENT
    || typeof value.id !== 'string' || !/^prep-[a-zA-Z0-9-]{8,80}$/.test(value.id)) {
    throw new Error('Review the research brief and explicitly authorise preparation.');
  }
  const brief = text(value.brief, MAX_BRIEF_LENGTH);
  if (brief.length < 20) throw new Error('Add a little more detail to the research brief.');
  return { id: value.id, brief, consent: PREPARATION_CONSENT };
}

export function validatePreparationContent(value, sources) {
  if (!value || typeof value !== 'object' || !Array.isArray(value.findings) || value.findings.length > 8) throw new Error('Invalid preparation');
  const ids = new Set(sources.map((source) => source.id));
  return {
    summary: text(value.summary, 1200),
    findings: value.findings.map((finding) => {
      const sourceIds = list(finding.sourceIds, 4, 8);
      if (!sourceIds.length || sourceIds.some((id) => !ids.has(id))) throw new Error('Unsupported source reference');
      return { text: text(finding.text, 1200), sourceIds: [...new Set(sourceIds)] };
    }),
    draft: { title: text(value.draft?.title, 160), body: text(value.draft?.body, 6000) },
    remainingSteps: list(value.remainingSteps, 6, 600),
    uncertainties: list(value.uncertainties, 6, 600),
  };
}

export function validatePreparationResult(value) {
  if (!value || value.provider !== 'openai' || value.searchPerformed !== true
    || !Array.isArray(value.sources) || value.sources.length > 12) throw new Error('Invalid research result');
  const sources = value.sources.map((source) => {
    const url = safeSourceUrl(source.url);
    if (!url || !/^s\d{1,2}$/.test(source.id)) throw new Error('Invalid research source');
    return { id: source.id, url, title: text(source.title, 240), retrievedAt: timestamp(source.retrievedAt) };
  });
  if (new Set(sources.map((source) => source.id)).size !== sources.length) throw new Error('Duplicate source IDs');
  const content = validatePreparationContent(value, sources);
  const status = sources.length && content.findings.length ? 'prepared' : 'needs_you';
  if (value.status !== status) throw new Error('Unsupported completion claim');
  return { ...content, status, sources, provider: 'openai', searchPerformed: true,
    model: text(value.model, 100), completedAt: timestamp(value.completedAt) };
}
