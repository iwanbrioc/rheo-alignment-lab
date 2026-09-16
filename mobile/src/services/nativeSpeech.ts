import { requireOptionalNativeModule } from 'expo';
import type { ExpoSpeechRecognitionModule } from 'expo-speech-recognition';

export type NativeSpeech = typeof ExpoSpeechRecognitionModule;

// Expo Go does not include this native module. Keep its existing input usable.
export const nativeSpeech = requireOptionalNativeModule<NativeSpeech>('ExpoSpeechRecognition');
