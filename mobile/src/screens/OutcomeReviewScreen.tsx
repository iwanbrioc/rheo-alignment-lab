import React, { useEffect, useRef, useState } from 'react';
import { Alert, AppState, BackHandler, Keyboard, StyleSheet, Text, TextInput, View } from 'react-native';
import { AppButton } from '../components/AppButton';
import { RheoBrand } from '../components/RheoBrand';
import { askExperimental } from '../services/experimentalApi';
import { saveOutcomeReview, upsertDecisionSession } from '../storage/decisionSessions';
import type { DecisionSession } from '../types/decision';
import type { OutcomeFields, OutcomeReview } from '../types/experimental';
import { createLocalId, describeChoice, getChosenAction } from '../utils/decisionSession';
import { EMPTY_OUTCOME, OUTCOME_KEYS, reviewInput } from '../utils/experimental';
import { colors, radii, spacing } from '../theme';

const labels: Record<keyof OutcomeFields, string> = {
  actualAction: 'What did you actually do?', happened: 'What happened?',
  becamePossible: 'What became easier or newly possible? (optional)', unchanged: 'What did not change? (optional)',
  burden: 'Did work or risk move to someone else? (optional)',
  mismatchOrNewExplanation: 'Did anything surprise you or change your view? (optional)',
};
type Props = { session: DecisionSession; onBack: () => void; onSaved: (session: DecisionSession) => void; onNewDecision: (session: DecisionSession) => void };
export function OutcomeReviewScreen({ session, onBack, onSaved, onNewDecision }: Props) {
  const [fields, setFields] = useState<OutcomeFields>({ ...EMPTY_OUTCOME });
  const [saved, setSaved] = useState<OutcomeReview | null>(session.outcomes?.at(-1) || null);
  const [editing, setEditing] = useState(!saved);
  const [busy, setBusy] = useState<'save' | 'ask' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<DecisionSession | null>(null);
  const lock = useRef(false);
  const mounted = useRef(true);
  const request = useRef<AbortController | null>(null);
  const dirty = editing && OUTCOME_KEYS.some((key) => fields[key].trim());

  function back() {
    if (lock.current && !request.current) return;
    const leave = () => { request.current?.abort(); onBack(); };
    if (dirty || pending) Alert.alert('Leave without saving?', 'Your new notes or options have not been saved.', [
      { text: 'Stay here', style: 'cancel' }, { text: 'Leave', style: 'destructive', onPress: leave },
    ]);
    else leave();
  }
  useEffect(() => {
    mounted.current = true;
    const sub = AppState.addEventListener('change', (state) => { if (state !== 'active') request.current?.abort(); });
    return () => { mounted.current = false; request.current?.abort(); sub.remove(); };
  }, []);
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => { back(); return true; });
    return () => sub.remove();
  });

  async function save() {
    if (lock.current || !fields.actualAction.trim() || !fields.happened.trim() || !session.recommendation) return;
    lock.current = true; setBusy('save'); setError(null); Keyboard.dismiss();
    const action = getChosenAction(session);
    const review: OutcomeReview = {
      ...fields, id: createLocalId('outcome'), createdAt: new Date().toISOString(), recommendationId: session.recommendation.id,
      chosenAction: describeChoice(session).slice(0, 1200), expectedObservation: action?.prediction?.observableSignal || 'No prediction was recorded for this choice.',
    };
    try {
      const updated = await saveOutcomeReview(session.id, review);
      if (mounted.current) { setSaved(review); setEditing(false); setFields({ ...EMPTY_OUTCOME }); onSaved(updated); }
    } catch (e) { if (mounted.current) setError(e instanceof Error ? e.message : 'The review was not saved. Please try again.'); }
    finally { lock.current = false; if (mounted.current) setBusy(null); }
  }

  async function reconsider() {
    if (lock.current || !saved) return;
    lock.current = true; setBusy(pending ? 'save' : 'ask'); setError(null);
    const controller = new AbortController(); request.current = pending ? null : controller;
    let next = pending;
    try {
      if (!next) {
        const recommendation = await askExperimental(session.situation, session.localContext, { signal: controller.signal, review: reviewInput(session, saved), areaLabel: session.areaLabel });
        if (!mounted.current || controller.signal.aborted) return;
        const now = new Date().toISOString();
        next = { id: createLocalId('decision'), previousDecisionId: session.id, createdAt: now, updatedAt: now,
          situation: session.situation, locationUsed: session.locationUsed, areaLabel: session.areaLabel, localContext: session.localContext,
          recommendation, choice: null, researchArm: null, preparations: [], outcomes: [] };
        // Keep generated options available for a storage-only retry; never buy another response on retry.
        setPending(next); request.current = null; setBusy('save');
      }
      await upsertDecisionSession(next);
      if (mounted.current) { setPending(null); onNewDecision(next); }
    } catch (e) { if (mounted.current) setError(controller.signal.aborted ? 'Stopped. Your saved review is still here.' : e instanceof Error ? e.message : 'Rheo could not reconsider this yet.'); }
    finally { request.current = null; lock.current = false; if (mounted.current) setBusy(null); }
  }

  return <View style={styles.screen}>
    <View style={styles.header}><RheoBrand compact /><AppButton label="Back to choice" variant="quiet" disabled={busy === 'save'} onPress={back} /></View>
    <Text accessibilityRole="header" style={styles.title}>What happened next?</Text>
    <Text style={styles.body}>Your notes stay on this device unless you ask Rheo to reconsider. They are not encrypted.</Text>
    {editing ? <>
      {OUTCOME_KEYS.map((key) => <View key={key} style={styles.field}>
        <Text style={styles.label}>{labels[key]}</Text>
        <TextInput accessibilityLabel={labels[key]} value={fields[key]} onChangeText={(value) => setFields((old) => ({ ...old, [key]: value }))}
          editable={!busy} multiline maxLength={1500} returnKeyType="done" submitBehavior="blurAndSubmit" onSubmitEditing={Keyboard.dismiss}
          textAlignVertical="top" style={styles.input} />
      </View>)}
      <AppButton label={busy === 'save' ? 'Saving...' : 'Save this review'} variant="primary" onPress={() => { void save(); }} disabled={Boolean(busy) || !fields.actualAction.trim() || !fields.happened.trim()} />
    </> : saved ? <>
      {OUTCOME_KEYS.filter((key) => saved[key].trim()).map((key) => <View key={key} style={styles.field}>
        <Text style={styles.label}>{labels[key].replace(' (optional)', '')}</Text><Text style={styles.body}>{saved[key]}</Text>
      </View>)}
      <Text style={styles.body}>Asking again sends this review, your question, the earlier explanations and any saved local context to the AI provider. Your earlier advice stays unchanged.</Text>
      <AppButton label={pending ? 'Retry saving new options' : busy === 'ask' ? 'Reconsidering...' : 'Ask Rheo with this update'} variant="primary"
        disabled={Boolean(busy)} onPress={() => { void reconsider(); }} />
      {busy === 'ask' ? <AppButton label="Stop" onPress={() => request.current?.abort()} /> : null}
      <AppButton label="Add another review" disabled={Boolean(busy) || Boolean(pending)} onPress={() => { setEditing(true); setFields({ ...EMPTY_OUTCOME }); setError(null); }} />
      {(session.outcomes || []).slice(0, -1).map((review) => <View key={review.id} style={styles.field}>
        <Text style={styles.label}>Earlier review: {new Date(review.createdAt).toLocaleDateString()}</Text>
        {OUTCOME_KEYS.filter((key) => review[key].trim()).map((key) => <Text key={key} style={styles.body}>{labels[key].replace(' (optional)', '')} {review[key]}</Text>)}
      </View>)}
    </> : null}
    {error ? <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={styles.error}>{error}</Text> : null}
  </View>;
}
const styles = StyleSheet.create({
  screen: { gap: spacing.lg }, header: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
  title: { color: colors.ink, fontSize: 26, lineHeight: 33, fontWeight: '700' },
  body: { color: colors.body, fontSize: 15, lineHeight: 22 }, label: { color: colors.ink, fontSize: 16, lineHeight: 23, fontWeight: '600' },
  field: { gap: spacing.sm }, error: { color: colors.warning, fontSize: 15, lineHeight: 22 },
  input: { minHeight: 88, padding: spacing.md, borderColor: colors.border, borderWidth: 1, borderRadius: radii.md, backgroundColor: colors.surface, color: colors.ink, fontSize: 16, lineHeight: 23 },
});
