import { useRouter } from "expo-router";
import { AlertTriangle, ChevronRight, ClipboardCheck } from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { buildPendingAttendance } from "@/features/principal/pendingAttendance";
import type { PrincipalSummary } from "@/shared/api/types";
import { colors } from "@/shared/theme/colors";

export function PrincipalPendingAttendanceCard({ summary }: { summary?: PrincipalSummary }) {
  const router = useRouter();
  const pending = buildPendingAttendance(summary);
  if (!pending) {
    return null;
  }

  const lessonLine =
    pending.pendingLessons > 0
      ? `${pending.pendingLessons} ders yoklaması bekliyor`
      : "Bazı sınıflarda yoklama tamamlanmadı";

  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push("/(app)/principal/attendance" as never)}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
    >
      <View style={styles.head}>
        <View style={styles.iconWrap}>
          <ClipboardCheck color="#b45309" size={18} strokeWidth={2.4} />
        </View>
        <View style={styles.copy}>
          <Text style={styles.title}>Bekleyen yoklama</Text>
          <Text style={styles.subtitle}>{lessonLine}</Text>
        </View>
        <ChevronRight color={colors.textMuted} size={16} strokeWidth={2.2} />
      </View>

      <View style={styles.metrics}>
        <View style={styles.metric}>
          <Text style={styles.metricValue}>{pending.pendingLessons}</Text>
          <Text style={styles.metricLabel}>bekleyen ders</Text>
        </View>
        <View style={styles.metric}>
          <Text style={styles.metricValue}>%{pending.completionPct}</Text>
          <Text style={styles.metricLabel}>tamamlanma</Text>
        </View>
        <View style={styles.metric}>
          <Text style={styles.metricValue}>{pending.pendingClasses.length}</Text>
          <Text style={styles.metricLabel}>sınıf</Text>
        </View>
      </View>

      {pending.pendingClasses.slice(0, 3).map((item) => (
        <View key={item.className} style={styles.row}>
          <AlertTriangle color="#d97706" size={14} strokeWidth={2.3} />
          <View style={styles.rowCopy}>
            <Text numberOfLines={1} style={styles.rowTitle}>
              {item.className}
            </Text>
            <Text style={styles.rowMeta}>
              {item.completed}/{item.total} ders tamam
            </Text>
          </View>
        </View>
      ))}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fffbeb",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#fde68a",
    padding: 14,
    gap: 12
  },
  cardPressed: { opacity: 0.9 },
  head: { flexDirection: "row", alignItems: "center", gap: 10 },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(245, 158, 11, 0.16)"
  },
  copy: { flex: 1, gap: 2 },
  title: { fontSize: 15, fontWeight: "800", color: "#92400e" },
  subtitle: { fontSize: 12, color: "#b45309", fontWeight: "600" },
  metrics: { flexDirection: "row", gap: 8 },
  metric: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.72)",
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    gap: 2
  },
  metricValue: { fontSize: 18, fontWeight: "900", color: "#92400e" },
  metricLabel: { fontSize: 10, fontWeight: "700", color: "#b45309" },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  rowCopy: { flex: 1, gap: 2 },
  rowTitle: { fontSize: 13, fontWeight: "800", color: "#78350f" },
  rowMeta: { fontSize: 11, color: "#b45309" }
});
