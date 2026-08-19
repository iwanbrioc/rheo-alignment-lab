function statusOf(id){
  const r=document.querySelector(`input[name="${id}Status"]:checked`);
  return r?r.value:(id==='noself'?'not-scored':'uncertain');
}

function horizonData(){
  return horizons.map(h=>({
    id:h.id,triplet:h.triplet,title:h.title,status:statusOf(h.id),notes:$(h.id+'Notes').value.trim()
  }));
}

function collectContractionSuggestions(){
  if(!$('contractionSuggestions')) return;
  const items=horizonData().filter(h=>h.status==='restriction'||(h.notes&&h.status!=='irrelevant'));
  $('contractionSuggestions').innerHTML=items.length?items.map(h=>
    `<button class="chip" type="button" data-h="${h.id}">${h.title}: reuse my marked signal</button>`
  ).join(''):'<span class="muted">Mark restrictions or add horizon observations to surface your own signals here.</span>';
  document.querySelectorAll('.chip[data-h]').forEach(btn=>btn.onclick=()=>{
    const h=horizonData().find(x=>x.id===btn.dataset.h);
    const addition=`Narrator-marked signal in ${h.title}${h.notes?`: ${h.notes}`:''}. This is user-supplied material, not an AI-derived causal finding. The causal origin remains open to testing.`;
    $('primaryContraction').value=[$('primaryContraction').value.trim(),addition].filter(Boolean).join('\n\n');
  });
}

function onNarratorImplication(e){
  if(e.target.checked && !narratorImplicationLogged){
    narratorImplicationLogged=true;
    logEvent('first_narrator_implication',{step});
  }
}

function powerSafetyData(){
  return {
    fearRetaliation:$('fearRetaliation').value,
    constrainedExit:$('constrainedExit').value,
    surveillanceControl:$('surveillanceControl').value,
    materialDependence:$('materialDependence').value,
    powerAsymmetry:$('powerAsymmetry').value,
    notes:$('safetyNotes').value.trim()
  };
}

function safetyGateActive(){
  const p=powerSafetyData();
  // v0.3: Unknown is epistemic caution, not affirmative safety.
  // The form-level gate clears only when every indicator is explicitly "No indication".
  return Object.entries(p).some(([k,v])=>k!=='notes' && ['Unknown','Possible','Present'].includes(v));
}

function updateSafetyGate(){
  const active=safetyGateActive();
  $('safetyGateNotice').classList.toggle('hidden',!active);
  $('powerGrid').classList.toggle('riskPresent',active);
  if(active)logEvent('safety_gate_active',powerSafetyData());
}

function addMove(seed={}){
  moveCount++;
  const wrap=document.createElement('div');wrap.className='move';wrap.dataset.move=moveCount;
  wrap.innerHTML=`<h3>Move ${moveCount}</h3>
    <label>Possible action</label><textarea class="moveAction" rows="3">${escapeTextarea(seed.action||'')}</textarea>
    <div class="grid two">
      <div><label>Which working restriction might it address?</label><textarea class="moveRestriction" rows="3">${escapeTextarea(seed.restriction||'')}</textarea></div>
      <div><label>What new affordance might it create?</label><textarea class="moveAffordance" rows="3">${escapeTextarea(seed.affordance||'')}</textarea></div>
      <div><label>Who or what could pay a displaced cost?</label><textarea class="moveCost" rows="3">${escapeTextarea(seed.displacedCost||'')}</textarea></div>
      <div><label>What future option could it foreclose?</label><textarea class="moveForeclose" rows="3">${escapeTextarea(seed.foreclose||'')}</textarea></div>
      <div><label>Smallest reversible test</label><textarea class="moveTest" rows="3">${escapeTextarea(seed.reversibleTest||'')}</textarea></div>
      <div><label>Whose voice / independent support is needed?</label><textarea class="moveDialogue" rows="3">${escapeTextarea(seed.dialogue||'')}</textarea></div>
      <div><label>Evidence supporting this move</label><textarea class="moveEvidence" rows="3">${escapeTextarea(seed.evidence||'')}</textarea></div>
      <div><label>What observation would stop or revise it?</label><textarea class="moveStop" rows="3">${escapeTextarea(seed.stopSignal||'')}</textarea></div>
    </div>`;
  $('moves').appendChild(wrap);
}

function movesData(){
  return [...document.querySelectorAll('.move')].map((m,i)=>({
    number:i+1,
    action:m.querySelector('.moveAction').value.trim(),
    restriction:m.querySelector('.moveRestriction').value.trim(),
    affordance:m.querySelector('.moveAffordance').value.trim(),
    displacedCost:m.querySelector('.moveCost').value.trim(),
    foreclose:m.querySelector('.moveForeclose').value.trim(),
    reversibleTest:m.querySelector('.moveTest').value.trim(),
    dialogue:m.querySelector('.moveDialogue').value.trim(),
    evidence:m.querySelector('.moveEvidence').value.trim(),
    stopSignal:m.querySelector('.moveStop').value.trim()
  })).filter(m=>Object.entries(m).some(([k,v])=>k!=='number'&&typeof v==='string'&&v));
}

function data(){
  return {
    schemaVersion:'0.2',
    caseId:caseId||safeUUID(),
    createdAt:new Date().toISOString(),
    context:{
      situation:$('context').value.trim(),
      whatMatters:$('whatMatters').value.trim(),
      stakeholders:$('stakeholders').value.trim(),
      uncertainties:$('uncertainties').value.trim(),
      decisionHorizon:$('decisionHorizon').value.trim(),
      recoveryHorizon:$('recoveryHorizon').value.trim(),
      urgency:$('urgency').value
    },
    evidence:evidenceData(),
    horizons:horizonData(),
    contractions:{
      primary:$('primaryContraction').value.trim(),
      disconfirmingEvidence:$('disconfirmingEvidence').value.trim(),
      missingPerspective:$('missingPerspective').value.trim(),
      narratorImplicated:$('narratorImplicated').checked
    },
    powerSafety:powerSafetyData(),
    safetyGateActive:safetyGateActive(),
    viability:{
      foreclose:$('foreclose').value.trim(),
      regenerate:$('regenerate').value.trim(),
      viabilityFloor:$('viabilityFloor').value.trim(),
      trajectoryConcern:$('trajectoryConcern').value.trim()
    },
    moves:movesData(),
    admin:$('admin').value.trim(),
    commandSignal:$('commandSignal').value.trim()
  };
}
