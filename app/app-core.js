const horizons = [
  {id:'environment',triplet:'Re-enchantment ↔ Natural Environment ↔ Resources',title:'Natural Environment / Resources',plainTitle:'Environment & resources',questions:[
    'What living or material resources does this situation depend on?',
    'What needs time and the right conditions to recover?',
    'Are any resources being used in a way that cannot keep going?'
  ]},
  {id:'culture',triplet:'Transformation ↔ Culture ↔ Values',title:'Culture / Values',plainTitle:'Culture & values',questions:[
    'What story, habit or value makes the present situation seem inevitable?',
    'What is being kept simply because it is familiar?',
    'What change in values would open up different possibilities?'
  ]},
  {id:'infrastructure',triplet:'Creativity ↔ Infrastructure ↔ Affordance',title:'Infrastructure / Affordance',plainTitle:'Structures & options',questions:[
    'What can people actually do within the present setup?',
    'What useful option is blocked because the structure does not allow it?',
    'What small practical change could open up a new option?'
  ]},
  {id:'society',triplet:'Dialogue ↔ Society ↔ Support',title:'Society / Support',plainTitle:'Relationships & support',questions:[
    'Who is actually in conversation, and who is being spoken about rather than spoken with?',
    'Does each person have real influence, or only a chance to speak?',
    'Is support helping people take part, or making them more dependent?'
  ]},
  {id:'outer',triplet:'Curiosity ↔ Outer Self ↔ Capacity',title:'Outer Self / Capacity',plainTitle:'Skills & capacity',questions:[
    'Where might certainty be stopping useful questions?',
    'What ability or resource is already there but not being used?',
    'What skill, relationship or question could widen the options?'
  ]},
  {id:'inner',triplet:'Participation ↔ Inner Self ↔ Well-being',title:'Inner Self / Well-being',plainTitle:'Experience & wellbeing',questions:[
    'What is this situation actually like for the people living it?',
    'Who is becoming more able, or less able, to take part meaningfully?',
    'What is changing in people’s energy, confidence or wellbeing?'
  ]},
  {id:'noself',triplet:'Nothing / Everything ↔ No Self ↔ Everything / Nothing',title:'Context orientation / No Self',plainTitle:'Step back & widen the frame',noScore:true,questions:[
    'What if the way the problem is being described is part of what keeps it stuck?',
    'Whose point of view is being treated as the centre?',
    'What new information would force us to rethink the explanation?',
    'What becomes visible if we look at the setting around the dispute, not only the dispute itself?'
  ]}
];

const provenanceTypes = [
  ['user_reported_observation','Something I directly observed or was told'],
  ['user_interpretation','My interpretation'],
  ['ai_inference','An AI inference'],
  ['verified_external','Checked against an independent source'],
  ['absent_party_account','Someone else’s account'],
  ['unknown','I am not sure']
];

let step = 1;
let moveCount = 0;
let evidenceCount = 0;
let caseId = null;
const sessionId = safeUUID();
let narratorImplicationLogged = false;
const $ = id => document.getElementById(id);

