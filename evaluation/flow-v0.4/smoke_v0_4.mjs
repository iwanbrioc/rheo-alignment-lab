import { spawn } from 'node:child_process';
import assert from 'node:assert/strict';

const port = 8098;
const env = {...process.env, PORT:String(port), RHEO_MODEL_PROVIDER:'fixture'};
const server = spawn(process.execPath, ['server_v0_4.mjs'], {env, stdio:['ignore','pipe','pipe']});
let stderr=''; server.stderr.on('data',d=>stderr+=d);

async function waitForHealth(){
  for(let i=0;i<60;i++){
    try{const r=await fetch(`http://127.0.0.1:${port}/api/health`);if(r.ok)return await r.json();}catch{}
    await new Promise(r=>setTimeout(r,100));
  }
  throw new Error(`server did not become healthy: ${stderr}`);
}

const caseRecord={
  schemaVersion:'0.4',guideVersion:'0.4.0',caseId:'flow-smoke-case',
  context:{situation:'A community programme has resources but a key option is not practically usable.',whatMatters:'Keep future choices open.'},
  evidence:[{id:'e1',text:'A key option is not practically usable.',provenance:'user_reported_observation',confidence:'medium',about:'system'}],
  horizons:[],flowModel:{},contractions:{},powerSafety:{},viability:{},moves:[]
};

try{
  const health=await waitForHealth();
  assert.equal(health.provider,'fixture');
  assert.equal(health.version,'0.4.0');
  assert.equal(health.flowPhysiology,true);

  const flowResponse=await fetch(`http://127.0.0.1:${port}/api/rheo-flow`,{
    method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({caseRecord})
  });
  const flowBody=await flowResponse.json();
  assert.equal(flowResponse.status,200,JSON.stringify(flowBody));
  assert.equal(flowBody.condition,'rheo_v0_4');
  assert.equal(flowBody.flow.schemaVersion,'0.4');
  assert.equal(flowBody.flow.caseId,'flow-smoke-case');
  assert.equal(flowBody.flow.flowRows.length,7);
  assert.equal(flowBody.flow.wellbeingActivators.length,7);
  assert.equal(flowBody.flow.primaryRestriction.alignedIntervention,flowBody.flow.alignedIntervention.intervention);
  assert.equal(flowBody.flow.propagationPrediction.nextDownsweepOrgan,'Values');
  assert.equal(flowBody.researchUsable,false,'fixture must not be research-usable');

  const sharedResponse=await fetch(`http://127.0.0.1:${port}/api/analyze`,{
    method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({condition:'rheo_v0_4',granularity:'standard',caseRecord})
  });
  const sharedBody=await sharedResponse.json();
  assert.equal(sharedResponse.status,200,JSON.stringify(sharedBody));
  assert.equal(sharedBody.condition,'rheo_v0_4');
  assert.equal(sharedBody.map.schemaVersion,'0.3','cross-condition reruns must keep the frozen ontology-neutral schema');
  assert.equal(sharedBody.map.caseId,'flow-smoke-case');

  console.log('v0.4 flow smoke passed: explicit physiology endpoint + v0.4 Rheo shared-map condition both validate under fixture mode.');
} finally {
  server.kill('SIGTERM');
}
