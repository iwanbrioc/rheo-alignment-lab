import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AppButton } from '../components/AppButton';
import { RheoBrand } from '../components/RheoBrand';
import { colors, radii, spacing } from '../theme';
import type { DecisionSession } from '../types/decision';
import { describeChoice, getChosenAction } from '../utils/decisionSession';
import { formatDateTime } from '../utils/format';
import { chosenPreparationStep, latestPreparation, preparationStatus, preparationTasks } from '../utils/preparation';
import type { DecisionSaveState } from '../services/decisionSave';

type ConfirmationScreenProps = {
  saveStatus?: DecisionSaveState['status'];
  busy?: boolean;
  session: DecisionSession;
  storageMessage: string | null;
  onBackToRecommendation: () => void;
  onStartAnother: () => void;
  onDelete: () => void;
  onPrepare: () => void;
  onExplorePathway?: () => void;
  onReview?: () => void;
};

export function ConfirmationScreen({
  saveStatus = 'saved',
  busy = false,
  session,
  storageMessage,
  onBackToRecommendation,
  onStartAnother,
  onDelete,
  onPrepare,
  onExplorePathway,
  onReview,
}: ConfirmationScreenProps) {
  const chosenAction = getChosenAction(session);
  const preparation = latestPreparation(session);

  return (
    <View style={styles.screen}>
      <View style={styles.headerRow}>
        <RheoBrand compact />
        <AppButton disabled={busy} label="Back to options" onPress={onBackToRecommendation} variant="quiet" />
      </View>
      <Text accessibilityRole="header" style={styles.title}>{saveStatus === 'failed' ? 'Not saved yet' : saveStatus === 'saving' ? 'Saving your choice...' : 'Your choice is saved'}</Text>
      <Text style={styles.intro}>{saveStatus === 'failed' || saveStatus === 'saving'
        ? 'Keep this screen open until your decision is saved.'
        : 'Saved on this device. You can return to it in Recent.'}</Text>

      <View style={styles.summary}>
        <Text style={styles.label}>Your question</Text>
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

      {chosenPreparationStep(session) || preparationTasks(session).length ? (
        <View style={styles.buttonColumn}>
          <Text style={styles.choice}>{preparation ? preparationStatus(preparation) : 'Let Rheo help you get ready'}</Text>
          <Text style={styles.body}>Rheo can check public websites and write a draft. You check the text before anything is shared.</Text>
          <AppButton disabled={busy || saveStatus === 'failed'} label={preparation || !chosenPreparationStep(session) ? 'View prepared work' : 'Prepare this step'} onPress={onPrepare} />
        </View>
      ) : null}

      <View style={styles.buttonColumn}>
        {onReview ? <AppButton disabled={busy || saveStatus === 'failed'} label={session.outcomes?.length ? 'View or add a review' : 'Record what happened'} onPress={onReview} /> : null}
        {onExplorePathway ? <AppButton disabled={busy || saveStatus === 'failed'} label="Explore a pathway" onPress={onExplorePathway} /> : null}
        <AppButton disabled={busy} label="Start another decision" onPress={onStartAnother} variant="primary" />
        <AppButton disabled={busy} label="Delete this decision" onPress={onDelete} variant="danger" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    gap: spacing.lg,
  },
  headerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    justifyContent: 'space-between',
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
