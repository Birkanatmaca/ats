import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { Text } from "react-native";
import { api } from "@/shared/api/client";
import { queryKeys } from "@/shared/api/queryKeys";
import type { PrincipalSchoolRoster } from "@/shared/api/types";

type RosterStudent = PrincipalSchoolRoster["students"][number];
import { ErrorState } from "@/shared/ui/ErrorState";
import { ListCard } from "@/shared/ui/ListCard";
import { LoadingBlock } from "@/shared/ui/LoadingBlock";
import { Screen } from "@/shared/ui/Screen";
import { StatCard } from "@/shared/ui/StatCard";
import { attendanceLabel } from "@/shared/utils/labels";

function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function PrincipalAttendanceScreen() {
  const date = todayIso();
  const rosterQ = useQuery({ queryKey: queryKeys.principalRoster, queryFn: () => api.principalRoster() });
  const reportQ = useQuery({
    queryKey: queryKeys.principalAttendanceToday(date),
    queryFn: () => api.attendanceToday(date)
  });

  const sectionStats = useMemo(() => {
    const statusByStudent = new Map((reportQ.data?.records ?? []).map((r) => [r.studentId, r.status]));
    const studentsBySection = new Map<string, RosterStudent[]>();
    for (const st of rosterQ.data?.students ?? []) {
      const list = studentsBySection.get(st.sectionId) ?? [];
      list.push(st);
      studentsBySection.set(st.sectionId, list);
    }
    return (rosterQ.data?.sections ?? []).map((sec) => {
      const sts = studentsBySection.get(sec.id) ?? [];
      let recorded = 0;
      let absent = 0;
      for (const st of sts) {
        const status = statusByStudent.get(st.id);
        if (!status || status === "unknown") continue;
        recorded++;
        if (status === "absent" || status === "late") absent++;
      }
      const pct = sts.length ? Math.round((recorded / sts.length) * 100) : 0;
      return { ...sec, total: sts.length, recorded, absent, pct };
    });
  }, [rosterQ.data, reportQ.data]);

  const refreshing = rosterQ.isRefetching || reportQ.isRefetching;
  const onRefresh = () => {
    void rosterQ.refetch();
    void reportQ.refetch();
  };

  if (rosterQ.isLoading || reportQ.isLoading) {
    return (
      <Screen title="Yoklama">
        <LoadingBlock />
      </Screen>
    );
  }

  const totalAbsent = (reportQ.data?.records ?? []).filter((r) => r.status === "absent" || r.status === "late").length;

  return (
    <Screen title="Yoklama" subtitle={date} refreshing={refreshing} onRefresh={onRefresh}>
      {reportQ.isError ? <ErrorState message={reportQ.error.message} onRetry={onRefresh} /> : null}
      <StatCard label="Bugün işaretlenen devamsız" value={String(totalAbsent)} hint={`${reportQ.data?.records.length ?? 0} kayıt`} />
      {sectionStats.map((sec) => (
        <ListCard
          key={sec.id}
          meta={`%${sec.pct} tamam`}
          subtitle={`${sec.absent} devamsız · ${sec.recorded}/${sec.total}`}
          title={`${sec.name} (${sec.gradeLevel})`}
        />
      ))}
      {sectionStats.length === 0 ? <Text>Şube verisi yok.</Text> : null}
      <Text style={{ fontSize: 12, color: "#64748b", marginTop: 8 }}>
        Durumlar: {["present", "absent", "late", "excused"].map(attendanceLabel).join(" · ")}
      </Text>
    </Screen>
  );
}
