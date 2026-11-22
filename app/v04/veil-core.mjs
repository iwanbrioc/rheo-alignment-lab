// A fictional, deterministic decision exercise. No AI, scores, identities or network calls.
export const FAIRNESS_SCENARIOS = [
  {
    id: 'repair',
    title: 'A neighbourhood repair commons',
    situation: 'A community can fund only one way to open a repair and learning space. Which rule should govern its first season?',
    positions: [
      { code: 'A', condition: 'An essential item has broken; reliable, accessible repair matters.', label: 'Resident who needs an accessible repair service', perspective: 'A quick opening means little if the entrance and booking route are unusable.' },
      { code: 'B', condition: 'Paid work and caring commitments leave very little spare time.', label: 'Carer with limited spare time', perspective: 'The fastest plan assumes that someone will quietly volunteer for extra organising.' },
      { code: 'C', condition: 'Repair skills exist, but tools, insurance and paid hours are needed.', label: 'Repair worker and steward', perspective: 'An invitation becomes a dependable service only when responsibility and resources are named.' },
      { code: 'D', condition: 'Reuse could reduce waste, but travel and materials still have ecological costs.', label: 'Local ecological custodian', perspective: 'Repair is promising, but transport and disposal must be accounted for rather than assumed harmless.' }
    ],
    choices: [
      { id: 'fast', title: 'Open immediately', detail: 'Use voluntary shifts and an existing room; accessibility and maintenance are addressed later.', prediction: 'The space opens fast, but its dependence on unpaid hours and incomplete access may undermine continuity.',
        impacts: ['A: Immediate offer, but access is uncertain', 'B: Additional unpaid coordination likely', 'C: No dependable maintenance time', 'D: Reuse benefits plausible; transport unresolved'],
        observed: 'Fictional month-three review: opening was quick, but two volunteers stepped back, access complaints remained unresolved and sessions were cancelled.' },
      { id: 'supported', title: 'Fund an accessible trial', detail: 'Delay opening briefly to resource accessible bookings, paid stewardship and a review date.', prediction: 'A smaller opening may serve fewer people initially but establish a more sustainable, accountable pathway.',
        impacts: ['A: Usable bookings after a short delay', 'B: Less reliance on unplanned care', 'C: Paid stewardship and clear responsibilities', 'D: A review of travel and waste is built in'],
        observed: 'Fictional month-three review: fewer first-week sessions, but reliable attendance, documented paid hours and a corrected recycling arrangement.' },
      { id: 'wait', title: 'Wait for full funding', detail: 'Offer no service until a larger grant and permanent premises are secured.', prediction: 'Financial and access risks are deferred, but immediate repair needs may remain unmet.',
        impacts: ['A: Essential repairs remain unavailable', 'B: No new volunteering burden', 'C: No delivery obligations yet', 'D: No immediate material impact; reuse deferred'],
        observed: 'Fictional month-three review: funding has not arrived. No new costs were imposed, but several people replaced items they hoped to repair.' }
    ],
    concealed: 'The labels A–D describe conditions, not identities. You know the consequences, but not which position will be yours.',
    missing: 'Missing evidence to check with real people: entry and booking access, hours of unpaid care, steward pay and insurance, and transport/waste impact.'
  },
  {
    id: 'pathway',
    title: 'A footpath between two portals',
    situation: 'Two community portals could be connected. The shortest route crosses sensitive ground; an alternative costs more to maintain.',
    positions: [
      { code: 'A', condition: 'Travel is difficult without a level surface and resting places.', label: 'Resident with mobility requirements', perspective: 'A route on a map is not a route I can actually use if it has steps or unstable ground.' },
      { code: 'B', condition: 'There is little discretionary time for a longer journey.', label: 'Worker and unpaid carer', perspective: 'Small extra distances can become large burdens across repeated journeys.' },
      { code: 'C', condition: 'Paths require maintenance, safety checks and accountable ownership.', label: 'Local route steward', perspective: 'New paths can fail if enthusiasm substitutes for a funded maintenance plan.' },
      { code: 'D', condition: 'Soil, water and nesting habitat are affected by changes to access.', label: 'Ecological guardian', perspective: 'The shortest human route may create lasting ecological damage that the map cannot itself sense.' }
    ],
    choices: [
      { id: 'direct', title: 'Build the shortest path', detail: 'Open the direct crossing quickly, using volunteers to maintain it.', prediction: 'Rapid connectivity, with unresolved accessibility, ecological and maintenance burdens.',
        impacts: ['A: Some sections remain inaccessible', 'B: Short journey, if passable', 'C: Unfunded upkeep falls on volunteers', 'D: Sensitive ground disturbed'],
        observed: 'Fictional month-three review: the shortcut was well used, but rain damaged the surface, access complaints arose and wildlife disturbance required restriction.' },
      { id: 'adapted', title: 'Trial an accessible detour', detail: 'Use a longer level route, agree paid upkeep and monitor habitat impacts.', prediction: 'More demanding to establish, but better accessibility and an explicit ecological review.',
        impacts: ['A: More usable and predictable access', 'B: Slightly longer journey', 'C: Named funding and maintenance', 'D: Sensitive ground protected and monitored'],
        observed: 'Fictional month-three review: the path took longer to open but remained usable; route timing was adjusted after carers reported a burden.' },
      { id: 'defer', title: 'Keep connections virtual for now', detail: 'Do not open a new physical route until accessibility and ecological questions are resolved.', prediction: 'Avoid irreversible harm while leaving travel barriers in place.',
        impacts: ['A: No improvement to physical access', 'B: Existing journey remains', 'C: No new maintenance commitment', 'D: No new immediate disturbance'],
        observed: 'Fictional month-three review: the terrain was preserved, but physical isolation persisted and residents asked for a time-limited accessible experiment.' }
    ],
    concealed: 'The possible positions are known; your own eventual position is withheld until after your first choice.',
    missing: 'Missing evidence to check: actual accessibility survey, consent of land stewards, ecological assessment, maintenance budget and users’ travel patterns.'
  }
];

