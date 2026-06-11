import { useQuery } from "@tanstack/react-query";
import { Bus, Radio } from "lucide-react-native";
import { StyleSheet, Text, View } from "react-native";
import { formatLiveStatus } from "@/features/transport/formatLiveStatus";
import { ServiceLiveMap } from "@/features/transport/ServiceLiveMap";
import { api } from "@/shared/api/client";
import { queryKeys } from "@/shared/api/queryKeys";
import { colors } from "@/shared/theme/colors";
import { ErrorState } from "@/shared/ui/ErrorState";
import { LoadingBlock } from "@/shared/ui/LoadingBlock";
import { Screen } from "@/shared/ui/Screen";

const LIVE_POLL_MS = 12_000;

function directionLabel(value: string) {
  if (value === "evening") return "Akşam";
  if (value === "both") return "Sabah/Akşam";
  return "Sabah";
}

export function PrincipalLiveTripsScreen() {
  const tripsQ = useQuery({
    queryKey: queryKeys.activeServiceTrips,
    queryFn: () => api.activeServiceTrips(),
    refetchInterval: LIVE_POLL_MS
  });

  const trips = tripsQ.data ?? [];

  return (
    <Screen
      title="Canlı seferler"
      subtitle="Aktif servis konumları"
      refreshing={tripsQ.isRefetching}
      onRefresh={() => {
        void tripsQ.refetch();
      }}
    >
      {tripsQ.isError ? <ErrorState message="Canlı seferler alınamadı." onRetry={() => void tripsQ.refetch()} /> : null}
      {tripsQ.isLoading ? <LoadingBlock /> : null}

      <View style={styles.hero}>
        <Radio color={colors.accent} size={18} strokeWidth={2.4} />
        <Text style={styles.heroTitle}>{trips.length} aktif sefer</Text>
        <Text style={styles.heroCopy}>Konumlar yaklaşık 15 saniyede bir güncellenir.</Text>
      </View>

      {trips.length === 0 && !tripsQ.isLoading ? (
        <View style={styles.empty}>
          <Bus color={colors.textMuted} size={28} strokeWidth={2} />
          <Text style={styles.emptyTitle}>Şu an canlı sefer yok</Text>
          <Text style={styles.emptyCopy}>Şoför konum paylaşımını başlattığında burada görünür.</Text>
        </View>
      ) : null}

      {trips.map((trip) => (
        <View key={trip.id} style={styles.tripCard}>
          <View style={styles.tripHead}>
            <Text style={styles.tripTitle}>{trip.routeName ?? "Servis rotası"}</Text>
            <Text style={styles.tripMeta}>
              {trip.driverName ?? "Şoför"} · {directionLabel(trip.direction)}
            </Text>
          </View>
          <Text style={styles.liveStatus}>{formatLiveStatus(trip.liveStatus)}</Text>
          <ServiceLiveMap
            label="Konumu haritada aç"
            latitude={trip.lastLocation?.latitude}
            longitude={trip.lastLocation?.longitude}
          />
        </View>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    gap: 4,
    padding: 16,
    borderRadius: 16,
    backgroundColor: colors.accentLight,
    borderWidth: 1,
    borderColor: colors.border
  },
  heroTitle: { fontSize: 18, fontWeight: "900", color: colors.text },
  heroCopy: { fontSize: 12, fontWeight: "700", color: colors.textMuted },
  empty: {
    alignItems: "center",
    gap: 8,
    padding: 28,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface
  },
  emptyTitle: { fontSize: 15, fontWeight: "900", color: colors.text },
  emptyCopy: { fontSize: 12, fontWeight: "700", color: colors.textMuted, textAlign: "center" },
  tripCard: {
    gap: 10,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface
  },
  tripHead: { gap: 2 },
  tripTitle: { fontSize: 15, fontWeight: "900", color: colors.text },
  tripMeta: { fontSize: 12, fontWeight: "700", color: colors.textMuted },
  liveStatus: { fontSize: 12, fontWeight: "800", color: colors.accent }
});
