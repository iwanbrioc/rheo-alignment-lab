import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { nativeSpeech } from '../services/nativeSpeech';
import { LiveVoiceInput } from './LiveVoiceInput';
import { RecordedVoiceInput } from './RecordedVoiceInput';
import { colors, spacing } from '../theme';

export type VoiceInputProps = {
  value: string;
  onChangeText: (text: string) => void;
  onBusyChange: (busy: boolean) => void;
  disabled?: boolean;
};

export function VoiceInput(props: VoiceInputProps) {
  if (nativeSpeech) return <LiveVoiceInput {...props} engine={nativeSpeech} />;
  return (
    <View style={styles.fallback}>
      <Text style={styles.note}>Live dictation needs the installed Rheo app. This version uses voice notes.</Text>
      <RecordedVoiceInput {...props} />
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: { gap: spacing.sm },
  note: { color: colors.muted, fontSize: 14, lineHeight: 20 },
});
