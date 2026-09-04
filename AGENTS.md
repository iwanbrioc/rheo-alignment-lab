# AGENTS.md — Rheo product engineering guardrails

These instructions apply to Codex and other coding agents working in this repository.

## Current product work

For the current mobile alpha, work only on branch `mobile-rheo-alpha-v0.2` unless the human explicitly says otherwise.

The mobile product lives primarily under `mobile/` and product-specific documentation under `docs/`.

## Research immutability

The benchmark programme is evidence, not product scratch space.

Do **not** edit, regenerate, reformat or move any frozen research material as part of mobile work, including:

- `evaluation/**`
- frozen benchmark branches, especially `v1.1-rheocratic-transition-freeze`
- benchmark prompts or schemas under `prompts/` or `schemas/`
- model-run outputs, blinding keys, blinded reviews or result records

Existing Rheo server code may be called by the mobile app, but product work must not silently alter frozen experimental behaviour. If a product requirement would require changing the decision engine, stop and isolate that change behind a new product-specific module or endpoint.

## Product principles

Rheo is a decision companion, not an authority. Preserve these invariants:

1. **Human choice remains explicit.** Advice may reveal options and pathways; the user chooses what to do.
2. **Immediate competence first.** Do not sacrifice urgent safety, legality, deadlines, affordability or live options for speculative transition value.
3. **A pathway must be real.** A nearby or alternative-looking option is evidence to test, not proof of quality, accessibility or reciprocal value.
4. **No romantic localism.** Local, cooperative, community or voluntary provision is not automatically preferable.
5. **Burden is visible.** Do not hide unpaid labour, maintenance, coordination, risk or subsidy.
6. **Prefer traversable increments.** Product language should favour small actions that can be tried, observed and revised.
7. **Do not expose research ontology unnecessarily.** User-facing language should stay ordinary and practical unless an explanation view explicitly calls for theory.

## Location and privacy

Location is sensitive context and must remain optional.

- Foreground location only for the current alpha.
- No background tracking, geofencing or movement history.
- Never make location permission a prerequisite for using Rheo.
- Reduce precision on-device before sending location to any server.
- Do not send raw coordinates into the core Rheo decision record.
- Local-search responses must include provenance and retrieval time where available.
- Do not fabricate local places or service availability.
- Do not infer that a returned listing is open, accessible, affordable or suitable unless the source actually supports that.
- Do not place API keys or secrets in `EXPO_PUBLIC_*` variables or committed files.

## Research readiness in the product

Architect the alpha so a future consented field study can compare decision engines, but do **not** silently randomise ordinary users.

Keep an internal nullable field such as `researchArm` or equivalent so future study allocation can be added without redesigning the data model. It must default to `null` in ordinary product use.

Keep recommendation snapshots and subsequent user choice separable so future research can distinguish:

`context → recommendation → user choice → actual action → outcome`

## Engineering discipline

Before considering a task complete:

- run `cd mobile && npm run typecheck`;
- run `cd mobile && npm run smoke:local`;
- run `cd mobile && npm run doctor` when dependencies or Expo configuration change;
- preserve the existing no-fake-data fixture behaviour;
- add or update tests/smokes for new pure logic;
- keep error states explicit and recoverable;
- avoid unnecessary dependencies;
- prefer small typed modules over growing `App.tsx` indefinitely.

If a requested change conflicts with these guardrails, do not work around them silently. Explain the conflict in the task summary and implement the safest reversible version.