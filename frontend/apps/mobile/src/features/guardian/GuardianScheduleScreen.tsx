import { useQuery } from "@tanstack/react-query";
import { Text } from "react-native";
import { ChildSelector } from "@/features/guardian/ChildSelector";
import { useGuardian } from "@/features/guardian/GuardianContext";
import { api } from "@/shared/api/client";
import { queryKeys } from "@/shared/api/queryKeys";
import { ErrorState } from "@/shared/ui/ErrorState";
import { ListCard } from "@/shared/ui/ListCard";
import { LoadingBlock } from "@/shared/ui/LoadingBlock";
import { Screen } from "@/shared/ui/Screen";
import { formatLessonRange, sortLessons, weekdayLabel } from "@/shared/utils/lessonSchedule";

export function GuardianScheduleScreen() {
  const { selectedChildId, selectedChild } = useGuardian();

  const query = useQuery({
    queryKey: queryKeys.guardianSchedule(selectedChildId),
    queryFn: () => api.guardianStudentSchedule(selectedChildId),
    enabled: Boolean(selectedChildId)
  });

  const lessons = sortLessons(query.data?.lessons ?? []);

  if (!selectedChildId) {
    return (
      <Screen title="Program">
        <Text>Öğrenci seçin.</Text>
      </Screen>
    );
  }

  return (
    <Screen
      title="Program"
      subtitle={selectedChild?.fullName}
      refreshing={query.isRefetching}
      onRefresh={() => void query.refetch()}
    >
      <ChildSelector />
      {query.isLoading ? <LoadingBlock /> : null}
      {query.isError ? <ErrorState message={query.error.message} onRetry={() => void query.refetch()} /> : null}
      {lessons.length === 0 && !query.isLoading ? (
        <Text>Program kaydı bulunamadı.</Text>
      ) : (
        lessons.map((l) => (
          <ListCard
            key={l.id}
            meta={formatLessonRange(l)}
            subtitle={l.room || "—"}
            title={`${weekdayLabel(l.dayOfWeek)} · ${l.subjectName}`}
          />
        ))
      )}
    </Screen>
  );
}
