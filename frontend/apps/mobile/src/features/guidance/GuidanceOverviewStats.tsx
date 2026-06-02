import { AlertTriangle, BookOpen, FileText, FolderOpen, Users, type LucideIcon } from "lucide-react-native";
import { StyleSheet, Text, View } from "react-native";
import { colors } from "@/shared/theme/colors";

export type GuidanceOverviewStatsData = {
  studentCount: number;
  observationCount: number;
  noteCount: number;
  riskTrackingCount: number;
  openPlanCount: number;
  openCaseCount?: number;
  criticalCaseCount?: number;
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

function buildKpis(data: GuidanceOverviewStatsData): KpiConfig[] {
  return [
    {
      key: "students",
      label: "Öğrenci",
      value: String(data.studentCount),
      icon: Users,
      accent: colors.accent
    },
    {
      key: "observations",
      label: "Gözlem",
      value: String(data.observationCount),
      icon: BookOpen,
      accent: "#2563eb"
    },
    {
      key: "notes",
      label: "Not",
      value: String(data.noteCount),
      icon: FileText,
      accent: "#7c3aed"
    },
    {
      key: "risk",
      label: "Risk takibi",
      value: String(data.riskTrackingCount),
      icon: AlertTriangle,
      accent: data.riskTrackingCount > 0 ? colors.danger : "#64748b",
      valueColor: data.riskTrackingCount > 0 ? colors.danger : colors.text,
      hint: data.openPlanCount > 0 ? `${data.openPlanCount} açık plan` : "Plan yok"
    },
    {
      key: "cases",
      label: "Vaka",
      value: String(data.openCaseCount ?? 0),
      icon: FolderOpen,
      accent: "#7c3aed",
      hint: (data.criticalCaseCount ?? 0) > 0 ? `${data.criticalCaseCount} kritik` : "Aktif vaka"
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
      {item.hint ? <Text style={styles.hint}>{item.hint}</Text> : null}
    </View>
  );
}

export function GuidanceOverviewStats({ data }: { data: GuidanceOverviewStatsData }) {
  return (
    <View style={styles.grid}>
      {buildKpis(data).map((item) => (
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
    gap: 4,
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
  },
  hint: {
    fontSize: 10,
    fontWeight: "600",
    color: colors.textMuted
  }
});
