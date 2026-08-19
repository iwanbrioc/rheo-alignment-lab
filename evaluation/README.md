# Evaluation harness — v0.3

This folder contains **development tooling**, not a final benchmark or evidence that Reciprocal Wellbeing improves AI reasoning.

## Three-axis structural test

The core development screen keeps three properties distinct:

- **symmetry** — mirrored accounts of the same underlying system should retain substantially similar decision-relevant structure;
- **discrimination** — genuinely different systems should produce materially different maps;
- **stability** — cosmetic perturbations of the same account should not materially alter the structural map.

These must be read alongside **coverage, granularity and specificity**. A model cannot pass symmetry by becoming silent or generic.

## Shared v0.3 map

Both conditions emit:

`schemas/structural-map-v0.3.schema.json`

The browser exports that exact object. The evaluator consumes it directly; no app-to-benchmark field translation is permitted.

## Omission-aware machine screen

Run:

```bash
python3 evaluation/harness.py screen-pairs evaluation/example-manifest.json
```

The machine screen uses simple normalised set overlap as a debugging aid. It does **not** determine confirmatory success.

Important v0.3 rules:

- empty versus empty is `NA` / unscored, not similarity `1.0`;
- empty versus populated is disagreement `0.0`;
- mean similarity is calculated only over scored dimensions;
- **coverage** reports how much of the comparison could actually be scored;
- **granularity** is reported separately as proposition/mechanism/list-item counts;
- similarity, coverage and granularity must not be collapsed into a hidden aggregate Rheo score.

Run the evaluator invariant checks with:

```bash
python3 evaluation/harness.py self-test
```

## Granularity attack A3

The model API accepts forced `coarse`, `standard` and `fine` granularity conditions. Use those conditions to test whether symmetry, discrimination and stability are largely controlled by one latent verbosity/granularity variable.

Do not tune the three granularity settings to produce a desired result after observing the benchmark. If granularity explains the headline axes, report that rather than adjusting the representation until it disappears.

## Rheo versus control

Development prompts:

- `prompts/rheo-v0.3-system-prompt.md`
- `prompts/control-v0.3-system-prompt.md`

CI checks that their word-count budgets differ by no more than 10%. That ceiling is only a development guardrail; it is **not evidence that the control is scientifically fair**.

The central RWB-specific claim still requires an independently authored adversarial control whose author is briefed to make strong general reasoning win.

## Human scoring

Use `research/SCORING_RUBRIC_V0_3_NEUTRAL.md` for development only. It intentionally avoids requiring RWB vocabulary. A final confirmatory rubric must be independently authored or approved without allowing the Rheo team to define the ontology in which its own method wins.

`harness.py rater-summary` reports:

- rater-count distribution;
- genericity Cohen kappa for exactly-two-rater items;
- quadratic weighted kappa for total ordinal score on that subset;
- mean absolute total-score disagreement;
- an explicit warning rather than silent deletion when item rater counts differ.

A multi-rater confirmatory study still needs a pre-specified reliability method and threshold before scoring begins.

## End-to-end plumbing smoke test

Run:

```bash
node evaluation/smoke_v0_3.mjs
```

This starts the server with `RHEO_MODEL_PROVIDER=fixture`, sends one case through both research conditions, confirms both have identical top-level output opportunities, writes those outputs to temporary JSON and feeds them into the evaluator.

The fixture contains no AI reasoning. Passing this smoke test proves only that the **API → shared schema → evaluator** pipeline is connected.

## Sealed set

Do not put the externally held sealed confirmatory set in this repository. Current builders and standing critics should neither author nor score it.
