import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors } from "@/shared/theme/colors";

export function ListCard({
  title,
  subtitle,
  meta,
  onPress
}: {
  title: string;
  subtitle?: string;
  meta?: string;
  onPress?: () => void;
}) {
  const content = (
    <View style={styles.card}>
      <View style={styles.body}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {meta ? <Text style={styles.meta}>{meta}</Text> : null}
    </View>
  );

  if (!onPress) {
    return content;
  }

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [pressed && styles.pressed]}>
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: "row",
    alignItems: "center",
    gap: 12
  },
  pressed: { opacity: 0.85 },
  body: { flex: 1, gap: 4 },
  title: { fontSize: 15, fontWeight: "600", color: colors.text },
  subtitle: { fontSize: 13, color: colors.textMuted },
  meta: { fontSize: 12, color: colors.accent, fontWeight: "600" }
});
