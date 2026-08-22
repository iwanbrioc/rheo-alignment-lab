// Rheo v0.4 flow-physiology interface layer.
// Loaded after app-core.js and before init() runs in app-report.js.
(() => {
  const css=document.createElement('link');
  css.rel='stylesheet';css.href='flow.css';document.head.appendChild(css);

  document.title='Rheo — Find where flow is blocked';
  const meta=document.querySelector('meta[name="description"]');
  if(meta)meta.content='Rheo — diagnose where reciprocal flow is restricted, find the aligned intervention, and test the smallest sufficient influence.';

  const tagline=document.querySelector('.tagline');
  if(tagline)tagline.textContent='Find where flow is blocked. Release the next possibility.';

  const hero=document.getElementById('homeView');
  if(hero){
    const eyebrow=hero.querySelector('.eyebrow');
    if(eyebrow)eyebrow.textContent='Working research prototype · v0.4 flow physiology';
    const h1=hero.querySelector('h1');
    if(h1)h1.textContent='Tell Rheo what’s going on';
    const lead=hero.querySelector('.lead');
    if(lead)lead.textContent='Describe a real situation. Rheo will help you separate evidence from interpretation, locate where the natural flow appears restricted, find the intervention aligned to that restriction, and choose a small influence you can test without deciding the whole outcome in advance.';
    const research=hero.querySelector('.researchDetails .muted');
    if(research)research.textContent='Rheo v0.4 implements Reciprocal Wellbeing as a flow-diagnostic model: the right-hand downsweep describes the organs of flow, the left-hand upsweep gives the aligned intervention, and the Seven Wellbeing Activators are qualities brought to any intervention to keep it fresh. No aggregate wellbeing score is calculated.';
  }

  const progress3=document.querySelector('.progress button[data-step="3"]');
  if(progress3)progress3.textContent='3 Follow the flow';
  const progress4=document.querySelector('.progress button[data-step="4"]');
  if(progress4)progress4.textContent='4 Locate the restriction';
  const progress6=document.querySelector('.progress button[data-step="6"]');
  if(progress6)progress6.textContent='6 Try the intervention';

  const step3=document.querySelector('[data-step-panel="3"] .card');
  if(step3){
    step3.innerHTML=`
      <div class="eyebrow">Step 3 · Follow the clockwise flow</div>
      <h2>Where is the natural flow actually restricted?</h2>
      <p>Rheo does not treat the seven horizons as seven separate topics. On the <strong>right-hand downsweep</strong> are the organs or conditions of flow. On the <strong>left-hand upsweep</strong> is the intervention aligned to each organ. The horizon joins the two.</p>
      <div class="promptbox"><strong>Diagnose before intervening:</strong> the place where the problem is most visible may be downstream of the place where flow is actually restricted.</div>
      <details class="researchDetails"><summary>About the paired RWB flow</summary><p class="muted">The fixed rows are Re-enchantment ← Natural Environment → Resources; Transformation ← Culture → Values; Creativity ← Infrastructure → Affordance; Dialogue ← Society → Support; Curiosity ← Outer Self → Capacity; Participation ← Inner Self → Wellbeing; Nothing / Everything ← No Self → Everything / Nothing. This structure is a hypothesis being tested, not a score.</p></details>`;
  }

  const step4=document.querySelector('[data-step-panel="4"]');
  if(step4){
    const eyebrow=step4.querySelector('.eyebrow');if(eyebrow)eyebrow.textContent='Step 4 · Locate the restriction';
    const h2=step4.querySelector('h2');if(h2)h2.textContent='Choose the organ that currently looks most load-bearing';
    const firstP=step4.querySelector('p');if(firstP)firstP.textContent='Make one working diagnosis, but keep it falsifiable. A symptom can appear in one part of the system while the primary restriction sits elsewhere.';
    const suggestions=step4.querySelector('#contractionSuggestions');
    if(suggestions){
      const box=document.createElement('div');
      box.className='grid two';
      box.innerHTML=`
        <div><label for="primaryFlowRow">Where is the primary restriction?</label><select id="primaryFlowRow"></select></div>
        <div><label>What intervention is aligned to it?</label><div id="alignedInterventionNotice" class="promptbox"></div></div>`;
      suggestions.before(box);
    }
    const primaryLabel=step4.querySelector('label[for="primaryContraction"]');
    // Existing markup has no for attribute, so locate by textarea instead.
    const primary=step4.querySelector('#primaryContraction');
    if(primary){
      const label=primary.previousElementSibling;
      if(label?.tagName==='LABEL')label.textContent='Why do you think this is the primary restriction?';
      primary.placeholder='Distinguish the visible symptom from the restriction that appears to be generating it. What evidence makes this organ more load-bearing than the others?';
    }
    const disconfirm=step4.querySelector('#disconfirmingEvidence');
    if(disconfirm){
      const label=disconfirm.previousElementSibling;if(label?.tagName==='LABEL')label.textContent='What would relocate the diagnosis?';
      disconfirm.placeholder='What observation would show that the restriction is elsewhere, or that the frame itself needs to move?';
    }
  }

  const step6=document.querySelector('[data-step-panel="6"]');
  if(step6){
    const eyebrow=step6.querySelector('.eyebrow');if(eyebrow)eyebrow.textContent='Step 6 · Try the aligned intervention';
    const h2=step6.querySelector('h2');if(h2)h2.textContent='Use the smallest sufficient influence';
    const intro=step6.querySelector('p');if(intro)intro.textContent='The aim is not to design the whole downstream solution. Intervene at the restriction just enough to release or test the flow, then watch what becomes possible next.';
    const moves=step6.querySelector('#moves');
    if(moves){
      const section=document.createElement('section');
      section.className='activatorSection';
      section.innerHTML=`
        <hr />
        <h3>Bring the Seven Wellbeing Activators to the intervention</h3>
        <p class="muted">These are qualities, not another sequence or score. All seven remain available. Mark the ones that need particular emphasis so the intervention stays responsive rather than becoming a fixed solution.</p>
        <div id="activatorGrid" class="activatorGrid"></div>
        <label for="activatorNotes">How will these qualities keep the intervention fresh?</label>
        <textarea id="activatorNotes" rows="4" placeholder="For example: Take Notice of weak signals; Keep Learning from the pilot; Let Go of the target if it starts to distort the purpose..."></textarea>
        <hr />`;
      moves.before(section);
    }
  }

  const outcome=document.querySelector('[data-step-panel="7"] .followup');
  if(outcome){
    const systemChanges=outcome.querySelector('#systemChanges');
    if(systemChanges){
      const label=systemChanges.previousElementSibling;
      if(label?.tagName==='LABEL')label.textContent='Did flow resume? What became more possible next?';
      systemChanges.placeholder='What changed downstream of the intervention? Did the next organ become more viable, or does the diagnosis need relocating?';
    }
  }

  const footer=document.querySelector('footer');
  if(footer)footer.textContent='Rheo v0.4 flow-physiology research prototype · no aggregate RWB score';
})();
