# Rheo private phone test

This is a small, non-sensitive test, not a public release or a high-risk deployment.
It reuses the existing Expo project and canonical brand. No store submission, cloud
sync, user accounts, telemetry, background location or mesh networking is added.

## Three separate things

- A **development build** includes native dictation but still uses Metro on a computer.
- A **preview build** bundles the interface and runs without Metro. It still needs
  internet and the configured server for new AI answers and place searches.
- A **store release** is not configured or authorised here. Private feedback and
  device/privacy checks come first.

The EAS project is `@rheocracy/rheo-mobile`. `mobile/eas.json` has development,
development-simulator, preview and preview-simulator profiles. Preview is internal
distribution: Android APK and iOS ad hoc, **not TestFlight**. iPhones must be registered
before signing; TestFlight will require a later store-signed build.

## Render deployment

Use the separate Blueprint at `mobile/private-beta/render.yaml`, not the existing
root `render.yaml`. It creates **rheo-private-beta**, leaves the existing website
and DNS alone, disables automatic deployments, and runs one instance with a 1 GB
persistent disk. The smallest paid compute instance and disk need cost approval
before creating the service. Free ephemeral hosting would reset the usage ledger.

The Blueprint installs only root Node dependencies. Its public listener dispatches
to the existing experimental and mobile-helper handlers without opening other ports.
Frozen research servers, prompts and schemas are unchanged.

1. Push the reviewed branch after checking the staged diff for secrets/private data.
2. Create a new Render Blueprint using this file and the current experimental branch.
3. Set `OPENAI_API_KEY` in Render only, preferably a dedicated restricted project key.
4. Create a private invitation file outside version control:

   ```bash
   mkdir -p mobile/private-beta/private
   node mobile/private-beta/create-invite.mjs mobile/private-beta/private/tester-1.json
   ```

5. Set `RHEO_BETA_INVITES` to a JSON array of `serverEntry` objects from invitation
   files. Each contains a SHA-256 hash and expiry, never the raw code. Give each
   tester only their `code`, privately. Do not put it in a URL, QR link, git or EAS.
6. Invitations expire after 14 days by default. Remove a hash and redeploy to revoke
   access; create a new invitation to renew it. Removing access does not delete notes.
7. Verify `/api/health` returns `privateBeta: true`; unauthenticated requests to all
   other endpoints must fail. Test fixture requests before enabling paid providers.

The server is designed for **Render TLS termination**. It requires `RENDER=true`, a
persistent usage-file path, a non-empty invitation list and forwarded HTTPS. Never
run it directly on the public internet and trust a client-supplied HTTPS header.
It does not accept browsers, arbitrary routes or redirects. Its single-instance
assumption must not be replaced with autoscaling without shared admission storage.

### Limits and costs

- At most two active requests globally and one per invitation.
- Twenty request units per invitation and 100 across the test each UTC day.
- Preparation costs two units because it may make two AI requests; other supported
  requests cost one, including local lookup. Failed/cancelled requests consume units.
- Limits are reserved before provider work and survive restarts. An unreadable ledger
  stops service instead of silently resetting counts. It stores only day, counts and
  invitation hashes, not personal content or IP addresses.
- Existing provider time/token/tool limits remain. There are no automatic retries.
- These are **request limits, not a guaranteed money cap**. Configure provider alerts,
  monitor costs, and revoke invitations/disable the key if necessary. Provider pricing
  and work already started affect the final charge. No user-facing scoring is added.

Local context defaults to fixture: GPS and an approximate area still work, but there
are no fabricated places. Only enable Nominatim deliberately for low-volume testing
after reviewing its policy and setting an identifying user agent. A scalable local
evidence provider remains a separate decision; deployment does not invent one.

## Build the private app

In the EAS project's **preview** environment, set these public, non-secret values:

```text
EXPO_PUBLIC_RHEO_API_URL=https://<actual Render hostname>
EXPO_PUBLIC_LOCAL_CONTEXT_API_URL=https://<same actual Render hostname>
```

Use an origin with no trailing slash. Preview profiles already select the v0.10
engine and invitation access. Build configuration rejects missing/HTTP/local/example
addresses, mismatched origins, the legacy engine and public secret variable names.
Do not use a placeholder endpoint to make a build pass.

From `mobile/`:

```bash
npx eas-cli@latest device:create
npx eas-cli@latest build --platform ios --profile preview
npx eas-cli@latest build --platform android --profile preview
```

These commands can use build quota and signing credentials. Review account, device
registration and costs before starting. Do not use `--auto-submit`.
Turn off **Unauthenticated access to internal builds** in the EAS project settings
before sharing build links. The API invitation is separate from build download access.

The root `.easignore` allowlists the mobile source and root package manifests, excluding
research, server invitation files, native generated folders, build outputs and env
files. Inspect the archive with `eas build:inspect --stage archive` before uploading.

## Privacy and device checks

On first opening a private build, a plain-English notice and access-code field appear.
The user can go back without connecting and still read/delete local notes. Entering a
code checks access without invoking AI. Revoked access gives an explicit error on the
next network request, with a route to replace the code. No code is embedded in the app.

