import { describe, expect, it } from "vitest";
import { detectOfflineConflict, draftHasLocalChanges } from "./conflict";
import type { OfflineAttendanceDraft } from "./types";

const serverSession = {
  id: "sess-1",
  lessonId: "lesson-1",
  classId: "c1",
  className: "9-A",
  subjectName: "Matematik",
  teacherId: "t1",
  startedAt: "2026-06-01T08:00:00.000Z",
  finalizedAt: undefined,
  records: [
    { studentId: "s1", studentName: "Ali", number: "101", status: "present" as const },
    { studentId: "s2", studentName: "Ayşe", number: "102", status: "unknown" as const }
  ]
};

const baseDraft: OfflineAttendanceDraft = {
  id: "draft-1",
  tenantId: "tenant-1",
  teacherId: "teacher-1",
  lessonId: "lesson-1",
  sessionId: "sess-1",
  classId: "c1",
  className: "9-A",
  subjectName: "Matematik",
  records: [
    { studentId: "s1", status: "absent", updatedAt: "2026-06-01T09:00:00.000Z" },
    { studentId: "s2", status: "present", updatedAt: "2026-06-01T09:00:00.000Z" }
  ],
  baseVersion: "old-version",
  createdAt: "2026-06-01T08:30:00.000Z",
  updatedAt: "2026-06-01T09:00:00.000Z",
  syncStatus: "queued"
};

describe("offline conflict detection", () => {
  it("detects finalized session conflict", () => {
    const conflict = detectOfflineConflict(baseDraft, {
      ...serverSession,
      finalizedAt: "2026-06-01T09:30:00.000Z"
    });
    expect(conflict?.reason).toBe("session_finalized");
  });

  it("detects server record changes", () => {
    const conflict = detectOfflineConflict(baseDraft, {
      ...serverSession,
      records: serverSession.records.map((record) =>
        record.studentId === "s1" ? { ...record, status: "late" as const } : record
      )
    });
    expect(conflict?.reason).toBe("server_changed");
  });

  it("detects removed students", () => {
    const conflict = detectOfflineConflict(
      {
        ...baseDraft,
        records: [...baseDraft.records, { studentId: "s3", status: "present", updatedAt: "2026-06-01T09:00:00.000Z" }]
      },
      serverSession
    );
    expect(conflict?.reason).toBe("student_list_changed");
    expect(conflict?.removedStudentIds).toEqual(["s3"]);
  });

  it("reports local changes against server", () => {
    expect(draftHasLocalChanges(baseDraft, serverSession)).toBe(true);
  });
});
