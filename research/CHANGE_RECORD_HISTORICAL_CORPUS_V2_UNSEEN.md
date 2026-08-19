# Change record — Historical Corpus v2 Unseen Cases

**Branch:** `historical-corpus-v2-unseen`  
**Scope:** development-benchmark apparatus for genuinely unseen retrospective cases; no change to the Rheo reasoning mechanism.

## Trigger

Historical Corpus v1.2 attempted to rescue public-history testing by using comparatively obscure, de-identified, source-grounded cases. In the first recognition-only screen, 0/20 candidates met the preregistered `not_recognized/high` eligibility rule. Seventeen were correctly identified at high confidence and the remaining three substantially narrowed to the correct historical incident/family.

This demonstrates that public historical cases can retain enough structural information to function as fingerprints for a frontier model even after obvious names, dates and places are removed. Continuing to search public history until a case happens not to be recognised would create a selection process vulnerable to benchmark gaming and repeated-testing bias.

## v2 purpose

Test retrospective structural reasoning only on cases for which the tested model has no reasonable route to the later outcome record at analysis time.

Each case is separated into three temporal layers:

- **T0 — decision point:** what was genuinely knowable to the protagonist before the decision;
- **T1 — action:** what was actually decided/done;
- **T2 — outcome:** what happened afterwards and which mechanisms became consequential.

Only T0 is supplied to Rheo and comparison conditions during analysis. T1 and T2 remain sealed until all model outputs are frozen.

## Eligibility

A primary v2 case must satisfy all of the following before any model analysis:

1. The T2 outcome record is not publicly indexed or otherwise plausibly available to the tested model.
2. T0 can be reconstructed primarily from contemporaneous documentary evidence rather than retrospective memory alone.
3. T1 and T2 can be documented independently enough to support later scoring.
4. The case contains a bounded decision point rather than an open-ended life history.
5. The contributor has authority to provide the material for this research use and has removed or separately protected unnecessary personal data.
6. The case is not selected because the research team already believes Rheo would have performed well on it.

Cases may come from small organisations, businesses, charities, projects, programmes, partnerships, local institutions or individual professional decisions. Both successful and unsuccessful outcomes are eligible.

## Privacy architecture

The GitHub repository is public. Therefore **no private case content, source documents, T0/T1/T2 text, participant names, emails, attachments or raw model outputs from private cases may be committed to this repository**.

Private case bundles live outside Git in a local directory named `private-unseen-cases/`, which is git-ignored. Public code contains schemas/templates only.

A case may later publish a minimal freeze record containing only:

- pseudonymous case id;
- freeze timestamp;
- cryptographic hashes of the frozen T0/T1/T2 bundle files;
- protocol/app/model version metadata;
- no source text or identifying metadata.

Hashes establish that the files later scored are the same files that were frozen; they do not make private content public.

## Experimental sequence

For every eligible case:

1. assemble source documents;
2. construct and freeze T0;
3. separately record T1 and T2, without showing them to the model-analysis operator where practical;
4. validate the case bundle;
5. generate cryptographic freeze hashes;
6. run T0 through Rheo and comparison conditions with repeated samples;
7. freeze all model outputs before unsealing T1/T2;
8. blind condition labels;
9. score maps against the T2 key using independent raters where feasible;
10. aggregate within map, within case, then across cases.

## Primary outcomes

The primary retrospective outcomes are:

1. **Consequential-structure detection:** did the map identify mechanisms/stakeholders/time horizons/thresholds that later became material?
2. **Available-affordance detection:** did the map identify an action or usable option demonstrably available at T0 but absent from the protagonist's working frame?
3. **Irrelevant-risk burden:** how much non-material generic risk did the map invent?
4. **Target–distractor separation:** consequential detection minus irrelevant-risk burden.
5. **Narrator implication:** where applicable, did the map identify a contributor mechanism involving the decision-maker without merely blaming the narrator?
6. **Failure/missingness:** refusals, validation failures and condition-specific missingness remain part of the result.

## Positive-outcome control

At least a meaningful minority of the development cases must be cases where the original decision produced a broadly viable or successful outcome. The benchmark must therefore reward justified restraint and accurate preservation of functioning structures, not merely catastrophe prediction.

## Non-claims

A retrospective unseen case can test whether a map detected structure later supported by the outcome record. It cannot establish that a protagonist would have followed the map or that doing so would have improved the outcome.

The stronger causal sequence requires a later human decision experiment and prospective casebook.

This remains a development benchmark. It does not replace an external sealed confirmatory set, and the existing requirement for an independently authored strong generic-reasoning control remains unchanged.

## Falsifiers / regressions

Treat v2 as invalid if:

- private case content is committed to the public repository;
- T1/T2 information leaks into T0 before model outputs are frozen;
- T0 is reconstructed primarily from hindsight where contemporaneous records were available;
- the case is added or removed after looking at Rheo/control performance;
- outputs are scored before condition blinding;
- repeated samples are treated as independent cases;
- only failed/harmful historical decisions are recruited;
- a public/indexed case is treated as genuinely unseen without a documented reason;
- the research team rewrites T2 targets after seeing model outputs.

## First milestone

Build and validate the private-case apparatus, then pilot it on one non-public case purely to test workflow integrity. Do not treat that first case as evidence.