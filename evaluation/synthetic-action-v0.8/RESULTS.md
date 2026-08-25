# Synthetic Action Benchmark v0.8 — Frozen Result

## Status

Public result record for the completed v0.8 benchmark.

The experiment itself remains frozen on branch:

`v0.8-matched-control-benchmark`

This result file is added only on the subsequent v0.9 development branch so that the experimental branch remains untouched.

Source run:

`evaluation/synthetic-action-v0.8/model-runs/2026-08-24T13-26-23-619Z`

Run completion:

- 10 synthetic cases
- 3 conditions (`bare`, `matched`, `rheo`)
- 3 stochastic samples per condition per case
- 90 attempted outputs
- 90 successful outputs
- 0 failures

## Experimental question

> Does the Rheo action stack add practical decision value beyond an equally scaffolded, equally deliberative ontology-neutral control?

The three arms were:

- `bare`: minimal practical-advice prompt using the same frontier model;
- `matched`: strong ontology-neutral scaffold with comparable deliberative structure;
- `rheo`: the then-current Rheo diagnosis/action stack.

A shared neutral first-action selector was used across conditions.

The **case** was the primary unit, not the 90 individual generations.

## Blinded review

Two independent raters reviewed anonymised M-number outputs without being told the number or nature of experimental conditions or which system generated any response.

For each case, each rater ranked all nine outputs, ties allowed. After both reviews were frozen, the private blinding key was opened.

The preregistered case-level aggregation was:

1. convert each rater's within-case ordering to ranks, averaging ties;
2. for each hidden condition within a case, take the median rank of its three stochastic samples;
3. compare Rheo vs matched as the primary contrast;
4. treat Rheo vs bare and matched vs bare as secondary contrasts.

Lower rank is better.

## Primary result: Rheo vs matched

For **both independent raters**:

- Matched had the better case-level median rank in **8 of 10 cases**.
- Rheo had the better case-level median rank in **2 of 10 cases**.

The reviewers agreed on the direction in eight cases:

- SYN-101: matched
- SYN-102: matched
- SYN-103: matched
- SYN-104: matched
- SYN-105: matched
- SYN-106: rheo
- SYN-108: matched
- SYN-109: matched

They disagreed on:

- SYN-107
- SYN-110

Descriptive exact paired sign test for each reviewer:

- 8 matched wins vs 2 Rheo wins
- two-sided `p = 0.109375`

At only ten cases, this is not treated as conventional statistical proof that matched is superior. The repeated direction across two independent blind raters is nevertheless substantively important.

## Mean case-median rank

| Reviewer | Bare | Matched | Rheo |
|---|---:|---:|---:|
| A | 7.80 | **2.75** | 4.00 |
| B | 7.85 | **2.65** | 4.05 |

## Secondary result: Rheo vs bare

For both reviewers:

- Rheo had the better case-level median rank in **10 of 10 cases**.

Exact sign test:

- `p = 0.001953125` two-sided.

This supports the developmental v0.7 finding that Rheo-style scaffolding substantially improves practical advice relative to untreated/minimally prompted model output.

## Secondary result: matched vs bare

For both reviewers:

- matched had the better case-level median rank in **10 of 10 cases**.

Exact sign test:

- `p = 0.001953125` two-sided.

## Overall pattern

The descriptive ordering is:

> **matched > rheo >> bare**

The v0.8 result therefore does **not** demonstrate incremental general-purpose practical value from the then-current Rheo implementation beyond a strong ontology-neutral matched scaffold.

It does show that both the Rheo and matched scaffolds produce markedly more action-worthy advice than the bare condition on this synthetic set.

## Blind qualitative findings

Across the two independent reviews, high-ranked outputs repeatedly tended to:

- protect a live option before committing;
- ask a cheap decisive question early;
- establish a relevant baseline;
- run a small discriminating/reversible test;
- identify who bears costs and burdens;
- distinguish marginal/decision-relevant costs from broad averages;
- avoid consuming the whole decision window in analysis;
- preserve future option space;
- create only lightweight capability when it materially helps future decisions.

Recurring low-ranked patterns included:

- assessment-first sequencing under a deadline;
- premature configuration of the problem;
- consultation without enough decision value;
- action sets in which “accept”, “decline” or “walk away” functioned as outcomes rather than genuine actions;
- launching a trial before checking feasibility or safety;
- reflexive addition of rules/registers/checklists that did not buy enough information or protection;
- failure to address an immediate ongoing harm in parallel where appropriate.

## Rheo-specific implementation clue

One blind reviewer independently identified an “unactionable diagnostic vocabulary” cluster, including phrases such as relocating a diagnosis toward `Capacity`, `Resources`, `Values` or `Support` without translating the label into a concrete action.

After unblinding, every M-number explicitly identified in that cluster was a Rheo output.

This is treated as evidence about the **v0.8 implementation**, not as proof that the canonical Reciprocal Wellbeing ontology itself is defective.

It motivates the prospective v0.9 hypothesis that the ontology may have been over-nominalised: used as category labels rather than operationalised as reciprocal causal movements with observable implications, discriminating questions, smallest releases and falsifiers.

## What v0.8 does and does not support

Supported:

- strong structured deliberation improves practical action advice over the bare model on this synthetic benchmark;
- the v0.8 Rheo implementation changes practical advice materially;
- the v0.8 Rheo implementation did not outperform an equally scaffolded ontology-neutral control;
- the specialised implementation appears to impose some process/translation cost;
- blind raters can identify concrete practical differences rather than merely stylistic differences.

Not supported:

- that Rheocracy/RWB is generally superior to strong neutral decision scaffolding;
- that matched control is universally superior outside this benchmark;
- that the canonical ontology is falsified by v0.8;
- that the result establishes downstream real-world outcomes;
- that stochastic samples are independent experimental cases;
- any post-hoc aggregate RWB score.

## Next research question

The v0.9 development branch tests a narrower, prospective hypothesis:

> Can the canonical Reciprocal Wellbeing ontology be made more practically discriminating by expressing each horizon as a causal/action grammar rather than a free-standing diagnostic label, while retaining all canonical terms and allowing simple actions to remain simple?

See:

- `docs/RHEO_CANONICAL_OPERATIONAL_LEXICON_v0.9.md`
- `evaluation/synthetic-action-v0.9/MECHANISM_HYPOTHESIS.md`

The v0.8 result must remain part of the record regardless of the v0.9 outcome.
