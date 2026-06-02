import { useQuery } from "@tanstack/react-query";
import { BarChart3, TrendingDown, TrendingUp } from "lucide-react-native";
import { StyleSheet, Text, View } from "react-native";
import { usePrincipalRoster } from "@/features/principal/usePrincipalRoster";
import { api } from "@/shared/api/client";
import { queryKeys } from "@/shared/api/queryKeys";
import { colors } from "@/shared/theme/colors";

function pct(value?: number) {
  return `${Math.round(value ?? 0)}%`;
}

export function PrincipalAcademicOverviewCard() {
  const rosterQ = usePrincipalRoster();
  const firstClass = rosterQ.data?.classes?.[0];
  const summaryQ = useQuery({
    queryKey: queryKeys.classAcademicSummary(firstClass?.id ?? ""),
    queryFn: () => api.classAcademicSummary(firstClass!.id),
    enabled: Boolean(firstClass?.id)
  });

  if (!firstClass || summaryQ.isError) return null;
  const summary = summaryQ.data;
  const supportCount = summary?.supportStudents.length ?? 0;

  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <View style={styles.iconWrap}>
          <BarChart3 color={colors.primary} size={18} strokeWidth={2.4} />
        </View>
        <View style={styles.headCopy}>
          <Text style={styles.title}>Akademik gelişim</Text>
          <Text style={styles.subtitle}>{summary?.class.name ?? firstClass.name} sınıf trendi</Text>
        </View>
        <Text style={styles.score}>{summaryQ.isLoading ? "..." : pct(summary?.averagePercent)}</Text>
      </View>

      <View style={styles.metricRow}>
        <View style={styles.metric}>
          <Text style={styles.metricValue}>{summary?.assessmentCount ?? 0}</Text>
          <Text style={styles.metricLabel}>ölçme</Text>
        </View>
        <View style={styles.metric}>
          <Text style={styles.metricValue}>{summary?.studentCount ?? 0}</Text>
          <Text style={styles.metricLabel}>öğrenci</Text>
        </View>
        <View style={styles.metric}>
          <Text style={[styles.metricValue, supportCount > 0 && styles.metricRisk]}>{supportCount}</Text>
          <Text style={styles.metricLabel}>destek</Text>
        </View>
      </View>

      {(summary?.subjectSummaries ?? []).slice(0, 3).map((item) => (
        <View key={item.subjectId} style={styles.subjectRow}>
          {item.trend === "up" ? (
            <TrendingUp color="#047857" size={14} strokeWidth={2.4} />
          ) : (
            <TrendingDown color={item.needsSupportCount > 0 ? colors.danger : colors.textMuted} size={14} strokeWidth={2.4} />
          )}
          <Text style={styles.subjectName}>{item.subjectName}</Text>
          <Text style={styles.subjectScore}>{pct(item.averagePercent)}</Text>
        </View>
      ))}

      {summary?.aiWeeklySummary ? <Text style={styles.aiText}>{summary.aiWeeklySummary}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    gap: 12
  },
  head: { flexDirection: "row", alignItems: "center", gap: 10 },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.accentLight
  },
  headCopy: { flex: 1, gap: 2 },
  title: { fontSize: 15, fontWeight: "800", color: colors.text },
  subtitle: { fontSize: 12, color: colors.textMuted },
  score: { fontSize: 18, fontWeight: "900", color: colors.primary },
  metricRow: { flexDirection: "row", gap: 8 },
  metric: {
    flex: 1,
    borderRadius: 12,
    backgroundColor: colors.background,
    padding: 10,
    gap: 2
  },
  metricValue: { fontSize: 17, fontWeight: "900", color: colors.text },
  metricRisk: { color: colors.danger },
  metricLabel: { fontSize: 11, fontWeight: "700", color: colors.textMuted },
  subjectRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  subjectName: { flex: 1, fontSize: 13, fontWeight: "700", color: colors.text },
  subjectScore: { fontSize: 12, fontWeight: "800", color: colors.primaryLight },
  aiText: { fontSize: 12, color: colors.textMuted, lineHeight: 17 }
});
