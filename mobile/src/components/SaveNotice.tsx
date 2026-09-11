import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AppButton } from './AppButton';
import type { DecisionSaveState } from '../services/decisionSave';
import { colors, spacing } from '../theme';

export function SaveNotice({ state, onRetry }: { state: DecisionSaveState; onRetry: () => void }) {
  if (state.status !== 'failed' && state.status !== 'saving') return null;
  return (
    <View style={styles.notice}>
      <Text accessibilityRole="alert" style={styles.text}>
        {state.status === 'saving' ? 'Saving your decision...' : state.error}
      </Text>
      {state.status === 'failed' ? <AppButton label="Try saving again" onPress={onRetry} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  notice: { gap: spacing.sm, borderLeftWidth: 3, borderColor: colors.warning, paddingLeft: spacing.md },
  text: { color: colors.warning, fontSize: 15, lineHeight: 22 },
});
