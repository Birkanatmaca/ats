import AsyncStorage from "@react-native-async-storage/async-storage";
import type { AuthSession, Lesson } from "@/shared/api/types";
import type { OfflineAttendanceDraft, OfflineQueueSnapshot } from "./types";
import { isPendingSyncStatus } from "./types";

const STORAGE_PREFIX = "@ots/offline-attendance/v1";
const CALENDAR_SUFFIX = "/calendar";

function storageKey(tenantId: string, teacherId: string): string {
  return `${STORAGE_PREFIX}/${tenantId}/${teacherId}`;
}

export async function loadOfflineQueue(tenantId: string, teacherId: string): Promise<OfflineAttendanceDraft[]> {
  const raw = await AsyncStorage.getItem(storageKey(tenantId, teacherId));
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as OfflineQueueSnapshot;
    return parsed.drafts ?? [];
  } catch {
    return [];
  }
}

export async function saveOfflineQueue(
  tenantId: string,
  teacherId: string,
  drafts: OfflineAttendanceDraft[]
): Promise<void> {
  const payload: OfflineQueueSnapshot = { drafts };
  await AsyncStorage.setItem(storageKey(tenantId, teacherId), JSON.stringify(payload));
}

export async function clearOfflineQueue(tenantId: string, teacherId: string): Promise<void> {
  await AsyncStorage.removeItem(storageKey(tenantId, teacherId));
}

export function countPendingDrafts(drafts: OfflineAttendanceDraft[]): number {
  return drafts.filter((draft) => isPendingSyncStatus(draft.syncStatus) && draft.syncStatus !== "draft").length;
}

export async function countPendingOfflineDrafts(session: AuthSession | null): Promise<number> {
  if (!session?.principal?.tenantId || !session.principal.userId) return 0;
  const drafts = await loadOfflineQueue(session.principal.tenantId, session.principal.userId);
  return countPendingDrafts(drafts);
}

export async function clearOfflineQueueForSession(session: AuthSession | null): Promise<void> {
  if (!session?.principal?.tenantId || !session.principal.userId) return;
  await clearOfflineQueue(session.principal.tenantId, session.principal.userId);
  await clearTeacherCalendarCache(session.principal.tenantId, session.principal.userId);
}

export async function saveTeacherCalendarCache(
  tenantId: string,
  teacherId: string,
  lessons: Lesson[]
): Promise<void> {
  await AsyncStorage.setItem(
    `${storageKey(tenantId, teacherId)}${CALENDAR_SUFFIX}`,
    JSON.stringify({ lessons, cachedAt: new Date().toISOString() })
  );
}

export async function loadTeacherCalendarCache(tenantId: string, teacherId: string): Promise<Lesson[]> {
  const raw = await AsyncStorage.getItem(`${storageKey(tenantId, teacherId)}${CALENDAR_SUFFIX}`);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as { lessons?: Lesson[] };
    return parsed.lessons ?? [];
  } catch {
    return [];
  }
}

export async function clearTeacherCalendarCache(tenantId: string, teacherId: string): Promise<void> {
  await AsyncStorage.removeItem(`${storageKey(tenantId, teacherId)}${CALENDAR_SUFFIX}`);
}
