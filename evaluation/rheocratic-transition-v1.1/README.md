# Rheocratic Transition Benchmark v1.1

Status: **IMPLEMENTATION COMPLETE — FREEZE CANDIDATE — no confirmatory model generation authorised yet**

v1.1 moves the research target from one-shot optimisation inside a presenting institutional frame to **pathway reinforcement**.

Core proposition:

> A Rheocratic intervention should address the immediate predicament while, where a real affordance exists, helping the person notice, traverse and reinforce a reciprocal pathway whose successful use makes that pathway more viable, visible, connected or reusable in the future.

This is a new prospective claim and must not be used to reinterpret the negative primary result of v1.0.

## Primary contrast

`rheocratic_transition` versus `neutral_transition`.

The matched neutral transition control is essential because a comparison only against ordinary practical advice would confound Rheocratic specificity with the generic benefit of being told to build durable capacity or think beyond the immediate transaction.

## Implemented design

For each paired source sample:

1. generate a strong neutral practical three-action recommendation using the inherited matched neutral optimiser;
2. publish it unchanged as `neutral_base`;
3. give an identical copy to a matched ontology-neutral transition editor;
4. give an identical copy to the Rheocratic transition editor;
5. allow either editor to abstain or target at most one action;
6. pass material findings through the same ontology-neutral finalizer;
7. require at least two actions to remain textually unchanged;
8. expose the same ordinary-language public comparison schema in all three arms.

The Rheocratic editor uses RWB/Rheocratic transition theory internally but is **not required to emit canonical labels**. This is deliberate after v1.0: the comparison should test transition reasoning rather than the model's ability to translate named ontology vocabulary into an answer.

## Corpus

`CASES.json` contains 12 new unseen cases, SYN-401–SYN-412, spanning repair, food provision, mobility, care, workspace, platform labour, energy, culture, education/equipment, flood response, ecological stewardship and reusable packaging.

The prospective corpus is balanced around approximately eight real transition opportunities and four bounding/anti-romanticism cases. Those design labels remain private design diagnostics and are not scoring truth.

## Files

- `THEORY.md` — practical/idealistic transition theory; parallel infrastructure; pathway reinforcement; critical mass; RWB viability tests.
- `BENCHMARK_DESIGN.md` — paired three-condition experimental design and blinded evaluation plan.
- `CASE_DESIGN_NOTES.md` — prospective case mechanisms and anti-romanticism checks.
- `CASES.json` — full synthetic case corpus.
- `RATER_PROMPT.md` — blinded two-stage immediate-quality then pathway-value review.
- `ANALYSIS_PLAN.md` — prespecified case-level midrank collapse and contrasts.
- `preflight.mjs` — corpus/prompt/schema/protocol integrity checks.
- `run_benchmark.mjs` — paired fixture/OpenAI runner.
- `blind_outputs.py` — completeness/balance validation and private reveal-key blinding.
- root prompts `neutral-transition-editor-v1.1-system-prompt.md`, `rheocratic-transition-editor-v1.1-system-prompt.md`, `transition-finalizer-v1.1-system-prompt.md`.
- root schema `transition-editor-v1.1.schema.json`.

## Claim boundary

v1.1 can test plausible proximal pathway properties:

- persistence;
- reusability;
- accessibility;
- connectivity;
- distributed capability;
- regenerative viability;
- lower future coordination cost;
- expanded future option space.

It cannot demonstrate that repeated use will actually produce societal critical mass. That requires longitudinal simulation and ultimately field evidence.

## Freeze discipline

Before confirmatory generation:

- fixture preflight/smoke must pass at the exact candidate commit;
- the exact tested commit must be copied to a dedicated `v1.1-rheocratic-transition-freeze` branch;
- prompts, cases, schemas, finalizer, rater prompt and analysis rule must then remain unchanged;
- confirmatory OpenAI outputs must be generated only from that frozen commit;
- no output may be inspected for quality before the freeze;
- reveal material remains private until all independent blind reviews are frozen.

See `FREEZE.md` for the audit and freeze record.
