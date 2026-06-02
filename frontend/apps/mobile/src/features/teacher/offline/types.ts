import type { AttendanceRecord, AttendanceSession } from "@/shared/api/types";

export type OfflineSyncStatus = "draft" | "queued" | "syncing" | "synced" | "conflict" | "failed";

export type OfflineDraftRecord = {
  studentId: string;
  studentName?: string;
  number?: string;
  status: AttendanceRecord["status"];
  note?: string;
  updatedAt: string;
};

export type OfflineAttendanceDraft = {
  id: string;
  tenantId: string;
  teacherId: string;
  lessonId: string;
  sessionId?: string;
  classId: string;
  className: string;
  subjectName: string;
  lessonStartsAt?: string;
  lessonEndsAt?: string;
  records: OfflineDraftRecord[];
  baseVersion?: string;
  createdAt: string;
  updatedAt: string;
  syncStatus: OfflineSyncStatus;
  finalizePending?: boolean;
  lastError?: string;
  conflictReason?: OfflineConflictReason;
};

export type OfflineConflictReason =
  | "session_finalized"
  | "window_closed"
  | "server_changed"
  | "student_list_changed";

export type OfflineConflictState = {
  draft: OfflineAttendanceDraft;
  serverSession: AttendanceSession;
  reason: OfflineConflictReason;
  removedStudentIds?: string[];
};

export type OfflineQueueSnapshot = {
  drafts: OfflineAttendanceDraft[];
};

export function isPendingSyncStatus(status: OfflineSyncStatus): boolean {
  return status === "draft" || status === "queued" || status === "syncing" || status === "failed" || status === "conflict";
}