export const FAIRNESS_STAGES = ['veil', 'reveal', 'review', 'observed'];
export function scenarioFor(id) { return FAIRNESS_SCENARIOS.find(s => s.id === id) || null; }
export function optionFor(s, id) { return s.choices.find(c => c.id === id) || null; }
function checkChoice(session, choiceId, stage) {
  const scenario = scenarioFor(session?.scenarioId);
  if (!scenario || session.stage !== stage || !optionFor(scenario, choiceId)) throw new Error('Invalid fairness-lab transition.');
  return scenario;
}
export function freshFairnessSession(scenarioId = FAIRNESS_SCENARIOS[0].id) {
  if (!scenarioFor(scenarioId)) throw new Error('Unknown fictional scenario.');
  return { scenarioId, stage: 'veil', initial: null, revised: null, roleIndex: null, revisions: 0 };
}
export function chooseBehindVeil(session, choiceId, randomValue = Math.random()) {
  const scenario = checkChoice(session, choiceId, 'veil');
  if (!Number.isFinite(randomValue) || randomValue < 0 || randomValue >= 1) throw new Error('Invalid simulated role draw.');
  return { ...session, initial: choiceId, roleIndex: Math.floor(randomValue * scenario.positions.length), stage: 'reveal' };
}
export function reviseAfterReveal(session, choiceId) {
  checkChoice(session, choiceId, 'reveal');
  return { ...session, revised: choiceId, revisions: session.revisions + 1, stage: 'review' };
}
export function observeSimulatedConsequences(session) {
  if (session?.stage !== 'review' || !session.revised) throw new Error('A revised decision is required.');
  return { ...session, stage: 'observed' };
}
export function reopenForRevision(session) {
  if (session?.stage !== 'observed') throw new Error('Review fictional consequences first.');
  return { ...session, stage: 'reveal' };
}
export function validateFairnessSession(raw) {
  const scenario = scenarioFor(raw?.scenarioId);
  if (!scenario || !FAIRNESS_STAGES.includes(raw?.stage)) return freshFairnessSession();
  if (raw.stage !== 'veil' && (!optionFor(scenario, raw.initial) || !Number.isInteger(raw.roleIndex) || raw.roleIndex < 0 || raw.roleIndex >= scenario.positions.length)) return freshFairnessSession();
  if (['review', 'observed'].includes(raw.stage) && !optionFor(scenario, raw.revised)) return freshFairnessSession();
  if (!Number.isInteger(raw.revisions) || raw.revisions < 0 || raw.revisions > 50) return freshFairnessSession();
  return { scenarioId: scenario.id, stage: raw.stage, initial: raw.stage === 'veil' ? null : raw.initial, revised: optionFor(scenario, raw.revised) ? raw.revised : null, roleIndex: raw.stage === 'veil' ? null : raw.roleIndex, revisions: raw.revisions };
}
