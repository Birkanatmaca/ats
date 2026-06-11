import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { Bus, ChevronRight, Radio, TriangleAlert } from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { api } from "@/shared/api/client";
import { queryKeys } from "@/shared/api/queryKeys";
import { colors } from "@/shared/theme/colors";

const LIVE_POLL_MS = 15_000;

export function PrincipalServiceOverviewCard() {
  const router = useRouter();
  const routesQ = useQuery({ queryKey: queryKeys.serviceRoutes, queryFn: () => api.serviceRoutes() });
  const tripsQ = useQuery({
    queryKey: queryKeys.activeServiceTrips,
    queryFn: () => api.activeServiceTrips(),
    refetchInterval: LIVE_POLL_MS
  });

  if (routesQ.isError) return null;
  const routes = routesQ.data ?? [];
  const trips = tripsQ.data ?? [];
  const assigned = routes.reduce((total, route) => total + route.assignments.length, 0);
  const warnings = routes.filter((route) => route.capacityWarning).length;

  return (
    <View style={styles.card}>
      <Pressable
        onPress={() => router.push("/(app)/principal/live-trips" as never)}
        style={({ pressed }) => [styles.liveLink, pressed && styles.liveLinkPressed]}
      >
        <View style={styles.liveIcon}>
          <Radio color={colors.success} size={16} strokeWidth={2.4} />
        </View>
        <View style={styles.liveCopy}>
          <Text style={styles.liveTitle}>Canlı sefer takibi</Text>
          <Text style={styles.liveMeta}>{tripsQ.isLoading ? "Yükleniyor" : `${trips.length} aktif sefer`}</Text>
        </View>
        <ChevronRight color={colors.textMuted} size={16} strokeWidth={2.2} />
      </Pressable>

      <View style={styles.head}>
        <View style={styles.iconWrap}>
          <Bus color={colors.accent} size={18} strokeWidth={2.4} />
        </View>
        <View style={styles.copy}>
          <Text style={styles.title}>Servis operasyonu</Text>
          <Text style={styles.subtitle}>{routesQ.isLoading ? "Yükleniyor" : `${routes.length} rota · ${assigned} öğrenci`}</Text>
        </View>
        <Text style={[styles.warning, warnings > 0 && styles.warningDanger]}>{warnings}</Text>
      </View>

      {routes.slice(0, 3).map((route) => (
        <View key={route.id} style={styles.row}>
          <TriangleAlert color={route.capacityWarning ? colors.danger : colors.textMuted} size={14} strokeWidth={2.3} />
          <View style={styles.rowCopy}>
            <Text numberOfLines={1} style={styles.rowTitle}>
              {route.name}
            </Text>
            <Text style={styles.rowMeta}>
              {route.vehiclePlate || "Araç yok"} · {route.driverName || "Şoför yok"}
              {route.driverSharingStatus === "active" ? " · canlı" : ""}
            </Text>
          </View>
          <Text style={styles.rowCount}>{route.assignments.length}</Text>
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
  liveLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 10,
    borderRadius: 12,
    backgroundColor: colors.accentLight
  },
  liveLinkPressed: { opacity: 0.85 },
  liveIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(34, 197, 94, 0.12)"
  },
  liveCopy: { flex: 1, gap: 2 },
  liveTitle: { fontSize: 13, fontWeight: "900", color: colors.text },
  liveMeta: { fontSize: 11, color: colors.textMuted, fontWeight: "700" },
  head: { flexDirection: "row", alignItems: "center", gap: 10 },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.accentLight
  },
  copy: { flex: 1, gap: 2 },
  title: { fontSize: 15, fontWeight: "800", color: colors.text },
  subtitle: { fontSize: 12, color: colors.textMuted },
  warning: { fontSize: 18, fontWeight: "900", color: colors.textMuted },
  warningDanger: { color: colors.danger },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  rowCopy: { flex: 1, gap: 2 },
  rowTitle: { fontSize: 13, fontWeight: "800", color: colors.text },
  rowMeta: { fontSize: 11, color: colors.textMuted },
  rowCount: { fontSize: 12, fontWeight: "900", color: colors.accent }
});
