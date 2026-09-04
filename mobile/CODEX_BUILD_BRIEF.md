# Codex Build Brief — Rheo Alpha v0.2

## Mission

Turn the existing Rheo mobile geolocation prototype into the first coherent human-testable alpha.

This is a productisation milestone, not a rewrite of the Rheocratic research engine.

The alpha should feel like a calm decision companion whose distinctive behaviour is:

1. understand the predicament;
2. optionally notice relevant nearby affordances;
3. offer three practical ways forward;
4. leave the choice with the user;
5. preserve the decision/recommendation/choice record locally so later outcome work can build on it.

Read and obey both `/AGENTS.md` and `/mobile/AGENTS.md` before changing code.

## Starting point

The branch already contains:

- Expo / React Native mobile app under `mobile/`;
- foreground geolocation via `expo-location`;
- on-device reduction to approximate location before server lookup;
- local-context service with safe fixture mode and optional Nominatim prototype;
- existing Rheo API integration;
- CI that runs local-context fixture smoke and TypeScript checks;
- no background tracking;
- no map;
- no user accounts.

Preserve working behaviour while restructuring it.

## Product milestone

Implement this flow:

### Screen/state 1 — Ask

Primary prompt:

**What are you trying to work out?**

Requirements:

- multiline predicament input;
- location is visibly optional;
- app is fully usable when location permission is denied;
- a short explanation near location control: local context can reveal nearby possibilities but is not required;
- primary CTA progresses to advice;
- if local context has already been fetched, advice uses that snapshot.

### Screen/state 2 — Local possibilities

Do not force this as a separate screen if a better interaction is obvious, but preserve the conceptual distinction.

User action should be phrased naturally, preferably **Look around me**.

Show:

- approximate area label, never raw coordinates;
- local candidates as **possibilities to check**, not recommendations;
- candidate provenance/source link where available;
- retrieval time;
- distance/address where available;
- warnings/uncertainty;
- clear remove/continue-without-location action.

Zero results and provider failure must not block asking Rheo.

### Screen/state 3 — Three ways forward

Present the existing three action kinds using these labels:

1. **Do the smallest useful thing** — `smallest_release`
2. **Find something out** — `learning_action`
3. **Open a pathway** — `generative_action`

Each card should emphasise:

- title;
- concrete action;
- why it may help;
- concise **Reconsider if…** stop/change signal.

The cards should be visually differentiated by hierarchy/layout, not moral score or colour coding.

Do not label the third card “better”, “sustainable”, “Rheocratic” or equivalent.

### Screen/state 4 — Human choice

After showing advice, ask:

**What will you actually do?**

Options:

- select one of the three recommendations;
- **Something else** → enter custom text;
- **Not yet**.

Important invariant: selecting or editing the user's choice must **not** mutate the recommendation snapshot.

### Screen/state 5 — Confirmation

Show a restrained summary:

- predicament;
- area used, if any;
- chosen action/custom/not-yet state;
- option to return to the recommendation;
- option to start another decision;
- option to delete the saved decision.

No social sharing, score, badge or celebratory gamification.

## Data model

Create typed models for the product session. Equivalent naming is acceptable, but the saved record must support this conceptual schema:

```ts
type DecisionSession = {
  id: string;
  createdAt: string;
  updatedAt: string;
  situation: string;
  locationUsed: boolean;
  areaLabel: string | null;
  localContext: LocalContextSnapshot | null;
  recommendation: RecommendationSnapshot | null;
  choice: DecisionChoice | null;
  researchArm: null | 'neutral_base' | 'neutral_transition' | 'rheocratic_transition';
};
```

`researchArm` must remain `null` in ordinary alpha use. Do not add randomisation.

The local-context snapshot should preserve provider, retrieval time, warnings and candidate provenance, but **must not persist latitude/longitude**.

The recommendation snapshot must preserve exactly what was shown to the user.

Choice must be represented separately from recommendation.

Use cryptographically strong/random UUID generation if an existing Expo-compatible approach is available without introducing a heavy dependency; otherwise use an adequately collision-resistant local ID helper. Do not use timestamps alone as identifiers.

## Persistence

Add local session persistence for this milestone.

Preferred implementation:

- `@react-native-async-storage/async-storage` or a comparably standard Expo-compatible library;
- isolated behind `src/storage/decisionSessions.ts` or equivalent;
- no remote analytics or cloud sync;
- no raw location coordinates stored;
- include `list`, `get/upsert`, and `delete` operations;
- gracefully handle corrupt or unavailable local storage.

