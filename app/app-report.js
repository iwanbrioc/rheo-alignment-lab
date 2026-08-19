function esc(s){return (s||'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]));}
function lines(s){return s?s.split(/\n+/).filter(Boolean).map(x=>`<li>${esc(x)}</li>`).join(''):'<li>Not yet specified.</li>';}
function provenanceLabel(v){return (provenanceTypes.find(x=>x[0]===v)||[v,pretty(v)])[1];}

function renderSMEAC(){
  const d=data();caseId=d.caseId;
  const relevant=d.horizons.filter(h=>h.status!=='irrelevant'&&(h.notes||h.status==='restriction'));
  const singleNarrator=!d.evidence.some(x=>['verified_external','absent_party_account'].includes(x.provenance));
  const mission=d.context.whatMatters
    ? `Protect what matters while finding a next step you can revise: ${d.context.whatMatters}`
    : 'Find a workable next step that keeps future choices open.';
  const evidenceRows=d.evidence.length?d.evidence.map(e=>`<tr><td>${esc(e.text)}</td><td><span class="badge">${esc(provenanceLabel(e.provenance))}</span></td><td>${esc(pretty(e.about))}</td><td>${esc(pretty(e.confidence))}</td></tr>`).join(''):'<tr><td colspan="4">No statements entered.</td></tr>';
  const movesHtml=d.moves.length?d.moves.map(m=>`<li><strong>Option ${m.number}: ${esc(m.action||'Unnamed option')}</strong><ul>
    <li>What it might help: ${esc(m.restriction||'Not yet specified')}</li>
    <li>Why it may be worth trying: ${esc(m.evidence||'Not yet specified')}</li>
    <li>New option it could open: ${esc(m.affordance||'Not yet specified')}</li>
    <li>Who or what might pay a price: ${esc(m.displacedCost||'Unknown / not yet tested')}</li>
    <li>Future option it could close: ${esc(m.foreclose||'Unknown / not yet tested')}</li>
    <li>Small reversible test: ${esc(m.reversibleTest||'Not yet specified')}</li>
    <li>Voice / support needed: ${esc(m.dialogue||'Not yet specified')}</li>
    <li>What would tell us to stop or change course: ${esc(m.stopSignal||'Not yet specified')}</li>
  </ul></li>`).join(''):'<li>No options entered yet.</li>';
  const p=d.powerSafety;
  const powerSummary=`Fear of consequences for disagreeing: ${p.fearRetaliation}; unable to freely leave or refuse: ${p.constrainedExit}; monitoring/control: ${p.surveillanceControl}; material dependency: ${p.materialDependence}; major power difference: ${p.powerAsymmetry}.`;

  $('smeacOutput').innerHTML=`
    <h3>1. What’s going on? <span class="modelMeta">Situation</span></h3>
    <p><strong>How you see it now:</strong> ${esc(d.context.situation)||'Not specified.'}</p>
    <p><strong>Who else is affected:</strong></p><ul>${lines(d.context.stakeholders)}</ul>
    <p><strong>What is missing, unclear or disputed:</strong></p><ul>${lines(d.context.uncertainties)}</ul>
    ${singleNarrator?'<p class="question"><strong>Only one side represented:</strong> this map still comes mainly from the account entered here.</p>':''}
    <p><strong>Important statements and where they came from:</strong></p>
    <div style="overflow:auto"><table class="provenanceTable"><thead><tr><th>Statement</th><th>Where it comes from</th><th>About</th><th>How sure?</th></tr></thead><tbody>${evidenceRows}</tbody></table></div>
    <p><strong>What stood out in the bigger-picture check:</strong></p><ul>${relevant.length?relevant.map(h=>`<li><strong>${esc(displayHorizonTitle(h.id))}</strong> — ${esc(h.status)}${h.notes?`: ${esc(h.notes)}`:''}</li>`).join(''):'<li>Nothing marked yet.</li>'}</ul>
    <p><strong>What may be getting stuck:</strong> ${esc(d.contractions.primary)||'Not yet specified.'}</p>
    <p><strong>Power and safety:</strong> ${esc(powerSummary)}</p>
    ${d.safetyGateActive?'<p class="notice"><strong>Take extra care:</strong> do not assume that confrontation, mediation, disclosure or more dialogue is safe when someone may fear consequences or may not be free to leave or refuse.</p>':''}
    ${!d.safetyGateActive&&d.safetyUnresolved?'<p class="question"><strong>Safety is still uncertain:</strong> there is not enough information here to rule concerns in or out.</p>':''}
    <p class="question"><strong>What would change our mind?</strong> ${esc(d.contractions.disconfirmingEvidence)||'What would show that this explanation is wrong?'}</p>

    <h3>2. What are we trying to make possible? <span class="modelMeta">Mission</span></h3>
    <p>${esc(mission)}</p>
    <p><strong>Time to decide:</strong> ${esc(d.context.decisionHorizon)||'unknown'} · <strong>How long effects could last:</strong> ${esc(d.context.recoveryHorizon)||'unknown'}.</p>
    <p><strong>A line we should not cross:</strong> ${esc(d.viability.viabilityFloor)||'Not yet identified.'}</p>

    <h3>3. What could we try? <span class="modelMeta">Execution</span></h3>
    <ul>${movesHtml}</ul>
    <p><strong>What needs time and the right conditions to recover:</strong> ${esc(d.viability.regenerate)||'Not yet identified.'}</p>
    <p><strong>Damage a good ending could hide:</strong> ${esc(d.viability.trajectoryConcern)||'Not yet identified.'}</p>
    <p><strong>What could be seriously or permanently lost:</strong> ${esc(d.viability.foreclose)||'Not yet identified.'}</p>

    <h3>4. What do we need to make it happen? <span class="modelMeta">Administration / logistics</span></h3>
    <p>${esc(d.admin)||'Not yet specified.'}</p>

    <h3>5. Who decides, who needs a voice, and what will we watch? <span class="modelMeta">Command / signal</span></h3>
    <p>${esc(d.commandSignal)||'Not yet specified.'}</p>
    <p><strong>Whose view could change the picture:</strong> ${esc(d.contractions.missingPerspective)||'Not yet specified.'}</p>
    <p class="question"><strong>When you review this:</strong> what would tell you the map is wrong, including a cost that has landed on someone or something outside your immediate view?</p>`;
}

function bullets(s){return s?s.split(/\n+/).filter(Boolean).map(x=>`- ${x}`).join('\n'):'- Not specified.';}

function toMarkdown(d){
  const relevant=d.horizons.filter(h=>h.status!=='irrelevant'&&(h.notes||h.status==='restriction'));
  const singleNarrator=!d.evidence.some(x=>['verified_external','absent_party_account'].includes(x.provenance));
  const mission=d.context.whatMatters?`Protect what matters while finding a next step you can revise: ${d.context.whatMatters}`:'Find a workable next step that keeps future choices open.';
  const evidence=d.evidence.length?d.evidence.map(e=>`- [${provenanceLabel(e.provenance)} | about: ${pretty(e.about)} | confidence: ${pretty(e.confidence)}] ${e.text}`).join('\n'):'- None entered.';
  const moves=d.moves.length?d.moves.map(m=>`### Option ${m.number}: ${m.action||'Unnamed'}\n- What it might help: ${m.restriction||'Not specified'}\n- Why it may be worth trying: ${m.evidence||'Not specified'}\n- New option it could open: ${m.affordance||'Not specified'}\n- Who or what might pay a price: ${m.displacedCost||'Unknown'}\n- Future option it could close: ${m.foreclose||'Unknown'}\n- Small reversible test: ${m.reversibleTest||'Not specified'}\n- Voice / support needed: ${m.dialogue||'Not specified'}\n- Stop / change-course signal: ${m.stopSignal||'Not specified'}`).join('\n\n'):'No options entered yet.';
  return `# Rheo working plan\n\n_SMEAC structure: Situation · Mission · Execution · Administration · Command/Signal_\n\n## 1. What’s going on?\n**How you see it now:** ${d.context.situation||'Not specified.'}\n\n**Who else is affected**\n${bullets(d.context.stakeholders)}\n\n**What is missing, unclear or disputed**\n${bullets(d.context.uncertainties)}\n\n${singleNarrator?'**Only one side represented:** this map still comes mainly from the account entered here.\n\n':''}**Important statements and where they came from**\n${evidence}\n\n**What stood out in the bigger-picture check**\n${relevant.length?relevant.map(h=>`- **${displayHorizonTitle(h.id)}** — ${h.status}${h.notes?`: ${h.notes}`:''}`).join('\n'):'- Nothing marked.'}\n\n**What may be getting stuck:** ${d.contractions.primary||'Not yet specified.'}\n\n**What would change our mind:** ${d.contractions.disconfirmingEvidence||'Not yet specified.'}\n\n**Power and safety:** ${JSON.stringify(d.powerSafety)}\n\n## 2. What are we trying to make possible?\n${mission}\n\n**Time to decide:** ${d.context.decisionHorizon||'unknown'}  \n**How long effects could last:** ${d.context.recoveryHorizon||'unknown'}  \n**A line we should not cross:** ${d.viability.viabilityFloor||'Not yet identified.'}\n\n## 3. What could we try?\n${moves}\n\n**What needs time to recover:** ${d.viability.regenerate||'Not yet identified.'}\n\n**Damage a good ending could hide:** ${d.viability.trajectoryConcern||'Not yet identified.'}\n\n**What could be seriously or permanently lost:** ${d.viability.foreclose||'Not yet identified.'}\n\n## 4. What do we need to make it happen?\n${d.admin||'Not yet specified.'}\n\n## 5. Who decides, who needs a voice, and what will we watch?\n${d.commandSignal||'Not yet specified.'}\n\n**Whose view could change the picture:** ${d.contractions.missingPerspective||'Not yet specified.'}\n\n**Review question:** What would tell us this map is wrong, including harm or cost that has landed outside the immediate frame?\n\n---\nRheo v0.3.1 research prototype — no aggregate Reciprocal Wellbeing score.\n`;
}

function download(name,content,type){
  const blob=new Blob([content],{type});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),500);
}
function exportMarkdown(){const d=data();download(`rheo-${d.caseId}.md`,toMarkdown(d),'text/markdown');}
function exportJSON(){const d=data();download(`rheo-${d.caseId}.json`,JSON.stringify(d,null,2),'application/json');}
function exportResearchLog(){const logs=JSON.parse(localStorage.getItem('rheo_research_log_v0_2')||'[]');download(`rheo-research-log-${sessionId}.json`,JSON.stringify(logs,null,2),'application/json');}

