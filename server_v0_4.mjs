#!/usr/bin/env node
import { readFile, writeFile, unlink } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

// v0.4 wrapper: preserves server.mjs as the frozen v0.3.1 implementation,
// then creates a temporary server source with the new Rheo physiology condition
// and the explicit /api/rheo-flow endpoint wired in.

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SOURCE = path.join(HERE, 'server.mjs');
const TEMP = path.join(HERE, '.rheo-v0-4-server.tmp.mjs');

let text = await readFile(SOURCE, 'utf8');

function replaceOnce(source, from, to, label) {
  const first = source.indexOf(from);
  if (first < 0) throw new Error(`Could not patch ${label}: expected server.mjs marker not found`);
  if (source.indexOf(from, first + from.length) >= 0) throw new Error(`Could not patch ${label}: marker occurs more than once`);
  return source.replace(from, to);
}

text = replaceOnce(
  text,
  `const SCHEMA_PATH = path.join(HERE, 'schemas', 'structural-map-v0.3.schema.json');`,
  `const SCHEMA_PATH = path.join(HERE, 'schemas', 'structural-map-v0.3.schema.json');\nconst FLOW_SCHEMA_PATH = path.join(HERE, 'schemas', 'rheo-flow-v0.4.schema.json');`,
  'flow schema path'
);

text = replaceOnce(
  text,
  `const PROMPTS = {\n  rheo: path.join(HERE, 'prompts', 'rheo-v0.3-system-prompt.md'),\n  control: path.join(HERE, 'prompts', 'control-v0.3-system-prompt.md')\n};`,
  `const PROMPTS = {\n  rheo: path.join(HERE, 'prompts', 'rheo-v0.3-system-prompt.md'),\n  rheo_v0_4: path.join(HERE, 'prompts', 'rheo-v0.4-flow-system-prompt.md'),\n  control: path.join(HERE, 'prompts', 'control-v0.3-system-prompt.md')\n};`,
  'prompt paths'
);

text = replaceOnce(
  text,
  `const [schemaText, rheoPrompt, controlPrompt] = await Promise.all([\n  readFile(SCHEMA_PATH, 'utf8'),\n  readFile(PROMPTS.rheo, 'utf8'),\n  readFile(PROMPTS.control, 'utf8')\n]);\nconst schema = JSON.parse(schemaText);\nconst prompts = { rheo: rheoPrompt, control: controlPrompt };`,
  `const [schemaText, flowSchemaText, rheoPrompt, rheoV04Prompt, controlPrompt] = await Promise.all([\n  readFile(SCHEMA_PATH, 'utf8'),\n  readFile(FLOW_SCHEMA_PATH, 'utf8'),\n  readFile(PROMPTS.rheo, 'utf8'),\n  readFile(PROMPTS.rheo_v0_4, 'utf8'),\n  readFile(PROMPTS.control, 'utf8')\n]);\nconst schema = JSON.parse(schemaText);\nconst flowSchema = JSON.parse(flowSchemaText);\nconst prompts = { rheo: rheoPrompt, rheo_v0_4: rheoV04Prompt, control: controlPrompt };`,
  'prompt/schema loading'
);

text = replaceOnce(
  text,
  `const condition = body.condition === 'control' ? 'control' : body.condition === 'rheo' ? 'rheo' : null;\n      if (!condition) return json(res, 400, {error:'condition must be rheo or control', errorCode:'invalid_condition'});`,
  `const condition = ['rheo','rheo_v0_4','control'].includes(body.condition) ? body.condition : null;\n      if (!condition) return json(res, 400, {error:'condition must be rheo, rheo_v0_4, or control', errorCode:'invalid_condition'});`,
  'v0.4 condition parser'
);

