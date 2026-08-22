// Rheo v0.5 testimony-first adaptive interview.
// The RWB physiology stays behind the interview until a working pattern is ready.
(() => {
  const css=document.createElement('link');css.rel='stylesheet';css.href='interview.css';document.head.appendChild(css);

  const ROWS=[
    {rowId:'environment',organ:'Resources',horizon:'Natural Environment',intervention:'Re-enchantment'},
    {rowId:'culture',organ:'Values',horizon:'Culture',intervention:'Transformation'},
    {rowId:'infrastructure',organ:'Affordance',horizon:'Infrastructure',intervention:'Creativity'},
    {rowId:'society',organ:'Support',horizon:'Society',intervention:'Dialogue'},
    {rowId:'outer',organ:'Capacity',horizon:'Outer Self',intervention:'Curiosity'},
    {rowId:'inner',organ:'Wellbeing',horizon:'Inner Self',intervention:'Participation'},
    {rowId:'noself',organ:'Everything / Nothing',horizon:'No Self',intervention:'Nothing / Everything'}
  ];
  const QUESTION_TEMPLATES={
    environment:'What is actually available here — time, money, people, material resources or other conditions — and which of those are genuinely usable?',
    culture:'Where do people seem to agree on what matters, and where do their priorities or assumptions pull in different directions?',
    infrastructure:'Even if everyone involved wanted the same outcome tomorrow, what would still stop them from actually doing it?',
    society:'Where does information, trust or practical support stop reaching the people who need it?',
    outer:'If the practical barriers disappeared tomorrow, what ability, knowledge, confidence or relationship would still be missing?',
    inner:'What is this situation doing to people’s ability or willingness to take part meaningfully?',
    noself:'What changes if the way the problem is currently being described is treated as part of the situation, rather than as a neutral description of it?'
  };

  let state=null;
  const $=id=>document.getElementById(id);
  const uid=()=>typeof safeUUID==='function'?safeUUID():(crypto?.randomUUID?.()||`interview-${Date.now()}-${Math.random().toString(16).slice(2)}`);
  const escHtml=s=>String(s??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]));

  function install(){
    document.title='Rheo — Tell the story, let the pattern emerge';
    const hero=$('homeView');
    if(!hero)return;
    hero.classList.add('interviewHero');
    hero.innerHTML=`
      <div class="eyebrow">Rheo v0.5 · testimony-first research prototype</div>
      <h1>Tell me what’s happening</h1>
      <p class="lead">Start wherever makes sense. Rheo will listen, ask one question at a time, and only show a working pattern when there is enough evidence to distinguish it from plausible alternatives.</p>
      <div class="interviewStartBox">
        <label for="interviewOpening">What’s going on?</label>
        <textarea id="interviewOpening" rows="7" placeholder="Speak or type naturally. You do not need to organise the story for the model."></textarea>
        <p class="interviewMicHint">Voice is optional. You can edit the transcription before sending it.</p>
        <div class="interviewModeRow">
          <button class="primary" id="startInterviewBtn" type="button">Start the interview</button>
          <label><input type="checkbox" id="speakInterviewQuestions" /> Read Rheo’s questions aloud</label>
        </div>
      </div>
      <div class="notice"><strong>Rheo is a thinking tool, not an authority.</strong> It can mishear, misread and misdiagnose a pattern. The interview keeps testimony separate from Rheo’s interpretation so you can inspect and challenge the result.</div>
      <div class="advancedEntry"><button class="ghost" id="advancedFormBtn" type="button">Use the advanced / research form instead</button></div>`;

    const interview=document.createElement('section');
    interview.id='interviewView';interview.className='interviewView hidden';
    interview.innerHTML=`
      <div class="interviewGrid">
        <section class="card interviewConversation">
          <div class="transcriptTools"><div><div class="eyebrow">Adaptive interview</div><h2 id="interviewHeading">Tell the story</h2></div><div class="interviewPrivacy">Transcript stays in this browser unless you export it.</div></div>
          <div id="interviewStatus" class="interviewStatus">Rheo has not analysed the testimony yet.</div>
          <div id="interviewTranscript" class="interviewTranscript" aria-live="polite"></div>
          <div class="interviewAnswer">
            <div class="interviewQuestionMeta">Rheo’s next question</div>
            <div id="interviewQuestion" class="interviewQuestion">Tell me what is happening.</div>
            <label for="interviewAnswer">Your answer</label>
            <textarea id="interviewAnswer" rows="5" placeholder="Answer in your own words. It is fine to say you do not know."></textarea>
            <div class="interviewActions">
              <button class="primary" id="sendInterviewAnswer" type="button">Send answer</button>
              <button class="secondary" id="showWorkingPattern" type="button" disabled>Show the working pattern</button>
              <button class="ghost" id="stopInterview" type="button">Stop here</button>
            </div>
          </div>
        </section>
        <aside class="card interviewPattern">
          <div class="eyebrow">Pattern emerging</div>
          <h2>Flow map</h2>
          <div id="flowCanvas" class="flowCanvas"></div>
          <p id="patternHint" class="patternHint">Rheo is keeping several explanations open. Labels stay hidden while the interview is still eliciting testimony.</p>
          <div class="patternLegend"><span><i class="legendDot uncertain"></i>uncertain</span><span><i class="legendDot restricted"></i>possible restriction</span></div>
          <div id="workingPattern" class="workingPattern hidden"></div>
          <div class="interviewActions"><button class="secondary" id="downloadInterview" type="button">Export testimony + research record</button><button class="ghost" id="backHomeInterview" type="button">Start another</button></div>
        </aside>
      </div>`;
    const wizard=$('wizardView');wizard.parentNode.insertBefore(interview,wizard);

    $('startInterviewBtn').onclick=startInterview;
    $('advancedFormBtn').onclick=startAdvanced;
    $('sendInterviewAnswer').onclick=submitAnswer;
    $('showWorkingPattern').onclick=()=>revealPattern('user_requested');
    $('stopInterview').onclick=()=>revealPattern('user_stopped');
    $('downloadInterview').onclick=downloadInterview;
    $('backHomeInterview').onclick=resetToHome;
    $('interviewAnswer').addEventListener('keydown',e=>{if((e.metaKey||e.ctrlKey)&&e.key==='Enter')submitAnswer();});
    renderFlow(null,false);
  }

  function startAdvanced(){
    const text=$('interviewOpening').value.trim();
    if(text)$('openingContext').value=text;
    if(typeof start==='function')start();
  }

  async function startInterview(){
    const opening=$('interviewOpening').value.trim();
    if(!opening){$('interviewOpening').focus();return;}
    state={
      schemaVersion:'rheo-interview-v0.5',caseId:uid(),startedAt:new Date().toISOString(),
      turns:[{id:uid(),role:'participant',text:opening,at:new Date().toISOString(),originalText:opening,edits:[]}],
      analyses:[],asked:{grounding:false,affordance:false,perspective:false,contradiction:false,frame:false,safety:false},
      currentQuestion:null,ready:false,revealReason:null
    };
    $('homeView').classList.add('hidden');$('wizardView').classList.add('hidden');$('savedView')?.classList.add('hidden');$('interviewView').classList.remove('hidden');
    $('interviewAnswer').value='';renderTranscript();save();
    await analyseAndContinue();
  }

  function participantTurns(){return state?.turns.filter(t=>t.role==='participant')||[];}
  function latestFlow(){return state?.analyses.at(-1)?.flow||null;}

  function buildCaseRecord(){
    const pts=participantTurns();
    const situation=pts.map((t,i)=>`Testimony ${i+1}: ${t.text}`).join('\n\n');
    return {
      schemaVersion:'0.2',guideVersion:'0.5.0',caseId:state.caseId,createdAt:state.startedAt,
      context:{situation,whatMatters:'',stakeholders:'',uncertainties:'',decisionHorizon:'',recoveryHorizon:'',urgency:'Medium'},
      evidence:pts.map((t,i)=>({id:`t${i+1}`,text:t.text,provenance:'unknown',about:'unknown',confidence:'medium'})),
      horizons:[],contractions:{primary:'',disconfirmingEvidence:'',missingPerspective:'',narratorImplicated:false},
      powerSafety:{fearRetaliation:'Unknown',constrainedExit:'Unknown',surveillanceControl:'Unknown',materialDependence:'Unknown',powerAsymmetry:'Unknown',notes:''},
      safetyGateActive:false,safetyUnresolved:true,
      viability:{foreclose:'',regenerate:'',viabilityFloor:'',trajectoryConcern:''},moves:[],admin:'',commandSignal:''
    };
  }

  async function analyseAndContinue(){
    setStatus('Rheo is looking for what question would most change the picture…','thinking');
    $('sendInterviewAnswer').disabled=true;
    try{
      const r=await fetch('/api/rheo-flow',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({caseRecord:buildCaseRecord()})});
      const body=await r.json();
      if(!r.ok)throw new Error(body.error||'The flow analysis failed.');
      state.analyses.push({at:new Date().toISOString(),provider:body.provider,model:body.model,responseId:body.responseId,researchUsable:Boolean(body.researchUsable),flow:body.flow});
      state.ready=shouldBeReady();
      renderFlow(body.flow,state.ready);
      $('showWorkingPattern').disabled=false;
      if(state.ready){
        setStatus('Rheo has enough to show a working pattern. You can see it now, or answer one more question.','ready');
      } else setStatus('The pattern is still provisional. Rheo is keeping competing explanations open.','idle');
      const q=chooseNextQuestion(body.flow);
      state.currentQuestion=q;
      if(q){
        state.turns.push({id:uid(),role:'rheo',text:q.text,at:new Date().toISOString(),questionType:q.type,researchReason:q.reason});
        markAsked(q.type);
        $('interviewQuestion').textContent=q.text;
        maybeSpeak(q.text);
      }
      renderTranscript();save();
    }catch(err){
      setStatus(`Rheo could not update the pattern: ${err.message}`,'error');
      $('interviewQuestion').textContent='You can continue in your own words, or stop and inspect what has been collected so far.';
    }finally{$('sendInterviewAnswer').disabled=false;}
  }

  function markAsked(type){
    if(!state)return;
    if(type==='grounding')state.asked.grounding=true;
    if(type==='affordance_probe')state.asked.affordance=true;
    if(type==='missing_perspective')state.asked.perspective=true;
    if(type==='contradiction')state.asked.contradiction=true;
    if(type==='frame_relocation')state.asked.frame=true;
    if(type==='safety')state.asked.safety=true;
  }

  function chooseNextQuestion(flow){
    const n=participantTurns().length;
    const safety=flow?.safetyCaution?.level;
    if(['caution','high'].includes(safety)&&!state.asked.safety){
      return {type:'safety',text:'Before we go further: is anyone here afraid of consequences for disagreeing, unable to say no, or unable to leave freely?',reason:'Safety/autonomy check overrides normal diagnostic probing.'};
    }
    if(!state.asked.grounding)return {type:'grounding',text:'What happened that makes this feel important now?',reason:'Ground the account in events before elaborating a theory.'};
    if(!state.asked.affordance)return {type:'affordance_probe',text:'If everyone involved agreed tomorrow about what they wanted, what would still stop it from actually happening?',reason:'Distinguish desire/values from practical affordance and capability without naming the model.'};
    if(!state.asked.perspective)return {type:'missing_perspective',text:'Whose account or point of view is missing from what you have told me so far?',reason:'Make absent testimony explicit without inferring motives.'};
    if(!state.asked.contradiction)return {type:'contradiction',text:'What evidence or experience would make your current explanation of the situation look wrong or incomplete?',reason:'Seek disconfirming evidence before converging.'};
    if(!state.asked.frame)return {type:'frame_relocation',text:'If your own role or organisation were treated as one part of the situation rather than the centre of it, what might look different?',reason:'Test frame relocation without assigning blame.'};

    const primary=flow?.primaryRestriction?.rowId;
    const rows=Array.isArray(flow?.flowRows)?flow.flowRows:[];
    const alternatives=rows.filter(r=>r.rowId!==primary&&['uncertain','restricted','severed'].includes(r.state));
    const alt=alternatives.sort((a,b)=>(a.evidenceRefs?.length||0)-(b.evidenceRefs?.length||0))[0];
    if(alt&&QUESTION_TEMPLATES[alt.rowId]){
      return {type:'alternative_probe',text:QUESTION_TEMPLATES[alt.rowId],reason:`Test an alternative to the current leading restriction (${alt.rowId} versus ${primary||'unknown'}).`};
    }
    const primaryTemplate=QUESTION_TEMPLATES[primary];
    if(primaryTemplate)return {type:'stress_test',text:`One more check: ${primaryTemplate}`,reason:`Stress-test the current leading restriction (${primary}) rather than merely elaborating it.`};
    return {type:'open_probe',text:'What have I not asked that you think could change the pattern completely?',reason:'Invite unmodelled evidence and reduce framework capture.'};
  }

  function shouldBeReady(){
    const pts=participantTurns().length;
    if(pts>=9)return true;
    if(pts<6)return false;
    if(!(state.asked.perspective&&state.asked.contradiction&&state.asked.frame))return false;
    const a=state.analyses;
    if(a.length<2)return false;
    const last=a.at(-1)?.flow?.primaryRestriction;
    const prev=a.at(-2)?.flow?.primaryRestriction;
    if(!last||!prev||last.rowId!==prev.rowId)return false;
    return ['medium','high'].includes(last.confidence);
  }

  async function submitAnswer(){
    if(!state)return;
    const text=$('interviewAnswer').value.trim();
    if(!text){$('interviewAnswer').focus();return;}
    state.turns.push({id:uid(),role:'participant',text,at:new Date().toISOString(),originalText:text,edits:[]});
    $('interviewAnswer').value='';renderTranscript();save();
    await analyseAndContinue();
  }

  function renderTranscript(){
    const host=$('interviewTranscript');if(!host||!state)return;
    host.innerHTML=state.turns.map((t,i)=>`<div class="interviewTurn" data-turn="${i}"><div class="who">${t.role==='rheo'?'Rheo':'You'}</div><p>${escHtml(t.text)}</p>${t.role==='participant'?`<button class="ghost editInterviewTurn" type="button" data-index="${i}">Correct transcript</button>`:''}</div>`).join('');
    host.querySelectorAll('.editInterviewTurn').forEach(b=>b.onclick=()=>editTurn(Number(b.dataset.index)));
    host.scrollTop=host.scrollHeight;
  }

  function editTurn(i){
    const t=state?.turns?.[i];if(!t||t.role!=='participant')return;
    const wrap=$('interviewTranscript').querySelector(`[data-turn="${i}"]`);if(!wrap)return;
    wrap.innerHTML=`<div class="who">You · correcting transcript</div><textarea rows="4" class="turnEdit">${escHtml(t.text)}</textarea><div class="interviewActions"><button class="primary saveTurnEdit" type="button">Save correction</button><button class="ghost cancelTurnEdit" type="button">Cancel</button></div>`;
    wrap.querySelector('.saveTurnEdit').onclick=async()=>{
      const next=wrap.querySelector('.turnEdit').value.trim();if(!next)return;
      if(next!==t.text){t.edits.push({at:new Date().toISOString(),from:t.text,to:next});t.text=next;state.analyses=[];state.ready=false;}
      renderTranscript();save();await analyseAndContinue();
    };
    wrap.querySelector('.cancelTurnEdit').onclick=renderTranscript;
  }

  function renderFlow(flow,reveal){
    const host=$('flowCanvas');if(!host)return;
    const states=new Map((flow?.flowRows||[]).map(r=>[r.rowId,r.state]));
    const primary=flow?.primaryRestriction?.rowId||'';
    const ys=[42,94,146,198,250,302,354];
    const leftX=118,rightX=482;
    const rows=ROWS.map((r,i)=>{
      const y=ys[i],stateName=states.get(r.rowId)||'uncertain',isPrimary=reveal&&r.rowId===primary;
      const leftLabel=reveal?r.intervention:'',rightLabel=reveal?r.organ:'';
      return `<line x1="158" y1="${y}" x2="442" y2="${y}" class="flowAlignment ${isPrimary?'primary':''}"/>
        <g class="flowNode" data-state="${escHtml(stateName)}" data-primary="${isPrimary}">
          <circle cx="${leftX}" cy="${y}" r="20"></circle><text x="${leftX}" y="${y+4}" text-anchor="middle" class="${reveal?'':'flowHiddenLabel'}">${escHtml(leftLabel||'•')}</text>
          <circle cx="${rightX}" cy="${y}" r="20"></circle><text x="${rightX}" y="${y+4}" text-anchor="middle" class="${reveal?'':'flowHiddenLabel'}">${escHtml(rightLabel||'•')}</text>
        </g>`;
    }).join('');
    host.innerHTML=`<svg viewBox="0 0 600 400" role="img" aria-label="Emerging clockwise flow pattern">
      <defs><marker id="flowArrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor"></path></marker></defs>
      <path d="M482 42 C540 42 548 62 548 90 L548 330 C548 370 524 378 482 378 L118 378 C72 378 52 360 52 330 L52 90 C52 58 76 42 118 42" class="flowTrack"></path>
      <path d="M520 88 L520 128" class="flowTrackArrow" marker-end="url(#flowArrow)"></path>
      <path d="M80 310 L80 270" class="flowTrackArrow" marker-end="url(#flowArrow)"></path>
      ${rows}
      <text x="118" y="18" text-anchor="middle" class="flowTiny">upsweep · intervention</text><text x="482" y="18" text-anchor="middle" class="flowTiny">downsweep · organ</text>
      ${!reveal?'<text x="300" y="202" text-anchor="middle" style="font-size:16px;fill:currentColor;opacity:.55">pattern emerging</text>':''}
    </svg>`;
    if($('patternHint'))$('patternHint').textContent=reveal?'The labels are now visible because this is a working diagnosis, not because the model is certain.':'Rheo is keeping several explanations open. Labels stay hidden while the interview is still eliciting testimony.';
  }

  function revealPattern(reason){
    if(!state)return;
    state.ready=true;state.revealReason=reason;
    const flow=latestFlow();
    renderFlow(flow,true);renderWorkingPattern(flow);$('workingPattern').classList.remove('hidden');
    setStatus('Working pattern shown. Treat it as a diagnosis to test, not a verdict.','ready');
    save();
  }

  function renderWorkingPattern(flow){
    const host=$('workingPattern');if(!host)return;
    if(!flow){host.innerHTML='<p class="muted">There is not enough model output yet to form a working pattern.</p>';return;}
    const p=flow.primaryRestriction||{},a=flow.alignedIntervention||{},pr=flow.propagationPrediction||{},fr=flow.frameRelocation||{},irr=flow.irreversibility||{};
    const foreground=(flow.wellbeingActivators||[]).filter(x=>x.emphasis==='foreground').map(x=>x.name);
    host.innerHTML=`
      <div class="diagnosisHero"><strong>Possible primary restriction:</strong> ${escHtml(p.organ||'uncertain')}<br><span class="muted">${escHtml(p.confidence||'unknown')} confidence · aligned horizon: ${escHtml(p.horizon||'unknown')} · intervention: ${escHtml(p.alignedIntervention||a.intervention||'unknown')}</span></div>
      <dl>
        <dt>Why here?</dt><dd>${escHtml(p.diagnosis||'Not yet established.')}</dd>
        <dt>Smallest influence</dt><dd>${escHtml(a.smallestSufficientInfluence||'Not yet established.')}</dd>
        <dt>Do not overdetermine</dt><dd>${escHtml(a.doNotOverdetermine||'Not yet established.')}</dd>
        <dt>If it releases</dt><dd>${escHtml(pr.ifReleasedThen||'Unknown')} ${pr.nextDownsweepOrgan?`Next expected organ: <strong>${escHtml(pr.nextDownsweepOrgan)}</strong>.`:''}</dd>
        <dt>Observable sign</dt><dd>${escHtml(pr.observableSignal||'Not yet established.')}</dd>
        <dt>What would falsify it?</dt><dd>${escHtml(pr.falsifier||'Not yet established.')}</dd>
        <dt>Frame relocation</dt><dd>${escHtml(fr.relocatedFrame||'No specific relocation proposed.')}</dd>
        <dt>Protect</dt><dd>${escHtml(irr.boundaryToProtect||'No boundary identified.')}</dd>
        <dt>Keep emergent</dt><dd>${escHtml(irr.emergenceNotToConstrain||'Not yet established.')}</dd>
        <dt>Activator emphasis</dt><dd>${foreground.length?foreground.map(escHtml).join(' · '):'No particular activator foregrounded yet.'}</dd>
      </dl>`;
  }

  function setStatus(text,tone='idle'){const el=$('interviewStatus');if(!el)return;el.textContent=text;el.dataset.tone=tone;}
  function maybeSpeak(text){
    if(!$('speakInterviewQuestions')?.checked||!('speechSynthesis'in window))return;
    speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(text);u.lang='en-GB';u.rate=.96;speechSynthesis.speak(u);
  }
  function save(){if(state)localStorage.setItem(`rheo_interview_${state.caseId}`,JSON.stringify(state));}
  function downloadInterview(){
    if(!state)return;
    const payload={...state,exportedAt:new Date().toISOString(),latestFlow:latestFlow(),note:'Participant testimony is preserved separately from Rheo-derived analyses in turns vs analyses.'};
    const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`rheo-interview-${state.caseId}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),500);
  }
  function resetToHome(){state=null;$('interviewView').classList.add('hidden');$('wizardView').classList.add('hidden');$('homeView').classList.remove('hidden');$('interviewOpening').value='';renderFlow(null,false);window.scrollTo({top:0,behavior:'smooth'});}

  install();
})();
