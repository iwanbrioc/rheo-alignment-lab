# Rheo mobile v0.2 - geolocated decision loop

This is an Expo/React Native alpha for testing whether optional local context helps Rheo reveal practical pathways that would otherwise remain invisible.

It is **not** part of the v1.1 confirmatory benchmark and lives on a separate product branch.

## What works in this slice

- speak a short voice note by default, or type a decision/predicament;
- optionally ask Rheo to look around using foreground location;
- reduce coordinates to neighbourhood precision before they leave the device;
- search for a bounded set of decision-relevant local possibilities;
- display those possibilities as evidence to check, with provenance, retrieval time and uncertainty;
- pass the local evidence, without raw coordinates, into the existing v0.9 Rheo flow/action pipeline;
- receive three ordinary-language action options;
- explicitly choose a recommended action, write another action or choose not yet;
- save the recommendation/choice record locally on device;
- revisit and delete recent local decision sessions;
- remove local context and continue without it.

The app can also prepare a chosen step: check public sources and write an unsent
message or checklist, after a separate approval. New live answers use a simple-English
wording pass. Both features are product-only; the frozen decision engine is unchanged.

There is intentionally no background tracking and no map yet.

## Requirements

- Node.js 22.13 or newer for Expo SDK 57;
- Expo-compatible iOS/Android simulator or Expo Go/development build;
- the existing Rheo v0.9 server;
- the prototype local-context server.

## Install

```bash
cd mobile
npm install
```

The repository includes a mobile `package-lock.json`; CI uses `npm ci`.

## Run the servers

From the repository root, run the Rheo server in one terminal:

```bash
export RHEO_MODEL_PROVIDER=openai
export OPENAI_MODEL=gpt-5.6
export OPENAI_API_KEY='YOUR_KEY'
npm run start:v0.9
```

Never commit the API key or put it in an Expo public environment variable.

In another terminal run local context in safe fixture mode:

```bash
node mobile/local_context_server.mjs
```

Fixture mode never invents places, so the app will show no real local candidates.

For deliberate low-volume Nominatim prototyping:

```bash
export LOCAL_CONTEXT_PROVIDER=nominatim
export NOMINATIM_USER_AGENT='RheoMobile/0.1 (+https://github.com/iwanbrioc/rheo-alignment-lab)'
node mobile/local_context_server.mjs
```

The public Nominatim service is not the intended production provider. Respect its usage policy and switch to a suitable paid/self-hosted source before scale.

