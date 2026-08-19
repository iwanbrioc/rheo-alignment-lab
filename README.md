# Rheo Alignment Lab

**Rheo** is a research project testing whether Iwan Brioc's Reciprocal Wellbeing (RWB) model can contribute a useful structural reasoning heuristic for AI-assisted decision support and alignment research.

The central research question is:

> **Does Reciprocal Wellbeing help an AI identify consequential structure that strong general reasoning misses — while remaining sensitive to genuine structural difference, robust to narrator position and irrelevant framing, and without exporting the cost of successful advice elsewhere?**

## Current status

This branch is **v0.3.1 — evaluation and plain-language UI repair**. It follows the executable v0.3 branch and the final external adversarial review of v0.3.

`baseline-v0.2` remains frozen at commit `b3dff9befbe2786abffd4b353ff57c5da726b3cb`. v0.3 established a real browser → API → condition prompt → structured map → evaluator path. The v0.3 review concluded that the apparatus is substantially executable, but also identified two major experimental-design blockers: the machine screen was lexical string overlap rather than structural similarity, and the team-authored matched control was too close to a neutral-language translation of RWB to isolate an RWB-content effect.

v0.3.1 repairs measurement and usability issues without treating those repairs as evidence that RWB works.

This is **not a validated decision-support product**.

## What v0.3.1 changes

### Research integrity and evaluation

- the existing Jaccard screen is explicitly labelled **lexical overlap**, not structural similarity;
- low-coverage pair comparisons require at least 7/9 scored dimensions before a lexical summary is treated as interpretable;
- no uncalibrated embedding/LLM similarity score is introduced as a replacement;
- blind human scoring remains the primary structural comparison until a semantic machine metric is calibrated;
- exported model results now carry condition, granularity, provider, model, response id, timestamp and a research-usable flag;
- fixture output is explicitly marked non-research and cannot be exported from the guide as real-model evidence;
- requested coarse/standard/fine granularity limits are enforced server-side rather than merely requested in the prompt;
- model evidence references must resolve to actual proposition ids;
- proposition source references must resolve to explicit non-empty case-record/challenge inputs;
- `verified_external` cannot be manufactured by the model without a user-supplied evidence item already labelled independently verified;
- provenance challenges can be sent into a subsequent analysis as contested narrator evidence without rewriting the original returned map;
- `research/INDEPENDENT_CONTROL_SPEC_V0_3_1.md` freezes the boundary for a future independently authored generic/adversarial control without authoring that control inside this implementation cycle.

### Plain-language guide

The default user path now avoids requiring research vocabulary. Examples:

- “Epistemic provenance” becomes **“What do we actually know?”**;
- “Seven horizons” becomes **“Look at the bigger picture”**;
- “Working contraction” becomes **“What might be getting stuck?”**;
- “Viability floor” becomes **“a line we should not cross”**;
- “Rheocratic SMEAC” is presented as **“Your working plan”**, with SMEAC retained in an optional research explanation;
- condition/granularity controls sit behind a **Research settings** disclosure;
- AI output uses ordinary headings such as **“What Rheo thinks may be true”**, **“What we do not know yet”**, and **“What would change Rheo’s mind?”**;
- RWB terms remain available behind progressive disclosure rather than dominating the main path.

Internal ids, provenance enum values and the structural-map schema remain stable.

### Optional voice interface

The questionnaire now has progressive voice controls:

- a microphone button beside free-text fields writes interim/final speech recognition into the field as the user speaks when the browser supports live recognition;
- a speaker button reads each question aloud;
- an optional **Voice guide** reads the current section and reads a question when its field receives focus;
- spoken text remains editable before the user continues;
- audio is not added to the Rheo case record or research event log;
- unsupported browsers keep the normal typed interface.

This is an interaction-modality change, not an RWB reasoning change. Its research boundary is recorded in `research/VOICE_INTERFACE_NOTE_V0_3_1.md`.

## Safety handling

At the model layer, `unknown` remains different from `none_detected`: missing information is not proof of safety.

At the form layer, the prominent danger warning now activates only when a user marks a concern as **Maybe/Possible** or **Yes/Present**. Unanswered fields show a quieter uncertainty notice instead of making the warning permanently active from page load.

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

Both current development conditions emit `schemas/structural-map-v0.3.schema.json`.

The representation contains proposition-level provenance, ordinary-language system elements, falsifiable mechanisms, uncertainties, power/exit structure, temporal/viability structure, external stakeholders, action classes, displaced costs, disconfirming evidence, narrator implication and safety caution.

The output schema deliberately does **not** expose RWB horizon labels as scoring fields. Rheo may use RWB internally; the current matched control is judged on the same ordinary structural representation.

## Important control limitation

The current matched control is a **development content-matched control**, not an independently authored generic control. The external v0.3 review found that it contains a near-translation of the RWB lenses and Seven Ways. A Rheo-vs-current-control comparison therefore cannot by itself establish whether RWB content adds anything over strong general reasoning.

The next useful development design is three-arm:

1. Rheo;
2. the current translated/content-matched control;
3. an independently authored strong generic reasoning control produced under `research/INDEPENDENT_CONTROL_SPEC_V0_3_1.md`.

The implementation team does not author the confirmatory third-arm prompt.

## Running the executable prototype

Requires Node.js 20+.

For a real model call:

```bash
export OPENAI_API_KEY="..."
export OPENAI_MODEL="gpt-5.6"   # optional override
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

The fixture provider is **only** a plumbing test. The guide marks it non-research and disables evaluable-map export.

## Development checks

```bash
python3 evaluation/prompt_budget.py
python3 evaluation/harness.py self-test
python3 evaluation/harness.py screen-pairs evaluation/example-manifest.json
node evaluation/smoke_v0_3.mjs
node --check app/voice.js
```

The pair screen reports **lexical overlap only**. It is not a structural metric.

CI runs the same checks.

## Research integrity

Mechanism changes were preregistered before implementation in:

- `research/CHANGE_RECORD_V0_3_EXECUTABLE_MECHANISM.md`
- `research/CHANGE_RECORD_V0_3_1_EVALUATION_UI_REPAIR.md`

The independence boundary for a future generic/adversarial control is in:

- `research/INDEPENDENT_CONTROL_SPEC_V0_3_1.md`

The optional voice-interface modality boundary is in:

- `research/VOICE_INTERFACE_NOTE_V0_3_1.md`

A substantive RWB claim still requires independently frozen controls/rubrics, reliable blind raters, pre-specified granularity analysis, frozen development/benchmark sets, an externally held sealed set, and appropriate real-world outcome evidence.

## Important limitation

v0.3.1 improves the **test apparatus and guide interface**. It does not establish that RWB improves reasoning, safety, decision quality, retention or real-world outcomes.

## Version

**v0.3.1 evaluation + plain-language UI repair — August 2026**
