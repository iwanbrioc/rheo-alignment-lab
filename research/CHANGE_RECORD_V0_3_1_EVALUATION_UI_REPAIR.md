# Change record — v0.3.1 evaluation + plain-language UI repair

**Branch:** `v0.3.1-evaluation-ui-repair`  
**Parent:** `3a74b76979b7655c74aa59b44dbdaa32a222d96b` (`v0.3-executable-mechanism`)  
**Written before implementation on this branch.**

## Trigger

The external v0.3 review found that the apparatus is now substantially executable, but not yet a valid test of the RWB hypothesis. The highest-priority defects were:

- F2: the machine similarity screen is lexical Jaccard overlap, so paraphrases can score as structural disagreement;
- F3/A6: the team-authored matched control is too close to a translation of RWB and cannot by itself isolate an RWB-content effect;
- F4/F5: fixture output and real-model output lose provider/condition metadata at export;
- F6: provenance challenges are logged but do not re-enter reasoning;
- F7: requested granularity is not enforced;
- F8: evidence/source references have no referential-integrity check;
- F9: the form-level safety gate is active by default because `Unknown` is treated as a danger signal;
- F11: low-coverage map pairs can still show apparently perfect similarity.

The user also requested a more approachable interface using plain speech. The research representation should remain explicit internally, while ordinary users should not have to understand terms such as “epistemic provenance”, “contraction”, “affordance”, “viability floor”, or “SMEAC” before they can use the guide.

## Intended mechanisms

### M1 — Separate lexical debugging from structural evaluation

Keep the current Jaccard function only as an explicitly named **lexical-overlap diagnostic**. Do not describe it as structural similarity. Add an interpretation guard: pair/family summaries below a pre-specified coverage floor of **7/9 scored dimensions (0.777...)** are reported as insufficient coverage rather than as an interpretable similarity result.

Do **not** introduce an uncalibrated embedding/LLM similarity score on this branch. A future semantic scorer must first separate same-structure/different-wording pairs from different-structure/similar-wording pairs on a labelled development calibration set and agree acceptably with blind human structural judgements.

Primary structural evaluation therefore remains blind human scoring until a semantic machine metric is calibrated.

### M2 — Do not silently solve A6 by writing another team-authored “independent” control

The current matched control remains available as a development arm, but documentation must explicitly state that it is a translated/content-matched control and cannot by itself establish an RWB effect.

Add an **independent-control specification** describing what a future adversarial/generic control author may change and what must remain frozen. Do not author the confirmatory adversarial control on this branch.

### M3 — Preserve experimental provenance in exports

Export an envelope containing at least:

- export version;
- case id;
- condition;
- granularity;
- provider;
- model;
- response id;
- timestamp;
- research-usable flag;
- the structural map.

The evaluator must accept this envelope directly and retain metadata. Raw v0.3 map files may remain readable for backwards-compatible development use.

Fixture runs must be visibly labelled `researchUsable:false`; the UI must not present fixture output as evaluable real-model evidence.

### M4 — Enforce granularity rather than merely request it

After model output, validate requested limits:

- coarse: max 3 system elements, 3 mechanisms, 8 propositions;
- standard: max 6, 6, 18;
- fine: max 12, 12, 30.

A violation is a model-output failure and must be observable as such. Do not silently truncate output, because truncation would change the evidence structure and could differ by condition.

### M5 — Enforce evidence-graph referential integrity

Provide the model with an explicit list of allowed case-record source references derived from non-empty leaves of the submitted case record. Every proposition `sourceRefs` entry must resolve to that list.

All mechanism, narrator-implication, and safety `evidenceRefs` must resolve to existing proposition ids.

`verified_external` may only be used when at least one source reference resolves to user-supplied evidence already labelled `verified_external`; model assertion alone cannot manufacture external verification.

### M6 — Make provenance challenge genuinely contestable

A user challenge to a model-assigned provenance label should be able to enter a subsequent model analysis as narrator-supplied disagreement. The challenge must not silently overwrite the original model map. The re-analysis receives the challenge as contested evidence and may retain or revise its classification.

