# Changelog

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
