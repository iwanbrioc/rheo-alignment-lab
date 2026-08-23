# Amendment — v0.7 action validation apparatus failure

Date: 2026-08-23
Applies to: `v0.7-synthetic-action-benchmark`
Status: recorded before corrective implementation

## Observed failure

After the Structured Outputs schema compatibility fix, the strengthened preflight reached the real `/api/rheo-actions` call but failed with HTTP 502 `action_output_validation_failed` before any benchmark run was allowed to begin.

This is an apparatus failure, not a benchmark result. No output produced during the failed preflight is admissible as comparative evidence.

## Diagnosis

The v0.6 action generator asks the model to echo dynamic frozen-diagnosis metadata (`caseId`, diagnosis row/organ/horizon/aligned intervention, and each action's aligned intervention) and then validates those echoed strings for exact equality. The static JSON schema can enforce shape but not the exact runtime values. A semantically correct model output can therefore fail mechanical validation because of a paraphrase, spacing variation, or other non-substantive mismatch in copied metadata.

## Corrective change

For v0.7 benchmark execution only, compile the action Structured Output schema at request time so fields that are frozen metadata are constrained to the exact runtime values supplied by the flow diagnosis:

- `caseId`;
- `diagnosisSnapshot.rowId`;
- `diagnosisSnapshot.organ`;
- `diagnosisSnapshot.horizon`;
- `diagnosisSnapshot.alignedIntervention`;
- `diagnosisSnapshot.confidence`;
- each action's `alignedIntervention`.

This does not alter the action-generation theory, the three required action types, the case text, the bare condition, the blinded comparison object, or the interpretation criteria. It only prevents exact-copy metadata from becoming a spurious failure mode.

Also surface server-side validation details in preflight errors so any remaining mechanical mismatch is diagnosable before the 60-attempt benchmark begins.

## Research boundary

The failed runs remain discarded. A new benchmark run must start only after preflight succeeds with the corrected apparatus. This amendment is not evidence for or against Rheo/RWB.