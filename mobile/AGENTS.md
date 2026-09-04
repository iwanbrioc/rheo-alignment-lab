# mobile/AGENTS.md — Rheo Alpha v0.2

This file extends the root `AGENTS.md` for work under `mobile/`.

## Product goal for v0.2

Turn the existing geolocation proof-of-concept into a coherent alpha that can support real user decisions and later outcome/pathway research.

The alpha should make this loop legible:

`predicament → optional local context → three ways forward → explicit user choice → saved decision session`

Do not build background tracking or a community map in this milestone.

## User-facing information architecture

The primary experience should be simple and ordinary-language first.

### 1. Decision input

Lead with a single clear question such as:

**What are you trying to work out?**

Allow multiline text. Keep location optional.

### 2. Local context

When location may matter, offer an explicit action such as **Look around me** or **Use my area**.

Local results are labelled **possibilities to check**, never endorsements.

The user must be able to remove location/context and continue.

### 3. Rheo result

Present the three action types in user-facing language:

- `smallest_release` → **Do the smallest useful thing**
- `learning_action` → **Find something out**
- `generative_action` → **Open a pathway**

Do not expose internal ontology names on the main surface.

Each card should make the action, reason and stop/change signal readable without excessive text.

### 4. Choice capture

After the recommendation, ask explicitly:

**What will you actually do?**

The user can:

- select one recommended action;
- choose **Something else** and write their own action;
- choose **Not yet**.

Choice capture must not mutate the recommendation snapshot.

## State/data model

Create typed product models rather than leaving session state as unrelated component variables.

At minimum model a `DecisionSession` with equivalent fields for:

- `id`
- `createdAt`
- `updatedAt`
- original `situation`
- optional `areaLabel`
- whether location was explicitly used
- optional local-context snapshot including `provider`, `retrievedAt`, `warnings` and candidate provenance
- recommendation snapshot including all three actions and the flow/result metadata needed for audit
- `chosenActionId` or explicit custom/not-yet choice
- optional custom choice text
- `researchArm: null` by default

Do not store raw coordinates in the saved decision session.

## Persistence

For v0.2, persistence may be local-only and minimal.

If adding local persistence, prefer a standard Expo-compatible storage library and isolate it behind `src/storage/`.

Do not claim data is encrypted unless it actually is. If decision text is persisted, make that behaviour visible in the product copy or README and provide a clear way to delete saved sessions.

Do not implement cloud accounts, analytics SDKs or remote telemetry in this milestone.

## Architecture

Refactor away from a monolithic `App.tsx` where useful. Prefer:

- `src/types/`
- `src/components/`
- `src/screens/` or a small equivalent view layer
- `src/services/` for Rheo/local-context clients
- `src/storage/`
- `src/utils/`

Do not introduce a navigation framework unless it materially simplifies the milestone. A small explicit screen-state machine is acceptable for the alpha.

## Local evidence contract

Every local candidate shown to the user should preserve, where supplied:

- source/provider
- source URL
- retrieval time
- address/area
- distance estimate
- why it may be relevant
- uncertainty/warnings

Never translate proximity into endorsement.

## Visual direction

Aim for calm, spacious, contemporary and non-corporate. The existing warm neutral palette can evolve, but avoid gamification, dashboards and moral scoring.

The interface should make **choice and possibility** feel more prominent than evaluation or judgement.

Accessibility requirements:

- semantic button/link roles;
- readable text sizes and contrast;
- visible disabled/loading/error states;
- screen-reader labels for inputs, location status and dynamic results;
- no colour-only meaning.

## Definition of done for this milestone

The alpha is ready for human testing when a user can:

1. open the app without granting location;
2. enter a predicament;
3. optionally use approximate foreground location;
4. retrieve local possibilities without fake results;
5. ask Rheo and receive three clearly differentiated action cards;
6. explicitly choose a recommended action, enter another action or choose not yet;
7. see a concise confirmation of what they chose;
8. revisit/delete the current or saved decision if local persistence is implemented;
9. complete the flow despite location denial, zero local results or local-service failure;
10. pass typecheck and existing local-context smoke tests.
