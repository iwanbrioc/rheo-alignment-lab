# Changelog

## v0.3.1 — Evaluation + plain-language UI repair

This version responds to the final external adversarial review of v0.3. The change was preregistered before implementation in `research/CHANGE_RECORD_V0_3_1_EVALUATION_UI_REPAIR.md`.

### Added

- self-identifying model export envelope containing condition, granularity, provider, model, response id, timestamp and research-usable flag
- server-side enforcement of coarse / standard / fine proposition, mechanism and system-element limits
- explicit allowed source-reference index derived from non-empty case/challenge inputs
- server-side proposition/evidence reference integrity checks
- guard preventing model-created `verified_external` status without a corresponding user-supplied independently verified evidence item
- provenance challenges that can be re-entered into a subsequent model analysis as contested narrator evidence
- independent-control specification without authoring the future confirmatory control
- evaluator support for v0.3.1 metadata envelopes
- explicit minimum-coverage interpretation floor of 7/9 dimensions for the lexical screen
- progressive disclosure of research terminology and settings in the browser guide
- Render deployment blueprint and custom-domain deployment notes
- CTOS design-system integration record at `research/CHANGE_RECORD_V0_3_1_CTOS_DESIGN_SYSTEM.md`

### Changed

- Jaccard is now named and reported as **lexical overlap**, not structural similarity
- blind human scoring remains the primary structural comparison until a semantic machine scorer is separately calibrated
- fixture output is marked `researchUsable:false` and cannot be exported from the guide as real-model research evidence
- the prominent form-level safety warning now activates on `Possible` or `Present`, while `Unknown` produces a quieter uncertainty notice
- most user-facing research jargon has been translated into ordinary language
- the final SMEAC output is presented as a **working plan**, while the SMEAC structure remains available as an explanatory research label
- research condition and detail/granularity controls are behind a disclosure instead of dominating the normal flow
- CI step wording now correctly describes the machine pair screen as lexical overlap
- Rheo now uses the production CTOS visual language: Geist UI type, Plus Jakarta Sans display type, Geist Mono metadata, the `#667eea → #764ba2 → #2aa895` signature hero gradient, monochromatic working surfaces, 1px-border depth, sharper radii, restrained shadows, CTOS signal colours, crisp motion and dark-mode parity
- RWB horizon cards use restrained colour signals rather than large decorative fills
- PWA theme colours, icon palette and service-worker cache version now match the CTOS family

### Still unresolved by design

- whether RWB outperforms strong general reasoning
- calibration/selection of a valid semantic machine structural metric
- A3: whether granularity is the dominant latent degree of freedom
- A6: independently authored generic/adversarial control and confirmatory scoring ontology
- A7: whether decentring increases acceptance independently of accuracy
- narrator-capture and model-politeness effects
- real-model failure/refusal rates, including missing-not-at-random failures on difficult cases
- independently verified external evidence beyond user-supplied provenance labels
- external sealed-set results and real-world outcomes
- whether the visual redesign improves usability, trust, completion or retention

### Research status

v0.3.1 repairs the development apparatus and usability layer. It is not evidence that the RWB alignment hypothesis is true.

---

## v0.3 — Executable mechanism

This version responds to the external adversarial review of frozen `baseline-v0.2`. The mechanism change was preregistered before implementation in `research/CHANGE_RECORD_V0_3_EXECUTABLE_MECHANISM.md`.

### Added

- server-side model execution path for Rheo and matched-control conditions
- shared ontology-neutral structural-map v0.3 schema
- model-backed browser structural-map panel
- model proposition provenance with user challenge events
- model-derived power/exit caution and narrator-implication events
- exit/continuation instrumentation after first model narrator implication
- direct live-map export into the evaluation representation
- forced coarse / standard / fine granularity conditions
- separate machine-screen similarity, coverage and granularity reporting
- omission-aware comparison: mutual silence is unscored, not agreement
- non-tautological worked comparison pair
- prompt-budget parity development check
- ontology-neutral development scoring rubric
- quadratic weighted kappa reporting for two-rater ordinal total scores
- explicit reporting of unexpected rater-count items
- end-to-end fixture API → schema → evaluator smoke test
- archived external v0.2 adversarial review
- post-implementation verification record

### Changed

- form-level `Unknown` power/exit states now trigger epistemic caution instead of behaving as safety
- legacy contraction chips are explicitly labelled as narrator-authored signals rather than AI-derived causal findings
- CI now tests the executable v0.3 plumbing and evaluator invariants

### Still unresolved by design

- whether RWB outperforms strong general reasoning
- A3: whether granularity is the dominant latent degree of freedom
- A6: independent adversarial control authorship and independently authored/approved scoring ontology
- A7: whether decentring increases acceptance independently of accuracy
- calibration of safety false positives/negatives
- external sealed-set results and real-world outcomes

### Research status

v0.3 is an executable experimental apparatus, not evidence that the RWB alignment hypothesis is true.

---

## v0.2 — Research baseline

This version integrates the first adversarial review cycle into the Rheo research architecture.

### Added

- proposition-level epistemic provenance
- three-axis structural evaluation: symmetry, discrimination and stability
- sham-control arm for every substantive test
- explicit coercion / asymmetric-power safety gate
- displaced-cost analysis, including harm under correct operation
- narrator-implication and drop-off instrumentation for flattery-selection analysis
- mechanism-change preregistration requiring collateral predictions
- blind scoring and inter-rater reliability requirements
- frozen claims and kill conditions
- external sealed-set independence requirement
- browser research prototype and example comparison harness

### Removed / restricted

- person-facing accommodation-to-loss diagnosis
- aggregate RWB scoring
- scoring or KPI treatment of No Self
- recovery-time logic as a reason to preserve exposure to danger

### Research status

No claim of validated decision support or alignment improvement is made at this stage.
