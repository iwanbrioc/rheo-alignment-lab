// Rheo v0.3.1 model-backed analysis panel.
// API credentials remain server-side; this browser only calls /api/analyze.
(() => {
  let latestResult = null;
  let firstModelImplicationAt = null;
  let firstModelImplicationMeta = null;
  let postImplicationContinuationLogged = false;
  let exitAfterImplicationLogged = false;
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
      .plainIntro{max-width:70ch}.fixtureWarning{font-weight:700}
      @media(max-width:680px){.modelToolbar{grid-template-columns:1fr}}
    `;
    document.head.appendChild(style);
  }

  function inject(){
    addStyles();
    const step7=document.querySelector('[data-step-panel="7"] .row');
    if(step7){
      const b=document.createElement('button');
      b.type='button';b.className='secondary';b.textContent='Ask Rheo to look at this case';
      b.onclick=()=>{ $('modelPanel').classList.remove('hidden'); $('modelPanel').scrollIntoView({behavior:'smooth'}); };
      step7.prepend(b);
    }
    const panel=document.createElement('section');panel.id='modelPanel';panel.className='card hidden';
    panel.innerHTML=`
      <div class="eyebrow">AI review · research prototype v0.3.1</div>
      <h2>Ask Rheo to look for patterns</h2>
      <p class="plainIntro">Rheo will look at what you have entered, point out patterns it thinks may matter, and show what is still uncertain. It can be wrong. Treat the result as another way of looking at the situation, not as a verdict.</p>
      <details class="researchSettings">
        <summary>Research settings</summary>
        <p class="muted">These controls are for comparing versions of the reasoning process. Most people can leave them as they are.</p>
        <div class="modelToolbar">
          <div><label for="modelCondition">Reasoning mode</label><select id="modelCondition"><option value="rheo">Rheo</option><option value="control">Comparison condition</option></select></div>
          <div><label for="modelGranularity">Amount of detail</label><select id="modelGranularity"><option value="coarse">Short</option><option value="standard" selected>Standard</option><option value="fine">Detailed</option></select></div>
        </div>
      </details>
      <div class="row"><button type="button" class="primary" id="runModelBtn">Review this case</button><button type="button" class="secondary" id="downloadModelBtn" disabled>Export research map</button></div>
      <div id="modelStatus" class="modelStatus">Rheo has not reviewed this case yet.</div>
      <div id="modelMap" class="modelMap"></div>`;
    const saved=document.getElementById('savedView');
    saved.parentNode.insertBefore(panel,saved);
    $('runModelBtn').onclick=()=>run('manual');
    $('downloadModelBtn').onclick=downloadMap;
    window.addEventListener('pagehide', logExitAfterImplication, {capture:true});
  }

  function itemList(items, empty='Nothing specific identified.'){
    return items?.length?`<ul>${items.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`:`<p class="muted">${esc(empty)}</p>`;
  }

  function recordModelImplication(result){
    if(firstModelImplicationAt !== null) return;
    firstModelImplicationAt=Date.now();
    firstModelImplicationMeta={condition:result.condition,granularity:result.granularity};
    logEvent('first_model_narrator_implication',{
      propositionRefs:result.map.narratorImplication.evidenceRefs,
      condition:result.condition,
      granularity:result.granularity
    });
  }

  function markPostImplicationContinuation(action){
    if(firstModelImplicationAt === null || postImplicationContinuationLogged) return;
    postImplicationContinuationLogged=true;
    logEvent('post_model_implication_continuation',{
      action,
      elapsedMs:Math.max(0,Date.now()-firstModelImplicationAt),
      ...firstModelImplicationMeta
    });
  }

  function logExitAfterImplication(){
    if(firstModelImplicationAt === null || exitAfterImplicationLogged) return;
    exitAfterImplicationLogged=true;
    logEvent('session_exit_after_model_implication',{
      elapsedMs:Math.max(0,Date.now()-firstModelImplicationAt),
      continuedAfterImplication:postImplicationContinuationLogged,
      ...firstModelImplicationMeta
    });
  }

  function propositionHtml(p){
    const challenged=challenges.has(p.id);
    return `<div class="modelProp ${challenged?'challenged':''}" id="prop-${esc(p.id)}">
      <div>${esc(p.text)}</div>
      <div class="modelMeta">Where this comes from: ${esc(provenancePlain[p.provenance]||p.provenance)} · ${esc(p.confidence)} confidence${p.contested?' · contested':''}</div>
      <button type="button" class="ghost challengeProp" data-id="${esc(p.id)}">${challenged?'Change my challenge':'I think this source label may be wrong'}</button>
      <div class="challengeBox ${challenged?'':'hidden'}" data-challenge-box="${esc(p.id)}">
        <label>What seems wrong about the source label? <span class="muted">(optional)</span></label>
        <textarea rows="2" data-challenge-reason="${esc(p.id)}" placeholder="For example: I did not observe this directly; it is my interpretation.">${challenged?esc(challenges.get(p.id).reason||''):''}</textarea>
        <div class="row"><button type="button" class="secondary submitChallenge" data-id="${esc(p.id)}">Review again with this challenge</button><button type="button" class="ghost removeChallenge" data-id="${esc(p.id)}">Remove challenge</button></div>
      </div>
      <details class="researchDetails"><summary>Research details</summary><div class="modelMeta">proposition id: ${esc(p.id)} · provenance: ${esc(p.provenance)} · source refs: ${esc(p.sourceRefs.join(', ')||'none')}</div></details>
    </div>`;
  }

  function render(result){
    latestResult=result;
    const m=result.map;
    const safety=m.safetyCaution;
    const safetyText=safety.level==='none_detected'
      ? 'Rheo did not find a specific warning sign in what you supplied. That does not prove the situation is safe.'
      : safety.level==='unknown'
        ? `There is not enough information here to make a safety judgement. ${safety.uncertainty}`
        : `Rheo thinks extra care is needed here. ${safety.uncertainty}`;
    const implication=m.narratorImplication.present
      ? `<div class="dangerNote"><strong>Your possible part in this:</strong> ${esc(m.narratorImplication.description)}</div>`
      : '<p class="muted">Rheo did not identify a specific way your own actions or assumptions are contributing in this map.</p>';
    const fixture=!result.researchUsable;
    $('downloadModelBtn').disabled=fixture;
    $('modelMap').innerHTML=`
      ${fixture?'<div class="notice fixtureWarning">Demo plumbing output only. This result did not come from a real model and cannot be exported as research evidence.</div>':''}
      <section><h3>What Rheo thinks may be true</h3><p class="muted">Each statement keeps track of where Rheo thinks it came from. You can challenge that.</p>${m.propositions.length?m.propositions.map(propositionHtml).join(''):'<p class="muted">No propositions.</p>'}</section>
      <section><h3>Parts of the situation that seem to matter</h3>${itemList(m.systemElements)}</section>
      <section><h3>Patterns that may be driving it</h3>${m.mechanisms.length?`<ul>${m.mechanisms.map(h=>`<li><strong>${esc(h.label)}</strong> — ${esc(h.causalDirection)} <span class="modelMeta">(${esc(h.confidence)} confidence)</span></li>`).join('')}</ul>`:'<p class="muted">No clear pattern identified.</p>'}</section>
      <section><h3>What we do not know yet</h3>${itemList(m.uncertainties)}</section>
      <section><h3>Power and safety</h3>${itemList(m.powerExit)}<div class="dangerNote">${esc(safetyText)}${safety.indicators.length?`<br><strong>What raised the question:</strong> ${esc(safety.indicators.join('; '))}`:''}</div></section>
      <section><h3>What changes with time</h3>${itemList(m.temporalViability)}</section>
      <section><h3>Who else may be affected</h3>${itemList(m.externalStakeholders)}</section>
      <section><h3>Things you could try</h3>${itemList(m.actionClasses)}</section>
      <section><h3>Who or what might carry the cost</h3>${itemList(m.displacedCosts)}</section>
      <section><h3>What would change Rheo’s mind?</h3>${itemList(m.disconfirmingEvidence)}</section>
      <section><h3>Your possible part in this</h3>${implication}</section>
      <details class="researchDetails"><summary>Research details for this AI review</summary><p class="modelMeta">Condition: ${esc(result.condition)} · provider: ${esc(result.provider||'unknown')} · model: ${esc(result.model)} · detail: ${esc(result.granularity)} · response id: ${esc(result.responseId||'none')} · genericity self-check: ${esc(m.genericitySelfCheck)}</p></details>`;
    document.querySelectorAll('.challengeProp').forEach(btn=>btn.onclick=()=>toggleChallenge(btn.dataset.id));
    document.querySelectorAll('.submitChallenge').forEach(btn=>btn.onclick=()=>submitChallenge(btn.dataset.id));
    document.querySelectorAll('.removeChallenge').forEach(btn=>btn.onclick=()=>removeChallenge(btn.dataset.id));
    if(m.narratorImplication.present) recordModelImplication(result);
    if(['caution','high'].includes(safety.level)) logEvent('model_safety_caution',{level:safety.level,condition:result.condition,indicatorCount:safety.indicators.length});
  }

  function findProposition(id){return latestResult?.map?.propositions?.find(p=>p.id===id);}

  function toggleChallenge(id){
    markPostImplicationContinuation('challenge_provenance');
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
    if(latestResult)render(latestResult);
  }

  async function run(trigger='manual'){
    if(trigger!=='manual')markPostImplicationContinuation('request_analysis_after_challenge');
    else markPostImplicationContinuation('request_another_analysis');
    const caseRecord=data();caseId=caseRecord.caseId;
    const condition=$('modelCondition').value;const granularity=$('modelGranularity').value;
    $('runModelBtn').disabled=true;$('modelStatus').textContent='Rheo is reviewing the case…';
    logEvent('model_analysis_requested',{condition,granularity,trigger,challengeCount:challenges.size});
    try{
      const r=await fetch('/api/analyze',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({condition,granularity,caseRecord,challenges:[...challenges.values()]})});
      const result=await r.json();
      if(!r.ok){
        const detail=Array.isArray(result.details)&&result.details.length?` ${result.details.slice(0,2).join(' ')}`:'';
        const err=new Error(`${result.error||'Analysis failed.'}${detail}`);err.code=result.errorCode||'analysis_failed';throw err;
      }
      $('modelStatus').textContent=result.researchUsable
        ? 'Rheo returned a map and it passed the v0.3.1 research checks.'
        : 'Demo plumbing map returned. This is not a real-model research result.';
      render(result);
      logEvent('model_analysis_completed',{condition,granularity,model:result.model,provider:result.provider,researchUsable:result.researchUsable,trigger});
    }catch(err){
      $('modelStatus').textContent=`Rheo could not complete this review: ${err.message}`;
      logEvent('model_analysis_failed',{condition,granularity,errorCode:err.code||'analysis_failed',trigger});
    }finally{$('runModelBtn').disabled=false;}
  }

  function downloadMap(){
    if(!latestResult?.map || !latestResult.researchUsable)return;
    markPostImplicationContinuation('export_map');
    const envelope={
      exportVersion:'0.3.1',
      exportedAt:new Date().toISOString(),
      caseId:latestResult.map.caseId,
      condition:latestResult.condition,
      granularity:latestResult.granularity,
      provider:latestResult.provider,
      model:latestResult.model,
      responseId:latestResult.responseId,
      researchUsable:Boolean(latestResult.researchUsable),
      map:latestResult.map
    };
    download(`rheo-map-${envelope.condition}-${envelope.granularity}-${envelope.caseId}.json`,JSON.stringify(envelope,null,2),'application/json');
  }

  inject();
})();
