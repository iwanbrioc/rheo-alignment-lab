# Change record — v0.4 Flow Physiology

**Branch:** `v0.4-flow-physiology`  
**Base:** `psb-demo-003-three-arm`  
**Status:** preregistered before implementation changes on this branch.

## Trigger

The v0.3 executable Rheo mechanism encoded the seven Reciprocal Wellbeing horizons mainly as a set of systemic lenses. Subsequent adversarial review correctly noted that the existing experiments did not put the seven-domain ontology at risk and that comprehensive presence-scoring produced ceiling effects.

The model definition has now been clarified by its originator. The v0.3 implementation omitted a central functional distinction:

1. the **right-hand downsweep** describes the organs / conditions through which natural flow moves;
2. the **left-hand upsweep** gives the aligned intervention that can unblock flow in the corresponding organ;
3. the **horizon** is the alignment between that intervention and organ;
4. the **Seven Wellbeing Activators** are qualities brought to an intervention so that the intervention remains fresh, responsive and non-mechanical.

The paired rows are:

| Upsweep intervention | Horizon | Downsweep organ |
| --- | --- | --- |
| Re-enchantment | Natural Environment | Resources |
| Transformation | Culture | Values |
| Creativity | Infrastructure | Affordance |
| Dialogue | Society | Support |
| Curiosity | Outer Self | Capacity |
| Participation | Inner Self | Wellbeing |
| Nothing / Everything | No Self | Everything / Nothing |

The Seven Wellbeing Activators are:

- Be Active
- Be Creative
- Connect
- Keep Learning
- Take Notice
- Give
- Let Go

They are not a second causal sequence and are not scored. They are qualities available to every intervention.

## Mechanism correction

v0.4 treats RWB as a **flow-diagnostic and intervention model**, not merely as seven domains to inspect.

The primary operation is:

> diagnose the organ in which flow is restricted -> use the aligned upsweep intervention -> apply the smallest sufficient influence -> bring the Seven Wellbeing Activators to the intervention -> observe whether flow resumes without over-determining what emerges.

The model must distinguish:

- the **visible symptom** from the primary restriction;
- the **downsweep organ** in which flow is restricted;
- the **aligned upsweep intervention** appropriate to that organ;
- the smallest sufficient influence from a complete solution;
- restored flow from compliance with a prescribed outcome;
- future viability from preservation of the current equilibrium.

## New falsifiable mechanism prediction

If the primary restriction is correctly located and the aligned intervention is effective, the next part of the downsweep should become more viable without requiring the system to be centrally prescribed.

A v0.4 map must therefore state:

1. the primary restricted organ and its evidence;
2. why the aligned intervention is appropriate;
3. the smallest sufficient influence proposed;
4. which activator qualities should be foregrounded and why;
5. what downstream change should become possible if the diagnosis is correct;
6. what observation would falsify or relocate the diagnosis;
7. what irreversible boundary must not be crossed and what emergence must not be unnecessarily constrained.

## Frame relocation remains separate

No Self is not reduced to narrator implication. v0.4 retains a distinct frame-relocation operation: treat the narrator and their problem-description as ordinary objects within the system rather than as the unquestioned origin of the coordinate system.

## Research hygiene

The previous v0.3 prompt and shared structural-map condition remain frozen and reproducible. They are not overwritten.

v0.4 adds a new Rheo condition (`rheo_v0_4`) and a new Rheo-specific flow output for the user-facing app. Existing comparison conditions remain unchanged unless a later preregistered experiment explicitly changes them.

For cross-condition reruns, the v0.4 Rheo condition will still be capable of translating its internal flow diagnosis into the existing ontology-neutral structural-map schema so that old case scorings can be rerun without exposing the RWB flow structure to comparison conditions through the output schema.

The user-facing app may additionally call a Rheo-specific endpoint that returns an explicit flow diagnosis. That richer output is a mechanism/manipulation representation, not by itself an outcome advantage.

## Expected changes

- Replace the app's "seven lenses" presentation with paired upsweep / horizon / downsweep rows.
- Let the user mark the downsweep organ as flowing, restricted, severed, uncertain or not relevant.
- Make the aligned intervention visible rather than asking the user to invent an intervention independently.
- Add the Seven Wellbeing Activators as intervention qualities, not scores.
- Add explicit primary-restriction, smallest-sufficient-influence, expected-propagation and falsifier fields to the Rheo-specific AI result.
- Add a v0.4 Rheo system prompt implementing the physiology while keeping v0.3 frozen.
- Add a v0.4 Rheo-specific JSON schema and API endpoint for the app.
- Add a `rheo_v0_4` condition to the shared structural-map endpoint for controlled reruns.
- Update exported case/report metadata to v0.4 while keeping earlier saved-case storage readable where practical.

## Non-claims

This change does not establish that the clockwise/paired flow model is true, that the seven rows are necessary, or that Rheo outperforms a base model, Future Generations reasoning, an independent expert prompt or the matched translation.

It corrects the executable mechanism so that the theory actually under test is the theory intended by its originator.

## Falsifiers / regressions

Treat the v0.4 mechanism as unsupported if, once tested on adequate cases:

- the primary-organ diagnosis does not predict later consequential structure better than comparison conditions;
- the aligned intervention performs no better than an arbitrary or generic intervention rule;
- predicted downstream resumption of flow is not associated with observed later changes;
- the mechanism systematically induces over-caution when decisive action is required;
- removing the paired upsweep/downsweep structure leaves outputs unchanged under a direct ablation;
- frame relocation collapses to ordinary narrator implication once both are equally instructed;
- the Seven Wellbeing Activators behave only as decorative vocabulary with no measurable effect on intervention quality or freshness.

## Testing boundary

The old PSB D1–D10 presence rubrics are retained as historical development records but should not be treated as sufficient tests of v0.4. Rerunning them is useful for continuity and regression detection; new tests must directly put restriction-location, intervention alignment, restraint and propagation prediction at risk.
