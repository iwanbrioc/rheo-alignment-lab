import { spawn } from 'node:child_process';
import assert from 'node:assert/strict';

const port=8106;
const env={...process.env,PORT:String(port),RHEO_INNER_PORT:String(port+1),RHEO_MODEL_PROVIDER:'fixture'};
const server=spawn(process.execPath,['server_v0_6.mjs'],{env,stdio:['ignore','pipe','pipe']});
let stderr='';server.stderr.on('data',d=>stderr+=d);

async function waitForHealth(){
  for(let i=0;i<80;i++){
    try{
      const r=await fetch(`http://127.0.0.1:${port}/api/health`);const b=await r.json();
      if(r.ok&&b.version==='0.6.0'&&b.actionOutcomeLoop===true)return b;
    }catch{}
    await new Promise(r=>setTimeout(r,100));
  }
  throw new Error(`v0.6 server did not become healthy: ${stderr}`);
}

try{
  const health=await waitForHealth();
  assert.equal(health.provider,'fixture');

  const caseRecord={schemaVersion:'0.2',guideVersion:'0.6.0',caseId:'smoke-v06',context:{situation:'A participant says a project has resources but no practical route to use them.'},evidence:[],horizons:[],contractions:{},powerSafety:{},viability:{},moves:[]};
  const flowRes=await fetch(`http://127.0.0.1:${port}/api/rheo-flow`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({caseRecord})});
  const flowBody=await flowRes.json();
  assert.equal(flowRes.status,200,JSON.stringify(flowBody));
  assert.equal(flowBody.flow.schemaVersion,'0.4');

  const actionRes=await fetch(`http://127.0.0.1:${port}/api/rheo-actions`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({caseId:'smoke-v06',testimony:[{role:'participant',text:'We have resources but no usable route to act.'}],flow:flowBody.flow})});
  const actionBody=await actionRes.json();
  assert.equal(actionRes.status,200,JSON.stringify(actionBody));
  assert.equal(actionBody.version,'0.6.0');
  assert.equal(actionBody.researchUsable,false);
  assert.equal(actionBody.actionSet.schemaVersion,'0.6');
  assert.equal(actionBody.actionSet.caseId,'smoke-v06');
  assert.equal(actionBody.actionSet.actions.length,3);
  assert.deepEqual(new Set(actionBody.actionSet.actions.map(x=>x.kind)),new Set(['smallest_release','learning_action','generative_action']));
  assert.equal(actionBody.actionSet.noneIsValid,true);
  for(const a of actionBody.actionSet.actions){
    assert.ok(a.prediction.whatShouldBecomeMorePossible);
    assert.ok(a.prediction.observableSignal);
    assert.ok(a.stopOrChangeSignal);
  }
  console.log('v0.6 smoke passed: v0.4 flow proxy -> three frozen action types -> predictions/falsifiers -> fixture research boundary.');
} finally {
  server.kill('SIGTERM');
}
