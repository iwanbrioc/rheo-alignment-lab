# Rheocratic Critic Benchmark v1.0

## Research question

Can a frozen Rheocratic critic improve already-strong ontology-neutral practical advice by catching consequential reciprocal blind spots that an equally structured ontology-neutral critic does not?

This benchmark follows the v0.8/v0.9 result that strong neutral scaffolding outperformed Rheocratic action generation while both greatly outperformed bare advice.

The v1.0 test therefore moves Rheocracy from **optimiser** to **critic**.

## Hidden conditions

Every public output is derived from the same neutral source recommendation for its case/sample.

1. `neutral_base`
   - strong ontology-neutral diagnosis;
   - strong ontology-neutral three-action recommendation;
   - shared ontology-neutral first-action selector;
   - no critic.

2. `neutral_sham_critic`
   - exactly the same neutral source recommendation;
   - matched ontology-neutral critic;
   - common ontology-neutral finaliser;
   - finaliser may revise at most one action.

3. `rheocratic_critic`
   - exactly the same neutral source recommendation;
   - frozen canonical Rheocratic critic;
   - the same common ontology-neutral finaliser;
   - finaliser may revise at most one action.

If either critic returns `NO MATERIAL CORRECTION`, that arm is an exact copy of the neutral base output and no finaliser model call is made.

The critic never directly writes the public recommendation.

## Why the sham critic matters

`rheocratic_critic` vs `neutral_base` alone cannot distinguish ontology-specific value from the generic value of extra review/computation.

Therefore the **primary contrast** is:

> `rheocratic_critic` vs `neutral_sham_critic`

Secondary contrasts:

- `rheocratic_critic` vs `neutral_base`;
- `neutral_sham_critic` vs `neutral_base`.

## Corpus

Ten new prospectively frozen synthetic cases: SYN-301–SYN-310.

No v0.7, v0.8 or v0.9 evaluation case is reused.

The corpus deliberately includes both:

- decisions where a reciprocal blind spot could plausibly matter;
- ordinary decisions where the critic should be willing to abstain.

The exact prospective mechanism expectations are frozen separately in `CASE_DESIGN_NOTES.md` and are never supplied to generation or raters.

## Sampling and cost control

Default confirmatory run:

- 10 cases;
- 2 paired neutral source samples per case;
- 3 hidden conditions derived from each source sample;
- 60 blinded public outputs.

The case remains the primary inferential unit. The two source samples are repeated stochastic measurements, not independent cases.

Two source samples rather than three are used prospectively because the within-source paired design removes a large component of generation variance while reducing API cost.

## Transport reliability

The runner prospectively permits up to three attempts for a model call only when no valid model output has been obtained and the failure is technical:

- network/transport failure;
- HTTP 408;
- HTTP 429;
- HTTP 500;
- HTTP 502;
- HTTP 503;
- HTTP 504.

Retries use exponential backoff and are logged.

There is no retry for a valid but undesirable model answer, a structured-output validation failure, a non-retryable API error, or poor practical quality.

This rule is frozen before confirmatory generation in response to transport failures observed during v0.9 infrastructure runs; it is not selective resampling.

## Critic correction constraint

A critic may identify at most one material omission.

A common neutral finaliser may:

- reject the critique;
- change first-action sequencing;
- revise or replace at most one of the three actions.

At least two original actions remain textually unchanged when a critique is accepted. If a critique is rejected or absent, all three actions and the selected first action remain unchanged.

This is designed to test **correction**, not fresh optimisation.

## Blinding

A complete zero-failure run is required before blinding.

`blind_outputs.py` verifies:

- all expected conditions are present;
- every case has the frozen number of paired samples;
- each source sample has all conditions;
- no failed condition output exists.

It then randomises outputs to M-numbers and publishes only:

- blind ID;
- case ID/title;
- ontology-neutral action-comparison object.

The private reveal key contains condition and source-pair identity and remains hidden until all independent ratings are frozen.

Raters are not told condition names, condition count or pairing structure.

## Raters

At least two independent blind raters.

Each case is ranked as a whole. Ties are explicit. The frozen protocol is in `RATER_PROMPT.md`.

No wellbeing composite or framework-weighted score is permitted.

## Pre-registered analysis

### Rank handling

- Convert each rater's within-case ordering into ranks; ties receive average ranks.
- For each case × condition, average the two paired-sample ranks.
- Lower rank is better.
- Preserve raters separately before any pooled descriptive summary.

### Primary comparison

For each of the ten cases compare:

> `rheocratic_critic` vs `neutral_sham_critic`

Report:

- case directions: Rheocratic win / sham win / tie;
- mean condition rank across cases for each rater;
- exact paired sign test over non-tied case directions, descriptive rather than as a standalone proof of mechanism.

### Secondary comparisons

- Rheocratic critic vs neutral base;
- neutral sham critic vs neutral base.

### Paired-source diagnostic

Because all three outputs within a source pair begin from the same neutral recommendation, report whether an accepted critic correction improves, worsens or ties the rank of its own source base. These sample-level comparisons are descriptive and are not treated as independent inferential units.

### Critic calibration

After unblinding, report by condition and case:

- critic trigger rate (`materialCorrection`);
- finaliser acceptance rate;
- accepted correction target;
- Rheocratic canonical basis for triggered Rheocratic critiques;
- abstention rate on the prospectively designated low-value-correction cases;
- trigger/acceptance pattern on prospectively designated critic-opportunity cases.

A high correction rate is not inherently good. False-positive process on straightforward cases counts against the mechanism.

### Qualitative mechanism analysis

Map blinded rater comments back to conditions only after ratings are frozen. Specifically inspect whether critic-arm advantages or failures involve:

- regenerative capacity vs current availability;
- inherited framing treated as fact;
- nominal vs real affordance;
- voice vs consequential influence;
- hidden first-person burden;
- premature closure around an assumption;
- unnecessary preservation of an institutional/identity centre;
- displaced burden or cross-boundary effects;
- unnecessary process added by a critic.

### Length/process confounds

Record and compare action-content character count by condition. Check whether preferences track substantive corrections or simply additional length.

## Interpretation

- **Rheocratic critic > sham critic and > base:** evidence for ontology-specific critic value.
- **Rheocratic critic ≈ sham critic, both > base:** generic critique helps; no ontology-specific advantage demonstrated.
- **Rheocratic critic ≈ base and sham ≈ base:** no demonstrated critic value.
- **Sham critic > Rheocratic critic:** the ontology imposes critic cost.
- **Any apparent benefit driven by verbosity/process rather than changed practical value:** not support for the proposed mechanism.

## Freeze discipline

Fixture/preflight outputs are development infrastructure only and are not evidence.

Once the implementation is frozen and confirmatory model generation begins:

- do not tune prompts;
- do not alter cases;
- do not change critic thresholds;
- do not inspect condition performance before blinding;
- do not selectively replace successful outputs;
- allow negative results to stand.