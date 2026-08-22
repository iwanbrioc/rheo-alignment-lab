# Synthetic Action Benchmark v0.7

Development-only comparison of the current Rheo action stack against a framework-untreated general AI baseline.

## Important provenance note

The ten cases in `CASES.json` are synthetic. They were constructed from common classes of practical decision problems. They are **not** drawn from private OpenAI user conversations and should never be represented as such.

## Conditions

- `bare`: same frontier model, minimal practical-advice task, no named framework or systems/RWB instruction.
- `rheo`: current v0.4 flow diagnosis followed by the v0.6 three-action generator, then a constrained choice among those already-proposed actions.

Both are translated into `schemas/action-comparison-v0.7.schema.json` before blinding.

## Run

Start Rheo in another terminal first:

```bash
export RHEO_MODEL_PROVIDER=openai
export OPENAI_MODEL=gpt-5.6
npm start
```

Then run:

```bash
node evaluation/synthetic-action-v0.7/run_benchmark.mjs --samples 3
```

To run one case while debugging:

```bash
node evaluation/synthetic-action-v0.7/run_benchmark.mjs --samples 1 --case SYN-001
```

Outputs are written beneath `evaluation/synthetic-action-v0.7/model-runs/<timestamp>/`.

## Blind

After a complete run:

```bash
python3 evaluation/synthetic-action-v0.7/blind_outputs.py evaluation/synthetic-action-v0.7/model-runs/<timestamp>
```

This creates a `BLINDED/` directory and a separate `_BLINDING_KEY_PRIVATE_*.json`. Do not inspect the key until comparisons are frozen.

## How to inspect this first benchmark

This is a development stress test, not a confirmatory experiment. Start with blind pairwise review at the **case level**, not sample counting. Useful descriptive questions include:

- Would a competent decision-maker regard the three actions as genuinely distinct?
- Is there a clear, usable first move?
- Does the action address the presenting problem or a plausible generating condition?
- Does it create useful learning or future option space?
- Is there an important burden/cost the advice fails to notice?
- Is the advice unnecessarily cautious or unnecessarily committal?
- Which output would you rather act on, and why?

Do not turn those questions into an RWB-weighted total score after seeing the outputs. If a formal quantitative comparison is wanted, freeze the rubric before the next run.

## Interpretation

A difference is not automatically an advantage. A tie is informative. If the bare model routinely produces the same practical actions as Rheo, that is evidence against a model-side prompting advantage on this task.

The stronger eventual test remains the longitudinal v0.6 loop: prediction → action actually taken → observed consequences → revision.
