# Historical Corpus v2 — Unseen Cases

This apparatus tests retrospective structural reasoning on private/non-indexed cases whose later outcome record was not plausibly available to the tested model at analysis time.

## Core separation

Each case has three sealed layers:

- `T0.json` — decision-point brief. **This is the only case layer sent to Rheo/control.**
- `T1.json` — the action actually taken. Kept sealed during model analysis.
- `T2.json` — later outcome/mechanism record and scoring targets. Kept sealed until all model outputs are frozen.

Source documents stay beside the case bundle in a private directory and are never committed to this public repository.

## Directory layout

Create cases outside Git, for example:

```text
~/rheo-private-cases/
  unseen-001/
    T0.json
    T1.json
    T2.json
    consent.json
    sources/
```

Do not place real case material in the repository tree. `.gitignore` also blocks the conventional `private-unseen-cases/` locations as a second line of defence.

## Workflow

1. **Eligibility review** — use `ELIGIBILITY_CHECKLIST.md` before constructing model inputs.
2. **T0 construction** — reconstruct the protagonist's information state from contemporaneous material. Exclude later outcome facts.
3. **T1/T2 sealing** — record the actual action and subsequent outcome separately.
4. **Validation** — run `python3 validate_private_case.py /path/to/case`.
5. **Freeze** — run `python3 freeze_case.py /path/to/case`. Keep the generated freeze record; it contains hashes, not case text.
6. **Model run** — with Rheo server running, use `node run_unseen_case.mjs --case /path/to/case/T0.json --base http://localhost:8080 --samples 3`.
7. **Freeze outputs** before opening T1/T2.
8. **Blind conditions** before human rating.
9. **Unseal T2 and score** against the frozen historical targets.
10. **Aggregate by case**, never by treating repeated completions as independent cases.

## T0 discipline

T0 should contain the smallest amount of information required to reproduce the real decision frame:

- neutral situation description;
- evidence available at the time, with provenance;
- actor/stakeholder information necessary to understand authority, dependency and exit;
- uncertainties genuinely present at the time;
- decision horizon and recovery/consequence horizon where these were knowable;
- options the protagonist explicitly believed available, if documented.

Do not add hindsight interpretation merely because it later proved important.

## Positive as well as negative cases

Do not recruit only failures. Some cases should have broadly successful/viable original decisions. Otherwise a system that predicts danger everywhere could look artificially strong.

## Primary scoring families

After outputs are frozen, T2 may contain:

- `materialisedConsequences`;
- `historicallySupportedMechanisms`;
- `irreversibleThresholds`;
- `affectedStakeholders`;
- `timeHorizonEffects`;
- `narratorContribution`;
- `availableActionsAtT0`;
- `plausibleUnrealisedRisks`;
- `irrelevantDistractors`.

`plausibleUnrealisedRisks` are reported separately and are not automatically penalised. Only genuinely irrelevant distractors contribute to overprediction burden.

## Pilot rule

The first unseen case is a workflow pilot only. It can expose leakage, privacy, validator, freeze, API or scoring defects. It should not be counted as evidence for or against Rheo.

## Standing limitation

Even a clean unseen retrospective case cannot prove that a protagonist would have followed Rheo or that a different action would have produced a better outcome. Those questions require human decision studies and prospective cases.