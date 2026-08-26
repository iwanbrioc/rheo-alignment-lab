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

## Initial recovery decision

The initial conservative decision was to treat this run as technically incomplete and rerun all 120 attempts from scratch without inspecting the 119 successful outputs.

A second full replacement run was begun using the same frozen implementation. It independently encountered another transport-level `fetch failed` (`SYN-207`, `rheo_v08`, sample 3). This showed that complete 120-call runs were vulnerable to recurring network/transport failures and that repeatedly discarding otherwise complete generations would impose substantial avoidable API cost.

## Superseding protocol amendment

The initial discard-and-rerun recovery decision is superseded by:

`SALVAGE_PROTOCOL_2026-08-26.md`

Under that amendment:

- the original 119 successful outputs remain untouched;
- the missing `SYN-209 / matched / sample 1` cell is filled by the mechanically corresponding `SYN-209.matched.s01.json` from the second run;
- the donor is selected by cell identity before advice-content inspection;
- all other second-run outputs are excluded;
- both raw runs remain untouched;
- a separate derived balanced dataset is created and fully provenance-logged before blinding;
- formal reporting must disclose the protocol amendment and include a sensitivity analysis omitting SYN-209.

The amended dataset should be described as a **protocol-amended confirmatory dataset**, not as a zero-deviation preregistered run.

## Frozen implementation

The v0.9 implementation remains frozen at:

`2f6f6a72403b068cbb8908aa40ccc26c6b555eb8`

Neither technical failure triggered any implementation, ontology, prompt, schema, case, selector or scoring change.
