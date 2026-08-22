const horizons = [
  {
    id:'environment', intervention:'Re-enchantment', horizon:'Natural Environment', organ:'Resources',
    triplet:'Re-enchantment ← Natural Environment → Resources',
    title:'Natural Environment / Resources', plainTitle:'Resources',
    questions:[
      'What living, material or ecological resources does this situation depend on?',
      'Are those resources renewing, being depleted, or becoming inaccessible?',
      'What would help people encounter the resource as something alive and worth caring for, rather than merely something to consume?'
    ]
  },
  {
    id:'culture', intervention:'Transformation', horizon:'Culture', organ:'Values',
    triplet:'Transformation ← Culture → Values',
    title:'Culture / Values', plainTitle:'Values',
    questions:[
      'What values, stories or habits are actually organising behaviour here?',
      'Are stated values becoming lived values, or has flow stalled between the two?',
      'What transformation would allow different values to become possible or credible?'
    ]
  },
  {
    id:'infrastructure', intervention:'Creativity', horizon:'Infrastructure', organ:'Affordance',
    triplet:'Creativity ← Infrastructure → Affordance',
    title:'Infrastructure / Affordance', plainTitle:'Affordance',
    questions:[
      'What can people actually do within the present structures, not merely in theory?',
      'Which useful possibility is nominally available but practically blocked?',
      'What creative change in the structure could make a new option genuinely usable?'
    ]
  },
  {
    id:'society', intervention:'Dialogue', horizon:'Society', organ:'Support',
    triplet:'Dialogue ← Society → Support',
    title:'Society / Support', plainTitle:'Support',
    questions:[
      'Where is support genuinely circulating, and where has it become one-way, brittle or dependent?',
      'Who is in real dialogue, and who is only being spoken about?',
      'What dialogue could change the conditions in which support becomes possible?'
    ]
  },
  {
    id:'outer', intervention:'Curiosity', horizon:'Outer Self', organ:'Capacity',
    triplet:'Curiosity ← Outer Self → Capacity',
    title:'Outer Self / Capacity', plainTitle:'Capacity',
    questions:[
      'What capability exists but is not currently usable?',
      'Where might certainty, habit or role be preventing learning?',
      'What curiosity could reveal, develop or reconnect the capacity that is missing?'
    ]
  },
  {
    id:'inner', intervention:'Participation', horizon:'Inner Self', organ:'Wellbeing',
    triplet:'Participation ← Inner Self → Wellbeing',
    title:'Inner Self / Wellbeing', plainTitle:'Wellbeing',
    questions:[
      'What is this situation actually like for the people living it?',
      'Who is becoming more or less able to participate meaningfully?',
      'What form of participation could restore agency rather than prescribe an outcome for them?'
    ]
  },
  {
    id:'noself', intervention:'Nothing / Everything', horizon:'No Self', organ:'Everything / Nothing',
    triplet:'Nothing / Everything ← No Self → Everything / Nothing',
    title:'No Self / Everything–Nothing', plainTitle:'Everything / Nothing',
    questions:[
      'Whose point of view is being treated as the centre of the system?',
      'What if the present description of the problem is itself one of the things happening?',
      'What becomes visible if the narrator, their organisation and their preferred solution are treated as ordinary nodes in the wider context?'
    ]
  }
];

