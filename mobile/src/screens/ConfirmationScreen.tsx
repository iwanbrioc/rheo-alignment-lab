import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AppButton } from '../components/AppButton';
import { colors, radii, spacing } from '../theme';
import type { DecisionSession } from '../types/decision';
import { describeChoice, getChosenAction } from '../utils/decisionSession';
import { formatDateTime } from '../utils/format';

type ConfirmationScreenProps = {
  session: DecisionSession;
  storageMessage: string | null;
  onBackToRecommendation: () => void;
  onStartAnother: () => void;
  onDelete: () => void;
};

export function ConfirmationScreen({
  session,
  storageMessage,
  onBackToRecommendation,
  onStartAnother,
  onDelete,
}: ConfirmationScreenProps) {
  const chosenAction = getChosenAction(session);

  return (
    <View style={styles.screen}>
      <Text style={styles.eyebrow}>SAVED LOCALLY</Text>
      <Text style={styles.title}>Decision noted</Text>
      <Text style={styles.intro}>This alpha keeps the record on this device so you can revisit or delete it.</Text>

      <View style={styles.summary}>
        <Text style={styles.label}>Predicament</Text>
        <Text style={styles.body}>{session.situation}</Text>

        {session.areaLabel ? (
          <>
            <Text style={styles.label}>Area used</Text>
            <Text style={styles.body}>{session.areaLabel}</Text>
          </>
        ) : null}

        <Text style={styles.label}>Choice</Text>
        <Text style={styles.choice}>{describeChoice(session)}</Text>
        {chosenAction?.title ? <Text style={styles.body}>{chosenAction.title}</Text> : null}

        <Text style={styles.label}>Updated</Text>
        <Text style={styles.body}>{formatDateTime(session.updatedAt)}</Text>
      </View>

      {storageMessage ? <Text accessibilityLiveRegion="polite" style={styles.storageMessage}>{storageMessage}</Text> : null}

      <View style={styles.buttonColumn}>
        <AppButton label="Return to recommendation" onPress={onBackToRecommendation} />
        <AppButton label="Start another decision" onPress={onStartAnother} variant="primary" />
        <AppButton label="Delete this decision" onPress={onDelete} variant="danger" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    gap: spacing.lg,
  },
  eyebrow: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
  },
  title: {
    color: colors.ink,
    fontSize: 32,
    fontWeight: '700',
    lineHeight: 38,
  },
  intro: {
    color: colors.body,
    fontSize: 16,
    lineHeight: 23,
  },
  summary: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.lg,
  },
  label: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 17,
    marginTop: spacing.xs,
    textTransform: 'uppercase',
  },
  body: {
    color: colors.body,
    fontSize: 15,
    lineHeight: 22,
  },
  choice: {
    color: colors.ink,
    fontSize: 17,
    fontWeight: '700',
    lineHeight: 23,
  },
  storageMessage: {
    backgroundColor: '#f2e6df',
    borderRadius: radii.md,
    color: colors.warning,
    fontSize: 14,
    lineHeight: 20,
    padding: spacing.md,
  },
  buttonColumn: {
    gap: spacing.md,
  },
});
