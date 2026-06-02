import { useQuery } from "@tanstack/react-query";
import { Award, BookOpen } from "lucide-react-native";
import { StyleSheet, Text, View } from "react-native";
import { api } from "@/shared/api/client";
import { queryKeys } from "@/shared/api/queryKeys";
import { colors } from "@/shared/theme/colors";

function pct(value?: number) {
  return `${Math.round(value ?? 0)}%`;
}

export function GuardianAcademicReportCard({ studentId }: { studentId: string }) {
  const reportQ = useQuery({
    queryKey: queryKeys.guardianAcademicReport(studentId),
    queryFn: () => api.guardianAcademicReport(studentId),
    enabled: Boolean(studentId)
  });

  if (reportQ.isError) return null;
  const report = reportQ.data;

  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <View style={styles.iconWrap}>
          <Award color={colors.primary} size={18} strokeWidth={2.4} />
        </View>
        <View style={styles.copy}>
          <Text style={styles.title}>Akademik rapor</Text>
          <Text style={styles.subtitle}>{reportQ.isLoading ? "Yükleniyor" : `${report?.assessmentCount ?? 0} ölçme sonucu`}</Text>
        </View>
        <Text style={styles.score}>{reportQ.isLoading ? "..." : pct(report?.averagePercent)}</Text>
      </View>

      {(report?.subjectSummaries ?? []).slice(0, 3).map((item) => (
        <View key={item.subjectId} style={styles.subjectRow}>
          <BookOpen color={item.needsSupport ? colors.danger : colors.accent} size={14} strokeWidth={2.4} />
          <Text style={styles.subjectName}>{item.subjectName}</Text>
          <Text style={styles.subjectScore}>{pct(item.averagePercent)}</Text>
        </View>
      ))}

      {report?.supportSignals?.[0] ? <Text style={styles.signal}>{report.supportSignals[0]}</Text> : null}
      {report?.aiWeeklySummary ? <Text style={styles.aiText}>{report.aiWeeklySummary}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    gap: 10
  },
  head: { flexDirection: "row", alignItems: "center", gap: 10 },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: colors.accentLight,
    alignItems: "center",
    justifyContent: "center"
  },
  copy: { flex: 1, gap: 2 },
  title: { fontSize: 15, fontWeight: "800", color: colors.text },
  subtitle: { fontSize: 12, color: colors.textMuted },
  score: { fontSize: 18, fontWeight: "900", color: colors.primary },
  subjectRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  subjectName: { flex: 1, fontSize: 13, fontWeight: "700", color: colors.text },
  subjectScore: { fontSize: 12, fontWeight: "800", color: colors.primaryLight },
  signal: { fontSize: 12, fontWeight: "700", color: colors.text },
  aiText: { fontSize: 12, color: colors.textMuted, lineHeight: 17 }
});
