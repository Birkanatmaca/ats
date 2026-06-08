import { useQuery } from "@tanstack/react-query";
import { CreditCard, ReceiptText } from "lucide-react-native";
import { StyleSheet, Text, View } from "react-native";
import { api } from "@/shared/api/client";
import { queryKeys } from "@/shared/api/queryKeys";
import { colors } from "@/shared/theme/colors";

function money(value?: number) {
  return `${Math.round(value ?? 0).toLocaleString("tr-TR")} TL`;
}

export function GuardianBillingCard({ studentId }: { studentId: string }) {
  const billingQ = useQuery({
    queryKey: queryKeys.guardianBilling(studentId),
    queryFn: () => api.guardianBilling(studentId),
    enabled: Boolean(studentId)
  });

  if (billingQ.isError) return null;
  const summary = billingQ.data;

  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <View style={styles.iconWrap}>
          <CreditCard color={colors.success} size={18} strokeWidth={2.4} />
        </View>
        <View style={styles.copy}>
          <Text style={styles.title}>Tahsilat özeti</Text>
          <Text style={styles.subtitle}>{billingQ.isLoading ? "Yükleniyor" : `${summary?.upcomingInstallments.length ?? 0} bekleyen taksit`}</Text>
        </View>
        <Text style={styles.amount}>{billingQ.isLoading ? "..." : money(summary?.outstandingAmount)}</Text>
      </View>

      {(summary?.overdueInstallments ?? []).slice(0, 2).map((item) => (
        <View key={item.id} style={styles.row}>
          <ReceiptText color={colors.danger} size={14} strokeWidth={2.3} />
          <View style={styles.rowCopy}>
            <Text style={styles.rowTitle}>Gecikmiş taksit</Text>
            <Text style={styles.rowMeta}>{item.dueDate}</Text>
          </View>
          <Text style={styles.rowAmount}>{money(item.remainingAmount)}</Text>
        </View>
      ))}

      {(summary?.upcomingInstallments ?? []).slice(0, 3).map((item) => (
        <View key={item.id} style={styles.row}>
          <ReceiptText color={colors.accent} size={14} strokeWidth={2.3} />
          <View style={styles.rowCopy}>
            <Text style={styles.rowTitle}>{item.planName ?? "Ödeme planı"}</Text>
            <Text style={styles.rowMeta}>{item.dueDate}</Text>
          </View>
          <Text style={styles.rowAmount}>{money(item.remainingAmount)}</Text>
        </View>
      ))}

      {summary?.paymentHistory?.[0] ? (
        <Text style={styles.history}>Son ödeme: {money(summary.paymentHistory[0].amount)} · {summary.paymentHistory[0].paidAt.slice(0, 10)}</Text>
      ) : null}
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
    backgroundColor: "#ecfdf5",
    alignItems: "center",
    justifyContent: "center"
  },
  copy: { flex: 1, gap: 2 },
  title: { fontSize: 15, fontWeight: "800", color: colors.text },
  subtitle: { fontSize: 12, color: colors.textMuted },
  amount: { fontSize: 15, fontWeight: "900", color: colors.success },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  rowCopy: { flex: 1, gap: 2 },
  rowTitle: { fontSize: 13, fontWeight: "800", color: colors.text },
  rowMeta: { fontSize: 11, color: colors.textMuted },
  rowAmount: { fontSize: 12, fontWeight: "900", color: colors.text },
  history: { fontSize: 12, color: colors.textMuted, lineHeight: 17 }
});
