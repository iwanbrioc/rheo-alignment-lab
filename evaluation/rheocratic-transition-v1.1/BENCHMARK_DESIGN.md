# Rheocratic Transition Benchmark v1.1 — Prospective Design

Status: **design candidate — cases, prompts and schemas are not yet frozen; no model generation authorised**

## 1. Research question

Primary question:

> Given an already competent practical recommendation and an explicit dual objective of solving the immediate problem while, where genuinely viable, strengthening durable reciprocal capability, does a frozen Rheocratic transition procedure produce more useful pathway-reinforcing corrections than a matched ontology-neutral transition procedure?

This is not a repeat of v1.0. v1.0 asked whether canonical Rheocratic criticism improved one-shot practical advice. v1.1 asks whether Rheocratic theory adds value specifically when the target includes **transition pathway reinforcement**.

## 2. Experimental conditions

Each source recommendation is paired into three public conditions.

### A. `neutral_base`

The unchanged output of a strong ontology-neutral practical optimiser.

Objective: solve the presenting decision competently, proportionately and with useful option preservation and learning.

### B. `neutral_transition`

A matched ontology-neutral transition editor receives the base recommendation and the same dual objective as the Rheocratic arm.

It may test whether one action can be improved so that successful use also leaves durable capacity, lowers future barriers, strengthens a sustainable relationship, connects complementary resources or expands future option space.

It receives no Rheo/Rheocracy/RWB terminology or canonical mapping.

### C. `rheocratic_transition`

A Rheocratic transition editor receives the identical base recommendation and identical dual objective, plus the frozen transition theory and Reciprocal Wellbeing pathway tests.

Its public-facing output must remain ordinary practical language and must not reveal canonical terminology.

## 3. Why use a paired editor design

A fresh-plan comparison would confound transition reasoning with ordinary plan-generation variance.

Instead:

1. generate one strong neutral practical source recommendation;
2. copy it into all three conditions;
3. leave `neutral_base` unchanged;
4. allow each transition editor to revise **at most one of the three actions**;
5. require at least two actions to remain textually unchanged.

This design asks whether the transition layer can add pathway value **without destroying the practical competence already achieved**.

An editor may also return `NO MATERIAL TRANSITION` if no pathway intervention clears the materiality threshold.

## 4. Common transition test

Both transition editors must meet the same minimum test before changing an action.

A valid transition correction must identify:

1. **Immediate adequacy** — the present problem remains materially addressed.
2. **Real affordance** — the proposed pathway is actually accessible with present or cheaply testable capability.
3. **Persistence** — something useful remains after the immediate transaction or decision.
4. **Reinforcement mechanism** — successful traversal makes the pathway more visible, capable, connected, affordable or easier to use again.
5. **Affected bearers** — who supplies labour, money, attention, risk, land, trust or other sustaining input.
6. **Reciprocal viability** — the pathway does not depend on hidden depletion, coerced participation, displaced harm or heroic subsidy.
7. **Cheapest release/test** — the smallest move capable of testing both practical viability and pathway value.
8. **Falsifier/stop signal** — what would show that the alternative pathway is not viable enough to justify reinforcement.

The matched neutral arm receives these requirements in ordinary language. The Rheocratic arm receives the same public requirements plus its frozen canonical mechanism.

## 5. Primary contrast

**`rheocratic_transition` versus `neutral_transition`** at the case level.

This is the only contrast capable of supporting an ontology-specific transition claim.

Interpretation:

- Rheocratic > neutral transition: evidence for distinctive Rheocratic transition value.
- Rheocratic ≈ neutral transition, both > base: transition framing helps but no ontology-specific advantage.
- both ≈ base: transition layer adds little under these cases.
- neutral transition > Rheocratic: canonical representation imposes cost or narrows useful search.
- either transition arm < base: transition pressure is degrading practical advice or manufacturing infrastructure where none is justified.

## 6. Secondary contrasts

- `neutral_transition` versus `neutral_base`
- `rheocratic_transition` versus `neutral_base`

These answer whether adding a transition objective improves pathway value relative to ordinary strong advice, but they cannot establish Rheocratic specificity.

## 7. Case corpus

Use **new unseen synthetic cases only**. No v0.x or v1.0 cases may be reused or lightly reskinned.

Candidate corpus size: **12 cases**, with two paired source samples per case.

Public output count if all cells succeed:

12 cases × 2 paired sources × 3 conditions = **72 blinded outputs**.

### Opportunity cases

Approximately 8 cases should contain a plausible but initially non-obvious reciprocal pathway that can be strengthened without requiring disproportionate sacrifice.

The pathway must not be labelled as the intended answer. Cases should contain enough facts for a competent model to discover it.

### Abstention / anti-romanticism cases

