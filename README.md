# Rheo Alignment Lab

**Rheo** is a research project testing whether Iwan Brioc's Reciprocal Wellbeing (RWB) model can contribute a useful structural reasoning heuristic for AI-assisted decision support and alignment research.

The central research question is:

> **Does Reciprocal Wellbeing help an AI identify consequential structure that strong general reasoning misses — while remaining sensitive to genuine structural difference, robust to narrator position and irrelevant framing, and without exporting the cost of successful advice elsewhere?**

## Current status

This branch is **v0.3 — executable mechanism**. It follows the frozen `baseline-v0.2` adversarial review.

`baseline-v0.2` remains preserved at commit `b3dff9befbe2786abffd4b353ff57c5da726b3cb`. v0.2 contained the research specification, browser form and evaluation scaffolding but did not put a model in the loop. v0.3 makes that hypothesis executable without treating the repair itself as evidence that RWB works.

This is **not a validated decision-support product**.

## What v0.3 adds

- a server-side model adapter at `POST /api/analyze`;
- separate Rheo and matched-control prompts;
- the same ontology-neutral structural-map schema for both conditions;
- OpenAI Responses API integration with structured JSON output and `store: false`;
- API credentials kept server-side;
- a browser panel that sends the current case to the model and renders the returned map;
- model-derived safety caution and narrator-implication events;
- user challenge of model provenance classification without silently rewriting the original model map;
- direct export of the same JSON object consumed by the evaluator;
- omission-aware similarity: empty/empty dimensions are unscored rather than counted as perfect agreement;
- separate coverage and granularity reporting;
- coarse / standard / fine forced-granularity modes to make the A3 granularity critique testable;
- a non-tautological example pair;
- prompt-budget parity checks between the two development conditions;
- an ontology-neutral development rubric;
- an end-to-end fixture smoke test proving browser/API schema/evaluator compatibility without pretending that fixture output is model evidence.

## Reciprocal Wellbeing architecture

Rheo uses seven nested horizons internally as lenses, not scores:

| Domain | Horizon | Reciprocal term |
|---|---|---|
| Natural Environment | Re-enchantment | Resources |
| Culture | Transformation | Values |
| Infrastructure | Creativity | Affordance |
| Society | Dialogue | Support |
| Outer Self | Curiosity | Capacity |
| Inner Self | Participation | Wellbeing |
| No Self | Nothing / Everything | Everything / Nothing |

No Self is not a KPI, multiplier, compliance demand or optimisation variable.

## Shared output representation

Both research conditions must emit `schemas/structural-map-v0.3.schema.json`.

The shared representation contains proposition-level provenance, ordinary-language system elements, falsifiable mechanisms, uncertainties, power/exit structure, temporal/viability structure, external stakeholders, action classes, displaced costs, disconfirming evidence, narrator implication and safety caution.

The output schema deliberately does **not** expose RWB horizon labels as scoring fields. Rheo may use RWB internally; the control is judged on the same ordinary structural representation.

## Running the executable prototype

Requires Node.js 20+.

For a real model call:

```bash
export OPENAI_API_KEY="..."
export OPENAI_MODEL="gpt-5"   # optional override
npm start
```

Then open:

```text
http://localhost:8080
```

The API key is never sent to browser JavaScript.

For pipeline testing without a paid model call:

```bash
RHEO_MODEL_PROVIDER=fixture npm start
```

The fixture provider is **only** a plumbing test. It must never be used as evidence about Rheo or the control condition.

## Development checks

```bash
python3 evaluation/prompt_budget.py
python3 evaluation/harness.py self-test
python3 evaluation/harness.py screen-pairs evaluation/example-manifest.json
node evaluation/smoke_v0_3.mjs
```

CI runs the same checks.

## Research integrity

The v0.3 mechanism change was preregistered before implementation in:

- `research/CHANGE_RECORD_V0_3_EXECUTABLE_MECHANISM.md`

The external v0.2 review found implementation and evaluation failures that v0.3 is intended to make testable. Repairing those failures is not evidence for the RWB-specific claim.

A substantive Rheo-vs-control claim still requires:

1. a strong instruction-budget-matched control, including an independently authored adversarial control;
2. ontology-neutral blind scoring;
3. pre-specified granularity analysis;
4. reliable independent raters;
5. frozen development and benchmark sets;
6. an externally held sealed set that current builders and standing critics neither author nor score;
7. longitudinal outcome evidence for any real-world usefulness claim.

## Important limitation

v0.3 establishes an **executable experimental apparatus**, not successful AI alignment. It allows the central hypothesis to be tested and falsified. It does not establish that RWB improves reasoning, safety, decision quality or real-world outcomes.

## Version

**v0.3 executable mechanism — August 2026**
