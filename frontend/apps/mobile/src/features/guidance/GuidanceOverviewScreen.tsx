import { useQuery } from "@tanstack/react-query";
import { GuidanceOgtaAiStrip } from "@/features/guidance/GuidanceOgtaAiStrip";
import { GuidanceOverviewStats } from "@/features/guidance/GuidanceOverviewStats";
import { GuidanceQuickActions } from "@/features/guidance/GuidanceQuickActions";
import { GuidanceWelcomeCard } from "@/features/guidance/GuidanceWelcomeCard";
import { api } from "@/shared/api/client";
import { queryKeys } from "@/shared/api/queryKeys";
import { ErrorState } from "@/shared/ui/ErrorState";
import { LoadingBlock } from "@/shared/ui/LoadingBlock";
import { Screen } from "@/shared/ui/Screen";

export function GuidanceOverviewScreen() {
  const obsQ = useQuery({ queryKey: queryKeys.guidanceObservations, queryFn: () => api.observationsFiltered() });
  const studentsQ = useQuery({ queryKey: queryKeys.guidanceStudents, queryFn: () => api.guidanceStudents() });
  const notesQ = useQuery({ queryKey: queryKeys.guidanceNotes, queryFn: () => api.guidanceNotes() });
  const trackingsQ = useQuery({ queryKey: queryKeys.guidanceRiskTrackings, queryFn: () => api.guidanceRiskTrackings() });
  const plansQ = useQuery({ queryKey: queryKeys.guidanceSupportPlans, queryFn: () => api.guidanceSupportPlans() });

  const openPlans = (plansQ.data ?? []).filter((item) => item.status === "open").length;

  const refreshing =
    obsQ.isRefetching || studentsQ.isRefetching || notesQ.isRefetching || trackingsQ.isRefetching || plansQ.isRefetching;
  const onRefresh = () => {
    void obsQ.refetch();
    void studentsQ.refetch();
    void notesQ.refetch();
    void trackingsQ.refetch();
    void plansQ.refetch();
  };

  if (obsQ.isLoading) {
    return (
      <Screen>
        <LoadingBlock />
      </Screen>
    );
  }

  return (
    <Screen refreshing={refreshing} topInsetExtra={10} onRefresh={onRefresh}>
      <GuidanceWelcomeCard />
      {obsQ.isError ? <ErrorState message={obsQ.error.message} onRetry={onRefresh} /> : null}
      <GuidanceOverviewStats
        data={{
          studentCount: studentsQ.data?.length ?? 0,
          observationCount: obsQ.data?.length ?? 0,
          noteCount: notesQ.data?.length ?? 0,
          riskTrackingCount: trackingsQ.data?.length ?? 0,
          openPlanCount: openPlans
        }}
      />
      <GuidanceOgtaAiStrip />
      <GuidanceQuickActions />
    </Screen>
  );
}
