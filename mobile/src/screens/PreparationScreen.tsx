import React, { useEffect, useState } from 'react';
import { ActivityIndicator, AppState, Keyboard, Linking, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { MAX_BRIEF_LENGTH, safeSourceUrl } from '../../preparation_contract.mjs';
import { AppButton } from '../components/AppButton';
import { RheoBrand } from '../components/RheoBrand';
import { prepareStep } from '../services/preparationApi';
import { PreparationSession } from '../services/preparationSession';
import { savePreparationTask } from '../storage/decisionSessions';
import { colors, radii, spacing } from '../theme';
import type { DecisionSession } from '../types/decision';
import type { PreparationSource, PreparationTask } from '../types/preparation';
import { createLocalId } from '../utils/decisionSession';
import { formatDateTime } from '../utils/format';
import { chosenPreparationStep, defaultPreparationBrief, latestPreparation, preparationChoiceKey, preparationStatus, preparationTasks } from '../utils/preparation';

type Props = { session: DecisionSession; onBack: () => void; onSaved: (session: DecisionSession) => void };

export function PreparationScreen({ session, onBack, onSaved }: Props) {
  const initial = latestPreparation(session);
  const [brief, setBrief] = useState(initial?.brief || defaultPreparationBrief(session));
  const [reviewBrief, setReviewBrief] = useState(!initial && Boolean(chosenPreparationStep(session)));
  const [viewed, setViewed] = useState<PreparationTask | null>(null);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [controller] = useState<PreparationSession>(() => new PreparationSession(initial, {
    createId: () => createLocalId('prep'), now: () => new Date().toISOString(),
    choiceKey: preparationChoiceKey(session), selectedStep: chosenPreparationStep(session) || '',
    execute: prepareStep,
    save: async (task) => { onSaved(await savePreparationTask(session.id, task)); },
    onState: (state) => setState(state),
  }));
  const [state, setState] = useState(controller.state);
  const task = viewed || state.task;
  const result = task?.result;
  const running = state.busy && state.task?.status === 'running';
  const previous = preparationTasks(session).filter((item) => item.id !== state.task?.id);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (next) => {
      if (next === 'background') void controller.cancel(true);
    });
    return () => { subscription.remove(); void controller.dispose(); };
  }, [controller]);

  async function back() {
    await controller.cancel();
    onBack();
  }
  async function openSource(source: PreparationSource) {
    const url = safeSourceUrl(source.url);
    if (!url) { setLinkError('This source link is not available.'); return; }
    try { await Linking.openURL(url); setLinkError(null); }
    catch { setLinkError('The source could not be opened. Try again.'); }
  }
  function sourceLink(source: PreparationSource) {
    return (
      <Pressable key={source.id} accessibilityRole="link" accessibilityLabel={`Open source: ${source.title}`} onPress={() => { void openSource(source); }} style={styles.sourceLink}>
        <Text style={styles.link}>{source.title}</Text>
        <Text style={styles.note}>{new URL(source.url).hostname} | Checked {formatDateTime(source.retrievedAt)}</Text>
      </Pressable>
    );
  }

  return (
    <View style={styles.screen}>
      <RheoBrand compact />
      <Text style={styles.title}>{reviewBrief ? 'Prepare this step' : running ? 'Research in progress' : result ? 'Ready to review' : 'Your preparation'}</Text>
      {!result || reviewBrief ? <Text style={styles.body}>{task?.selectedStep || chosenPreparationStep(session)}</Text> : null}

      {reviewBrief ? (
        <View style={styles.section}>
          <Text style={styles.heading}>What should Rheo check?</Text>
          <TextInput accessibilityLabel="Instructions to share with OpenAI" value={brief} onChangeText={setBrief}
            multiline maxLength={MAX_BRIEF_LENGTH} editable={!state.busy} style={styles.input} textAlignVertical="top"
            returnKeyType="done" submitBehavior="blurAndSubmit" onSubmitEditing={Keyboard.dismiss} />
          <Text style={styles.note}>{brief.length} / {MAX_BRIEF_LENGTH}</Text>
          <Text style={styles.body}>Rheo will check public websites and write a draft message or checklist. It will not send anything, fill in forms, book or buy.</Text>
          <Text style={styles.note}>Only the text above goes to OpenAI. Search services may see the search words. Remove private details first. This may cost money on your API account. Your text and results stay saved on this device. They are not encrypted.</Text>
          <AppButton label="Ask Rheo to research and draft" disabled={state.busy || brief.trim().length < 20 || preparationTasks(session).length >= 10}
            onPress={() => { setReviewBrief(false); setViewed(null); void controller.start(brief); }} variant="primary" />
          {preparationTasks(session).length >= 10 ? <Text style={styles.note}>This decision has ten saved preparations. Start another decision for more.</Text> : null}
          <AppButton label={state.task ? 'Keep the previous result' : 'Keep my choice without research'} onPress={state.task ? () => setReviewBrief(false) : onBack} variant="quiet" />
        </View>
      ) : (
        <View style={styles.section}>
          {running ? (
            <View accessibilityRole="progressbar" accessibilityLabel="Research in progress" accessibilityLiveRegion="polite" style={styles.section}>
              <ActivityIndicator color={colors.primary} />
              <Text style={styles.body}>Checking public sources and preparing a draft. Keep Rheo open; leaving the app stops this attempt.</Text>
              <Text style={styles.note}>Stopping cannot take back information already sent to OpenAI.</Text>
              <AppButton label="Cancel research" onPress={() => { void controller.cancel(); }} />
            </View>
          ) : null}
          {task && !running ? <Text accessibilityLiveRegion="polite" style={styles.heading}>{preparationStatus(task)}</Text> : null}
          {task?.error ? <Text accessibilityRole="alert" style={styles.error}>{task.error}</Text> : null}
          {result ? (
            <>
              <Text style={styles.body}>{result.summary}</Text>
              <Text style={styles.note}>This is a draft, not a finished action. Nothing was sent, booked or bought. Your chosen action is not marked done.</Text>
              <Text style={styles.heading}>What Rheo found</Text>
              {result.findings.length ? result.findings.map((finding, index) => (
                <View key={index} style={styles.finding}>
                  <Text selectable style={styles.body}>{finding.text}</Text>
                  {finding.sourceIds.map((id) => result.sources.find((source) => source.id === id)).filter((source): source is PreparationSource => Boolean(source)).map(sourceLink)}
                </View>
              )) : <Text style={styles.body}>Rheo could not find sources to support an answer. You will need to check the missing details.</Text>}
              <Text style={styles.heading}>Draft only - not sent</Text>
              <Text style={styles.subheading}>{result.draft.title}</Text>
              <Text selectable style={styles.draft}>{result.draft.body}</Text>
              <Text style={styles.heading}>Still needs you</Text>
              {result.remainingSteps.map((item, index) => <Text key={index} style={styles.body}>{index + 1}. {item}</Text>)}
              {result.uncertainties.length ? <Text style={styles.heading}>What is still unclear</Text> : null}
              {result.uncertainties.map((item, index) => <Text key={index} style={styles.body}>{item}</Text>)}
              <Text style={styles.note}>Prepared {formatDateTime(result.completedAt)} with {result.model}. The links show where the information came from. Check important details before you act.</Text>
            </>
          ) : null}
          {linkError ? <Text accessibilityRole="alert" style={styles.error}>{linkError}</Text> : null}
          {!state.busy && !viewed && chosenPreparationStep(session) ? <AppButton label={result ? 'Check the instructions and ask again' : 'Check the instructions and retry'} onPress={() => setReviewBrief(true)} /> : null}
          {viewed ? <AppButton label="Back to latest preparation" onPress={() => setViewed(null)} /> : null}
          {task ? <Text style={styles.note}>You agreed to this on {formatDateTime(task.approvedAt)}. Your instructions: {task.brief}</Text> : null}
        </View>
      )}
      {previous.length && !state.busy ? (
        <View style={styles.section}>
          <Text style={styles.heading}>Earlier preparations</Text>
          {previous.map((item) => <AppButton key={item.id} label={`${formatDateTime(item.approvedAt)}: ${preparationStatus(item)}`} onPress={() => { setViewed(item); setReviewBrief(false); }} variant="quiet" />)}
        </View>
      ) : null}
      {state.storageError ? (
        <View style={styles.section}>
          <Text accessibilityRole="alert" style={styles.error}>{state.storageError}</Text>
          {state.task ? <AppButton label="Retry saving preparation" disabled={state.busy} onPress={() => { void controller.retrySave(); }} /> : null}
        </View>
      ) : null}
      <AppButton label={running ? 'Stop and return to my choice' : 'Return to my choice'} onPress={() => { void back(); }} variant="quiet" />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { gap: spacing.lg },
  section: { gap: spacing.md },
  title: { color: colors.ink, fontSize: 30, fontWeight: '700', lineHeight: 36 },
  heading: { color: colors.ink, fontSize: 20, fontWeight: '700', lineHeight: 27, marginTop: spacing.sm },
  subheading: { color: colors.ink, fontSize: 17, fontWeight: '700', lineHeight: 24 },
  body: { color: colors.body, fontSize: 16, lineHeight: 24 },
  note: { color: colors.muted, fontSize: 13, lineHeight: 19 },
  input: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: radii.md,
    color: colors.ink, fontSize: 16, lineHeight: 24, minHeight: 180, padding: spacing.md },
  finding: { gap: spacing.xs, borderBottomColor: colors.border, borderBottomWidth: 1, paddingBottom: spacing.md },
  sourceLink: { minHeight: 44, paddingVertical: spacing.sm, gap: spacing.xs },
  link: { color: colors.blue, textDecorationLine: 'underline', fontSize: 14, lineHeight: 21 },
  draft: { backgroundColor: colors.surfaceAlt, padding: spacing.lg, color: colors.ink, fontSize: 16, lineHeight: 24 },
  error: { color: colors.danger, fontSize: 15, lineHeight: 22 },
});
