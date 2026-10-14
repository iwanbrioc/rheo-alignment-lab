# Rheo v0.3 — pathways to thrive

A local-first field prototype built from the existing Rheo Alignment Lab browser
app. The main interface is a situated affordance map; the v0.2 questionnaire is
preserved at `app/guide/`. No AI is used to generate, rank or validate pathways.

## Try it

From the repository root:

```sh
python3 -m http.server 8080
```

Open `http://localhost:8080/app/`. Use HTTPS for deployment; Web Crypto,
geolocation, service workers and Bluetooth require a secure context (localhost
is suitable for local development). The app has no package installation or build
step. `npm test` and `npm run check` require Node 20 or later.

The first view is an empty personal map. Choose **Explore an illustrative map**
for six explicitly fictional opportunities near Llandysul, Wales. Demo records
are not persisted, exported, endorsed, or presented as real services.

1. Add a possibility, its location, steward, access conditions, sustaining care,
   capacity, expiry and meaning. Private is the default.
2. Open it to inspect the next conditions for participation. Availability is an
   invitation, not a reservation or a guarantee.
3. Record an experience or an availability/care/skill claim. A claim attaches to
   one revision, identifies the device that signed it, and expires.
4. If you know an author, compare their full fingerprint through an established
   trusted channel and record your own trust in that opportunity and context.
   This relationship stays private; it creates no universal reputation.
5. Export shared records, transfer the JSON file directly and import it on another
   device. Return updated packets to exchange observations and withdrawals.
6. The application and local records work after an offline reload once its
   service worker has finished installing. Browser storage remains subject to
   eviction; a shared export does not back up private records or signing keys.

## What is implemented

- Offline GPS coordinate plotting, category and text filters, straight-line
  distance using an explicitly requested location. No remote map tiles or tracking.
- Six pathways spanning essentials, belonging, learning, creativity, nature and
  purpose. Maslow is not a forced sequence; purpose and contribution do not depend
  on reaching a particular economic status.
- Seven RWB horizons as unscored lenses. No Self is neither a KPI nor a multiplier.
- Deterministic rules for expiry, offered capacity, consent, enabling conditions,
  dependency chains, adverse observations and concurrent revision conflicts.
- ECDSA P-256 signed records and device fingerprints. The non-exportable signing
  key and map are held in IndexedDB; a relationship list is private to the device.
- Append-only opportunity revisions, signed contextual claims, participation
  observations and author-owned withdrawals.
- Atomic, bounded, fully verified packet imports. Duplicate packets are harmless.
  Different content under the same event ID rejects the whole import.
- Browser-tab coordination and persistent identity; concurrent edits are displayed
  as conflicts instead of silently selecting the latest clock timestamp.
- A Web Bluetooth GATT central adapter with bounded UTF-8 framing and backpressure.
  It connects to a compatible external peripheral, rather than claiming to be a
  background phone-to-phone mesh.

The core is platform-independent JavaScript (`mesh-engine.mjs`). IndexedDB, UI,
portable packets and BLE transport are separate modules. Native clients can reuse
this protocol and should preserve its consent and provenance behavior.

## Rules and evidence

An opportunity is **Available to approach**, **Confirm first**, or **Needs renewal
or repair**. These categories are explanations of the supplied record, not a
claim of independently verified safety or sustainability.

An open essentials pathway requires no accumulated trust or repayment. A steward
may set real access conditions; no endorsement overrides them. Dependencies must
exist and be actionable. Unresolved enabling conditions and current concerns
require confirmation. Expired, paused, empty, conflicting or cyclic dependencies
block a pathway. Dependency depth is bounded at 64 to prevent pathological inputs.

Ordering is availability, then straight-line distance when location is supplied,
then title. There is no aggregate person, wellbeing, engagement or profit score.
Care and ecological constraints are supplied by people; the algorithm does not
certify their adequacy. Acknowledging conditions is not evidence they have been met.

A device signature verifies the origin and integrity of a record. It does not
verify a real-world identity, truth, independence, competence, entitlement to a
resource, or ecological impact. Multiple device keys can belong to one person;
there is no claim of Sybil resistance. Personal trust is explicit, opportunity-
specific, context-specific and time-limited. It never propagates transitively.

## Replication and conflict behavior

The signed event envelope contains `v`, `id`, `actor`, `key`, `at`, `kind`, `body`
and `signature`. Signature input is the UTF-8 canonical JSON of all fields except
`signature`; object keys sort by code unit, arrays preserve order. A creation
record's event ID is its `recordId`. Revisions reference parent event IDs and can
only originate from that record's creator, with unchanged sharing scope.

Local replicas keep an append-only event set. Import verifies all events before
an IndexedDB transaction merges them. IDs deduplicate events; unequal values for
one ID reject the batch. Limits: 4,000 events, 2 MB exchange packets, 18,000
characters per event, and 20 parents/dependencies per opportunity. Limits are
engineering bounds rather than democratic inclusion rules.

Revision heads form a DAG. An update with missing ancestors remains pending until
ancestors arrive. Multiple heads remain an explicit conflict; the steward resolves
it by creating a revision referencing all heads. Display chooses a deterministic
head for inspection, but blocked conflict status prevents calling it actionable.
Old claims remain in the history and do not corroborate a later revision.
Withdrawals only affect the author's own claim; third-party withdrawals are ignored.
The wiki is open to new invitations, observations and concerns; another device
cannot silently rewrite a steward's commitments.

Shared packets exclude private records, local trust relationships and secret
keys. They include relevant signed withdrawals. Sharing is irrevocable in the
sense that already-distributed copies cannot be erased remotely. Updated expiry,
pause or withdrawal information reaches peers only when they reconnect. Shared
packets are authenticated, not encrypted: use a secure direct transfer when needed.

## GATT bridge contract

See [MESH_TRANSPORT.md](MESH_TRANSPORT.md). A compatible peripheral is required;
none is simulated as connected in the UI. Ordinary phones running only this PWA
do not become advertising relays. End-to-end BLE hardware verification remains
outstanding. Background native operation, OS restrictions, radio range, battery
budgets, reconnect recovery and platform interoperability require a hardware phase.

GPS coordinates are canonical. what3words is an optional human-supplied label,
not automatically resolved. This avoids making offline navigation depend on an
external API. The map contains points and a coordinate grid, not street geography,
terrain, hazards or verified walking directions.

## Validation

- 19 core tests cover tampering, identity binding, privacy, consent, expiry,
  contextual trust, merge convergence, conflict resolution, dependency bounds,
  revision provenance, withdrawal ownership and BLE framing/backpressure.
- Browser integration QA covers desktop/mobile layout, creating private/shared
  invitations, persistent and cross-tab identity, two-profile exchange, contextual
  trust, revision changes, tamper rejection, offline reload and the preserved guide.
- Existing public brand/site smoke checks and the frozen evaluation harness remain
  in place. These tests do not validate social or ecological effectiveness.

Browser QA can run against a served app with an existing Playwright installation:

```sh
RHEO_PLAYWRIGHT=/absolute/path/to/playwright node scripts/test_mesh_browser.cjs
```

## Next hardware and community validation

Build native Android/iOS relays implementing the packet protocol, with bounded
store-and-forward delivery, peer permission, resumable transfer, resource budgets
and explicit acknowledgements. Test with three real devices through disconnection,
app suspension, identity loss and conflicting edits. Then work with a community
to assess accessibility, ecological constraints, who can steward a record, repair
of trust, newcomers' access and the meanings of thriving in that place.
