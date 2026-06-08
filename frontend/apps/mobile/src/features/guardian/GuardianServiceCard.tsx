import { useQuery } from "@tanstack/react-query";
import { Bus, Clock, Phone } from "lucide-react-native";
import { StyleSheet, Text, View } from "react-native";
import { api } from "@/shared/api/client";
import { queryKeys } from "@/shared/api/queryKeys";
import { colors } from "@/shared/theme/colors";

function directionLabel(value: string) {
  if (value === "evening") return "Akşam";
  if (value === "both") return "Sabah/Akşam";
  return "Sabah";
}

export function GuardianServiceCard({ studentId }: { studentId: string }) {
  const serviceQ = useQuery({
    queryKey: queryKeys.guardianService(studentId),
    queryFn: () => api.guardianService(studentId),
    enabled: Boolean(studentId)
  });

  if (serviceQ.isError) return null;
  const summary = serviceQ.data;
  const route = summary?.routes?.[0];
  const assignment = summary?.assignments?.[0];

  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <View style={styles.iconWrap}>
          <Bus color={colors.accent} size={18} strokeWidth={2.4} />
        </View>
        <View style={styles.copy}>
          <Text style={styles.title}>Servis bilgisi</Text>
          <Text style={styles.subtitle}>{serviceQ.isLoading ? "Yükleniyor" : route?.name ?? "Atama bulunmuyor"}</Text>
        </View>
        <Text style={styles.plate}>{route?.vehiclePlate ?? "—"}</Text>
      </View>

      {assignment ? (
        <View style={styles.infoRow}>
          <Clock color={colors.textMuted} size={14} strokeWidth={2.2} />
          <Text style={styles.infoText}>
            {directionLabel(assignment.direction)} · {assignment.stopName ?? "Durak seçilmedi"}
          </Text>
        </View>
      ) : null}

      {(route?.stops ?? []).slice(0, 4).map((stop) => (
        <View key={stop.id} style={styles.stopRow}>
          <Text style={styles.stopTime}>{stop.plannedTime}</Text>
          <Text style={styles.stopName}>{stop.name}</Text>
        </View>
      ))}

      {route?.driverName ? (
        <View style={styles.infoRow}>
          <Phone color={colors.success} size={14} strokeWidth={2.2} />
          <Text style={styles.infoText}>
            {route.driverName}
            {route.driverPhone ? ` · ${route.driverPhone}` : ""}
            {route.driverSharingStatus === "active" ? " · canlı" : ""}
          </Text>
        </View>
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
    backgroundColor: colors.accentLight,
    alignItems: "center",
    justifyContent: "center"
  },
  copy: { flex: 1, gap: 2 },
  title: { fontSize: 15, fontWeight: "800", color: colors.text },
  subtitle: { fontSize: 12, color: colors.textMuted },
  plate: { fontSize: 14, fontWeight: "900", color: colors.accent },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  infoText: { flex: 1, fontSize: 12, fontWeight: "700", color: colors.text },
  stopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 8
  },
  stopTime: { width: 48, fontSize: 12, fontWeight: "900", color: colors.primaryLight },
  stopName: { flex: 1, fontSize: 13, fontWeight: "700", color: colors.text }
});
