import { useQuery } from "@tanstack/react-query";
import { CircleDollarSign, ReceiptText } from "lucide-react-native";
import { StyleSheet, Text, View } from "react-native";
import { api } from "@/shared/api/client";
import { queryKeys } from "@/shared/api/queryKeys";
import { colors } from "@/shared/theme/colors";

function money(value?: number) {
  return `${Math.round(value ?? 0).toLocaleString("tr-TR")} TL`;
}

export function PrincipalBillingOverviewCard() {
  const dashboardQ = useQuery({ queryKey: queryKeys.billingDashboard, queryFn: () => api.billingDashboard() });
  if (dashboardQ.isError) return null;
  const dashboard = dashboardQ.data;

  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <View style={styles.iconWrap}>
          <CircleDollarSign color={colors.success} size={19} strokeWidth={2.4} />
        </View>
        <View style={styles.copy}>
          <Text style={styles.title}>Tahsilat</Text>
          <Text style={styles.subtitle}>{dashboardQ.isLoading ? "Yükleniyor" : `${dashboard?.activePlanCount ?? 0} aktif ödeme planı`}</Text>
        </View>
        <Text style={styles.overdue}>{dashboardQ.isLoading ? "..." : money(dashboard?.overdueAmount)}</Text>
      </View>

      <View style={styles.metricRow}>
        <View style={styles.metric}>
          <Text style={styles.metricValue}>{money(dashboard?.collectedAmount)}</Text>
          <Text style={styles.metricLabel}>tahsil edilen</Text>
        </View>
        <View style={styles.metric}>
          <Text style={styles.metricValue}>{money(dashboard?.outstandingAmount)}</Text>
          <Text style={styles.metricLabel}>bekleyen</Text>
        </View>
      </View>

      {(dashboard?.overdueInstallments ?? []).slice(0, 3).map((item) => (
        <View key={item.id} style={styles.row}>
          <ReceiptText color={colors.danger} size={14} strokeWidth={2.3} />
          <View style={styles.rowCopy}>
            <Text numberOfLines={1} style={styles.rowTitle}>
              {item.studentName ?? "Öğrenci"} · {item.className ?? "Sınıf"}
            </Text>
            <Text style={styles.rowMeta}>{item.dueDate}</Text>
          </View>
          <Text style={styles.rowAmount}>{money(item.remainingAmount)}</Text>
        </View>
      ))}
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
    backgroundColor: "#ecfdf5"
  },
  copy: { flex: 1, gap: 2 },
  title: { fontSize: 15, fontWeight: "800", color: colors.text },
  subtitle: { fontSize: 12, color: colors.textMuted },
  overdue: { fontSize: 15, fontWeight: "900", color: colors.danger },
  metricRow: { flexDirection: "row", gap: 8 },
  metric: {
    flex: 1,
    borderRadius: 12,
    backgroundColor: colors.background,
    padding: 10,
    gap: 2
  },
  metricValue: { fontSize: 15, fontWeight: "900", color: colors.text },
  metricLabel: { fontSize: 11, fontWeight: "700", color: colors.textMuted },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  rowCopy: { flex: 1, gap: 2 },
  rowTitle: { fontSize: 12, fontWeight: "800", color: colors.text },
  rowMeta: { fontSize: 11, color: colors.textMuted },
  rowAmount: { fontSize: 12, fontWeight: "900", color: colors.danger }
});
