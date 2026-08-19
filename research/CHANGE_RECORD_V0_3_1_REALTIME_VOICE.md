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
5. Input audio transcription deltas/completions received over the WebRTC data channel update only the active questionnaire text field.
6. Audio is not added to the Rheo case record or research event log; the resulting transcript enters the same fields as typed text.

## Configuration

- Realtime session model is separately configurable with `OPENAI_REALTIME_MODEL`.
- Transcription model is separately configurable with `OPENAI_TRANSCRIPTION_MODEL`.
- English is supplied as the transcription language for latency/accuracy.
- Server VAD segments speech; no assistant model response is requested for transcription turns.

## Predictions

- A supported WebRTC browser can open a microphone session without exposing the permanent API key client-side.
- Transcription delta events can update the active field before the final transcription event.
- Completed transcription remains editable as ordinary questionnaire text.
- Starting a new field closes the previous microphone peer connection rather than leaking a long-lived stream.
- If WebRTC/OpenAI Realtime fails, the app gives a visible error and preserves typed input; browser-native speech recognition remains only a fallback where available.

## Falsifiers / failure conditions

- Browser source or network responses expose `OPENAI_API_KEY`.
- Realtime session creates an assistant response instead of acting as transcription-only input.
- Audio/transcript is silently copied into research logs beyond modality metadata.
- Final transcript duplicates interim transcript text.
- Microphone tracks or peer connections remain open after the user stops listening or leaves the page.

## Non-claims

This change does not establish that voice improves RWB reasoning, user outcomes, disclosure quality, accessibility, retention or research validity. Voice and typing remain distinct modalities that may affect user behaviour.

## Validation required

- syntax/CI;
- server endpoint rejects missing key/invalid SDP;
- successful live OpenAI SDP negotiation;
- live delta + completed transcription in at least Chrome/macOS and Safari/iOS;
- microphone stop closes tracks and peer connection;
- no permanent API key visible in browser requests or source.
