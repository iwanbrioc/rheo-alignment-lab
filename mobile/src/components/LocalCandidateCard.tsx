import React from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import type { LocalContextCandidate } from '../types/localContext';
import { colors, radii, spacing } from '../theme';
import { formatDistance } from '../utils/format';

type LocalCandidateCardProps = {
  candidate: LocalContextCandidate;
};

export function LocalCandidateCard({ candidate }: LocalCandidateCardProps) {
  const distance = formatDistance(candidate.distanceM);
  const meta = [candidate.category, distance, candidate.address].filter(Boolean).join(' - ');

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{candidate.name}</Text>
      {meta ? <Text style={styles.meta}>{meta}</Text> : null}
      {candidate.whyRelevant ? <Text style={styles.body}>{candidate.whyRelevant}</Text> : null}
      <View style={styles.footer}>
        <Text style={styles.source}>{candidate.source}</Text>
        {candidate.sourceUrl ? (
          <Pressable
            accessibilityRole="link"
            accessibilityLabel={`Open source for ${candidate.name}`}
            onPress={() => Linking.openURL(candidate.sourceUrl || '')}
          >
            <Text style={styles.link}>Source</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md,
  },
  title: {
    color: colors.ink,
    fontSize: 17,
    fontWeight: '700',
    lineHeight: 22,
  },
  meta: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  body: {
    color: colors.body,
    fontSize: 14,
    lineHeight: 20,
  },
  footer: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    justifyContent: 'space-between',
  },
  source: {
    color: colors.muted,
    flexShrink: 1,
    fontSize: 12,
    lineHeight: 17,
  },
  link: {
    color: colors.blue,
    fontSize: 14,
    fontWeight: '700',
    minHeight: 32,
    paddingVertical: spacing.xs,
    textDecorationLine: 'underline',
  },
});
