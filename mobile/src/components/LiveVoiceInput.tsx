import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, AppState, Keyboard, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Image } from 'expo-image';
import { DictationSession, type DictationState } from '../services/dictationSession';
import type { NativeSpeech } from '../services/nativeSpeech';
import type { VoiceInputProps } from './VoiceInput';
import { colors, radii, spacing } from '../theme';

export function LiveVoiceInput({ value, onChangeText, onBusyChange, disabled = false, engine }: VoiceInputProps & { engine: NativeSpeech }) {
  const [mode, setMode] = useState<'voice' | 'type'>('voice');
  const [state, setState] = useState<DictationState>({ phase: 'idle', error: null });
  const input = useRef<TextInput>(null);
  const latest = useRef({ value, onChangeText });
  latest.current = { value, onChangeText };
  const [session] = useState(() => new DictationSession(engine, (text) => latest.current.onChangeText(text), setState));
  const active = state.phase !== 'idle';
  const finishing = state.phase === 'stopping' || state.phase === 'cancelling';

  useEffect(() => { onBusyChange(active); }, [active, onBusyChange]);
  useEffect(() => { if (mode === 'type' && !active) input.current?.focus(); }, [mode, active]);
  useEffect(() => {
    const listener = AppState.addEventListener('change', (next) => {
      if (next === 'background' || (next === 'inactive' && session.hasStarted)) {
        session.cancel('Dictation stopped when you left Rheo. Your text is still here.');
      }
    });
    return () => { listener.remove(); session.dispose(); };
  }, [session]);
  useEffect(() => { if (disabled) session.cancel(); }, [disabled, session]);

  function chooseMode(next: 'voice' | 'type') {
    Keyboard.dismiss();
    if (active) session.cancel();
    setMode(next);
  }

  return (
    <View style={styles.entry}>
      <View accessibilityRole="radiogroup" accessibilityLabel="Input method" style={styles.modes}>
        {(['voice', 'type'] as const).map((option) => (
          <Pressable key={option} accessibilityRole="radio"
            accessibilityState={{ checked: mode === option, disabled }} disabled={disabled}
            onPress={() => chooseMode(option)} style={[styles.mode, mode === option && styles.selectedMode, disabled && styles.disabled]}>
            <Text style={[styles.modeText, mode === option && styles.selectedText]}>{option === 'voice' ? 'Speak' : 'Type'}</Text>
          </Pressable>
        ))}
      </View>

      {mode === 'voice' ? (
        <View style={styles.voice}>
          <Pressable accessibilityRole="button"
            accessibilityLabel={active ? 'Stop dictation' : 'Start dictation'}
            accessibilityState={{ disabled: disabled || finishing, busy: finishing }}
            disabled={disabled || finishing}
            onPress={() => { Keyboard.dismiss(); if (active) session.stop(); else void session.start(latest.current.value); }}
            style={[styles.microphone, active && styles.listening, (disabled || finishing) && styles.disabled]}>
            {finishing ? <ActivityIndicator color={colors.white} /> : (
              <Image source={active ? require('../../assets/voice-icons/square.svg') : require('../../assets/voice-icons/mic.svg')}
                style={styles.icon} tintColor={colors.white} />
            )}
          </Pressable>
          <Text accessibilityLiveRegion="polite" style={styles.label}>
            {state.phase === 'starting' ? 'Starting...' : state.phase === 'listening' ? 'Listening...' : finishing ? 'Finishing...' : 'Tap to speak'}
          </Text>
          <Text style={styles.privacy}>
            {Platform.OS === 'ios'
              ? 'Speech may be sent to Apple as you talk. Rheo does not save a recording.'
              : "Speech may be sent to your phone's speech provider as you talk. Rheo does not save a recording."}
          </Text>
        </View>
      ) : null}

      {state.error ? <Text accessibilityRole="alert" style={styles.error}>{state.error}</Text> : null}
      <TextInput ref={input} accessibilityLabel="What are you trying to work out?"
        accessibilityHint={active ? 'Your words appear here as you speak. Stop dictation before editing.' : undefined}
        editable={!disabled && !active} multiline value={value} onChangeText={onChangeText}
        onSubmitEditing={Keyboard.dismiss} placeholder={mode === 'voice' ? 'Your words will appear here...' : 'What are you trying to work out?'}
        returnKeyType="done" submitBehavior="blurAndSubmit" textAlignVertical="top" style={styles.input} />
    </View>
  );
}

const styles = StyleSheet.create({
  entry: { gap: spacing.md },
  modes: { flexDirection: 'row', borderWidth: 1, borderColor: colors.border, borderRadius: radii.sm, overflow: 'hidden' },
  mode: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 46, padding: spacing.sm },
  selectedMode: { backgroundColor: colors.primary },
  modeText: { fontSize: 16, fontWeight: '600', color: colors.body },
  selectedText: { color: colors.white },
  voice: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm },
  microphone: { width: 76, height: 76, borderRadius: 38, backgroundColor: colors.blue, alignItems: 'center', justifyContent: 'center' },
  listening: { backgroundColor: colors.danger },
  icon: { width: 30, height: 30 },
  disabled: { opacity: 0.48 },
  label: { fontSize: 17, lineHeight: 24, fontWeight: '600', color: colors.ink, textAlign: 'center' },
  privacy: { fontSize: 13, lineHeight: 19, color: colors.muted, textAlign: 'center' },
  error: { fontSize: 15, lineHeight: 22, color: colors.danger },
  input: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.md, borderWidth: 1,
    color: colors.ink, fontSize: 17, lineHeight: 24, minHeight: 150, padding: spacing.lg },
});
