import { useQuery } from "@tanstack/react-query";
import { View } from "react-native";
import { buildGuidanceRiskSignals } from "@/features/guidance/utils";
import { api } from "@/shared/api/client";
import { queryKeys } from "@/shared/api/queryKeys";
import { ErrorState } from "@/shared/ui/ErrorState";
import { ListCard } from "@/shared/ui/ListCard";
import { LoadingBlock } from "@/shared/ui/LoadingBlock";
import { Screen } from "@/shared/ui/Screen";
import { StatCard } from "@/shared/ui/StatCard";
import { riskLevelLabel } from "@/shared/utils/labels";

export function GuidanceOverviewScreen() {
  const obsQ = useQuery({ queryKey: queryKeys.guidanceObservations, queryFn: () => api.observationsFiltered() });
  const studentsQ = useQuery({ queryKey: queryKeys.guidanceStudents, queryFn: () => api.guidanceStudents() });
  const notesQ = useQuery({ queryKey: queryKeys.guidanceNotes, queryFn: () => api.guidanceNotes() });

  const risks = buildGuidanceRiskSignals(obsQ.data ?? []);
  const highRisks = risks.filter((r) => r.level === "high");

  const refreshing = obsQ.isRefetching || studentsQ.isRefetching;
  const onRefresh = () => {
    void obsQ.refetch();
    void studentsQ.refetch();
    void notesQ.refetch();
  };

  if (obsQ.isLoading) {
    return (
      <Screen title="Genel">
        <LoadingBlock />
      </Screen>
    );
  }

  return (
    <Screen title="Genel" refreshing={refreshing} onRefresh={onRefresh}>
      {obsQ.isError ? <ErrorState message={obsQ.error.message} onRetry={onRefresh} /> : null}
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
        <StatCard label="Öğrenci" value={String(studentsQ.data?.length ?? 0)} />
        <StatCard label="Gözlem" value={String(obsQ.data?.length ?? 0)} />
        <StatCard label="Not" value={String(notesQ.data?.length ?? 0)} />
        <StatCard label="Yüksek risk" value={String(highRisks.length)} hint={`${risks.length} sinyal`} />
      </View>
      {highRisks.slice(0, 3).map((r) => (
        <ListCard
          key={r.id}
          meta={riskLevelLabel(r.level)}
          subtitle={r.summary}
          title={`${r.studentName} · ${r.className}`}
        />
      ))}
    </Screen>
  );
}
