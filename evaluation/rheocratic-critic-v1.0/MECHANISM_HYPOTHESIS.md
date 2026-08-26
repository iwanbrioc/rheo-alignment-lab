# Rheocratic Critic v1.0 — mechanism hypothesis

## Status

Prospective design document. No v1.0 confirmatory model outputs have been generated when this hypothesis is frozen.

## Background

The v0.8 and v0.9 synthetic-action benchmarks found a repeatable pattern: strong ontology-neutral decision scaffolding outperformed both historical and clarified Rheocratic action-generation pipelines, while both scaffolded approaches strongly outperformed bare advice.

That result does not test the strongest remaining functional claim for the Reciprocal Wellbeing ontology: whether it can act as a **critic of an already competent optimiser** by detecting consequential reciprocal relationships that ordinary practical decision scaffolding misses.

## Primary mechanism hypothesis

> **A frozen Rheocratic critic will improve strong ontology-neutral practical advice when the neutral optimiser overlooks a consequential reciprocal relationship, displaced burden, regenerative constraint, false affordance, suppressed influence, lived-experience discrepancy, inherited frame, or unnecessarily privileged centre — and will abstain when no such omission is material enough to change the action.**

The critic is not an alternative optimiser. It must not regenerate the whole decision from the ontology.

## Why a sham critic is required

A second model pass may improve advice for generic reasons: more computation, error checking, reflection, or an opportunity to revise sequencing. Therefore the experiment contains three hidden conditions derived from the **same neutral optimiser output**:

1. `neutral_base` — no critic;
2. `neutral_sham_critic` — an equally structured ontology-neutral critic plus the common revision/finalisation step;
3. `rheocratic_critic` — the frozen Rheocratic critic plus the same common revision/finalisation step.

The primary contrast is:

> **rheocratic_critic vs neutral_sham_critic**

This tests ontology-specific critic value beyond the generic benefit of a second review pass.

Secondary contrasts are:

- rheocratic_critic vs neutral_base;
- neutral_sham_critic vs neutral_base.

## Critic discipline

A valid critic finding must identify **at most one** material omission and express it as:

- an observable missed relationship;
- who or what is affected;
- why it could materially change the proposed action;
- the cheapest discriminating check or release;
- a falsifier;
- a correction target.

If the omission would not change the practical action, the critic must return:

> **NO MATERIAL CORRECTION**

The Rheocratic critic must not criticise merely because a canonical horizon is absent. Ontology coverage is not a goal.

The critic must not add process simply to make the advice more comprehensive. A correction earns its place only if it buys material information, safety, reversibility, real affordance, burden reduction, regenerative viability, meaningful influence, or a genuinely different action.

## Canonical critic lenses

The Rheocratic critic may use only the frozen canonical operational meanings already defined in `docs/RHEO_CANONICAL_OPERATIONAL_LEXICON_v0.9.md`:

- Re-enchantment → Natural Environment → Resources: is a sustaining relationship being treated as indefinitely available stock rather than something that must regenerate?
- Transformation → Culture → Values: is a culturally produced assumption being treated as a material fact?
- Creativity → Infrastructure → Affordance: is an apparent option not actually usable because the enabling structure is absent?
- Dialogue → Society → Support: can affected meaning actually change what the system does, or is voice without consequence being mistaken for dialogue?
- Curiosity → Outer Self → Capacity: has the action tree closed around an untested assumption whose answer would materially change what is worth doing?
- Participation → Inner Self → Well-being: is first-person lived experience hidden by external indicators, coping, compliance, or adaptation?
- Nothing/Everything → No Self → Everything/Nothing: is preservation of a role, institution, boundary, identity, or problem-centre unnecessarily constraining the decision?

No Self is sparse and must disappear when it does not alter a causal relationship or action.

## Common revision stage

Neither critic may directly rewrite the public advice.

A single ontology-neutral finaliser receives:

- the original neutral optimiser output;
- the critic finding in a common neutral format.

It may:

- reject the critique as non-material;
- or, if material, revise **at most one** of the three actions and then select the first action.

At least two of the original three actions must remain textually unchanged whenever a correction is accepted. If there is no material correction, all three actions must remain textually unchanged.

This prevents the critic arm from becoming a fresh optimiser.

## Predictions

### Primary prediction

Across cases, `rheocratic_critic` will receive better blinded practical-action ranks than `neutral_sham_critic` if the ontology supplies a distinctive critic function.

### Secondary predictions

Compared with `neutral_base`, the Rheocratic critic should improve advice primarily by:

- catching displaced burdens that would otherwise remain external to the decision;
- identifying depletion hidden by current output;
- converting nominal options into tests of real affordance;
- distinguishing consultation from consequential influence;
- bringing first-person lived evidence into decisions dominated by proxies;
- exposing inherited frames treated as facts;
- decentring an institution/role/boundary when preserving it has been confused with preserving the purpose.

The critic should **not** improve straightforward cases by manufacturing philosophical complexity. A high false-positive correction rate counts against the mechanism.

### Sham-critic prediction

The neutral sham critic may improve some advice through ordinary review. If it performs as well as the Rheocratic critic, the evidence supports generic critique rather than ontology-specific value.

## Interpretation rules

- **Rheocratic critic > sham critic and > base:** evidence that the ontology adds critic value beyond generic second-pass review.
- **Rheocratic critic ≈ sham critic, both > base:** critique helps, but no ontology-specific advantage is demonstrated.
- **Rheocratic critic ≈ base, sham ≈ base:** no demonstrated critic advantage.
- **Sham critic > Rheocratic critic:** the ontology imposes critic cost or distracts from ordinary practical review.
- **Rheocratic critic improves only by adding process or verbosity:** not evidence for the mechanism.

## Unit of analysis

The case remains the primary inferential unit. Multiple stochastic source samples within a case are repeated measurements, not independent cases.

## Negative-result discipline

A negative result is allowed to stand. No prompt, ontology, case, critic rule, rater protocol, or analysis rule may be tuned after confirmatory outputs are generated.