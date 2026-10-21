# Rheo native v0.4 — mycelium on a geographic map

User-directed milestone: integrate the browser v0.4 experience into the existing
Rheo iPhone app and allow its mycelium to overlay a real map. This supersedes the
v0.2 milestone's questionnaire-first/no-community-map scope. Research immutability,
optional foreground location, human choice and data-minimisation remain in force.
Work stays on `mobile-rheo-alpha-v0.2`; no frozen research material is changed.

## What is implemented

- Native React Native screens for the mycelium, portal directory, Open Space
  time/space matrix, My Path and exchange. This is not a WebView of the website.
- A geographic map using `react-native-maps`: Apple Maps on iPhone. Loading it is
  an explicit choice; a conceptual network remains usable independently of tiles.
- Real pins for deliberately geolocated, non-fictional portals. Connections draw
  as polylines only when both endpoints have locations. They are relationships,
  not routes, endorsements or proof of access.
- Private-by-default portal creation/editing with optional coordinates, consented sharing,
  a steward label and an invitation describing access and care.
- Explicitly recorded connections, activity proposals and a self-curated My Path.
  Overlaps are flagged without making the user's choice for them.
- Local persistence in a separate `@rheo/native-mesh/v0.4` AsyncStorage key. Earlier
  Rheo decision/session/pathway storage and keychain codes are never read or changed.
- Bounded JSON import/merge, deliberate private backup/restore, and native file
  sharing through Files/AirDrop or another user-chosen channel.
- Bitchat-compatible RHEO4 text token share/receive, with UTF-8/TLV framing parity.
  Text tokens omit coordinates and steward labels. This is an OS share handoff;
  there is no automatic native Bluetooth relay or control of the Bitchat app.

The app starts with an empty mesh. The user can explicitly load the fictional
browser sample, including its nine activities. Sample x/y positions never become
real-world coordinates, and the validator rejects locations on fictional portals.
The new map does not call an AI server and does not require the old beta invite.

## Existing app identity

The pilot's existing Expo identity is preserved:

- Owner/project: `@rheocracy/rheo-mobile`
- EAS project: `94482de9-a319-413d-a0ce-d9ec44d675f3`
- iOS bundle identifier: `org.rheo.mobile`
- Android package: `org.rheo.mobile`
- Native app version: `0.4.0`; EAS preview auto-increments the platform build number.

Use the same project and signing credentials. Do not create a replacement project
or uninstall the existing app to update: uninstalling can remove local notes.

## Run and build

```sh
cd mobile
npm ci
npx expo start --go
```

Open with a compatible Expo Go version for SDK 57. For a physical iPhone outside
the computer's LAN, an Expo tunnel or a signed preview build is needed. Expo Go
is useful for checking the interface; the existing standalone pilot must receive a
new signed binary because this change adds native map and sharing modules.

From an authenticated Expo account with access to the existing project:

```sh
cd mobile
npx eas-cli@latest whoami
npx eas-cli@latest build --platform ios --profile preview
```

The `preview` profile is internal/ad hoc distribution, matching the original pilot.
Use its finished Expo install link on the registered iPhone. No TestFlight redeem
code is involved. Existing device registration and signing credentials must remain
valid; EAS reports if they need attention. The profile uses the usual build quota.
No automatic store submission is configured.

In Expo's connected-GitHub build UI, select `mobile-rheo-alpha-v0.2`, app directory
`mobile`, platform iOS and build profile `preview`. The default website branch
`main` does not contain this native update. Connecting GitHub alone does not turn
browser code into a native build or update an installed binary.

A `production` store profile is provided for a later deliberate TestFlight build.
It still requires the relevant Apple/App Store Connect access and a separate
submission. This implementation does not claim a TestFlight release exists.

## Privacy and map-provider behavior

- Foreground position is requested only on a user tap. No background tracking,
  geofencing or movement history is added.
- Device capture is rounded to three decimal places, approximately 100 metres,
  before use. The transient current position is not persisted or exported.
- User-entered portal coordinates are intentionally persisted with that portal.
  They can be precise. Sharing that portal explicitly includes those coordinates.
- MapKit/Google may receive the area viewed and device/network metadata to supply
  tiles. Loading the basemap is opt-in and is separate from location permission.
- Native `showsUserLocation` is disabled. There is no continuous device-location
  subscription; the optional approximate marker is created from one foreground fix.
- Shared JSON excludes private portals, their links/activities and My Path.
  A private backup includes all of these and requires an explicit confirmation.
- Imported claims are unverified and private by default. Duplicate imports are
  idempotent; conflicting records reject the entire merge. Imports do not replace
  local My Path. Backup restoration is a separate, explicitly confirmed operation.
- AsyncStorage is not encrypted storage. No accounts, analytics, AI calls, cloud
  sync, financial token balances or global reputation scores are added.
- Distributed copies cannot be recalled. Nearby, local or well-connected does not
  automatically mean safe, available, sustainable or trustworthy.

## Map choices and limitations

Apple Maps is used on iPhone without a Google Maps API key. The selected library
also supports Google Maps; use a restricted native SDK key and its config plugin
before deliberately enabling Google on a production build. Android's map is
currently gated unless `EXPO_PUBLIC_GOOGLE_MAPS_ENABLED` is set after configuring
its Google Maps SDK key. The conceptual network and stored coordinates still work.
No new Google Cloud billing account or map key is created by this change.

Basemap tiles are provider-managed and may require internet. The app does not
promise offline street maps, directions, safe routes, venue bookings or verified
availability. Providers' cached tiles are not a substitute for field testing.

Browser v0.4 JSON imports into mobile. The older browser validator does not retain
new location fields when it re-exports; keep a native private backup if geographic
positions matter. Bitchat text tokens deliberately omit geographic positions.

## Dependencies and validation

Added SDK-compatible packages: `react-native-maps` for the real map,
`react-native-svg` for the conceptual graph, `react-native-safe-area-context` for
phone insets, `expo-crypto` for secure IDs, and `expo-document-picker`,
`expo-file-system`, `expo-sharing` for deliberate file exchange. Expo/location
patch versions were brought into line with the installed SDK. No new navigation
framework, AI service, analytics or custom tile-server dependency was introduced.

Run:

```sh
npm run typecheck
npm run smoke:local
npm run test:mesh
npm run doctor
npm run export:ios
```

The mesh tests cover geometry, fictional-location exclusion, map bounds including
the antimeridian, private exports, bounded parsing, conflict handling, replay,
private paths, matrix choices, existing app identity and native text-token encoding.
A successful iOS export checks bundling; it is not a signed iOS compilation or
proof of physical-device behavior. Real-device map rendering, permission denial,
file handoff, accessibility and data retention across installation still require
an installed preview build.

Platform reference: https://docs.expo.dev/versions/latest/sdk/map-view/

## Verification on 21 October 2026

- TypeScript: passed.
- Existing local-context and decision-session smoke checks: passed.
- Native mesh/geometry/exchange tests: 15 passed.
- Expo Doctor: 21/21 checks passed after aligning the location patch version.
- iOS Hermes JavaScript export: passed. This checks the native dependency graph
  and bundle, not Apple signing or physical map rendering.
- EAS CLI authentication check: `Not logged in`. No new signed preview build or
  TestFlight submission was created in this environment. The source is ready
  for the existing connected Expo project to build from the mobile branch.

No frozen research files were changed. The approved app icon is reused from the
previous signed pilot branch. Existing notes are preserved by using a separate
mesh store, not by migrating or rewriting historical decisions.
