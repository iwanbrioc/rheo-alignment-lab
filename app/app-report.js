function esc(s){return (s||'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]));}
function lines(s){return s?s.split(/\n+/).filter(Boolean).map(x=>`<li>${esc(x)}</li>`).join(''):'<li>Not yet specified.</li>';}
function provenanceLabel(v){return (provenanceTypes.find(x=>x[0]===v)||[v,pretty(v)])[1];}

function renderSMEAC(){
  const d=data();caseId=d.caseId;
  const relevant=d.horizons.filter(h=>h.status!=='uncertain'||h.notes);
  const primary=d.flowModel.primaryRestriction;
  const foreground=d.flowModel.wellbeingActivators.filter(a=>a.foreground);
  const singleNarrator=!d.evidence.some(x=>['verified_external','absent_party_account'].includes(x.provenance));
  const mission=d.context.whatMatters
    ? `Release the restriction while protecting what matters and keeping the downstream form open: ${d.context.whatMatters}`
    : 'Release the primary restriction with the smallest sufficient influence, then observe what becomes possible next.';
  const evidenceRows=d.evidence.length?d.evidence.map(e=>`<tr><td>${esc(e.text)}</td><td><span class="badge">${esc(provenanceLabel(e.provenance))}</span></td><td>${esc(pretty(e.about))}</td><td>${esc(pretty(e.confidence))}</td></tr>`).join(''):'<tr><td colspan="4">No statements entered.</td></tr>';
  const movesHtml=d.moves.length?d.moves.map(m=>`<li><strong>Option ${m.number}: ${esc(m.action||'Unnamed option')}</strong><ul>
    <li>Restriction it might release: ${esc(m.restriction||'Not yet specified')}</li>
    <li>Why it may be worth trying: ${esc(m.evidence||'Not yet specified')}</li>
    <li>New flow or option it could open: ${esc(m.affordance||'Not yet specified')}</li>
    <li>Who or what might pay a price: ${esc(m.displacedCost||'Unknown / not yet tested')}</li>
    <li>Future option it could close: ${esc(m.foreclose||'Unknown / not yet tested')}</li>
    <li>Smallest sufficient test / influence: ${esc(m.reversibleTest||'Not yet specified')}</li>
    <li>Voice / support needed: ${esc(m.dialogue||'Not yet specified')}</li>
    <li>Relocate / stop signal: ${esc(m.stopSignal||'Not yet specified')}</li>
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

    <h3>2. Where is flow restricted? <span class="modelMeta">Flow diagnosis</span></h3>
    <p><strong>What stood out on the downsweep:</strong></p><ul>${relevant.length?relevant.map(h=>`<li><strong>${esc(h.organ)}</strong> through ${esc(h.horizon)} — ${esc(h.status)}${h.notes?`: ${esc(h.notes)}`:''}</li>`).join(''):'<li>No row has been distinguished yet.</li>'}</ul>
    <p><strong>Working primary restriction:</strong> ${primary.rowId?`${esc(primary.organ)} through ${esc(primary.horizon)}`:'Not yet located.'}</p>
    <p><strong>Aligned upsweep intervention:</strong> ${esc(primary.alignedIntervention)||'Not yet located.'}</p>
    <p><strong>Why this may be the restriction:</strong> ${esc(primary.diagnosis)||'Not yet specified.'}</p>
    <p class="question"><strong>What would relocate the diagnosis?</strong> ${esc(d.contractions.disconfirmingEvidence)||'What would show that the restriction is elsewhere?'}</p>
    <p><strong>Power and safety:</strong> ${esc(powerSummary)}</p>
    ${d.safetyGateActive?'<p class="notice"><strong>Take extra care:</strong> safety and autonomy outrank the normal aligned intervention when somebody may fear consequences or may not be free to leave or refuse.</p>':''}
    ${!d.safetyGateActive&&d.safetyUnresolved?'<p class="question"><strong>Safety is still uncertain:</strong> there is not enough information here to rule concerns in or out.</p>':''}

    <h3>3. What are we trying to make possible? <span class="modelMeta">Mission</span></h3>
    <p>${esc(mission)}</p>
    <p><strong>Time to decide:</strong> ${esc(d.context.decisionHorizon)||'unknown'} · <strong>How long effects could last:</strong> ${esc(d.context.recoveryHorizon)||'unknown'}.</p>
    <p><strong>A line we should not cross:</strong> ${esc(d.viability.viabilityFloor)||'Not yet identified.'}</p>

    <h3>4. What could release the restriction? <span class="modelMeta">Execution</span></h3>
    <p><strong>Aligned intervention horizon:</strong> ${esc(primary.alignedIntervention)||'Not yet located.'}</p>
    <ul>${movesHtml}</ul>
    <p><strong>Activator qualities to foreground:</strong> ${foreground.length?foreground.map(a=>esc(a.name)).join(' · '):'None foregrounded yet; all seven remain available.'}</p>
    <p><strong>How to keep the intervention fresh:</strong> ${esc(d.flowModel.activatorNotes)||'Not yet specified.'}</p>
    <p><strong>What needs time and the right conditions to regenerate:</strong> ${esc(d.viability.regenerate)||'Not yet identified.'}</p>
    <p><strong>Damage a good ending could hide:</strong> ${esc(d.viability.trajectoryConcern)||'Not yet identified.'}</p>
    <p><strong>What could be seriously or permanently lost:</strong> ${esc(d.viability.foreclose)||'Not yet identified.'}</p>

    <h3>5. What do we need to make it happen? <span class="modelMeta">Administration / logistics</span></h3>
    <p>${esc(d.admin)||'Not yet specified.'}</p>

    <h3>6. Who decides, who needs a voice, and what will we watch? <span class="modelMeta">Command / signal</span></h3>
    <p>${esc(d.commandSignal)||'Not yet specified.'}</p>
    <p><strong>Whose view could change the picture:</strong> ${esc(d.contractions.missingPerspective)||'Not yet specified.'}</p>
    <p class="question"><strong>When you review this:</strong> did the next part of the flow become more viable, or should the diagnosis move?</p>`;
}

function bullets(s){return s?s.split(/\n+/).filter(Boolean).map(x=>`- ${x}`).join('\n'):'- Not specified.';}

function toMarkdown(d){
  const relevant=d.horizons.filter(h=>h.status!=='uncertain'||h.notes);
  const primary=d.flowModel.primaryRestriction;
  const foreground=d.flowModel.wellbeingActivators.filter(a=>a.foreground);
  const singleNarrator=!d.evidence.some(x=>['verified_external','absent_party_account'].includes(x.provenance));
  const mission=d.context.whatMatters?`Release the restriction while protecting what matters and keeping the downstream form open: ${d.context.whatMatters}`:'Release the primary restriction with the smallest sufficient influence, then observe what becomes possible next.';
  const evidence=d.evidence.length?d.evidence.map(e=>`- [${provenanceLabel(e.provenance)} | about: ${pretty(e.about)} | confidence: ${pretty(e.confidence)}] ${e.text}`).join('\n'):'- None entered.';
  const moves=d.moves.length?d.moves.map(m=>`### Option ${m.number}: ${m.action||'Unnamed'}\n- Restriction it might release: ${m.restriction||'Not specified'}\n- Why it may be worth trying: ${m.evidence||'Not specified'}\n- New flow or option it could open: ${m.affordance||'Not specified'}\n- Who or what might pay a price: ${m.displacedCost||'Unknown'}\n- Future option it could close: ${m.foreclose||'Unknown'}\n- Smallest sufficient test / influence: ${m.reversibleTest||'Not specified'}\n- Voice / support needed: ${m.dialogue||'Not specified'}\n- Relocate / stop signal: ${m.stopSignal||'Not specified'}`).join('\n\n'):'No options entered yet.';
  return `# Rheo v0.4 working plan\n\n_Flow diagnosis + SMEAC action structure_\n\n## 1. What’s going on?\n**How you see it now:** ${d.context.situation||'Not specified.'}\n\n**Who else is affected**\n${bullets(d.context.stakeholders)}\n\n**What is missing, unclear or disputed**\n${bullets(d.context.uncertainties)}\n\n${singleNarrator?'**Only one side represented:** this map still comes mainly from the account entered here.\n\n':''}**Important statements and where they came from**\n${evidence}\n\n## 2. Where is flow restricted?\n${relevant.length?relevant.map(h=>`- **${h.organ}** through ${h.horizon} — ${h.status}${h.notes?`: ${h.notes}`:''}`).join('\n'):'- No row distinguished yet.'}\n\n**Working primary restriction:** ${primary.rowId?`${primary.organ} through ${primary.horizon}`:'Not yet located.'}\n\n**Aligned intervention:** ${primary.alignedIntervention||'Not yet located.'}\n\n**Why this may be the restriction:** ${primary.diagnosis||'Not yet specified.'}\n\n**What would relocate the diagnosis:** ${d.contractions.disconfirmingEvidence||'Not yet specified.'}\n\n## 3. What are we trying to make possible?\n${mission}\n\n**Time to decide:** ${d.context.decisionHorizon||'unknown'}  \n**How long effects could last:** ${d.context.recoveryHorizon||'unknown'}  \n**A line we should not cross:** ${d.viability.viabilityFloor||'Not yet identified.'}\n\n## 4. What could release the restriction?\n${moves}\n\n**Activator qualities to foreground:** ${foreground.length?foreground.map(a=>a.name).join(' · '):'None foregrounded; all seven remain available.'}\n\n**How to keep the intervention fresh:** ${d.flowModel.activatorNotes||'Not yet specified.'}\n\n**What needs time to regenerate:** ${d.viability.regenerate||'Not yet identified.'}\n\n**Damage a good ending could hide:** ${d.viability.trajectoryConcern||'Not yet identified.'}\n\n**What could be seriously or permanently lost:** ${d.viability.foreclose||'Not yet identified.'}\n\n## 5. What do we need to make it happen?\n${d.admin||'Not yet specified.'}\n\n## 6. Who decides, who needs a voice, and what will we watch?\n${d.commandSignal||'Not yet specified.'}\n\n**Whose view could change the picture:** ${d.contractions.missingPerspective||'Not yet specified.'}\n\n**Review question:** Did the next part of the downsweep become more viable, or should the diagnosis move?\n\n---\nRheo v0.4 flow-physiology research prototype — no aggregate Reciprocal Wellbeing score.\n`;
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
  localStorage.setItem('rheo_cases_v0_2',JSON.stringify(all));logEvent('case_saved',{caseId,guideVersion:'0.4.0'});alert('Saved in this browser.');
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
  $('savedCases').innerHTML=all.length?all.map(c=>`<div class="savedItem"><strong>${esc((c.context.situation||'Untitled case').slice(0,110))}</strong><br/><small>${new Date(c.createdAt).toLocaleString()} · ${esc(c.guideVersion||'legacy')} · ${esc(c.caseId)}</small><div class="row"><button class="secondary" onclick="loadCase('${c.caseId}')">Open</button></div></div>`).join(''):'<p>No saved cases yet.</p>';
}

window.loadCase=function(id){
  const all=JSON.parse(localStorage.getItem('rheo_cases_v0_2')||'[]');const c=all.find(x=>x.caseId===id);if(!c)return;
  caseId=c.caseId;
  Object.entries(c.context||{}).forEach(([k,v])=>{if($(k))$(k).value=v||'';});
  $('evidenceLedger').innerHTML='';evidenceCount=0;(c.evidence?.length?c.evidence:[{}]).forEach(addEvidence);
  const statusMap={restriction:'restricted',open:'flowing',irrelevant:'uncertain',restricted:'restricted',severed:'severed',uncertain:'uncertain',flowing:'flowing'};
  (c.horizons||[]).forEach(h=>{
    if($(h.id+'Notes'))$(h.id+'Notes').value=h.notes||'';
    const wanted=statusMap[h.status]||'uncertain';
    const r=document.querySelector(`input[name="${h.id}Status"][value="${wanted}"]`);if(r)r.checked=true;
  });
  const primaryRow=c.flowModel?.primaryRestriction?.rowId||'';
  if($('primaryFlowRow'))$('primaryFlowRow').value=primaryRow;
  updateAlignedIntervention();
  $('primaryContraction').value=c.contractions?.primary||c.flowModel?.primaryRestriction?.diagnosis||'';
  $('disconfirmingEvidence').value=c.contractions?.disconfirmingEvidence||'';$('missingPerspective').value=c.contractions?.missingPerspective||'';$('narratorImplicated').checked=!!c.contractions?.narratorImplicated;
  Object.entries(c.powerSafety||{}).forEach(([k,v])=>{if($(k))$(k).value=v||'';});
  $('foreclose').value=c.viability?.foreclose||'';$('regenerate').value=c.viability?.regenerate||'';$('viabilityFloor').value=c.viability?.viabilityFloor||'';$('trajectoryConcern').value=c.viability?.trajectoryConcern||'';
  for(const a of c.flowModel?.wellbeingActivators||[]){if($(`activator_${a.id}`))$(`activator_${a.id}`).checked=!!a.foreground;}
  if($('activatorNotes'))$('activatorNotes').value=c.flowModel?.activatorNotes||'';
  $('admin').value=c.admin||'';$('commandSignal').value=c.commandSignal||'';
  $('moves').innerHTML='';moveCount=0;(c.moves?.length?c.moves:[{},{}]).forEach(addMove);
  updateSafetyGate();
  $('savedView').classList.add('hidden');$('wizardView').classList.remove('hidden');go(7);
};

init();
