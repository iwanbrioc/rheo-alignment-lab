# Change record — Historical Corpus v1.1

**Branch:** `historical-corpus-v1.1`  
**Scope:** retrospective development benchmark; not a change to the Rheo reasoning mechanism.

## Trigger

The v1.0 historical corpus is useful but has several validity problems that would make a positive result difficult to interpret:

1. the case records themselves contain RWB horizon names/triplets, leaking the ontology into both conditions;
2. the recognition probe uses the Rheo analysis condition and infers recognition from failure to emit one exact phrase;
3. one output per condition per case makes results fragile to stochastic variation;
4. target-level aggregation overweights cases with more keyed targets;
5. the distractor bucket conflates genuinely irrelevant possibilities with risks that were decision-relevant but simply did not materialise;
6. the mirrored narrator pair needs a dedicated comparative symmetry analysis rather than ordinary outcome-key scoring;
7. the corpus tests retrospective harm detection more strongly than discovery of historically available alternative action.

## Mechanisms of repair

### M1 — ontology-neutral inputs

Historical cases sent to `/api/analyze` will contain only decision-point context, evidence/provenance and neutral metadata. RWB horizon names, triplets, status fields, contraction fields and other framework-specific questionnaire scaffolding are removed from the model input.

**Prediction:** any Rheo/control difference can no longer be attributed to RWB labels appearing in the case record itself.

### M2 — separate neutral recognition probe

Recognition will use a dedicated neutral endpoint/prompt with a small structured response: `recognized`, `candidate`, `confidence`, `rationale`. It will not run through the Rheo or matched-control reasoning prompt.

Cases will be:
- excluded in the primary analysis only for a high-confidence specific recognition;
- flagged, not automatically excluded, for medium/uncertain recognition;
- retained when not recognised.

**Prediction:** recognition exclusions will no longer depend on whether the model happened to repeat one required sentence.

### M3 — repeated sampling

The corpus runner will support repeated independent samples per case × condition, recording every refusal, validation failure and latency. Default development runs should use at least 3 samples; 5 is recommended before interpreting a condition difference.

**Prediction:** conclusions that depend on a single unusually good/bad completion will become visibly unstable rather than being silently accepted.

### M4 — case-balanced scoring

Human ratings remain primary. Scoring will first aggregate within map, then within case, then across cases so a case with more keyed consequences cannot dominate the benchmark simply by having more rows.

**Prediction:** headline condition differences may change relative to the v1.0 target-pooled average where target counts are uneven.

### M5 — revised historical target taxonomy

Keys will distinguish:
- `materialisedConsequences`;
- `historicallySupportedMechanisms`;
- `irreversibleThreshold`;
- `absentStakeholder`;
- `narratorContribution`;
- `horizonMismatch`;
- `availableActionsAtDecisionPoint` (only actions supported by the decision-point brief unless later source verification is added);
- `plausibleUnrealisedRisks` (reported separately, not penalised as false alarms);
- `irrelevantDistractors` (used for genericity/overprediction penalty);
- `nonTargetHistoricalEvents` (occurred but were not the material mechanism; descriptive only).

**Prediction:** a map is no longer penalised merely for naming a risk that was reasonable ex ante but did not happen.

### M6 — dedicated symmetry analysis

`hist-08a` / `hist-08b` will be scored comparatively on shared structural elements, narrator-specific blame inversion, absent-participant detection and stability across narrator position. Outcome-key scores for this pair will be reported separately from the main historical-target aggregate.

**Prediction:** narrator capture can fail even if both individual maps look superficially plausible.

### M7 — historically available action detection

Keys will include alternative actions already visible in the decision-point brief. These are not claims that the alternative would have produced a better outcome. They test whether the map notices a usable option that the narrator's framing is suppressing.

**Prediction:** this will distinguish pure retrospective hazard spotting from affordance discovery.

## Primary development outcomes

For each condition report:

1. **Historical-target detection** — case-balanced mean human rating on materialised consequences/mechanisms/threshold/stakeholder/narrator/horizon targets.
2. **Distractor score** — case-balanced mean rating on irrelevant distractors.
3. **Target–distractor separation** — historical-target detection minus distractor score.
4. **Available-action detection** — case-balanced mean for `availableActionsAtDecisionPoint`, reported separately from harm detection.
5. **Failure rate** — by case and condition, with explicit missing-not-at-random warning.
6. **Recognition sensitivity** — primary results exclude high-confidence recognised cases; sensitivity results include them.
7. **Symmetry result** — dedicated `hist-08a/b` report, not folded into the main mean.
8. **Inter-rater reliability** — weighted Cohen's kappa for two-rater ordinal scores where possible, plus exact agreement; low reliability makes substantive scores uninterpretable.

## Non-claims

This corpus still cannot establish:

- what *would* have happened historically if a protagonist had used Rheo;
- that seeing a better map causes a human to choose differently;
- that a different decision would have produced a better real-world outcome;
- that any Rheo/control difference is specifically caused by RWB content rather than all other prompt differences;
- confirmatory evidence from an external sealed set.

The existing v0.3 matched control remains a translated/content-matched development arm. A genuinely independent generic-reasoning control must still be authored outside the team and is not created in this change.

## Falsifiers / regressions

Treat this repair as unsuccessful if:

- any model input in the historical corpus still contains RWB/Rheocracy/No Self/horizon triplet labels;
- recognition status is inferred from free-text noncompliance rather than an explicit structured result;
- failed model runs disappear from the dataset;
- sample replicates are pooled as independent cases in the headline statistic;
- plausible unrealised risks are subtracted as distractors;
- the mirrored narrator pair is folded into ordinary target scoring without a symmetry report;
- available-action keys include alternatives not supported by the supplied decision-point brief unless explicitly marked as externally source-verified.

## Standing

This remains a **development set**. The cases and scoring design have been shaped by prior red-teaming. External confirmatory cases and their scoring keys must be written and scored by people who have not participated in the present design process.