# Change record — v0.3.1 OpenAI Realtime voice transport

**Branch:** `v0.3.1-evaluation-ui-repair`  
**Scope:** input modality / transport only; not an RWB reasoning-mechanism change.

## Change

Replace browser-vendor speech recognition as the preferred microphone path with OpenAI Realtime transcription over WebRTC. Keep browser `speechSynthesis` for reading questions aloud. Keep the existing typed questionnaire as fallback.

Architecture:

1. Browser obtains microphone permission and creates an `RTCPeerConnection` plus Realtime data channel.
2. Browser sends its SDP offer to Rheo's own `/api/realtime/call` endpoint.
3. Rheo's Node server authenticates to OpenAI with the permanent `OPENAI_API_KEY` and creates the Realtime WebRTC call.
4. OpenAI returns an SDP answer through the Rheo server; the permanent API key is never sent to the browser.
5. Input audio transcription delta/completed events received over the WebRTC data channel update only the active questionnaire text field.
6. Audio is not added to the Rheo case record or research event log; the resulting transcript enters the same fields as typed text.

## Configuration

- Realtime session model: `OPENAI_REALTIME_MODEL`, default `gpt-realtime`.
- Transcription model: `OPENAI_TRANSCRIPTION_MODEL`, default `gpt-4o-mini-transcribe`.
- English is supplied as the transcription language for latency/accuracy.
- Server VAD segments speech; `create_response:false` prevents automatic assistant responses during transcription.
- Browser-native `SpeechRecognition` remains a visible fallback only if Realtime connection setup fails and the browser supports it.

## Predictions

- A supported WebRTC browser can open a microphone session without exposing the permanent API key client-side.
- Transcription delta events can update the active field before the final transcription event.
- Completed transcription remains editable as ordinary questionnaire text.
- Starting a new field closes the previous microphone peer connection rather than leaking a long-lived stream.
- If WebRTC/OpenAI Realtime fails, the app gives a visible error or explicitly identified browser fallback and preserves typed input.

## Falsifiers / failure conditions

- Browser source or network responses expose `OPENAI_API_KEY`.
- Realtime session creates an assistant response instead of acting as transcription-only input.
- Audio/transcript is silently copied into research logs beyond modality metadata.
- Final transcript duplicates interim transcript text.
- Microphone tracks or peer connections remain open after the user stops listening or leaves the page.

## Non-claims

This change does not establish that voice improves RWB reasoning, user outcomes, disclosure quality, accessibility, retention or research validity. Voice and typing remain distinct modalities that may affect user behaviour.

## Implementation status — 19 August 2026

Implemented:

- server-side OpenAI Realtime WebRTC call helper in `realtime.mjs`;
- `/api/realtime/call` SDP exchange endpoint in `server.mjs`;
- browser WebRTC microphone/data-channel path in `app/voice.js`;
- transcription delta/completed handling without transcript logging;
- microphone/peer-connection teardown;
- browser-native fallback with explicit status text;
- Render environment configuration for Realtime and transcription models;
- service-worker cache revision;
- CI syntax/research-file validation.

CI passed at commit `5a9477ef1197660daa58642d676767f071676a92`.

Not yet established:

- a successful live OpenAI SDP negotiation with a real API key;
- cross-browser behaviour on Chrome/macOS, Safari/macOS/iOS and Android;
- actual transcription latency/accuracy for long-form questionnaire answers.

Those remain required before describing the Realtime voice path as operational in production.
