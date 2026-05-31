import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { api } from "@/shared/api/client";
import { queryKeys } from "@/shared/api/queryKeys";
import { ErrorState } from "@/shared/ui/ErrorState";
import { ListCard } from "@/shared/ui/ListCard";
import { LoadingBlock } from "@/shared/ui/LoadingBlock";
import { Screen } from "@/shared/ui/Screen";
import { SCHOOL_WEEK_DAYS } from "@/shared/utils/lessonSchedule";
import { formatLessonRange, lessonsForDay, sortLessons, weekdayLabel } from "@/shared/utils/lessonSchedule";
import { colors } from "@/shared/theme/colors";

export function TeacherLessonsScreen() {
  const [day, setDay] = useState(() => {
    const d = new Date().getDay();
    return d === 0 ? 1 : d;
  });

  const query = useQuery({ queryKey: queryKeys.teacherCalendar, queryFn: () => api.teacherCalendar() });
  const lessons = useMemo(() => sortLessons(query.data ?? []), [query.data]);
  const dayLessons = lessonsForDay(lessons, day);

  if (query.isLoading) {
    return (
      <Screen title="Derslerim">
        <LoadingBlock />
      </Screen>
    );
  }

  if (query.isError) {
    return (
      <Screen title="Derslerim">
        <ErrorState message={query.error.message} onRetry={() => void query.refetch()} />
      </Screen>
    );
  }

  return (
    <Screen title="Derslerim" refreshing={query.isRefetching} onRefresh={() => void query.refetch()}>
      <View style={styles.days}>
        {SCHOOL_WEEK_DAYS.map((d) => (
          <Pressable key={d} onPress={() => setDay(d)} style={[styles.dayChip, day === d && styles.dayChipActive]}>
            <Text style={[styles.dayText, day === d && styles.dayTextActive]}>{weekdayLabel(d).slice(0, 3)}</Text>
          </Pressable>
        ))}
      </View>
      <Text style={styles.dayTitle}>{weekdayLabel(day)}</Text>
      {dayLessons.length === 0 ? (
        <Text style={styles.empty}>Bu gün için ders yok.</Text>
      ) : (
        dayLessons.map((l) => (
          <ListCard
            key={l.id}
            meta={formatLessonRange(l)}
            subtitle={l.room || "Oda belirtilmedi"}
            title={`${l.className} · ${l.subjectName}`}
          />
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  days: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  dayChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border
  },
  dayChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  dayText: { fontSize: 12, fontWeight: "600", color: colors.text },
  dayTextActive: { color: "#fff" },
  dayTitle: { fontSize: 16, fontWeight: "700", color: colors.text },
  empty: { fontSize: 13, color: colors.textMuted }
});
