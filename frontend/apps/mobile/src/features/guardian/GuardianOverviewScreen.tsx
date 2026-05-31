import { useQuery } from "@tanstack/react-query";
import { Text, View } from "react-native";
import { ChildSelector } from "@/features/guardian/ChildSelector";
import { useGuardian } from "@/features/guardian/GuardianContext";
import { api } from "@/shared/api/client";
import { queryKeys } from "@/shared/api/queryKeys";
import { ErrorState } from "@/shared/ui/ErrorState";
import { ListCard } from "@/shared/ui/ListCard";
import { LoadingBlock } from "@/shared/ui/LoadingBlock";
import { Screen } from "@/shared/ui/Screen";
import { StatCard } from "@/shared/ui/StatCard";
import { attendanceLabel } from "@/shared/utils/labels";

export function GuardianOverviewScreen() {
  const { selectedChild, selectedChildId, loading, error, refetch } = useGuardian();

  const attendanceQ = useQuery({
    queryKey: queryKeys.guardianAttendance(selectedChildId),
    queryFn: () => api.guardianStudentAttendance(selectedChildId),
    enabled: Boolean(selectedChildId)
  });

  const records = attendanceQ.data?.records ?? [];
  const absent = records.filter((r) => r.status === "absent" || r.status === "late").length;

  if (loading) {
    return (
      <Screen title="Genel">
        <LoadingBlock />
      </Screen>
    );
  }

  if (!selectedChild) {
    return (
      <Screen title="Genel">
        <Text>Bu hesaba bağlı öğrenci bulunamadı.</Text>
      </Screen>
    );
  }

  return (
    <Screen
      title="Genel"
      subtitle={selectedChild.fullName}
      refreshing={attendanceQ.isRefetching}
      onRefresh={() => {
        refetch();
        void attendanceQ.refetch();
      }}
    >
      <ChildSelector />
      {error ? <ErrorState message={error} onRetry={refetch} /> : null}

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
        <StatCard label="Sınıf" value={selectedChild.className} />
        <StatCard label="Okul no" value={selectedChild.schoolNumber} />
        <StatCard label="Devamsızlık kaydı" value={String(records.length)} hint={`${absent} uyarı`} />
      </View>

      <ListCard title="Son kayıtlar" subtitle="Devamsızlık sekmesinde tüm liste" />
      {records.slice(0, 3).map((r) => (
        <ListCard
          key={r.id}
          meta={attendanceLabel(r.status)}
          subtitle={r.lesson}
          title={new Date(r.date).toLocaleDateString("tr-TR")}
        />
      ))}
    </Screen>
  );
}
