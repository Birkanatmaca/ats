import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Text } from "react-native";
import { ChildSelector } from "@/features/guardian/ChildSelector";
import { useGuardian } from "@/features/guardian/GuardianContext";
import { api } from "@/shared/api/client";
import { queryKeys } from "@/shared/api/queryKeys";
import { ErrorState } from "@/shared/ui/ErrorState";
import { ListCard } from "@/shared/ui/ListCard";
import { LoadingBlock } from "@/shared/ui/LoadingBlock";
import { Screen } from "@/shared/ui/Screen";
import { SearchBar } from "@/shared/ui/SearchBar";
import { attendanceLabel } from "@/shared/utils/labels";

export function GuardianAttendanceScreen() {
  const { selectedChildId, selectedChild } = useGuardian();
  const [search, setSearch] = useState("");

  const query = useQuery({
    queryKey: queryKeys.guardianAttendance(selectedChildId),
    queryFn: () => api.guardianStudentAttendance(selectedChildId),
    enabled: Boolean(selectedChildId)
  });

  const filtered = useMemo(() => {
    const records = query.data?.records ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return records;
    return records.filter((r) => r.lesson.toLowerCase().includes(q) || r.date.includes(q));
  }, [query.data, search]);

  return (
    <Screen
      title="Devamsızlık"
      subtitle={selectedChild?.fullName}
      refreshing={query.isRefetching}
      onRefresh={() => void query.refetch()}
    >
      <ChildSelector />
      <SearchBar onChangeText={setSearch} placeholder="Ders veya tarih ara..." value={search} />
      {query.isLoading ? <LoadingBlock /> : null}
      {query.isError ? <ErrorState message={query.error.message} onRetry={() => void query.refetch()} /> : null}
      {filtered.length === 0 && !query.isLoading ? (
        <Text>Kayıt bulunamadı.</Text>
      ) : (
        filtered.map((r) => (
          <ListCard
            key={r.id}
            meta={attendanceLabel(r.status)}
            subtitle={r.lesson}
            title={new Date(r.date).toLocaleDateString("tr-TR", { weekday: "long", day: "numeric", month: "long" })}
          />
        ))
      )}
    </Screen>
  );
}
