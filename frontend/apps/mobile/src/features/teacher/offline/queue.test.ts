import { describe, expect, it } from "vitest";
import { mergeDraftRecords, mergeDraftsForLesson, upsertDraftInQueue } from "./queue";
import type { OfflineAttendanceDraft, OfflineDraftRecord } from "./types";

function record(studentId: string, status: OfflineDraftRecord["status"], updatedAt: string): OfflineDraftRecord {
  return { studentId, status, updatedAt };
}

function draft(lessonId: string, records: OfflineDraftRecord[], updatedAt: string): OfflineAttendanceDraft {
  return {
    id: `draft-${lessonId}`,
    tenantId: "t1",
    teacherId: "u1",
    lessonId,
    classId: "c1",
    className: "9-A",
    subjectName: "Matematik",
    records,
    createdAt: updatedAt,
    updatedAt,
    syncStatus: "queued"
  };
}

describe("offline queue merge", () => {
  it("keeps newest student status when merging records", () => {
    const merged = mergeDraftRecords(
      [record("s1", "present", "2026-06-01T10:00:00.000Z")],
      [record("s1", "absent", "2026-06-01T10:05:00.000Z")]
    );
    expect(merged).toHaveLength(1);
    expect(merged[0]?.status).toBe("absent");
  });

  it("merges two drafts for the same lesson", () => {
    const first = draft("l1", [record("s1", "present", "2026-06-01T10:00:00.000Z")], "2026-06-01T10:00:00.000Z");
    const second = draft("l1", [record("s2", "late", "2026-06-01T10:10:00.000Z")], "2026-06-01T10:10:00.000Z");
    const merged = mergeDraftsForLesson(first, second);
    expect(merged.records).toHaveLength(2);
    expect(merged.finalizePending).toBe(false);
  });

  it("upserts by lesson id", () => {
    const first = draft("l1", [record("s1", "present", "2026-06-01T10:00:00.000Z")], "2026-06-01T10:00:00.000Z");
    const second = draft("l2", [record("s2", "absent", "2026-06-01T10:00:00.000Z")], "2026-06-01T10:00:00.000Z");
    const queue = upsertDraftInQueue([first], second);
    expect(queue).toHaveLength(2);
    const updated = upsertDraftInQueue(queue, {
      ...second,
      records: [record("s2", "present", "2026-06-01T10:20:00.000Z")],
      updatedAt: "2026-06-01T10:20:00.000Z"
    });
    expect(updated).toHaveLength(2);
    expect(updated.find((item) => item.lessonId === "l2")?.records[0]?.status).toBe("present");
  });
});
