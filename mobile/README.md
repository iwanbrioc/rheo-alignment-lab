# Rheo mobile v0.1 — geolocated decision context

This is an Expo/React Native prototype for testing whether optional local context helps Rheo reveal practical pathways that would otherwise remain invisible.

It is **not** part of the v1.1 confirmatory benchmark and lives on a separate product branch.

## What works in this slice

- enter a decision/predicament in ordinary language;
- optionally request foreground location;
- reduce coordinates to neighbourhood precision before they leave the device;
- search for a bounded set of decision-relevant local possibilities;
- display those possibilities with provenance and uncertainty;
- pass the local evidence, without raw coordinates, into the existing v0.9 Rheo flow/action pipeline;
- receive the existing three Rheo action types;
- remove location and continue without it.

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

## Checks

```bash
npm run smoke:local
npm run typecheck
npm run doctor
```

## Privacy assumptions in v0.1

- location is opt-in and foreground only;
- latitude/longitude are rounded to three decimal places on-device;
- the place-search service receives those approximate coordinates transiently;
- the Rheo case record receives only the area label and returned candidate evidence, not the lookup coordinates;
- the app works without location;
- no background movement history is created.

This is a prototype privacy boundary, not a claim of anonymity. See `../docs/MOBILE_LOCAL_CONTEXT_ARCHITECTURE.md` before expanding location features.
