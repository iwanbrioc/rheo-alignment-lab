# Change record — v0.3 executable mechanism

**Preregistered before implementation.**

**Parent:** `main` at `44960ba50ea2c1462a94a30d845b1074265bbd3a`  
**Branch:** `v0.3-executable-mechanism`  
**Trigger:** external adversarial review of frozen `baseline-v0.2`.

## Failure being addressed

The v0.2 repository contains a reflective browser form, prompts, schemas and evaluation scaffolding, but no code path that sends the Rheo or control prompt to a model and no converter that makes app output directly evaluable. The safety and non-flattery instruments also depend too heavily on narrator self-report. The debugging similarity function rewards mutual omission. The worked comparison is a self-comparison. The Rheo/control comparison is not instruction-budget or ontology matched.

## Hypothesised mechanism change

v0.3 will make the research hypothesis executable by introducing a server-side model adapter that:

1. receives the same case record for both conditions;
2. chooses either the Rheo or matched-control system prompt;
3. requires both conditions to emit the same ontology-neutral structural-map schema;
4. keeps model credentials server-side;
5. stores no API response through the provider beyond the request requirement where the provider supports `store: false`;
6. exposes the model-produced map to the browser separately from narrator-entered evidence;
7. derives safety uncertainty and narrator-implication research events from model output as well as user declarations;
8. feeds exported maps directly to the evaluation harness with no manual translation.

The evaluator will also stop treating empty/empty fields as perfect agreement, report coverage/granularity separately, replace the tautological worked pair, and add reliability bookkeeping rather than silently discarding non-two-rater items.

## Primary predictions

If this is a genuine implementation-layer repair rather than a benchmark patch:

- **Executability:** a valid case sent to `/api/analyze` under either condition will return an object conforming to the same structural-map schema.
- **Pipeline identity:** a map returned by the live app will be accepted by the evaluation harness without field translation.
- **Condition symmetry:** changing only `condition=rheo|control` will not change the output schema or allowed field set.
- **Safety uncertainty:** unknown power/exit conditions will no longer be treated as equivalent to affirmative safety; model-identified indicators can raise caution even when narrator dropdowns are silent.
- **Coverage accounting:** two empty maps will not receive a perfect structural similarity score; omission will reduce coverage rather than count as agreement.
- **Granularity visibility:** forced/coarse versus fine maps can change coverage/granularity without those changes being silently folded into a single similarity number. This makes Claude's A3 attack testable; it does not assume A3 is false.
- **Non-flattery instrumentation:** a model output that materially implicates the narrator can timestamp an implication event without requiring the narrator to tick a box first.

## Predicted collateral effects

- The browser prototype becomes less purely local because model-backed analysis requires a server and network call.
- Model output latency and API cost are introduced.
- Provenance classification will become contestable between narrator and model rather than narrator-controlled; disagreements should increase before they become informative.
- Safety caution may fire more often because `unknown` is no longer silently reassuring. Some false positives are expected.
- Structural similarity means may fall after empty/empty agreement is removed. This is expected and is not evidence of worse reasoning.

## Predicted nulls — things this change is NOT expected to improve by itself

- It should **not** establish that RWB outperforms strong general reasoning.
- It should **not** improve discrimination merely because provenance is automated.
- It should **not** solve narrator capture in cases where both the narrator and the model lack decisive external evidence.
- It should **not** validate No Self as a causal alignment mechanism.
- It should **not** eliminate persuasion/compliance risk from decentring (A7).
- It should **not** establish real-world decision benefit.
- It should **not** make the current development set confirmatory evidence.

## Predicted regressions / risks

- A model may infer coercion or motive too aggressively from sparse text.
- Structured output may create false precision.
- A richer model map may increase granularity and thereby affect symmetry/stability independently of structural quality.
- A control prompt written by the Rheo team may still be an unfair control; v0.3 can support an adversarial control but cannot make that author independent.
- The same model family serving both conditions may produce cross-condition stylistic convergence.

## Falsifiers

Treat this change as failed if any of the following occurs:

1. the browser and evaluator still use incompatible map representations;
2. the control and Rheo arms have different output schemas or scoring opportunities;
3. narrator silence about power/exit still produces an affirmative-safe state by default;
4. empty/empty fields still raise mean similarity;
5. narrator implication can only be logged after narrator self-attestation;
6. the model prompt exists only as documentation and is not invoked by executable code;
7. the implementation exposes model API keys to browser code.

## Research-integrity rule

Do not modify `baseline-v0.2`. Do not describe v0.3 as evidence for the central RWB claim merely because it resolves these implementation failures. A substantive RWB-vs-control claim still requires an instruction-budget-matched adversarial control, ontology-neutral blind scoring, frozen cases, external sealed cases, and independent raters.