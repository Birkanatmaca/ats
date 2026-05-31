import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { api } from "@/shared/api/client";
import { queryKeys } from "@/shared/api/queryKeys";
import { useAuth } from "@/shared/auth/AuthContext";
import { ErrorState } from "@/shared/ui/ErrorState";
import { ListCard } from "@/shared/ui/ListCard";
import { LoadingBlock } from "@/shared/ui/LoadingBlock";
import { Screen } from "@/shared/ui/Screen";
import { StatCard } from "@/shared/ui/StatCard";
import {
  currentWeekday,
  formatLessonRange,
  isLessonInAttendanceWindow,
  lessonsForDay,
  sortLessons,
  weekdayLabel
} from "@/shared/utils/lessonSchedule";
import { colors } from "@/shared/theme/colors";

export function TeacherOverviewScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const today = currentWeekday();

  const calendarQ = useQuery({ queryKey: queryKeys.teacherCalendar, queryFn: () => api.teacherCalendar() });
  const lessonQ = useQuery({ queryKey: queryKeys.teacherCurrentLesson, queryFn: () => api.currentLesson() });
  const obsQ = useQuery({ queryKey: queryKeys.teacherObservations, queryFn: () => api.observations() });

  const lessons = sortLessons(calendarQ.data ?? []);
  const todayLessons = lessonsForDay(lessons, today);
  const active = lessonQ.data?.found ? lessonQ.data.lesson : undefined;
  const myObs = (obsQ.data ?? []).filter(
    (o) => o.authorId === session?.principal.userId || o.authorName === session?.principal.name
  );

  const refreshing = calendarQ.isRefetching || lessonQ.isRefetching;
  const onRefresh = () => {
    void calendarQ.refetch();
    void lessonQ.refetch();
    void obsQ.refetch();
  };

  if (calendarQ.isLoading) {
    return (
      <Screen title="Genel">
        <LoadingBlock />
      </Screen>
    );
  }

  if (calendarQ.isError) {
    return (
      <Screen title="Genel">
        <ErrorState message={calendarQ.error.message} onRetry={onRefresh} />
      </Screen>
    );
  }

  return (
    <Screen title="Genel" subtitle={weekdayLabel(today)} refreshing={refreshing} onRefresh={onRefresh}>
      <View style={styles.stats}>
        <StatCard label="Bugünkü ders" value={String(todayLessons.length)} />
        <StatCard label="Gözlem" value={String(myObs.length)} hint="Sizin kayıtlarınız" />
      </View>

      {active ? (
        <View style={styles.hero}>
          <Text style={styles.heroTitle}>Aktif ders</Text>
          <Text style={styles.heroSub}>
            {active.className} · {active.subjectName}
          </Text>
          <Text style={styles.heroMeta}>{formatLessonRange(active)} · {active.room || "Oda yok"}</Text>
          {isLessonInAttendanceWindow(active) ? (
            <Pressable onPress={() => router.push("/(app)/teacher/attendance")} style={styles.cta}>
              <Text style={styles.ctaText}>Yoklamayı aç</Text>
            </Pressable>
          ) : (
            <Text style={styles.windowHint}>Yoklama penceresi şu an kapalı (ders ±10 dk).</Text>
          )}
        </View>
      ) : (
        <ListCard title="Aktif ders yok" subtitle={lessonQ.data?.reason ?? "Şu an ders saati dışındasınız."} />
      )}

      <Text style={styles.section}>Bugünkü dersler</Text>
      {todayLessons.length === 0 ? (
        <Text style={styles.empty}>Bugün için planlanmış ders bulunamadı.</Text>
      ) : (
        todayLessons.map((l) => (
          <ListCard
            key={l.id}
            meta={isLessonInAttendanceWindow(l) ? "Yoklama açık" : formatLessonRange(l)}
            onPress={() => router.push("/(app)/teacher/attendance")}
            subtitle={l.room || "—"}
            title={`${l.className} · ${l.subjectName}`}
          />
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  stats: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  hero: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    padding: 16,
    gap: 6
  },
  heroTitle: { color: "#94a3b8", fontSize: 12, fontWeight: "600" },
  heroSub: { color: "#fff", fontSize: 18, fontWeight: "700" },
  heroMeta: { color: "#cbd5e1", fontSize: 13 },
  cta: {
    marginTop: 8,
    backgroundColor: colors.accent,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center"
  },
  ctaText: { color: "#fff", fontWeight: "700" },
  windowHint: { color: "#fde68a", fontSize: 12, marginTop: 6 },
  section: { fontSize: 15, fontWeight: "700", color: colors.text, marginTop: 8 },
  empty: { fontSize: 13, color: colors.textMuted }
});
