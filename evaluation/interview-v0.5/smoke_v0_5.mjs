import { spawn } from 'node:child_process';
import assert from 'node:assert/strict';

const port=8098;
const env={...process.env,PORT:String(port),RHEO_MODEL_PROVIDER:'fixture'};
const server=spawn(process.execPath,['server_v0_4.mjs'],{env,stdio:['ignore','pipe','pipe']});
let stderr='';server.stderr.on('data',d=>stderr+=d);

async function waitForHealth(){
  for(let i=0;i<60;i++){
    try{const r=await fetch(`http://127.0.0.1:${port}/api/health`);if(r.ok)return await r.json();}catch{}
    await new Promise(r=>setTimeout(r,100));
  }
  throw new Error(`server did not become healthy: ${stderr}`);
}

try{
  const health=await waitForHealth();
  assert.equal(health.version,'0.4.0');
  assert.equal(health.flowPhysiology,true);
  assert.equal(health.provider,'fixture');

  const caseRecord={
    schemaVersion:'0.2',guideVersion:'0.5.0',caseId:'interview-smoke',createdAt:new Date().toISOString(),
    context:{situation:'Testimony 1: Funding exists, but people still cannot use it to deliver the work.',whatMatters:'',stakeholders:'',uncertainties:'',decisionHorizon:'',recoveryHorizon:'',urgency:'Medium'},
    evidence:[{id:'t1',text:'Funding exists, but people still cannot use it to deliver the work.',provenance:'unknown',about:'unknown',confidence:'medium'}],
    horizons:[],contractions:{primary:'',disconfirmingEvidence:'',missingPerspective:'',narratorImplicated:false},
    powerSafety:{fearRetaliation:'Unknown',constrainedExit:'Unknown',surveillanceControl:'Unknown',materialDependence:'Unknown',powerAsymmetry:'Unknown',notes:''},
    safetyGateActive:false,safetyUnresolved:true,
    viability:{foreclose:'',regenerate:'',viabilityFloor:'',trajectoryConcern:''},moves:[],admin:'',commandSignal:''
  };

  const r=await fetch(`http://127.0.0.1:${port}/api/rheo-flow`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({caseRecord})});
  const body=await r.json();
  assert.equal(r.status,200,JSON.stringify(body));
  assert.equal(body.version,'0.4.0');
  assert.equal(body.condition,'rheo_v0_4');
  assert.equal(body.researchUsable,false);
  assert.equal(body.flow.schemaVersion,'0.4');
  assert.equal(body.flow.caseId,'interview-smoke');
  assert.equal(body.flow.flowRows.length,7);
  console.log('v0.5 interview smoke passed: testimony-shaped case -> v0.4 flow endpoint -> seven-row fixture diagnosis.');
} finally {
  server.kill('SIGTERM');
}
