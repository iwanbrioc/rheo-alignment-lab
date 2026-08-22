// Rheo v0.6 longitudinal action–outcome loop.
// Reads the frozen v0.5 interview record from localStorage and stores action/outcome records separately.
(() => {
  const css=document.createElement('link');css.rel='stylesheet';css.href='action-outcome.css';document.head.appendChild(css);
  const $=id=>document.getElementById(id);
  const esc=s=>String(s??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]));
  const uid=()=>crypto?.randomUUID?.()||`rheo-${Date.now()}-${Math.random().toString(16).slice(2)}`;

  function currentInterview(){
    const candidates=[];
    for(let i=0;i<localStorage.length;i++){
      const key=localStorage.key(i);
      if(!key?.startsWith('rheo_interview_'))continue;
      try{const rec=JSON.parse(localStorage.getItem(key));if(rec?.caseId)candidates.push(rec);}catch{}
    }
    candidates.sort((a,b)=>String(b.startedAt||'').localeCompare(String(a.startedAt||'')));
    return candidates[0]||null;
  }
  const loopKey=id=>`rheo_action_loop_${id}`;
  function readLoop(caseId){
    try{return JSON.parse(localStorage.getItem(loopKey(caseId)))||null;}catch{return null;}
  }
  function initialLoop(interview){return {schemaVersion:'rheo-action-outcome-v0.6',caseId:interview.caseId,createdAt:new Date().toISOString(),actionSet:null,actionSetMeta:null,attempts:[],declines:[],updatedAt:new Date().toISOString()};}
  function writeLoop(loop){loop.updatedAt=new Date().toISOString();localStorage.setItem(loopKey(loop.caseId),JSON.stringify(loop));}
  function latestFlow(interview){return interview?.analyses?.at(-1)?.flow||interview?.latestFlow||null;}

  function install(){
    const host=$('workingPattern');
    if(!host)return;
    const section=document.createElement('section');
    section.id='actionOutcomeLoop';section.className='actionOutcomeLoop hidden';
    section.innerHTML=`
      <hr />
      <div class="eyebrow">From pattern to experiment</div>
      <h3>Three things worth trying</h3>
      <p class="muted">These are experiments, not instructions. Rheo freezes what it predicts before you act, so you can later compare the prediction with what actually happened.</p>
      <div id="actionLoopStatus" class="actionLoopStatus">No actions generated yet.</div>
      <div id="actionCards"></div>
      <div id="actionGenerateRow" class="actionButtons"><button id="generateActionsBtn" class="primary" type="button">Suggest three actions</button><button id="exportLongitudinalBtn" class="secondary" type="button">Export longitudinal record</button></div>
      <div id="nonePanel" class="nonePanel hidden"><label for="noneReason">None of these fit — why? <span class="muted">(optional)</span></label><textarea id="noneReason" rows="3"></textarea><button id="recordNoneBtn" class="secondary" type="button">Record “none of these”</button></div>
      <div id="outcomePanel" class="outcomePanel hidden"></div>`;
    host.insertAdjacentElement('afterend',section);
    $('generateActionsBtn').onclick=generateActions;
    $('exportLongitudinalBtn').onclick=exportLongitudinal;
    $('recordNoneBtn').onclick=recordNone;

    const observer=new MutationObserver(()=>syncVisibility());
    observer.observe(host,{attributes:true,attributeFilter:['class'],childList:true,subtree:true});
    syncVisibility();
  }

  function syncVisibility(){
    const section=$('actionOutcomeLoop'),pattern=$('workingPattern');if(!section||!pattern)return;
    const visible=!pattern.classList.contains('hidden')&&pattern.textContent.trim().length>0;
    section.classList.toggle('hidden',!visible);
    if(visible)renderFromStorage();
  }

  function renderFromStorage(){
    const interview=currentInterview();if(!interview)return;
    const loop=readLoop(interview.caseId)||initialLoop(interview);
    if(loop.actionSet)renderActionSet(loop,interview);
    else $('actionLoopStatus').textContent='When the working pattern feels useful enough, ask Rheo for three different experiments.';
  }

  async function generateActions(){
    const interview=currentInterview();if(!interview)return;
    const flow=latestFlow(interview);
    if(!flow){$('actionLoopStatus').textContent='No frozen flow diagnosis is available yet.';return;}
    const btn=$('generateActionsBtn');btn.disabled=true;$('actionLoopStatus').textContent='Rheo is turning the working diagnosis into three different experiments…';
    try{
      const testimony=(interview.turns||[]).filter(t=>t.role==='participant').map(t=>({role:'participant',text:t.text}));
      const r=await fetch('/api/rheo-actions',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({caseId:interview.caseId,testimony,flow})});
      const body=await r.json();if(!r.ok)throw new Error(body.error||'Action generation failed.');
      const loop=readLoop(interview.caseId)||initialLoop(interview);
      loop.actionSet=body.actionSet;
      loop.actionSetMeta={generatedAt:new Date().toISOString(),provider:body.provider,model:body.model,responseId:body.responseId,researchUsable:Boolean(body.researchUsable),sourceFlowSnapshot:flow};
      writeLoop(loop);renderActionSet(loop,interview);
      $('actionLoopStatus').textContent=body.researchUsable?'Three action experiments are frozen. Choose, modify, sequence or reject them.':'Fixture actions shown for interface testing only.';
    }catch(e){$('actionLoopStatus').textContent=`Rheo could not generate actions: ${e.message}`;}finally{btn.disabled=false;}
  }

  const kindLabel={smallest_release:'Smallest release',learning_action:'Learning action',generative_action:'Generative action'};
  function renderActionSet(loop,interview){
    const active=loop.attempts.find(a=>a.status==='chosen');
    const cards=(loop.actionSet?.actions||[]).map(a=>`<article class="actionCard" data-action-id="${esc(a.id)}">
      <div class="actionKind">${esc(kindLabel[a.kind]||a.kind)}</div>
      <h4>${esc(a.title)}</h4>
      <p class="actionText">${esc(a.action)}</p>
      <details><summary>Why this one?</summary><p>${esc(a.whyThisAction)}</p><p><strong>Aligned intervention:</strong> ${esc(a.alignedIntervention)}</p></details>
      <div class="predictionBox"><strong>If the diagnosis is right…</strong><p>${esc(a.prediction?.whatShouldBecomeMorePossible)}</p><small>Look for: ${esc(a.prediction?.observableSignal)} · Review: ${esc(a.prediction?.reviewHorizon)}</small></div>
      <details><summary>What could make us stop or change course?</summary><p>${esc(a.stopOrChangeSignal)}</p><p><strong>Possible costs elsewhere:</strong> ${esc((a.displacedCosts||[]).join('; ')||'None identified.')}</p><p><strong>Irreversibility:</strong> ${esc(a.irreversibilityCaution)}</p><p><strong>Assumptions:</strong> ${esc((a.assumptions||[]).join('; ')||'None listed.')}</p></details>
      <div class="activatorChips">${(a.activators||[]).map(x=>`<span>${esc(x)}</span>`).join('')}</div>
      <button class="secondary chooseActionBtn" type="button" data-action-id="${esc(a.id)}" ${active?'disabled':''}>${loop.attempts.some(x=>x.actionId===a.id&&x.status==='outcome_reported')?'Try this again':'I may try this'}</button>
    </article>`).join('');
    $('actionCards').innerHTML=`<div class="actionCardGrid">${cards}</div><button id="noneTheseBtn" class="ghost noneTheseBtn" type="button" ${active?'disabled':''}>None of these</button>`;
    $('noneTheseBtn').onclick=()=>{$('nonePanel').classList.remove('hidden');$('noneReason').focus();};
    document.querySelectorAll('.chooseActionBtn').forEach(b=>b.onclick=()=>chooseAction(b.dataset.actionId));
    if(active)renderOutcomeForm(loop,interview,active);else $('outcomePanel').classList.add('hidden');
  }

  function chooseAction(actionId){
    const interview=currentInterview();if(!interview)return;
    const loop=readLoop(interview.caseId);if(!loop?.actionSet)return;
    if(loop.attempts.some(a=>a.status==='chosen'))return;
    const action=loop.actionSet.actions.find(a=>a.id===actionId);if(!action)return;
    const attempt={attemptId:uid(),actionId,kind:action.kind,status:'chosen',chosenAt:new Date().toISOString(),proposalFrozen:JSON.parse(JSON.stringify(action)),actualAction:action.action,outcome:null,revisedFlow:null};
    loop.attempts.push(attempt);writeLoop(loop);$('nonePanel').classList.add('hidden');renderActionSet(loop,interview);
    $('actionLoopStatus').textContent='The proposal and prediction are now frozen. You can change what you actually do without changing what Rheo originally predicted.';
  }

  function renderOutcomeForm(loop,interview,attempt){
    const a=attempt.proposalFrozen;
    const panel=$('outcomePanel');panel.classList.remove('hidden');
    panel.innerHTML=`
      <hr/><div class="eyebrow">Life answers back</div><h3>Report what actually happened</h3>
      <p class="muted">You do not need to prove Rheo right. Unexpected, negative and ambiguous consequences are especially valuable.</p>
      <div class="frozenPrediction"><strong>Frozen prediction:</strong> ${esc(a.prediction?.whatShouldBecomeMorePossible)}<br><small>Observable signal: ${esc(a.prediction?.observableSignal)}</small></div>
      <label for="actualActionTaken">What did you actually do?</label><textarea id="actualActionTaken" rows="4">${esc(attempt.actualAction||a.action)}</textarea>
      <div class="outcomeGrid">
        <div><label for="actionWhen">When / over what period?</label><input id="actionWhen" placeholder="e.g. over the next 3 weeks" /></div>
        <div><label for="outcomeSource">Source of this outcome account</label><select id="outcomeSource"><option value="participant_testimony">Participant testimony</option><option value="externally_verified">Externally verified</option><option value="mixed">Mixed</option><option value="unknown">Unknown</option></select></div>
        <div><label for="outcomeConfidence">How certain are you about the account?</label><select id="outcomeConfidence"><option value="low">Low</option><option value="medium" selected>Medium</option><option value="high">High</option></select></div>
      </div>
      <label for="whatHappened">What happened?</label><textarea id="whatHappened" rows="5"></textarea>
      <div class="outcomeGrid two">
        <div><label for="becameEasier">What became easier or more possible?</label><textarea id="becameEasier" rows="4"></textarea></div>
        <div><label for="becameHarder">What became harder or less possible?</label><textarea id="becameHarder" rows="4"></textarea></div>
        <div><label for="unexpectedBenefitText">Any unexpected benefit?</label><textarea id="unexpectedBenefitText" rows="3"></textarea></div>
        <div><label for="unexpectedHarmText">Any unexpected harm or displaced cost?</label><textarea id="unexpectedHarmText" rows="3"></textarea></div>
        <div><label for="newAffordanceText">What new option appeared?</label><textarea id="newAffordanceText" rows="3"></textarea></div>
        <div><label for="lostAffordanceText">What option disappeared or became harder?</label><textarea id="lostAffordanceText" rows="3"></textarea></div>
      </div>
      <label for="diagnosisNow">Looking back, where do you now think the blockage was?</label><textarea id="diagnosisNow" rows="3" placeholder="It is fine to say the original diagnosis still seems right, or that you no longer know."></textarea>
      <h4>Consequence vector <span class="muted">(kept as categories, never added into a score)</span></h4>
      <div class="outcomeGrid">
        ${selectHtml('intendedEffect','Intended effect',['occurred','partly','not_observed','unclear'])}
        ${selectHtml('predictedPropagation','Predicted next transition',['observed','partly','not_observed','unclear'])}
        ${selectHtml('unexpectedBenefit','Unexpected benefit',['present','absent','unclear'])}
        ${selectHtml('unexpectedHarm','Unexpected harm / cost',['present','absent','unclear'])}
        ${selectHtml('affordanceChange','Future options',['expanded','mixed','contracted','unclear'])}
        ${selectHtml('generativeCapacity','Generative capability',['strengthened','unchanged','weakened','unclear'])}
        ${selectHtml('diagnosisRevision','Diagnosis / frame',['changed','unchanged','unclear'])}
        ${selectHtml('usefulness','Was the action useful?',['useful','mixed','not_useful','unclear'])}
      </div>
      <label for="outcomeNotes">Anything else that surprised you?</label><textarea id="outcomeNotes" rows="3"></textarea>
      <div class="actionButtons"><button id="saveOutcomeReport" class="primary" type="button">Save outcome</button><button id="abandonAttempt" class="ghost" type="button">I decided not to try it</button></div>`;
    $('saveOutcomeReport').onclick=()=>saveOutcome(attempt.attemptId);
    $('abandonAttempt').onclick=()=>abandonAttempt(attempt.attemptId);
    panel.scrollIntoView({behavior:'smooth',block:'start'});
  }

  function selectHtml(id,label,opts){return `<div><label for="${id}">${label}</label><select id="${id}">${opts.map(o=>`<option value="${o}" ${o==='unclear'?'selected':''}>${esc(o.replaceAll('_',' '))}</option>`).join('')}</select></div>`;}

  async function saveOutcome(attemptId){
    const interview=currentInterview();if(!interview)return;const loop=readLoop(interview.caseId);if(!loop)return;
    const attempt=loop.attempts.find(a=>a.attemptId===attemptId);if(!attempt)return;
    const actual=$('actualActionTaken').value.trim();
    const status=actual&&actual!==attempt.proposalFrozen.action?'modified':'tried';
    const outcome={
      outcomeId:uid(),reportedAt:new Date().toISOString(),actionStatus:status,actualAction:actual,actionWhen:$('actionWhen').value.trim(),source:$('outcomeSource').value,confidence:$('outcomeConfidence').value,
      narrative:{whatHappened:$('whatHappened').value.trim(),becameEasier:$('becameEasier').value.trim(),becameHarder:$('becameHarder').value.trim(),unexpectedBenefit:$('unexpectedBenefitText').value.trim(),unexpectedHarm:$('unexpectedHarmText').value.trim(),newAffordance:$('newAffordanceText').value.trim(),lostAffordance:$('lostAffordanceText').value.trim(),diagnosisNow:$('diagnosisNow').value.trim(),notes:$('outcomeNotes').value.trim()},
      consequenceVector:{intendedEffect:$('intendedEffect').value,predictedPropagation:$('predictedPropagation').value,unexpectedBenefit:$('unexpectedBenefit').value,unexpectedHarm:$('unexpectedHarm').value,affordanceChange:$('affordanceChange').value,generativeCapacity:$('generativeCapacity').value,diagnosisRevision:$('diagnosisRevision').value,actionStatus:status,usefulness:$('usefulness').value},
      frozenPrediction:JSON.parse(JSON.stringify(attempt.proposalFrozen.prediction))
    };
    attempt.status='outcome_reported';attempt.actualAction=actual;attempt.outcome=outcome;writeLoop(loop);
    await revisitDiagnosis(loop,interview,attempt);
    renderActionSet(loop,interview);
    $('actionLoopStatus').textContent='Outcome saved separately from the original prediction. You can now try another action, or export the longitudinal record.';
  }

  function abandonAttempt(attemptId){
    const interview=currentInterview();if(!interview)return;const loop=readLoop(interview.caseId);const a=loop?.attempts.find(x=>x.attemptId===attemptId);if(!a)return;
    a.status='abandoned';a.outcome={outcomeId:uid(),reportedAt:new Date().toISOString(),actionStatus:'abandoned',actualAction:'',narrative:{whatHappened:'Participant reported deciding not to try this action.'},consequenceVector:{intendedEffect:'not_observed',predictedPropagation:'not_observed',unexpectedBenefit:'unclear',unexpectedHarm:'unclear',affordanceChange:'unclear',generativeCapacity:'unclear',diagnosisRevision:'unclear',actionStatus:'abandoned',usefulness:'unclear'},frozenPrediction:JSON.parse(JSON.stringify(a.proposalFrozen.prediction))};
    writeLoop(loop);renderActionSet(loop,interview);$('actionLoopStatus').textContent='Recorded that this proposed action was not tried. No consequence has been inferred from that.';
  }

  async function revisitDiagnosis(loop,interview,attempt){
    const o=attempt.outcome;if(!o)return;
    const original=(interview.turns||[]).filter(t=>t.role==='participant').map((t,i)=>`Original testimony ${i+1}: ${t.text}`).join('\n\n');
    const n=o.narrative||{};
    const outcomeText=[`Action actually taken: ${o.actualAction}`,`When: ${o.actionWhen}`,`What happened: ${n.whatHappened}`,`Became easier/more possible: ${n.becameEasier}`,`Became harder/less possible: ${n.becameHarder}`,`Unexpected benefit: ${n.unexpectedBenefit}`,`Unexpected harm/displaced cost: ${n.unexpectedHarm}`,`New option: ${n.newAffordance}`,`Lost option: ${n.lostAffordance}`,`Participant's revised view of blockage: ${n.diagnosisNow}`,`Other surprise: ${n.notes}`].filter(x=>!x.endsWith(': ')).join('\n');
    const caseRecord={schemaVersion:'0.2',guideVersion:'0.6.0',caseId:interview.caseId,createdAt:interview.startedAt,context:{situation:`${original}\n\n--- LATER OUTCOME TESTIMONY ---\n${outcomeText}`,whatMatters:'',stakeholders:'',uncertainties:'Outcome report is later testimony and must not rewrite the original prediction.',decisionHorizon:'',recoveryHorizon:'',urgency:'Medium'},evidence:[],horizons:[],contractions:{primary:'',disconfirmingEvidence:'',missingPerspective:'',narratorImplicated:false},powerSafety:{fearRetaliation:'Unknown',constrainedExit:'Unknown',surveillanceControl:'Unknown',materialDependence:'Unknown',powerAsymmetry:'Unknown',notes:''},safetyGateActive:false,safetyUnresolved:true,viability:{foreclose:'',regenerate:'',viabilityFloor:'',trajectoryConcern:''},moves:[],admin:'',commandSignal:''};
    try{
      const r=await fetch('/api/rheo-flow',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({caseRecord})});const body=await r.json();
      if(r.ok){attempt.revisedFlow={at:new Date().toISOString(),provider:body.provider,model:body.model,responseId:body.responseId,researchUsable:Boolean(body.researchUsable),flow:body.flow};writeLoop(loop);}
    }catch{}
  }

  function recordNone(){
    const interview=currentInterview();if(!interview)return;const loop=readLoop(interview.caseId)||initialLoop(interview);
    loop.declines.push({declineId:uid(),at:new Date().toISOString(),reason:$('noneReason').value.trim(),actionSetSnapshot:loop.actionSet?JSON.parse(JSON.stringify(loop.actionSet)):null});writeLoop(loop);
    $('noneReason').value='';$('nonePanel').classList.add('hidden');$('actionLoopStatus').textContent='Recorded “none of these”. That is a valid outcome of the recommendation stage, not a failure to comply.';
  }

  function exportLongitudinal(){
    const interview=currentInterview();if(!interview)return;const loop=readLoop(interview.caseId)||initialLoop(interview);
    const payload={exportVersion:'0.6',exportedAt:new Date().toISOString(),researchBoundary:'Raw participant testimony, AI analyses, frozen action predictions and later outcome testimony are retained as distinct fields. No scalar RWB reward is computed.',interview,actionOutcomeLoop:loop};
    const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`rheo-longitudinal-${interview.caseId}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),600);
  }

  install();
})();
