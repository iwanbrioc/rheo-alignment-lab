// Rheo v0.4 model-backed analysis panel.
// API credentials remain server-side; this browser calls /api/rheo-flow for
// the user-facing Rheo physiology and /api/analyze for legacy research comparators.
(() => {
  let latestResult = null;
  let firstCriticalReflectionAt = null;
  let firstCriticalReflectionMeta = null;
  let postReflectionContinuationLogged = false;
  let exitAfterReflectionLogged = false;
  const challenges = new Map();

  const provenancePlain = {
    user_reported_observation:'Reported observation',
    user_interpretation:'Your interpretation',
    ai_inference:'Rheo inference',
    verified_external:'Checked against an independent source',
    absent_party_account:'Someone else’s account',
    unknown:'Source unclear'
  };

  function addStyles(){
    const style=document.createElement('style');
    style.textContent=`
      #modelPanel{margin-top:1rem}.modelToolbar{display:grid;grid-template-columns:1fr 1fr;gap:.75rem;margin:.75rem 0}
      .modelStatus{padding:.8rem;border-radius:.6rem;background:rgba(0,0,0,.04);margin:.7rem 0}.modelMap section{margin:1.15rem 0}
      .modelMap ul{padding-left:1.2rem}.modelProp{padding:.8rem;margin:.55rem 0;border:1px solid rgba(0,0,0,.12);border-radius:.6rem}
      .modelProp.challenged{outline:2px dashed currentColor}.modelMeta{font-size:.84rem;opacity:.72}.dangerNote{border-left:4px solid currentColor;padding:.7rem 1rem;background:rgba(0,0,0,.04)}
      .researchDetails,.researchSettings{margin:.8rem 0}.researchDetails summary,.researchSettings summary{cursor:pointer;font-weight:600}
      .challengeBox{margin-top:.55rem;padding:.65rem;border-radius:.5rem;background:rgba(0,0,0,.035)}.challengeBox textarea{width:100%;box-sizing:border-box}
      .plainIntro{max-width:74ch}.fixtureWarning{font-weight:700}
      @media(max-width:680px){.modelToolbar{grid-template-columns:1fr}}
    `;
    document.head.appendChild(style);
  }

  function inject(){
    addStyles();
    const step7=document.querySelector('[data-step-panel="7"] .row');
    if(step7){
      const b=document.createElement('button');
      b.type='button';b.className='secondary';b.textContent='Ask Rheo to diagnose the flow';
      b.onclick=()=>{ $('modelPanel').classList.remove('hidden'); $('modelPanel').scrollIntoView({behavior:'smooth'}); };
      step7.prepend(b);
    }
    const panel=document.createElement('section');panel.id='modelPanel';panel.className='card hidden';
    panel.innerHTML=`
      <div class="eyebrow">AI review · research prototype v0.4</div>
      <h2>Ask Rheo to locate the restriction</h2>
      <p class="plainIntro">Rheo will treat the seven horizons as a paired flow system: diagnose the organ in which flow appears restricted, use the aligned intervention, and propose the smallest sufficient influence. It can be wrong. The important part is the prediction of what should become possible next — and what would show the diagnosis needs to move.</p>
      <details class="researchSettings">
        <summary>Research settings</summary>
        <p class="muted">The default is the new v0.4 flow physiology. Legacy conditions remain available so previous research can be reproduced rather than overwritten.</p>
        <div class="modelToolbar">
          <div><label for="modelCondition">Reasoning mode</label><select id="modelCondition"><option value="rheo_v0_4" selected>Rheo v0.4 flow physiology</option><option value="rheo">Legacy Rheo v0.3</option><option value="control">Legacy matched comparison</option></select></div>
          <div><label for="modelGranularity">Amount of detail</label><select id="modelGranularity"><option value="coarse">Short</option><option value="standard" selected>Standard</option><option value="fine">Detailed</option></select></div>
        </div>
      </details>
      <div class="row"><button type="button" class="primary" id="runModelBtn">Diagnose this case</button><button type="button" class="secondary" id="downloadModelBtn" disabled>Export research result</button></div>
      <div id="modelStatus" class="modelStatus">Rheo has not reviewed this case yet.</div>
      <div id="modelMap" class="modelMap"></div>`;
    const saved=document.getElementById('savedView');
    saved.parentNode.insertBefore(panel,saved);
    $('runModelBtn').onclick=()=>run('manual');
    $('downloadModelBtn').onclick=downloadResult;
    window.addEventListener('pagehide', logExitAfterReflection, {capture:true});
  }

  function itemList(items, empty='Nothing specific identified.'){
    return items?.length?`<ul>${items.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`:`<p class="muted">${esc(empty)}</p>`;
  }

  function recordCriticalReflection(result, type, refs=[]){
    if(firstCriticalReflectionAt !== null) return;
    firstCriticalReflectionAt=Date.now();
    firstCriticalReflectionMeta={condition:result.condition,granularity:result.granularity||'flow'};
    logEvent(type,{evidenceRefs:refs,condition:result.condition,granularity:result.granularity||'flow'});
  }

  function markPostReflectionContinuation(action){
    if(firstCriticalReflectionAt === null || postReflectionContinuationLogged) return;
    postReflectionContinuationLogged=true;
    logEvent('post_model_critical_reflection_continuation',{
      action,
      elapsedMs:Math.max(0,Date.now()-firstCriticalReflectionAt),
      ...firstCriticalReflectionMeta
    });
  }

  function logExitAfterReflection(){
    if(firstCriticalReflectionAt === null || exitAfterReflectionLogged) return;
    exitAfterReflectionLogged=true;
    logEvent('session_exit_after_model_critical_reflection',{
      elapsedMs:Math.max(0,Date.now()-firstCriticalReflectionAt),
      continuedAfterReflection:postReflectionContinuationLogged,
      ...firstCriticalReflectionMeta
    });
  }

  function propositionHtml(p, allowChallenge=false){
    const challenged=challenges.has(p.id);
    return `<div class="modelProp ${challenged?'challenged':''}" id="prop-${esc(p.id)}">
      <div>${esc(p.text)}</div>
      <div class="modelMeta">Where this comes from: ${esc(provenancePlain[p.provenance]||p.provenance)} · ${esc(p.confidence)} confidence${p.contested?' · contested':''}</div>
      ${allowChallenge?`<button type="button" class="ghost challengeProp" data-id="${esc(p.id)}">${challenged?'Change my challenge':'I think this source label may be wrong'}</button>
      <div class="challengeBox ${challenged?'':'hidden'}" data-challenge-box="${esc(p.id)}">
        <label>What seems wrong about the source label? <span class="muted">(optional)</span></label>
        <textarea rows="2" data-challenge-reason="${esc(p.id)}">${challenged?esc(challenges.get(p.id).reason||''):''}</textarea>
        <div class="row"><button type="button" class="secondary submitChallenge" data-id="${esc(p.id)}">Review again with this challenge</button><button type="button" class="ghost removeChallenge" data-id="${esc(p.id)}">Remove challenge</button></div>
      </div>`:''}
      <details class="researchDetails"><summary>Research details</summary><div class="modelMeta">proposition id: ${esc(p.id)} · provenance: ${esc(p.provenance)} · source refs: ${esc(p.sourceRefs.join(', ')||'none')}</div></details>
    </div>`;
  }

  function renderFlow(result){
    latestResult=result;
    const f=result.flow;
    const safety=f.safetyCaution;
    const fixture=!result.researchUsable;
    $('downloadModelBtn').disabled=fixture;
    const safetyText=safety.level==='none_detected'
      ? 'Rheo did not find a specific safety warning in the supplied material. That is not proof of safety.'
      : safety.level==='unknown'
        ? `There is not enough information to make a safety judgement. ${safety.uncertainty}`
        : `Safety and autonomy may override the normal aligned intervention here. ${safety.uncertainty}`;
    const rows=f.flowRows.map(r=>`<div class="flowRowResult">
      <div class="left"><strong>${esc(r.intervention)}</strong><br><span class="modelMeta">upsweep intervention</span></div>
      <div class="centre">${esc(r.horizon)}</div>
      <div class="right"><strong>${esc(r.organ)}</strong><span class="flowState">${esc(r.state)}</span><br><span class="modelMeta">${esc(r.rationale)}</span></div>
    </div>`).join('');
    const activators=f.wellbeingActivators.map(a=>`<span class="activatorResult ${a.emphasis==='foreground'?'foreground':''}" title="${esc(a.application)}">${esc(a.name)}</span>`).join('');
    $('modelMap').innerHTML=`
      ${fixture?'<div class="notice fixtureWarning">Demo plumbing output only. This did not come from a real model and cannot be exported as research evidence.</div>':''}
      <section><h3>Evidence Rheo is using</h3><p class="muted">These statements retain provenance. To change them, edit the case evidence and run the diagnosis again.</p>${f.propositions.length?f.propositions.map(p=>propositionHtml(p,false)).join(''):'<p class="muted">No propositions.</p>'}</section>
      <section><h3>Relocate the frame</h3>
        <p><strong>Narrator as an ordinary node:</strong> ${esc(f.frameRelocation.narratorAsOrdinaryNode)}</p>
        <p><strong>The problem-description as part of the system:</strong> ${esc(f.frameRelocation.problemDescriptionAsObject)}</p>
        <div class="dangerNote"><strong>Wider frame:</strong> ${esc(f.frameRelocation.relocatedFrame)} <span class="modelMeta">(${esc(f.frameRelocation.confidence)} confidence)</span></div>
      </section>
      <section><h3>Clockwise flow diagnosis</h3><div class="flowRowsResult">${rows}</div></section>
      <section>
        <h3>Primary restriction</h3>
        <div class="flowDiagnosisHero"><strong>${esc(f.primaryRestriction.organ)}</strong> through <strong>${esc(f.primaryRestriction.horizon)}</strong><br>${esc(f.primaryRestriction.diagnosis)} <span class="modelMeta">(${esc(f.primaryRestriction.confidence)} confidence)</span></div>
        ${f.primaryRestriction.visibleSymptoms.length?`<p><strong>Visible symptoms that may be downstream:</strong></p>${itemList(f.primaryRestriction.visibleSymptoms)}`:''}
      </section>
      <section><h3>Aligned intervention: ${esc(f.alignedIntervention.intervention)}</h3>
        <p><strong>Smallest sufficient influence:</strong> ${esc(f.alignedIntervention.smallestSufficientInfluence)}</p>
        <p><strong>Why this fits the restriction:</strong> ${esc(f.alignedIntervention.whyThisFits)}</p>
        <p><strong>Do not over-determine:</strong> ${esc(f.alignedIntervention.doNotOverdetermine)}</p>
      </section>
      <section><h3>Seven Wellbeing Activators</h3><p class="muted">All seven stay available. Bold chips are the qualities Rheo would foreground in this intervention.</p><div>${activators}</div>
        <ul>${f.wellbeingActivators.filter(a=>a.emphasis==='foreground').map(a=>`<li><strong>${esc(a.name)}:</strong> ${esc(a.application)}</li>`).join('')}</ul>
      </section>
      <section><h3>If the diagnosis is right, what should happen next?</h3>
        <p><strong>Next downsweep organ:</strong> ${esc(f.propagationPrediction.nextDownsweepOrgan)}</p>
        <p>${esc(f.propagationPrediction.ifReleasedThen)}</p>
        <p><strong>Observable signal:</strong> ${esc(f.propagationPrediction.observableSignal)}</p>
        <p><strong>Review:</strong> ${esc(f.propagationPrediction.reviewHorizon)}</p>
        <p class="question"><strong>Falsifier:</strong> ${esc(f.propagationPrediction.falsifier)}</p>
        <p class="question"><strong>Relocate the diagnosis if:</strong> ${esc(f.propagationPrediction.relocationTrigger)}</p>
      </section>
      <section><h3>Constrain irreversibility, not emergence</h3>
        <p><strong>Boundary to protect:</strong> ${esc(f.irreversibility.boundaryToProtect)}</p>
        <p><strong>What should remain free to emerge:</strong> ${esc(f.irreversibility.emergenceNotToConstrain)}</p>
        <p><strong>Who or what may carry the cost:</strong></p>${itemList(f.irreversibility.displacedCosts)}
      </section>
      <section><h3>Power and safety</h3><div class="dangerNote">${esc(safetyText)}${safety.indicators.length?`<br><strong>Indicators:</strong> ${esc(safety.indicators.join('; '))}`:''}</div></section>
      <details class="researchDetails"><summary>Research details for this AI review</summary><p class="modelMeta">Condition: ${esc(result.condition)} · provider: ${esc(result.provider||'unknown')} · model: ${esc(result.model)} · response id: ${esc(result.responseId||'none')} · specificity self-check: ${esc(f.specificitySelfCheck)}</p></details>`;
    recordCriticalReflection(result,'first_model_frame_relocation',f.frameRelocation.evidenceRefs||[]);
    if(['caution','high'].includes(safety.level))logEvent('model_safety_caution',{level:safety.level,condition:result.condition,indicatorCount:safety.indicators.length});
  }

  function renderStructural(result){
    latestResult=result;
    const m=result.map;
    const safety=m.safetyCaution;
    const safetyText=safety.level==='none_detected'
      ? 'No specific warning sign identified in the supplied material. That does not prove safety.'
      : safety.level==='unknown'?`There is not enough information here to make a safety judgement. ${safety.uncertainty}`:`Extra care may be needed. ${safety.uncertainty}`;
    const implication=m.narratorImplication.present
      ? `<div class="dangerNote"><strong>Your possible part in this:</strong> ${esc(m.narratorImplication.description)}</div>`
      : '<p class="muted">No specific narrator contribution identified in this legacy map.</p>';
    const fixture=!result.researchUsable;
    $('downloadModelBtn').disabled=fixture;
    $('modelMap').innerHTML=`
      ${fixture?'<div class="notice fixtureWarning">Demo plumbing output only. This result did not come from a real model.</div>':''}
      <div class="notice"><strong>Legacy research representation:</strong> this is the v0.3 ontology-neutral structural map, not the explicit v0.4 physiology.</div>
      <section><h3>Propositions</h3>${m.propositions.length?m.propositions.map(p=>propositionHtml(p,true)).join(''):'<p class="muted">No propositions.</p>'}</section>
      <section><h3>System elements</h3>${itemList(m.systemElements)}</section>
      <section><h3>Mechanisms</h3>${m.mechanisms.length?`<ul>${m.mechanisms.map(h=>`<li><strong>${esc(h.label)}</strong> — ${esc(h.causalDirection)} <span class="modelMeta">(${esc(h.confidence)} confidence)</span></li>`).join('')}</ul>`:'<p class="muted">No clear pattern identified.</p>'}</section>
      <section><h3>Uncertainties</h3>${itemList(m.uncertainties)}</section>
      <section><h3>Power and safety</h3>${itemList(m.powerExit)}<div class="dangerNote">${esc(safetyText)}</div></section>
      <section><h3>Time and viability</h3>${itemList(m.temporalViability)}</section>
      <section><h3>Other affected parties</h3>${itemList(m.externalStakeholders)}</section>
      <section><h3>Action classes</h3>${itemList(m.actionClasses)}</section>
      <section><h3>Displaced costs</h3>${itemList(m.displacedCosts)}</section>
      <section><h3>What would change the map?</h3>${itemList(m.disconfirmingEvidence)}</section>
      <section><h3>Narrator implication</h3>${implication}</section>
      <details class="researchDetails"><summary>Research details</summary><p class="modelMeta">Condition: ${esc(result.condition)} · provider: ${esc(result.provider||'unknown')} · model: ${esc(result.model)} · detail: ${esc(result.granularity)} · response id: ${esc(result.responseId||'none')} · genericity: ${esc(m.genericitySelfCheck)}</p></details>`;
    document.querySelectorAll('.challengeProp').forEach(btn=>btn.onclick=()=>toggleChallenge(btn.dataset.id));
    document.querySelectorAll('.submitChallenge').forEach(btn=>btn.onclick=()=>submitChallenge(btn.dataset.id));
    document.querySelectorAll('.removeChallenge').forEach(btn=>btn.onclick=()=>removeChallenge(btn.dataset.id));
    if(m.narratorImplication.present)recordCriticalReflection(result,'first_model_narrator_implication',m.narratorImplication.evidenceRefs||[]);
  }

  function findProposition(id){return latestResult?.map?.propositions?.find(p=>p.id===id);}

  function toggleChallenge(id){
    markPostReflectionContinuation('challenge_provenance');
    const box=document.querySelector(`[data-challenge-box="${CSS.escape(id)}"]`);
    if(box)box.classList.toggle('hidden');
    logEvent('model_provenance_challenge_opened',{propositionId:id});
  }

  async function submitChallenge(id){
    const p=findProposition(id);if(!p)return;
    const reason=document.querySelector(`[data-challenge-reason="${CSS.escape(id)}"]`)?.value.trim()||'';
    challenges.set(id,{id:`c-${id}`,propositionId:id,propositionText:p.text,previousProvenance:p.provenance,reason});
    logEvent('model_provenance_challenge',{propositionId:id,challenged:true,hasReason:Boolean(reason)});
    await run('provenance_challenge');
  }

  function removeChallenge(id){
    challenges.delete(id);
    logEvent('model_provenance_challenge',{propositionId:id,challenged:false});
    if(latestResult?.map)renderStructural(latestResult);
  }

  async function run(trigger='manual'){
    if(trigger!=='manual')markPostReflectionContinuation('request_analysis_after_challenge');
    else markPostReflectionContinuation('request_another_analysis');
    const caseRecord=data();caseId=caseRecord.caseId;
    const condition=$('modelCondition').value;const granularity=$('modelGranularity').value;
    const isFlow=condition==='rheo_v0_4';
    $('runModelBtn').disabled=true;$('modelStatus').textContent=isFlow?'Rheo is following the flow through this case…':'Running the legacy structural comparison…';
    logEvent('model_analysis_requested',{condition,granularity,trigger,challengeCount:challenges.size});
    try{
      const endpoint=isFlow?'/api/rheo-flow':'/api/analyze';
      const payload=isFlow?{caseRecord}:{condition,granularity,caseRecord,challenges:[...challenges.values()]};
      const r=await fetch(endpoint,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload)});
      const result=await r.json();
      if(!r.ok){
        const detail=Array.isArray(result.details)&&result.details.length?` ${result.details.slice(0,3).join(' ')}`:'';
        const err=new Error(`${result.error||'Analysis failed.'}${detail}`);err.code=result.errorCode||'analysis_failed';throw err;
      }
      $('modelStatus').textContent=result.researchUsable
        ? (isFlow?'Rheo returned a v0.4 flow diagnosis and it passed the research checks.':'Legacy structural map returned and passed its research checks.')
        : 'Demo plumbing output returned. This is not a real-model research result.';
      if(isFlow)renderFlow(result);else renderStructural(result);
      logEvent('model_analysis_completed',{condition,granularity:isFlow?'flow':granularity,model:result.model,provider:result.provider,researchUsable:result.researchUsable,trigger});
    }catch(err){
      $('modelStatus').textContent=`Rheo could not complete this review: ${err.message}`;
      logEvent('model_analysis_failed',{condition,granularity,errorCode:err.code||'analysis_failed',trigger});
    }finally{$('runModelBtn').disabled=false;}
  }

  function downloadResult(){
    if(!latestResult?.researchUsable)return;
    markPostReflectionContinuation('export_result');
    if(latestResult.flow){
      const envelope={exportVersion:'0.4.0-flow',exportedAt:new Date().toISOString(),caseId:latestResult.flow.caseId,condition:latestResult.condition,provider:latestResult.provider,model:latestResult.model,responseId:latestResult.responseId,researchUsable:true,flow:latestResult.flow};
      download(`rheo-flow-${envelope.caseId}.json`,JSON.stringify(envelope,null,2),'application/json');
      return;
    }
    if(latestResult.map){
      const envelope={exportVersion:'0.3.1-legacy',exportedAt:new Date().toISOString(),caseId:latestResult.map.caseId,condition:latestResult.condition,granularity:latestResult.granularity,provider:latestResult.provider,model:latestResult.model,responseId:latestResult.responseId,researchUsable:true,map:latestResult.map};
      download(`rheo-map-${envelope.condition}-${envelope.caseId}.json`,JSON.stringify(envelope,null,2),'application/json');
    }
  }

  inject();
})();
