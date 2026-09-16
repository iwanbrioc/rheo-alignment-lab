import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { RecommendationAction } from '../types/decision';
import { colors, radii, spacing } from '../theme';
import { getActionLabel } from '../utils/decisionSession';
import { AppButton } from './AppButton';

type ActionCardProps = {
  action: RecommendationAction;
  index: number;
  selected?: boolean;
  onChoose?: (actionId: string) => void;
  expanded?: boolean;
  disabled?: boolean;
  onToggle?: () => void;
};

export function ActionCard({ action, index, selected = false, onChoose, expanded = false, disabled = false, onToggle }: ActionCardProps) {
  return (
    <View style={[styles.card, selected && styles.selected]}>
      <Text style={styles.kicker}>{index + 1}. {getActionLabel(action.kind)}</Text>
      <Text accessibilityRole="header" style={styles.title}>{action.title}</Text>
      <AppButton label={expanded ? 'Hide details' : 'Read this option'} accessibilityLabel={`${expanded ? 'Hide details for' : 'Read'}: ${action.title}`}
        expanded={expanded} disabled={disabled} onPress={() => onToggle?.()} variant="quiet" />
      {expanded ? <>
      <Text style={styles.action}>{action.action}</Text>
      {action.whyThisAction ? <Text style={styles.body}>{action.whyThisAction}</Text> : null}
      {action.accessCheck ? <>
        <Text style={styles.body}>{action.accessCheck.basis}</Text>
        <Text style={styles.body}>{action.accessCheck.ifUnavailable}</Text>
      </> : null}
      {action.prediction && action.accessCheck ? <>
        <Text style={styles.reconsider}>What to look for</Text>
        <Text style={styles.body}>{action.prediction.observableSignal} {action.prediction.reviewHorizon}</Text>
      </> : null}
      {action.distributionalEffect ? <>
        <Text style={styles.reconsider}>Who carries the work</Text>
        <Text style={styles.body}>{action.distributionalEffect.whoBearsBurden} {action.distributionalEffect.displacedBurden}</Text>
        <Text style={styles.body}>{action.distributionalEffect.compensatingForSystemFailure}</Text>
      </> : null}
      {action.agency ? <Text style={styles.body}>{action.agency.systemChangeNeeded}</Text> : null}
      {action.accessCheck && action.irreversibilityCaution ? <Text style={styles.reconsider}>{action.irreversibilityCaution}</Text> : null}
      {action.falsifierOrChangeSignal ? (
        <View>
          <Text style={styles.reconsider}>When to rethink</Text>
          <Text style={styles.reconsider}>{action.falsifierOrChangeSignal}</Text>
        </View>
      ) : null}
      {onChoose ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Choose ${getActionLabel(action.kind)}`}
          accessibilityState={{ selected, disabled }}
          disabled={disabled}
          onPress={() => onChoose(action.id)}
          style={({ pressed }) => [styles.chooseButton, pressed && styles.pressed]}
        >
          <Text style={styles.chooseText}>{selected ? 'Chosen' : 'Choose this'}</Text>
        </Pressable>
      ) : null}
      </> : null}
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
