# v0.3 implementation verification

This record is **post-implementation** and must be read together with the earlier preregistration in `research/CHANGE_RECORD_V0_3_EXECUTABLE_MECHANISM.md`. Git history preserves that the change record was committed before the implementation began.

## CI verification

Pull request #3 ran CI workflow run `31487068702` against head `b548d69cbf09ec8a1e3962f4a13074cd00c06048` and completed the `validate` job successfully.

Verified by CI:

- `server.mjs`, all browser JavaScript modules, service worker and v0.3 smoke-test JavaScript parse successfully;
- Python evaluation and prompt-budget modules compile;
- repository JSON parses;
- required v0.2 audit files and v0.3 mechanism files are present;
- v0.3 Rheo/control development prompt word counts are **722 vs 720**, relative difference **0.278%**;
- evaluator invariant self-test passes: mutual omission is unscored and coverage/granularity remain separate from similarity;
- the non-tautological example symmetry pair produces `mean_similarity=0.796`, `mean_coverage=1.000`, and equal total granularity of `17.0` items on each side;
- the fixture end-to-end smoke passes: both conditions return the same v0.3 top-level schema and those live API outputs are accepted directly by the evaluator;
- fixture pipeline screen reports `mean_similarity=1.000`, `mean_coverage=0.889`, equal total granularity `12.0` items. This is expected because the fixture intentionally returns the same plumbing map for both conditions and is not an AI evaluation.

## Which v0.2 review observations are now mechanically addressed?

### R1 — no model / disconnected pipeline

**Mechanically addressed, not substantively validated.**

The branch contains an executable `/api/analyze` model path. The server chooses the Rheo or control prompt, requests the same shared structural-map output representation and returns it to the browser. Exported model JSON is the evaluator input representation. The fixture smoke verifies that the plumbing is connected.

A real external model request is **not tested in CI**, because CI has no model API credential. This remains a required manual/integration verification before describing the OpenAI-backed path as operational in deployment.

### R2 — narrator controls safeguard

**Partly addressed.**

- form-level `Unknown` power/exit fields now activate epistemic caution rather than clearing the gate;
- the model is instructed to detect power/exit indicators from the supplied narrative independently of the narrator's dropdown labels;
- model provenance classifications are shown as model propositions and can be challenged by the user rather than being silently treated as facts.

This does not solve single-narrator epistemology and is predicted to introduce some safety false positives. It requires adversarial testing from both controller and controlled-party narrations.

### R3 — silence scores as agreement

**Addressed at the debugging-screen level.** Empty/empty dimensions return `None`/NA and reduce coverage rather than increasing similarity.

### R4 — self-comparison example

**Addressed.** The two worked example maps are no longer identical and produce a non-trivial similarity value.

### R5 / A6 — comparison rigging

**Partly addressed only.** The development prompts are budget-matched and both conditions emit one ontology-neutral schema. A development ontology-neutral rubric exists.

The decisive criticism remains open: the Rheo team authored both prompts and the development rubric. An independently authored adversarial control and independently authored/approved rubric are still required before an RWB-specific result is interpretable.

### R6 — flattery attrition null by construction

**Mechanically addressed for model implication.** When the model first returns a specific narrator-implication mechanism, the app logs that event without narrator self-attestation. It separately logs a later interaction and `pagehide` exit with elapsed time after the first model implication. No raw implication text is written into those attrition events.

This instrumentation still needs a prospective dev pilot to establish ordinary/control drop-off before a threshold is frozen.

### R7 — contraction generator is a mirror

**Presentation failure addressed; inferential issue routed to model.** The legacy form chip now explicitly labels reused text as a `Narrator-marked signal` and states that it is user-supplied material rather than AI-derived causal inference. Independent causal inference belongs to the v0.3 model map.

### R8 — reliability reporting incomplete

**Partly addressed.** The harness adds quadratic weighted kappa for ordinal total scores and reports the rater-count distribution plus warnings for non-two-rater items instead of silently dropping them. A final multi-rater method and minimum reliability threshold must still be preregistered before confirmatory scoring.

## Pre-registered attacks that remain open

- **A3 granularity:** now directly testable via forced coarse/standard/fine modes and separate granularity reporting. No result yet.
- **A6 control authorship:** not solved; an independent adversarial control is still required.
- **A7 decentring/compliance:** not solved; acceptance must be measured separately from accuracy on planted-fact inversion cases.

## Verification boundary

Passing this CI means the repository is syntactically coherent and the fixture-backed research pipeline is connected. It does **not** mean:

- a real OpenAI model has successfully returned the strict v0.3 schema;
- Rheo beats the control;
- the three-axis test has more than one effective degree of freedom;
- the safety mechanism is calibrated;
- user acceptance tracks accuracy;
- real-world decisions improve;
- any AI-alignment claim has been established.

Those remain empirical questions.