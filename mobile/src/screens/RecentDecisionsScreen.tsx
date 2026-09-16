import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AppButton } from '../components/AppButton';
import { RheoBrand } from '../components/RheoBrand';
import { colors, radii, spacing } from '../theme';
import type { DecisionSession } from '../types/decision';
import { describeChoice } from '../utils/decisionSession';
import { compactText, formatDateTime } from '../utils/format';
import { latestPreparation, preparationStatus } from '../utils/preparation';

type RecentDecisionsScreenProps = {
  busy?: boolean;
  onRetry?: () => void;
  sessions: DecisionSession[];
  storageMessage: string | null;
  onOpen: (session: DecisionSession) => void;
  onDelete: (sessionId: string) => void;
  onBack: () => void;
};

export function RecentDecisionsScreen({
  busy = false,
  onRetry,
  sessions,
  storageMessage,
  onOpen,
  onDelete,
  onBack,
}: RecentDecisionsScreenProps) {
  return (
    <View style={styles.screen}>
      <View style={styles.headerRow}>
        <RheoBrand compact />
        <AppButton disabled={busy} label="Back to question" onPress={onBack} variant="quiet" />
      </View>
      <Text accessibilityRole="header" style={styles.title}>Recent decisions</Text>
      <Text style={styles.intro}>Only the latest 20 decisions are kept on this device. A new decision replaces the oldest, including its drafts and reviews.</Text>

      {storageMessage ? <Text accessibilityLiveRegion="polite" style={styles.storageMessage}>{storageMessage}</Text> : null}
      {storageMessage ? <AppButton disabled={busy} label="Retry" onPress={() => onRetry?.()} /> : null}

      {sessions.length === 0 ? (
        <Text style={styles.empty}>{storageMessage ? 'Your saved decisions are unavailable right now.' : 'No saved decisions yet.'}</Text>
      ) : (
        <View style={styles.list}>
          {sessions.map((session) => (
            <View key={session.id} style={styles.row}>
              <Text style={styles.date}>{formatDateTime(session.updatedAt)}</Text>
              {session.previousDecisionId ? <Text style={styles.choice}>New options after a review</Text> : null}
              <Text style={styles.situation}>{compactText(session.situation, 96)}</Text>
              <Text style={styles.choice}>{compactText(describeChoice(session), 96)}</Text>
              {session.outcomes?.length ? <Text style={styles.choice}>{session.outcomes.length} {session.outcomes.length === 1 ? 'review saved' : 'reviews saved'}</Text> : null}
              {latestPreparation(session) ? <Text style={styles.choice}>{preparationStatus(latestPreparation(session)!)}</Text> : null}
              <View style={styles.buttonRow}>
                <AppButton disabled={busy} label="Open" onPress={() => onOpen(session)} variant="primary" />
                <AppButton disabled={busy} label="Delete" onPress={() => onDelete(session.id)} variant="quiet" />
              </View>
            </View>
          ))}
        </View>
      )}

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
  empty: {
    color: colors.body,
    fontSize: 15,
    lineHeight: 22,
  },
  list: {
    gap: spacing.md,
  },
  row: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md,
  },
  date: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 17,
    textTransform: 'uppercase',
  },
  situation: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 22,
  },
  choice: {
    color: colors.body,
    fontSize: 14,
    lineHeight: 20,
  },
  buttonRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  storageMessage: {
    backgroundColor: '#f2e6df',
    borderRadius: radii.md,
    color: colors.warning,
    fontSize: 14,
    lineHeight: 20,
    padding: spacing.md,
  },
});
