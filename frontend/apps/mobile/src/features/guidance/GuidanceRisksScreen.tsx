import { useQuery } from "@tanstack/react-query";
import { Text } from "react-native";
import { buildGuidanceRiskSignals } from "@/features/guidance/utils";
import { api } from "@/shared/api/client";
import { queryKeys } from "@/shared/api/queryKeys";
import { ErrorState } from "@/shared/ui/ErrorState";
import { ListCard } from "@/shared/ui/ListCard";
import { LoadingBlock } from "@/shared/ui/LoadingBlock";
import { Screen } from "@/shared/ui/Screen";
import { categoryLabel, riskLevelLabel } from "@/shared/utils/labels";

export function GuidanceRisksScreen() {
  const query = useQuery({ queryKey: queryKeys.guidanceObservations, queryFn: () => api.observationsFiltered() });
  const risks = buildGuidanceRiskSignals(query.data ?? []);

  return (
    <Screen title="Riskler" refreshing={query.isRefetching} onRefresh={() => void query.refetch()}>
      {query.isLoading ? <LoadingBlock /> : null}
      {query.isError ? <ErrorState message={query.error.message} onRetry={() => void query.refetch()} /> : null}
      {risks.map((r) => (
        <ListCard
          key={r.id}
          meta={`${riskLevelLabel(r.level)} · ${r.sourceCount} kayıt`}
          subtitle={r.summary}
          title={`${r.studentName} · ${categoryLabel(r.category)}`}
        />
      ))}
      {risks.length === 0 && !query.isLoading ? <Text>Açık risk sinyali yok.</Text> : null}
    </Screen>
  );
}
