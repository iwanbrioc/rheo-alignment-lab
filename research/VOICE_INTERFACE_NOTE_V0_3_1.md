# Voice interface note — v0.3.1

**Branch:** `v0.3.1-evaluation-ui-repair`  
**Status:** presentation/input-modality enhancement; not an RWB reasoning-mechanism change.

## Purpose

Allow a user to answer questionnaire fields by speaking and see the transcription appear in the field while they speak. Allow questionnaire prompts to be read aloud on demand, with an optional voice-guide mode that reads the current section and reads a field when it receives focus.

## Implementation boundary

The first implementation uses browser/device speech capabilities as progressive enhancement:

- `SpeechRecognition` / `webkitSpeechRecognition` for live interim and final transcription when available;
- `speechSynthesis` for spoken prompts;
- no audio recording is added to the Rheo case representation;
- only the resulting text enters the existing case fields;
- microphone use is initiated by the user;
- unsupported browsers retain the normal typed questionnaire.

No prompt, structural-map schema, RWB horizon logic, evaluator, control condition or model-analysis pathway is changed by this feature.

## Research caution

Voice and typing are different interaction modalities. They may change answer length, spontaneity, completion rate, disclosure, wording and user experience. Any later behavioural comparison must therefore record interface modality rather than treating voice-enabled and typed sessions as automatically exchangeable.

The current research log records voice-guide toggles and transcription start/end/error events, but does not log audio or duplicate the transcribed text into the event log.

## Privacy / deployment note

Browser speech-recognition implementations can rely on browser or operating-system speech services and differ across devices. The UI therefore describes voice input as optional and does not claim that browser voice audio is processed locally. A future server-controlled implementation may use a dedicated realtime transcription service if consistent cross-browser behaviour and a clearer data-processing boundary are required.

## Next validation

Before treating voice as a default public interaction mode, test at minimum:

1. current Chrome on macOS and Android;
2. current Safari on macOS and iOS;
3. microphone permission denial and recovery;
4. long answers with pauses;
5. correction/editing after transcription;
6. dynamic fields added after page load;
7. spoken-question interruption when the user starts recording;
8. accessibility with keyboard and screen-reader use;
9. whether voice-mode sessions materially differ in answer length or dropout from typed sessions.