Because AsyncStorage is not an encrypted vault, update the mobile README to say plainly that alpha decision history is stored locally on the device and should not be treated as encrypted sensitive storage.

Add a simple **Recent decisions** entry point if it can be done without bloating the app. It can list situation snippet + date + choice state. Keep it secondary to starting a new decision.

## Refactor expectations

`App.tsx` is currently doing too much. Refactor into typed modules while keeping architecture proportionate.

Suggested shape:

```text
mobile/
  App.tsx
  src/
    components/
      ActionCard.tsx
      LocalCandidateCard.tsx
      ...
    screens/
      AskScreen.tsx
      AdviceScreen.tsx
      ChoiceScreen.tsx
      ConfirmationScreen.tsx
      RecentDecisionsScreen.tsx   # if implemented
    services/
      rheoApi.ts
      localContextApi.ts
    storage/
      decisionSessions.ts
    types/
      decision.ts
      localContext.ts
    utils/
      ...
```

This is guidance, not a requirement. Do not add a navigation framework solely to match the directory names. A typed reducer/state machine in `App.tsx` or a small controller is fine.

## Local-context API contract improvements

Preserve current safe fixture behaviour.

Ensure the mobile client can display/store a server-supplied `retrievedAt` timestamp. If the server does not yet return one, add it to the local-context response.

For each candidate preserve:

- `id`
- `name`
- `category`
- `distanceM`
- `address`
- `source`
- `sourceUrl`
- `whyRelevant`

Coordinates may be used transiently for search/distance but must not be placed in the saved `DecisionSession`.

## UX and visual direction

Use the current warm-neutral visual language as a starting point, but substantially improve composition and hierarchy.

Aim for:

- calm;
- spacious;
- tactile but not skeuomorphic;
- contemporary;
- quietly optimistic;
- non-corporate;
- no moralising sustainability aesthetic;
- no dashboards or scores.

Use typography/spacing/cards intentionally. Ensure content remains usable on smaller phones and with dynamic text where practical.

Keep user-facing copy concise. The underlying decision machinery may be complex; the interface should not feel complex.

## Accessibility

At minimum:

- semantic roles for buttons and links;
- accessibility labels for predicament input, location status, loading status and recommendation selection;
- accessible live-region/status messaging for asynchronous operations;
- no colour-only state;
- reasonable touch targets;
- readable contrast;
- disabled buttons visibly and semantically disabled.

## Error and edge states to implement

Test these deliberately:

1. location permission denied;
2. location lookup unavailable;
3. local-context provider returns zero candidates;
4. local-context provider fails;
5. Rheo request fails;
6. local storage read/write fails;
7. user changes predicament after fetching local context — stale local context must be cleared or explicitly marked stale;
8. user changes predicament after receiving advice — stale advice/choice must be cleared;
9. user chooses Something else but leaves it blank;
10. user deletes a saved session.

## Tests and CI

Do not stop after making the UI compile.

Required before completion:

```bash
cd mobile
npm run typecheck
npm run smoke:local
npm run doctor
```

Update CI if dependency or script changes require it.

Add lightweight tests for pure logic/data handling where practical. Avoid pulling in a large testing stack solely for this milestone. A focused `node:test` smoke or small validation script is acceptable.

At minimum verify programmatically that:

- persisted sessions contain no raw latitude/longitude fields;
- a recommendation snapshot remains unchanged when a user choice is recorded;
- stale recommendation/choice data is cleared when the situation changes;
- fixture local-context mode still returns no fabricated candidates.

## Out of scope for v0.2

Do **not** implement yet:

- background location;
- geofencing;
- movement history;
- public/community pathway map;
- user accounts;
- cloud sync;
- push notifications;
- public ratings/reviews;
- crowdsourced pathway evidence;
- critical-mass scoring;
- RWB scores;
- automatic A/B assignment;
- changes to frozen benchmark prompts or results.

## Completion report

When finished, report:

1. what changed;
2. files/modules added or materially refactored;
3. any new dependency and why it was needed;
4. privacy/data-storage implications;
5. commands/tests run and exact results;
6. known limitations;
7. screenshots or a concise description of each screen/state if screenshots cannot be produced;
8. the next smallest product step you recommend, without implementing it automatically.

Do not merge to another branch automatically. Leave the work reviewable on `mobile-rheo-alpha-v0.2`.