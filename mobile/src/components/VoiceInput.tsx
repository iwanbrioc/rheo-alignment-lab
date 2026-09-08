import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, AppState, Keyboard, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { AudioModule, RecordingPresets, setAudioModeAsync, useAudioRecorder, useAudioRecorderState } from 'expo-audio';
import { File } from 'expo-file-system';
import { Image } from 'expo-image';
import { AppButton } from './AppButton';
import { transcribeVoiceNote } from '../services/voiceApi';
import { appendVoiceText, MicrophonePermissionError, VoiceSession, type VoiceState } from '../services/voiceSession';
import { colors, radii, spacing } from '../theme';

type VoiceInputProps = {
  value: string;
  onChangeText: (text: string) => void;
  onBusyChange: (busy: boolean) => void;
  disabled?: boolean;
};

export function VoiceInput({ value, onChangeText, onBusyChange, disabled = false }: VoiceInputProps) {
  const [mode, setMode] = useState<'voice' | 'type'>('voice');
  const [state, setState] = useState<VoiceState>({ phase: 'idle', error: null });
  const input = useRef<TextInput>(null);
  const latest = useRef({ value, onChangeText });
  latest.current = { value, onChangeText };
  const sessionRef = useRef<VoiceSession | null>(null);
  const recordingUri = useRef<string | null>(null);
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY, (status) => {
    if (status.hasError || status.mediaServicesDidReset) {
      void sessionRef.current?.cancel('Recording interrupted. Please try again or type instead.');
    } else if (status.isFinished) {
      void sessionRef.current?.stop();
    }
  });
  const recorderState = useAudioRecorderState(recorder, 250);
  const [session] = useState(() => new VoiceSession({
    prepare: async () => {
      const permission = await AudioModule.requestRecordingPermissionsAsync();
      if (!permission.granted) throw new MicrophonePermissionError();
      await setAudioModeAsync({ allowsRecording: true, allowsBackgroundRecording: false, shouldPlayInBackground: false, playsInSilentMode: true });
      try {
        await recorder.prepareToRecordAsync();
      } finally {
        recordingUri.current = recorder.uri;
      }
    },
    record: () => recorder.record({ forDuration: 120 }),
    stop: async () => {
      if (recorder.isRecording) await recorder.stop();
      recordingUri.current = recorder.uri || recordingUri.current;
      await setAudioModeAsync({ allowsRecording: false });
      if (!recordingUri.current) throw new Error('No recording');
      return recordingUri.current;
    },
    cleanup: async () => {
      // The hook also stops/releases the recorder on unmount. Keep the URI separately
      // so its temporary file can still be removed after that native object is released.
      try {
        if (recorder.getStatus().canRecord || recorder.isRecording) await recorder.stop();
      } catch { /* It may already be stopped or released. */ }
      try {
        await setAudioModeAsync({ allowsRecording: false });
      } finally {
        if (recordingUri.current) {
          const file = new File(recordingUri.current);
          if (file.exists) file.delete();
          recordingUri.current = null;
        }
      }
    },
    transcribe: transcribeVoiceNote,
    onText: (text) => latest.current.onChangeText(appendVoiceText(latest.current.value, text)),
    onState: setState,
  }));
  sessionRef.current = session;

  useEffect(() => {
    onBusyChange(state.phase !== 'idle');
  }, [onBusyChange, state.phase]);

  useEffect(() => {
    if (mode === 'type') input.current?.focus();
  }, [mode]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (next) => {
      const phase = session.state.phase;
      // Permission prompts can briefly make iOS inactive while preparation is pending.
      if (next === 'background' || (next === 'inactive' && phase === 'recording')) {
        if (phase !== 'idle') void session.cancel('Voice input stopped when you left Rheo. Your existing text is unchanged.');
      }
    });
    return () => {
      subscription.remove();
      void session.dispose();
    };
  }, [session]);

  const active = state.phase !== 'idle';
  const recording = state.phase === 'recording';
  const ready = state.phase === 'ready';
  const working = ['starting', 'stopping', 'transcribing', 'cancelling'].includes(state.phase);
  const duration = Math.min(120, Math.floor(recorderState.durationMillis / 1000));
  const clock = `${Math.floor(duration / 60)}:${String(duration % 60).padStart(2, '0')}`;

  async function chooseMode(next: 'voice' | 'type') {
    Keyboard.dismiss();
    if (active) await session.cancel();
    setMode(next);
  }

  return (
    <View style={styles.entry}>
      <View accessibilityRole="radiogroup" accessibilityLabel="Input method" style={styles.modes}>
        {(['voice', 'type'] as const).map((option) => (
          <Pressable
            key={option}
            accessibilityRole="radio"
            accessibilityState={{ checked: mode === option, disabled }}
            disabled={disabled}
            onPress={() => { void chooseMode(option); }}
            style={[styles.mode, mode === option && styles.selectedMode, disabled && styles.disabled]}
          >
            <Text style={[styles.modeText, mode === option && styles.selectedModeText]}>{option === 'voice' ? 'Speak' : 'Type'}</Text>
          </Pressable>
        ))}
      </View>

      {mode === 'voice' ? (
        <View style={styles.voice}>
          {!ready && state.phase !== 'transcribing' ? (
            <>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={recording ? 'Stop recording' : value ? 'Add a voice note' : 'Start recording'}
                accessibilityState={{ disabled: disabled || working, busy: working }}
                disabled={disabled || working}
                onPress={() => {
                  Keyboard.dismiss();
                  void (recording ? session.stop() : session.start());
                }}
                style={[styles.microphone, recording && styles.recording, (disabled || working) && styles.disabled]}
              >
                {working ? <ActivityIndicator color={colors.white} /> : (
                  <Image source={recording ? require('../../assets/voice-icons/square.svg') : require('../../assets/voice-icons/mic.svg')} style={styles.icon} tintColor={colors.white} />
                )}
              </Pressable>
              <Text accessibilityLiveRegion="polite" style={styles.voiceLabel}>
                {recording ? 'Recording' : working ? 'One moment...' : value ? 'Add a voice note' : 'Tell Rheo what is on your mind'}
              </Text>
            </>
          ) : null}
          {recording || ready ? <Text style={styles.timer}>{clock} / 2:00</Text> : null}
          {ready ? <AppButton label="Use recording" onPress={() => { void session.transcribe(); }} variant="primary" /> : null}
          {state.phase === 'transcribing' ? (
            <View accessibilityLiveRegion="polite" style={styles.progress}>
              <ActivityIndicator />
              <Text style={styles.voiceLabel}>Transcribing...</Text>
            </View>
          ) : null}
          {active && state.phase !== 'cancelling' ? (
            <AppButton label={state.phase === 'transcribing' ? 'Cancel' : 'Discard recording'} onPress={() => { void session.cancel(); }} variant="quiet" />
          ) : null}
          <Text style={styles.privacy}>
            Only records after you tap. Use recording sends the clip to OpenAI for transcription. Rheo then deletes its temporary copy; a crash can leave cached audio.
          </Text>
        </View>
      ) : null}

      {state.error ? <Text accessibilityRole="alert" style={styles.error}>{state.error}</Text> : null}
      {mode === 'type' || value.length > 0 ? (
        <TextInput
          ref={input}
          accessibilityLabel="What are you trying to work out?"
          editable={!disabled && !active}
          multiline
          onChangeText={onChangeText}
          onSubmitEditing={Keyboard.dismiss}
          placeholder="What are you trying to work out?"
          returnKeyType="done"
          style={styles.input}
          submitBehavior="blurAndSubmit"
          textAlignVertical="top"
          value={value}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  entry: { gap: spacing.md },
  modes: { flexDirection: 'row', borderWidth: 1, borderColor: colors.border, borderRadius: radii.sm, overflow: 'hidden' },
  mode: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 46, padding: spacing.sm },
  selectedMode: { backgroundColor: colors.primary },
  modeText: { fontSize: 16, fontWeight: '600', color: colors.body },
  selectedModeText: { color: colors.white },
  voice: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.md },
  microphone: { width: 76, height: 76, borderRadius: 38, backgroundColor: colors.blue, alignItems: 'center', justifyContent: 'center' },
  recording: { backgroundColor: colors.danger },
  icon: { width: 30, height: 30 },
  disabled: { opacity: 0.48 },
  voiceLabel: { fontSize: 17, lineHeight: 24, fontWeight: '600', color: colors.ink, textAlign: 'center' },
  timer: { fontSize: 16, lineHeight: 24, fontVariant: ['tabular-nums'], color: colors.body },
  progress: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  privacy: { fontSize: 13, lineHeight: 19, color: colors.muted, textAlign: 'center' },
  error: { fontSize: 15, lineHeight: 22, color: colors.danger },
  input: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.md, borderWidth: 1, color: colors.ink, fontSize: 17, lineHeight: 24, minHeight: 150, padding: spacing.lg },
});
