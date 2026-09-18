import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { initialWindowMetrics, SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { getDecisionLocation, type DecisionLocation } from './src/location';
import { AdviceScreen } from './src/screens/AdviceScreen';
import { AskScreen } from './src/screens/AskScreen';
import { ConfirmationScreen } from './src/screens/ConfirmationScreen';
import { RecentDecisionsScreen } from './src/screens/RecentDecisionsScreen';
import { PreparationScreen } from './src/screens/PreparationScreen';
import { PathwaysScreen } from './src/screens/PathwaysScreen';
import { OutcomeReviewScreen } from './src/screens/OutcomeReviewScreen';
import { experimentalFlow } from './src/utils/experimental';
import type { OutcomeReview } from './src/types/experimental';
import { fetchLocalContext } from './src/services/localContextApi';
import { askRheo, type RheoStage } from './src/services/rheoApi';
import {
  deleteDecisionSession,
  listDecisionSessions,
  upsertDecisionSession,
} from './src/storage/decisionSessions';
import { colors } from './src/theme';
import { DecisionSave, type DecisionSaveState } from './src/services/decisionSave';
import { SaveNotice } from './src/components/SaveNotice';
import { BetaAccessPanel } from './src/components/BetaAccessPanel';
import { confirmDeleteDecision, confirmDiscardUnsaved } from './src/utils/confirm';
import type { DecisionChoice, DecisionSession, RecommendationSnapshot } from './src/types/decision';
import type { LocalContextSnapshot } from './src/types/localContext';
import type { PreparationTask } from './src/types/preparation';
import {
  createLocalId,
  describeChoice,
  sanitizeDecisionSessionForStorage,
} from './src/utils/decisionSession';

type Screen = 'ask' | 'advice' | 'confirmation' | 'recent' | 'preparation' | 'pathways' | 'review';
type BusyState = 'location' | 'local' | 'rheo' | 'storage' | null;

const MIN_SITUATION_LENGTH = 12;

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

export default function App() {
  const [screen, setScreen] = useState<Screen>('ask');
  const scroll = useRef<ScrollView>(null);
  const [pathwaySeed, setPathwaySeed] = useState<{ need: string; nextStep: string } | null>(null);
  const [pathwayReturn, setPathwayReturn] = useState<'ask' | 'confirmation'>('ask');
  const [situation, setSituation] = useState('');
  const [sessionId, setSessionId] = useState(() => createLocalId('decision'));
  const [createdAt, setCreatedAt] = useState(() => new Date().toISOString());
  const [updatedAt, setUpdatedAt] = useState(createdAt);
  const [preparations, setPreparations] = useState<PreparationTask[]>([]);
  const [outcomes, setOutcomes] = useState<OutcomeReview[]>([]);
  const [previousDecisionId, setPreviousDecisionId] = useState<string | undefined>();
  const [preparationSession, setPreparationSession] = useState<DecisionSession | null>(null);
  const [location, setLocation] = useState<DecisionLocation | null>(null);
  const [areaLabel, setAreaLabel] = useState<string | null>(null);
  const [localContext, setLocalContext] = useState<LocalContextSnapshot | null>(null);
  const [recommendation, setRecommendation] = useState<RecommendationSnapshot | null>(null);
  const [choice, setChoice] = useState<DecisionChoice | null>(null);
  const [customChoiceText, setCustomChoiceText] = useState('');
  const [customChoiceVisible, setCustomChoiceVisible] = useState(false);
  const [busy, setBusy] = useState<BusyState>(null);
  const [rheoStage, setRheoStage] = useState<RheoStage | null>(null);
  const rheoRequest = useRef<AbortController | null>(null);
  const localRequest = useRef<AbortController | null>(null);
  const deleting = useRef(false);
  const [saveState, setSaveState] = useState<DecisionSaveState>({ status: 'idle', pending: null, error: null });
  const [decisionSave] = useState(() => new DecisionSave(upsertDecisionSession, setSaveState));
  const [message, setMessage] = useState<string | null>(null);
  const [storageMessage, setStorageMessage] = useState<string | null>(null);
  const [recentSessions, setRecentSessions] = useState<DecisionSession[]>([]);

  const trimmedSituation = situation.trim();
  const canAsk = trimmedSituation.length >= MIN_SITUATION_LENGTH && busy === null && saveState.status !== 'saving';

  const refreshRecentSessions = useCallback(async () => {
    const sessions = await listDecisionSessions();
    setRecentSessions(sessions);
  }, []);

  useEffect(() => {
    void refreshRecentSessions().catch(() => setStorageMessage('Saved history could not be loaded. Please try opening Recent again.'));
    return () => { rheoRequest.current?.abort(); localRequest.current?.abort(); };
  }, [refreshRecentSessions]);

  const buildCurrentSession = useCallback((
    nextRecommendation: RecommendationSnapshot | null,
    nextChoice: DecisionChoice | null,
    nextUpdatedAt = updatedAt,
  ): DecisionSession => sanitizeDecisionSessionForStorage({
    id: sessionId,
    createdAt,
    updatedAt: nextUpdatedAt,
    situation: trimmedSituation,
    locationUsed: Boolean(areaLabel || localContext),
    areaLabel,
    localContext,
    recommendation: nextRecommendation,
    choice: nextChoice,
    researchArm: null,
    preparations,
    outcomes,
    previousDecisionId,
  }), [areaLabel, createdAt, localContext, preparations, outcomes, previousDecisionId, sessionId, trimmedSituation, updatedAt]);

  const currentSession = useMemo(() => {
    if (!recommendation) return null;
    return buildCurrentSession(recommendation, choice);
  }, [buildCurrentSession, choice, recommendation]);

  async function persistSession(session: DecisionSession): Promise<boolean> {
    const saved = await decisionSave.save(session);
    if (saved) {
      setUpdatedAt(session.updatedAt);
      void refreshHistory();
    }
    return saved;
  }

  async function refreshHistory() {
    try { await refreshRecentSessions(); setStorageMessage(null); }
    catch { setStorageMessage('Saved decisions could not be loaded. Tap Retry to try again.'); }
  }

  async function retrySave() {
    const pending = decisionSave.state.pending;
    if (!pending || decisionSave.state.status !== 'failed') return;
    await persistSession(pending);
  }

  async function leaveDecision(action: () => void) {
    if (decisionSave.state.status === 'saving' || deleting.current) return;
    if (decisionSave.state.status === 'failed' && !await confirmDiscardUnsaved()) return;
    decisionSave.reset();
    action();
  }

  function beginFreshDecision(initialText = '') {
    decisionSave.reset();
    setSessionId(createLocalId('decision'));
    setCreatedAt(new Date().toISOString());
    setUpdatedAt(new Date().toISOString());
    setPreparations([]);
    setOutcomes([]);
    setPreviousDecisionId(undefined);
    setPreparationSession(null);
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
      setUpdatedAt(new Date().toISOString());
      setPreparations([]);
      setRecommendation(null);
      setChoice(null);
      setCustomChoiceText('');
      setCustomChoiceVisible(false);
      setLocalContext(null);
      setMessage('Your question changed, so the earlier options were cleared.');
      setScreen('ask');
      return;
    }

    if (localContext) {
      setLocalContext(null);
      setMessage('Your question changed, so the earlier nearby results were cleared.');
    }
  }

  async function handleLookAround() {
    if (!canAsk || localRequest.current) return;
    const controller = new AbortController();
    localRequest.current = controller;
    setMessage(null);
    setStorageMessage(null);
    setRecommendation(null);
    setChoice(null);
    setCustomChoiceVisible(false);
    setCustomChoiceText('');

    let nextLocation: DecisionLocation;
    try {
      setBusy('location');
      nextLocation = await getDecisionLocation(controller.signal);
      if (controller.signal.aborted) return;
      setLocation(nextLocation);
      setAreaLabel(nextLocation.areaLabel || 'Approximate area captured');
    } catch (error) {
      if (controller.signal.aborted) return;
      setMessage(errorMessage(error, 'Location lookup was not available. Rheo can still work without local context.'));
      setBusy(null);
      localRequest.current = null;
      return;
    }

    try {
      setBusy('local');
      const context = await fetchLocalContext(trimmedSituation, nextLocation, controller.signal);
      if (controller.signal.aborted) return;
      setLocalContext(context);
      setAreaLabel(context.areaLabel || nextLocation.areaLabel || 'Approximate area captured');
      setMessage(context.candidates.length
        ? 'Local possibilities are ready. Treat them as evidence to check, not endorsements.'
        : context.warnings[0] || 'No local possibilities came back. You can still ask Rheo.');
    } catch (error) {
      if (controller.signal.aborted) return;
      setLocalContext(null);
      setMessage(`${errorMessage(error, 'Local search failed.')} You can still ask Rheo without local evidence.`);
    } finally {
      if (localRequest.current === controller) { localRequest.current = null; setBusy(null); }
    }
  }

  function stopLocalSearch() {
    localRequest.current?.abort();
    localRequest.current = null;
    setBusy(null);
    setLocation(null);
    setAreaLabel(null);
    setLocalContext(null);
    setMessage('Search stopped. You can ask Rheo without your area.');
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
    if (!canAsk || rheoRequest.current) return;
    const controller = new AbortController();
    rheoRequest.current = controller;
    setBusy('rheo');
    setMessage(null);
    setStorageMessage(null);
    setChoice(null);
    setCustomChoiceText('');
    setCustomChoiceVisible(false);

    try {
      const nextRecommendation = await askRheo(trimmedSituation, location, localContext, { signal: controller.signal, onStage: setRheoStage });
      if (controller.signal.aborted) return;
      rheoRequest.current = null;
      setBusy('storage');
      setRecommendation(nextRecommendation);
      setOutcomes([]);
      const session = { ...buildCurrentSession(nextRecommendation, null, new Date().toISOString()), outcomes: [] };
      await persistSession(session);
      setScreen('advice');
    } catch (error) {
      setMessage(errorMessage(error, 'Rheo could not complete this decision.'));
    } finally {
      rheoRequest.current = null;
      setRheoStage(null);
      setBusy(null);
    }
  }

  async function saveChoice(nextChoice: DecisionChoice) {
    if (!recommendation || decisionSave.state.status === 'saving') return;
    const session = buildCurrentSession(recommendation, nextChoice, new Date().toISOString());
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
    if (!currentSession || deleting.current || decisionSave.state.status === 'saving') return;
    deleting.current = true;
    if (!await confirmDeleteDecision()) { deleting.current = false; return; }
    setBusy('storage');
    try {
      await deleteDecisionSession(currentSession.id);
      setRecentSessions((sessions) => sessions.filter((session) => session.id !== currentSession.id));
      beginFreshDecision();
      setMessage('Saved decision deleted.');
      await refreshHistory();
    } catch (error) {
      setStorageMessage(errorMessage(error, 'Rheo could not delete this decision.'));
    } finally {
      deleting.current = false;
      setBusy(null);
    }
  }

  async function handleDeleteRecentDecision(id: string) {
    if (deleting.current || decisionSave.state.status === 'saving') return;
    deleting.current = true;
    if (!await confirmDeleteDecision()) { deleting.current = false; return; }
    setBusy('storage');
    try {
      await deleteDecisionSession(id);
      setRecentSessions((sessions) => sessions.filter((session) => session.id !== id));
      await refreshHistory();
    } catch (error) {
      setStorageMessage(errorMessage(error, 'Rheo could not delete that decision.'));
    } finally {
      deleting.current = false;
      setBusy(null);
    }
  }

  function handleOpenSession(session: DecisionSession) {
    setSessionId(session.id);
    setCreatedAt(session.createdAt);
    setUpdatedAt(session.updatedAt);
    setPreparations(session.preparations || []);
    setOutcomes(session.outcomes || []);
    setPreviousDecisionId(session.previousDecisionId);
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
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
    <SafeAreaView style={styles.root}>
      <StatusBar style="dark" />
      <ScrollView
        ref={scroll}
        key={screen}
        contentInsetAdjustmentBehavior="never"
        automaticallyAdjustKeyboardInsets
        contentContainerStyle={styles.content}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
      >
        <SaveNotice state={saveState} onRetry={() => { void retrySave(); }} />
        {screen === 'ask' ? <BetaAccessPanel disabled={busy !== null || saveState.status === 'saving'} /> : null}
        {screen === 'ask' ? (
          <AskScreen
            areaLabel={areaLabel}
            busy={saveState.status === 'saving' ? 'storage' : busy}
            rheoStage={rheoStage}
            onCancelRheo={() => rheoRequest.current?.abort()}
            onCancelLocal={stopLocalSearch}
            canAsk={canAsk}
            localContext={localContext}
            message={message}
            onAskRheo={handleAskRheo}
            onLookAround={handleLookAround}
            onOpenRecent={() => { setScreen('recent'); void refreshHistory(); }}
            onOpenPathways={() => { void leaveDecision(() => { setPathwaySeed(null); setPathwayReturn('ask'); setScreen('pathways'); }); }}
            onRemoveLocalContext={handleRemoveLocalContext}
            onSituationChange={handleSituationChange}
            recentCount={recentSessions.length}
            situation={situation}
            storageMessage={storageMessage}
          />
        ) : null}

        {screen === 'advice' && recommendation ? (
          <AdviceScreen
            busy={saveState.status === 'saving'}
            areaLabel={areaLabel}
            choice={choice}
            customChoiceText={customChoiceText}
            customChoiceVisible={customChoiceVisible}
            localContext={localContext}
            message={message}
            onBackToAsk={() => { void leaveDecision(() => {
              beginFreshDecision(situation);
            }); }}
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
            saveStatus={saveState.status}
            busy={busy === 'storage' || saveState.status === 'saving'}
            onBackToRecommendation={() => setScreen('advice')}
            onDelete={handleDeleteCurrentDecision}
            onStartAnother={() => { void leaveDecision(() => beginFreshDecision()); }}
            onPrepare={() => { setPreparationSession(currentSession); setScreen('preparation'); }}
            onReview={experimentalFlow(currentSession.recommendation?.flow) ? () => setScreen('review') : undefined}
            onExplorePathway={() => {
              setPathwaySeed({ need: currentSession.situation.slice(0, 1500),
                nextStep: currentSession.choice && currentSession.choice.kind !== 'not_yet' ? describeChoice(currentSession).slice(0, 1500) : '' });
              setPathwayReturn('confirmation'); setScreen('pathways');
            }}
            session={currentSession}
            storageMessage={storageMessage}
          />
        ) : null}

        {screen === 'preparation' && preparationSession ? (
          <PreparationScreen
            session={preparationSession}
            onBack={() => setScreen('confirmation')}
            onSaved={(saved) => {
              setPreparationSession(saved);
              setPreparations(saved.preparations || []);
              setUpdatedAt(saved.updatedAt);
              void refreshRecentSessions().catch(() => setStorageMessage('Preparation saved, but history could not refresh.'));
            }}
          />
        ) : null}

        {screen === 'pathways' ? <PathwaysScreen seed={pathwaySeed}
          backLabel={pathwayReturn === 'confirmation' ? 'Back to choice' : 'Back to question'}
          onViewChange={() => scroll.current?.scrollTo({ y: 0, animated: false })}
          onBack={() => setScreen(pathwayReturn)} /> : null}

        {screen === 'review' && currentSession ? <OutcomeReviewScreen session={currentSession}
          onBack={() => setScreen('confirmation')}
          onSaved={(saved) => { setOutcomes(saved.outcomes || []); setUpdatedAt(saved.updatedAt); void refreshHistory(); }}
          onNewDecision={(saved) => { handleOpenSession(saved); void refreshHistory(); }} /> : null}

        {screen === 'recent' ? (
          <RecentDecisionsScreen
            busy={busy === 'storage' || saveState.status === 'saving'}
            onRetry={() => { void refreshHistory(); }}
            onBack={() => setScreen('ask')}
            onDelete={handleDeleteRecentDecision}
            onOpen={(session) => { void leaveDecision(() => handleOpenSession(session)); }}
            sessions={recentSessions}
            storageMessage={storageMessage}
          />
        ) : null}
      </ScrollView>
    </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: colors.background,
    flex: 1,
  },
  content: {
    gap: 18,
    paddingBottom: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
});
