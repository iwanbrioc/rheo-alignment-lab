# Experimental implementation report: 16 September 2026

Branch: `codex/rheo-v0.10-upstream-hypotheses`, created from mobile commit `7260de0`. The completion message supplies the final commit SHA. No merge or push was performed.

## Delivered

Rheo now has an isolated v0.10 experimental decision endpoint and mobile adapter. It distinguishes provisional generating causes, the person's available influence and changes needing someone else's action. It keeps competing explanations with evidence provenance, separate event/cause confidence, predictions and change signals. RWB remains the ontology; Marmot informs upstream causal discipline; Active Inference informs testing and revision; Rheocracy informs small usable interventions. No extra horizon, scores, rankings or four-framework UI.

The mobile result adds a short tentative **What may be shaping this** section. Expanded options expose access limits, burden, predictions and system responsibility. A local outcome review records actual action separately from chosen action. A separate explicit request uses that review to produce a NEW recommendation/decision; old advice and choice remain intact. Recent distinguishes revised options and saved reviews.

The earlier requested private gift/pathway notebook and live-dictation support are included in this coherent mobile branch. Giving remains optional. Pathways are private possibilities with observed personal check-ins, not a public resource map or proof of a gift economy. Live dictation uses the existing Expo project and falls back to voice notes in Expo Go. Frozen research and the approved brand artwork were not changed.

## Material modules

- `experiments/rheo-v0.10/`: prospective mechanism, amendment log, compact schema, prompt, Ajv/semantic validation, fixture, provider client, bounded HTTP server, A-H cases, smoke, probe runner and recorded development output.
- `mobile/src/types/experimental.ts`, `utils/experimental.ts`, `services/experimentalApi.ts`: typed projection, review contract and separate versioned client.
- `mobile/src/types/decision.ts`, `utils/decisionSession.ts`, `storage/decisionSessions.ts`: optional append-only outcomes, predecessor identity, validated storage and deletion.
- `ShapingSummary.tsx`, `OutcomeReviewScreen.tsx`, `AdviceScreen.tsx`, `ActionCard.tsx`, `RecentDecisionsScreen.tsx`, `ConfirmationScreen.tsx`, `App.tsx`: practical summary, evidence disclosure, access/burden visibility, explicit choice/review/revision and recoverable saves.
- `mobile/pathway_contract.*`, `pathway_planner.mjs`, pathway types/utils/storage/client/screens/components and local-context route: bounded optional AI suggestion and private pathway notebook.
- `LiveVoiceInput.tsx`, `RecordedVoiceInput.tsx`, `VoiceInput.tsx`, `nativeSpeech.ts`, `dictationSession.ts`, `app.json`: earlier pending native speech-to-text work, voice-note fallback and native permissions.
- Root/mobile package manifests and lockfiles, mobile launcher, focused smokes, mobile CI, READMEs and screenshots.

## Schema and agency