`expo-secure-store` protects only the access code, using device-only, unlocked keychain
access on iOS and the platform secure store on Android. iOS keychain data can survive
uninstalling. **Decision history and private pathways remain unencrypted AsyncStorage.**
Android app backup is disabled for new native builds; this is not a promise that all
OS backups, screenshots or a compromised phone are safe. There is no remote wipe.

Questions, reviewed outcomes, explicit drafts, voice uploads and approximate local
lookups travel over HTTPS to Render and, as applicable, OpenAI/local-search providers.
Native live dictation may use Apple/Android speech services. No new automatic uploads
are added. The gateway writes no content logs. Hosting/provider infrastructure can
still process IP/connection metadata and retain data under their own policies.
Preparation results remain briefly in server memory for retry, separately per invitation.
Invitation hashes/counts are operational access controls, not wellbeing analytics.

Before inviting anyone, verify on real iOS **and** Android:

- first-run notice, valid/invalid/expired code, storage error, remove access;
- app cold launch and bundled icon/splash without Metro;
- microphone/speech denial, live words, Stop, background/phone interruption;
- keyboard dismissal, small screen, largest text sizes, screen reader, Android Back;
- optional GPS denied/off/timeout, approximate area, no raw saved coordinates;
- AI offline/timeout, cancelling, no late advice, choose/custom/not-yet;
- save/reopen/review/delete, no lost history on access removal;
- unauthenticated endpoint rejection and invitation isolation;
- no secrets in the exported JS bundle or build archive.

All previous semantic limitations remain, including occasional overlapping options.
This build is not suitable for surveillance-sensitive, conflict-zone or crisis use.

## Verification on 17 September 2026

Preparation is complete locally; deployment and private distribution are **not** complete.
The EAS project is linked. No Render service, paid cloud build, store submission,
real invitation or new AI request was created during this preparation. The branch
has not been pushed or merged. Render email verification and hosting-cost approval
are still required before provisioning the service and signing phone builds.

Material changes:

- `mobile/private-beta/`: authenticated gateway, durable daily limits, isolated
  preparation caches, invitation generator and separate Render Blueprint.
- `mobile/src/services/betaAccess.ts` and `BetaAccessPanel.tsx`: secure access-code
  storage, first-run notice, explicit connection/removal and authenticated requests.
- `mobile/app.config.js`, `build-config.cjs`, `eas.json`, `app.json` and `.easignore`:
  native build profiles, endpoint/secret guards, permission restrictions and upload
  exclusions. The canonical brand source is unchanged.
- Native display fixes: Android status-bar contrast, white voice icons and aligned
  lotus strokes. Existing request/preparation smokes now use the authenticated client.
- One dependency added: `expo-secure-store ~57.0.4`, for the invitation code only.

Checks run from `mobile/`, unless stated otherwise:

| Check | Result |
| --- | --- |
| `npm run typecheck` | Exit 0; no TypeScript errors |
| `npm run smoke:local` | Exit 0; all 14 scripts passed, with 16 PASS summaries |
| `npm run doctor` | Exit 0; 21/21 checks passed, no issues detected |
| Root `npm run smoke:experimental` | Exit 0; eight fixture cases passed |
| Root `npm run smoke:v0.9` | Exit 0; unchanged fixture contract passed |
| `eas build:inspect --platform ios --profile development-simulator --stage archive` | Exit 0; local archive includes app, excludes research, env files, generated native folders and private-beta server files |
| Xcode Release simulator build, `CODE_SIGNING_ALLOWED=NO` | Exit 0; installed and launched on iPhone 16e, iOS 18.6 |
| Gradle `:app:assembleRelease` | Exit 0; BUILD SUCCESSFUL in 1m 50s, 665 tasks |
| `npm audit --omit=dev` | Exit 1; 11 moderate dependency findings, zero high/critical |

The audit findings are in the existing Expo/xcode/uuid dependency chain. The suggested
forced fix changes Expo to an incompatible major version, so it was not applied.
Review these dependencies again before wider distribution.

Both compiled apps contain bundled JavaScript and launched without Metro or Expo Go.
These local compile checks use development endpoints, **not** a deployed private-beta
endpoint. The iOS output is simulator-only. The Android APK uses the generated local
debug signing key, not distribution credentials. Neither is the final tester build.

Screenshots: [iOS start](screenshots/rheo-private-beta/ios-native.png),
[Android start](screenshots/rheo-private-beta/android-native.png), and
[Android after keyboard Done](screenshots/rheo-private-beta/android-ready.png).
The last screenshot uses made-up text and shows the keyboard dismissed and Ask Rheo
available; no request was sent. The Android emulator initially showed System UI and
Digital Wellbeing not-responding dialogs; final launch and keyboard checks completed
without those dialogs. This is not a substitute for physical-device testing.

Native permission inspection confirmed no background-location, external-storage or
biometric declarations in the final local builds. iOS declares only foreground
location, microphone and speech-recognition purposes. Android's developer overlay
permission is additionally blocked in private-beta configuration.

Still unverified: actual Render TLS/disk deployment, hosted provider integration,
signed physical installs, live voice/GPS on real phones, screen-reader/large-text
coverage and the access notice on a final private build. Access UI and transport
failure/cancellation cases have automated smoke coverage. Live local search remains
disabled in the proposed hosted configuration until its provider is deliberately set.
