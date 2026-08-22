# Change Record — v0.6 Action–Outcome Learning Loop

Date: 2026-08-22
Status: preregistered before implementation
Parent: `v0.5-adaptive-interview`

## Purpose

Extend the testimony-first Rheo interview into a longitudinal action-research loop:

**testimony → provisional flow diagnosis → three positive actions → human choice → predicted consequences → observed consequences → revised diagnosis**.

This change is intended both to improve the product and to create a more meaningful empirical object for AI-alignment research: consequences over time rather than rubric-only judgements of a single answer.

## Product behaviour to implement

After a working flow pattern is revealed, Rheo should generate exactly three constructive experiments:

1. **Smallest release** — the least intrusive practical action likely to release or test the diagnosed restriction.
2. **Learning action** — an action designed primarily to discriminate whether the diagnosis is correct.
3. **Generative action** — an action intended to strengthen or create capability/affordance so the system can generate future options itself.

The three actions must not be paraphrases of one another. Each must:

- be feasible from the information available at T0;
- state the aligned intervention/horizon it operationalises;
- specify what Rheo predicts should become more viable next if the diagnosis is right;
- name an observable signal;
- name a falsifier / reason to stop or change course;
- name plausible displaced cost or burden;
- identify which Seven Wellbeing Activators materially affect enactment;
- avoid prescribing an irreversible total solution when a smaller test is available;
- allow decisive action where delay itself closes viable options.

The human may choose any one action, choose more than one sequentially, modify an action, or choose **none of these**. The app must never record an AI proposal as if it were followed.

## Outcome capture

For every action actually attempted, the app should preserve a separate outcome record containing at least:

- action proposed;
- action actually taken, including participant modifications;
- date / interval of action where known;
- intended prediction frozen before action;
- what happened;
- what became easier / more possible;
- what became harder / less possible;
- unexpected benefits;
- unexpected harms or displaced costs;
- whether the predicted next flow transition appeared;
- whether any affordance appeared or disappeared;
- whether generative capability strengthened or weakened;
- whether the participant now locates the primary restriction differently;
- confidence / uncertainty in the outcome account;
- source status: participant testimony, external verification, or unknown.

Outcome testimony remains distinct from Rheo's interpretation.

## Research representation

Do **not** collapse outcomes to one RWB reward or scalar wellbeing score.

The longitudinal research object is a consequence vector. At minimum preserve:

- intended effect: occurred / partly / not observed / unclear;
- predicted propagation: observed / partly / not observed / unclear;
- unexpected benefit: present / absent / unclear;
- unexpected harm/displaced cost: present / absent / unclear;
- affordance change: expanded / mixed / contracted / unclear;
- generative capacity: strengthened / unchanged / weakened / unclear;
- frame/diagnosis revision: changed / unchanged / unclear;
- action status: tried / modified / declined / abandoned;
- participant usefulness judgement, separate from outcome claims.

These categorical fields are annotations of a preserved narrative record, not a scalar reward target.

## Alignment hypothesis enabled by this change

Rheo should eventually be evaluated on trajectory-level questions such as:

- whether its predicted next transition actually becomes more viable;
- whether its smallest sufficient interventions expand future affordance without exporting costs;
- when restraint preserves viability versus merely inducing caution;
- whether frame relocation reduces missed displaced costs;
- whether the model revises its diagnosis appropriately after contradictory consequences.

The app does not claim that observed correlation validates the RWB physiology. Human action, context change and selection effects remain confounds.

## Data/consent boundary

The first implementation stores interview/action/outcome records locally in the browser and allows explicit export. No automatic research upload is introduced in this change. Any future pooled corpus or model-training use requires a separate consent/data-governance change and must distinguish:

- product telemetry,
- research analysis,
- model evaluation,
- model training.

Consent to one must not imply consent to another.

## Falsifiers / failure modes to monitor

- three actions are cosmetic variants rather than genuinely different experiments;
- Rheo systematically recommends delay/reversibility even on cases where prompt action is appropriate;
- participants cannot tell AI proposal from action actually taken;
- outcome reporting rewards confirmation of the initial diagnosis;
- retrospective reports silently overwrite the frozen prediction;
- displaced cost is only asked after success/failure is known;
- outcome labels are treated as a scalar reward;
- the model fails to revise despite contradictory consequences;
- the action generator simply restates the v0.4 diagnosis without creating usable action affordance.

## Research sequencing

This feature is a product/research-instrument change, not evidence. Before using accumulated outcomes for alignment claims, freeze a separate evaluation protocol specifying unit of analysis, follow-up interval, missing-data handling, independent outcome annotation and comparison arms.
