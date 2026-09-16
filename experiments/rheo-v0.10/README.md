# Rheo v0.10 experimental: upstream causes and revisable hypotheses

Branch: `codex/rheo-v0.10-upstream-hypotheses`, based on `7260de0` from the mobile alpha branch. No merge or frozen research change. This is a product experiment, not a successor to the frozen v1.x research series.

## Concept

RWB remains the ontology: only material canonical reciprocal relationships. Marmot informs the upstream causal/equity check, not an eighth horizon or a socioeconomic score. Active Inference inspires keeping provisional explanations, testing uncertainty and revising from observations; this does **not** mathematically implement the Free Energy Principle. Rheocracy informs a small, usable intervention while leaving human choice open.

The Marmot Review treats conditions of life as relevant to health inequality; this implementation borrows that causal discipline, not a clinical assessment. [Primary report](https://www.instituteofhealthequity.org/resources-reports/fair-society-healthy-lives-the-marmot-review).
The Active Inference paper distinguishes practical utility and epistemic information gain; this implementation uses that distinction as a design analogy, not neuroscientific validation. [Friston et al., 2015](https://pubmed.ncbi.nlm.nih.gov/25689102/).

## Contract and version boundary

`POST /api/v0.10/decision` accepts a bounded situation, optional coordinate-free local-context JSON, and an optional explicit review. One Responses call returns a compact flow and three actions together. `schemaVersion` is `0.10-experimental`. Metadata always says `researchUsable: false`; no research arm is assigned. The old server, prompts and schemas remain unchanged. Root default start still runs the old engine. Mobile launcher defaults to the experiment on this branch; both server/client have explicit v0.9 selectors.

`schema.mjs` reads the frozen v0.9 action contract for canonical triplets and action fields, clones it and adds experimental fields in memory. `engine.mjs` scopes source IDs and case/review identity in the generation schema. Ajv validates the complete returned schema; `validation.mjs` checks identities, references, confidence prerequisites, area isolation, three kinds and learning comparisons. Errors never reveal provider output to the phone. Fixtures are plumbing-only, never fake advice.

| Field | Purpose |
| --- | --- |
| observations | Separate reported observations, interpretations, inference, absent-party reports and external context; source IDs, scope and confidence basis stay attached. |
| hypotheses | One to four provisional accounts; evidence refs, gaps/counterevidence, triplet if material, confidence, decisive question, prediction and falsifier/relocation. Prefer two to four only when useful. |
| primaryHypothesisId | Optional provisional primary. Null keeps the cause unresolved. |
| generatingRestriction | Relationship that may produce/maintain the difficulty, referring to the primary hypothesis. That referenced record owns its triplet, evidence, confidence and falsifier without a second drifting copy. |
| availableAgency | What the person can influence now, at its own triplet, with evidence and limits. It need not be the cause. |
| systemAgency | Who else would have to change a rule, provision, resource or relationship; uncertainty remains explicit. |
| relevantConditions / upstreamCheck | Only material upstream prompts, evidence and unknowns; tests individual and upstream explanations without assuming either. |
| distributionalEffect | Who acts/benefits/pays, displaced burden and compensating for institutional failure, for both map and actions. |
| safeguards | Immediate decision/deadlines, power/exit, safety, irreversible loss, relevant whole-cycle effects and regeneration. |
| modelUpdate | Prior recommendation ID, new observation refs, mismatch, explained increase/decrease/split/relocate/unchanged/insufficient-evidence update. |
| action additions | Hypothesis links, realistic access and fallback, independent execution, competing predictions and system-change requirement. |
| agency.relationship | Server-derived same/different/unresolved horizon comparison. Equality is not proof that an action fixes the cause. |

Exactly three unranked alternatives remain: smallest release, useful learning, pathway opening. Existing prediction, review horizon, falsifier, assumptions, displaced costs, irreversibility and optional Ways to Wellbeing are preserved. The three are not a required sequence. Ability to decline/choose something else is unchanged.

Confidence is ordinal, not a probability: **low** means key facts/alternatives untested; **medium** means supporting observations with material uncertainty; **high** requires converging observations and tested alternatives, still revisable. Event and cause have separate bases. Runtime rules reject high inference-only observations and medium/high causes based only on area/inferred evidence; they cannot establish whether real observations converge or a causal interpretation is true.

## Mobile loop and review

The small **What may be shaping this** section precedes the three options. It is tentative and uses simple English. A disclosure contains possible explanations, available influence, actions needed of others, and an outcome-based update where present. High/caution power warnings are visible before expanding. Expanded action cards show access, fallback, predicted signal/time, who carries work, system responsibility and irreversible risks before Choose.

The ordinary choice screen offers **Record what happened**. Two required fields capture actual action and outcome; four optional fields cover new possibilities, unchanged conditions, burden and surprise/new explanation. Save is local-only. A separate consent-labelled button asks with this update. The selected review and prior model/prediction are distinct inputs. A new decision/snapshot is saved; old advice/choice/review is not rewritten. Failed writes retain notes/options; retrying generated options only retries storage. Background/leave/Stop ignores late AI responses. Opening history never runs paid work.

Outcome records are append-only and attached to their recommendation identity. Deletion removes that decision's reviews. The existing 20-decision history limit means links can outlive a deleted/evicted predecessor; no complete longitudinal research archive is promised. Each decision allows 20 reviews. Revisions are experimental model interpretations, not proof of improvement or of RWB.

## Local evidence and privacy

Foreground GPS remains explicit and reduced on-device. No location is required; denied/failed/empty search still permits asking. No raw coordinate fields enter core requests or persisted sessions. The new engine additionally rejects common coordinate keys in contextual JSON. Written coordinates/identifiers in free text are not automatically redacted.

`AreaContextEvidence` reserves a typed future capability with explicit area scope, source URL, retrieval/observation time, geographic coverage and limitations. No provider is added and no new area facts are fetched or inferred. Existing provider snapshots continue unchanged. External context cannot establish personal status or sole medium/high causal confidence.

OpenAI receives the question and explicitly supplied local context; a revision additionally sends the selected review and bounded prior model/choice/prediction. `store:false` is not a zero-retention promise. Servers do not persist/log requests or results. Synthetic probe output is saved only by the explicitly invoked developer probe script, not the app server. Hypotheses/reviews can be sensitive; AsyncStorage is unencrypted. No accounts, telemetry, cloud sync, maps, background location or public people graph. Not suitable for hostile-surveillance deployment.

## Run and checks

From repo root:

```bash
npm ci
RHEO_MODEL_PROVIDER=fixture npm run start:experimental
npm run smoke:experimental
npm run smoke:v0.9
cd mobile
npm ci
npm run typecheck
npm run smoke:local
npm run doctor
EXPO_PUBLIC_RHEO_ENGINE=v0.10 npm run start:go
```

For real responses, configure a server-only `OPENAI_API_KEY`, `RHEO_MODEL_PROVIDER=openai`, and use `node mobile/start_rheo.mjs`. The existing default model is `gpt-5.4-mini`; override explicitly if desired. Default bind is loopback. A physical-phone preview needs an explicit `HOST=0.0.0.0` on a trusted LAN plus the Mac address in `EXPO_PUBLIC_RHEO_API_URL`. Restart Expo and reload after changing public variables. Do not expose the unauthenticated HTTP server publicly. Limits: 48 KB request, 15-second upload, 80-second run, two concurrent runs and 40 starts/hour shared across clients. No automatic retries.

Live synthetic probes require separate deliberate invocation:

```bash
RHEO_PROBE_OUTPUT=/absolute/non-evaluation/output node experiments/rheo-v0.10/probe.mjs
```

This spends API quota on eight synthetic cases. Inspect semantic behaviour, not just valid JSON. `MECHANISM.md` records prospective predictions before the new engine/probes; `AMENDMENTS.md` records development failures and corrections without rewriting the predictions. See `REPORT.md` for the completed run results and limits.

## Deliberate limits

No automatic causal truth verifier, access verifier, clinical or legal assessment, calibrated probabilities, scoring, validated RWB outcome claim or blinded comparison. The model can still miss a cause, offer weakly different alternatives, over-explain, misclassify a triplet, infer motives or miss a burden. Schema checks cannot certify the semantic flags for access/independence. New conditions are not mandatory questionnaires. The app offers no autonomous external action or public gift network. Secure field deployment, mesh transport, shared governance, area-data providers, multilingual accessibility and consented longitudinal evaluation are separate work.
