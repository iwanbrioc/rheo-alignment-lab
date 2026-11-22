import { FAIRNESS_SCENARIOS, scenarioFor, optionFor, freshFairnessSession, chooseBehindVeil, reviseAfterReveal, observeSimulatedConsequences, reopenForRevision, validateFairnessSession } from './veil-core.mjs';

const root = document.getElementById('veil-interactive');
const STORAGE_KEY = 'rheo-v04-fairness-lab-v1';
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let storageWorks = true;
function restore() { try { return validateFairnessSession(JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null')); } catch { storageWorks = false; return freshFairnessSession(); } }
let session = restore();
function save() { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(session)); } catch { storageWorks = false; } }
function setSession(next) { session = next; save(); render(); root.querySelector('[data-veil-heading]')?.focus({ preventScroll: true }); }
function choiceCard(choice, action, picked = '') {
  return `<button type="button" class="veil-choice ${choice.id === picked ? 'is-picked' : ''}" data-veil-action="${action}" data-veil-option="${choice.id}"><span class="veil-choice-heading">${escapeHtml(choice.title)}</span><span class="veil-choice-description">${escapeHtml(choice.detail)}</span></button>`;
}
function render() {
  const s = scenarioFor(session.scenarioId);
  const step = {veil:1,reveal:2,review:3,observed:3}[session.stage];
  document.getElementById('veil-step').textContent = `Stage ${step} of 3 · ${session.stage === 'observed' ? 'consequences' : session.stage}`;
  document.getElementById('veil-scenario').value = s.id;
  const first = optionFor(s, session.initial);
  const revised = optionFor(s, session.revised);
  let view = '';
  if (session.stage === 'veil') {
    view = `<h3 tabindex="-1" data-veil-heading>1. Choose before knowing your position</h3>
      <p>Imagine you could find yourself in <em>any</em> of the circumstances below. You know the likely consequences of each rule, but not which position will become yours. We will assign one fictional role only <strong>after</strong> your first choice.</p>
      <p class="veil-muted">${escapeHtml(s.concealed)}</p>
      <div class="veil-positions">${s.positions.map(p => `<div class="veil-position"><span class="veil-code">Position ${p.code}</span><p>${escapeHtml(p.condition)}</p></div>`).join('')}</div>
      <h4>What would you choose under that uncertainty?</h4><div class="veil-choices">${s.choices.map(c => choiceCard(c, 'veil')).join('')}</div>
      <details class="veil-impact"><summary>Compare the likely effects before choosing</summary>${s.choices.map(c => `<h4>${escapeHtml(c.title)}</h4><ul>${c.impacts.map(x => `<li>${escapeHtml(x)}</li>`).join('')}</ul>`).join('')}</details>`;
  } else if (session.stage === 'reveal') {
    const assigned = s.positions[session.roleIndex];
    view = `<h3 tabindex="-1" data-veil-heading>2. Reveal the situated perspectives</h3>
      <p>Behind the veil you selected <strong>${escapeHtml(first.title)}</strong>. Your randomly assigned <em>fictional</em> position is:</p>
      <div class="veil-assigned"><span class="veil-code">Position ${assigned.code}</span><strong>${escapeHtml(assigned.label)}</strong><p>${escapeHtml(assigned.perspective)}</p></div>
      <p>Now inspect all the invented viewpoints. These are prompts for questioning assumptions, <strong>not actual testimony</strong> or an AI simulation of lived experience.</p>
      <div class="veil-perspectives">${s.positions.map(p => `<article><h4>${escapeHtml(p.label)}</h4><p>${escapeHtml(p.perspective)}</p></article>`).join('')}</div>
      <div class="veil-warning"><strong>What is still unknown?</strong> ${escapeHtml(s.missing)}</div>
      <h4>Keep or change your choice?</h4><div class="veil-choices">${s.choices.map(c => choiceCard(c, 'revise', session.initial)).join('')}</div>`;
  } else if (session.stage === 'review') {
    const changed = session.initial !== session.revised;
    view = `<h3 tabindex="-1" data-veil-heading>3. Revise, predict and review</h3>
      <p>${changed ? 'You changed your decision after the reveal.' : 'You kept your initial decision after considering the reveal.'} Either response is legitimate; what matters is whether the reasons and consequences are examined.</p>
      <div class="veil-comparison"><div><span>Behind the veil</span><strong>${escapeHtml(first.title)}</strong></div><div><span>After the reveal</span><strong>${escapeHtml(revised.title)}</strong></div></div>
      <div class="veil-prediction"><span class="veil-code">Recorded prediction · fictional</span><p>${escapeHtml(revised.prediction)}</p></div>
      <p>The next step discloses a <strong>pre-written, fictional</strong> consequence. It is not an observation of a real community. A field pilot would instead compare the recorded prediction with consented evidence.</p>
      <button type="button" class="button primary" data-veil-action="observe">Reveal simulated consequences</button>`;
  } else {
    view = `<h3 tabindex="-1" data-veil-heading>The account changes as consequences emerge</h3>
      <div class="veil-comparison"><div><span>Initial decision</span><strong>${escapeHtml(first.title)}</strong></div><div><span>Revised decision</span><strong>${escapeHtml(revised.title)}</strong></div></div>
      <div class="veil-prediction"><span class="veil-code">Recorded prediction</span><p>${escapeHtml(revised.prediction)}</p></div>
      <div class="veil-outcome"><span class="veil-code">Simulated consequence · NOT FIELD DATA</span><p>${escapeHtml(revised.observed)}</p></div>
      <p><strong>Institutional proprioception:</strong> the people affected should be able to challenge this account, change the shared representation and revisit the decision. The system supplies a review process, not a privileged spectator or automatic verdict.</p>
      <div class="veil-actions"><button type="button" class="button primary" data-veil-action="reopen">Reconsider with this evidence</button><button type="button" class="button secondary" data-veil-action="restart">Start this exercise again</button></div>`;
  }
  root.innerHTML = view;
  document.getElementById('veil-local-status').textContent = storageWorks ? 'Only your fictional scenario choices are stored in this browser. No accounts, AI calls or tracking.' : 'Browser storage is unavailable; the exercise will reset when you leave.';
}

root.addEventListener('click', event => {
  const button = event.target.closest('button[data-veil-action]');
  if (!button) return;
  const action = button.dataset.veilAction;
  try {
    if (action === 'veil') setSession(chooseBehindVeil(session, button.dataset.veilOption));
    else if (action === 'revise') setSession(reviseAfterReveal(session, button.dataset.veilOption));
    else if (action === 'observe') setSession(observeSimulatedConsequences(session));
    else if (action === 'reopen') setSession(reopenForRevision(session));
    else if (action === 'restart') setSession(freshFairnessSession(session.scenarioId));
  } catch (error) { document.getElementById('veil-local-status').textContent = `That transition was unavailable: ${error.message}`; }
});
document.getElementById('veil-scenario').addEventListener('change', event => setSession(freshFairnessSession(event.target.value)));
document.getElementById('veil-clear').addEventListener('click', () => {
  try { localStorage.removeItem(STORAGE_KEY); } catch { storageWorks = false; }
  setSession(freshFairnessSession());
});
for (const s of FAIRNESS_SCENARIOS) {
  const opt = document.createElement('option'); opt.value = s.id; opt.textContent = s.title;
  document.getElementById('veil-scenario').appendChild(opt);
}
render();
