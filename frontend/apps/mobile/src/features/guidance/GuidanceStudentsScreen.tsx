import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Text } from "react-native";
import { api } from "@/shared/api/client";
import { queryKeys } from "@/shared/api/queryKeys";
import { ListCard } from "@/shared/ui/ListCard";
import { LoadingBlock } from "@/shared/ui/LoadingBlock";
import { Screen } from "@/shared/ui/Screen";
import { SearchBar } from "@/shared/ui/SearchBar";
import { ErrorState } from "@/shared/ui/ErrorState";

export function GuidanceStudentsScreen() {
  const [search, setSearch] = useState("");
  const query = useQuery({ queryKey: queryKeys.guidanceStudents, queryFn: () => api.guidanceStudents() });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = query.data ?? [];
    if (!q) return list;
    return list.filter(
      (s) => s.fullName.toLowerCase().includes(q) || s.className.toLowerCase().includes(q) || s.schoolNumber.includes(q)
    );
  }, [query.data, search]);

  return (
    <Screen title="Öğrenciler" refreshing={query.isRefetching} onRefresh={() => void query.refetch()}>
      <SearchBar onChangeText={setSearch} placeholder="Ad, sınıf veya numara..." value={search} />
      {query.isLoading ? <LoadingBlock /> : null}
      {query.isError ? <ErrorState message={query.error.message} onRetry={() => void query.refetch()} /> : null}
      {filtered.map((s) => (
        <ListCard key={s.id} meta={s.status} subtitle={s.schoolNumber} title={`${s.fullName} · ${s.className}`} />
      ))}
      {filtered.length === 0 && !query.isLoading ? <Text>Kayıt yok.</Text> : null}
    </Screen>
  );
}
