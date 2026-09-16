# Private pathways in the experimental mobile alpha

This implements the earlier request for RWB/gift-oriented pathways as a private notebook, not a community map. It is separate from the v0.10 reasoning experiment and frozen research.

## Interaction

**My pathways** opens a local list. A person can write a need, optionally a gift, possible enabling resources and limits. A gift is never required to receive help, earn credit, repay another person or demonstrate worth. **Explore a pathway** copies the current question/chosen step into an editable unsaved draft, not an automatic commitment.

Three tabs keep the work manageable: Possibility, Next step and Check-in. A manual next step works without internet. AI suggestions require a per-run switch and explicit tap; edits revoke consent. Only the four reviewed fields are sent. A returned possibility is not a verified service or action already taken. **Use this step** is separate. A check-in records what happened, how it felt, work/risk shifted and what remains possible. Only a personal check-in can move the status beyond Idea; the model cannot mark success.

The suggestion prompt applies the canonical reciprocal relationships where relevant, immediate competence, optional giving, practical access, consent, refusal/exit, care before expansion and regeneration. It does not assume that local/cooperative/voluntary provision is better, or that the person must repair a system. Gift is not barter or a contribution score. This is a product interpretation informed by [Eisenstein's transition-to-gift discussion](https://sacred-economics.com/sacred-economics-chapter-16-transition-to-gift-economy/), not an empirical claim that the design creates a gift economy.

## Modules

- `mobile/pathway_contract.mjs` / `.d.mts`: bounded allowlisted input, explicit consent and six-field suggestion contract.
- `mobile/pathway_planner.mjs`: no-tool Responses request and bounded HTTP handler.
- `mobile/src/types/pathway.ts`, `utils/pathway.ts`, `storage/pathways.ts`: typed, allowlisted, ordered local records and personal check-ins.
- `mobile/src/services/pathwayApi.ts`, `screens/PathwaysScreen.tsx`, `components/PathwayFields.tsx`: explicit requests, manual adoption, local editing, retry/cancel/delete.
- `mobile/smoke_pathways.mjs`, `smoke_pathway_ui.mjs`: pure logic, storage/HTTP/provider boundaries and UI lifecycle tests.

## Enable

Use the existing local-context server. Set `RHEO_PATHWAY_PROVIDER=openai` (or the existing helper setting `RHEO_AGENT_PROVIDER=openai`) and server-only `OPENAI_API_KEY`. `POST /api/pathway-plan` and `GET /api/pathway-plan/health` are product-only routes. Model default is `gpt-5.4-mini`; fixture mode refuses to invent a plan. The app uses `EXPO_PUBLIC_LOCAL_CONTEXT_API_URL`.

Limits: four 1500-character fields; 30 KB HTTP body; bounded upload/run timeouts; two concurrent requests and twenty starts/hour; no tools or external actions; no automatic retry. Browser-origin requests are rejected. The server has no authentication: trusted LAN only, never public internet.

## Privacy and failure handling

Separate AsyncStorage key `@rheo/private-pathways/v1`, maximum 50 pathways and 30 check-ins each. Limits refuse extra records instead of silently evicting them. Storage is **not encrypted**. Read failure/corruption blocks writes until recovery; a failed write leaves editable work available for retry. Back/Android Back asks before discarding unsaved work. Delete is confirmed. Deleting a decision does not delete a separately saved pathway and vice versa.

No automatic GPS, contacts, history, private check-ins, public sharing or person graph is sent to the suggestion endpoint. Free text can still contain identifying details; users should omit them. Responses uses `store:false`, not a guarantee of zero provider retention. Server code does not log/persist inputs or results. Stop/background/leave aborts and ignores late results, but cannot retract already sent data. No new dependency is needed for pathways.

This is not secure infrastructure for people facing surveillance or persecution. Mesh networking, public discovery, encrypted storage, trust/group governance, shared maintenance and evidence of community outcomes are deliberately deferred.
