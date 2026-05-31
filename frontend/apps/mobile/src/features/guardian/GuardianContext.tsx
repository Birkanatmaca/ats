import { useQuery } from "@tanstack/react-query";
import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { api } from "@/shared/api/client";
import { queryKeys } from "@/shared/api/queryKeys";
import type { GuardianStudent } from "@/shared/api/types";

type GuardianContextValue = {
  children: GuardianStudent[];
  selectedChildId: string;
  selectedChild: GuardianStudent | null;
  setSelectedChildId: (id: string) => void;
  loading: boolean;
  error: string | null;
  refetch: () => void;
};

const GuardianContext = createContext<GuardianContextValue | null>(null);

export function GuardianProvider({ children: node }: { children: ReactNode }) {
  const [selectedChildId, setSelectedChildId] = useState("");

  const query = useQuery({
    queryKey: queryKeys.guardianStudents,
    queryFn: () => api.guardianStudents()
  });

  const list = query.data ?? [];
  const effectiveId = selectedChildId && list.some((c) => c.id === selectedChildId) ? selectedChildId : (list[0]?.id ?? "");

  const value = useMemo(
    () => ({
      children: list,
      selectedChildId: effectiveId,
      selectedChild: list.find((c) => c.id === effectiveId) ?? null,
      setSelectedChildId,
      loading: query.isLoading,
      error: query.error instanceof Error ? query.error.message : null,
      refetch: () => void query.refetch()
    }),
    [list, effectiveId, query.isLoading, query.error, query.refetch]
  );

  return <GuardianContext.Provider value={value}>{node}</GuardianContext.Provider>;
}

export function useGuardian() {
  const ctx = useContext(GuardianContext);
  if (!ctx) throw new Error("useGuardian requires GuardianProvider");
  return ctx;
}
