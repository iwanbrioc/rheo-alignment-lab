# Rheo data mesh — embedded iPhone pilot

This implements the user's request to make Bluetooth a carrier for the mycelium
itself rather than a chat/share-sheet workflow. It supersedes the older mobile
milestone's restriction on community maps. It does not change frozen research.

## How to use

Build the existing Expo project from `mobile-rheo-alpha-v0.2`, base directory
`mobile`, iOS profile `preview`. Native source is under `mobile/modules/rheo-mesh`;
Expo autolinking resolves `RheoMeshModule` without a separate app or server.
Expo Go and old binaries cannot run this radio. Android currently retains local
storage, offline geographic view and file exchange; its embedded radio is not
implemented. A new signed binary and multi-device testing are required.

1. Create real portals and mark only records you intend to make public shareable.
2. Open **Mesh & data → Join nearby mesh** and confirm the disclosure.
3. Allow Bluetooth and, optionally, local-network access. Keep Rheo open on both
   phones. Local network denial does not disable the separate Bluetooth path.
4. Shared real portals, coordinates, connections and activities are sent without
   manually composing, copying or opening messages. My Path, private portals,
   transient GPS fixes, private dependent records and fictional samples are excluded.
5. Nearby received records merge into the local map as unverified/private copies.
   The original public record is retained separately for onward carriage; its
   relay does not turn a received portal into a locally endorsed/shared portal.
6. **Geographic map** opens a tile-independent coordinate schematic, usable with
   all internet connectivity absent. Detailed online Apple Maps is opt-in.
7. Stop nearby sharing whenever desired. **Stop and clear retained relay records**
   removes this phone's carriage copies, keeping the map. Erasing the local mesh
   also stops/clears the relay. Previously distributed copies cannot be recalled.

## Native transport

- CoreBluetooth central + peripheral roles discover Rheo service
  `7252B810-7D3A-4FB2-98A6-3AC143B4E001`; write/notify characteristic ends `E002`.
- Local Wi-Fi/peer networking uses MultipeerConnectivity service `rheo-data-v1`,
  required session encryption and Bonjour `_rheo-data-v1._tcp`. Multipeer chooses
  the available local link. It requires no internet gateway, Starlink or central
  service. There is no global internet relay or automatic server upload.
- Both transports feed the same signed-record verifier and replication reducer.
  Wi-Fi may carry larger transfers faster; duplicate Bluetooth delivery is harmless.
- BLE uses MTU-sized fragments, ordered writes with response, a bounded
  backpressure-aware notification pump, per-link reassembly, timeouts, duplicate
  handling and bounded concurrent assemblies. Fragment headers use Bitchat's
  8-byte stream ID / UInt16 index / UInt16 total / type layout, with Rheo's own type.
- The actual Bitchat notification buffer is vendored unchanged with upstream
  commit and license in [PROVENANCE](../mobile/modules/rheo-mesh/vendor/PROVENANCE.md).
  This does **not** embed the complete Bitchat chat/Noise/Nostr stack and does
  **not** interoperate with unmodified Bitchat clients. Rheo uses a separate
  service so stock chat clients are not flooded with data packets.
- This pilot is foreground only: it stops radio activity in the background and
  resumes when active if sharing was enabled. No background GPS or movement
  history. It does not promise an always-on iPhone emergency network. Apple
  constrains suspended-app Bluetooth even when background modes are declared.

## Records, privacy and consistency

Each published snapshot is an Ed25519-signed envelope using CryptoKit and a
per-install signing key held in Keychain with `WhenUnlockedThisDeviceOnly`.
The signed body contains the public mesh JSON, creation time and expiry. A SHA-256
ID covers public key and body. Native verification checks signature, ID, sizes
and time bounds before JS receives a record. Relay hop count is mutable transport
metadata, bounded locally at seven; it is not an authenticated path proof.

