# Rheo v0.4 — The Living Map (digital proof of concept)

Status: **fictional sandbox**. This is a public, explanatory experience; it is NOT a real community map, navigation application, verified social network, trained curator directory, financial product or BLE relay.

## Open the demonstration

Serve the repository root on localhost or HTTPS:
\`\`\`sh
python3 -m http.server 8080
\`\`\`
Visit \`http://localhost:8080/app/\`. No build, accounts, backend, paid services, external maps, analytics, currency or radio connection are required for the v0.4 experience. All demonstration state is in memory; reload or **Reset** discards it.

The preceding signed-record field prototype remains at \`/app/legacy.html\`. The frozen guide and evaluation remain in \`/app/guide/\`, \`/evaluation/\` and \`/research/\`. No research changes have been made.

## Five demonstrable interfaces

1. **Living Map**: two overlaid fictional infrastructures in a schematic, imaginary Welsh town: conventional grey streets and branching foot/cycle threads. Pick a luminous portal to examine the invitation, needs, care and fictional steward. Imagine participation in connected portals to expose possibilities that require both. Toggle layers and dormant status. **The geometry is invented**: not OSM, not verified walking/cycling routes, not directions.
2. **Time / Space**: an Open Space Technology-style matrix with self-curated gatherings. Users can propose activities, choose or withdraw from them, see overlapping commitments, and leave unscheduled space. A 15-minute inter-portal buffer is only a scenario warning, **not a travel-time estimate**.
3. **Curator's Studio**: two pathways drawn from the *Undoing Agency 2025–2030* prospectus (CTOS; Sensory Labyrinth Theatre/parallel infrastructure) plus local readiness. These are checkboxes only in the simulation: **not real qualifications**. Anyone may propose and attend within the demo. A proposed portal exists only in the current ephemeral sandbox.
4. **Offline Mesh**: three fictional devices store different synthetic shared records. A user triggers in-memory, signedness-*agnostic* store-and-forward exchanges, and can see records spread through encounters. It is **not** a Bluetooth, encrypted, radio, verified identity or packet-protocol implementation. Real sharing still belongs to the previous v0.3 signed-record field prototype, which has a Web Bluetooth bridge requiring external peripheral hardware.
5. **Tithe Pot**: fictional 10% donations calculated on an explicitly *post-tax* net-realised-gains input, reserve, basic income for hypothetical curators, independent local support and overhead. It demonstrates central-funding taper **only when replacement support is sufficient**, as well as insolvency warnings. There are no wallets, tokens, transfers, payments, returns, tax calculators, donors or persistent balances.

## Guiding rules

- The map is an invitation, not the territory. The places, paths, stewards and activities are imaginary and should never be represented as real services.
- A portal is a threshold to participation, not merely a commercial listing or object to acquire.
- No person is scored for worth, generosity, engagement or consciousness. No Self is an unscored lens.
- Essential care is never gated by an endorsement, exchange, tithe or certification.
- The Tithe Pot is **not** a coin. No financial right in the living commons is issued by contribution.
- The two curator pathways are necessary but not sufficient for real-world facilitation; community legitimacy, safeguarding and consent require separate processes.
- Nothing here validates ecological or social impact, increased collective intelligence, or changes in consciousness.

## Development and tests

\`\`\`sh
npm run check
npm test
python3 scripts/smoke_public_site.py
\`\`\`

The deterministic sandbox engine is in \`app/living-engine.mjs\`, fictional data in \`app/living-data.mjs\`, the interface in \`app/living-ui.mjs\` and \`app/living.css\`, and its unit tests in \`app/tests/living-engine.test.mjs\`.

The historical signed-record tests remain in \`app/tests/mesh-engine.test.mjs\`. The old browser QA is still available using \`node scripts/test_mesh_browser.cjs\` with an existing Playwright/Chromium installation. It now targets \`/app/legacy.html\`.

## What must happen before an analogue pilot

Consult local stakeholders, assess participant safety, physical accessibility, permissions, real rights of way and data governance, and decide how curators can be accountable without becoming gatekeepers. Any Kyiv or other conflict-affected pilot also needs threat modelling for location disclosure, coercion, device compromise and intercepted messages. Native offline relaying needs peer discovery, cryptographic provenance, explicit consent, battery/lifecycle analysis and hardware tests before any claim of field readiness.

## Economic and UK legal caution

A covenant **does not automatically avoid tax**. HMRC states that deeds of covenant have no standalone tax relief, although individual cash payments under one may qualify for Gift Aid to an eligible charity if the normal conditions are met. Genuine gifts of cryptoassets directly to qualifying charities can in many cases receive Capital Gains Tax treatment favourable to disposal followed by a cash donation; cryptoasset gifts are not eligible for Gift Aid. A charity and its payments to curators require appropriate governance and legal advice. Relevant primary guidance:

- https://www.gov.uk/government/publications/charities-detailed-guidance-notes/chapter-3-gift-aid
- https://www.gov.uk/hmrc-internal-manuals/cryptoassets-manual/crypto22100

The hypothetical numbers in the Pot simulator are neither fundraising claims nor legal advice.

## Next version

A later release may replace the schematic with properly licensed, **verified** road, foot and cycle route data (prepackaged for offline use); add annotated provenance for portals and secure, consent-based sharing; then only with community partnership begin testing whether the analogue infrastructure creates genuinely accessible possibilities. Real financial operations are not part of v0.4.
