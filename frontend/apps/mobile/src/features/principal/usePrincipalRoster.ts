import { useQuery } from "@tanstack/react-query";
import { api } from "@/shared/api/client";
import { queryKeys } from "@/shared/api/queryKeys";

export function usePrincipalRoster() {
  return useQuery({
    queryKey: queryKeys.principalRoster,
    queryFn: () => api.principalRoster()
  });
}
