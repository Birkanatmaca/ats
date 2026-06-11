import { useRouter } from "expo-router";
import { CloudOff, WifiOff } from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useOptionalOfflineAttendance } from "@/features/teacher/offline/OfflineAttendanceContext";
import { colors } from "@/shared/theme/colors";

export function TeacherOfflineSyncCard() {
  const router = useRouter();
  const offline = useOptionalOfflineAttendance();
  if (!offline) return null;

  const { online, pendingCount, localBackupCount, cachedLessonCount, prefetching, syncing } = offline;
  if (online && pendingCount === 0 && localBackupCount === 0 && cachedLessonCount === 0 && !syncing && !prefetching) {
    return null;
  }

  const title = online ? "Yoklama senkronu" : "Çevrimdışı yoklama";
  const detail = online
    ? prefetching
      ? "Bugünkü dersler hazırlanıyor…"
      : pendingCount > 0
        ? `${pendingCount} kayıt sunucuya gönderilmeyi bekliyor.`
        : cachedLessonCount > 0
          ? `${cachedLessonCount} ders çevrimdışı için hazır.`
          : localBackupCount > 0
            ? `${localBackupCount} ders cihazda yedeklendi.`
            : "Kayıtlar gönderiliyor…"
    : cachedLessonCount > 0
      ? `Bağlantı yok · ${cachedLessonCount} ders hazır.`
      : "Bağlantı yok. İşaretlemeler cihazınızda saklanır.";

  return (
    <Pressable
      onPress={() => router.push("/(app)/teacher/(tabs)/attendance" as never)}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
    >
      <View style={styles.iconWrap}>
        {online ? <CloudOff color={colors.accent} size={18} strokeWidth={2.2} /> : <WifiOff color="#b45309" size={18} strokeWidth={2.2} />}
      </View>
      <View style={styles.copy}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.detail}>{detail}</Text>
      </View>
      {pendingCount > 0 ? <Text style={styles.count}>{pendingCount}</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface
  },
  cardPressed: { opacity: 0.9 },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.accentLight
  },
  copy: { flex: 1, gap: 2 },
  title: { fontSize: 14, fontWeight: "800", color: colors.text },
  detail: { fontSize: 12, fontWeight: "600", color: colors.textMuted },
  count: {
    minWidth: 28,
    textAlign: "center",
    fontSize: 16,
    fontWeight: "900",
    color: colors.accent
  }
});
