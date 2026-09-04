import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { RecommendationAction } from '../types/decision';
import { colors, radii, spacing } from '../theme';
import { getActionLabel } from '../utils/decisionSession';

type ActionCardProps = {
  action: RecommendationAction;
  index: number;
  selected?: boolean;
  onChoose?: (actionId: string) => void;
};

export function ActionCard({ action, index, selected = false, onChoose }: ActionCardProps) {
  return (
    <View style={[styles.card, selected && styles.selected]}>
      <Text style={styles.kicker}>{index + 1}. {getActionLabel(action.kind)}</Text>
      <Text style={styles.title}>{action.title}</Text>
      <Text style={styles.action}>{action.action}</Text>
      {action.whyThisAction ? <Text style={styles.body}>{action.whyThisAction}</Text> : null}
      {action.falsifierOrChangeSignal ? (
        <Text style={styles.reconsider}>Reconsider if: {action.falsifierOrChangeSignal}</Text>
      ) : null}
      {onChoose ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Choose ${getActionLabel(action.kind)}`}
          accessibilityState={{ selected }}
          onPress={() => onChoose(action.id)}
          style={({ pressed }) => [styles.chooseButton, pressed && styles.pressed]}
        >
          <Text style={styles.chooseText}>{selected ? 'Chosen' : 'Choose this'}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.lg,
  },
  selected: {
    borderColor: colors.primary,
    borderWidth: 2,
  },
  kicker: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
    textTransform: 'uppercase',
  },
  title: {
    color: colors.ink,
    fontSize: 19,
    fontWeight: '700',
    lineHeight: 24,
  },
  action: {
    color: colors.ink,
    fontSize: 16,
    lineHeight: 23,
  },
  body: {
    color: colors.body,
    fontSize: 15,
    lineHeight: 22,
  },
  reconsider: {
    color: colors.warning,
    fontSize: 14,
    lineHeight: 20,
  },
  chooseButton: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderColor: colors.primary,
    borderRadius: radii.button,
    borderWidth: 1,
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  chooseText: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.65,
  },
});
