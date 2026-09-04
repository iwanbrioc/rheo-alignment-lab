import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { colors, radii, spacing } from '../theme';

type AppButtonProps = {
  label: string;
  onPress: () => void;
  accessibilityLabel?: string;
  disabled?: boolean;
  selected?: boolean;
  variant?: 'primary' | 'secondary' | 'quiet' | 'danger';
};

export function AppButton({
  label,
  onPress,
  accessibilityLabel,
  disabled = false,
  selected = false,
  variant = 'secondary',
}: AppButtonProps) {
  const isPrimary = variant === 'primary';
  const isQuiet = variant === 'quiet';
  const isDanger = variant === 'danger';

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel || label}
      accessibilityRole="button"
      accessibilityState={{ disabled, selected }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        isPrimary && styles.primary,
        isQuiet && styles.quiet,
        isDanger && styles.danger,
        selected && styles.selected,
        (disabled || pressed) && styles.muted,
      ]}
    >
      <Text style={[
        styles.text,
        isPrimary && styles.primaryText,
        isQuiet && styles.quietText,
        isDanger && styles.dangerText,
      ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    borderColor: colors.primary,
    borderRadius: radii.button,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 46,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  primary: {
    backgroundColor: colors.primary,
  },
  quiet: {
    borderColor: 'transparent',
    paddingHorizontal: spacing.sm,
  },
  danger: {
    borderColor: colors.danger,
  },
  selected: {
    backgroundColor: colors.surfaceAlt,
  },
  muted: {
    opacity: 0.48,
  },
  text: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 20,
    textAlign: 'center',
  },
  primaryText: {
    color: colors.white,
  },
  quietText: {
    color: colors.muted,
    textDecorationLine: 'underline',
  },
  dangerText: {
    color: colors.danger,
  },
});
