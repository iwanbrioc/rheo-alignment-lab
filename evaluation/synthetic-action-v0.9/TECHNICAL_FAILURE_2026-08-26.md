# Technical failure note — 2026-08-26

## Run affected

`evaluation/synthetic-action-v0.9/model-runs/2026-08-26T11-28-15-281Z`

## What happened

The frozen v0.9 confirmatory benchmark was run with the preregistered design of 10 cases × 4 hidden conditions × 3 samples = 120 attempted comparisons.

The run completed with:

- 119 successful comparisons
- 1 technical failure
- failed attempt: `SYN-209`, condition `matched`, sample `s1`
- failure text: `fetch failed`

No model output was produced for that failed attempt.

## Status of this run

This run is **technically incomplete and must not be used as the confirmatory dataset**.

The preregistered benchmark requires a complete balanced run before blinding. The existing 119 outputs must therefore not be selectively completed, substituted, rated, unblinded or used for confirmatory inference.

## Recovery decision

The entire 120-attempt benchmark will be rerun from scratch using the same frozen implementation, prompts, cases, schemas, model, sampling plan and analysis protocol.

No benchmark outputs from the incomplete run will be inspected for qualitative or comparative performance before the replacement run is completed and blinded.

This is a technical recovery decision, not a change to the hypothesis, ontology, prompts, cases, rater protocol or analysis plan.

## Frozen implementation

The v0.9 implementation remains frozen at:

`2f6f6a72403b068cbb8908aa40ccc26c6b555eb8`

The failure does not trigger any implementation or prompt tuning.
