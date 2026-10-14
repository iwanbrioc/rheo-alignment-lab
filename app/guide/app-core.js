const horizons = [
  {id:'environment',triplet:'Re-enchantment ↔ Natural Environment ↔ Resources',title:'Natural Environment / Resources',questions:[
    'What living or material resources does this situation draw upon?',
    'What needs time and favourable conditions to rise again or regenerate?',
    'Are resources being treated as inventory, or as part of a relationship that can be depleted or renewed?'
  ]},
  {id:'culture',triplet:'Transformation ↔ Culture ↔ Values',title:'Culture / Values',questions:[
    'What story, norm or value currently makes this situation seem inevitable?',
    'What is being preserved because it is familiar rather than because it is viable?',
    'What transformation in values would change what becomes possible?'
  ]},
  {id:'infrastructure',triplet:'Creativity ↔ Infrastructure ↔ Affordance',title:'Infrastructure / Affordance',questions:[
    'What can people actually do within the present structures?',
    'Which desired actions are impossible because the infrastructure does not support them?',
    'What small creative change could create a new affordance?'
  ]},
  {id:'society',triplet:'Dialogue ↔ Society ↔ Support',title:'Society / Support',questions:[
    'Who is in dialogue, and who is being spoken about rather than spoken with?',
    'Does each party have meaningful influence, or only an opportunity to speak?',
    'Is support enabling participation, or creating dependency / rescuing?'
  ]},
  {id:'outer',triplet:'Curiosity ↔ Outer Self ↔ Capacity',title:'Outer Self / Capacity',questions:[
    'Where has certainty replaced curiosity?',
    'What capacity exists but is not being used?',
    'What skill, relationship or question would expand the range of possible action?'
  ]},
  {id:'inner',triplet:'Participation ↔ Inner Self ↔ Well-being',title:'Inner Self / Well-being',questions:[
    'What is it actually like to be the people living this situation?',
    'What meaningful participation is becoming more possible or less possible?',
    'What capacities are changing alongside subjective wellbeing?'
  ]},
  {id:'noself',triplet:'Nothing / Everything ↔ No Self ↔ Everything / Nothing',title:'Context orientation / No Self',noScore:true,questions:[
    'What if the present description of the problem is itself part of the problem?',
    'Which perspective is being treated as the centre?',
    'What observation would force a causal revision?',
    'What becomes visible if attention shifts from the content of the dispute to the context generating it?'
  ]}
];

const provenanceTypes = [
  ['user_reported_observation','User-reported observation'],
  ['user_interpretation','User interpretation / attribution'],
  ['ai_inference','AI inference'],
  ['verified_external','Independently verified'],
  ['absent_party_account','Absent-party account'],
  ['unknown','Unknown / unclear']
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

function init(){
  renderHorizons();
  addEvidence({text:'',provenance:'user_reported_observation',about:'system'});
  addEvidence({text:'',provenance:'user_interpretation',about:'other_party'});
  addMove(); addMove();
  bind();
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
    const statuses=h.noScore?'<span class="muted">Not scored or rated</span>':`<div class="statuses">
      <label><input type="radio" name="${h.id}Status" value="restriction"> Restriction</label>
      <label><input type="radio" name="${h.id}Status" value="uncertain" checked> Uncertain</label>
      <label><input type="radio" name="${h.id}Status" value="open"> Flowing</label>
      <label><input type="radio" name="${h.id}Status" value="irrelevant"> Not relevant</label>
    </div>`;
    el.innerHTML=`<div class="horizonTop"><div><div class="horizonTriplet">${h.triplet}</div><h3>${h.title}</h3></div>${statuses}</div>
      <ul class="questions">${h.questions.map(q=>`<li>${q}</li>`).join('')}</ul>
      <label>Your observations</label><textarea id="${h.id}Notes" rows="4"></textarea>`;
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
    <textarea class="evidenceText" rows="3" placeholder="One consequential proposition at a time.">${escapeTextarea(seed.text||'')}</textarea>
    <div class="evidenceMeta">
      <div><label>Provenance</label><select class="evidenceProvenance">${provenanceTypes.map(([v,l])=>`<option value="${v}" ${seed.provenance===v?'selected':''}>${l}</option>`).join('')}</select></div>
      <div><label>About</label><select class="evidenceAbout">
        ${['system','self','other_party','third_party','environment','unknown'].map(v=>`<option value="${v}" ${seed.about===v?'selected':''}>${pretty(v)}</option>`).join('')}
      </select></div>
      <div><label>Confidence</label><select class="evidenceConfidence">
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
  $('nextBtn').textContent=step===7?'Review report':'Next';
  if(step===7)renderSMEAC();
  if(step===2)updateSingleNarratorNotice();
  logEvent('step_view',{step});
  window.scrollTo({top:0,behavior:'smooth'});
}
