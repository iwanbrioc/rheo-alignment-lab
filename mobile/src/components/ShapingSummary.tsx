import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { ExperimentalFlow } from '../types/experimental';
import { colors, spacing } from '../theme';
import { AppButton } from './AppButton';

export function ShapingSummary({ flow }: { flow: ExperimentalFlow }) {
  const [expanded, setExpanded] = useState(false);
  return <View style={styles.section}>
    <Text style={styles.version}>Experimental v0.10</Text>
    <Text accessibilityRole="header" style={styles.title}>What may be shaping this</Text>
    <Text style={styles.body}>{flow.summary}</Text>
    {flow.safeguards.safetyLevel === 'high' || flow.safeguards.safetyLevel === 'caution'
      ? <Text style={styles.caution}>{flow.safeguards.powerAndExit}</Text> : null}
    <AppButton label={expanded ? 'Less detail' : 'Why this might fit'} expanded={expanded} variant="quiet" onPress={() => setExpanded(!expanded)} />
    {expanded ? <>
      <Text style={styles.label}>What you can influence</Text>
      <Text style={styles.body}>{flow.availableAgency.influenceNow}</Text>
      <Text style={styles.body}>{flow.availableAgency.limits}</Text>
      {flow.systemAgency.length ? <Text style={styles.label}>What needs someone else's action</Text> : null}
      {flow.systemAgency.map((a, i) => <Text key={i} style={styles.body}>{a.actor}: {a.changeRequired} {a.uncertainty}</Text>)}
      <Text style={styles.label}>Possible explanations</Text>
      {flow.hypotheses.map((h) => <View key={h.id} style={styles.explanation}>
        <Text style={styles.body}>{h.statement}</Text>
        <Text style={styles.detail}>{h.confidence.basis}</Text>
      </View>)}
      {flow.modelUpdate.status !== 'initial' ? <>
        <Text style={styles.label}>What the update changes</Text>
        <Text style={styles.body}>{flow.modelUpdate.mismatch}</Text>
        <Text style={styles.body}>{flow.modelUpdate.explanation}</Text>
      </> : null}
    </> : null}
  </View>;
}
const styles = StyleSheet.create({
  section: { gap: spacing.sm, paddingVertical: spacing.sm, borderBottomWidth: 1, borderColor: colors.border },
  version: { fontSize: 12, color: colors.muted, lineHeight: 18 },
  title: { fontSize: 20, lineHeight: 26, color: colors.ink, fontWeight: '700' },
  label: { fontSize: 16, lineHeight: 23, color: colors.ink, fontWeight: '700' },
  body: { fontSize: 16, lineHeight: 23, color: colors.body },
  detail: { fontSize: 14, lineHeight: 21, color: colors.muted },
  caution: { fontSize: 16, lineHeight: 23, color: colors.warning },
  explanation: { gap: 4, paddingBottom: spacing.sm },
});
