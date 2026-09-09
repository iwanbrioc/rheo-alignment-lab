# Mobile preparation and simple English

This is a product-only extension on `mobile-rheo-alpha-v0.2`. It does not change
the frozen v0.9 engine, prompts, schemas, evaluation records or research allocation.

## Boundaries

- `preparation_contract.mjs` validates explicit `research-and-draft-v1` consent,
  a bounded reviewed brief, result fields and citations to actual search source IDs.
- `preparation_agent.mjs` owns public web research and one no-tool drafting call.
  No connector or tool can send, submit, book or buy. Source URLs come from actual
  search metadata, not model-authored URLs. Citations are evidence, not proof that
  every claim is correct. Unsafe/private URLs are excluded.
- `plain_language_contract.mjs` holds the shared simple-English instruction and
  validates the displayed action fields. `plain_language.mjs` only rewords options;
  it cannot change the engine or execute actions. Original actions are preserved.
- `openai_response.mjs` bounds provider response reading. Both modules request
  `store: false`; no promise of zero provider retention is made.
- `local_context_server.mjs` routes the new endpoints alongside unchanged location
  and voice handlers. Each endpoint has body, time and concurrency bounds and rejects
  browser-origin requests. There is no public authentication in this LAN alpha.

## Decision record

`RecommendationSnapshot.actions` remains the exact displayed set. `originalActions`
keeps the engine output before rewording; `language` records the wording status/model.
Old snapshots without either field remain readable. Fixture outputs bypass rewriting.
When rewriting fails, advice remains available with a visible original-wording notice.

`DecisionSession.preparations` is optional and separate from recommendation/choice.
Each attempt records a random ID, exact reviewed text, consent version/time, selected
step, choice binding, timestamps, status, result or error. It does not record an actual
action or outcome as complete. The binding prevents a late result attaching to a
different choice. Research allocation remains `null` in ordinary use.

The existing twenty-session local limit remains; each session has up to ten attempts.
Storage writes are serialized. `savePreparationTask` updates only an existing matching
choice, so a deleted decision cannot be recreated by a late result. Read/parse errors
fail closed rather than replacing history with an empty list. Deletion removes that
decision's local preparation records, not any already-shared provider data.

## Lifecycle

1. A human saves a recommended or custom choice. This does not start an agent.
2. `PreparationScreen` shows editable instructions and a separate approval button.
3. `PreparationSession` saves the approval locally before making a request.
4. It displays research progress and offers cancellation. App backgrounding or
   leaving aborts the request; an epoch guard discards late results.
5. Findings, one unsent draft, remaining human steps and uncertainty are saved.
   Result-save retries do not repeat research. Reopened running records are shown
   as interrupted; starting again always requires approval.

Only the reviewed text goes to preparation. There are no raw coordinates, hidden
session context, background services, new permissions, scores, accounts or analytics.

## Checks

`npm run smoke:local` includes `smoke_preparation.mjs`: shared validators, no automatic
execution, approval-before-network, double taps, cancellation races, save failures,
interrupted recovery, deleted/stale choices, serialized storage, source validation,
no-source results, bounded read-only tools, server limits, deduplication, plain-English
prompts, preserved action IDs/numbers/links, fixture isolation, original-wording fallback,
client payload minimization and the review screen's approval/keyboard wiring.

Mocks test mechanics, not factual quality or actual reading level. Also test the
real flow on a device with non-private, clearly labelled test data. Check source
support, draft honesty, simple wording, scroll/keyboard behavior and saved-history
reopening. Sending/submitting and unattended/background work remain out of scope.
