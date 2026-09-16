import React, { useEffect, useRef, useState } from 'react';
import { Alert, AppState, BackHandler, Keyboard, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { AppButton } from '../components/AppButton';
import { PathwayField, PathwayStatusPicker } from '../components/PathwayFields';
import { RheoBrand } from '../components/RheoBrand';
import { suggestPathway } from '../services/pathwayApi';
import { deletePathway, listPathways, savePathway } from '../storage/pathways';
import { colors, radii, spacing } from '../theme';
import type { Pathway, PathwayStatus } from '../types/pathway';
import { createLocalId } from '../utils/decisionSession';
import { compactText, formatDateTime } from '../utils/format';
import { createPathway, MAX_PATHWAYS, MAX_REVIEWS, PATHWAY_STATUS, withPathwayReview } from '../utils/pathway';

type Tab = 'possibility' | 'step' | 'review';
type Observation = { status: PathwayStatus; happened: string; felt: string; burden: string; remains: string };
const blankReview = (status: PathwayStatus): Observation => ({ status, happened: '', felt: '', burden: '', remains: '' });
const PLAN_LABELS = { nextStep: 'A possible next step', why: 'Why it may help', check: 'One thing to check',
  care: 'Care and limits', stopIf: 'When to rethink', couldRemain: 'What could remain' };

function confirm(title: string, message: string, action: string): Promise<boolean> {
  return new Promise((resolve) => Alert.alert(title, message, [
    { text: 'Keep it', style: 'cancel', onPress: () => resolve(false) },
    { text: action, style: 'destructive', onPress: () => resolve(true) },
  ], { cancelable: true, onDismiss: () => resolve(false) }));
}

export function PathwaysScreen({ seed, onBack, onViewChange, backLabel = 'Back to question' }: {
  seed?: { need: string; nextStep: string } | null; onBack: () => void; onViewChange?: () => void; backLabel?: string;
}) {
  const [items, setItems] = useState<Pathway[]>([]);
  const [draft, setDraft] = useState<Pathway | null>(() => seed ? createPathway(seed.need, seed.nextStep) : null);
  const [baseline, setBaseline] = useState('');
  const [tab, setTab] = useState<Tab>('possibility');
  const [observation, setObservation] = useState<Observation>(blankReview('idea'));
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState<'loading' | 'saving' | 'suggesting' | null>('loading');
  const [loadError, setLoadError] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const request = useRef<AbortController | null>(null);
  const lock = useRef(false);
  const mounted = useRef(true);
  const confirming = useRef(false);
  const disabled = busy !== null;
  const reviewDirty = Boolean(observation.happened || observation.felt || observation.burden || observation.remains
    || (draft && observation.status !== draft.status));
  const dirty = Boolean(draft && (JSON.stringify(draft) !== baseline || reviewDirty));

  async function load() {
    setBusy('loading'); setError(null);
    try {
      const saved = await listPathways();
      if (mounted.current) { setItems(saved); setLoadError(false); }
    } catch (cause) {
      if (mounted.current) { setLoadError(true); setError(cause instanceof Error ? cause.message : 'Pathways could not be loaded.'); }
    } finally { if (mounted.current) setBusy(null); }
  }

  function stop() {
    request.current?.abort(); request.current = null;
    if (mounted.current) { setBusy(null); setMessage('Suggestion stopped. Your notes are still here.'); }
  }

  useEffect(() => {
    mounted.current = true;
    void load();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active' && request.current) stop();
    });
    return () => { mounted.current = false; request.current?.abort(); request.current = null; subscription.remove(); };
  }, []);

  async function back() {
    if (lock.current || confirming.current || busy === 'loading') return;
    if (dirty) {
      confirming.current = true;
      const leave = await confirm('Leave without saving?', 'Unsaved pathway notes and this check-in will be lost.', 'Leave without saving');
      confirming.current = false;
      if (!leave) return;
    }
    if (request.current) stop();
    if (draft) { setDraft(null); setConsent(false); setError(null); setMessage(null); onViewChange?.(); }
    else onBack();
  }

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => { void back(); return true; });
    return () => subscription.remove();
  });

  function open(item?: Pathway) {
    const next = item || createPathway();
    setDraft(next); setBaseline(item ? JSON.stringify(item) : ''); setObservation(blankReview(next.status));
    setTab('possibility'); setConsent(false); setMessage(null); setError(null); onViewChange?.();
  }

  function edit(key: 'need' | 'gift' | 'enablers' | 'limits' | 'nextStep', value: string) {
    if (!draft || disabled) return;
    setDraft({ ...draft, [key]: value, ...(key === 'nextStep' ? {} : { suggestion: null,
      nextStep: draft.suggestion?.plan.nextStep === draft.nextStep ? '' : draft.nextStep }) });
    if (key !== 'nextStep') setConsent(false);
    setError(null); setMessage(null);
  }

  async function save(review = false) {
    if (!draft || lock.current || disabled) return;
    lock.current = true; setBusy('saving'); setError(null); setMessage(null);
    try {
      const time = new Date().toISOString();
      const next = review ? withPathwayReview(draft, { ...observation, id: createLocalId('check'), createdAt: time })
        : { ...draft, updatedAt: time };
      const saved = await savePathway(next);
      if (!mounted.current) return;
      setDraft(saved); setBaseline(JSON.stringify(saved));
      setItems((previous) => [saved, ...previous.filter((item) => item.id !== saved.id)]);
      if (review) setObservation(blankReview(saved.status));
      setMessage(review ? 'Your check-in is saved on this device.' : 'Pathway saved on this device.');
    } catch (cause) {
      if (mounted.current) setError(`Not saved. ${cause instanceof Error ? cause.message : 'Please try again.'}`);
    } finally { lock.current = false; if (mounted.current) setBusy(null); }
  }

  async function remove() {
    if (!draft || disabled || lock.current || confirming.current) return;
    confirming.current = true;
    const approved = await confirm('Delete this pathway?', 'Its notes, suggestion and check-ins will be deleted from this device. Saved decisions are separate and will not be changed.', 'Delete');
    confirming.current = false;
    if (!approved) return;
    lock.current = true; setBusy('saving');
    try {
      await deletePathway(draft.id);
      if (!mounted.current) return;
      setItems((previous) => previous.filter((item) => item.id !== draft.id));
      setDraft(null); setMessage('Pathway deleted.'); setError(null); onViewChange?.();
    } catch (cause) { if (mounted.current) setError(cause instanceof Error ? cause.message : 'Could not delete the pathway. Try again.'); }
    finally { lock.current = false; if (mounted.current) setBusy(null); }
  }

  async function suggest() {
    if (!draft || !consent || disabled || request.current || lock.current) return;
    const controller = new AbortController();
    request.current = controller; setBusy('suggesting'); setConsent(false); setError(null); setMessage(null);
    try {
      const result = await suggestPathway(draft, controller.signal);
      if (!mounted.current || request.current !== controller || controller.signal.aborted) return;
      setDraft({ ...draft, suggestion: result });
      setTab('step'); onViewChange?.();
      setMessage('A suggestion, not a verified resource or an agreed commitment.');
    } catch (cause) {
      if (mounted.current && request.current === controller) setError(cause instanceof Error ? cause.message : 'Suggestion unavailable. Your notes are still here.');
    } finally {
      if (request.current === controller) { request.current = null; if (mounted.current) setBusy(null); }
    }
  }

  return <View style={styles.screen}>
    <View style={styles.header}>
      <RheoBrand compact />
      <AppButton label={draft ? 'My pathways' : backLabel} variant="quiet" onPress={() => { void back(); }}
        disabled={busy === 'saving' || busy === 'loading'} />
    </View>
    <Text accessibilityRole="header" style={styles.title}>{draft ? 'A pathway' : 'My pathways'}</Text>
    {!draft ? <>
      <Text style={styles.body}>Needs, gifts and what becomes possible.</Text>
      <AppButton label="Start a pathway" variant="primary" disabled={disabled || loadError || items.length >= MAX_PATHWAYS} onPress={() => open()} />
      {busy === 'loading' ? <Text accessibilityLiveRegion="polite" style={styles.note}>Opening your pathways...</Text> : null}
      {!loadError && !items.length && busy === null ? <Text style={styles.body}>No pathways saved yet.</Text> : null}
      {items.map((item) => <View key={item.id} style={styles.item}>
        <Text style={styles.status}>{PATHWAY_STATUS[item.status]}</Text>
        <Text style={styles.itemTitle}>{compactText(item.need, 140)}</Text>
        {item.nextStep ? <Text style={styles.body}>{compactText(item.nextStep, 180)}</Text> : null}
        <Text style={styles.note}>Updated {formatDateTime(item.updatedAt)}</Text>
        <AppButton label="Open pathway" accessibilityLabel={`Open pathway: ${item.need}`} disabled={disabled} onPress={() => open(item)} />
      </View>)}
      {items.length >= MAX_PATHWAYS ? <Text style={styles.note}>50 pathways saved. Nothing is removed automatically. Delete one to add another.</Text> : null}
    </> : <>
      <Text style={styles.note}>Help does not have to be earned. Giving is always your choice.</Text>
      <View accessibilityRole="tablist" style={styles.tabs}>
        {(['possibility', 'step', 'review'] as Tab[]).map((value, index) => <Pressable key={value}
          accessibilityRole="tab" accessibilityState={{ selected: tab === value, disabled }} disabled={disabled}
          onPress={() => { Keyboard.dismiss(); setTab(value); onViewChange?.(); }} style={[styles.tab, tab === value && styles.activeTab]}>
          <Text style={styles.tabText}>{['Possibility', 'Next step', 'Check-in'][index]}</Text>
        </Pressable>)}
      </View>
      {tab === 'possibility' ? <>
        <PathwayField label="What is needed?" required value={draft.need} disabled={disabled} onChange={(value) => edit('need', value)} />
        <PathwayField label="What would you like to give?" value={draft.gift} disabled={disabled} onChange={(value) => edit('gift', value)} />
        <PathwayField label="What support or resources would make it possible?" value={draft.enablers} disabled={disabled} onChange={(value) => edit('enablers', value)} />
        <PathwayField label="What needs protecting? Time, energy, money, safety..." value={draft.limits} disabled={disabled} onChange={(value) => edit('limits', value)} />
        <View style={styles.section}>
          <Text style={styles.heading}>Ask Rheo for a possibility</Text>
          <Text style={styles.note}>Only the four fields above go to the Rheo server and OpenAI. No check-ins, GPS or other saved notes are added. Leave out names and sensitive details.</Text>
          <View style={styles.consentRow}>
            <Text style={styles.consentText}>Share these four fields for this suggestion</Text>
            <Switch accessibilityLabel="Share these four fields with Rheo and OpenAI" value={consent} onValueChange={setConsent} disabled={disabled} />
          </View>
          <AppButton label={busy === 'suggesting' ? 'Stop suggestion' : 'Suggest a small step'}
            disabled={busy === 'suggesting' ? false : disabled || !consent || draft.need.trim().length < 12}
            onPress={() => { if (busy === 'suggesting') stop(); else void suggest(); }} />
          {busy === 'suggesting' ? <Text accessibilityLiveRegion="polite" style={styles.note}>Thinking about a possible step...</Text> : null}
        </View>
      </> : null}
      {tab === 'step' ? <>
        <PathwayField label="My next step" value={draft.nextStep} disabled={disabled} onChange={(value) => edit('nextStep', value)} />
        {draft.suggestion ? <View style={styles.section}>
          <Text style={styles.heading}>Rheo's suggestion</Text>
          <Text style={styles.note}>Not checked. Nobody has been contacted or committed to anything.</Text>
          {Object.entries(draft.suggestion.plan).map(([key, value]) => <View key={key} style={styles.textGroup}>
            <Text style={styles.label}>{PLAN_LABELS[key as keyof typeof PLAN_LABELS]}</Text><Text selectable style={styles.body}>{value}</Text>
          </View>)}
          <Text style={styles.note}>{formatDateTime(draft.suggestion.createdAt)} / {draft.suggestion.model}</Text>
          <AppButton label="Use this step" disabled={disabled || draft.nextStep === draft.suggestion.plan.nextStep}
            onPress={async () => {
              if (draft.nextStep.trim() && !await confirm('Replace your next step?', 'Your own step will be replaced by this suggestion. Other notes stay unchanged.', 'Replace step')) return;
              edit('nextStep', draft.suggestion!.plan.nextStep);
            }} />
        </View> : <Text style={styles.note}>No AI suggestion added. Your own step is enough.</Text>}
      </> : null}
      {tab === 'review' ? <>
        <Text style={styles.heading}>What is it like in practice?</Text>
        <Text style={styles.note}>Your own experience, not a rating of a person or proof that a service is available.</Text>
        <PathwayStatusPicker value={observation.status} disabled={disabled} onChange={(status) => setObservation({ ...observation, status })} />
        <PathwayField label="What did you try or find out?" required value={observation.happened} disabled={disabled} onChange={(happened) => setObservation({ ...observation, happened })} />
        <PathwayField label="What was it like for you?" value={observation.felt} disabled={disabled} onChange={(felt) => setObservation({ ...observation, felt })} />
        <PathwayField label="Who carried the work? What needs rest or care?" value={observation.burden} disabled={disabled} onChange={(burden) => setObservation({ ...observation, burden })} />
        <PathwayField label="What is now possible? What still needs checking?" value={observation.remains} disabled={disabled} onChange={(remains) => setObservation({ ...observation, remains })} />
        <AppButton label={busy === 'saving' ? 'Saving...' : 'Save check-in'} variant="primary"
          disabled={disabled || loadError || !draft.need.trim() || !observation.happened.trim() || draft.reviews.length >= MAX_REVIEWS} onPress={() => { void save(true); }} />
        {draft.reviews.length >= MAX_REVIEWS ? <Text style={styles.note}>30 check-ins saved. Start another pathway to keep exploring.</Text> : null}
        {[...draft.reviews].reverse().map((review) => <View style={styles.item} key={review.id}>
          <Text style={styles.status}>{PATHWAY_STATUS[review.status]} / {formatDateTime(review.createdAt)}</Text>
          <Text style={styles.body}>{review.happened}</Text>
          {review.felt ? <Text style={styles.body}>Lived experience: {review.felt}</Text> : null}
          {review.burden ? <Text style={styles.body}>Care needed: {review.burden}</Text> : null}
          {review.remains ? <Text style={styles.body}>What remains: {review.remains}</Text> : null}
        </View>)}
      </> : null}
      {tab !== 'review' ? <AppButton label={busy === 'saving' ? 'Saving...' : 'Save pathway'} variant="primary"
        disabled={disabled || loadError || !draft.need.trim()} onPress={() => { void save(); }} /> : null}
      {baseline ? <AppButton label="Delete pathway" variant="danger" disabled={disabled} onPress={() => { void remove(); }} /> : null}
    </>}
    {message ? <Text accessibilityLiveRegion="polite" style={styles.notice}>{message}</Text> : null}
    {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
    {loadError ? <AppButton label="Retry loading pathways" disabled={disabled} onPress={() => { void load(); }} /> : null}
    <Text style={styles.privacy}>Saved on this device, without encryption. Nothing is published. AI receives notes only with your approval. Avoid sensitive details.</Text>
  </View>;
}

