# v0.3.1 implementation verification

**Branch:** `v0.3.1-evaluation-ui-repair`  
**Stacked PR:** #4 against `v0.3-executable-mechanism`  
**Purpose:** implementation verification only; not evidence that RWB improves AI reasoning.

## Pre-registration

`research/CHANGE_RECORD_V0_3_1_EVALUATION_UI_REPAIR.md` was committed first on the branch, before implementation changes.

A subsequent presentation-only integration of the production Coming to Our Senses / CTOS Hub visual system is separately recorded in `research/CHANGE_RECORD_V0_3_1_CTOS_DESIGN_SYSTEM.md`. That record preserves the research schema/model/evaluator invariants and notes that visual treatment itself may affect trust, salience, friction or retention.

## CI verification

GitHub Actions PR run **31506959824**, job **93830880717**, completed successfully on 2026-08-11 for the original v0.3.1 repair set. Later branch runs continued to pass the same syntax, JSON, evaluator and fixture-pipeline checks after the deployment and design-system additions.

Verified by CI:

- JavaScript syntax for server, guide modules, service worker and smoke test;
- Python syntax for evaluator and prompt-budget check;
- JSON parsing;
- required research records;
- Rheo/control prompt word counts remained 722 vs 720 (relative delta 0.278%);
- evaluator self-test passed with Jaccard explicitly treated as lexical-only, empty/empty unscored and low coverage uninterpretable;
- example lexical screen: `mean_lexical_overlap=0.796`, coverage `1.000`, granularity 17/17;
- fixture pipeline smoke passed through API → structural map → v0.3.1 metadata envelope → evaluator;
- fixture output remained `researchUsable:false`;
- fixture lexical screen reported `1.000` at coverage `0.889`, as expected for condition-blind plumbing output and **not** as model evidence.

## Review-finding status after v0.3.1 implementation

### F2 — lexical screen mistaken for structure

**Addressed as a measurement-labelling repair, not solved with a new metric.**

The Jaccard screen is now named lexical overlap throughout active evaluation tooling. A 7/9 coverage floor prevents low-coverage perfect overlap from being presented as an interpretable family summary. No uncalibrated semantic scorer has been substituted. Structural comparison remains a human-scoring problem until a machine metric is calibrated.

### F3 / A6 — control contains the treatment

**Not solved; boundary clarified.**

The current control remains a translated/content-matched development control. `research/INDEPENDENT_CONTROL_SPEC_V0_3_1.md` defines the frozen interface for a future independently authored generic/adversarial control without authoring it in this implementation cycle.

### F4/F5 — fixture ambiguity and lost condition metadata

**Implementation addressed.**

Server responses now include provider and research-usable state. Browser research-map export uses a v0.3.1 envelope containing condition, granularity, provider, model, response id, timestamp and the unchanged structural map. Fixture output is marked non-research and guide export is disabled for it.

### F6 — provenance challenge is cosmetic

**Mechanism path implemented; behaviour unverified.**

A user challenge can now be included in a subsequent analysis as narrator-supplied contested evidence. The original returned map is not silently rewritten. The research event log records challenge occurrence and whether a re-analysis was requested without logging the free-text challenge reason.

No real-model experiment has yet shown whether this improves contestability or merely increases narrator deference.

### F7 — granularity not enforced

**Implementation addressed.**

Server validation rejects outputs exceeding the requested system-element, mechanism or proposition limits. It does not truncate. Condition-specific violation/failure rates remain an empirical question.

### F8 — dangling evidence/source refs

**Implementation addressed at referential level.**

Proposition source refs must match explicit non-empty source refs supplied to the model. Mechanism, narrator-implication and safety evidence refs must resolve to returned proposition ids. `verified_external` requires a source tied to user-supplied evidence already labelled independently verified.

This is not independent fact checking: the system still trusts the user's provenance label for externally verified evidence.

### F9 — form-level safety gate always on

**UI mechanism addressed.**

The prominent warning activates only for `Possible` or `Present`. `Unknown` remains visible through a quieter uncertainty notice and remains distinct from model-level `none_detected`.

Browser-level usability and false-positive/false-negative behaviour have not yet been tested.

### F11 — low-coverage high overlap

**Development screen addressed.**

Fewer than 7/9 scored dimensions is now marked uninterpretable for a lexical family summary. The threshold is a development guard, not a validated confirmatory criterion.

## Plain-language UI and CTOS visual system

The main guide uses ordinary-language headings and questions, with research terminology behind progressive disclosure. Internal ids, output schema and model condition names remain stable.

The visual layer now follows the production CTOS system supplied for this project and checked against `iwanbrioc/CTOShub`: Geist for UI/body, Plus Jakarta Sans for display headings, Geist Mono for research metadata; the periwinkle/purple/teal signature gradient for the landing hero; monochromatic work surfaces; sharp input/button/card radii; 1px-border depth; restrained shadows; colour used as a signal; seven horizon accent strips; responsive dark-mode tokens; and reduced-motion handling. PWA colours/icon/cache were updated to match.

No CTOS illustration or institutional mark was redrawn or fabricated. The redesign is a presentation change and must not be treated as evidence of RWB performance or user benefit.

## Still unverified / required next

1. **Successful real-model integration run.** A previous real OpenAI request reached the Responses API but failed on the pre-v0.3.1 strict-schema transformation. No successful real-model structural map has yet passed the full v0.3.1 source-ref and granularity validators.
2. **Real-call audit.** Run 20–40 development calls and report API failures, refusals, validation failures, granularity violations, dangling-ref attempts and which case types fail.
3. **Similarity calibration.** Use labelled same-structure/different-wording and different-structure/similar-wording pairs with blind human ratings before adopting any semantic machine scorer.
4. **Independent third arm.** Obtain an independently authored generic strong-reasoning control under `INDEPENDENT_CONTROL_SPEC_V0_3_1.md`; freeze it before outcome comparison.
5. **Provenance-challenge test.** Measure whether challenges improve source classification accuracy rather than merely increasing agreement with the narrator.
6. **Plain-language/design usability check.** Small development test for comprehension, completion friction and whether progressive disclosure preserves research-state visibility.

## Research status

v0.3.1 currently verifies that the intended **implementation repairs are wired and CI-clean**. It does not establish structural reasoning superiority, safety superiority, RWB-specific benefit, successful real-model operation, or real-world usefulness.