A signature establishes key continuity and byte integrity, **not** real-world
identity, steward authority, consent, truth, availability, accessibility, safety
or trust. Bluetooth public payloads are readable to nearby participants: this is
not Bitchat private-message encryption. Only deliberately public data belongs
here. AsyncStorage relay copies and mesh data are not encrypted at rest; the
signing key is kept separately in Keychain. The signing key may survive reinstall
according to iOS Keychain behaviour; no hardware/user identity claim is made.

Received claims remain explicitly unverified. Repeated packets do not duplicate
records. Within retained provenance, a later snapshot from the same publishing
key can update/withdraw untouched received mirrors and retain My Path choices
for surviving sessions. Local edits, dependent local records and different-key
ID collisions cause the revision to be **held** atomically, not overwritten.
Held records show the publisher key, timestamp, reason and proposed payload;
**Retry held records** attempts another safe merge after local conflicts resolve.
There is no cross-key authority election, global reputation score, CRDT conflict
winner or claim that all devices converge despite conflicting edits.

The bounded persistent carriage journal is separate from the user's map. It
stores at most 12 signed snapshots; records expire after at most seven days.
Only non-held valid records with remaining hops are carried onward. Restart
re-verifies retained signatures before radio replay. Periodic whole-record retries
and new-peer notifications provide a simple anti-entropy mechanism; transfer is
best effort, not a durable delivery guarantee. Current public JSON is limited
to 24 KB per publisher; the envelope is capped at 48 KB. Full queues or oversized
maps produce recoverable status messages, with file exchange as fallback.
Journal eviction/expiry/clearing can remove revision provenance; later conflicting
updates then remain held. Already saved map entries do not expire automatically:
expiry limits transport carriage, not whether a place still exists. Live service
availability must be checked with the host. Durable provenance, larger regional
collections, fine-grained signed changes, acknowledgements and author-controlled
revocation are later work, not claimed by this pilot.

## Offline map boundary

The geographic schematic draws real stored latitude/longitude and relationship
lines using local SVG. It is independent of Apple/Google tiles, servers and AI.
A received geolocated portal can appear there with every internet service down.
Axes scale to fit; it is not a navigation chart. No streets, terrain, downloaded
regional tile packs, offline routing, guaranteed GPS fixes or safe-access claims
are provided. Mesh bandwidth is for compact affordance records, not distributing
entire street-map databases. Purple local sample overlays remain fictional and
are never relayed or converted to real portal coordinates.

## Verification and physical pilot

JS tests exercise private-data projection, A→B→C carriage, persisted journal
replay, duplicates, hop/expiry limits, source revisions, local-edit conflicts and
withdrawals. Native macOS CI compiles/runs frame/signature/backpressure tests and
typechecks the iOS radio against Apple's SDK. Neither simulated reducer tests nor
native compilation prove radio reliability on phones.

Physical acceptance requires two, ideally three registered iPhones with the same
new signed build:

- Disable Wi-Fi and mobile data, leave Bluetooth on, and join nearby sharing on
  A and B. Create one public real portal on A and confirm it reaches B without
  any share sheet. Confirm private and sample records do not appear.
- Shut A's radio off. Bring B to C and confirm onward carriage and geographic
  position with internet still absent. Restart B before this step to test storage.
- Edit a source record on A; confirm a same-key untouched mirror updates and a
  locally edited mirror is held rather than overwritten.
- Stop sharing, deny permissions, lock/background the app, toggle Bluetooth and
  move out of range. Confirm clear states, retained local data and resumed sync.
- Enable local Wi-Fi while the WAN is disconnected and exercise peer transfers.
- Measure range, reconnection, battery load, larger-map retries and delivery time.

Until those device checks pass, this is an embedded radio pilot, not a validated
lifeboat or guaranteed emergency communications system.

References:
- [Bitchat source](https://github.com/permissionlesstech/bitchat)
- [Apple Bluetooth background behaviour](https://developer.apple.com/library/archive/documentation/NetworkingInternetWeb/Conceptual/CoreBluetooth_concepts/CoreBluetoothBackgroundProcessingForIOSApps/PerformingTasksWhileYourAppIsInTheBackground.html)
