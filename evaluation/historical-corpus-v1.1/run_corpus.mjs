#!/usr/bin/env node
/**
 * Historical Corpus v1.1 runner.
 *
 * Runs repeated samples through Rheo + matched control against a live Rheo
 * server. Recognition contamination is probed separately with a neutral
 * OpenAI call using the local OPENAI_API_KEY; it never uses either condition's
 * system prompt.
 *
 * Usage:
 *   node run_corpus.mjs --base http://localhost:8080 --samples 3 --granularity standard
 *
 * Recommended before interpretation: --samples 5
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const v = argv[i];
    if (!v.startsWith('--')) continue;
    const k = v.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith('--')) out[k] = true;
    else { out[k] = next; i++; }
  }
  return out;
}
const args = parseArgs(process.argv.slice(2));
const BASE = args.base || 'http://localhost:8080';
const GRAN = args.granularity || 'standard';
const SAMPLES = Math.max(1, Number(args.samples || 3));
const OUT = args.out || 'runs';
const CONDITIONS = String(args.conditions || 'rheo,control').split(',').map(s=>s.trim()).filter(Boolean);
const RECOGNITION_MODEL = process.env.OPENAI_RECOGNITION_MODEL || process.env.OPENAI_MODEL || 'gpt-5.6';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const SKIP_RECOGNITION = Boolean(args['skip-recognition']);

if (!['coarse','standard','fine'].includes(GRAN)) throw new Error(`Unsupported granularity: ${GRAN}`);
for (const c of CONDITIONS) if (!['rheo','control'].includes(c)) throw new Error(`Unsupported condition: ${c}`);

function extractOutputText(response) {
  if (typeof response.output_text === 'string') return response.output_text;
  for (const item of response.output || []) {
    for (const content of item.content || []) {
      if (content.type === 'output_text' && typeof content.text === 'string') return content.text;
    }
  }
  throw new Error('Recognition response contained no output_text');
}

const recognitionSchema = {
  type:'object', additionalProperties:false,
  required:['status','candidate','confidence','anchors','rationale'],
  properties:{
    status:{type:'string',enum:['recognized','not_recognized','uncertain']},
    candidate:{type:'string'},
    confidence:{type:'string',enum:['low','medium','high']},
    anchors:{type:'array',items:{type:'string'},maxItems:5},
    rationale:{type:'string'}
  }
};

async function recognitionProbe(caseRecord) {
  if (SKIP_RECOGNITION) return { ran:false, status:'not_run', reason:'skip-recognition flag', excludePrimary:false };
  if (!OPENAI_API_KEY) return { ran:false, status:'not_run', reason:'OPENAI_API_KEY missing in runner environment', excludePrimary:false };
  const neutralBrief = { context:caseRecord.context, evidence:caseRecord.evidence };
  const instructions = [
    'You are a contamination detector for a historical reasoning benchmark, not a decision adviser.',
    'Decide whether this deliberately de-identified/transposed brief is nevertheless recognisable as one specific real historical event, organisation or incident from prior knowledge.',
    'Do not call it recognized merely because it resembles a general archetype. Use recognized only if you can name a specific candidate and identify at least two non-generic anchors that make that identification plausible.',
    'If several cases fit, or you only recognise an archetype, return uncertain or not_recognized.',
    'Do not analyse what the decision-maker should do.'
  ].join(' ');
  const body = {
    model:RECOGNITION_MODEL,
    instructions,
    input:[{role:'user',content:[{type:'input_text',text:JSON.stringify(neutralBrief)}]}],
    text:{format:{type:'json_schema',name:'historical_recognition_probe_v1_1',strict:true,schema:recognitionSchema}},
    store:false
  };
  const t0=Date.now();
  const res=await fetch('https://api.openai.com/v1/responses',{
    method:'POST',headers:{authorization:`Bearer ${OPENAI_API_KEY}`,'content-type':'application/json'},body:JSON.stringify(body)
  });
  const raw=await res.json();
  if(!res.ok) return {ran:true,ok:false,status:'probe_error',httpStatus:res.status,error:raw?.error?.message||JSON.stringify(raw),ms:Date.now()-t0,excludePrimary:false};
  try {
    const result=JSON.parse(extractOutputText(raw));
    const specific = result.status==='recognized' && result.confidence==='high' && String(result.candidate||'').trim() && Array.isArray(result.anchors) && result.anchors.length>=2;
    return {ran:true,ok:true,...result,ms:Date.now()-t0,model:raw.model||RECOGNITION_MODEL,excludePrimary:Boolean(specific)};
  } catch(e) {
    return {ran:true,ok:false,status:'probe_parse_error',error:e.message,ms:Date.now()-t0,excludePrimary:false};
  }
}

async function analyze(caseRecord, condition) {
  const t0 = Date.now();
  try {
    const res = await fetch(`${BASE}/api/analyze`, {
      method:'POST', headers:{'content-type':'application/json'},
      body:JSON.stringify({caseRecord,condition,granularity:GRAN})
    });
    const ms=Date.now()-t0;
    let body=null,text=null;
    const raw=await res.text();
    try { body=JSON.parse(raw); } catch { text=raw; }
    return {ok:res.ok,status:res.status,ms,body,text};
  } catch(e) {
    return {ok:false,status:0,ms:Date.now()-t0,body:null,text:null,transportError:e.message};
  }
}

function sampleName(caseId, condition, sample) {
  return `${caseId}.${condition}.s${String(sample).padStart(2,'0')}.result.json`;
}

async function main(){
  await mkdir(OUT,{recursive:true});
  const manifest=JSON.parse(await readFile('MANIFEST.json','utf8'));
  const casesLog=[];
  const samplesLog=[];
  console.log(`Historical Corpus v${manifest.corpusVersion} | base=${BASE} | granularity=${GRAN} | samples=${SAMPLES} | conditions=${CONDITIONS.join(',')}`);
  if (!OPENAI_API_KEY && !SKIP_RECOGNITION) console.log('WARNING: OPENAI_API_KEY is not set for the neutral recognition probe; primary recognition exclusions cannot be established.');

  for (const item of manifest.items) {
    const rec=JSON.parse(await readFile(item.case,'utf8'));
    const recognition=await recognitionProbe(rec);
    casesLog.push({caseId:rec.caseId,archetype:item.archetype,briefHash:item.briefHash,recognition});
    const rlabel = recognition.excludePrimary ? `EXCLUDE (${recognition.candidate})` : `${recognition.status || 'unknown'}${recognition.confidence?`/${recognition.confidence}`:''}`;
    console.log(`\n${rec.caseId} recognition: ${rlabel}`);

    for (const condition of CONDITIONS) {
      for (let sample=1; sample<=SAMPLES; sample++) {
        const r=await analyze(rec,condition);
        const body=r.body;
        const researchUsable=Boolean(body?.researchUsable);
        const provider=body?.provider || null;
        const record={
          caseId:rec.caseId,condition,sample,granularity:GRAN,ok:r.ok,status:r.status,ms:r.ms,
          provider,model:body?.model||null,responseId:body?.responseId||null,researchUsable,
          error:r.ok?null:(body||r.text||r.transportError||'unknown failure')
        };
        samplesLog.push(record);
        if(r.ok && body?.map){
          const envelope={corpusVersion:'1.1',caseId:rec.caseId,condition,sample,granularity:GRAN,provider,model:body.model||null,responseId:body.responseId||null,researchUsable,map:body.map};
          await writeFile(path.join(OUT,sampleName(rec.caseId,condition,sample)),JSON.stringify(envelope,null,1));
        }
        console.log(`  ${condition.padEnd(8)} s${String(sample).padStart(2,'0')} ${r.ok?'ok  ':'FAIL'} ${String(r.status).padEnd(4)} ${r.ms}ms${r.ok?'':`  ${JSON.stringify(record.error).slice(0,100)}`}`);
      }
    }
  }

  const log={
    corpusVersion:'1.1',createdAt:new Date().toISOString(),base:BASE,granularity:GRAN,samplesPerCondition:SAMPLES,conditions:CONDITIONS,
    recognitionModel:SKIP_RECOGNITION?null:RECOGNITION_MODEL,cases:casesLog,samples:samplesLog
  };
  await writeFile(path.join(OUT,'_run_log.json'),JSON.stringify(log,null,1));

  const failures=samplesLog.filter(x=>!x.ok);
  const fixture=samplesLog.filter(x=>x.ok && (!x.researchUsable || x.provider==='fixture'));
  const excluded=casesLog.filter(x=>x.recognition.excludePrimary);
  console.log(`\n${manifest.items.length} cases | ${samplesLog.length} attempted analysis samples | ${failures.length} failures | ${excluded.length} high-confidence recognition exclusions`);
  if(fixture.length) console.log(`WARNING: ${fixture.length} successful outputs are fixture/non-research. Do not score them as model evidence.`);
  if(failures.length){
    const by={}; for(const f of failures) by[f.caseId]=(by[f.caseId]||0)+1;
    console.log('FAILURES BY CASE (inspect clustering / missing-not-at-random):');
    for(const [cid,n] of Object.entries(by)) console.log(`  ${cid}: ${n}`);
  }
  if(!SKIP_RECOGNITION && !OPENAI_API_KEY) console.log('PRIMARY INTERPRETATION BLOCKED: recognition probe did not run. Set OPENAI_API_KEY and rerun before using recognition-filtered scores.');
}

main().catch(e=>{console.error(e);process.exit(1)});