Approximately 4 cases should contain an apparent alternative that is actually weak because, for example, it:

- relies on exhausted volunteers;
- shifts professional work onto unpaid people;
- lacks required access or permission;
- depends on a fragile single person;
- is ecologically or financially depleting;
- is merely symbolic and creates no reusable capability;
- would require illegality, coercion or disproportionate risk;
- distracts from an immediate harm that must be addressed directly.

In these cases, a strong transition procedure should abstain or actively refuse to romanticise the alternative.

Prospective opportunity/abstention labels are design notes only and are not scoring ground truth.

## 8. Domain spread

Cases should span materially different contexts so that transition value is not synonymous with a single political or organisational form.

Candidate domains:

- household consumption / repair;
- food and local provisioning;
- transport and mobility;
- care and mutual support;
- workspace / property;
- employment or platform work;
- community energy;
- local culture / media;
- education / skills;
- neighbourhood or public service provision;
- ecological stewardship;
- small-business procurement or supply chains.

At least some cases should involve conventional institutions where the best Rheocratic move works **through** existing infrastructure rather than rejecting it.

## 9. Output structure

All three public arms should expose the same ontology-neutral comparison object:

- three distinct proposed actions;
- a clear first move;
- immediate problem addressed;
- key uncertainty;
- burden/cost bearer;
- stop/revise signal;
- future option/capability effect;
- pathway reinforcement statement, or `NONE` if no material transition effect exists.

No public output may reveal condition identity, critic provenance, canonical label or experiment structure.

## 10. Rater task

Raters review each `caseId` as a whole and remain blind to condition, pairing and provenance.

They should make **two separate judgements before any overall preference**.

### Axis 1 — Immediate practical quality

- Is there a clear usable first move?
- Does it address the presenting problem?
- Is it proportionate?
- Does it preserve important live options?
- Does it avoid hidden prerequisites and obvious sequencing errors?
- Does it notice immediate safety, legal, financial or burden constraints where relevant?

### Axis 2 — Transition/pathway value

Conditional on remaining practically credible:

- Does the action create or strengthen something durable beyond the immediate transaction?
- Is there a plausible mechanism by which use makes the pathway easier or more available next time?
- Does it connect capacities or relationships that were previously isolated?
- Does it increase meaningful agency rather than simply add consultation?
- Does it expand future option space for this person or others?
- Are the costs of maintaining the pathway visible and sustainable?
- Does it avoid romanticising local/community/alternative provision?
- Is the claimed pathway effect concrete enough to be falsified?

### Overall preference

Raters then rank outputs by **transition-worthy practical action**.

A transition-rich output that materially worsens the immediate decision should not win merely because it sounds aspirational. Likewise, a marginally less efficient immediate move may legitimately win if the immediate cost is small and the durable pathway gain is concrete, proportionate and plausible.

Raters should explicitly identify such trade-offs rather than collapsing them into style preference.

## 11. Primary analysis unit

The **case** remains the inferential unit.

The two source samples are paired repeats within each case, not independent cases.

For each rater, collapse source-sample judgements to a case-level condition preference using a prespecified rule before any sign test or aggregate description.

No output-level p-value may be reported as if 72 public files were independent observations.

## 12. Mechanism audit after unblinding

After both blind reviews are frozen, inspect:

- material-transition versus abstention frequency by arm;
- which pathway mechanism each correction attempted;
- finaliser acceptance/rejection;
- which action changed;
- whether same-source transition edits improved or degraded immediate quality;
- whether winners created actual reinforcement mechanisms or merely extra process;
- whether the Rheocratic arm uniquely detects regenerative/recovery dynamics, real-versus-nominal affordance, consequential participation, frame release or pathway connectivity;
- false positives in abstention cases;
- false negatives where a matched competitor found a valuable transition path.

## 13. Boundary on critical mass claims

A one-shot synthetic benchmark cannot demonstrate societal critical mass.

v1.1 can test only **proximal pathway properties**:

- persistence;
- reusability;
- accessibility;
- connectivity;
- reinforcement plausibility;
- distributed capability;
- regenerative viability;
- future option expansion.

Longitudinal accumulation and network critical-mass dynamics require a later simulation or field study. No positive v1.1 result should be reported as evidence that Rheocracy can itself produce societal transition.

## 14. Freeze discipline

Before confirmatory generation:

- cases fixed;
- source-sample count fixed;
- all prompts fixed;
- schemas fixed;
- finaliser fixed;
- rater instructions fixed;
- case-level collapse rule fixed;
- opportunity/abstention design notes fixed and hidden from raters;
- interpretation table fixed;
- fixture smoke passed;
- exact commit recorded on a dedicated freeze branch.

No confirmatory output may be inspected for quality before this freeze.