import React, { useState } from 'react';
import { Keyboard, StyleSheet, Text, TextInput, View } from 'react-native';
import { ActionCard } from '../components/ActionCard';
import { AppButton } from '../components/AppButton';
import { RheoBrand } from '../components/RheoBrand';
import { colors, radii, spacing } from '../theme';
import type { DecisionChoice, RecommendationSnapshot } from '../types/decision';
import type { LocalContextSnapshot } from '../types/localContext';
import { getActionLabel } from '../utils/decisionSession';

type AdviceScreenProps = {
  busy?: boolean;
  situation: string;
  areaLabel: string | null;
  localContext: LocalContextSnapshot | null;
  recommendation: RecommendationSnapshot;
  choice: DecisionChoice | null;
  customChoiceText: string;
  customChoiceVisible: boolean;
  message: string | null;
  storageMessage: string | null;
  onChooseRecommended: (actionId: string) => void;
  onShowCustomChoice: () => void;
  onCustomChoiceTextChange: (text: string) => void;
  onSaveCustomChoice: () => void;
  onChooseNotYet: () => void;
  onBackToAsk: () => void;
};

export function AdviceScreen({
  busy = false,
  situation,
  areaLabel,
  localContext,
  recommendation,
  choice,
  customChoiceText,
  customChoiceVisible,
  message,
  storageMessage,
  onChooseRecommended,
  onShowCustomChoice,
  onCustomChoiceTextChange,
  onSaveCustomChoice,
  onChooseNotYet,
  onBackToAsk,
}: AdviceScreenProps) {
  const [expandedId, setExpandedId] = useState<string | null>(choice?.kind === 'recommended' ? choice.actionId : null);
  const [showQuestion, setShowQuestion] = useState(false);
  return (
    <View style={styles.screen}>
      <View style={styles.headerRow}>
        <RheoBrand compact />
        <AppButton disabled={busy} label="Back to question" onPress={onBackToAsk} variant="quiet" />
      </View>
      <Text accessibilityRole="header" style={styles.title}>Three ways forward</Text>
      <AppButton label={showQuestion ? 'Hide your question' : 'Your question'} expanded={showQuestion}
        onPress={() => setShowQuestion(!showQuestion)} variant="quiet" />
      {showQuestion ? (
      <View style={styles.contextPanel}>
        <Text style={styles.eyebrow}>YOUR QUESTION</Text>
        <Text style={styles.situation}>{situation}</Text>
        {areaLabel ? <Text style={styles.area}>Area used: {areaLabel}</Text> : null}
        {localContext ? (
          <Text style={styles.area}>
            Nearby results: {localContext.candidates.length} to check
          </Text>
        ) : null}
      </View>
      ) : null}

      <View style={styles.cards}>
        {recommendation.language?.status === 'original' ? (
          <Text accessibilityLiveRegion="polite" style={styles.storageMessage}>Rheo could not simplify these answers. The original wording is shown.</Text>
        ) : null}
        {recommendation.actions.map((action, index) => (
          <ActionCard
            action={action}
            index={index}
            key={action.id}
            onChoose={onChooseRecommended}
            selected={choice?.kind === 'recommended' && choice.actionId === action.id}
            expanded={expandedId === action.id}
            disabled={busy}
            onToggle={() => setExpandedId(expandedId === action.id ? null : action.id)}
          />
        ))}
      </View>

      <View style={styles.choicePanel}>
        <Text accessibilityRole="header" style={styles.choiceTitle}>What will you actually do?</Text>
        <View style={styles.choiceRow}>
          <AppButton
            label="Something else"
            disabled={busy}
            onPress={onShowCustomChoice}
            selected={customChoiceVisible || choice?.kind === 'custom'}
          />
          <AppButton
            label="Not yet"
            disabled={busy}
            onPress={onChooseNotYet}
            selected={choice?.kind === 'not_yet'}
          />
        </View>
        {customChoiceVisible ? (
          <View style={styles.customBox}>
            <TextInput
              accessibilityLabel="Something else you will actually do"
              multiline
              editable={!busy}
              onChangeText={onCustomChoiceTextChange}
              onSubmitEditing={Keyboard.dismiss}
              placeholder="Write the action you will actually take..."
              returnKeyType="done"
              style={styles.customInput}
              submitBehavior="blurAndSubmit"
              textAlignVertical="top"
              value={customChoiceText}
            />
            <AppButton
              disabled={busy || !customChoiceText.trim()}
              label="Save this action"
              onPress={onSaveCustomChoice}
              variant="primary"
            />
          </View>
        ) : null}
        {choice?.kind === 'recommended' ? (
          <Text style={styles.choiceNote}>
            Chosen: {getActionLabel(recommendation.actions.find((action) => action.id === choice.actionId)?.kind || '')}
          </Text>
        ) : null}
      </View>

      {message ? <Text accessibilityLiveRegion="polite" style={styles.message}>{message}</Text> : null}
      {storageMessage ? <Text accessibilityLiveRegion="polite" style={styles.storageMessage}>{storageMessage}</Text> : null}

    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  screen: {
    gap: spacing.lg,
  },
  contextPanel: {
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing.md,
  },
  eyebrow: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 17,
    textTransform: 'uppercase',
  },
  situation: {
    color: colors.ink,
    fontSize: 16,
    lineHeight: 23,
  },
  area: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
  },
  title: {
    color: colors.ink,
    fontSize: 26,
    fontWeight: '700',
    lineHeight: 32,
  },
  intro: {
    color: colors.body,
    fontSize: 16,
    lineHeight: 23,
    marginTop: spacing.xs,
  },
  cards: {
    gap: spacing.md,
  },
  choicePanel: {
    borderTopWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
    paddingTop: spacing.lg,
  },
  choiceTitle: {
    color: colors.ink,
    fontSize: 21,
    fontWeight: '700',
    lineHeight: 27,
  },
  choiceText: {
    color: colors.body,
    fontSize: 15,
    lineHeight: 22,
  },
  choiceRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  customBox: {
    gap: spacing.md,
  },
  customInput: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    color: colors.ink,
    fontSize: 16,
    lineHeight: 23,
    minHeight: 96,
    padding: spacing.md,
  },
  choiceNote: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
  },
  message: {
    backgroundColor: '#e7ece4',
    borderRadius: radii.md,
    color: colors.body,
    fontSize: 14,
    lineHeight: 20,
    padding: spacing.md,
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
