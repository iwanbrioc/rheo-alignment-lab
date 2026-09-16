import React, { useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { AppButton } from '../components/AppButton';
import { LocalCandidateCard } from '../components/LocalCandidateCard';
import { VoiceInput } from '../components/VoiceInput';
import { RheoBrand } from '../components/RheoBrand';
import { colors, radii, spacing } from '../theme';
import type { LocalContextSnapshot } from '../types/localContext';
import { formatDateTime } from '../utils/format';
import type { RheoStage } from '../services/rheoApi';

type AskScreenProps = {
  situation: string;
  areaLabel: string | null;
  localContext: LocalContextSnapshot | null;
  busy: 'location' | 'local' | 'rheo' | 'storage' | null;
  message: string | null;
  storageMessage: string | null;
  recentCount: number;
  canAsk: boolean;
  onSituationChange: (text: string) => void;
  onLookAround: () => void;
  onRemoveLocalContext: () => void;
  onAskRheo: () => void;
  onOpenRecent: () => void;
  onOpenPathways?: () => void;
  rheoStage?: RheoStage | null;
  onCancelRheo?: () => void;
  onCancelLocal?: () => void;
};

export function AskScreen({
  situation,
  areaLabel,
  localContext,
  busy,
  message,
  storageMessage,
  recentCount,
  canAsk,
  onSituationChange,
  onLookAround,
  onRemoveLocalContext,
  onAskRheo,
  onOpenRecent,
  onOpenPathways,
  rheoStage,
  onCancelRheo,
  onCancelLocal,
}: AskScreenProps) {
  const [voiceBusy, setVoiceBusy] = useState(false);
  const [showPlaces, setShowPlaces] = useState(false);
  const inputBusy = busy !== null || voiceBusy;
  const hasEnoughSituation = situation.trim().length >= 12;
  const canLookAround = hasEnoughSituation && !inputBusy;
  const showLocalStatus = areaLabel || localContext;

  return (
    <View style={styles.screen}>
      <View style={styles.headerRow}>
        <RheoBrand />
        <AppButton disabled={inputBusy} label={recentCount ? `Recent (${recentCount})` : 'Recent'} onPress={onOpenRecent} variant="quiet" />
      </View>
      {onOpenPathways ? <AppButton label="My pathways" disabled={inputBusy} onPress={onOpenPathways} variant="quiet" /> : null}
      <Text style={styles.title}>What are you trying to work out?</Text>
      <Text style={styles.intro}>
        Your words, your decision. Location is optional.
      </Text>

      <VoiceInput
        disabled={busy !== null}
        onChangeText={onSituationChange}
        onBusyChange={setVoiceBusy}
        value={situation}
      />

      {message ? <Text accessibilityLiveRegion="polite" style={styles.message}>{message}</Text> : null}
      {storageMessage ? <Text accessibilityLiveRegion="polite" style={styles.storageMessage}>{storageMessage}</Text> : null}
      <AppButton
        disabled={busy === 'rheo' ? !onCancelRheo : busy === 'location' || busy === 'local' ? !onCancelLocal : !canAsk || inputBusy}
        label={busy === 'rheo' ? 'Stop' : busy === 'location' || busy === 'local' ? 'Stop search' : busy === 'storage' ? 'Saving...' : 'Ask Rheo'}
        onPress={busy === 'rheo' ? () => onCancelRheo?.() : busy === 'location' || busy === 'local' ? () => onCancelLocal?.() : onAskRheo}
        variant="primary"
      />
      {busy === 'rheo' ? (
        <Text accessibilityLiveRegion="polite" style={styles.loadingText}>
          {rheoStage === 'wording' ? 'Making the wording clear...' : rheoStage === 'options' ? 'Finding three ways forward...' : 'Thinking about your question...'}
        </Text>
      ) : null}
      {!hasEnoughSituation ? <Text style={styles.hint}>Say or write a little more so Rheo has enough context.</Text> : null}

      <View style={styles.localPanel}>
        <View style={styles.localCopy}>
          <Text style={styles.panelTitle}>Nearby places (optional)</Text>
          <Text style={styles.panelText}>
            Share your approximate area to find nearby places. You will still need to check that they suit you.
          </Text>
        </View>
        <View style={styles.buttonRow}>
          <AppButton
            disabled={!canLookAround}
            label={busy === 'location' || busy === 'local' ? 'Looking...' : 'Look around me'}
            onPress={onLookAround}
            variant="secondary"
          />
          {showLocalStatus ? (
            <AppButton disabled={inputBusy} label="Remove area" onPress={() => { setShowPlaces(false); onRemoveLocalContext(); }} variant="quiet" />
          ) : null}
        </View>
      </View>

      {busy === 'location' || busy === 'local' ? (
        <View
          accessibilityLabel="Looking for local possibilities"
          accessibilityLiveRegion="polite"
          style={styles.loadingRow}
        >
          <ActivityIndicator />
          <Text style={styles.loadingText}>Looking for local possibilities...</Text>
        </View>
      ) : null}

      {areaLabel ? (
        <View accessibilityLabel={`Approximate area: ${areaLabel}`} style={styles.areaPanel}>
          <Text style={styles.areaLabel}>Approximate area</Text>
          <Text style={styles.areaText}>{areaLabel}</Text>
          <Text style={styles.privacyText}>Foreground only. No background tracking. Raw coordinates are not saved.</Text>
        </View>
      ) : null}

      {localContext ? (
        <View style={styles.section}>
          <AppButton label={showPlaces ? 'Hide nearby results' : `Nearby results (${localContext.candidates.length})`}
            expanded={showPlaces} onPress={() => setShowPlaces(!showPlaces)} variant="quiet" />
          {showPlaces ? <>
          <View>
            <Text style={styles.sectionTitle}>Possibilities to check</Text>
            <Text style={styles.sectionNote}>
              Retrieved {formatDateTime(localContext.retrievedAt)}
              {localContext.provider ? ` from ${localContext.provider}` : ''}. These are not recommendations.
            </Text>
          </View>
          {localContext.candidates.length === 0 ? (
            <Text style={styles.emptyText}>No nearby places were found. You can still ask Rheo.</Text>
          ) : (
            localContext.candidates.map((candidate) => (
              <LocalCandidateCard candidate={candidate} key={candidate.id} />
            ))
          )}
          {localContext.attribution ? <Text style={styles.attribution}>{localContext.attribution}</Text> : null}
          </> : null}
          {localContext.warnings.map((warning) => (
            <Text key={warning} style={styles.warningText}>{warning}</Text>
          ))}
        </View>
      ) : null}
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
  title: {
    color: colors.ink,
    fontSize: 26,
    fontWeight: '700',
    lineHeight: 32,
  },
  intro: {
    color: colors.body,
    fontSize: 17,
    lineHeight: 25,
  },
  localPanel: {
    borderTopWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
    paddingTop: spacing.lg,
  },
  localCopy: {
    gap: spacing.xs,
  },
  panelTitle: {
    color: colors.ink,
    fontSize: 17,
    fontWeight: '700',
    lineHeight: 22,
  },
  panelText: {
    color: colors.body,
    fontSize: 15,
    lineHeight: 22,
  },
  buttonRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  loadingRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  loadingText: {
    color: colors.body,
    fontSize: 14,
    lineHeight: 20,
  },
  areaPanel: {
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing.md,
  },
  areaLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 17,
    textTransform: 'uppercase',
  },
  areaText: {
    color: colors.ink,
    fontSize: 17,
    fontWeight: '700',
    lineHeight: 22,
  },
  privacyText: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
  },
  section: {
    gap: spacing.md,
  },
  sectionTitle: {
    color: colors.ink,
    fontSize: 22,
    fontWeight: '700',
    lineHeight: 28,
  },
  sectionNote: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
    marginTop: spacing.xs,
  },
  emptyText: {
    color: colors.body,
    fontSize: 15,
    lineHeight: 22,
  },
  warningText: {
    color: colors.warning,
    fontSize: 13,
    lineHeight: 19,
  },
  attribution: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 17,
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
  hint: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },
});