Read the [Nominatim usage policy](https://operations.osmfoundation.org/policies/nominatim/) before enabling it. This is an explicit, low-volume prototype choice: searches are user-triggered, bounded to the current area, queued at most once per second across requests, and cached for 15 minutes. Show OpenStreetMap attribution. Do not use it for autocomplete, bulk place collection or a public-scale service. Only category terms and the approximate search boundary are sent to this provider, never the predicament text.

Job and skills predicaments search for employment agencies, colleges and libraries. These listings do not establish job vacancies, course places, costs or eligibility.

## Run the app

```bash
cd mobile
npm start
```

The default API URLs are:

- Rheo: `http://localhost:8080`
- local context: `http://localhost:8081`

On a physical phone, `localhost` means the phone itself. Point the app at the computer's LAN address before starting Expo, for example:

```bash
export EXPO_PUBLIC_RHEO_API_URL='http://192.168.1.20:8080'
export EXPO_PUBLIC_LOCAL_CONTEXT_API_URL='http://192.168.1.20:8081'
npm start
```

These public variables contain server addresses only, never secrets.

### iPhone simulator

The simulator uses a simulated location, not the Mac's physical GPS. In Simulator choose **Features > Location > Custom Location** to set a test area, then tap **Look around me** and allow foreground location. A real phone uses its own location services. If no GPS fix arrives within 20 seconds, Rheo allows retrying or continuing without location.

If Expo reports that it cannot connect to `127.0.0.1` on a Mac where `localhost` resolves to IPv6 first, start the simulator preview with:

```bash
NODE_OPTIONS=--dns-result-order=ipv4first npm start -- --localhost --port 19000 --ios
```

Check `http://localhost:8080/api/health` and `http://localhost:8081/api/local-health` for the running providers. `fixture` means test responses or no real places. Real answers require the Rheo server to have a server-only `OPENAI_API_KEY` and `RHEO_MODEL_PROVIDER=openai`; nearby search separately needs its live provider enabled. Existing saved fixture recommendations remain unchanged; ask again to generate new advice.

## Checks

```bash
npm run smoke:local
npm run typecheck
npm run doctor
```

### Voice input

The question screen starts with **Speak**, without opening the keyboard or microphone.
Tap the microphone, grant foreground microphone access, then stop recording. Clips stop
automatically after two minutes. **Use recording** explicitly sends the clip for transcription;
stopping alone does not upload it. The resulting words are editable and are appended to any
existing question. **Ask Rheo** remains a separate action. **Type** is always available.

Enable transcription in the same terminal as the mobile local-context server:

```bash
export RHEO_VOICE_PROVIDER=openai
export OPENAI_API_KEY='YOUR_KEY'
node mobile/local_context_server.mjs
```

This product-only endpoint uses `gpt-4o-mini-transcribe` at OpenAI's audio transcription
API, with the key on the server only. It shares `EXPO_PUBLIC_LOCAL_CONTEXT_API_URL` with
local search; on a phone use the computer's LAN address. Transcription needs internet access
and uses the API account's quota. It is disabled unless explicitly configured and never
returns fabricated fixture transcripts. See `GET /api/voice/health` for configuration status.

Audio is sent only after **Use recording**, through the local server to OpenAI. The server
holds a bounded clip in memory, does not log or persist clips/transcripts, and returns only
text. This does not promise zero retention by the transcription provider. The app attempts
to delete its cached clip after successful use, discard, cancellation or leaving the screen.
A crash or failed deletion can leave temporary audio in the device cache until the OS clears
it. Recordings are never saved in decision history. The edited text follows the existing
decision-storage policy. Leaving Rheo interrupts active recording; no background audio
capabilities are enabled. Cancellation after upload cannot retract audio already sent.

This remains a trusted-LAN alpha server, not an authenticated public service. Do not expose
it to the internet: production needs HTTPS, authentication and stronger per-user quotas.
Uploads are capped at 4 MiB with timeouts, a short request throttle and two concurrent requests.
The voice endpoint rejects browser-origin requests; this recording flow targets iOS/Android.

Added Expo-compatible dependencies: `expo-audio` and its required `expo-asset` peer for recording, `expo-file-system` for
temporary-file cleanup and upload, and `expo-image` for the bundled Lucide microphone/stop
icons (license in `assets/voice-icons/`). These work in Expo Go; a standalone build must be
rebuilt to include the microphone permission. No decision-engine or location behaviour changes.

Voice smoke coverage includes no recording/upload on mount, permission denial, separate
upload consent, double taps, cancellation during permission/transcription, retry, text
preservation, cleanup failure, upload limits and sanitized provider failures. On a physical
phone also check microphone capture, interruption by locking/switching apps, the two-minute
limit, transcript editing and typing with microphone access denied.

The keyboard smoke checks component settings and action handlers without a native runtime.
On a phone, also check both the predicament and custom-action inputs: **Done** dismisses
the keyboard without submitting, dragging the page dismisses it, and action buttons work
on the first tap. The page makes room for the iOS keyboard so lower buttons remain reachable
by scrolling. Long text still wraps across lines; the keyboard's return key now finishes editing.

## Mobile branding (issue #13)

Ask uses the approved lotus and Rheo wordmark; Advice, Confirmation and Recent use
a smaller lockup. The question and decision controls stay dominant, and the
warm-neutral screens are unchanged. Header artwork has a single "Rheo" accessibility
label and wraps alongside secondary controls on narrow screens.

The canonical artwork and generation notes are in `assets/brand/`. Added dependencies:
`react-native-svg` for the exact vector lotus and `expo-splash-screen` for the native
launch screen, both installed with Expo's SDK-compatible versions. No new Expo
project, navigation framework, remote fonts or image services were introduced.
All brand assets are bundled; branding adds no network calls, permissions, storage,
analytics or changes to voice, foreground location or decision records.

The native app icon and splash are configured for the next standalone build.
Expo Go can show the screen branding but does not faithfully preview a standalone
splash or replace Expo Go's home-screen icon. Verify those in a release build on
iOS and Android. The brand smoke checks source fidelity, PNG content/dimensions,
the adaptive icon safe circle, accessibility and the four screen integrations.

## Help with a chosen step

After saving a choice, tap **Prepare this step**. Check or edit the text to share,
then tap **Ask Rheo to research and draft**. Opening the screen or choosing an option
does not start research. Rheo checks public websites and returns linked findings,
one draft message/checklist, what still needs you, and what is unclear.
It cannot send, submit forms, contact people, book, buy or mark your action done.
You can select text in the draft. Sending it remains your separate action.
**Not yet** and fixture recommendations do not start preparation. A custom choice can.

Enable the helper in the terminal that runs the mobile local-context server:

```bash
export RHEO_AGENT_PROVIDER=openai
export OPENAI_API_KEY='YOUR_KEY'
node mobile/local_context_server.mjs
```

This also enables plain-English wording for new live recommendations. To enable only
wording, use `RHEO_PLAIN_LANGUAGE_PROVIDER=openai` instead. Both default to
`gpt-5.4-mini`; `RHEO_AGENT_MODEL` can select another compatible model. No key belongs
in the app or an `EXPO_PUBLIC_*` variable. The app uses the existing local-context
server address. `GET /api/preparation/health` reports whether preparation is enabled.

Preparation makes two OpenAI Responses requests: public web search, then a no-tool
drafting step. It uses at most four web-tool calls, 4200 output tokens per request,
and 120 seconds for the whole run. The alpha server allows two concurrent requests
and ten starts per hour across all users. Each run may cost money on the API account.
There is no background agent. Keep the app open. Cancel, leave the screen or put
Rheo in the background to stop; reopening never silently restarts paid work.
Stopping cannot undo data already shared or guarantee that provider billing stops.
Review the instructions before retrying. A failed save can be retried without running
research again. After a crash, an unfinished run is shown as interrupted.

Only the reviewed text is sent for preparation. It starts with the chosen step, your
question and optional area label, all visible and editable before approval. No hidden
recommendation, choice history or raw coordinates are attached. Search providers may receive search
terms. Both Responses calls use `store: false`, which is not a promise of zero provider
retention. The server does not log or write briefs/results to disk. It holds a request
digest and result in memory for up to ten minutes to prevent duplicate runs. Local
deletion does not retract provider data or immediately clear that short-lived cache.

Approvals, instructions, findings, source links and drafts are saved with the decision
on the device, separately from the recommendation and choice. At most ten attempts
per decision and twenty recent decisions are kept. Delete the decision to delete its
saved drafts too. AsyncStorage is **not encrypted sensitive storage**. A storage read
failure leaves existing history untouched and stops new writes until it can be read.

The wording step sends only the four displayed fields plus IDs/kinds of the three
existing options to the same provider, without tools. It adds one request, up to 45
seconds and 5000 output tokens, with a separate twenty-per-hour/two-concurrent limit.
The app saves both original options and the exact displayed wording with model/status
metadata. IDs, option order, numbers and links are checked; semantic equivalence and
reading level cannot be guaranteed by those checks. Important details still need
human review. A failed wording pass shows the original with a clear notice. Existing
saved advice and fixture outputs are not rewritten. Choosing never edits either copy.

This is still a trusted-LAN iOS/Android alpha, not a public service. New endpoints
reject browser-origin requests but do not authenticate native clients. Do not expose
them to the internet. Production needs HTTPS, authentication, per-user spending limits
and a separate approval/execution design before any external action is added.

No new dependency was needed for these features. Expo was patched from 57.0.20 to
57.0.21 to match Expo Doctor. See `../docs/MOBILE_PREPARATION.md` for module boundaries
and tests. GPS, voice input and the approved lotus artwork are unchanged.

## Privacy and storage assumptions in v0.2

- location is opt-in and foreground only;
- latitude/longitude are rounded to three decimal places on-device;
- rounding happens before the operating system's area-name lookup as well as the place-search request;
- the place-search service receives those approximate coordinates transiently;
- the Rheo case record receives only the area label and returned candidate evidence, not the lookup coordinates;
- with the OpenAI provider enabled, predicament text, approximate area label and local evidence are sent to OpenAI to generate the recommendation; the existing server requests `store: false`;
- saved decision sessions contain the predicament text, optional area label, local evidence snapshot, recommendation snapshot and explicit choice;
- saved decision sessions deliberately omit `latitude` and `longitude` fields;
- alpha decision history is stored locally with AsyncStorage and can be deleted in the app;
- AsyncStorage is not an encrypted vault, so do not treat saved alpha decision history as encrypted sensitive storage;
- the app works without location;
- no background movement history is created.

This is a prototype privacy boundary, not a claim of anonymity. See `../docs/MOBILE_LOCAL_CONTEXT_ARCHITECTURE.md` before expanding location features.
