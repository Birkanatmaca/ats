import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Text } from "react-native";
import { api } from "@/shared/api/client";
import { queryKeys } from "@/shared/api/queryKeys";
import { ErrorState } from "@/shared/ui/ErrorState";
import { ListCard } from "@/shared/ui/ListCard";
import { LoadingBlock } from "@/shared/ui/LoadingBlock";
import { Screen } from "@/shared/ui/Screen";
import { SearchBar } from "@/shared/ui/SearchBar";

export function PrincipalStudentsScreen() {
  const [search, setSearch] = useState("");
  const query = useQuery({ queryKey: queryKeys.principalRoster, queryFn: () => api.principalRoster() });

  const classNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of query.data?.classes ?? []) {
      map.set(c.id, c.name);
    }
    return map;
  }, [query.data?.classes]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const students = query.data?.students ?? [];
    if (!q) return students;
    return students.filter((s) => {
      const name = `${s.firstName} ${s.lastName}`.toLowerCase();
      return name.includes(q) || s.schoolNumber.includes(q) || (classNameById.get(s.classId) ?? "").toLowerCase().includes(q);
    });
  }, [query.data?.students, search, classNameById]);

  return (
    <Screen title="Öğrenciler" refreshing={query.isRefetching} onRefresh={() => void query.refetch()}>
      <SearchBar onChangeText={setSearch} placeholder="Ad, numara, sınıf..." value={search} />
      {query.isLoading ? <LoadingBlock /> : null}
      {query.isError ? <ErrorState message={query.error.message} onRetry={() => void query.refetch()} /> : null}
      <Text style={{ fontSize: 12, color: "#64748b", marginBottom: 4 }}>{filtered.length} öğrenci</Text>
      {filtered.slice(0, 50).map((s) => (
        <ListCard
          key={s.id}
          meta={s.status}
          subtitle={classNameById.get(s.classId) ?? "—"}
          title={`${s.firstName} ${s.lastName}`}
        />
      ))}
      {filtered.length > 50 ? <Text>İlk 50 kayıt gösteriliyor. Arama ile daraltın.</Text> : null}
    </Screen>
  );
}
