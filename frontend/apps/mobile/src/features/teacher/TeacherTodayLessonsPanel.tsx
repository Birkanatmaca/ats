import { useRouter } from "expo-router";
import { ChevronRight } from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { Lesson } from "@/shared/api/types";
import { colors } from "@/shared/theme/colors";
import { formatLessonRange, isLessonInAttendanceWindow } from "@/shared/utils/lessonSchedule";

type Props = {
  lessons: Lesson[];
  activeLessonId?: string;
};

export function TeacherTodayLessonsPanel({ lessons, activeLessonId }: Props) {
  const router = useRouter();

  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <Text style={styles.title}>Bugünkü dersler</Text>
        <Pressable onPress={() => router.push("/(app)/teacher/(tabs)/lessons")} style={styles.link}>
          <Text style={styles.linkText}>Tümü</Text>
          <ChevronRight color="#059669" size={14} strokeWidth={2.4} />
        </Pressable>
      </View>

      {lessons.length === 0 ? (
        <Text style={styles.empty}>Bugün için planlanmış ders bulunamadı.</Text>
      ) : (
        lessons.slice(0, 5).map((lesson) => {
          const isActive = lesson.id === activeLessonId;
          const windowOpen = isLessonInAttendanceWindow(lesson);
          return (
            <Pressable
              key={lesson.id}
              onPress={() => router.push("/(app)/teacher/(tabs)/attendance")}
              style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
            >
              <View style={styles.timeCol}>
                <Text style={styles.timeStart}>{lesson.startTime.slice(0, 5)}</Text>
                <Text style={styles.timeEnd}>{lesson.endTime.slice(0, 5)}</Text>
              </View>
              <View style={styles.main}>
                <Text numberOfLines={1} style={styles.lessonTitle}>
                  {lesson.className} · {lesson.subjectName}
                </Text>
                <Text numberOfLines={1} style={styles.lessonMeta}>
                  {lesson.room || "Derslik yok"} · {formatLessonRange(lesson)}
                </Text>
              </View>
              {isActive ? (
                <View style={[styles.badge, styles.badgeActive]}>
                  <Text style={styles.badgeTextActive}>Aktif</Text>
                </View>
              ) : windowOpen ? (
                <View style={[styles.badge, styles.badgeOpen]}>
                  <Text style={styles.badgeTextOpen}>Yoklama</Text>
                </View>
              ) : null}
            </Pressable>
          );
        })
      )}
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
    gap: 8,
    marginBottom: 12
  },
  head: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  title: { fontSize: 14, fontWeight: "800", color: colors.text },
  link: { flexDirection: "row", alignItems: "center", gap: 2 },
  linkText: { fontSize: 12, fontWeight: "700", color: "#059669" },
  empty: { fontSize: 13, color: colors.textMuted, fontWeight: "500", paddingVertical: 8 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    padding: 10
  },
  rowPressed: { opacity: 0.88, backgroundColor: "#ecfdf5" },
  timeCol: { width: 44, alignItems: "center", gap: 2 },
  timeStart: { fontSize: 12, fontWeight: "800", color: "#059669" },
  timeEnd: { fontSize: 10, fontWeight: "600", color: colors.textMuted },
  main: { flex: 1, gap: 2 },
  lessonTitle: { fontSize: 13, fontWeight: "700", color: colors.text },
  lessonMeta: { fontSize: 11, color: colors.textMuted, fontWeight: "600" },
  badge: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4 },
  badgeActive: { backgroundColor: "#059669" },
  badgeTextActive: { fontSize: 10, fontWeight: "800", color: "#fff" },
  badgeOpen: { backgroundColor: "#fef3c7", borderWidth: 1, borderColor: "#fde68a" },
  badgeTextOpen: { fontSize: 10, fontWeight: "800", color: "#b45309" }
});