Research logging should record that a challenge occurred and whether a re-analysis followed, without logging the user's free-text challenge reason into the research event log.

### M7 — Separate “unknown” from an active danger gate in the guide UI

At the model layer, `unknown` remains distinct from `none_detected`; unknown is not affirmative safety.

At the form/UI layer, however, the prominent danger notice activates only when an indicator is `Possible` or `Present`. Unknown fields produce a quieter “not enough information to rule this in or out” state rather than an always-on alarm. This is intended to reduce warning habituation without claiming safety.

### M8 — Plain-language presentation layer without changing the research ontology

Change user-facing labels and headings while preserving internal ids, enum values, output schema, and model-condition logic.

Examples:

- “Epistemic provenance” → “What do we actually know?”
- “Provenance” → “Where does this come from?”
- “Seven horizons” → “Look at the bigger picture”
- “Working contraction” → “What might be getting stuck?”
- “Affordance” → “new option / possibility”
- “Viability floor” → “a line we should not cross”
- “Disconfirming evidence” → “what would change our mind?”
- “Rheocratic SMEAC” → “Your working plan”, with SMEAC available as an optional research/advanced label.

Research controls such as condition and forced granularity should move behind an “Research settings” disclosure rather than dominate ordinary use.

The AI output should use plain headings while retaining machine-readable values in a research-details disclosure.

## Predictions

1. Exported model files will be self-identifying by condition/provider/model/granularity without a hand-built manifest.
2. Fixture exports will be visibly non-research and cannot be mistaken for successful real-model evidence in the guide.
3. Granularity violations will become observable failures rather than hidden variation.
4. Dangling proposition/evidence references will be rejected server-side.
5. A user provenance challenge can be carried into a later analysis without mutating the original returned map.
6. The form-level safety warning will no longer be active on a fresh blank session, while model-level `unknown` remains epistemically cautious.
7. The UI will expose fewer research terms on the default path while the underlying case record and structural-map ontology remain machine-compatible.
8. The Jaccard score will be explicitly reported as lexical overlap, and low-coverage perfect scores will be marked uninterpretable.

## Predicted nulls / non-claims

This change is **not expected to**:

- show that RWB improves AI reasoning;
- resolve A3 (granularity as latent degree of freedom) by itself;
- establish the fairness of the current matched control;
- validate No Self/decentring;
- eliminate narrator capture or politeness effects;
- prove that the plain-language UI improves decisions or retention;
- produce a confirmatory semantic similarity metric;
- make team-authored development cases confirmatory evidence.

## Possible regressions / collateral effects

- Strict source-reference validation may raise real-model failure rates until prompts comply reliably.
- Provenance challenges may increase model deference to the narrator instead of genuine contestability.
- Hiding research controls may make experimental state less visible to researchers unless the disclosure is clear.
- Plain-language labels may lose theoretical precision or subtly alter how users frame inputs.
- A coverage floor may reduce the number of machine-screen pairs that receive an interpretable lexical score.
- Enforcing granularity may create condition-specific missingness if one prompt violates limits more often.

These are to be measured, not patched away silently.

## Falsifiers / implementation checks

This change fails its intended implementation mechanism if any of the following occurs:

1. an exported file cannot reveal condition/provider/model/granularity without external bookkeeping;
2. a fixture result can be exported/presented as research-usable real-model evidence;
3. a map above a requested granularity limit passes server validation;
4. a mechanism/safety/narrator evidence ref can point to a nonexistent proposition and pass validation;
5. `verified_external` can be produced without a corresponding user-supplied independently verified evidence source;
6. a provenance challenge cannot be included in a subsequent analysis request;
7. a blank fresh form shows the prominent active safety warning;
8. the default UI still requires users to understand research jargon to complete the main flow;
9. the evaluator continues to label exact-string Jaccard as structural similarity;
10. a pair with <7/9 scored dimensions can be reported as an interpretable high lexical-agreement result.

## Independence boundary

No confirmatory adversarial control prompt or sealed evaluation set will be authored on this branch. The external reviewer who produced the v0.3 review has recused from subsequent reviewing/scoring. Future confirmatory control/rubric/sealed-set authors should be independent of this implementation cycle.
