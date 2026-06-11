import { api } from "@/shared/api/client";
import type { AttendanceSession, Lesson } from "@/shared/api/types";
import type { OfflineAttendanceDraft } from "./types";
import { shouldSkipAttendancePrefetch } from "./prefetchPolicy";

export { shouldSkipAttendancePrefetch } from "./prefetchPolicy";

async function openSessionForLesson(lessonId: string): Promise<AttendanceSession> {
  try {
    return await api.getAttendanceSessionByLesson(lessonId);
  } catch {
    return await api.createAttendanceSession(lessonId);
  }
}

export async function prefetchTodayAttendanceSessions(
  lessons: Lesson[],
  options: {
    getDraftForLesson: (lessonId: string) => OfflineAttendanceDraft | undefined;
    cacheOpenedSession: (session: AttendanceSession, lesson?: Lesson) => Promise<void>;
  }
): Promise<{ prefetched: number; skipped: number }> {
  let prefetched = 0;
  let skipped = 0;

  for (const lesson of lessons) {
    if (shouldSkipAttendancePrefetch(options.getDraftForLesson(lesson.id))) {
      skipped += 1;
      continue;
    }
    try {
      const session = await openSessionForLesson(lesson.id);
      await options.cacheOpenedSession(session, lesson);
      prefetched += 1;
    } catch {
      skipped += 1;
    }
  }

  return { prefetched, skipped };
}
