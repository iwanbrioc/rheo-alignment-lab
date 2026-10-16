# Rheo Mesh v0.4 — a living commons

A **working, offline-first browser prototype** of portals and their explicit mycelial connections. It does not use the Rheo question-and-answer engine, any AI API, maps service, accounts, analytics or background location.

## Run

From this repository's root:

```sh
python3 -m http.server 8080
# Open http://localhost:8080/app/v04/
```

On an HTTPS deployment open `/app/v04/`. The page registers a service worker for offline reload. On an iPhone it can be added to Home Screen in Safari.

## Functionality

- Ten **fictional** starter portals, thirteen explicit sample connections and nine fictional Open Space invitations, positioned on a conceptual network diagram (not a geographic map).
- Tap graph nodes; browse, search and filter portals; inspect actual recorded connections.
- Add your own portal and connect two existing portals.
- Browse a one-day **time/space matrix** of activities across spaces, propose an invitation, and curate **My Path**; clashes are signalled but participation is never prescribed (Open Space / Law of Two Feet). Save everything to browser `localStorage` with bounded validation.
- Reset sample after confirmation, export complete JSON, or import bounded JSON after confirmation.
- Mark a portal shareable (never default on for new personal records). Create a minimal `RHEO4:` text token, copy and paste it into Bitchat's **Bluetooth chat**. Recipient copies the token back into Rheo and imports a strictly validated portal marked **unverified**.
- The `bitchat-carrier.mjs` TLV encoder and decoder are adapted from Bitchat's public-domain `PrivateMessagePacket` implementation (`bitchat/Protocols/Packets.swift`). The codec is used as a parity check for the text token length and format. It does **not** provide native radio access or encryption itself.

## Important platform boundary

**There is no automatic BLE communication from the Rheo v0.4 browser page on iPhone.** Safari on iPhone does not expose the BLE peripheral/central facilities that Bitchat implements with native Swift/CoreBluetooth. A proper native Bitchat-powered Rheo implementation requires an Expo development build, a Swift transport adapter, supported iOS background modes, and real-device interoperability tests. This v0.4 is a useful functional proof of the map, exchange content, and app-to-app Bitchat handoff; it is not a Bitchat-native iOS client.

## Data and safety

Sample names and positions are invented; no actual Kyiv services, individuals or sites are represented. Tokens are unencrypted, unsigned and readable by others. The receiving app neither authenticates provenance nor proves availability, consent or trust. New user-added portals are **not shareable by default**. Do not use the token handoff to exchange identifiable, confidential or safety-sensitive material. `localStorage` is not secure storage.

## Attribution

The TLV structure (type 0 = message ID, type 1 = message content; single-byte field lengths) is derived from [Bitchat](https://github.com/permissionlesstech/bitchat), released under [The Unlicense](https://github.com/permissionlesstech/bitchat/blob/main/LICENSE). The derived encoder/decoder is restricted to text framing and is **not** a replacement for Bitchat's peer discovery, noise sessions, authentication, routing or binary BLE frame implementation.

This prototype is additive under `app/v04/`. It does not alter the frozen Rheo evaluation code or replace the existing v0.3 experience.

## Matrix and My Path

The matrix displays **times × spaces linked to portals**, with nine fictional activities. A user may propose a session and add/remove sessions from their own optional path. The schedule is local-only and represents no booking or confirmed availability. Existing v0.4 files without `sessions`/`myPath` import as empty matrices; reset to load illustrative sessions.
