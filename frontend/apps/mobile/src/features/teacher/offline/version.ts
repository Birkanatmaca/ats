import type { AttendanceRecord } from "@/shared/api/types";
import type { OfflineDraftRecord } from "./types";

export function recordsVersion(records: Array<Pick<AttendanceRecord | OfflineDraftRecord, "studentId" | "status">>): string {
  return records
    .map((record) => `${record.studentId}:${record.status}`)
    .sort()
    .join("|");
}