const styles = StyleSheet.create({
  screen: { gap: spacing.lg },
  header: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
  title: { color: colors.ink, fontSize: 26, lineHeight: 32, fontWeight: '700' },
  body: { color: colors.body, fontSize: 16, lineHeight: 24 },
  note: { color: colors.muted, fontSize: 14, lineHeight: 21 },
  heading: { color: colors.ink, fontSize: 19, lineHeight: 26, fontWeight: '700' },
  label: { color: colors.ink, fontSize: 15, lineHeight: 22, fontWeight: '600' },
  item: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    borderRadius: radii.md, padding: spacing.md, gap: spacing.sm },
  itemTitle: { color: colors.ink, fontSize: 18, lineHeight: 25, fontWeight: '700' },
  status: { color: '#315d70', fontSize: 14, lineHeight: 21, fontWeight: '600' },
  section: { borderTopWidth: 1, borderColor: colors.border, paddingTop: spacing.lg, gap: spacing.md },
  textGroup: { gap: spacing.xs },
  tabs: { flexDirection: 'row', borderBottomWidth: 1, borderColor: colors.border },
  tab: { flex: 1, minHeight: 48, alignItems: 'center', justifyContent: 'center', padding: spacing.sm, borderBottomWidth: 3, borderColor: 'transparent' },
  activeTab: { borderColor: colors.primary },
  tabText: { color: colors.ink, fontSize: 14, lineHeight: 21, fontWeight: '600', textAlign: 'center' },
  consentRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  consentText: { flex: 1, color: colors.body, fontSize: 14, lineHeight: 21 },
  notice: { color: colors.primary, fontSize: 15, lineHeight: 22 },
  error: { color: colors.danger, fontSize: 15, lineHeight: 22 },
  privacy: { borderTopWidth: 1, borderColor: colors.border, paddingTop: spacing.md, color: colors.muted, fontSize: 13, lineHeight: 20 },
});
