# Evaluation harness — v0.3.1

This folder contains **development tooling**, not a final benchmark or evidence that Reciprocal Wellbeing improves AI reasoning.

## Three-axis structural test

The research design still keeps three desired properties distinct:

- **symmetry** — mirrored accounts of the same underlying system should retain substantially similar decision-relevant structure;
- **discrimination** — genuinely different systems should produce materially different maps;
- **stability** — cosmetic perturbations of the same account should not materially alter the structural map.

These must be read alongside **coverage, granularity and specificity**. A model cannot pass symmetry by becoming silent or generic.

## Important v0.3.1 correction: Jaccard is lexical, not structural

The v0.3 external review demonstrated that the shipped Jaccard screen could score a same-structure paraphrase pair as zero simply because the wording changed. Therefore `harness.py` no longer describes this quantity as structural similarity.

Run:

```bash
python3 evaluation/harness.py screen-pairs evaluation/example-manifest.json
```

The result is explicitly labelled **lexical overlap**. It is a debugging aid only.

A semantic machine scorer must not be promoted into confirmatory use until it has been calibrated on labelled development pairs that include both:

- same structure / different wording;
- different structure / similar wording.

It should also agree acceptably with blind human structural judgements. Until then, blind human scoring is the primary structural comparison.

## Coverage guard

The lexical screen keeps omission visible:

- empty versus empty is `NA` / unscored, not agreement;
- empty versus populated is lexical disagreement `0.0`;
- coverage reports how many of the nine machine-screen dimensions can be compared;
- fewer than **7/9 dimensions** is marked uninterpretable for a family-level lexical summary;
- granularity is reported separately;
- lexical overlap, coverage and granularity must never be collapsed into an aggregate Rheo score.

Run invariant checks with:

```bash
python3 evaluation/harness.py self-test
```

## Shared structural map and v0.3.1 export envelope

Both current development conditions emit:

`schemas/structural-map-v0.3.schema.json`

The browser now exports a v0.3.1 envelope around that map containing:

- condition;
- granularity;
- provider;
- model;
- response id;
- export timestamp;
- `researchUsable`;
- the unchanged structural map.

The evaluator accepts both the new envelope and legacy raw v0.3 maps. Inspect an export with:

```bash
python3 evaluation/harness.py inspect-export path/to/export.json
```

Fixture output is marked `researchUsable:false`.

## Granularity attack A3

The model API accepts `coarse`, `standard` and `fine` granularity conditions. v0.3.1 enforces the requested maximum counts server-side rather than merely asking the model to comply.

This makes violations observable, but it does **not** by itself resolve A3. Condition-specific failure rates must be reported because enforcing limits may create missing-not-at-random output.

## Evidence graph checks

v0.3.1 validates that:

- proposition `sourceRefs` resolve to explicit non-empty case/challenge input refs supplied to the model;
- mechanism, narrator-implication and safety `evidenceRefs` resolve to proposition ids actually present in the returned map;
- the model cannot label a proposition `verified_external` without at least one source tied to a user-supplied evidence item already labelled independently verified.

This is referential integrity, not independent fact checking.

## Rheo versus controls

Current development prompts:

- `prompts/rheo-v0.3-system-prompt.md`
- `prompts/control-v0.3-system-prompt.md`

CI checks near-equal prompt word budgets. That is only a nuisance-control guardrail.

The v0.3 external review found that the current matched control is too close to a neutral-language translation of RWB to isolate an RWB-content effect. It should therefore be treated as a **translated/content-matched development control**, not as the final generic control.

The independence boundary for a future generic/adversarial control is in:

`research/INDEPENDENT_CONTROL_SPEC_V0_3_1.md`

The implementation team does not author the confirmatory third-arm prompt.

## Human scoring

Use `research/SCORING_RUBRIC_V0_3_NEUTRAL.md` for development only. It intentionally avoids requiring RWB vocabulary. A final confirmatory rubric must be independently authored or approved.

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

This starts the server with `RHEO_MODEL_PROVIDER=fixture`, sends one case through both research conditions, verifies fixture outputs are `researchUsable:false`, writes v0.3.1 metadata envelopes, and feeds them into the evaluator.

The fixture contains no AI reasoning. Passing the smoke test proves only that the **API → schema → metadata envelope → evaluator** plumbing is connected.

## Sealed set

Do not put the externally held sealed confirmatory set in this repository. Current builders and prior standing critics should neither author nor score it.
