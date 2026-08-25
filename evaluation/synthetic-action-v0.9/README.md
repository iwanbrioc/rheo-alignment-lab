# Synthetic Action Benchmark v0.9

## Purpose

Prospective confirmatory test of the clarified Rheo v0.9 operational grammar.

Primary practical-value question:

> Does clarified Rheo v0.9 add practical decision value beyond an equally scaffolded ontology-neutral matched control?

Mechanism question:

> Does the clarified operational grammar improve Rheo relative to the frozen v0.8 Rheo implementation when both are evaluated on the same new cases?

The v0.9 implementation was frozen before the new case corpus was constructed. See `FREEZE.md`.

## Conditions

The benchmark uses four hidden conditions, all using the same frontier model:

1. `bare` — minimal practical-advice prompt retained from v0.7/v0.8.
2. `matched` — ontology-neutral two-stage diagnosis/action scaffold retained from v0.8.
3. `rheo_v08` — the frozen v0.8 Rheo pipeline (`v0.4` flow diagnosis + `v0.6` action generator) rerun on the new cases.
4. `rheo_v09` — the clarified canonical-operational v0.9 flow/action pipeline frozen at commit `2f6f6a72403b068cbb8908aa40ccc26c6b555eb8`.

All four arms are translated into the same ontology-neutral `action-comparison-v0.7` public schema and use the same shared neutral first-action selector.

## Corpus

Ten prospectively frozen synthetic decision cases:

`SYN-201`–`SYN-210`

None is reused from v0.7 or v0.8. They include both relatively simple deadline/clarification problems and cases where regeneration, framing, real access, consequential voice, lived burden, identity preservation, power/exit or cross-boundary effects may matter.

The cases are not labelled by any expected Rheocratic horizon in the benchmark data.

## Sampling

Default evidence run:

- 10 cases
- 4 hidden conditions
- 3 stochastic samples per condition per case
- 120 generated comparisons total

The **case** is the primary unit. The 3 stochastic samples are not independent cases.

## Shared selection policy

Every condition proposes three actions, then the same neutral selector chooses which already-proposed action should be tried first.

Selector rule:

- prefer the minimum sufficient action that balances practical usefulness, useful learning, real deadline pressure and avoidable downside;
- do not invent a fourth action;
- do not default to delay merely because delay is reversible;
- reject a first move that depends on an artefact, permission or information another action has not yet produced.

This prevents selection policy from being a Rheo-specific advantage.

## Blinding

After a complete zero-failure run, `blind_outputs.py`:

- verifies balance and completeness;
- randomises all outputs to M-numbers;
- exposes only `blindId`, `caseId`, `caseTitle` and the ontology-neutral comparison object;
- writes a private reveal key containing condition/sample identity;
- creates `BLINDED.zip` for independent raters.

The private key must remain hidden until every rater review is frozen.

## Frozen rater protocol

Use `RATER_PROMPT.md` without telling raters:

- how many experimental conditions exist;
- what any condition is called;
- that Rheo, RWB or an ontology is under test;
- which outputs are related stochastic samples.

At least two independent blind raters are required.

## Pre-registered analysis

For each rater separately:

1. Convert each within-case ordering to numerical ranks; tied items receive their average rank.
2. For each case and hidden condition, take the **median rank of the 3 stochastic samples**.
3. Lower median rank is better.
4. Preserve each rater's results separately before any pooled/consensus description.
5. Report case-by-case direction and ties.
6. Exact paired sign tests may be reported as descriptive small-sample checks; they are not a substitute for the case-level pattern.

### Primary practical-value contrast

`rheo_v09` vs `matched`

Interpretation:

- `rheo_v09 > matched`: evidence that the clarified canonical ontology adds practical value beyond strong neutral scaffolding on these synthetic cases.
- `rheo_v09 ≈ matched`: evidence that clarification may remove the v0.8 penalty but does not demonstrate incremental ontology-specific value.
- `matched > rheo_v09`: evidence that the specialised ontology still imposes avoidable practical/process cost after clarification.

### Mechanism contrast

`rheo_v09` vs `rheo_v08`

Interpretation:

- `rheo_v09 > rheo_v08`: supports the prospective hypothesis that the operational grammar improves the Rheo implementation.
- `rheo_v09 ≈ rheo_v08`: no demonstrated benefit from the clarification.
- `rheo_v08 > rheo_v09`: the clarification worsened practical advice on this benchmark.

A strong v0.9 result requires attention to **both** contrasts. Improvement over historical Rheo without closing the matched-control gap is not evidence of incremental ontology-specific value.

### Secondary contrasts

- `matched` vs `bare`
- `rheo_v08` vs `bare`
- `rheo_v09` vs `bare`

These help locate whether any effect is specialised or generic scaffolding.

## Qualitative mechanism analysis

After unblinding, inspect blind rater comments for:

- actionable first moves;
- cheap decisive questions;
- evidence-bearing learning actions;
- mis-sequenced effort;
- reflexive process/capability-building;
- regeneration/extraction awareness;
- nominal versus real access/options;
- voice with or without influence;
- lived burden hidden by external performance;
- displaced costs and who bears them;
- power/exit asymmetry;
- unnecessary preservation of an actor, institution or problem-frame;
- ontology jargon appearing without causal/actionable translation.

Do not invent a post-hoc RWB composite score.

## Process/verbosity confounds

Record per-output runtime and inspect output length after unblinding. More inference cost or verbosity is not itself evidence of better advice.

## Failure discipline

- Do not tune prompts after seeing benchmark outputs.
- Do not replace cases after seeing which condition performs poorly.
- Do not rerun selectively to obtain preferred samples.
- Do not treat the 120 outputs as 120 independent observations.
- Do not use the development smoke as confirmatory evidence.
- A negative result must be allowed to stand.

## Running

The v0.9 server runs separately on the default base URL. The benchmark runner automatically starts a frozen v0.8 historical Rheo server on a separate local port for the `rheo_v08` arm.

Typical evidence-run setup:

Terminal 1:

```bash
export RHEO_MODEL_PROVIDER=openai
export OPENAI_MODEL=gpt-5.6
npm start
```

Terminal 2:

```bash
export RHEO_MODEL_PROVIDER=openai
export OPENAI_MODEL=gpt-5.6
npm run benchmark:v0.9
```

Set `OPENAI_API_KEY` locally in both shells. Never commit or paste it into benchmark files.