function safeUUID(){
  if(window.crypto && crypto.randomUUID) return crypto.randomUUID();
  return `rheo-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function logEvent(type, detail={}){
  const event = {
    eventId:safeUUID(), sessionId, caseId, at:new Date().toISOString(), step, type, detail
  };
  const logs = JSON.parse(localStorage.getItem('rheo_research_log_v0_2') || '[]');
  logs.push(event);
  localStorage.setItem('rheo_research_log_v0_2', JSON.stringify(logs));
}

function displayHorizonTitle(id){
  const h=horizons.find(x=>x.id===id);
  return h?.plainTitle || h?.title || id;
}

function init(){
  renderHorizons();
  addEvidence({text:'',provenance:'user_reported_observation',about:'system'});
  addEvidence({text:'',provenance:'user_interpretation',about:'other_party'});
  addMove(); addMove();
  bind();
  updateSafetyGate();
  logEvent('app_open');
}

function bind(){
  $('startBtn').onclick=start;
  $('exampleBtn').onclick=loadExample;
  $('nextBtn').onclick=()=>go(Math.min(7,step+1));
  $('backBtn').onclick=()=>go(Math.max(1,step-1));
  document.querySelectorAll('.progress button').forEach(b=>b.onclick=()=>go(+b.dataset.step));
  $('addMoveBtn').onclick=()=>addMove();
  $('addEvidenceBtn').onclick=()=>addEvidence();
  $('exportMdBtn').onclick=exportMarkdown;
  $('exportJsonBtn').onclick=exportJSON;
  $('exportResearchBtn').onclick=exportResearchLog;
  $('saveBtn').onclick=saveCase;
  $('saveOutcomeBtn').onclick=saveOutcome;
  $('savedBtn').onclick=showSaved;
  $('closeSavedBtn').onclick=()=>{ $('savedView').classList.add('hidden'); $('homeView').classList.remove('hidden'); };
  $('narratorImplicated').addEventListener('change', onNarratorImplication);
  ['fearRetaliation','constrainedExit','surveillanceControl','materialDependence','powerAsymmetry'].forEach(id=>{
    $(id).addEventListener('change', updateSafetyGate);
  });
  window.addEventListener('pagehide',()=>logEvent('session_exit',{
    currentStep:step,
    narratorImplicated:$('narratorImplicated')?.checked || false
  }));
}

function start(){
  const opening=$('openingContext').value.trim();
  if(!opening){$('openingContext').focus();return;}
  caseId = caseId || safeUUID();
  $('context').value=opening;
  $('homeView').classList.add('hidden');
  $('wizardView').classList.remove('hidden');
  logEvent('case_start',{openingLength:opening.length});
  go(1);
}

function loadExample(){
  $('openingContext').value='Our community project has to make a funding decision within two weeks. A partner relationship has become strained, staff are tired, and one option would solve the immediate budget problem but may damage trust that took years to build. I need to know what to protect, what can change, and what a proportionate next move looks like.';
}

function renderHorizons(){
  const host=$('horizonCards');host.innerHTML='';
  horizons.forEach(h=>{
    const el=document.createElement('section');el.className='card horizon';
    const statuses=h.noScore?'<span class="muted">No rating needed</span>':`<div class="statuses">
      <label><input type="radio" name="${h.id}Status" value="restriction"> Seems blocked</label>
      <label><input type="radio" name="${h.id}Status" value="uncertain" checked> Not sure</label>
      <label><input type="radio" name="${h.id}Status" value="open"> Seems to be working</label>
      <label><input type="radio" name="${h.id}Status" value="irrelevant"> Not relevant</label>
    </div>`;
    el.innerHTML=`<div class="horizonTop"><div><h3>${h.plainTitle}</h3><details class="researchDetails"><summary>RWB lens</summary><div class="horizonTriplet">${h.triplet}</div></details></div>${statuses}</div>
      <ul class="questions">${h.questions.map(q=>`<li>${q}</li>`).join('')}</ul>
      <label>What do you notice?</label><textarea id="${h.id}Notes" rows="4"></textarea>`;
    host.appendChild(el);
  });
}

function addEvidence(seed={}){
  evidenceCount++;
  const item=document.createElement('div');
  item.className='evidenceItem';
  item.dataset.evidence=evidenceCount;
  item.innerHTML=`
    <label>Statement ${evidenceCount}</label>
    <textarea class="evidenceText" rows="3" placeholder="Put one important claim or observation here.">${escapeTextarea(seed.text||'')}</textarea>
    <div class="evidenceMeta">
      <div><label>Where does this come from?</label><select class="evidenceProvenance">${provenanceTypes.map(([v,l])=>`<option value="${v}" ${seed.provenance===v?'selected':''}>${l}</option>`).join('')}</select></div>
      <div><label>Who or what is this about?</label><select class="evidenceAbout">
        ${['system','self','other_party','third_party','environment','unknown'].map(v=>`<option value="${v}" ${seed.about===v?'selected':''}>${pretty(v)}</option>`).join('')}
      </select></div>
      <div><label>How sure are you?</label><select class="evidenceConfidence">
        ${['low','medium','high'].map(v=>`<option value="${v}" ${(seed.confidence||'medium')===v?'selected':''}>${pretty(v)}</option>`).join('')}
      </select></div>
    </div>
    <button class="ghost removeEvidence" type="button">Remove</button>`;
  item.querySelector('.removeEvidence').onclick=()=>{ item.remove(); updateSingleNarratorNotice(); };
  item.querySelector('.evidenceProvenance').addEventListener('change',e=>{
    logEvent('provenance_classified',{value:e.target.value}); updateSingleNarratorNotice();
  });
  item.querySelector('.evidenceText').addEventListener('input',updateSingleNarratorNotice);
  $('evidenceLedger').appendChild(item);
  updateSingleNarratorNotice();
}

function escapeTextarea(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function pretty(s){return s.replaceAll('_',' ').replace(/\b\w/g,c=>c.toUpperCase());}

function evidenceData(){
  return [...document.querySelectorAll('.evidenceItem')].map((el,i)=>({
    id:`e${i+1}`,
    text:el.querySelector('.evidenceText').value.trim(),
    provenance:el.querySelector('.evidenceProvenance').value,
    about:el.querySelector('.evidenceAbout').value,
    confidence:el.querySelector('.evidenceConfidence').value
  })).filter(x=>x.text);
}

function updateSingleNarratorNotice(){
  const ev=evidenceData();
  const hasIndependent=ev.some(x=>['verified_external','absent_party_account'].includes(x.provenance));
  $('singleNarratorNotice').classList.toggle('hidden',hasIndependent);
}

function go(n){
  collectContractionSuggestions();
  step=n;
  document.querySelectorAll('[data-step-panel]').forEach(p=>p.classList.toggle('hidden',+p.dataset.stepPanel!==step));
  document.querySelectorAll('.progress button').forEach(b=>b.classList.toggle('active',+b.dataset.step===step));
  $('backBtn').style.visibility=step===1?'hidden':'visible';
  $('nextBtn').textContent=step===7?'Review plan':'Next';
  if(step===7)renderSMEAC();
  if(step===2)updateSingleNarratorNotice();
  logEvent('step_view',{step});
  window.scrollTo({top:0,behavior:'smooth'});
}
