import { useQuery } from "@tanstack/react-query";
import { View } from "react-native";
import { api } from "@/shared/api/client";
import { queryKeys } from "@/shared/api/queryKeys";
import { ErrorState } from "@/shared/ui/ErrorState";
import { ListCard } from "@/shared/ui/ListCard";
import { LoadingBlock } from "@/shared/ui/LoadingBlock";
import { Screen } from "@/shared/ui/Screen";
import { StatCard } from "@/shared/ui/StatCard";

export function PrincipalOverviewScreen() {
  const summaryQ = useQuery({ queryKey: queryKeys.principalSummary, queryFn: () => api.dashboard() });
  const tenantQ = useQuery({ queryKey: queryKeys.tenant, queryFn: () => api.tenant() });

  const s = summaryQ.data;
  const onRefresh = () => {
    void summaryQ.refetch();
    void tenantQ.refetch();
  };

  if (summaryQ.isLoading) {
    return (
      <Screen title="Genel">
        <LoadingBlock />
      </Screen>
    );
  }

  return (
    <Screen
      title="Genel"
      subtitle={tenantQ.data?.name}
      refreshing={summaryQ.isRefetching}
      onRefresh={onRefresh}
    >
      {summaryQ.isError ? <ErrorState message={summaryQ.error.message} onRetry={onRefresh} /> : null}
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
        <StatCard label="Öğrenci" value={String(s?.activeStudents ?? 0)} />
        <StatCard label="Öğretmen" value={String(s?.activeTeachers ?? 0)} />
        <StatCard label="Yoklama %" value={`${s?.attendanceCompletionPct ?? 0}`} />
        <StatCard label="Bugün gelmeyen" value={String(s?.absentToday ?? 0)} />
      </View>
      {(s?.classAttendance ?? []).slice(0, 5).map((c) => (
        <ListCard
          key={c.className}
          meta={`${c.completed}/${c.total}`}
          subtitle={c.attentionNeed}
          title={c.className}
        />
      ))}
      {(s?.operations ?? []).slice(0, 4).map((op) => (
        <ListCard key={op.id} meta={op.priority} subtitle={op.status} title={op.title} />
      ))}
    </Screen>
  );
}
