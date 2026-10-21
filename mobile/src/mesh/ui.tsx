import React from "react";
import {
  Pressable,
  Text,
  TextInput,
  View,
  StyleSheet,
  type TextInputProps,
  type ViewStyle,
} from "react-native";
export const palette = {
  ink: "#153a33",
  muted: "#4f635a",
  paper: "#fffef8",
  bg: "#f7f8f4",
  line: "#d5dfce",
  green: "#2f6954",
  mint: "#e0ecd7",
  gold: "#b08a46",
  red: "#984c3d",
};
export function Button({
  label,
  onPress,
  secondary = false,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  secondary?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        secondary && styles.secondary,
        disabled && { opacity: 0.45 },
        pressed && { opacity: 0.8 },
      ]}
    >
      <Text style={[styles.buttonText, secondary && { color: palette.ink }]}>
        {label}
      </Text>
    </Pressable>
  );
}
export const Field = React.forwardRef<
  TextInput,
  TextInputProps & { label: string }
>(function Field({ label, ...props }, ref) {
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        ref={ref}
        accessibilityLabel={label}
        placeholderTextColor="#7c8c80"
        {...props}
        style={[
          styles.input,
          props.multiline && { minHeight: 86, textAlignVertical: "top" },
          props.style,
        ]}
      />
    </View>
  );
});
export function Choice({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[
        styles.chip,
        selected && { backgroundColor: palette.ink, borderColor: palette.ink },
      ]}
    >
      <Text style={{ fontSize: 13, color: selected ? "white" : palette.ink }}>
        {label}
      </Text>
    </Pressable>
  );
}
export function Card({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
}) {
  return <View style={[styles.card, style]}>{children}</View>;
}
export const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.bg },
  content: { padding: 20, paddingBottom: 40 },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8, alignItems: "center" },
  title: {
    fontFamily: "System",
    fontWeight: "600",
    fontSize: 34,
    color: palette.ink,
    lineHeight: 40,
    marginBottom: 12,
  },
  h2: {
    fontFamily: "System",
    fontWeight: "600",
    fontSize: 25,
    color: palette.ink,
    marginBottom: 10,
  },
  h3: {
    fontFamily: "System",
    fontWeight: "600",
    fontSize: 21,
    color: palette.ink,
    marginBottom: 8,
  },
  body: {
    fontSize: 16,
    lineHeight: 25,
    color: palette.ink,
    marginBottom: 12,
  },
  small: {
    fontSize: 12,
    lineHeight: 19,
    color: palette.muted,
    marginBottom: 10,
  },
  eyebrow: {
    fontSize: 10,
    letterSpacing: 1.8,
    color: palette.green,
    fontWeight: "700",
    marginBottom: 12,
  },
  button: {
    minHeight: 52,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: palette.green,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 9,
    marginVertical: 4,
  },
  buttonText: { fontSize: 16, fontWeight: "600", color: "white" },
  secondary: { backgroundColor: palette.mint },
  card: {
    padding: 18,
    borderWidth: 1,
    borderColor: palette.line,
    borderRadius: 12,
    backgroundColor: palette.paper,
    marginBottom: 14,
  },
  chip: {
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: palette.line,
    borderRadius: 24,
    backgroundColor: palette.paper,
    marginBottom: 5,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: palette.ink,
    marginBottom: 7,
  },
  input: {
    backgroundColor: palette.paper,
    padding: 13,
    borderWidth: 1,
    borderColor: palette.line,
    borderRadius: 8,
    fontSize: 15,
    color: palette.ink,
    minHeight: 48,
  },
  notice: {
    padding: 14,
    backgroundColor: "#f6edda",
    borderRadius: 8,
    marginBottom: 16,
  },
  error: {
    fontSize: 14,
    lineHeight: 22,
    color: palette.red,
    marginVertical: 12,
  },
});
