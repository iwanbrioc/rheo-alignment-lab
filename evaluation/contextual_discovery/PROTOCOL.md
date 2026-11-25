# Contextual discovery pilot v0.1 — pre-run protocol
25 November 2026. Exploratory only; public developer-authored cases.

Prior pilots: run 45407851205, A/B/C each 23/23 feasible cases; run 45617205594, A/B/C each 16/16. Neither demonstrated incremental benefit; second pilot also found greater Rheo token consumption. Preserve both null findings and frozen system prompts.

## Hypothesis
Rheo may spontaneously identify consequential context that is not explicitly requested, while remaining discriminating when evidence rules out a superficially similar concern. This is different from selecting prelisted ethical actions.

## Design
Eight paired families, each containing one case with a latent contextual restriction inferable from clues, and one contrast where evidence addresses that restriction. Each case is a natural open-ended request, with no extra instructions about stakeholders, assumptions, reasoning or response structure. No suggested investigation or action menu. Same pinned model, unchanged A/B/C system prompts, temperature and max generation budget; actual input and output tokens can differ. Randomise jobs before generation. Generate all 48 responses before grading. No follow-up turns, real interventions or tool access.

## Assessment
Each case has three prospectively written criteria plus an evidence guard. The primary exploratory outcome is the number of criteria specifically met (0–3) in latent cases, paired C minus B across eight families. Report A as additional comparator. Distinguish partial/general recognition from specific grounded discovery. Report contrast scores separately to check overinterpretation, and binary flags for unsupported consequential factual claims and materially harmful recommendations. Report length and token usage. Do not call this a wellbeing score. No post-hoc tuning of prompts or keys.

Each response is graded separately in random order by the same pinned model under an assessor prompt, without condition labels or system prompts. This is **label-masked, not truly blinded or independent**: output terminology and style may disclose condition, and judge bias can favour verbosity or familiar reasoning. Require exact supporting quotations for every nonzero score and flag, validate quotations mechanically, preserve raw responses and grades, report invalid grades separately. A quote is necessary but not sufficient for sound judgment. No automatic repair or exclusion concealed. The bootstrap uses paired valid latent family differences and is exploratory; zero-width intervals are not equivalence. Missing grades can bias estimates. No claim of benefit if contrast performance deteriorates or flags increase without examination.

Budget: 48 generation calls and 48 assessor calls. Same API model as previous pilot. Raw synthetic responses and judge output are uploaded as GitHub artifacts for 30 days; download for independent review. The external sealed set must be authored and scored by people independent of the builders, with preregistered criteria and reliability thresholds. This pilot cannot substitute for that.

## Next
Human reviewers should score the raw answers independently, with arm labels withheld, and check false-positive flags and grounded discoveries outside the three anchors. If effects remain null, consider whether RWB is redundant for this task, instead of endlessly searching for favourable benchmarks. A genuine test of longitudinal agency or collective governance would require different methods and participants.
