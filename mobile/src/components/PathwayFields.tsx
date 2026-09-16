import React from 'react';
import { Keyboard, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { colors, radii, spacing } from '../theme';
import type { PathwayStatus } from '../types/pathway';
import { PATHWAY_STATUS } from '../utils/pathway';

export function PathwayField({ label, value, onChange, disabled = false, required = false }: {
  label: string; value: string; onChange: (value: string) => void; disabled?: boolean; required?: boolean;
}) {
  return <View style={styles.field}>
    <Text style={styles.label}>{label}{required ? '' : ' (optional)'}</Text>
    <TextInput accessibilityLabel={label} editable={!disabled} multiline maxLength={1500}
      value={value} onChangeText={onChange} style={styles.input} textAlignVertical="top"
      returnKeyType="done" submitBehavior="blurAndSubmit" onSubmitEditing={Keyboard.dismiss} />
  </View>;
}

export function PathwayStatusPicker({ value, onChange, disabled }: {
  value: PathwayStatus; onChange: (value: PathwayStatus) => void; disabled: boolean;
}) {
  return <View accessibilityRole="radiogroup" accessibilityLabel="Where this pathway stands" style={styles.field}>
    {(Object.entries(PATHWAY_STATUS) as [PathwayStatus, string][]).map(([key, label]) => (
      <Pressable key={key} accessibilityRole="radio" accessibilityLabel={label}
        accessibilityState={{ checked: value === key, disabled }} disabled={disabled}
        onPress={() => { Keyboard.dismiss(); onChange(key); }} style={styles.radioRow}>
        <View style={styles.radio}>{value === key ? <View style={styles.dot} /> : null}</View>
        <Text style={styles.radioText}>{label}</Text>
      </Pressable>
    ))}
  </View>;
}

const styles = StyleSheet.create({
  field: { gap: spacing.sm },
  label: { color: colors.ink, fontSize: 16, lineHeight: 23, fontWeight: '600' },
  input: { color: colors.ink, backgroundColor: colors.surface, borderColor: colors.border,
    borderWidth: 1, borderRadius: radii.md, padding: spacing.md, minHeight: 84, fontSize: 16, lineHeight: 24 },
  radioRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 44 },
  radioText: { color: colors.ink, fontSize: 16, lineHeight: 23, flex: 1 },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: colors.primary,
    alignItems: 'center', justifyContent: 'center' },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary },
});
