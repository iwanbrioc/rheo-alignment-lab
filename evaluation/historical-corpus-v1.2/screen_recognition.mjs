#!/usr/bin/env node
import {readFile,writeFile,mkdir} from 'node:fs/promises';
const key=process.env.OPENAI_API_KEY||'';
const model=process.env.OPENAI_RECOGNITION_MODEL||process.env.OPENAI_MODEL||'gpt-5.6';
if(!key) throw new Error('OPENAI_API_KEY is not configured or exported in this Terminal.');
const corpus=JSON.parse(await readFile('CANDIDATES.json','utf8'));
const schema={type:'object',additionalProperties:false,required:['status','candidate','confidence','anchors','rationale'],properties:{status:{type:'string',enum:['recognized','not_recognized','uncertain']},candidate:{type:'string'},confidence:{type:'string',enum:['low','medium','high']},anchors:{type:'array',items:{type:'string'},maxItems:5},rationale:{type:'string'}}};
function text(raw){if(typeof raw.output_text==='string')return raw.output_text;for(const i of raw.output||[])for(const c of i.content||[])if(c.type==='output_text')return c.text;throw new Error('No output_text');}
async function probe(c){
 const instructions='You are a contamination detector for a historical reasoning benchmark, not a decision adviser. The brief deliberately removes names, dates, places, brands and later outcomes. Decide whether its remaining structure is nevertheless recognisable as one specific real historical event, organisation, programme or incident from prior knowledge. Do not call it recognized merely because it resembles a general archetype. Use recognized only if you can name one specific candidate and give at least two non-generic anchors. If several cases fit or you are unsure, return uncertain or not_recognized. Do not analyse what should have been done or infer the later outcome.';
 const body={model,instructions,input:[{role:'user',content:[{type:'input_text',text:JSON.stringify({context:c.context,evidence:c.evidence})}]}],text:{format:{type:'json_schema',name:'historical_recognition_probe_v1_2',strict:true,schema}},store:false};
 const t=Date.now();
 try{const r=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{Authorization:'Bearer '+key,'Content-Type':'application/json'},body:JSON.stringify(body)});const raw=await r.json();if(!r.ok)return{ok:false,error:raw?.error?.message||JSON.stringify(raw),httpStatus:r.status,ms:Date.now()-t};const x=JSON.parse(text(raw));if(x.status==='recognized'&&(!x.candidate||x.anchors.length<2))return{ok:false,error:'recognized result lacks specific candidate/two anchors',ms:Date.now()-t};return{ok:true,...x,model:raw.model||model,responseId:raw.id||null,ms:Date.now()-t};}catch(e){return{ok:false,error:e.message,ms:Date.now()-t};}
}
function bucket(r){if(!r.ok)return'ERROR';if(r.status==='not_recognized'&&r.confidence==='high')return'ELIGIBLE';if(r.status==='recognized'&&r.confidence==='high')return'CANONICAL';return'RESERVE';}
await mkdir('runs',{recursive:true});const results=[];
console.log(`Historical Corpus v1.2 recognition screen | candidates=${corpus.candidates.length} | model=${model}`);console.log('Eligibility: not_recognized/high only. No Rheo/control analyses are run.\n');
for(const c of corpus.candidates){const r=await probe(c),b=bucket(r);results.push({caseId:c.caseId,domain:c.domain,scale:c.scale,bucket:b,...r});console.log(`${c.caseId.padEnd(27)} ${b.padEnd(9)} ${r.ok?r.status+'/'+r.confidence+(r.candidate?' ('+r.candidate+')':''):r.error}`);}
const summary={ELIGIBLE:0,RESERVE:0,CANONICAL:0,ERROR:0};for(const r of results)summary[r.bucket]++;
await writeFile('runs/_recognition_screen.json',JSON.stringify({corpusVersion:'1.2-screen',createdAt:new Date().toISOString(),model,eligibilityRule:'not_recognized/high only',summary,results},null,2));
console.log(`\nSUMMARY | eligible=${summary.ELIGIBLE} | reserve=${summary.RESERVE} | canonical=${summary.CANONICAL} | errors=${summary.ERROR}`);if(summary.ERROR)process.exitCode=2;