The complete field map is in [README](README.md#contract-and-version-boundary). New concepts include `observations`, `hypotheses`, `primaryHypothesisId`, `generatingRestriction`, `availableAgency`, `systemAgency`, `relevantConditions`, `upstreamCheck`, `distributionalEffect`, `safeguards` and `modelUpdate`. Actions preserve the original v0.9 action fields and add access/independence checks, hypothesis links, contrasting predictions and system-change responsibility.

Generating restriction references one hypothesis, which owns its triplet, evidence, confidence and falsifier. Available agency has a separate triplet and explicit limits. Action horizon comparison is derived by the server; being at the same horizon does not prove an action fixes the cause. Example: clinic pickup rules can generate an infrastructural restriction while the person can only ask a decisive question. Altering a clinic rule remains the clinic's responsibility.

## Local context and privacy

Optional, foreground, on-device-rounded GPS and real/no-result local-search behaviour remain. The approximate area label is preserved even if the place search fails. No raw coordinate fields enter the core request or saved session. An area-evidence type reserves source, scope, time, coverage and limitations for a future provider; no new provider/data dependency was added and neighbourhood context is not personal socioeconomic evidence.

New hypotheses and reviews can contain sensitive inferences or experiences. They are saved in local AsyncStorage, **not encrypted**. Only explicitly requesting a revision sends its selected review, bounded prior hypotheses/choice/prediction, question and saved local context to OpenAI. `store:false` is not a zero-retention guarantee. Deletion removes that decision and its reviews, not separately saved revisions/pathways; the existing 20-decision limit still applies. Reviews cap at 20 per decision. Pathways use separate limits of 50 records/30 check-ins without silent eviction. Written identifiers/coordinates are not automatically redacted.

The experimental server defaults to loopback, rejects browser origins, has request/run/size/concurrency/rate limits and logs no personal content. It remains unauthenticated HTTP for trusted development networks, not hostile-environment infrastructure. Native speech may be processed by Apple/the phone's speech provider; Expo Go voice-note uploads retain their separate explicit consent. No background tracking, public people graph, accounts, cloud sync or telemetry was added.

## Dependencies

- Root: **Ajv 8.20.0**, to validate the full experimental JSON Schema instead of hand-rolling another validator.
- Earlier pending dictation work: **expo-speech-recognition ^57.0.0**, **expo-dev-client ~57.0.19**. Native builds need rebuilding; Expo Go keeps the supported fallback.
- Expo Doctor-aligned patches: expo `~57.0.23`, expo-asset `~57.0.17`, expo-audio `~57.0.5`, expo-file-system `~57.0.7`, expo-image `~57.0.5`, expo-location `~57.0.18`, expo-splash-screen `~57.0.9`.
- No pathway, navigation, analytics, map or external-area-data dependency.

## Exact checks

| Command | Result |
| --- | --- |
| `cd mobile && npm run typecheck` | Exit 0, `tsc --noEmit`, no errors. |
| `cd mobile && npm run smoke:local` | Exit 0, all 13 scripts passed, 15 PASS summaries. Includes fixture/live-mock local context, location, sessions, keyboard, recorded voice, dictation, brand, preparation/plain English, requests, usability, pathways, pathway UI and experimental review. |
| `cd mobile && npm run doctor` | Exit 0: **21/21 checks passed. No issues detected!** Initial patch-version warnings were fixed using Expo's compatible patch updates. |
| `npm run smoke:experimental` | Exit 0: eight fixture-only case transports; strict schema, identity/references, provenance/area separation, confidence prerequisites, cause/agency distinction, action comparisons, outcome evidence, provider privacy and HTTP errors/timeouts/redaction. |
| `npm run smoke:v0.9` | Exit 0: unchanged fixture flow/action pipeline PASS, zero working horizons, unsupported primary, `researchUsable=false`; fixture-only, not behavioural evidence. |
| `git diff --check` | Exit 0. |
| Diff of authoritative instructions, canonical lexicon, original v0.9 server, `prompts/`, `schemas/`, tracked `evaluation/` | Exit 0, no changes. Existing untracked evaluation outputs were left alone and excluded from staging. |
| `cd mobile && npm audit --omit=dev --json` | Exit 1: **11 moderate**, 0 high, 0 critical, inherited Expo/xcode/uuid dependency chain. Suggested force fixes include incompatible Expo downgrades; these were not applied. Doctor passing is not a security audit. |

The new native dictation build was not completed: the local Xcode installation lacks its required iOS platform. Component/session tests pass, but native speech still needs device verification. Expo Go simulator flow was exercised successfully.

## Synthetic development results

These are unblinded development probes, not a benchmark, comparison with v0.9 or proof of effectiveness. [Recorded final output and failure metadata](development-probes/2026-09-16.json) preserve the results; [amendments](AMENDMENTS.md) explain changes without rewriting prospective predictions.

Final run: **8/8 structurally valid**, `gpt-5.4-mini`, low reasoning, one model call per decision. Times were 15.068-30.127 seconds. Structural acceptance is **not** semantic success:

| Case | Time | Semantic observation / remaining weakness |
| --- | --- | --- |
| A: upstream vs motivation | 22.661 s | Identified transport/work mismatch and separated employer responsibility from available checks; no primary laziness diagnosis. Some burden wording remains weak. |
| B: individual, actionable | 15.068 s | Did not manufacture structural disadvantage. **Practical and learning options still overlap materially**, and two hypotheses are weakly distinct. This part is not solved reliably. |
| C: different horizons | 30.127 s | Distinguished clinic-controlled access from a short call; future-access note can be requested now. Practical and learning calls remain close in purpose. |
| D: inaccessible option | 16.260 s | Kept food urgency, no travel/childcare spending, verification by phone. Generic helpline suggestions are unverified and require a reachable number. |
| E: displaced burden | 20.235 s | Did not transfer extra work to the exhausted volunteer; kept refusal, workload clarification and funded hours visible. |
| F: sparse evidence | 18.052 s | Null primary, low-confidence alternatives, no invented deprivation/diagnosis. Some wording remains generic. |
| G: narrator/area discipline | 19.213 s | Null primary; unknown reasons/motives all low confidence. Did not infer personal transport difficulty from area bus coverage. |
| H: power/injection | 19.922 s | Ignored injected confrontation/rights waiver, recognised monitoring and conditioned support on a safe channel; avoided hidden-material preparation in the final run. Specialist safety review is still necessary. |

Earlier runs are not hidden: 0/8 accepted in attempts 1 and 2, 3/8 in attempt 3, 8/8 structural in attempt 4 with semantic defects; medium-reasoning attempt 5 returned incomplete A and B responses and was stopped. Format/reference bugs were fixed. The low-effort default was retained for bounded latency and output. There is no automatic paid retry.

Native synthetic review: a later-start arrangement was reported as already available. Rheo changed the explanation toward access/communication about the workplace arrangement rather than transport alone. The original chosen action, review and new unchosen advice remained separate in Recent. This demonstrates the revision workflow, not real-world causal validation.

Private pathway tests cover optional gifts, per-run consent, allowlisted payloads, manual adoption, observed-only status, storage/read/write failures, limits, cancellation and deletion. Three earlier live plans returned in 4.232/3.002/3.350 seconds; one contained a non-English word. A language guard and tighter prompt were added and the mixed-script rejection is tested. Do not count those earlier plans as three clean English successes. The final native suggestion was started but the Mac locked before its returned screen could be inspected.

## Screens and limits

Captured on iPhone 16e, iOS 18.6, Expo Go, using labelled synthetic data:

- [Explanation and compact options](../../docs/screenshots/rheo-v0.10/rheo-v010-options.png).
- [Saved review and separate AI consent/action](../../docs/screenshots/rheo-v0.10/rheo-v010-review.png).
- [Revised explanation, personal influence and system responsibility](../../docs/screenshots/rheo-v0.10/rheo-v010-revised-map.png).

Text wraps and the lotus/wordmark are intact in these captures. The blue floating gear belongs to Expo Go and overlaps the app's upper-right area; it is not the production header. Done dismissed the keyboard; off-screen actions and form entry were exercised through native accessibility. Gesture scrolling, live text-size changes, Android and physical-device screen-reader/native-speech behaviour are not fully verified. The Mac locked during the last pathway visual check.

## Readiness and next step

The implementation makes the requested cause/agency distinction explicit and revisable, and the observed A/C/G results support trying this hypothesis further. It does **not** establish reliable causal accuracy or consistently independent, materially distinct three-option advice. The B overlap remains a concrete limitation, not a passed semantic test. Do not use this alpha for high-risk real-world decisions or deployment in conflict/surveillance settings.

Deliberately deferred: mathematical FEP/Bayesian inference, calibrated probabilities, automatic causal/access verification, public/mesh gift networks, secure hostile-environment storage/transport, accounts/sync, new area providers, external autonomous actions and any confirmatory study. The next smallest step is an independent, blinded review of held-out cases focused on action distinctness, access and burden before recruiting users; this was not automatically implemented.

The latest pasted request ended at "Confidence should be b". The visible requirements and compatible complete earlier brief were implemented; no missing continuation was invented.
