import { AlertTriangle, CheckCircle2 } from "lucide-react-native";
import { StyleSheet, Text, View } from "react-native";
import type { ScheduleConflictsResult } from "@/shared/api/types";
import { colors } from "@/shared/theme/colors";

export function PrincipalScheduleConflictsPanel({ result }: { result: ScheduleConflictsResult | null }) {
  if (!result) return null;

  const hard = result.conflicts.filter((item) => item.severity === "hard");
  const soft = result.conflicts.filter((item) => item.severity === "soft");

  return (
    <View style={[styles.card, result.valid ? styles.cardOk : styles.cardBad]}>
      <View style={styles.head}>
        {result.valid ? (
          <CheckCircle2 color="#15803d" size={18} strokeWidth={2.2} />
        ) : (
          <AlertTriangle color="#b91c1c" size={18} strokeWidth={2.2} />
        )}
        <Text style={styles.title}>{result.valid ? "Çakışma yok" : "Çakışma paneli"}</Text>
        <Text style={styles.meta}>
          {hard.length} sert · {soft.length} uyarı
        </Text>
      </View>

      {(result.conflicts.length > 0 ? result.conflicts : [...result.hardConflicts.map((m) => ({ severity: "hard" as const, type: "legacy", message: m })), ...result.softWarnings.map((m) => ({ severity: "soft" as const, type: "legacy", message: m }))]).slice(0, 8).map((item) => (
        <View
          key={`${item.severity}-${item.type}-${item.message}`}
          style={[styles.row, item.severity === "hard" ? styles.rowHard : styles.rowSoft]}
        >
          <Text style={styles.rowType}>{conflictTypeLabel(item.type)}</Text>
          <Text style={styles.rowMessage}>{item.message}</Text>
        </View>
      ))}
    </View>
  );
}

function conflictTypeLabel(type: string) {
  switch (type) {
    case "teacher":
      return "Öğretmen";
    case "class":
      return "Sınıf";
    case "room":
      return "Derslik";
    case "requirement":
      return "İhtiyaç";
    case "teacher_availability":
      return "Müsaitlik";
    default:
      return "Uyarı";
  }
}

const styles = StyleSheet.create({
  card: { borderRadius: 14, padding: 12, gap: 8, borderWidth: 1, marginBottom: 10 },
  cardOk: { backgroundColor: "#ecfdf5", borderColor: "#bbf7d0" },
  cardBad: { backgroundColor: "#fef2f2", borderColor: "#fecaca" },
  head: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  title: { fontSize: 14, fontWeight: "800", color: colors.text, flex: 1 },
  meta: { fontSize: 11, fontWeight: "700", color: colors.textMuted },
  row: { borderRadius: 10, padding: 10, gap: 3 },
  rowHard: { backgroundColor: "#fff5f5" },
  rowSoft: { backgroundColor: "#fffbeb" },
  rowType: { fontSize: 10, fontWeight: "800", color: colors.textMuted, textTransform: "uppercase" },
  rowMessage: { fontSize: 12, color: colors.text, lineHeight: 17, fontWeight: "500" }
});
