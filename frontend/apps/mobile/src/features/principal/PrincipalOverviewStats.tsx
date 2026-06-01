import { ClipboardCheck, GraduationCap, UserRoundX, Users, type LucideIcon } from "lucide-react-native";
import { StyleSheet, Text, View } from "react-native";
import type { PrincipalSummary } from "@/shared/api/types";
import { colors } from "@/shared/theme/colors";

type KpiConfig = {
  key: string;
  label: string;
  value: string;
  icon: LucideIcon;
  accent: string;
  valueColor?: string;
};

function buildKpis(summary?: PrincipalSummary): KpiConfig[] {
  const absent = summary?.absentToday ?? 0;
  const attendance = summary?.attendanceCompletionPct ?? 0;

  return [
    {
      key: "students",
      label: "Öğrenci",
      value: String(summary?.activeStudents ?? 0),
      icon: Users,
      accent: colors.accent
    },
    {
      key: "teachers",
      label: "Öğretmen",
      value: String(summary?.activeTeachers ?? 0),
      icon: GraduationCap,
      accent: colors.success
    },
    {
      key: "attendance",
      label: "Yoklama",
      value: `%${attendance}`,
      icon: ClipboardCheck,
      accent: colors.primaryLight,
      valueColor: attendance >= 80 ? colors.text : colors.danger
    },
    {
      key: "absent",
      label: "Gelmeyen",
      value: String(absent),
      icon: UserRoundX,
      accent: absent > 0 ? colors.danger : "#64748b",
      valueColor: absent > 0 ? colors.danger : colors.text
    }
  ];
}

function KpiCard({ item }: { item: KpiConfig }) {
  const Icon = item.icon;

  return (
    <View style={styles.card}>
      <View style={styles.top}>
        <Icon color={item.accent} size={16} strokeWidth={2} />
        <Text numberOfLines={1} style={styles.label}>
          {item.label}
        </Text>
      </View>
      <Text style={[styles.value, item.valueColor ? { color: item.valueColor } : null]}>{item.value}</Text>
    </View>
  );
}

export function PrincipalOverviewStats({ summary }: { summary?: PrincipalSummary }) {
  return (
    <View style={styles.grid}>
      {buildKpis(summary).map((item) => (
        <KpiCard key={item.key} item={item} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  card: {
    width: "48.5%",
    flexGrow: 1,
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 6,
    minHeight: 76
  },
  top: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6
  },
  label: {
    flex: 1,
    fontSize: 11,
    fontWeight: "600",
    color: colors.textMuted
  },
  value: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.text,
    letterSpacing: -0.4,
    lineHeight: 26
  }
});