function saveCase(){
  const d=data();caseId=d.caseId;
  const all=JSON.parse(localStorage.getItem('rheo_cases_v0_2')||'[]');const i=all.findIndex(x=>x.caseId===d.caseId);if(i>=0)all[i]=d;else all.unshift(d);
  localStorage.setItem('rheo_cases_v0_2',JSON.stringify(all));logEvent('case_saved',{caseId});alert('Saved in this browser.');
}

function saveOutcome(){
  if(!caseId)saveCase();
  const outcome={
    outcomeId:safeUUID(),caseId,createdAt:new Date().toISOString(),
    actualOutcome:$('actualOutcome').value.trim(),
    mapMissed:$('mapMissed').value.trim(),
    newAffordance:$('newAffordance').value.trim(),
    systemChanges:$('systemChanges').value.trim(),
    thirdPartyCost:$('thirdPartyCost').value.trim()
  };
  const all=JSON.parse(localStorage.getItem('rheo_casebook_v0_2')||'[]');all.unshift(outcome);localStorage.setItem('rheo_casebook_v0_2',JSON.stringify(all));
  logEvent('outcome_review_saved',{outcomeId:outcome.outcomeId});alert('Outcome saved separately.');
}

function showSaved(){
  $('homeView').classList.add('hidden');$('wizardView').classList.add('hidden');$('savedView').classList.remove('hidden');
  const all=JSON.parse(localStorage.getItem('rheo_cases_v0_2')||'[]');
  $('savedCases').innerHTML=all.length?all.map(c=>`<div class="savedItem"><strong>${esc((c.context.situation||'Untitled case').slice(0,110))}</strong><br/><small>${new Date(c.createdAt).toLocaleString()} · ${esc(c.caseId)}</small><div class="row"><button class="secondary" onclick="loadCase('${c.caseId}')">Open</button></div></div>`).join(''):'<p>No saved cases yet.</p>';
}

