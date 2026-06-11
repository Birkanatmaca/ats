import { describe, expect, it } from "vitest";
import { shouldSkipAttendancePrefetch } from "./prefetchPolicy";
import type { OfflineAttendanceDraft } from "./types";

function draft(syncStatus: OfflineAttendanceDraft["syncStatus"]): OfflineAttendanceDraft {
  return {
    id: "d1",
    tenantId: "t1",
    teacherId: "u1",
    lessonId: "l1",
    classId: "c1",
    className: "9-A",
    subjectName: "Matematik",
    records: [],
    createdAt: "2026-06-08T08:00:00.000Z",
    updatedAt: "2026-06-08T08:00:00.000Z",
    syncStatus
  };
}

describe("shouldSkipAttendancePrefetch", () => {
  it("allows prefetch when no draft exists", () => {
    expect(shouldSkipAttendancePrefetch(undefined)).toBe(false);
  });

  it("allows prefetch for synced cache", () => {
    expect(shouldSkipAttendancePrefetch(draft("synced"))).toBe(false);
  });

  it("skips when local changes are pending", () => {
    expect(shouldSkipAttendancePrefetch(draft("draft"))).toBe(true);
    expect(shouldSkipAttendancePrefetch(draft("queued"))).toBe(true);
    expect(shouldSkipAttendancePrefetch(draft("failed"))).toBe(true);
  });
});
