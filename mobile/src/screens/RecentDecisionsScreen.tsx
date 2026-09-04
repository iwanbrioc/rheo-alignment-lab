import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AppButton } from '../components/AppButton';
import { colors, radii, spacing } from '../theme';
import type { DecisionSession } from '../types/decision';
import { describeChoice } from '../utils/decisionSession';
import { compactText, formatDateTime } from '../utils/format';

type RecentDecisionsScreenProps = {
  sessions: DecisionSession[];
  storageMessage: string | null;
  onOpen: (session: DecisionSession) => void;
  onDelete: (sessionId: string) => void;
  onBack: () => void;
};

export function RecentDecisionsScreen({
  sessions,
  storageMessage,
  onOpen,
  onDelete,
  onBack,
}: RecentDecisionsScreenProps) {
  return (
    <View style={styles.screen}>
      <Text style={styles.eyebrow}>LOCAL HISTORY</Text>
      <Text style={styles.title}>Recent decisions</Text>
      <Text style={styles.intro}>Saved only on this device. Delete anything you do not want kept here.</Text>

      {storageMessage ? <Text accessibilityLiveRegion="polite" style={styles.storageMessage}>{storageMessage}</Text> : null}

      {sessions.length === 0 ? (
        <Text style={styles.empty}>No saved decisions yet.</Text>
      ) : (
        <View style={styles.list}>
          {sessions.map((session) => (
            <View key={session.id} style={styles.row}>
              <Text style={styles.date}>{formatDateTime(session.updatedAt)}</Text>
              <Text style={styles.situation}>{compactText(session.situation, 96)}</Text>
              <Text style={styles.choice}>{compactText(describeChoice(session), 96)}</Text>
              <View style={styles.buttonRow}>
                <AppButton label="Open" onPress={() => onOpen(session)} />
                <AppButton label="Delete" onPress={() => onDelete(session.id)} variant="danger" />
              </View>
            </View>
          ))}
        </View>
      )}

      <AppButton label="Back to new decision" onPress={onBack} variant="quiet" />
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
