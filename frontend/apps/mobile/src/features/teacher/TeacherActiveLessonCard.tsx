import { useRouter } from "expo-router";
import { AlertCircle, ChevronRight, ClipboardCheck, Clock } from "lucide-react-native";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import type { Lesson } from "@/shared/api/types";
import { colors } from "@/shared/theme/colors";
import { platformShadow } from "@/shared/ui/platformShadow";
import { attendanceWindowLabel, formatLessonRange, isLessonInAttendanceWindow } from "@/shared/utils/lessonSchedule";

type Props = {
  lesson: Lesson | null;
  reason?: string;
  pendingCount: number;
  totalCount: number;
  loading?: boolean;
};

export function TeacherActiveLessonCard({ lesson, reason, pendingCount, totalCount, loading }: Props) {
  const router = useRouter();
  const inWindow = lesson ? isLessonInAttendanceWindow(lesson) : false;
  const progress = totalCount > 0 ? Math.round(((totalCount - pendingCount) / totalCount) * 100) : 0;

  if (!lesson) {
    return (
      <View style={styles.emptyCard}>
        <AlertCircle color={colors.textMuted} size={20} strokeWidth={2.2} />
        <View style={styles.emptyCopy}>
          <Text style={styles.emptyTitle}>Aktif ders yok</Text>
          <Text style={styles.emptySub}>{reason ?? "Şu an ders saati dışındasınız."}</Text>
        </View>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.card,
        platformShadow("0 14px 32px rgba(5,150,105,0.22)", {
          shadowColor: "#059669",
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: 0.18,
          shadowRadius: 18,
          elevation: 8
        })
      ]}
    >
      <View style={styles.head}>
        <View style={styles.iconWrap}>
          <ClipboardCheck color="#a7f3d0" size={22} strokeWidth={2.4} />
        </View>
        <View style={styles.headCopy}>
          <Text style={styles.eyebrow}>{inWindow ? "Aktif ders · Yoklama penceresi açık" : "Sıradaki ders"}</Text>
          <Text style={styles.title}>
            {lesson.className} · {lesson.subjectName}
          </Text>
          <View style={styles.metaRow}>
            <Clock color="rgba(255,255,255,0.72)" size={12} strokeWidth={2.2} />
            <Text style={styles.meta}>
              {formatLessonRange(lesson)} · {lesson.room || "Derslik belirtilmedi"}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.progressRow}>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${Math.max(progress, totalCount > 0 ? 8 : 0)}%` }]} />
        </View>
        <Text style={styles.progressLabel}>
          {totalCount > 0 ? `%${progress} tamamlandı · ${pendingCount} bekliyor` : "Yoklama oturumu henüz açılmadı"}
        </Text>
      </View>

      <Pressable
        disabled={loading}
        onPress={() => router.push("/(app)/teacher/(tabs)/attendance")}
        style={({ pressed }) => [styles.cta, !inWindow && styles.ctaMuted, pressed && styles.ctaPressed]}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <>
            <Text style={styles.ctaText}>{inWindow ? "Yoklamayı aç" : "Yoklama sayfasına git"}</Text>
            <ChevronRight color="#fff" size={18} strokeWidth={2.4} />
          </>
        )}
      </Pressable>

      {!inWindow ? (
        <Text style={styles.windowHint}>Yoklama penceresi: {attendanceWindowLabel(lesson)} (ders ±10 dk)</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#059669",
    borderRadius: 20,
    padding: 16,
    gap: 14,
    marginBottom: 12
  },
  head: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.14)",
    alignItems: "center",
    justifyContent: "center"
  },
  headCopy: { flex: 1, gap: 4 },
  eyebrow: { color: "rgba(209,250,229,0.88)", fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.4 },
  title: { color: "#fff", fontSize: 20, fontWeight: "800", letterSpacing: -0.3 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  meta: { color: "rgba(255,255,255,0.78)", fontSize: 12, fontWeight: "600", flex: 1 },
  progressRow: { gap: 6 },
  progressTrack: {
    height: 6,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.18)",
    overflow: "hidden"
  },
  progressFill: { height: "100%", borderRadius: 999, backgroundColor: "#ecfdf5" },
  progressLabel: { color: "rgba(255,255,255,0.82)", fontSize: 11, fontWeight: "600" },
  cta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#047857",
    borderRadius: 14,
    paddingVertical: 13
  },
  ctaMuted: { backgroundColor: "rgba(255,255,255,0.16)" },
  ctaPressed: { opacity: 0.9 },
  ctaText: { color: "#fff", fontSize: 15, fontWeight: "800" },
  windowHint: { color: "#fde68a", fontSize: 11, fontWeight: "600", textAlign: "center" },
  emptyCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 12
  },
  emptyCopy: { flex: 1, gap: 2 },
  emptyTitle: { fontSize: 14, fontWeight: "800", color: colors.text },
  emptySub: { fontSize: 12, color: colors.textMuted, fontWeight: "500", lineHeight: 17 }
});
