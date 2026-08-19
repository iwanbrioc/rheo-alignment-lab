# Historical Case Corpus for Rheo — v1.1 Development Protocol

This corpus contains 11 de-identified/transposed decision-point cases across finance, engineering, energy, public health, business strategy, public administration, ecological commons, small-organisation governance, platform product and municipal infrastructure.

It is a **development benchmark**, not a sealed confirmatory test.

## Question this benchmark can answer

The historical counterfactual — “what would have happened if the protagonist had used Rheo?” — is not directly observable. The primary scorable question is therefore:

> **Given only information available at the decision point, does the map identify consequential structure that later history supports, while avoiding irrelevant possibilities — and does it notice alternative actions that were already available inside the decision frame?**

This separates three ideas that must not be conflated:

1. **retrospective structural detection** — what the map sees;
2. **decision influence** — whether a human changes action after seeing the map;
3. **historical counterfactual outcome** — what would have happened after that different action.

The corpus tests only the first. Human decision experiments are required for the second. The third can only be analysed as a historical causal counterfactual, never observed directly.

## Repair from v1.0

### 1. Ontology-neutral decision briefs

The model inputs contain only neutral context and evidence/provenance. The v1.0 RWB horizon/triplet scaffolding has been removed. `validate_corpus.py` fails if framework-specific fields/labels leak back into the case input.

This matters because the old records handed the comparison condition RWB concepts before either system reasoned.

### 2. Recognition contamination is probed separately

`run_corpus.mjs` sends a separate, neutral recognition-only request directly to the OpenAI Responses API before running either condition. It does not use the Rheo or control system prompts.

The recognition probe returns structured fields:

- `status`: `recognized`, `not_recognized`, or `uncertain`;
- `candidate`;
- `confidence`;
- `anchors`;
- `rationale`.

Primary scoring excludes a case only where the probe returns a **specific, high-confidence recognition with at least two non-generic anchors**. Medium/uncertain cases remain visible for sensitivity analysis instead of being silently thrown out.

The recognition probe requires `OPENAI_API_KEY` in the local runner environment. If it is not available, the run proceeds but the log marks recognition as not run and the primary recognition-filtered interpretation is blocked.

### 3. Repeated sampling

One completion per case is too fragile for a stochastic model. The runner therefore supports repeated samples per case × condition.

```bash
node run_corpus.mjs --base http://localhost:8080 --samples 3 --granularity standard
```

Use **at least 3** samples for initial development. Use **5** before interpreting a condition difference.

Every refusal, validation failure and transport failure is recorded. Failed outputs are not silently skipped.

### 4. Case-balanced scoring

Raters score maps blind to condition on a 0–2 meaning scale. The scorer then aggregates:

1. across raters for a target;
2. across targets within a map/type;
3. across repeated maps within a case/condition;
4. across cases within a condition.

Replicates are not treated as extra independent cases. A case with more keyed consequences also cannot dominate merely by having more target rows.

## Historical key taxonomy

Each ordinary case key distinguishes:

- `historicallySupportedMechanisms` — historical mechanism claims supported by the sealed key;
- `materialisedConsequences` — consequences that actually materialised;
- `irreversibleThreshold`;
- `absentStakeholder`;
- `narratorContribution`;
- `horizonMismatch`;
- `availableActionsAtDecisionPoint` — alternatives already supported by the decision-point brief;
- `plausibleUnrealisedRisks` — reasonable ex-ante risks that did not materialise;
- `irrelevantDistractors` — irrelevant/non-binding possibilities used to detect generic overprediction;
- `nonTargetHistoricalEvents` — events that occurred but were not the material mechanism.

### Why plausible unrealised risks are not distractors

A decision-relevant risk can be reasonable ex ante even if it never occurs. Treating every non-materialised risk as a false alarm rewards hindsight. `plausibleUnrealisedRisks` are therefore scored and reported separately, but are **not subtracted** from the main historical-target score.

Only `irrelevantDistractors` contribute to the overprediction/genericity penalty.

### Available action detection

The action key does **not** claim an alternative would have produced a better outcome. It asks a narrower question:

> Did the map notice a usable alternative already available in the decision-point brief, rather than accepting the narrator's apparent choice set as fixed?

This gives the benchmark an affordance-discovery measure rather than making it only a retrospective disaster detector.

All current action keys have `sourceVerified: false`: they are grounded in the supplied decision brief, not yet independently verified against contemporaneous historical documents. External source verification can strengthen later versions without changing the present model input.

## Primary outputs

For each condition report:

- **historical-target detection**: case-balanced mean across materialised consequences, supported mechanisms, threshold, absent stakeholder, narrator contribution and horizon mismatch;
- **irrelevant-distractor score**: case-balanced mean on irrelevant distractors;
- **target–distractor separation**: historical-target detection minus irrelevant-distractor score;
- **available-action detection**: separate case-balanced mean;
- **plausible-unrealised-risk detection**: separate descriptive mean;
- **failure rate**, by condition and case;
- **recognition sensitivity**, excluding only high-confidence recognised cases in the primary analysis;
- **inter-rater reliability**, using quadratic weighted Cohen's kappa plus exact agreement.

A high historical-target score with an equally high irrelevant-distractor score is not evidence of useful discrimination.

## Mirrored narrator pair: hist-08a / hist-08b

The mirrored pair is not folded into the ordinary historical-target mean. It gets a dedicated blind pairwise score on:

- shared structural map across narrator reversal;
- absent-participant detection;
- preservation of uncertainty about disputed motive/retaliation claims;
- compatibility of action logic across narrators;
- **blame inversion** (lower is better).

A system fails symmetry if narrator reversal simply causes each account to make the other side the primary causal problem.

## Running the benchmark

From this directory, with Rheo running locally:

```bash
python3 validate_corpus.py
node run_corpus.mjs --base http://localhost:8080 --samples 3 --granularity standard
python3 make_rating_sheet.py sheet
```

Give raters:

- `rating_sheet/M*.md`;
- `rating_sheet/RATINGS_BLANK.csv`;
- `rating_sheet/P*.symmetry.md`;
- `rating_sheet/SYMMETRY_RATINGS_BLANK.csv`;
- `rating_sheet/INSTRUCTIONS.md`.

Keep `_blinding_key.json` and `_symmetry_blinding_key.json` away from raters.

After at least two independent raters complete their CSVs, place the completed files in `ratings/` and run:

```bash
python3 make_rating_sheet.py score
```

## Missing-not-at-random warning

Do not interpret aggregate scores without inspecting `_run_log.json`. If safety-adjacent, coercion-adjacent, highly uncertain or otherwise difficult cases fail more often in one condition, the missing outputs are not safely treated as random omissions.

## Control limitation

Run both current conditions. A Rheo-only run cannot establish comparative value.

However, the existing v0.3 matched control deliberately translates much of the same content into generic systems language. This remains useful as a development arm, but cannot isolate the causal contribution of RWB content. A genuinely independent generic-reasoning control is still required and, under the standing research constraint, must be authored outside the team rather than by the agents who designed or red-teamed Rheo.

## What this corpus still cannot tell us

It cannot establish:

- that Rheo would have changed any historical decision;
- that a human would accept or act on the map;
- that an alternative decision would have produced a better outcome;
- that any observed difference is uniquely attributable to RWB;
- confirmatory generalisation beyond this development set.

The next experimental layer after this corpus is a **human decision-influence study**: give people the same decision-point briefs, randomise the advisory condition they see, and measure whether their chosen action, confidence, information requests, reversibility, stakeholder inclusion and willingness to revise change.
