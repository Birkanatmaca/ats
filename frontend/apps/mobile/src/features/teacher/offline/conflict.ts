import type { AttendanceSession } from "@/shared/api/types";
import { recordsVersion } from "./version";
import type { OfflineAttendanceDraft, OfflineConflictReason, OfflineConflictState } from "./types";

export function detectOfflineConflict(
  draft: OfflineAttendanceDraft,
  serverSession: AttendanceSession
): OfflineConflictState | null {
  if (serverSession.finalizedAt && draftHasLocalChanges(draft, serverSession)) {
    return {
      draft,
      serverSession,
      reason: "session_finalized"
    };
  }

  const removedStudentIds = draft.records
    .map((record) => record.studentId)
    .filter((studentId) => !serverSession.records.some((record) => record.studentId === studentId));

  if (removedStudentIds.length > 0) {
    return {
      draft,
      serverSession,
      reason: "student_list_changed",
      removedStudentIds
    };
  }

  const serverVersion = recordsVersion(serverSession.records);
  if (draft.baseVersion && draft.baseVersion !== serverVersion && draftHasLocalChanges(draft, serverSession)) {
    return {
      draft,
      serverSession,
      reason: "server_changed"
    };
  }

  return null;
}

export function draftHasLocalChanges(draft: OfflineAttendanceDraft, serverSession: AttendanceSession): boolean {
  const serverMap = new Map(serverSession.records.map((record) => [record.studentId, record.status]));
  return draft.records.some((record) => {
    const serverStatus = serverMap.get(record.studentId);
    return serverStatus !== record.status;
  });
}

export function conflictReasonLabel(reason: OfflineConflictReason): string {
  switch (reason) {
    case "session_finalized":
      return "Yoklama oturumu sunucuda kesinleştirilmiş.";
    case "window_closed":
      return "Yoklama penceresi kapandı; otomatik gönderim durduruldu.";
    case "server_changed":
      return "Sunucudaki kayıtlar siz offline iken değiştirilmiş.";
    case "student_list_changed":
      return "Öğrenci listesi değişmiş; bazı kayıtlar eşleşmiyor.";
    default:
      return "Senkron çakışması";
  }
}

export function mapApiErrorToConflictReason(code?: string, status?: number): OfflineConflictReason | null {
  if (code === "ATTENDANCE_SESSION_FINALIZED" || status === 409) {
    return "session_finalized";
  }
  if (code === "ATTENDANCE_WINDOW_CLOSED" || status === 403) {
    return "window_closed";
  }
  return null;
}
