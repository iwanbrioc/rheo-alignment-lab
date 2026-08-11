function esc(s){return (s||'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]));}
function lines(s){return s?s.split(/\n+/).filter(Boolean).map(x=>`<li>${esc(x)}</li>`).join(''):'<li>Not yet specified.</li>';}
function provenanceLabel(v){return (provenanceTypes.find(x=>x[0]===v)||[v,pretty(v)])[1];}

function renderSMEAC(){
  const d=data();caseId=d.caseId;
  const relevant=d.horizons.filter(h=>h.status!=='irrelevant'&&(h.notes||h.status==='restriction'));
  const singleNarrator=!d.evidence.some(x=>['verified_external','absent_party_account'].includes(x.provenance));
  const mission=d.context.whatMatters
    ? `Protect what matters while creating a viable, revisable next step: ${d.context.whatMatters}`
    : 'Create a viable, revisable next step that preserves future possibility without treating continuity as the objective.';
  const evidenceRows=d.evidence.length?d.evidence.map(e=>`<tr><td>${esc(e.text)}</td><td><span class="badge">${esc(provenanceLabel(e.provenance))}</span></td><td>${esc(pretty(e.about))}</td><td>${esc(pretty(e.confidence))}</td></tr>`).join(''):'<tr><td colspan="4">No evidence statements entered.</td></tr>';
  const movesHtml=d.moves.length?d.moves.map(m=>`<li><strong>Move ${m.number}: ${esc(m.action||'Unnamed action')}</strong><ul>
    <li>Restriction addressed: ${esc(m.restriction||'Not yet specified')}</li>
    <li>Evidence: ${esc(m.evidence||'Not yet specified')}</li>
    <li>Affordance created: ${esc(m.affordance||'Not yet specified')}</li>
    <li>Displaced cost: ${esc(m.displacedCost||'Unknown / not yet tested')}</li>
    <li>Could foreclose: ${esc(m.foreclose||'Unknown / not yet tested')}</li>
    <li>Small reversible test: ${esc(m.reversibleTest||'Not yet specified')}</li>
    <li>Voice / support needed: ${esc(m.dialogue||'Not yet specified')}</li>
    <li>Stop / revision signal: ${esc(m.stopSignal||'Not yet specified')}</li>
  </ul></li>`).join(''):'<li>No moves entered yet.</li>';
  const p=d.powerSafety;
  const powerSummary=`Fear/retaliation: ${p.fearRetaliation}; constrained exit: ${p.constrainedExit}; surveillance/control: ${p.surveillanceControl}; material dependency: ${p.materialDependence}; major power asymmetry: ${p.powerAsymmetry}.`;

  $('smeacOutput').innerHTML=`
    <h3>S — Situation</h3>
    <p><strong>Current situation:</strong> ${esc(d.context.situation)||'Not specified.'}</p>
    <p><strong>Affected / absent parties:</strong></p><ul>${lines(d.context.stakeholders)}</ul>
    <p><strong>Missing / disputed:</strong></p><ul>${lines(d.context.uncertainties)}</ul>
    ${singleNarrator?'<p class="question"><strong>Epistemic limitation:</strong> this remains predominantly a single-narrator map.</p>':''}
    <p><strong>Evidence ledger:</strong></p>
    <div style="overflow:auto"><table class="provenanceTable"><thead><tr><th>Statement</th><th>Provenance</th><th>About</th><th>Confidence</th></tr></thead><tbody>${evidenceRows}</tbody></table></div>
    <p><strong>Relevant horizon signals:</strong></p><ul>${relevant.length?relevant.map(h=>`<li><strong>${esc(h.triplet)}</strong> — ${esc(h.status)}${h.notes?`: ${esc(h.notes)}`:''}</li>`).join(''):'<li>No horizon signal marked.</li>'}</ul>
    <p><strong>Working contraction:</strong> ${esc(d.contractions.primary)||'Not yet specified.'}</p>
    <p><strong>Power / exit uncertainty:</strong> ${esc(powerSummary)}</p>
    ${d.safetyGateActive?'<p class="notice"><strong>Safety gate:</strong> relationship preservation, confrontation, mediation, disclosure or increased dialogue must not be assumed safe. Future autonomy and safety take priority over preserving exposure to danger or coercion.</p>':''}
    <p class="question"><strong>Disconfirming test:</strong> ${esc(d.contractions.disconfirmingEvidence)||'What would make this map wrong?'}</p>

    <h3>M — Mission</h3>
    <p>${esc(mission)}</p>
    <p><strong>Decision horizon:</strong> ${esc(d.context.decisionHorizon)||'unknown'} · <strong>Consequence/recovery horizon:</strong> ${esc(d.context.recoveryHorizon)||'unknown'}.</p>
    <p><strong>Viability floor:</strong> ${esc(d.viability.viabilityFloor)||'Not yet identified.'}</p>

    <h3>E — Execution</h3>
    <ul>${movesHtml}</ul>
    <p><strong>Regenerative capacity to protect:</strong> ${esc(d.viability.regenerate)||'Not yet identified.'}</p>
    <p><strong>Full-trajectory concern:</strong> ${esc(d.viability.trajectoryConcern)||'Not yet identified.'}</p>
    <p><strong>What could be permanently foreclosed:</strong> ${esc(d.viability.foreclose)||'Not yet identified.'}</p>

    <h3>A — Administration / Logistics</h3>
    <p>${esc(d.admin)||'Not yet specified.'}</p>

    <h3>C — Command / Signal</h3>
    <p>${esc(d.commandSignal)||'Not yet specified.'}</p>
    <p><strong>Missing perspective / local knowledge to seek:</strong> ${esc(d.contractions.missingPerspective)||'Not yet specified.'}</p>
    <p class="question"><strong>Review question:</strong> What should we watch for that would tell us this map is wrong — including harm displaced outside the user's immediate system?</p>`;
}

function bullets(s){return s?s.split(/\n+/).filter(Boolean).map(x=>`- ${x}`).join('\n'):'- Not specified.';}

function toMarkdown(d){
  const relevant=d.horizons.filter(h=>h.status!=='irrelevant'&&(h.notes||h.status==='restriction'));
  const singleNarrator=!d.evidence.some(x=>['verified_external','absent_party_account'].includes(x.provenance));
  const mission=d.context.whatMatters?`Protect what matters while creating a viable, revisable next step: ${d.context.whatMatters}`:'Create a viable, revisable next step that preserves future possibility without treating continuity as the objective.';
  const evidence=d.evidence.length?d.evidence.map(e=>`- [${provenanceLabel(e.provenance)} | about: ${pretty(e.about)} | confidence: ${pretty(e.confidence)}] ${e.text}`).join('\n'):'- None entered.';
  const moves=d.moves.length?d.moves.map(m=>`### Move ${m.number}: ${m.action||'Unnamed'}\n- Restriction addressed: ${m.restriction||'Not specified'}\n- Evidence: ${m.evidence||'Not specified'}\n- New affordance: ${m.affordance||'Not specified'}\n- Displaced cost: ${m.displacedCost||'Unknown'}\n- Could foreclose: ${m.foreclose||'Unknown'}\n- Small reversible test: ${m.reversibleTest||'Not specified'}\n- Voice / support needed: ${m.dialogue||'Not specified'}\n- Stop / revision signal: ${m.stopSignal||'Not specified'}`).join('\n\n'):'No moves entered yet.';
  return `# Rheocratic SMEAC\n\n## S — Situation\n**Current situation:** ${d.context.situation||'Not specified.'}\n\n**Affected / absent parties**\n${bullets(d.context.stakeholders)}\n\n**Missing / disputed**\n${bullets(d.context.uncertainties)}\n\n${singleNarrator?'**Epistemic limitation:** this remains predominantly a single-narrator map.\n\n':''}**Evidence ledger**\n${evidence}\n\n**Relevant horizon signals**\n${relevant.length?relevant.map(h=>`- **${h.triplet}** — ${h.status}${h.notes?`: ${h.notes}`:''}`).join('\n'):'- None marked.'}\n\n**Working contraction:** ${d.contractions.primary||'Not yet specified.'}\n\n**Disconfirming evidence:** ${d.contractions.disconfirmingEvidence||'Not yet specified.'}\n\n**Power / safety:** ${JSON.stringify(d.powerSafety)}\n\n## M — Mission\n${mission}\n\n**Decision horizon:** ${d.context.decisionHorizon||'unknown'}  \n**Consequence/recovery horizon:** ${d.context.recoveryHorizon||'unknown'}  \n**Viability floor:** ${d.viability.viabilityFloor||'Not yet identified.'}\n\n## E — Execution\n${moves}\n\n**Regenerative capacity to protect:** ${d.viability.regenerate||'Not yet identified.'}\n\n**Full-trajectory concern:** ${d.viability.trajectoryConcern||'Not yet identified.'}\n\n**What could be permanently foreclosed:** ${d.viability.foreclose||'Not yet identified.'}\n\n## A — Administration / Logistics\n${d.admin||'Not yet specified.'}\n\n## C — Command / Signal\n${d.commandSignal||'Not yet specified.'}\n\n**Missing perspective / local knowledge to seek:** ${d.contractions.missingPerspective||'Not yet specified.'}\n\n**Review question:** What should we watch for that would tell us this map is wrong — including harm displaced outside the user's immediate system?\n\n---\nRheo v0.2 research prototype — no aggregate Reciprocal Wellbeing score.\n`;
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
  localStorage.setItem('rheo_cases_v0_2',JSON.stringify(all));logEvent('case_saved',{caseId});alert('Saved locally.');
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
  logEvent('outcome_review_saved',{outcomeId:outcome.outcomeId});alert('Outcome review saved separately.');
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
