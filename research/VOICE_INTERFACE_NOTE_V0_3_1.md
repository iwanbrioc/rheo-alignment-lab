# Voice interface note — v0.3.1

**Branch:** `v0.3.1-evaluation-ui-repair`  
**Status:** presentation/input-modality enhancement; not an RWB reasoning-mechanism change.

## Purpose

Allow a user to answer questionnaire fields by speaking and see the transcription appear in the field with low latency. Allow questionnaire prompts to be read aloud on demand, with an optional voice-guide mode that reads the current section and reads a field when it receives focus.

## Preferred implementation

The preferred microphone path is now OpenAI Realtime transcription over WebRTC:

- the browser requests microphone permission and creates an `RTCPeerConnection`;
- the browser sends only its SDP offer to Rheo's `/api/realtime/call` endpoint;
- the Rheo server authenticates to OpenAI using the permanent `OPENAI_API_KEY` and returns the SDP answer;
- the permanent API key is never sent to the browser;
- `gpt-4o-mini-transcribe` is the default transcription model and is configurable with `OPENAI_TRANSCRIPTION_MODEL`;
- `gpt-realtime` is the default Realtime session model and is configurable with `OPENAI_REALTIME_MODEL`;
- server VAD segments speech and automatic assistant responses are disabled;
- transcription delta and completed events update only the active questionnaire field;
- browser `speechSynthesis` remains the lightweight mechanism for reading questions aloud.

Where Realtime/WebRTC is unavailable or cannot connect, supported browsers may fall back to `SpeechRecognition` / `webkitSpeechRecognition`, with a visible status message that a browser speech service is being used.

## Data boundary

- no audio recording is added to the Rheo case representation;
- only resulting transcript text enters the existing case fields;
- research logging records voice modality/transport and start/end/error metadata, not audio and not a duplicate transcript;
- microphone tracks and peer connections are explicitly closed when input stops or the page exits.

No prompt, structural-map schema, RWB horizon logic, evaluator, control condition or model-analysis pathway is changed by this feature.

## Research caution

Voice and typing are different interaction modalities. They may change answer length, spontaneity, completion rate, disclosure, wording and user experience. Any later behavioural comparison must therefore record interface modality rather than treating voice-enabled and typed sessions as automatically exchangeable.

## Validation status

Static code/CI validation can establish syntax and preserve the existing research pipeline, but it cannot establish that OpenAI WebRTC negotiation works on a real device. A successful live call is required before this feature is described as operational.

Before treating voice as a default public interaction mode, test at minimum:

1. successful OpenAI SDP negotiation with a real server-side key;
2. current Chrome on macOS and Android;
3. current Safari on macOS and iOS;
4. microphone permission denial and recovery;
5. long answers with pauses and multiple VAD segments;
6. correction/editing after transcription;
7. dynamic fields added after page load;
8. spoken-question interruption when the user starts recording;
9. microphone tracks/peer connection close after Stop and page exit;
10. browser developer tools show no permanent API key;
11. accessibility with keyboard and screen-reader use;
12. whether voice-mode sessions materially differ in answer length or dropout from typed sessions.
