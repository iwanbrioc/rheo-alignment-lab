# Independent control specification — v0.3.1

This document defines the boundary for a future independently authored generic/adversarial control. It deliberately does **not** contain the control prompt itself.

## Why this exists

The v0.3 external review found that the current matched control is too close to a neutral-language translation of the RWB treatment. That makes it useful as a **content-matched development control**, but insufficient by itself to answer whether RWB content adds anything over strong general reasoning.

A future three-arm development comparison should distinguish:

1. **Rheo** — RWB reasoning lens;
2. **current matched control** — roughly treatment content without RWB names;
3. **independently authored generic strong-reasoning control** — no seven-lens enumeration or translated Seven Ways scaffold unless the independent author arrives at comparable structure independently.

The confirmatory control must not be written by the Rheo implementation team or by a reviewer who has already shaped the treatment.

## Frozen across arms

The independent control author may **not** change:

- the case text supplied to each condition;
- the structural-map output schema;
- provenance enum values;
- power/safety output fields;
- granularity levels and enforced item limits;
- model family/version used within a comparison;
- API settings other than the system instructions required by the condition;
- evaluator/rater instructions once frozen;
- case ordering/randomisation rules once frozen;
- retry/failure handling;
- the requirement to surface uncertainty, disconfirming evidence, displaced costs and narrator implication in the shared output representation.

Those are measurement opportunities shared by all arms, not treatment content.

## What the independent author may change

The author may write the system instructions used to reason from the case into the shared schema. They may choose ordinary decision-analysis, systems, causal, risk, stakeholder, counterfactual, or other general reasoning methods as they judge appropriate.

They should be told the task is to produce the strongest general-purpose structural analysis they can under the shared schema and approximately matched instruction budget, without being shown the RWB prompt line by line while drafting.

They should not be instructed to imitate or avoid specific RWB ideas beyond the prohibition on deliberately copying the treatment prompt.

## Budget matching

Token/word budget should be constrained to a pre-agreed range so performance cannot be explained by one arm simply receiving substantially more instruction. Budget matching is a nuisance-control requirement, not evidence of semantic fairness.

## Independence procedure

Recommended development procedure:

1. freeze the cases, schema, model configuration, granularity and scoring rubric;
2. give the independent author this specification plus the schema and task description, but not outcome data;
3. receive the prompt once;
4. hash/freeze it before running comparative outcomes;
5. do not iteratively tune it against Rheo results;
6. blind human raters to condition labels;
7. report all three arms, including failure/refusal rates.

For confirmatory work, the author and sealed-set scorers should be outside the implementation conversation/project team.

## Interpretive logic

A useful three-arm development result would be interpreted cautiously:

- `Rheo ≈ matched control > generic`: suggests the **content/structure** shared by Rheo and the translated control may matter more than RWB vocabulary.
- `Rheo > matched control ≈ generic`: suggests something specifically present in the Rheo framing may matter and requires mechanism-level follow-up.
- `Rheo ≈ matched control ≈ generic`: provides no evidence that the RWB scaffold adds value over strong general reasoning.
- `Rheo < either control`: evidence against the current mechanism on the tested outcomes.

These are development interpretations only. They do not substitute for an independently frozen confirmatory design.
