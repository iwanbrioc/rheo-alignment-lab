import { spawn } from 'node:child_process';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';

const port = 8097;
const env = {...process.env, PORT:String(port), RHEO_MODEL_PROVIDER:'fixture'};
const server = spawn(process.execPath, ['server.mjs'], {env, stdio:['ignore','pipe','pipe']});
let stderr=''; server.stderr.on('data',d=>stderr+=d);

async function waitForHealth(){
  for(let i=0;i<50;i++){
    try{const r=await fetch(`http://127.0.0.1:${port}/api/health`);if(r.ok)return await r.json();}catch{}
    await new Promise(r=>setTimeout(r,100));
  }
  throw new Error(`server did not become healthy: ${stderr}`);
}

async function analyze(condition, caseRecord){
  const r=await fetch(`http://127.0.0.1:${port}/api/analyze`,{
    method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({condition,granularity:'standard',caseRecord})
  });
  const body=await r.json();
  assert.equal(r.status,200,JSON.stringify(body));
  return body;
}

let dir;
try{
  const health=await waitForHealth();
  assert.equal(health.provider,'fixture');
  const caseRecord={schemaVersion:'0.2',caseId:'smoke-case',context:{situation:'A decision is being made from one supplied account.'},evidence:[],horizons:[],contractions:{},powerSafety:{},viability:{},moves:[]};
  const rheo=await analyze('rheo',caseRecord);
  const control=await analyze('control',caseRecord);
  assert.equal(rheo.map.schemaVersion,'0.3');
  assert.equal(control.map.schemaVersion,'0.3');
  assert.equal(rheo.map.caseId,'smoke-case');
  assert.deepEqual(Object.keys(rheo.map).sort(),Object.keys(control.map).sort(),'conditions must have identical output field opportunities');
  assert.equal(rheo.map.safetyCaution.level,'unknown','fixture must demonstrate that missing safety evidence is not affirmative safety');

  dir=await mkdtemp(path.join(tmpdir(),'rheo-v03-'));
  await writeFile(path.join(dir,'a.json'),JSON.stringify(rheo.map,null,2));
  await writeFile(path.join(dir,'b.json'),JSON.stringify(control.map,null,2));
  await writeFile(path.join(dir,'manifest.json'),JSON.stringify({pairs:[{pair_id:'smoke',family:'pipeline',a:'a.json',b:'b.json'}]},null,2));
  const py=spawn('python3',['evaluation/harness.py','screen-pairs',path.join(dir,'manifest.json')],{stdio:['ignore','pipe','pipe']});
  let out='',err='';py.stdout.on('data',d=>out+=d);py.stderr.on('data',d=>err+=d);
  const code=await new Promise(resolve=>py.on('close',resolve));
  assert.equal(code,0,err);
  assert.match(out,/mean_coverage=/);
  console.log('v0.3 smoke passed: both conditions -> same schema -> live API output -> evaluator.');
  console.log(out.trim());
} finally {
  server.kill('SIGTERM');
  if(dir)await rm(dir,{recursive:true,force:true});
}
