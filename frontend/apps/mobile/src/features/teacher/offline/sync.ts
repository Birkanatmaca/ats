import { ApiError, api } from "@/shared/api/client";
import type { AttendanceSession } from "@/shared/api/types";
import { isLessonInAttendanceWindow } from "@/shared/utils/lessonSchedule";
import { detectOfflineConflict, mapApiErrorToConflictReason } from "./conflict";
import { applyRecordUpdatesToDraft, attendanceRecordsFromDraft } from "./queue";
import type { OfflineAttendanceDraft, OfflineConflictState } from "./types";
import { recordsVersion } from "./version";

export type SyncDraftResult =
  | { ok: true; draft: OfflineAttendanceDraft; session: AttendanceSession }
  | { ok: false; draft: OfflineAttendanceDraft; conflict?: OfflineConflictState; retryable: boolean };

export async function syncOfflineDraft(draft: OfflineAttendanceDraft, now = new Date()): Promise<SyncDraftResult> {
  let working: OfflineAttendanceDraft = { ...draft, syncStatus: "syncing", lastError: undefined };

  if (working.lessonStartsAt && working.lessonEndsAt) {
    const lessonLike = {
      startsAt: working.lessonStartsAt,
      endsAt: working.lessonEndsAt
    };
    if (!isLessonInAttendanceWindow(lessonLike as Parameters<typeof isLessonInAttendanceWindow>[0], now)) {
      return {
        ok: false,
        retryable: true,
        draft: {
          ...working,
          syncStatus: "failed",
          conflictReason: "window_closed",
          lastError: "Yoklama penceresi kapalı. Müdür onayı veya dersin yeniden açılması gerekir."
        }
      };
    }
  }

  try {
    let session: AttendanceSession;
    if (working.sessionId) {
      session = await api.getAttendanceSession(working.sessionId);
    } else {
      session = await api.getAttendanceSessionByLesson(working.lessonId).catch(async () =>
        api.createAttendanceSession(working.lessonId)
      );
      working = { ...working, sessionId: session.id };
    }

    const conflict = detectOfflineConflict(working, session);
    if (conflict) {
      return {
        ok: false,
        retryable: false,
        conflict,
        draft: {
          ...working,
          syncStatus: "conflict",
          conflictReason: conflict.reason,
          lastError: conflict.reason
        }
      };
    }

    const records = attendanceRecordsFromDraft(working);
    const idempotencyKey = `${working.id}:${working.updatedAt}`;
    session = await api.updateAttendanceRecords(working.sessionId!, records, { idempotencyKey });

    if (working.finalizePending) {
      session = await api.finalizeAttendanceSession(session.id);
    }

    return {
      ok: true,
      session,
      draft: {
        ...working,
        sessionId: session.id,
        baseVersion: recordsVersion(session.records),
        syncStatus: "synced",
        finalizePending: false,
        lastError: undefined,
        conflictReason: undefined,
        records: session.records.map((record) => ({
          studentId: record.studentId,
          studentName: record.studentName,
          number: record.number,
          status: record.status,
          note: record.note,
          updatedAt: new Date().toISOString()
        }))
      }
    };
  } catch (error) {
    const apiError = error instanceof ApiError ? error : null;
    const conflictReason = mapApiErrorToConflictReason(apiError?.code, apiError?.status);
    if (conflictReason === "session_finalized" && working.sessionId) {
      try {
        const serverSession = await api.getAttendanceSession(working.sessionId);
        const conflict = detectOfflineConflict(working, serverSession);
        if (conflict) {
          return {
            ok: false,
            retryable: false,
            conflict,
            draft: {
              ...working,
              syncStatus: "conflict",
              conflictReason,
              lastError: apiError?.message ?? "Senkron çakışması"
            }
          };
        }
      } catch {
        /* fall through */
      }
    }

    if (conflictReason === "window_closed") {
      return {
        ok: false,
        retryable: true,
        draft: {
          ...working,
          syncStatus: "failed",
          conflictReason,
          lastError: apiError?.message ?? "Yoklama penceresi kapalı."
        }
      };
    }

    return {
      ok: false,
      retryable: true,
      draft: {
        ...working,
        syncStatus: "failed",
        lastError: error instanceof Error ? error.message : "Senkron başarısız."
      }
    };
  }
}

export function markDraftQueuedFromSession(
  draft: OfflineAttendanceDraft,
  session: AttendanceSession,
  finalizePending: boolean
): OfflineAttendanceDraft {
  return applyRecordUpdatesToDraft(draft, session.records, {
    finalizePending,
    syncStatus: "queued"
  });
}
