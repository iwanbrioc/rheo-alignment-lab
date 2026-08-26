# Protocol amendment — transport-failure salvage — 2026-08-26

## Reason for amendment

The first confirmatory v0.9 run (`2026-08-26T11-28-15-281Z`) attempted the frozen design of 10 cases × 4 conditions × 3 samples. It produced 119 successful outputs and one transport-level failure:

- missing cell: `SYN-209`, `matched`, sample 1
- error: `fetch failed`
- no model output was written for the failed attempt

A full replacement run was then attempted without changing the frozen implementation, prompts, cases, schemas, model, selector or analysis plan. That replacement run also encountered an independent `fetch failed` (`SYN-207`, `rheo_v08`, sample 3), demonstrating that long-run transport reliability was a recurring technical problem rather than a condition-specific model failure.

Continuing to discard nearly complete 120-attempt runs would impose substantial unnecessary API cost and would not improve the inferential target.

## Amendment

The first run remains the base dataset. Its 119 successful outputs are retained unchanged.

The missing cell is replaced by exactly one output from the second run:

`SYN-209.matched.s01.json`

This donor was selected **before inspecting its advice content**, using only the identity of the missing cell. The second-run `s01` replicate is used because the missing first-run cell was also `matched`, sample 1. The donor selection is therefore mechanical rather than performance-based.

All other outputs from the second run are excluded from the confirmatory dataset.

Both raw run directories remain untouched. A separate derived salvage directory is created by `salvage_transport_failure.py`, containing:

- the 119 successful output files from the first run;
- the single predetermined donor file from the second run;
- a derived `_run_log.json` recording the original failure, donor provenance and this protocol deviation.

The ordinary `blind_outputs.py` validation is then applied to the derived directory. It must still contain exactly 10 cases × 4 conditions × 3 samples = 120 balanced outputs before a blind can be created.

## Why this does not select on outcome

No generated advice is accepted or rejected because of its quality, ranking, direction or apparent condition performance. The failed first-run attempt produced no output. The donor cell is fixed by missing-cell identity and sample number before content inspection.

This is therefore a technical missing-output recovery, not a selective rerun to obtain a preferred model answer.

## Analysis status

The resulting dataset should be described as a **protocol-amended confirmatory dataset**, not as a perfectly preregistered zero-deviation run.

The primary and mechanism contrasts remain unchanged:

- `rheo_v09` vs `matched`
- `rheo_v09` vs `rheo_v08`

The case remains the primary unit. The single substituted replicate should be disclosed in any formal report.

A sensitivity check should also be reported for `SYN-209`: repeat the case-level comparisons with SYN-209 omitted. If the overall qualitative conclusion changes when this one case is removed, that dependence must be stated explicitly.

## Frozen implementation

The Rheo v0.9 implementation remains frozen at:

`2f6f6a72403b068cbb8908aa40ccc26c6b555eb8`

No ontology, prompt, schema, case, selector or scoring change is authorised by this amendment.