const wellbeingActivators = [
  ['be_active','Be Active','Bring the intervention into contact with reality through appropriate action.'],
  ['be_creative','Be Creative','Keep making and testing possibilities rather than fixing one answer too early.'],
  ['connect','Connect','Strengthen relationships and circulation without assuming connection is always safe.'],
  ['keep_learning','Keep Learning','Let new evidence alter both the intervention and the diagnosis.'],
  ['take_notice','Take Notice','Attend closely to what is actually happening, including weak or inconvenient signals.'],
  ['give','Give','Contribute what the wider flow needs without making the intervention about control or possession.'],
  ['let_go','Let Go','Release strategies, identities or solutions that are blocking fresh flow.']
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

function flowPair(id){ return horizons.find(x=>x.id===id) || horizons[0]; }
function displayHorizonTitle(id){
  const h=flowPair(id);
  return `${h.organ} — ${h.horizon}`;
}

function init(){
  renderHorizons();
  renderPrimaryRestrictionControl();
  renderActivators();
  addEvidence({text:'',provenance:'user_reported_observation',about:'system'});
  addEvidence({text:'',provenance:'user_interpretation',about:'other_party'});
  addMove(); addMove();
  bind();
  updateAlignedIntervention();
  updateSafetyGate();
  logEvent('app_open',{guideVersion:'0.4.0'});
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
  $('primaryFlowRow')?.addEventListener('change',()=>{
    updateAlignedIntervention();
    logEvent('primary_flow_row_selected',{rowId:$('primaryFlowRow').value});
  });
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
  $('openingContext').value='Our community project has to make a funding decision within two weeks. A partner relationship has become strained, staff are tired, and one option would solve the immediate budget problem but may damage trust that took years to build. I need to know where the flow is actually blocked, what intervention belongs there, and what a proportionate next move looks like.';
}

function renderHorizons(){
  const host=$('horizonCards');host.innerHTML='';
  horizons.forEach((h,i)=>{
    const el=document.createElement('section');el.className='card horizon flowHorizon';
    const statuses=`<div class="statuses flowStatuses">
      <label><input type="radio" name="${h.id}Status" value="restricted"> Restricted</label>
      <label><input type="radio" name="${h.id}Status" value="severed"> Severed</label>
      <label><input type="radio" name="${h.id}Status" value="uncertain" checked> Uncertain</label>
      <label><input type="radio" name="${h.id}Status" value="flowing"> Flowing</label>
    </div>`;
    el.innerHTML=`
      <div class="flowPair" aria-label="${h.triplet}">
        <div class="flowSide interventionSide"><span class="flowDirection">↑ intervention</span><strong>${h.intervention}</strong></div>
        <div class="flowHorizonCentre"><span>Horizon ${i+1}</span><strong>${h.horizon}</strong></div>
        <div class="flowSide organSide"><span class="flowDirection">↓ organ</span><strong>${h.organ}</strong></div>
      </div>
      <div class="horizonTop"><div><h3>${h.organ}: is flow moving?</h3><p class="muted">If ${h.organ} is the primary restriction, the aligned intervention is <strong>${h.intervention}</strong> through the ${h.horizon} horizon.</p></div>${statuses}</div>
      <ul class="questions">${h.questions.map(q=>`<li>${q}</li>`).join('')}</ul>
      <label>What do you notice about flow here?</label><textarea id="${h.id}Notes" rows="4"></textarea>`;
    host.appendChild(el);
  });
}

function renderPrimaryRestrictionControl(){
  const select=$('primaryFlowRow');
  if(!select)return;
  select.innerHTML='<option value="">Not yet sure</option>'+horizons.map(h=>`<option value="${h.id}">${h.organ} — ${h.horizon}</option>`).join('');
}

function updateAlignedIntervention(){
  const out=$('alignedInterventionNotice');
  if(!out)return;
  const id=$('primaryFlowRow')?.value;
  if(!id){
    out.innerHTML='<strong>No primary restriction selected yet.</strong> Keep the diagnosis open until one organ looks more load-bearing than the others.';
    return;
  }
  const h=flowPair(id);
  out.innerHTML=`<strong>Aligned intervention:</strong> ${h.intervention} <span class="muted">through ${h.horizon}, responding to a restriction in ${h.organ}.</span>`;
}

function renderActivators(){
  const host=$('activatorGrid');
  if(!host)return;
  host.innerHTML=wellbeingActivators.map(([id,name,desc])=>`
    <label class="activatorCard">
      <input type="checkbox" id="activator_${id}" />
      <span><strong>${name}</strong><small>${desc}</small></span>
    </label>`).join('');
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
  if(step===4)updateAlignedIntervention();
  logEvent('step_view',{step});
  window.scrollTo({top:0,behavior:'smooth'});
}
