import { useQuery } from "@tanstack/react-query";
import { api } from "@/shared/api/client";
import { queryKeys } from "@/shared/api/queryKeys";
import { PrincipalAcademicOverviewCard } from "@/features/principal/PrincipalAcademicOverviewCard";
import { PrincipalBillingOverviewCard } from "@/features/principal/PrincipalBillingOverviewCard";
import { PrincipalGuidanceCasesCard } from "@/features/principal/PrincipalGuidanceCasesCard";
import { PrincipalLifeOverviewCard } from "@/features/principal/PrincipalLifeOverviewCard";
import { PrincipalOgtaAiStrip } from "@/features/principal/PrincipalOgtaAiStrip";
import { PrincipalOverviewStats } from "@/features/principal/PrincipalOverviewStats";
import { PrincipalPendingAttendanceCard } from "@/features/principal/PrincipalPendingAttendanceCard";
import { PrincipalQuickActions } from "@/features/principal/PrincipalQuickActions";
import { PrincipalServiceOverviewCard } from "@/features/principal/PrincipalServiceOverviewCard";
import { PrincipalWelcomeCard } from "@/features/principal/PrincipalWelcomeCard";
import { ErrorState } from "@/shared/ui/ErrorState";
import { LoadingBlock } from "@/shared/ui/LoadingBlock";
import { Screen } from "@/shared/ui/Screen";

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
      <Screen>
        <LoadingBlock />
      </Screen>
    );
  }

  return (
    <Screen refreshing={summaryQ.isRefetching} topInsetExtra={10} onRefresh={onRefresh}>
      <PrincipalWelcomeCard />
      {summaryQ.isError ? <ErrorState message={summaryQ.error.message} onRetry={onRefresh} /> : null}
      <PrincipalOverviewStats summary={s} />
      <PrincipalPendingAttendanceCard summary={s} />
      <PrincipalBillingOverviewCard />
      <PrincipalServiceOverviewCard />
      <PrincipalLifeOverviewCard />
      <PrincipalAcademicOverviewCard />
      <PrincipalGuidanceCasesCard />
      <PrincipalOgtaAiStrip />
      <PrincipalQuickActions />
    </Screen>
  );
}
