import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { askRheo, getLocalContext, type LocalContextResponse, type RheoDecisionResponse } from './src/api';
import { getDecisionLocation, type DecisionLocation } from './src/location';

const kindLabel: Record<string, string> = {
  smallest_release: 'First release',
  learning_action: 'Learn',
  generative_action: 'Open a pathway',
};

export default function App() {
  const [decisionText, setDecisionText] = useState('');
  const [location, setLocation] = useState<DecisionLocation | null>(null);
  const [localContext, setLocalContext] = useState<LocalContextResponse | null>(null);
  const [result, setResult] = useState<RheoDecisionResponse | null>(null);
  const [busy, setBusy] = useState<'location' | 'local' | 'rheo' | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const canAsk = decisionText.trim().length >= 12 && busy === null;
  const area = useMemo(() => location?.areaLabel || (location ? 'Approximate area captured' : null), [location]);

  async function captureLocation() {
    setBusy('location');
    setMessage(null);
    try {
      const next = await getDecisionLocation();
      setLocation(next);
      setLocalContext(null);
      setResult(null);
      setMessage('Your approximate area is ready. Exact coordinates are not sent to Rheo.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not use location.');
    } finally {
      setBusy(null);
    }
  }

  async function findLocal() {
    if (!location || decisionText.trim().length < 12) return;
    setBusy('local');
    setMessage(null);
    try {
      const context = await getLocalContext(decisionText.trim(), location);
      setLocalContext(context);
      setResult(null);
      setMessage(context.candidates.length ? 'Local possibilities found. Rheo will still test whether they are genuinely usable.' : context.warnings[0] || 'No local possibilities found.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Local search failed.');
    } finally {
      setBusy(null);
    }
  }

  async function runRheo() {
    if (!canAsk) return;
    setBusy('rheo');
    setMessage(null);
    try {
      const next = await askRheo(decisionText.trim(), location, localContext);
      setResult(next);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Rheo could not complete the decision.');
    } finally {
      setBusy(null);
    }
  }

  return (
    <View style={styles.root}>
      <StatusBar style="auto" />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.eyebrow}>RHEO</Text>
        <Text style={styles.title}>What are you deciding?</Text>
        <Text style={styles.intro}>
          Describe the predicament in ordinary language. Add your area only when nearby places or services could change what is possible.
        </Text>

        <TextInput
          accessibilityLabel="Decision or predicament"
          multiline
          value={decisionText}
          onChangeText={(text) => {
            setDecisionText(text);
            setResult(null);
            setLocalContext(null);
          }}
          placeholder="For example: My washing machine has broken and I need a reliable solution this week…"
          style={styles.input}
          textAlignVertical="top"
        />

        <View style={styles.actionRow}>
          <Pressable
            accessibilityRole="button"
            disabled={busy !== null}
            onPress={captureLocation}
            style={({ pressed }) => [styles.secondaryButton, (pressed || busy !== null) && styles.buttonMuted]}
          >
            <Text style={styles.secondaryButtonText}>{location ? 'Refresh my area' : 'Use my area'}</Text>
          </Pressable>
          {location ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                setLocation(null);
                setLocalContext(null);
                setResult(null);
                setMessage('Location removed from this decision.');
              }}
              style={styles.textButton}
            >
              <Text style={styles.textButtonText}>Remove</Text>
            </Pressable>
          ) : null}
        </View>

        {busy === 'location' ? <ActivityIndicator accessibilityLabel="Finding your area" /> : null}
        {area ? (
          <View style={styles.areaPanel}>
            <Text style={styles.areaLabel}>Using approximate area</Text>
            <Text style={styles.areaText}>{area}</Text>
            <Text style={styles.privacyText}>Foreground only · neighbourhood precision · no background tracking</Text>
          </View>
        ) : null}

        {location ? (
          <Pressable
            accessibilityRole="button"
            disabled={!canAsk}
            onPress={findLocal}
            style={({ pressed }) => [styles.secondaryWide, (!canAsk || pressed) && styles.buttonMuted]}
          >
            <Text style={styles.secondaryButtonText}>Find local pathways</Text>
          </Pressable>
        ) : null}

        {busy === 'local' ? <ActivityIndicator accessibilityLabel="Finding local pathways" /> : null}

        {localContext ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Local context</Text>
            <Text style={styles.sectionNote}>These are possibilities to test, not endorsements.</Text>
            {localContext.candidates.length === 0 ? (
              <Text style={styles.bodyText}>No real local places are available from the configured provider yet.</Text>
            ) : (
              localContext.candidates.map((candidate) => (
                <View style={styles.candidate} key={candidate.id}>
                  <Text style={styles.candidateName}>{candidate.name}</Text>
                  <Text style={styles.meta}>
                    {[candidate.category, candidate.distanceM === null ? null : `${Math.max(0.1, candidate.distanceM / 1000).toFixed(1)} km`]
                      .filter(Boolean)
                      .join(' · ')}
                  </Text>
                  {candidate.address ? <Text style={styles.bodyText}>{candidate.address}</Text> : null}
                  <Text style={styles.whyText}>{candidate.whyRelevant}</Text>
                  {candidate.sourceUrl ? (
                    <Pressable accessibilityRole="link" onPress={() => Linking.openURL(candidate.sourceUrl!)}>
                      <Text style={styles.linkText}>View source</Text>
                    </Pressable>
                  ) : null}
                </View>
              ))
            )}
            {localContext.attribution ? <Text style={styles.attribution}>{localContext.attribution}</Text> : null}
          </View>
        ) : null}

        {message ? <Text accessibilityLiveRegion="polite" style={styles.message}>{message}</Text> : null}

        <Pressable
          accessibilityRole="button"
          disabled={!canAsk}
          onPress={runRheo}
          style={({ pressed }) => [styles.primaryButton, (!canAsk || pressed) && styles.primaryMuted]}
        >
          {busy === 'rheo' ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.primaryButtonText}>Ask Rheo</Text>}
        </Pressable>

        {result ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Three ways forward</Text>
            {result.actions.map((action, index) => (
              <View style={styles.actionCard} key={action.id}>
                <Text style={styles.actionIndex}>{index + 1} · {kindLabel[action.kind] || action.kind}</Text>
                <Text style={styles.actionTitle}>{action.title}</Text>
                <Text style={styles.actionText}>{action.action}</Text>
                <Text style={styles.whyText}>{action.whyThisAction}</Text>
                <Text style={styles.stopText}>Reconsider if: {action.falsifierOrChangeSignal}</Text>
              </View>
            ))}
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f7f5ef' },
  content: { paddingHorizontal: 20, paddingTop: 64, paddingBottom: 48, gap: 14 },
  eyebrow: { fontSize: 13, letterSpacing: 3, fontWeight: '700', color: '#45524a' },
  title: { fontSize: 34, lineHeight: 39, fontWeight: '700', color: '#172019' },
  intro: { fontSize: 17, lineHeight: 25, color: '#4f5a52' },
  input: { minHeight: 150, borderWidth: 1, borderColor: '#b8bdb7', borderRadius: 18, backgroundColor: '#ffffff', padding: 16, fontSize: 17, lineHeight: 24, color: '#172019' },
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap' },
  secondaryButton: { minHeight: 46, paddingHorizontal: 16, borderRadius: 23, borderWidth: 1, borderColor: '#69756d', justifyContent: 'center' },
  secondaryWide: { minHeight: 48, paddingHorizontal: 18, borderRadius: 16, borderWidth: 1, borderColor: '#69756d', justifyContent: 'center', alignItems: 'center' },
  secondaryButtonText: { fontSize: 16, fontWeight: '600', color: '#27342c' },
  textButton: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 6 },
  textButtonText: { fontSize: 15, color: '#5f695f', textDecorationLine: 'underline' },
  buttonMuted: { opacity: 0.5 },
  areaPanel: { borderLeftWidth: 3, borderLeftColor: '#68776d', paddingLeft: 13, paddingVertical: 6 },
  areaLabel: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, color: '#657068' },
  areaText: { fontSize: 17, fontWeight: '600', color: '#27342c', marginTop: 3 },
  privacyText: { fontSize: 13, color: '#6d766f', marginTop: 3 },
  section: { marginTop: 8, gap: 10 },
  sectionTitle: { fontSize: 23, lineHeight: 28, fontWeight: '700', color: '#172019' },
  sectionNote: { fontSize: 14, lineHeight: 20, color: '#657068' },
  bodyText: { fontSize: 15, lineHeight: 21, color: '#414b44' },
  candidate: { borderTopWidth: 1, borderTopColor: '#d5d8d3', paddingTop: 12, gap: 4 },
  candidateName: { fontSize: 18, fontWeight: '600', color: '#1d2921' },
  meta: { fontSize: 13, fontWeight: '600', color: '#68736b' },
  whyText: { fontSize: 14, lineHeight: 20, color: '#58635b' },
  linkText: { fontSize: 14, fontWeight: '600', color: '#324b3b', textDecorationLine: 'underline', paddingVertical: 4 },
  attribution: { fontSize: 12, color: '#777f79' },
  message: { fontSize: 14, lineHeight: 20, color: '#4e5b52', backgroundColor: '#eceee9', borderRadius: 12, padding: 12 },
  primaryButton: { minHeight: 54, borderRadius: 18, backgroundColor: '#263d2e', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18 },
  primaryMuted: { opacity: 0.48 },
  primaryButtonText: { fontSize: 17, fontWeight: '700', color: '#ffffff' },
  actionCard: { backgroundColor: '#ffffff', borderRadius: 18, padding: 16, gap: 7, borderWidth: 1, borderColor: '#d7dad6' },
  actionIndex: { fontSize: 12, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase', color: '#6b756e' },
  actionTitle: { fontSize: 19, fontWeight: '700', color: '#172019' },
  actionText: { fontSize: 16, lineHeight: 23, color: '#2b372f' },
  stopText: { fontSize: 13, lineHeight: 19, color: '#6a4e43', marginTop: 2 },
});
