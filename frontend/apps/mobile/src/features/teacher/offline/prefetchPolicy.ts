import type { OfflineAttendanceDraft } from "./types";

export function shouldSkipAttendancePrefetch(draft?: OfflineAttendanceDraft): boolean {
  if (!draft) return false;
  return (
    draft.syncStatus === "draft" ||
    draft.syncStatus === "queued" ||
    draft.syncStatus === "syncing" ||
    draft.syncStatus === "failed" ||
    draft.syncStatus === "conflict"
  );
}
