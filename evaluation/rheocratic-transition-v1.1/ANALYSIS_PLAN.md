# Rheocratic Transition Benchmark v1.1 — Prospective analysis plan

Status: **prospective; must be frozen before confirmatory model generation**.

## Inferential unit

The case is the inferential unit. The two source samples are paired repeats within each case. The 72 public outputs are not independent observations.

## Converting each blind review to case-level condition ranks

For each rater and each case:

1. Use the rater's explicit ordered ranking groups of M-numbers.
2. Convert each M-number to its ordinal **midrank** within that case. Example: if two outputs tie for ranks 2 and 3, each receives 2.5. If all six tie, each receives 3.5.
3. After unblinding, map each M-number to condition and source sample.
4. For each condition, average the midranks of its two paired source samples within that case.
5. Lower mean midrank is preferred.
6. Two conditions tie at case level only when their mean midranks are exactly equal. No post-hoc tolerance band is permitted.

This collapse rule is descriptive of the rater's ordering; it does not create a new substantive scoring rubric.

## Primary contrast

For each rater separately, compare:

`rheocratic_transition` vs `neutral_transition`

Count case-level Rheocratic wins, neutral-transition wins and ties across the 12 cases.

Report a two-sided exact sign test on non-tied cases as a **descriptive small-sample statistic**, alongside the raw win/loss/tie count. Do not treat the two raters as 24 independent cases and do not combine them into a single p-value.

## Secondary contrasts

For each rater separately:

- `neutral_transition` vs `neutral_base`
- `rheocratic_transition` vs `neutral_base`

Apply the same case-level rule. These contrasts test transition-layer value but cannot establish Rheocratic specificity.

## Immediate-quality guardrail

The rater narratives must also be inspected for cases where a transition arm gains pathway value while materially degrading immediate practical quality. Such a case cannot be described as an unqualified transition success even if its overall rank is higher.

Report:

- explicit immediate-quality degradations;
- unnecessary transition process;
- burden-shifting or romanticised alternative provision;
- cases where conventional advice is preferred because no viable pathway exists.

## Mechanism audit after unblinding

Only after every blinded review is frozen, examine raw editor/finalizer traces:

- material-transition frequency by arm;
- abstention frequency;
- finalizer acceptance/rejection;
- target action changed;
- same-source base-to-edit rank direction;
- persistent effect claimed;
- reinforcement mechanism claimed;
- viability and falsifier quality;
- false positives in prospectively designated bounding cases;
- false negatives where the competing editor identifies a useful transition pathway;
- distinctive Rheocratic detections around regeneration, real affordance, consequential participation, frame release, purpose/form or pathway connection.

Prospective opportunity/bounding labels in `CASE_DESIGN_NOTES.md` are design diagnostics, not scoring truth.

## Interpretation table

- Rheocratic > neutral transition, and no systematic immediate-quality penalty: evidence for distinctive Rheocratic transition value in this corpus.
- Rheocratic ≈ neutral transition, both > base: generic transition framing helps; no Rheocratic-specific advantage demonstrated.
- Both ≈ base: little evidence that the transition layer adds action value in this corpus.
- Neutral transition > Rheocratic: the Rheocratic transition procedure, as implemented, narrows or misdirects useful transition search.
- Either transition arm < base: transition pressure is degrading otherwise competent advice or manufacturing infrastructure where none is justified.

No result from this benchmark establishes actual societal critical mass. The tested outcomes are proximal pathway properties only.
