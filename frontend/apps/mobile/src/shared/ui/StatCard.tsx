import { StyleSheet, Text, View } from "react-native";
import { colors } from "@/shared/theme/colors";

export function StatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <View style={styles.card}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: "46%",
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 4
  },
  label: { fontSize: 12, color: colors.textMuted, fontWeight: "600" },
  value: { fontSize: 22, fontWeight: "700", color: colors.text },
  hint: { fontSize: 11, color: colors.textMuted }
});
