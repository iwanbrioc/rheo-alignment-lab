function statusOf(id){
  const r=document.querySelector(`input[name="${id}Status"]:checked`);
  return r?r.value:'uncertain';
}

function horizonData(){
  return horizons.map(h=>({
    id:h.id,
    intervention:h.intervention,
    horizon:h.horizon,
    organ:h.organ,
    triplet:h.triplet,
    title:h.title,
    status:statusOf(h.id),
    notes:$(h.id+'Notes').value.trim()
  }));
}

function primaryFlowData(){
  const rowId=$('primaryFlowRow')?.value||'';
  if(!rowId)return {rowId:'',organ:'',horizon:'',alignedIntervention:'',diagnosis:$('primaryContraction').value.trim()};
  const h=flowPair(rowId);
  return {
    rowId,
    organ:h.organ,
    horizon:h.horizon,
    alignedIntervention:h.intervention,
    diagnosis:$('primaryContraction').value.trim()
  };
}

function activatorData(){
  return wellbeingActivators.map(([id,name,description])=>({
    id,
    name,
    foreground:Boolean($(`activator_${id}`)?.checked),
    description
  }));
}

function collectContractionSuggestions(){
  if(!$('contractionSuggestions')) return;
  const items=horizonData().filter(h=>['restricted','severed'].includes(h.status)||(h.notes&&h.status!=='flowing'));
  $('contractionSuggestions').innerHTML=items.length?items.map(h=>
    `<button class="chip" type="button" data-h="${h.id}">${h.organ}: use what I noticed here</button>`
  ).join(''):'<span class="muted">Mark an organ as restricted or severed, or add a note, and Rheo can bring your own observation into the diagnosis.</span>';
  document.querySelectorAll('.chip[data-h]').forEach(btn=>btn.onclick=()=>{
    const h=horizonData().find(x=>x.id===btn.dataset.h);
    $('primaryFlowRow').value=h.id;
    updateAlignedIntervention();
    const addition=`You marked possible restriction in ${h.organ} through the ${h.horizon} horizon${h.notes?`: ${h.notes}`:''}. The aligned intervention is ${h.intervention}. This remains your working observation, not an AI finding.`;
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
  return Object.entries(p).some(([k,v])=>k!=='notes' && ['Possible','Present'].includes(v));
}

function safetyUnresolved(){
  const p=powerSafetyData();
  return Object.entries(p).some(([k,v])=>k!=='notes' && v==='Unknown');
}

function updateSafetyGate(){
  const active=safetyGateActive();
  const unresolved=safetyUnresolved();
  $('safetyGateNotice').classList.toggle('hidden',!active);
  if($('safetyUnknownNotice')) $('safetyUnknownNotice').classList.toggle('hidden',active||!unresolved);
  $('powerGrid').classList.toggle('riskPresent',active);
  if(active)logEvent('safety_gate_active',powerSafetyData());
}

function addMove(seed={}){
  moveCount++;
  const wrap=document.createElement('div');wrap.className='move';wrap.dataset.move=moveCount;
  wrap.innerHTML=`<h3>Option ${moveCount}</h3>
    <label>What could you try?</label><textarea class="moveAction" rows="3">${escapeTextarea(seed.action||'')}</textarea>
    <div class="grid two">
      <div><label>Which restriction might this release?</label><textarea class="moveRestriction" rows="3">${escapeTextarea(seed.restriction||'')}</textarea></div>
      <div><label>What new flow or option might this make possible?</label><textarea class="moveAffordance" rows="3">${escapeTextarea(seed.affordance||'')}</textarea></div>
      <div><label>Who or what might pay a price for it?</label><textarea class="moveCost" rows="3">${escapeTextarea(seed.displacedCost||'')}</textarea></div>
      <div><label>What future option could it close off?</label><textarea class="moveForeclose" rows="3">${escapeTextarea(seed.foreclose||'')}</textarea></div>
      <div><label>What is the smallest sufficient test or influence?</label><textarea class="moveTest" rows="3">${escapeTextarea(seed.reversibleTest||'')}</textarea></div>
      <div><label>Who needs a voice, or what support is needed?</label><textarea class="moveDialogue" rows="3">${escapeTextarea(seed.dialogue||'')}</textarea></div>
      <div><label>What makes this worth trying?</label><textarea class="moveEvidence" rows="3">${escapeTextarea(seed.evidence||'')}</textarea></div>
      <div><label>What would tell you the restriction is elsewhere or the intervention should change?</label><textarea class="moveStop" rows="3">${escapeTextarea(seed.stopSignal||'')}</textarea></div>
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
    schemaVersion:'0.4',
    guideVersion:'0.4.0',
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
    flowModel:{
      direction:'clockwise',
      downsweep:horizons.map(h=>h.organ),
      upsweep:[...horizons].reverse().map(h=>h.intervention),
      primaryRestriction:primaryFlowData(),
      wellbeingActivators:activatorData(),
      activatorNotes:$('activatorNotes')?.value.trim()||''
    },
    contractions:{
      primary:$('primaryContraction').value.trim(),
      disconfirmingEvidence:$('disconfirmingEvidence').value.trim(),
      missingPerspective:$('missingPerspective').value.trim(),
      narratorImplicated:$('narratorImplicated').checked
    },
    powerSafety:powerSafetyData(),
    safetyGateActive:safetyGateActive(),
    safetyUnresolved:safetyUnresolved(),
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
