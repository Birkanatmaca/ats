import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { Text } from "react-native";
import { api } from "@/shared/api/client";
import { queryKeys } from "@/shared/api/queryKeys";
import { ErrorState } from "@/shared/ui/ErrorState";
import { ListCard } from "@/shared/ui/ListCard";
import { LoadingBlock } from "@/shared/ui/LoadingBlock";
import { Screen } from "@/shared/ui/Screen";

export function PrincipalClassesScreen() {
  const query = useQuery({ queryKey: queryKeys.principalRoster, queryFn: () => api.principalRoster() });

  const sectionCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of query.data?.sections ?? []) {
      map.set(s.classId, (map.get(s.classId) ?? 0) + 1);
    }
    return map;
  }, [query.data?.sections]);

  const studentCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const st of query.data?.students ?? []) {
      map.set(st.classId, (map.get(st.classId) ?? 0) + 1);
    }
    return map;
  }, [query.data?.students]);

  return (
    <Screen title="Sınıflar" refreshing={query.isRefetching} onRefresh={() => void query.refetch()}>
      {query.isLoading ? <LoadingBlock /> : null}
      {query.isError ? <ErrorState message={query.error.message} onRetry={() => void query.refetch()} /> : null}
      {(query.data?.classes ?? []).map((c) => (
        <ListCard
          key={c.id}
          meta={`${studentCounts.get(c.id) ?? 0} öğrenci`}
          subtitle={`${sectionCounts.get(c.id) ?? 0} şube`}
          title={c.name}
        />
      ))}
      {(query.data?.sections ?? []).map((sec) => (
        <ListCard
          key={sec.id}
          meta={`Kapasite ${sec.capacity}`}
          subtitle={sec.advisor || "Danışman yok"}
          title={`Şube ${sec.name}`}
        />
      ))}
      {!query.data?.classes?.length && !query.isLoading ? <Text>Sınıf kaydı yok.</Text> : null}
    </Screen>
  );
}
