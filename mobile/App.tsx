import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { getDecisionLocation, type DecisionLocation } from './src/location';
import { AdviceScreen } from './src/screens/AdviceScreen';
import { AskScreen } from './src/screens/AskScreen';
import { ConfirmationScreen } from './src/screens/ConfirmationScreen';
import { RecentDecisionsScreen } from './src/screens/RecentDecisionsScreen';
import { fetchLocalContext } from './src/services/localContextApi';
import { askRheo } from './src/services/rheoApi';
import {
  deleteDecisionSession,
  listDecisionSessions,
  upsertDecisionSession,
} from './src/storage/decisionSessions';
import { colors } from './src/theme';
import type { DecisionChoice, DecisionSession, RecommendationSnapshot } from './src/types/decision';
import type { LocalContextSnapshot } from './src/types/localContext';
import {
  createLocalId,
  sanitizeDecisionSessionForStorage,
} from './src/utils/decisionSession';

type Screen = 'ask' | 'advice' | 'confirmation' | 'recent';
type BusyState = 'location' | 'local' | 'rheo' | 'storage' | null;

const MIN_SITUATION_LENGTH = 12;

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

export default function App() {
  const [screen, setScreen] = useState<Screen>('ask');
  const [situation, setSituation] = useState('');
  const [sessionId, setSessionId] = useState(() => createLocalId('decision'));
  const [createdAt, setCreatedAt] = useState(() => new Date().toISOString());
  const [location, setLocation] = useState<DecisionLocation | null>(null);
  const [areaLabel, setAreaLabel] = useState<string | null>(null);
  const [localContext, setLocalContext] = useState<LocalContextSnapshot | null>(null);
  const [recommendation, setRecommendation] = useState<RecommendationSnapshot | null>(null);
  const [choice, setChoice] = useState<DecisionChoice | null>(null);
  const [customChoiceText, setCustomChoiceText] = useState('');
  const [customChoiceVisible, setCustomChoiceVisible] = useState(false);
  const [busy, setBusy] = useState<BusyState>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [storageMessage, setStorageMessage] = useState<string | null>(null);
  const [recentSessions, setRecentSessions] = useState<DecisionSession[]>([]);

  const trimmedSituation = situation.trim();
  const canAsk = trimmedSituation.length >= MIN_SITUATION_LENGTH && busy === null;

  const refreshRecentSessions = useCallback(async () => {
    const sessions = await listDecisionSessions();
    setRecentSessions(sessions);
  }, []);

  useEffect(() => {
    void refreshRecentSessions();
  }, [refreshRecentSessions]);

  const buildCurrentSession = useCallback((
    nextRecommendation: RecommendationSnapshot | null,
    nextChoice: DecisionChoice | null,
    updatedAt = new Date().toISOString(),
  ): DecisionSession => sanitizeDecisionSessionForStorage({
    id: sessionId,
    createdAt,
    updatedAt,
    situation: trimmedSituation,
    locationUsed: Boolean(areaLabel || localContext),
    areaLabel,
    localContext,
    recommendation: nextRecommendation,
    choice: nextChoice,
    researchArm: null,
  }), [areaLabel, createdAt, localContext, sessionId, trimmedSituation]);

  const currentSession = useMemo(() => {
    if (!recommendation) return null;
    return buildCurrentSession(recommendation, choice);
  }, [buildCurrentSession, choice, recommendation]);

  async function persistSession(session: DecisionSession): Promise<void> {
    try {
      await upsertDecisionSession(session);
      await refreshRecentSessions();
      setStorageMessage(null);
    } catch (error) {
      setStorageMessage(errorMessage(error, 'Rheo could not save this decision locally.'));
    }
  }

  function beginFreshDecision(initialText = '') {
    setSessionId(createLocalId('decision'));
    setCreatedAt(new Date().toISOString());
    setSituation(initialText);
    setLocation(null);
    setAreaLabel(null);
    setLocalContext(null);
    setRecommendation(null);
    setChoice(null);
    setCustomChoiceText('');
    setCustomChoiceVisible(false);
    setMessage(null);
    setScreen('ask');
  }

  function handleSituationChange(text: string) {
    const changed = text.trim() !== trimmedSituation;
    setSituation(text);

    if (!changed) return;

    if (recommendation || choice) {
      setSessionId(createLocalId('decision'));
      setCreatedAt(new Date().toISOString());
      setRecommendation(null);
      setChoice(null);
      setCustomChoiceText('');
      setCustomChoiceVisible(false);
      setLocalContext(null);
      setMessage('I cleared the previous recommendation because the predicament changed.');
      setScreen('ask');
      return;
    }

    if (localContext) {
      setLocalContext(null);
      setMessage('I cleared the local possibilities because the predicament changed.');
    }
  }

  async function handleLookAround() {
    if (!canAsk) return;
    setMessage(null);
    setStorageMessage(null);
    setRecommendation(null);
    setChoice(null);
    setCustomChoiceVisible(false);
    setCustomChoiceText('');

    let nextLocation: DecisionLocation;
    try {
      setBusy('location');
      nextLocation = await getDecisionLocation();
      setLocation(nextLocation);
      setAreaLabel(nextLocation.areaLabel || 'Approximate area captured');
    } catch (error) {
      setMessage(errorMessage(error, 'Location lookup was not available. Rheo can still work without local context.'));
      setBusy(null);
      return;
    }

    try {
      setBusy('local');
      const context = await fetchLocalContext(trimmedSituation, nextLocation);
      setLocalContext(context);
      setAreaLabel(context.areaLabel || nextLocation.areaLabel || 'Approximate area captured');
      setMessage(context.candidates.length
        ? 'Local possibilities are ready. Treat them as evidence to check, not endorsements.'
        : context.warnings[0] || 'No local possibilities came back. You can still ask Rheo.');
    } catch (error) {
      setLocalContext(null);
      setMessage(`${errorMessage(error, 'Local search failed.')} You can still ask Rheo without local evidence.`);
    } finally {
      setBusy(null);
    }
  }

  function handleRemoveLocalContext() {
    setLocation(null);
    setAreaLabel(null);
    setLocalContext(null);
    setRecommendation(null);
    setChoice(null);
    setMessage('Local context removed from this decision.');
  }

  async function handleAskRheo() {
    if (!canAsk) return;
    setBusy('rheo');
    setMessage(null);
    setStorageMessage(null);
    setChoice(null);
    setCustomChoiceText('');
    setCustomChoiceVisible(false);

    try {
      const nextRecommendation = await askRheo(trimmedSituation, location, localContext);
      setRecommendation(nextRecommendation);
      const session = buildCurrentSession(nextRecommendation, null);
      await persistSession(session);
      setScreen('advice');
    } catch (error) {
      setMessage(errorMessage(error, 'Rheo could not complete this decision.'));
    } finally {
      setBusy(null);
    }
  }

  async function saveChoice(nextChoice: DecisionChoice) {
    if (!recommendation) return;
    const session = buildCurrentSession(recommendation, nextChoice);
    setChoice(nextChoice);
    await persistSession(session);
    setMessage(null);
    setScreen('confirmation');
  }

  async function handleChooseRecommended(actionId: string) {
    await saveChoice({
      kind: 'recommended',
      actionId,
      capturedAt: new Date().toISOString(),
    });
  }

  function handleShowCustomChoice() {
    setCustomChoiceVisible(true);
    setMessage(null);
  }

  async function handleSaveCustomChoice() {
    const text = customChoiceText.trim();
    if (!text) {
      setMessage('Write the action you will actually take, or choose Not yet.');
      return;
    }

    await saveChoice({
      kind: 'custom',
      text,
      capturedAt: new Date().toISOString(),
    });
  }

  async function handleChooseNotYet() {
    await saveChoice({
      kind: 'not_yet',
      capturedAt: new Date().toISOString(),
    });
  }

  async function handleDeleteCurrentDecision() {
    if (!currentSession) return;
    setBusy('storage');
    try {
      await deleteDecisionSession(currentSession.id);
      await refreshRecentSessions();
      setStorageMessage(null);
      beginFreshDecision();
      setMessage('Saved decision deleted.');
    } catch (error) {
      setStorageMessage(errorMessage(error, 'Rheo could not delete this decision.'));
    } finally {
      setBusy(null);
    }
  }

  async function handleDeleteRecentDecision(id: string) {
    setBusy('storage');
    try {
      await deleteDecisionSession(id);
      await refreshRecentSessions();
      setStorageMessage(null);
    } catch (error) {
      setStorageMessage(errorMessage(error, 'Rheo could not delete that decision.'));
    } finally {
      setBusy(null);
    }
  }

  function handleOpenSession(session: DecisionSession) {
    setSessionId(session.id);
    setCreatedAt(session.createdAt);
    setSituation(session.situation);
    setLocation(null);
    setAreaLabel(session.areaLabel);
    setLocalContext(session.localContext);
    setRecommendation(session.recommendation);
    setChoice(session.choice);
    setCustomChoiceText(session.choice?.kind === 'custom' ? session.choice.text : '');
    setCustomChoiceVisible(session.choice?.kind === 'custom');
    setMessage(null);
    setStorageMessage(null);
    setScreen(session.choice ? 'confirmation' : session.recommendation ? 'advice' : 'ask');
  }

  return (
    <View style={styles.root}>
      <StatusBar style="auto" />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {screen === 'ask' ? (
          <AskScreen
            areaLabel={areaLabel}
            busy={busy}
            canAsk={canAsk}
            localContext={localContext}
            message={message}
            onAskRheo={handleAskRheo}
            onLookAround={handleLookAround}
            onOpenRecent={() => setScreen('recent')}
            onRemoveLocalContext={handleRemoveLocalContext}
            onSituationChange={handleSituationChange}
            recentCount={recentSessions.length}
            situation={situation}
            storageMessage={storageMessage}
          />
        ) : null}

        {screen === 'advice' && recommendation ? (
          <AdviceScreen
            areaLabel={areaLabel}
            choice={choice}
            customChoiceText={customChoiceText}
            customChoiceVisible={customChoiceVisible}
            localContext={localContext}
            message={message}
            onBackToAsk={() => {
              setMessage(null);
              setScreen('ask');
            }}
            onChooseNotYet={handleChooseNotYet}
            onChooseRecommended={handleChooseRecommended}
            onCustomChoiceTextChange={setCustomChoiceText}
            onSaveCustomChoice={handleSaveCustomChoice}
            onShowCustomChoice={handleShowCustomChoice}
            recommendation={recommendation}
            situation={trimmedSituation}
            storageMessage={storageMessage}
          />
        ) : null}

        {screen === 'confirmation' && currentSession ? (
          <ConfirmationScreen
            onBackToRecommendation={() => setScreen('advice')}
            onDelete={handleDeleteCurrentDecision}
            onStartAnother={() => beginFreshDecision()}
            session={currentSession}
            storageMessage={storageMessage}
          />
        ) : null}

        {screen === 'recent' ? (
          <RecentDecisionsScreen
            onBack={() => setScreen('ask')}
            onDelete={handleDeleteRecentDecision}
            onOpen={handleOpenSession}
            sessions={recentSessions}
            storageMessage={storageMessage}
          />
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: colors.background,
    flex: 1,
  },
  content: {
    gap: 18,
    paddingBottom: 48,
    paddingHorizontal: 20,
    paddingTop: 58,
  },
});
