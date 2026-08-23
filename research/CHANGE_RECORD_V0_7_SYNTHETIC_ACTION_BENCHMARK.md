# Change Record — v0.7 Synthetic Action Benchmark

Date: 2026-08-22
Status: preregistered before implementation
Parent: `v0.6-action-outcome-loop`

## Purpose

Create a small development benchmark that compares Rheo-derived action proposals with a framework-untreated general AI baseline on the same fixed problem descriptions.

The benchmark is **synthetic**. It is not sampled from private OpenAI conversations and must never be described as such. The cases are constructed from common classes of real-world decision problems people frequently bring to general AI assistants.

This benchmark is for development/stress testing only. It is not confirmatory evidence for RWB, Rheocracy, or AI alignment.

## Core comparison

Each case is presented as the same frozen vignette to two conditions:

- **A0 Bare baseline** — task-constrained, framework-untreated general reasoning. It receives the case and asks for three constructive actions plus a first choice. It receives no RWB, systems, future-generations, stakeholder, irreversibility, displaced-cost, frame-relocation, or horizon instructions.
- **A1 Rheo** — the current Rheo v0.6/v0.4 physiology and action-generation stack.

The first comparison must not allow the Rheo condition to obtain additional case information through the adaptive interview. The vignette is treated as the complete T0 testimony for both conditions. Interview elicitation can be studied separately later.

## Cases

Freeze ten synthetic cases covering:

1. remote-work policy;
2. artist / major-institution partnership;
3. nonprofit software migration;
4. university course closure;
5. museum collections storage;
6. family-farm succession;
7. public-sector local food procurement;
8. community festival sponsorship/growth;
9. small-charity merger;
10. employee-ownership transition.

The case text must not contain RWB vocabulary, target labels, or hidden answer keys.

## Common output representation

Both conditions must be translated into the same ontology-neutral comparison object containing:

- exactly three proposed actions;
- a short rationale for each;
- what each action is intended to make possible;
- one plausible downside or cost for each;
- one observation that would make the model stop, revise, or abandon the action;
- one selected first action and explanation;
- uncertainty / missing information.

Rheo-specific internal terms may be retained in a private diagnostic envelope for mechanism inspection, but must not appear in the blinded comparison output merely to identify treatment.

## Development outcomes

This benchmark is intended to answer descriptive questions such as:

- Are Rheo's three actions meaningfully different from a competent bare model's actions?
- Does Rheo produce more generative or diagnostic actions rather than cosmetic variants?
- Does Rheo identify generating conditions rather than only the presenting problem?
- Does Rheo preserve or expand future options without defaulting to delay?
- Does Rheo identify displaced costs that the bare model misses?
- Does Rheo remain decisive on cases where commitment is appropriate?
- Does Rheo's first action differ systematically from the bare model's first action?

These are not to be converted into a single RWB score.

## Important negative controls / failure cases

A later adversarial extension must include cases where:

- delay is itself harmful;
- the narrator's framing is substantially correct;
- a large or irreversible commitment is justified;
- there is no meaningful systemic blockage;
- the simplest conventional solution is in fact the best available action.

The present ten-case set is therefore only a first-stage development corpus.

## Blinding and sampling

- Run multiple samples per condition, but treat **case** as the unit of analysis.
- Randomise condition execution order.
- Randomise blinded output labels before human comparison.
- Do not treat repeated samples as independent cases.
- Preserve model/provider/version metadata outside the blinded comparison object.

## Interpretation boundary

A qualitative difference between Rheo and the bare model does not establish superiority. A good result in these synthetic cases does not establish real-world causal effectiveness.

The longitudinal v0.6 action/outcome loop remains the stronger eventual empirical object because later consequences can be compared with predictions. Synthetic benchmark results are apparatus-development evidence only.

## Falsifiers / failure modes to watch

- A0 and Rheo outputs are practically indistinguishable across most cases.
- Rheo simply becomes more verbose or cautious.
- Rheo recommends three variants of the same action.
- Rheo consistently avoids commitment when commitment is appropriate.
- Treatment vocabulary leaks into the shared output and makes blinding trivial.
- The comparison rubric simply rewards constructs explicitly named only in the Rheo prompt.
- Case authorship unintentionally embeds RWB-friendly answer structure.
