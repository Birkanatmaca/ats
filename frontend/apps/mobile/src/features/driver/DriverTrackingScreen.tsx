import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MapPin, PauseCircle, PlayCircle } from "lucide-react-native";
import { useMemo } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { useAuth } from "@/shared/auth/AuthContext";
import { api } from "@/shared/api/client";
import { queryKeys } from "@/shared/api/queryKeys";
import { colors } from "@/shared/theme/colors";
import { ErrorState } from "@/shared/ui/ErrorState";
import { LoadingBlock } from "@/shared/ui/LoadingBlock";
import { Screen } from "@/shared/ui/Screen";

function formatSeenAt(value?: string) {
  if (!value) return "Henüz konum paylaşılmadı";
  return new Intl.DateTimeFormat("tr-TR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}

function formatLocation(latitude?: number, longitude?: number) {
  if (typeof latitude !== "number" || typeof longitude !== "number") return null;
  return `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
}

export function DriverTrackingScreen() {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const sessionQ = useQuery({ queryKey: queryKeys.driverSession, queryFn: () => api.driverSession() });

  const startMut = useMutation({
    mutationFn: () => api.startDriverSharing(),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.driverSession });
      await queryClient.invalidateQueries({ queryKey: queryKeys.serviceRoutes });
    }
  });

  const stopMut = useMutation({
    mutationFn: () => api.stopDriverSharing(),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.driverSession });
      await queryClient.invalidateQueries({ queryKey: queryKeys.serviceRoutes });
    }
  });

  const summary = sessionQ.data;
  const activeTrip = summary?.activeTrip;
  const lastLocation = activeTrip?.lastLocation;
  const route = summary?.routes?.[0];
  const sharingActive = summary?.isSharing ?? summary?.staff.sharingStatus === "active";
  const busy = startMut.isPending || stopMut.isPending;

  const routeLabel = useMemo(() => {
    if (activeTrip?.routeName) return activeTrip.routeName;
    if (!route) return "Rota atanmadı";
    return `${route.name} · ${route.vehiclePlate || "Araç yok"}`;
  }, [activeTrip?.routeName, route]);

  async function toggleSharing() {
    if (sharingActive) {
      await stopMut.mutateAsync();
      return;
    }
    await startMut.mutateAsync();
  }

  return (
    <Screen
      title="Şoför"
      subtitle="Konum paylaşımı ve servis takibi"
      refreshing={sessionQ.isRefetching}
      onRefresh={() => {
        void sessionQ.refetch();
      }}
    >
      {sessionQ.isError ? <ErrorState message="Şoför bilgisi alınamadı." onRetry={() => void sessionQ.refetch()} /> : null}
      {sessionQ.isLoading ? <LoadingBlock /> : null}

      <View style={styles.hero}>
        <Text style={styles.kicker}>Canlı servis takibi</Text>
        <Text style={styles.title}>{session?.principal.name ?? summary?.staff.fullName ?? "Şoför paneli"}</Text>
        <Text style={styles.copy}>{routeLabel}</Text>
      </View>

      <View style={styles.routeCard}>
        <View style={styles.routeHead}>
          <View style={[styles.statusDot, sharingActive && styles.statusDotActive]} />
          <View style={styles.routeCopy}>
            <Text style={styles.routeTitle}>{sharingActive ? "Konum paylaşımı aktif" : "Konum paylaşımı kapalı"}</Text>
            <Text style={styles.routeMeta}>{formatLocation(lastLocation?.latitude, lastLocation?.longitude) ?? formatSeenAt(summary?.lastSeenAt)}</Text>
          </View>
          <MapPin color={colors.accent} size={18} strokeWidth={2.4} />
        </View>

        {activeTrip ? (
          <View style={styles.tripMeta}>
            <Text style={styles.tripMetaText}>Canlı oturum {activeTrip.id.slice(0, 8)}</Text>
            <Text style={styles.tripMetaText}>{formatSeenAt(activeTrip.startedAt)}</Text>
          </View>
        ) : null}

        {(route?.stops ?? []).slice(0, 4).map((stop, index) => (
          <View key={stop.id} style={styles.stopRow}>
            <View style={[styles.stopIndex, sharingActive && styles.stopIndexActive]}>
              <Text style={styles.stopIndexText}>{index + 1}</Text>
            </View>
            <View style={styles.stopCopy}>
              <Text style={styles.stopName}>{stop.name}</Text>
              <Text style={styles.stopTime}>{stop.plannedTime}</Text>
            </View>
          </View>
        ))}
      </View>

      <Pressable
        disabled={busy || sessionQ.isLoading || sessionQ.isError}
        onPress={() => {
          void toggleSharing();
        }}
        style={({ pressed }) => [
          styles.action,
          sharingActive && styles.actionActive,
          pressed && !busy ? styles.actionPressed : null,
          (busy || sessionQ.isLoading || sessionQ.isError) && styles.actionDisabled
        ]}
      >
        {busy ? <ActivityIndicator color="#fff" /> : sharingActive ? <PauseCircle color="#fff" size={24} strokeWidth={2.2} /> : <PlayCircle color="#fff" size={24} strokeWidth={2.2} />}
        <Text style={styles.actionText}>{sharingActive ? "Konum takibini durdur" : "Konum takibini başlat"}</Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    gap: 6,
    padding: 18,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border
  },
  kicker: { color: colors.accent, fontSize: 12, fontWeight: "900", letterSpacing: 0.8, textTransform: "uppercase" },
  title: { color: colors.text, fontSize: 22, fontWeight: "900" },
  copy: { color: colors.textMuted, fontSize: 13, fontWeight: "700" },
  routeCard: {
    gap: 10,
    padding: 18,
    borderRadius: 24,
    backgroundColor: "rgba(44, 62, 80, 0.92)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)"
  },
  routeHead: { flexDirection: "row", alignItems: "center", gap: 12 },
  statusDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.textMuted },
  statusDotActive: { backgroundColor: colors.success },
  routeCopy: { flex: 1, gap: 2 },
  routeTitle: { color: "#fff", fontSize: 16, fontWeight: "900" },
  routeMeta: { color: "rgba(255,255,255,0.7)", fontSize: 12, fontWeight: "700" },
  tripMeta: { flexDirection: "row", justifyContent: "space-between", gap: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.08)" },
  tripMetaText: { color: "rgba(255,255,255,0.72)", flex: 1, fontSize: 11, fontWeight: "800" },
  stopRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.08)" },
  stopIndex: { width: 26, height: 26, borderRadius: 13, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.12)" },
  stopIndexActive: { backgroundColor: colors.accent },
  stopIndexText: { color: "#fff", fontSize: 12, fontWeight: "900" },
  stopCopy: { flex: 1, gap: 2 },
  stopName: { color: "#fff", fontSize: 13, fontWeight: "800" },
  stopTime: { color: "rgba(255,255,255,0.72)", fontSize: 12, fontWeight: "700" },
  action: {
    minHeight: 154,
    borderRadius: 77,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingHorizontal: 24,
    backgroundColor: colors.accent,
    shadowColor: colors.accent,
    shadowOpacity: 0.35,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 5
  },
  actionActive: { backgroundColor: colors.primary },
  actionPressed: { transform: [{ scale: 0.98 }] },
  actionDisabled: { opacity: 0.7 },
  actionText: { color: "#fff", fontSize: 18, fontWeight: "900", textAlign: "center" }
});
