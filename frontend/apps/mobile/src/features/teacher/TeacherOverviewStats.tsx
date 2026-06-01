import { BookOpen, CalendarDays, ClipboardCheck, Users, type LucideIcon } from "lucide-react-native";
import { StyleSheet, Text, View } from "react-native";
import { colors } from "@/shared/theme/colors";

export type TeacherOverviewStatsData = {
  todayLessonCount: number;
  activeClassLabel: string;
  pendingAttendance: number;
  attendanceTotal: number;
  observationCount: number;
  studentScopeCount: number;
};

type KpiConfig = {
  key: string;
  label: string;
  value: string;
  icon: LucideIcon;
  accent: string;
  valueColor?: string;
  hint?: string;
};

function buildKpis(data: TeacherOverviewStatsData): KpiConfig[] {
  return [
    {
      key: "lessons",
      label: "Bugünkü ders",
      value: String(data.todayLessonCount),
      icon: CalendarDays,
      accent: "#059669"
    },
    {
      key: "class",
      label: "Aktif sınıf",
      value: data.activeClassLabel,
      icon: Users,
      accent: "#2563eb",
      hint: data.todayLessonCount > 0 ? "Programdan" : "Ders yok"
    },
    {
      key: "attendance",
      label: "Yoklama bekleyen",
      value: String(data.pendingAttendance),
      icon: ClipboardCheck,
      accent: data.pendingAttendance > 0 ? colors.danger : "#64748b",
      valueColor: data.pendingAttendance > 0 ? colors.danger : colors.text,
      hint: data.attendanceTotal > 0 ? `${data.attendanceTotal} öğrenci` : "Oturum kapalı"
    },
    {
      key: "observations",
      label: "Gözlem",
      value: String(data.observationCount),
      icon: BookOpen,
      accent: "#7c3aed",
      hint: `${data.studentScopeCount} öğrenci kapsamı`
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
      <Text numberOfLines={1} style={[styles.value, item.valueColor ? { color: item.valueColor } : null]}>
        {item.value}
      </Text>
      {item.hint ? <Text style={styles.hint}>{item.hint}</Text> : null}
    </View>
  );
}

export function TeacherOverviewStats({ data }: { data: TeacherOverviewStatsData }) {
  return (
    <View style={styles.grid}>
      {buildKpis(data).map((item) => (
        <KpiCard key={item.key} item={item} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  card: {
    width: "48.5%",
    flexGrow: 1,
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 4,
    minHeight: 76
  },
  top: { flexDirection: "row", alignItems: "center", gap: 6 },
  label: { flex: 1, fontSize: 11, fontWeight: "600", color: colors.textMuted },
  value: { fontSize: 20, fontWeight: "700", color: colors.text, letterSpacing: -0.4, lineHeight: 24 },
  hint: { fontSize: 10, fontWeight: "600", color: colors.textMuted }
});
