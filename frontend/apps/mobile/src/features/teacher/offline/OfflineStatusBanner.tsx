import { CloudOff, RefreshCw, WifiOff } from "lucide-react-native";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { colors } from "@/shared/theme/colors";
import { useOfflineAttendance } from "./OfflineAttendanceContext";

export function OfflineStatusBanner() {
  const { online, pendingCount, syncing, syncNow } = useOfflineAttendance();

  if (online && pendingCount === 0 && !syncing) {
    return null;
  }

  const tone = online ? "pending" : "offline";

  return (
    <View style={[styles.banner, tone === "offline" ? styles.bannerOffline : styles.bannerPending]}>
      <View style={styles.iconWrap}>
        {syncing ? (
          <ActivityIndicator color={tone === "offline" ? "#b45309" : colors.accent} size="small" />
        ) : online ? (
          <RefreshCw color={colors.accent} size={16} strokeWidth={2.2} />
        ) : (
          <WifiOff color="#b45309" size={16} strokeWidth={2.2} />
        )}
      </View>
      <View style={styles.copy}>
        <Text style={[styles.title, tone === "offline" ? styles.titleOffline : styles.titlePending]}>
          {online ? "Senkron bekliyor" : "Çevrimdışı mod"}
        </Text>
        <Text style={styles.body}>
          {online
            ? pendingCount > 0
              ? `${pendingCount} yoklama sunucuya gönderilmeyi bekliyor.`
              : "Kayıtlar senkronize ediliyor…"
            : "Bağlantı yok. Yoklama cihazınızda saklanır; bağlantı gelince otomatik gönderilir."}
        </Text>
      </View>
      {online && pendingCount > 0 && !syncing ? (
        <Pressable onPress={() => void syncNow()} style={styles.action}>
          <CloudOff color={colors.accent} size={14} strokeWidth={2.2} />
          <Text style={styles.actionText}>Gönder</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1
  },
  bannerOffline: {
    backgroundColor: "#fffbeb",
    borderColor: "#fcd34d"
  },
  bannerPending: {
    backgroundColor: "#eff6ff",
    borderColor: "#bfdbfe"
  },
  iconWrap: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center"
  },
  copy: { flex: 1, gap: 2 },
  title: { fontSize: 13, fontWeight: "800" },
  titleOffline: { color: "#92400e" },
  titlePending: { color: "#1d4ed8" },
  body: { fontSize: 12, lineHeight: 17, color: colors.textMuted, fontWeight: "500" },
  action: {
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
    paddingHorizontal: 4
  },
  actionText: { fontSize: 11, fontWeight: "700", color: colors.accent }
});