window.loadCase=function(id){
  const all=JSON.parse(localStorage.getItem('rheo_cases_v0_2')||'[]');const c=all.find(x=>x.caseId===id);if(!c)return;
  caseId=c.caseId;
  Object.entries(c.context||{}).forEach(([k,v])=>{if($(k))$(k).value=v||'';});
  $('evidenceLedger').innerHTML='';evidenceCount=0;(c.evidence?.length?c.evidence:[{}]).forEach(addEvidence);
  (c.horizons||[]).forEach(h=>{if($(h.id+'Notes'))$(h.id+'Notes').value=h.notes||'';const r=document.querySelector(`input[name="${h.id}Status"][value="${h.status}"]`);if(r)r.checked=true;});
  $('primaryContraction').value=c.contractions?.primary||'';$('disconfirmingEvidence').value=c.contractions?.disconfirmingEvidence||'';$('missingPerspective').value=c.contractions?.missingPerspective||'';$('narratorImplicated').checked=!!c.contractions?.narratorImplicated;
  Object.entries(c.powerSafety||{}).forEach(([k,v])=>{if($(k))$(k).value=v||'';});
  $('foreclose').value=c.viability?.foreclose||'';$('regenerate').value=c.viability?.regenerate||'';$('viabilityFloor').value=c.viability?.viabilityFloor||'';$('trajectoryConcern').value=c.viability?.trajectoryConcern||'';
  $('admin').value=c.admin||'';$('commandSignal').value=c.commandSignal||'';
  $('moves').innerHTML='';moveCount=0;(c.moves?.length?c.moves:[{},{}]).forEach(addMove);
  updateSafetyGate();
  $('savedView').classList.add('hidden');$('wizardView').classList.remove('hidden');go(7);
};

init();
