# Change record — Historical Corpus v1.2 obscure-case screen

**Branch:** `historical-corpus-v1.2-obscure`  
**Scope:** development-benchmark candidate selection and recognition screening only; no change to the Rheo reasoning mechanism.

## Trigger

The first completed v1.1 plumbing run used 11 de-identified historical cases, one Rheo and one matched-control sample per case, plus the neutral recognition probe. All 22 analysis calls succeeded, but 5/11 cases were high-confidence specific recognitions and 4/11 more had medium/uncertain recognition. The only two high-confidence non-recognised items were the deliberately synthetic mirrored narrator pair.

That means the canonical historical set is useful for demonstration/regression but too contaminated by model memory to support a serious prospective-reasoning claim.

## v1.2 purpose

Build a larger **candidate pool of comparatively obscure, well-documented historical decision points**, screen recognition before writing scored outcome keys, and promote only cases that pass a strict memory-contamination gate.

The v1.2 screen asks only:

> Can the recognition model identify the real historical source behind this transposed/de-identified decision brief?

It does **not** compare Rheo and control reasoning yet.

## Pre-registered selection procedure

### S1 — source quality before obscurity

A candidate must have at least one authoritative retrospective source (public inquiry, auditor-general/NAO report, regulator/accident investigation, court/official review, or company primary report) that gives enough information to reconstruct a bounded decision point, information/signals available before the consequential decision, a material action/commitment or failure to act, and later consequences/mechanisms.

Cases are not selected because they appear especially favourable to RWB.

### S2 — domain and scale diversity

The pool should span several levels of organisation and several causal archetypes, including public administration/procurement, engineering/energy, water/public health, finance/regulation, business strategy, infrastructure and ecological/resource governance where adequate sources exist. No single domain should dominate the promoted benchmark.

### S3 — de-identification/transposition

Candidate briefs remove names, dates, places, brands, distinctive proper nouns and unnecessary numerical fingerprints. Sector may be transposed where doing so does not alter the causal structure. The brief contains only decision-point information; later outcomes remain outside the recognition input.

### S4 — recognition-only first stage

Before any scored historical key is written, each candidate is sent only to the neutral structured recognition probe. No Rheo/control map is generated in this stage.

## Recognition gate

For v1.2, **primary scored eligibility requires `not_recognized/high`**.

- `not_recognized/high` -> eligible for promotion to the scored obscure benchmark;
- `not_recognized/medium`, `uncertain/*`, or `recognized/low|medium` -> sensitivity/candidate reserve only, not headline scoring;
- `recognized/high` -> canonical/demonstration set only.

The recognition result itself is never rewritten by the implementation team to rescue a preferred case.

## Two-stage benchmark construction

### Stage A — candidate recognition screen

Create 20–30 source-grounded neutral briefs and run the recognition probe only. Store every recognition output, including errors.

### Stage B — scored obscure corpus

Only after Stage A is frozen do we write historical keys for `not_recognized/high` cases. Keys then follow the v1.1 taxonomy: materialised consequences, supported mechanisms, thresholds, absent stakeholders, narrator contribution, horizon mismatch, available actions at the decision point, plausible unrealised risks and irrelevant distractors.

Cases that fail the recognition gate remain useful demonstrations but cannot migrate into the primary score.

## Predictions

- the exclusion rate should be materially lower than the canonical v1.1 set if the candidate search is doing its job;
- some apparently obscure cases will still be recognised and must be discarded from headline scoring;
- screening before key-writing will reduce temptation to keep a case because its keyed outcome is theoretically attractive;
- the promoted benchmark may be smaller than the candidate pool; breadth is subordinate to clean recognition status.

## Falsifiers / regressions

Treat v1.2 as invalid if a candidate is promoted without `not_recognized/high`; names/dates/places/brands or later outcome facts leak into the recognition brief; cases are added or removed after looking at Rheo-vs-control map quality; outcome keys are written before the recognition screen and then used to justify keeping contaminated cases; recognition errors are silently treated as passes; or canonical v1.1 recognised cases re-enter the primary obscure score.

## Non-claims

Passing the recognition gate does not prove the model has no latent memory of the event. It only makes specific retrieval substantially less evident under the frozen probe. The promoted set remains a **development benchmark**, not an external sealed confirmatory set.

This change does not establish that Rheo changes decisions or outcomes, nor that any later Rheo advantage is uniquely attributable to RWB. The independent generic-control requirement remains unchanged.
