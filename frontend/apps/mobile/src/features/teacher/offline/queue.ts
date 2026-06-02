import type { AttendanceRecord, AttendanceSession, Lesson } from "@/shared/api/types";
import { recordsVersion } from "./version";
import type { OfflineAttendanceDraft, OfflineDraftRecord, OfflineSyncStatus } from "./types";

function nowIso(): string {
  return new Date().toISOString();
}

function randomId(): string {
  return `offline-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function draftRecordFromAttendance(record: AttendanceRecord, updatedAt = nowIso()): OfflineDraftRecord {
  return {
    studentId: record.studentId,
    studentName: record.studentName,
    number: record.number,
    status: record.status,
    note: record.note,
    updatedAt
  };
}

export function sessionFromDraft(draft: OfflineAttendanceDraft): AttendanceSession {
  return {
    id: draft.sessionId ?? draft.id,
    lessonId: draft.lessonId,
    classId: draft.classId,
    className: draft.className,
    subjectName: draft.subjectName,
    teacherId: draft.teacherId,
    startedAt: draft.createdAt,
    finalizedAt: draft.finalizePending ? undefined : draft.syncStatus === "synced" ? draft.updatedAt : undefined,
    records: draft.records.map((record) => ({
      studentId: record.studentId,
      studentName: record.studentName ?? "",
      number: record.number ?? "",
      status: record.status,
      note: record.note
    }))
  };
}

export function createDraftFromSession(params: {
  session: AttendanceSession;
  tenantId: string;
  teacherId: string;
  lesson?: Lesson;
  syncStatus?: OfflineSyncStatus;
  baseVersion?: string;
}): OfflineAttendanceDraft {
  const timestamp = nowIso();
  return {
    id: randomId(),
    tenantId: params.tenantId,
    teacherId: params.teacherId,
    lessonId: params.session.lessonId,
    sessionId: params.session.id,
    classId: params.session.classId,
    className: params.session.className,
    subjectName: params.session.subjectName,
    lessonStartsAt: params.lesson?.startsAt,
    lessonEndsAt: params.lesson?.endsAt,
    records: params.session.records.map((record) => draftRecordFromAttendance(record, timestamp)),
    baseVersion: params.baseVersion ?? recordsVersion(params.session.records),
    createdAt: timestamp,
    updatedAt: timestamp,
    syncStatus: params.syncStatus ?? "synced"
  };
}

export function mergeDraftRecords(
  existing: OfflineDraftRecord[],
  incoming: OfflineDraftRecord[]
): OfflineDraftRecord[] {
  const map = new Map<string, OfflineDraftRecord>();
  for (const record of existing) {
    map.set(record.studentId, record);
  }
  for (const record of incoming) {
    const current = map.get(record.studentId);
    if (!current || record.updatedAt >= current.updatedAt) {
      map.set(record.studentId, record);
    }
  }
  return [...map.values()].sort((a, b) => a.studentId.localeCompare(b.studentId));
}

export function mergeDraftsForLesson(
  existing: OfflineAttendanceDraft,
  incoming: OfflineAttendanceDraft
): OfflineAttendanceDraft {
  const useIncomingMeta = incoming.updatedAt >= existing.updatedAt;
  const mergedRecords = mergeDraftRecords(existing.records, incoming.records);
  const base = useIncomingMeta ? incoming : existing;
  const other = useIncomingMeta ? existing : incoming;
  return {
    ...base,
    records: mergedRecords,
    sessionId: base.sessionId ?? other.sessionId,
    baseVersion: base.baseVersion ?? other.baseVersion,
    finalizePending: Boolean(base.finalizePending || other.finalizePending),
    syncStatus: base.syncStatus === "synced" && other.syncStatus !== "synced" ? other.syncStatus : base.syncStatus,
    updatedAt: nowIso()
  };
}

export function upsertDraftInQueue(
  drafts: OfflineAttendanceDraft[],
  nextDraft: OfflineAttendanceDraft
): OfflineAttendanceDraft[] {
  const index = drafts.findIndex((draft) => draft.lessonId === nextDraft.lessonId);
  if (index === -1) {
    return [...drafts, nextDraft];
  }
  const merged = mergeDraftsForLesson(drafts[index], nextDraft);
  const copy = [...drafts];
  copy[index] = merged;
  return copy;
}

export function applyRecordUpdatesToDraft(
  draft: OfflineAttendanceDraft,
  records: AttendanceRecord[],
  options?: { finalizePending?: boolean; syncStatus?: OfflineSyncStatus; lastError?: string }
): OfflineAttendanceDraft {
  const timestamp = nowIso();
  const incoming = records.map((record) => draftRecordFromAttendance(record, timestamp));
  return {
    ...draft,
    records: mergeDraftRecords(draft.records, incoming),
    updatedAt: timestamp,
    syncStatus: options?.syncStatus ?? "queued",
    finalizePending: options?.finalizePending ?? draft.finalizePending,
    lastError: options?.lastError,
    conflictReason: undefined
  };
}

export function attendanceRecordsFromDraft(draft: OfflineAttendanceDraft): AttendanceRecord[] {
  return draft.records.map((record) => ({
    studentId: record.studentId,
    studentName: record.studentName ?? "",
    number: record.number ?? "",
    status: record.status,
    note: record.note
  }));
}