const FLOW_CODE = String.raw`
const FLOW_PAIRS = [
  {rowId:'environment', intervention:'Re-enchantment', horizon:'Natural Environment', organ:'Resources'},
  {rowId:'culture', intervention:'Transformation', horizon:'Culture', organ:'Values'},
  {rowId:'infrastructure', intervention:'Creativity', horizon:'Infrastructure', organ:'Affordance'},
  {rowId:'society', intervention:'Dialogue', horizon:'Society', organ:'Support'},
  {rowId:'outer', intervention:'Curiosity', horizon:'Outer Self', organ:'Capacity'},
  {rowId:'inner', intervention:'Participation', horizon:'Inner Self', organ:'Wellbeing'},
  {rowId:'noself', intervention:'Nothing / Everything', horizon:'No Self', organ:'Everything / Nothing'}
];
const ACTIVATORS = ['Be Active','Be Creative','Connect','Keep Learning','Take Notice','Give','Let Go'];

function validateFlowDiagnosis(m, caseRecord, sourceIndex) {
  const errors = [];
  if (!m || typeof m !== 'object' || Array.isArray(m)) return ['flow diagnosis must be an object'];
  if (m.schemaVersion !== '0.4') errors.push('schemaVersion must be 0.4');
  if (m.caseId !== String(caseRecord?.caseId || '')) errors.push('model changed caseId');

  const propositionIds = new Set();
  if (!Array.isArray(m.propositions)) errors.push('propositions must be an array');
  else for (const [i,p] of m.propositions.entries()) {
    if (!p || typeof p !== 'object') { errors.push('propositions['+i+'] invalid'); continue; }
    if (propositionIds.has(p.id)) errors.push('duplicate proposition id: '+p.id);
    propositionIds.add(p.id);
    if (!Array.isArray(p.sourceRefs) || p.sourceRefs.length === 0) errors.push('propositions['+i+'].sourceRefs must cite input');
    else for (const ref of p.sourceRefs) if (!sourceIndex.refs.has(ref)) errors.push('unknown source ref: '+ref);
    if (p.provenance === 'verified_external' && !p.sourceRefs.some(ref => sourceIndex.verifiedExternalRefs.has(ref))) {
      errors.push('verified_external proposition lacks verified source');
    }
  }

  function propRefs(refs, label, requireOne=true) {
    if (!Array.isArray(refs)) { errors.push(label+' must be an array'); return; }
    if (requireOne && refs.length===0) errors.push(label+' must cite at least one proposition');
    for (const ref of refs) if (!propositionIds.has(ref)) errors.push(label+' contains unknown proposition ref: '+ref);
  }

  if (!Array.isArray(m.flowRows) || m.flowRows.length !== 7) errors.push('flowRows must contain exactly seven rows');
  else {
    const seen = new Set();
    for (const row of m.flowRows) {
      const expected = FLOW_PAIRS.find(x => x.rowId === row.rowId);
      if (!expected) { errors.push('unknown flow row: '+row.rowId); continue; }
      if (seen.has(row.rowId)) errors.push('duplicate flow row: '+row.rowId);
      seen.add(row.rowId);
      for (const k of ['intervention','horizon','organ']) if (row[k] !== expected[k]) errors.push(row.rowId+' '+k+' must be '+expected[k]);
      propRefs(row.evidenceRefs, 'flowRows.'+row.rowId+'.evidenceRefs', false);
    }
    for (const pair of FLOW_PAIRS) if (!seen.has(pair.rowId)) errors.push('missing flow row: '+pair.rowId);
  }

  const pr = m.primaryRestriction || {};
  const pair = FLOW_PAIRS.find(x => x.rowId === pr.rowId);
  if (!pair) errors.push('primaryRestriction.rowId invalid');
  else {
    if (pr.organ !== pair.organ) errors.push('primaryRestriction organ does not match row');
    if (pr.horizon !== pair.horizon) errors.push('primaryRestriction horizon does not match row');
    if (pr.alignedIntervention !== pair.intervention) errors.push('primaryRestriction intervention does not match row');
    if (m.alignedIntervention?.intervention !== pair.intervention) errors.push('alignedIntervention does not match primary row');
    const idx = FLOW_PAIRS.findIndex(x => x.rowId === pair.rowId);
    const expectedNext = FLOW_PAIRS[(idx+1)%FLOW_PAIRS.length].organ;
    if (m.propagationPrediction?.nextDownsweepOrgan !== expectedNext) errors.push('nextDownsweepOrgan must follow the fixed downsweep order: '+expectedNext);
  }
  propRefs(pr.evidenceRefs, 'primaryRestriction.evidenceRefs');
  propRefs(m.alignedIntervention?.evidenceRefs, 'alignedIntervention.evidenceRefs');
  propRefs(m.frameRelocation?.evidenceRefs, 'frameRelocation.evidenceRefs', false);
  propRefs(m.irreversibility?.evidenceRefs, 'irreversibility.evidenceRefs', false);
  propRefs(m.safetyCaution?.evidenceRefs, 'safetyCaution.evidenceRefs', ['caution','high'].includes(m.safetyCaution?.level));

  if (!Array.isArray(m.wellbeingActivators) || m.wellbeingActivators.length !== 7) errors.push('wellbeingActivators must contain exactly seven items');
  else {
    const names = new Set(m.wellbeingActivators.map(x => x.name));
    for (const name of ACTIVATORS) if (!names.has(name)) errors.push('missing wellbeing activator: '+name);
    if (names.size !== 7) errors.push('wellbeingActivators must not contain duplicates');
  }
  return errors;
}

function fixtureFlow(caseRecord, sourceIndex) {
  const caseId = String(caseRecord?.caseId || 'fixture-case');
  const refs = [...sourceIndex.refs];
  const sourceRef = refs.includes('case.context.situation') ? 'case.context.situation' : refs[0];
  const propositions = [{id:'p1',text:String(caseRecord?.context?.situation||'No situation supplied'),provenance:'user_reported_observation',confidence:'low',contested:false,sourceRefs:[sourceRef]}];
  return {
    schemaVersion:'0.4', caseId, propositions,
    frameRelocation:{narratorAsOrdinaryNode:'Fixture cannot establish narrator position.',problemDescriptionAsObject:'Fixture does not reinterpret the problem frame.',relocatedFrame:'Unknown.',evidenceRefs:['p1'],confidence:'low'},
    flowRows:FLOW_PAIRS.map((x,i)=>({...x,state:i===0?'uncertain':'uncertain',rationale:'Fixture provider does not diagnose flow.',evidenceRefs:['p1']})),
    primaryRestriction:{rowId:'environment',organ:'Resources',horizon:'Natural Environment',alignedIntervention:'Re-enchantment',diagnosis:'No real diagnosis in fixture mode.',visibleSymptoms:[],evidenceRefs:['p1'],confidence:'low'},
    alignedIntervention:{intervention:'Re-enchantment',smallestSufficientInfluence:'No real intervention in fixture mode.',whyThisFits:'Fixture only.',doNotOverdetermine:'Do not treat fixture output as advice.',evidenceRefs:['p1']},
    wellbeingActivators:ACTIVATORS.map(name=>({name,emphasis:'available',application:'Available; fixture mode does not prioritise it.'})),
    propagationPrediction:{nextDownsweepOrgan:'Values',ifReleasedThen:'Unknown in fixture mode.',observableSignal:'Unknown.',reviewHorizon:'Unknown.',falsifier:'Any real evidence should replace the fixture.',relocationTrigger:'Any real evidence should replace the fixture.'},
    irreversibility:{boundaryToProtect:'Unknown.',emergenceNotToConstrain:'Unknown.',displacedCosts:[],evidenceRefs:['p1']},
    safetyCaution:{level:'unknown',indicators:[],evidenceRefs:[],uncertainty:'Fixture provider cannot assess safety.'},
    specificitySelfCheck:'generic'
  };
}

async function analyzeFlowWithOpenAI(caseRecord, sourceIndex) {
  if (!OPENAI_API_KEY) throw new Error('OPENAI_API_KEY is not configured');
  const userText = [
    'Analyze the CASE_RECORD below using the v0.4 Rheo flow physiology.',
    'Preserve CASE_RECORD.caseId exactly in the output.',
    'For every proposition.sourceRefs value, use ONLY an exact string from ALLOWED_SOURCE_REFS. For all later evidenceRefs, use ONLY proposition ids created in this output.',
    'ALLOWED_SOURCE_REFS:', JSON.stringify([...sourceIndex.refs]),
    'CASE_RECORD:', JSON.stringify(caseRecord)
  ].join('\n\n');
  const body = {
    model: OPENAI_MODEL,
    instructions: prompts.rheo_v0_4,
    input:[{role:'user',content:[{type:'input_text',text:userText}]}],
    text:{format:{type:'json_schema',name:'rheo_flow_v0_4',strict:true,schema:strictOutputSchema(flowSchema)}},
    store:false
  };
  const response = await fetch('https://api.openai.com/v1/responses', {
    method:'POST',
    headers:{'authorization':'Bearer '+OPENAI_API_KEY,'content-type':'application/json'},
    body:JSON.stringify(body)
  });
  const raw = await response.json();
  if (!response.ok) {
    const err = new Error('OpenAI Responses API '+response.status+': '+(raw?.error?.message || JSON.stringify(raw)));
    err.code='openai_api_error'; throw err;
  }
  let flow;
  try { flow = JSON.parse(extractOutputText(raw)); }
  catch (cause) { const err=new Error('Could not parse v0.4 flow output: '+cause.message); err.code='model_output_parse_error'; throw err; }
  return {flow,model:raw.model||OPENAI_MODEL,responseId:raw.id||null,provider:'openai',researchUsable:true};
}

async function analyzeFlow(caseRecord, sourceIndex) {
  if (MODEL_PROVIDER === 'fixture') return {flow:fixtureFlow(caseRecord,sourceIndex),model:'fixture-v0.4',responseId:null,provider:'fixture',researchUsable:false};
  if (MODEL_PROVIDER !== 'openai') throw new Error('Unsupported RHEO_MODEL_PROVIDER: '+MODEL_PROVIDER);
  return analyzeFlowWithOpenAI(caseRecord, sourceIndex);
}
`;

