import { StyleSheet, Text, View } from "react-native";
import { colors } from "@/shared/theme/colors";

export function EmptyState({ title, message }: { title: string; message?: string }) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{title}</Text>
      {message ? <Text style={styles.message}>{message}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    gap: 6
  },
  title: { fontSize: 16, fontWeight: "600", color: colors.text },
  message: { fontSize: 13, color: colors.textMuted, textAlign: "center" }
});
