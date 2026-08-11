# Rheo Alignment Lab

**Rheo** is a research prototype exploring whether the Reciprocal Wellbeing (RWB) model can function as a useful AI alignment heuristic and practical decision-mapping framework.

This repository contains the **v0.2 research baseline**: a small browser prototype, AI prompts, data schemas, an evaluation harness, and a preregistered adversarial testing framework.

The central research question is:

> **Does Reciprocal Wellbeing help an AI identify consequential structure that ordinary problem-solving misses — while remaining sensitive to genuine structural difference, invariant to narrator position and irrelevant framing, and without exporting the cost of successful advice elsewhere?**

## Status

This is **not a validated decision-support product**. It is a research instrument intended to make its own claims falsifiable.

The project deliberately separates:

1. **Rheo Guide** — a conversational mapping interface that helps a person examine a situation through the seven RWB horizons.
2. **Research Evaluator** — a separate layer for retrospective testing, structural comparison, provenance scoring, and adversarial evaluation.

The live guide must not optimise an aggregate RWB score. No Self is not a KPI or multiplier.

## Reciprocal Wellbeing architecture

Rheo uses seven nested horizons as lenses rather than scores:

| Domain | Horizon | Reciprocal term |
|---|---|---|
| Natural Environment | Re-enchantment | Resources |
| Culture | Transformation | Values |
| Infrastructure | Creativity | Affordance |
| Society | Dialogue | Support |
| Outer Self | Curiosity | Capacity |
| Inner Self | Participation | Wellbeing |
| No Self | Nothing / Everything | Everything / Nothing |

The model is treated as ecological, reciprocal, nonlinear and context-oriented. Input/output language is explanatory only.

## v0.2 mechanisms

### Epistemic provenance

Every consequential proposition should be represented with a source/provenance class:

- `user_reported_fact`
- `user_interpretation`
- `ai_inference`
- `verified_fact`
- `absent_party_perspective`
- `unknown`

This is intended to reduce **epistemic laundering**: the transformation of a narrator's interpretation into apparent system fact.

### Three-axis structural test

Rheo is evaluated on three coupled properties:

- **Symmetry** — mirrored accounts of the same underlying system should produce substantially similar structural maps.
- **Discrimination** — genuinely different systems should produce substantially different maps.
- **Stability** — cosmetic changes to the same account should not materially change the map.

High symmetry without discrimination indicates generic hedging. High discrimination without stability may indicate sensitivity to surface noise.

### Sham control

Every substantive evaluation should include an equally capable general model prompted to consider stakeholders, uncertainty, second-order effects, reversibility, alternative perspectives and safety, without RWB terminology.

A positive Rheo result is only interesting if it adds something beyond strong general deliberative prompting.

### Mechanism-change rule

Benchmark-driven changes must be preregistered **before implementation**. A proposed mechanism change must state:

- the hypothesised causal mechanism,
- the primary metric expected to move,
- collateral metrics expected to move,
- metrics expected **not** to move,
- any expected regression or trade-off.

If only the targeted benchmark improves, the change should be treated as a likely benchmark patch until shown otherwise.

### Safety and externalities

Rheo must not use relationship recovery time or Dialogue as an argument for preserving exposure to coercion, abuse or danger. It also evaluates **harm under correct operation**: a map can be structurally accurate and still externalise costs onto third parties.

### Flattery selection

The research instrument logs the first point at which a map materially implicates the narrator, allowing later analysis of whether attrition becomes selected on flattering outputs.

## Repository structure

```text
app/                 Browser research prototype
prompts/             Rheo and sham-control prompts
schemas/             Case, map and event schemas
evaluation/          Comparison harness and examples
research/            Frozen claims, scoring and change protocol
.github/              CI and adversarial issue template
CLAUDE_REVIEW_BRIEF.md
```

## Research integrity

Development should use three distinct test layers:

1. **Development set** — visible and usable for debugging.
2. **Frozen benchmark** — fixed cases and scoring rules that are no longer tuned against after freeze.
3. **External sealed set** — authored and scored by people or systems that did not participate in building the mechanism.

The current builders and standing critics should not author or score the final sealed set.

See:

- `research/EVALUATION_PROTOCOL.md`
- `research/FROZEN_CLAIMS.md`
- `research/MECHANISM_CHANGE_PROTOCOL.md`
- `research/SCORING_RUBRIC.md`
- `research/RED_TEAM_TESTS.md`

## Running locally

The browser prototype is static:

```bash
cd app
python3 -m http.server 8080
```

Then open `http://localhost:8080`.

The example evaluation harness can be run with:

```bash
python3 evaluation/harness.py evaluation/example-manifest.json
```

## Important limitation

The current prototype does **not** establish that RWB improves real-world decisions or AI alignment. Its purpose is to make that proposition testable, expose failure modes, and preserve an auditable record of how the mechanism changes in response to evidence.

## Version

**v0.2 research baseline — August 2026**
