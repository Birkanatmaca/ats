import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { AlertTriangle, ChevronRight, FolderOpen } from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { api } from "@/shared/api/client";
import { queryKeys } from "@/shared/api/queryKeys";
import { colors } from "@/shared/theme/colors";

export function PrincipalGuidanceCasesCard() {
  const router = useRouter();
  const statsQ = useQuery({ queryKey: queryKeys.guidanceCaseStats, queryFn: () => api.guidanceCaseStats() });
  const casesQ = useQuery({
    queryKey: [...queryKeys.guidanceCases, "principal-preview"],
    queryFn: () => api.guidanceCases({ status: "open" })
  });

  const stats = statsQ.data;
  const preview = (casesQ.data ?? []).slice(0, 3);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.iconWrap}>
          <FolderOpen color="#7c3aed" size={18} strokeWidth={2.2} />
        </View>
        <View style={styles.copy}>
          <Text style={styles.title}>Rehberlik vaka özeti</Text>
          <Text style={styles.subtitle}>Hassas içerik maskeli özet görünüm</Text>
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{stats?.openCount ?? "—"}</Text>
          <Text style={styles.statLabel}>açık vaka</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{stats?.criticalCount ?? "—"}</Text>
          <Text style={styles.statLabel}>kritik</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{stats?.overduePlanCount ?? "—"}</Text>
          <Text style={styles.statLabel}>geciken plan</Text>
        </View>
      </View>

      {preview.map((item) => (
        <View key={item.id} style={styles.previewRow}>
          <AlertTriangle color="#b45309" size={14} strokeWidth={2.2} />
          <View style={styles.previewCopy}>
            <Text style={styles.previewTitle}>{item.title}</Text>
            <Text style={styles.previewMeta}>
              {item.studentName} · {item.className}
            </Text>
          </View>
        </View>
      ))}

      <Pressable onPress={() => router.push("/(app)/principal/guidance-cases")} style={styles.linkBtn}>
        <Text style={styles.linkText}>Tüm vaka özetini gör</Text>
        <ChevronRight color={colors.accent} size={16} strokeWidth={2.2} />
      </Pressable>
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
    gap: 10
  },
  header: { flexDirection: "row", gap: 10, alignItems: "center" },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#f5f3ff",
    alignItems: "center",
    justifyContent: "center"
  },
  copy: { flex: 1, gap: 2 },
  title: { fontSize: 14, fontWeight: "800", color: colors.text },
  subtitle: { fontSize: 12, color: colors.textMuted, fontWeight: "500" },
  statsRow: { flexDirection: "row", gap: 8 },
  stat: {
    flex: 1,
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 10,
    alignItems: "center",
    gap: 2
  },
  statValue: { fontSize: 18, fontWeight: "800", color: colors.text },
  statLabel: { fontSize: 11, color: colors.textMuted, fontWeight: "600" },
  previewRow: { flexDirection: "row", gap: 8, alignItems: "flex-start" },
  previewCopy: { flex: 1, gap: 2 },
  previewTitle: { fontSize: 13, fontWeight: "700", color: colors.text },
  previewMeta: { fontSize: 12, color: colors.textMuted },
  linkBtn: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingTop: 4 },
  linkText: { fontSize: 13, fontWeight: "700", color: colors.accent }
});
