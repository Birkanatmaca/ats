import { Pressable, ScrollView, StyleSheet, Text } from "react-native";
import { useGuardian } from "@/features/guardian/GuardianContext";
import { colors } from "@/shared/theme/colors";

export function ChildSelector() {
  const { children, selectedChildId, setSelectedChildId } = useGuardian();
  if (children.length <= 1) return null;

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.row} contentContainerStyle={styles.content}>
      {children.map((child) => {
        const active = child.id === selectedChildId;
        return (
          <Pressable
            key={child.id}
            onPress={() => setSelectedChildId(child.id)}
            style={[styles.chip, active && styles.chipActive]}
          >
            <Text style={[styles.chipText, active && styles.chipTextActive]}>{child.fullName}</Text>
            <Text style={[styles.chipMeta, active && styles.chipTextActive]}>{child.className}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { marginBottom: 8, maxHeight: 72 },
  content: { gap: 8, paddingVertical: 4 },
  chip: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minWidth: 120
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontWeight: "700", fontSize: 14, color: colors.text },
  chipTextActive: { color: "#fff" },
  chipMeta: { fontSize: 11, color: colors.textMuted, marginTop: 2 }
});
