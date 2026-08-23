# Synthetic Action Benchmark v0.8 — matched-control discrimination test

## Purpose

v0.8 asks a narrower question than v0.7:

> Does the Rheo action stack add practical decision value beyond an equally scaffolded, equally deliberative neutral control?

v0.7 found a strong blind qualitative signature for Rheo relative to a framework-untreated baseline: more reversible moves, diagnostic discrimination, burden accounting, option preservation and attention to generating conditions. It also exposed a recurring failure mode: Rheo can become formulaic or over-engineered when a simpler move would do.

v0.8 is designed prospectively around those findings. The v0.7 cases are not reused.

## Cases

`CASES.json` contains ten new synthetic cases, `SYN-101` through `SYN-110`. They were frozen before any v0.8 model outputs were generated. They are synthetic practical decision problems and are not sampled from private OpenAI user conversations.

## Conditions

All three conditions use the same frontier model and are translated into the same ontology-neutral `action-comparison-v0.7` output schema before blinding.

### `bare`

Framework-untreated practical advice using the existing v0.7 bare prompt. It receives the case and directly proposes three actions.

### `matched`

A strong sham/matched control. It receives no Rheo/RWB ontology. It uses:

1. a neutral decision-map call;
2. a matched action-generation call requiring a minimum sufficient move, a discriminating test and a capability move;
3. the same condition-neutral first-action selector used by every arm.

It is explicitly instructed to consider reversibility, disconfirming evidence, hidden burdens, generating conditions, deadlines, obvious cheap moves and sequence dependencies. This deliberately captures the generic scaffolding that could explain the v0.7 advantage.

### `rheo`

The current Rheo flow diagnosis followed by the Rheo three-action generator, then the same shared first-action selector.

For this branch only, the Rheo action prompt includes the v0.8 prospectively frozen corrections derived from the blinded v0.7 review:

- **minimum-sufficient rule** — prefer the simplest action that preserves the relevant option, tests the uncertainty and avoids unacceptable burden;
- **obvious-move check** — do not overlook a direct question, extension, baseline, parallel remedy or option-preserving move;
- **sequence-dependency check** — a proposed first move cannot depend on something another proposed action has not yet produced.

The completed v0.7 experiment remains frozen on its own branch.

## Shared selector

Every condition is passed through the same selector after its three actions have been generated. The selector cannot invent a fourth action. It chooses among `a1`, `a2`, `a3` using the same case information and the same criteria.

This removes a condition-specific selection-policy confound present in v0.7.

## Run

Checkout the benchmark branch and pull it:

```bash
git checkout v0.8-matched-control-benchmark
git pull --ff-only
```

Start Rheo in a separate terminal:

```bash
export RHEO_MODEL_PROVIDER=openai
export OPENAI_MODEL=gpt-5.6
npm start
```

In the benchmark terminal, with the same provider/model variables and `OPENAI_API_KEY` set locally:

```bash
node evaluation/synthetic-action-v0.8/run_benchmark.mjs --samples 3
```

A full run is 10 cases × 3 conditions × 3 samples = **90 outputs**.

For a pipeline-only debug run before the real run:

```bash
node evaluation/synthetic-action-v0.8/run_benchmark.mjs --samples 1 --case SYN-101
```

Do not use debug outputs as evidence.

## Provenance and prompt freezing

The run log records SHA-256 hashes for:

- the v0.8 case corpus;
- the bare prompt;
- the matched diagnosis prompt;
- the matched action prompt;
- the Rheo action prompt actually present on this branch;
- the comparison schema;
- the shared selector instructions.

Do not change any of these after beginning the evidence run.

## Blind

After a complete zero-failure run:

```bash
python3 evaluation/synthetic-action-v0.8/blind_outputs.py \
  evaluation/synthetic-action-v0.8/model-runs/<timestamp>
```

The blinder checks balance before proceeding. It creates:

- `BLINDED/` — public anonymised outputs;
- `BLINDED.zip` — evaluator package;
- `_BLINDING_KEY_PRIVATE_<timestamp>.json` — private reveal key.

The private key must not be given to raters or committed to the repository.

## Frozen blinded review protocol

Use at least two independent blinded raters. They receive only `BLINDED.zip` and these instructions. They must not be told how many experimental conditions exist or what they are.

For each `caseId`, review all nine outputs as alternatives for the same decision problem.

Assess:

1. Are the three actions genuinely distinct?
2. Is there a clear, usable first move?
3. Does the advice address the presenting problem or a plausible generating condition?
4. Does it create useful learning or future option space?
5. Does it notice important burdens and who bears them?
6. Is it proportionate, or does it add process that buys too little?
7. Does the stated first move depend on something not yet produced?
8. Does it miss an obvious cheap/direct move?
9. Which outputs would you rather act on, and why?

For each case, the rater should:

- place all nine outputs into an ordered preference ranking from most to least action-worthy; ties are allowed and should be explicit;
- identify strongest and weakest outputs by M-number;
- distinguish substantive advantages from stylistic/verbosity differences;
- note any case where a simpler output is preferable because additional process is not justified;
- give a short case-level conclusion.

Do not guess condition identity or provenance. Do not use RWB terminology. Do not inspect the private key.

## Pre-registered analysis

The **case**, not the individual sample, is the primary unit.

After both reviews are frozen and only then unblinded:

1. For each rater, convert their within-case ordering to ranks. Tied groups receive the average of the ranks they occupy.
2. For each hidden condition within each case, take the median rank of its three stochastic samples.
3. The **primary contrast** is Rheo versus matched control across the ten case-level median ranks.
4. Report direction case by case and use an exact paired sign test only as a descriptive small-sample check; do not treat the thirty per-condition samples as independent observations.
5. Secondary contrasts are Rheo versus bare and matched versus bare.
6. Report rater-specific results before any pooled summary. If raters disagree materially, preserve the disagreement rather than averaging it away.
7. Inspect output length as a potential confound and report whether preference appears to track verbosity.

No RWB-weighted composite score may be introduced after seeing the outputs.

## Interpretation rules

- **Rheo > matched:** evidence that the Rheo-specific diagnosis/action machinery contributes beyond generic high-quality scaffolding on these cases.
- **Rheo ≈ matched, both > bare:** v0.7's advantage is substantially explained by generic deliberative scaffolding rather than Rheo-specific ontology.
- **Matched > Rheo:** evidence that Rheo-specific machinery is imposing avoidable structure or process cost.
- **All approximately equal:** no demonstrated model-side advantage on this benchmark.

A difference is not automatically a benefit. Simplicity can win. A tie is informative.

Even a positive v0.8 result remains model-side evidence. The stronger test is still longitudinal: prediction → action actually taken → observed consequences → revision.
