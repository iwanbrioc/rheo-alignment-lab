// Rheo v0.3 model-backed analysis panel.
// API credentials remain server-side; this browser only calls /api/analyze.
(() => {
  let latestMap = null;
  const challenged = new Set();

  function addStyles(){
    const style=document.createElement('style');
    style.textContent=`
      #modelPanel{margin-top:1rem}.modelToolbar{display:grid;grid-template-columns:1fr 1fr;gap:.75rem;margin:.75rem 0}
      .modelStatus{padding:.65rem;border-radius:.6rem;background:rgba(0,0,0,.04);margin:.6rem 0}.modelMap section{margin:1rem 0}
      .modelMap ul{padding-left:1.2rem}.modelProp{padding:.7rem;margin:.5rem 0;border:1px solid rgba(0,0,0,.12);border-radius:.6rem}
      .modelProp.challenged{outline:2px dashed currentColor}.modelMeta{font-size:.84rem;opacity:.72}.dangerNote{border-left:4px solid currentColor;padding:.7rem 1rem;background:rgba(0,0,0,.04)}
      @media(max-width:680px){.modelToolbar{grid-template-columns:1fr}}
    `;
    document.head.appendChild(style);
  }

  function inject(){
    addStyles();
    const step7=document.querySelector('[data-step-panel="7"] .row');
    if(step7){
      const b=document.createElement('button');b.type='button';b.className='secondary';b.textContent='Generate AI structural map';b.onclick=()=>{ $('modelPanel').classList.remove('hidden'); $('modelPanel').scrollIntoView({behavior:'smooth'}); };
      step7.prepend(b);
    }
    const panel=document.createElement('section');panel.id='modelPanel';panel.className='card hidden';
    panel.innerHTML=`
      <div class="eyebrow">v0.3 · executable research mechanism</div>
      <h2>AI structural map</h2>
      <p class="muted">The model receives the case record as evidence, not ground truth. Rheo and control conditions use the same output schema. This output is a working hypothesis, not an assessment.</p>
      <div class="modelToolbar">
        <div><label for="modelCondition">Research condition</label><select id="modelCondition"><option value="rheo">Rheo — RWB heuristic</option><option value="control">Matched general-reasoning control</option></select></div>
        <div><label for="modelGranularity">Forced granularity</label><select id="modelGranularity"><option value="coarse">Coarse</option><option value="standard" selected>Standard</option><option value="fine">Fine</option></select></div>
      </div>
      <div class="row"><button type="button" class="primary" id="runModelBtn">Analyze current case</button><button type="button" class="secondary" id="downloadModelBtn" disabled>Export evaluable map JSON</button></div>
      <div id="modelStatus" class="modelStatus">Not yet run.</div>
      <div id="modelMap" class="modelMap"></div>`;
    const saved=document.getElementById('savedView');
    saved.parentNode.insertBefore(panel,saved);
    $('runModelBtn').onclick=run;
    $('downloadModelBtn').onclick=downloadMap;
  }

  function itemList(items){return items?.length?`<ul>${items.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`:'<p class="muted">None identified.</p>';}

  function render(result){
    latestMap=result.map;challenged.clear();$('downloadModelBtn').disabled=false;
    const m=result.map;
    const safety=m.safetyCaution;
    const safetyText=safety.level==='none_detected'
      ? 'No indicators were detected from the supplied material. This is not affirmative evidence of safety.'
      : `Safety state: ${safety.level}. ${safety.uncertainty}`;
    const implication=m.narratorImplication.present
      ? `<div class="dangerNote"><strong>Narrator implication:</strong> ${esc(m.narratorImplication.description)}</div>`
      : '<p class="muted">No specific narrator-contribution mechanism identified in this map.</p>';
    $('modelMap').innerHTML=`
      <section><h3>Epistemic propositions</h3>${m.propositions.length?m.propositions.map(p=>`<div class="modelProp" id="prop-${esc(p.id)}"><div>${esc(p.text)}</div><div class="modelMeta">${esc(p.provenance)} · ${esc(p.confidence)} confidence · source refs: ${esc(p.sourceRefs.join(', ')||'none')}</div><button type="button" class="ghost challengeProp" data-id="${esc(p.id)}">Challenge provenance</button></div>`).join(''):'<p class="muted">No propositions.</p>'}</section>
      <section><h3>System elements</h3>${itemList(m.systemElements)}</section>
      <section><h3>Working mechanisms</h3>${m.mechanisms.length?`<ul>${m.mechanisms.map(h=>`<li><strong>${esc(h.label)}</strong> — ${esc(h.causalDirection)} <span class="modelMeta">(${esc(h.confidence)}; ${esc(h.evidenceRefs.join(', '))})</span></li>`).join('')}</ul>`:'<p class="muted">None identified.</p>'}</section>
      <section><h3>Uncertainties</h3>${itemList(m.uncertainties)}</section>
      <section><h3>Power / exit</h3>${itemList(m.powerExit)}<div class="dangerNote">${esc(safetyText)}${safety.indicators.length?`<br><strong>Indicators:</strong> ${esc(safety.indicators.join('; '))}`:''}</div></section>
      <section><h3>Time / viability</h3>${itemList(m.temporalViability)}</section>
      <section><h3>External stakeholders</h3>${itemList(m.externalStakeholders)}</section>
      <section><h3>Possible action classes</h3>${itemList(m.actionClasses)}</section>
      <section><h3>Possible displaced costs</h3>${itemList(m.displacedCosts)}</section>
      <section><h3>What would revise this map?</h3>${itemList(m.disconfirmingEvidence)}</section>
      <section><h3>Narrator contribution</h3>${implication}</section>
      <p class="modelMeta">Condition: ${esc(result.condition)} · model: ${esc(result.model)} · granularity: ${esc(result.granularity)} · genericity self-check: ${esc(m.genericitySelfCheck)}</p>`;
    document.querySelectorAll('.challengeProp').forEach(btn=>btn.onclick=()=>challenge(btn.dataset.id));
    if(m.narratorImplication.present) logEvent('model_narrator_implication',{propositionRefs:m.narratorImplication.evidenceRefs,condition:result.condition,granularity:result.granularity});
    if(['caution','high'].includes(safety.level)) logEvent('model_safety_caution',{level:safety.level,condition:result.condition,indicatorCount:safety.indicators.length});
  }

  function challenge(id){
    if(challenged.has(id)) challenged.delete(id); else challenged.add(id);
    const el=document.getElementById(`prop-${id}`);if(el)el.classList.toggle('challenged',challenged.has(id));
    const btn=el?.querySelector('.challengeProp');if(btn)btn.textContent=challenged.has(id)?'Provenance challenged — undo':'Challenge provenance';
    logEvent('model_provenance_challenge',{propositionId:id,challenged:challenged.has(id)});
  }

  async function run(){
    const caseRecord=data();caseId=caseRecord.caseId;
    const condition=$('modelCondition').value;const granularity=$('modelGranularity').value;
    $('runModelBtn').disabled=true;$('modelStatus').textContent='Analyzing…';
    logEvent('model_analysis_requested',{condition,granularity});
    try{
      const r=await fetch('/api/analyze',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({condition,granularity,caseRecord})});
      const result=await r.json();
      if(!r.ok)throw new Error(result.error+(result.details?`: ${result.details.join('; ')}`:''));
      $('modelStatus').textContent='Model map returned and validated against the shared v0.3 schema.';
      render(result);logEvent('model_analysis_completed',{condition,granularity,model:result.model});
    }catch(err){
      $('modelStatus').textContent=`Analysis failed: ${err.message}`;logEvent('model_analysis_failed',{condition,granularity,error:String(err.message).slice(0,200)});
    }finally{$('runModelBtn').disabled=false;}
  }

  function downloadMap(){
    if(!latestMap)return;
    download(`rheo-structural-map-${latestMap.caseId}.json`,JSON.stringify(latestMap,null,2),'application/json');
  }

  inject();
})();