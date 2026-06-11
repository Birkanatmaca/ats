import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AttendanceSession } from "@/shared/api/types";
import { syncOfflineDraft } from "./sync";
import type { OfflineAttendanceDraft } from "./types";

const apiMocks = vi.hoisted(() => ({
  getAttendanceSession: vi.fn(),
  getAttendanceSessionByLesson: vi.fn(),
  createAttendanceSession: vi.fn(),
  updateAttendanceRecords: vi.fn(),
  finalizeAttendanceSession: vi.fn()
}));

vi.mock("@/shared/api/client", () => ({
  ApiError: class ApiError extends Error {
    code?: string;
    status?: number;
    constructor(message: string, code?: string, status?: number) {
      super(message);
      this.code = code;
      this.status = status;
    }
  },
  api: apiMocks
}));

const baseSession: AttendanceSession = {
  id: "session-1",
  lessonId: "lesson-1",
  classId: "class-1",
  className: "9-A",
  subjectName: "Matematik",
  teacherId: "teacher-1",
  startedAt: "2026-06-08T08:00:00.000Z",
  records: [
    {
      studentId: "s1",
      studentName: "Ali",
      number: "101",
      status: "unknown"
    }
  ]
};

const baseDraft: OfflineAttendanceDraft = {
  id: "draft-1",
  tenantId: "tenant-1",
  teacherId: "teacher-1",
  lessonId: "lesson-1",
  sessionId: "session-1",
  classId: "class-1",
  className: "9-A",
  subjectName: "Matematik",
  lessonStartsAt: "2026-06-08T08:00:00.000Z",
  lessonEndsAt: "2026-06-08T08:40:00.000Z",
  records: [
    {
      studentId: "s1",
      studentName: "Ali",
      number: "101",
      status: "present",
      updatedAt: "2026-06-08T08:10:00.000Z"
    }
  ],
  createdAt: "2026-06-08T08:05:00.000Z",
  updatedAt: "2026-06-08T08:10:00.000Z",
  syncStatus: "queued"
};

describe("syncOfflineDraft", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiMocks.getAttendanceSession.mockResolvedValue(baseSession);
    apiMocks.updateAttendanceRecords.mockResolvedValue({
      ...baseSession,
      records: baseDraft.records.map((record) => ({
        studentId: record.studentId,
        studentName: record.studentName ?? "",
        number: record.number ?? "",
        status: record.status,
        note: record.note
      }))
    });
    apiMocks.finalizeAttendanceSession.mockResolvedValue({
      ...baseSession,
      finalizedAt: "2026-06-08T08:15:00.000Z"
    });
  });

  it("syncs queued draft and marks it synced", async () => {
    const result = await syncOfflineDraft(baseDraft, new Date("2026-06-08T08:20:00.000Z"));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.draft.syncStatus).toBe("synced");
    }
    expect(apiMocks.updateAttendanceRecords).toHaveBeenCalledOnce();
  });

  it("finalizes when finalizePending is set", async () => {
    const result = await syncOfflineDraft(
      { ...baseDraft, finalizePending: true },
      new Date("2026-06-08T08:20:00.000Z")
    );
    expect(result.ok).toBe(true);
    expect(apiMocks.finalizeAttendanceSession).toHaveBeenCalledOnce();
  });

  it("blocks sync when attendance window is closed", async () => {
    const result = await syncOfflineDraft(baseDraft, new Date("2026-06-08T12:00:00.000Z"));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.draft.conflictReason).toBe("window_closed");
    }
    expect(apiMocks.updateAttendanceRecords).not.toHaveBeenCalled();
  });
});
