import type { ClassAttendance, PrincipalSummary } from "../../../lib/api";

export type PendingAttendanceSnapshot = {
  pendingLessons: number;
  todayLessons: number;
  completionPct: number;
  pendingClasses: ClassAttendance[];
};

export function buildPendingAttendance(summary?: PrincipalSummary | null): PendingAttendanceSnapshot | null {
  if (!summary) {
    return null;
  }

  const todayLessons = summary.todayLessons ?? 0;
  if (todayLessons <= 0) {
    return null;
  }

  const completionPct = Math.max(0, Math.min(100, summary.attendanceCompletionPct ?? 0));
  const finalizedLessons = Math.round((completionPct / 100) * todayLessons);
  const pendingLessons = Math.max(0, todayLessons - finalizedLessons);
  const pendingClasses = (summary.classAttendance ?? []).filter((item) => item.attentionNeed === "Yoklama bekliyor");

  if (pendingLessons <= 0 && pendingClasses.length === 0) {
    return null;
  }

  return {
    pendingLessons,
    todayLessons,
    completionPct,
    pendingClasses
  };
}