text = replaceOnce(
  text,
  `async function analyze(caseRecord, condition, granularity, challenges, sourceIndex) {`,
  `${FLOW_CODE}\nasync function analyze(caseRecord, condition, granularity, challenges, sourceIndex) {`,
  'flow implementation insertion'
);

const FLOW_ROUTE = String.raw`
    if (req.method === 'POST' && url.pathname === '/api/rheo-flow') {
      const body = await readJsonBody(req);
      if (!body.caseRecord || typeof body.caseRecord !== 'object') return json(res, 400, {error:'caseRecord object is required', errorCode:'missing_case_record'});
      const sourceIndex = buildSourceReferenceIndex(body.caseRecord, []);
      if (!sourceIndex.refs.size) return json(res, 400, {error:'caseRecord must contain at least one non-empty source value', errorCode:'empty_case_record'});
      const result = await analyzeFlow(body.caseRecord, sourceIndex);
      const errors = validateFlowDiagnosis(result.flow, body.caseRecord, sourceIndex);
      if (errors.length) return json(res, 502, {error:'model output failed v0.4 flow validation', errorCode:'flow_output_validation_failed', details:errors});
      return json(res, 200, {
        version:'0.4.0', condition:'rheo_v0_4', provider:result.provider, researchUsable:result.researchUsable,
        model:result.model, responseId:result.responseId, flow:result.flow
      });
    }
`;

text = replaceOnce(
  text,
  `    if (req.method === 'POST' && url.pathname === '/api/analyze') {`,
  `${FLOW_ROUTE}    if (req.method === 'POST' && url.pathname === '/api/analyze') {`,
  'flow route insertion'
);

text = text.replace(`version:'0.3.1',\n        provider:MODEL_PROVIDER`, `version:'0.4.0',\n        flowPhysiology:true,\n        provider:MODEL_PROVIDER`);
text = text.replace(`Rheo v0.3.1 server listening`, `Rheo v0.4 flow server listening`);

await writeFile(TEMP, text, 'utf8');
try {
  await import(`${pathToFileURL(TEMP).href}?v=${Date.now()}`);
  await unlink(TEMP).catch(() => {});
} catch (err) {
  await unlink(TEMP).catch(() => {});
  throw err;
}
