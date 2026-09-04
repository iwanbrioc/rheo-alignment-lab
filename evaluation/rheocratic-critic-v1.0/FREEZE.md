# v1.0 Rheocratic Critic Benchmark — freeze boundary

## Status

**IMPLEMENTATION FREEZE CREATED — confirmatory generation is permitted only from the frozen commit recorded below.**

The prospective v1.0 critic design passed the fixture smoke before the implementation-freeze branch was created. No research prompt, case, schema, critic rule, rater rule or analysis rule was changed as a result of the fixture run.

## Recorded implementation freeze

- freeze branch: `v1.0-rheocratic-critic-freeze`
- frozen/tested commit: `0673005a79e8d5bddee404a2c9f7f98a3015494c`
- fixture workflow: `v1.0 Rheocratic critic fixture smoke`
- fixture workflow run: `33861808035`
- fixture result: **success**
- fixture command: `npm run smoke:v1.0`

The freeze branch must not be advanced, rebased or amended once confirmatory generation begins. This record is maintained on the development branch so that the frozen branch remains exactly the tested commit.

## Files inside the prospective freeze

Theory / design:

- `evaluation/rheocratic-critic-v1.0/MECHANISM_HYPOTHESIS.md`
- `evaluation/rheocratic-critic-v1.0/CASE_DESIGN_NOTES.md`
- `evaluation/rheocratic-critic-v1.0/README.md`
- `evaluation/rheocratic-critic-v1.0/RATER_PROMPT.md`

Corpus:

- `evaluation/rheocratic-critic-v1.0/CASES.json`

Critics / common finalisation:

- `prompts/rheocratic-critic-v1.0-system-prompt.md`
- `prompts/neutral-sham-critic-v1.0-system-prompt.md`
- `prompts/critic-finalizer-v1.0-system-prompt.md`
- `schemas/rheocratic-critic-v1.0.schema.json`
- `schemas/neutral-critic-v1.0.schema.json`

Shared inherited neutral optimiser:

- `prompts/matched-diagnosis-v0.8-system-prompt.md`
- `prompts/matched-action-v0.8-system-prompt.md`
- `schemas/action-comparison-v0.7.schema.json`

Harness:

- `evaluation/rheocratic-critic-v1.0/preflight.mjs`
- `evaluation/rheocratic-critic-v1.0/run_benchmark.mjs`
- `evaluation/rheocratic-critic-v1.0/blind_outputs.py`
- `package.json` v1.0 benchmark scripts

## Fixture boundary

The fixture smoke is infrastructure-only and is not research evidence. It may expose coding, schema-loading, file-path, balancing or blinding bugs.

Before the implementation freeze, fixes are permitted only for such implementation defects. No fixture result may be used to tune practical advice quality, the ontology, critic threshold, case content or expected direction.

## Confirmatory boundary

Once any real OpenAI confirmatory output is generated from the frozen implementation:

- cases are immutable;
- critic prompts are immutable;
- sham-critic prompt is immutable;
- finaliser prompt is immutable;
- schemas are immutable;
- inherited matched optimiser prompts are immutable;
- sampling plan is immutable;
- transport retry policy is immutable;
- rater prompt is immutable;
- analysis plan is immutable.

No successful output may be selectively regenerated or replaced because of its content.

## Transport retry rule

A single model call may be retried automatically, before any valid output is obtained, for network/transport failure or HTTP 408/429/500/502/503/504, up to three total attempts with exponential backoff.

Every retry is written to the run log.

This is technical delivery recovery, not stochastic resampling. A valid structured output is never retried because its advice is weak or undesirable.

## Required confirmatory run

Default:

- 10 cases;
- 2 paired neutral source samples per case;
- 3 hidden conditions;
- 60 public condition outputs;
- zero final cell failures before blinding.

## Required blind

The private reveal key must remain unopened until at least two independent blind reviews are frozen.

Raters receive only `BLINDED.zip` and `RATER_PROMPT.md`.

They are not told condition names, condition count, source pairing, case-design notes or mechanism expectations.

## Confirmatory execution rule

All confirmatory generation must run from `v1.0-rheocratic-critic-freeze` at commit `0673005a79e8d5bddee404a2c9f7f98a3015494c`. Generated model runs and reveal material must remain outside the public repository until the blind reviews are frozen and the protocol permits unblinding.
