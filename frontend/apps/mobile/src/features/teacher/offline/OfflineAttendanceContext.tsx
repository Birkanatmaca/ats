import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode
} from "react";
import { api } from "@/shared/api/client";
import { queryKeys } from "@/shared/api/queryKeys";
import type { AttendanceSession, Lesson } from "@/shared/api/types";
import { useAuth } from "@/shared/auth/AuthContext";
import {
  applyRecordUpdatesToDraft,
  createDraftFromSession,
  sessionFromDraft,
  upsertDraftInQueue
} from "./queue";
import { fetchConnectivity, isOnline, subscribeConnectivity, type ConnectivitySnapshot } from "./netInfo";
import { prefetchTodayAttendanceSessions } from "./prefetch";
import { loadOfflineQueue, saveOfflineQueue, saveTeacherCalendarCache } from "./storage";
import { syncOfflineDraft } from "./sync";
import { currentWeekday, lessonsForDay } from "@/shared/utils/lessonSchedule";
import type { OfflineAttendanceDraft, OfflineConflictState } from "./types";
import { isPendingSyncStatus } from "./types";
import { recordsVersion } from "./version";

type OfflineAttendanceContextValue = {
  online: boolean;
  drafts: OfflineAttendanceDraft[];
  pendingCount: number;
  localBackupCount: number;
  cachedLessonCount: number;
  prefetching: boolean;
  syncing: boolean;
  activeConflict: OfflineConflictState | null;
  cacheOpenedSession: (session: AttendanceSession, lesson?: Lesson) => Promise<void>;
  persistSessionChanges: (
    session: AttendanceSession,
    options?: { finalizePending?: boolean; syncStatus?: OfflineAttendanceDraft["syncStatus"] }
  ) => Promise<void>;
  loadDraftSession: (lessonId: string) => AttendanceSession | null;
  getDraftForLesson: (lessonId: string) => OfflineAttendanceDraft | undefined;
  syncNow: () => Promise<void>;
  resolveConflictKeepLocal: () => Promise<void>;
  resolveConflictKeepServer: () => Promise<void>;
  dismissConflict: () => Promise<void>;
  retryFailedDraft: (draftId: string) => Promise<void>;
  removeSyncedDrafts: () => Promise<void>;
};

const OfflineAttendanceContext = createContext<OfflineAttendanceContextValue | null>(null);

export function OfflineAttendanceProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const tenantId = session?.principal?.tenantId ?? "";
  const teacherId = session?.principal?.userId ?? "";
  const enabled = session?.principal?.role === "teacher" && Boolean(tenantId && teacherId);

  const [connectivity, setConnectivity] = useState<ConnectivitySnapshot>({ isConnected: true, isInternetReachable: true });
  const [drafts, setDrafts] = useState<OfflineAttendanceDraft[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [prefetching, setPrefetching] = useState(false);
  const [cachedLessonCount, setCachedLessonCount] = useState(0);
  const [activeConflict, setActiveConflict] = useState<OfflineConflictState | null>(null);
  const syncInFlight = useRef(false);
  const prefetchInFlight = useRef(false);
  const prefetchStateRef = useRef({ dateKey: "", lessonIds: new Set<string>() });
  const wasOnlineRef = useRef(true);
  const draftsRef = useRef<OfflineAttendanceDraft[]>([]);
  draftsRef.current = drafts;

  const online = isOnline(connectivity);

  const calendarQ = useQuery({
    queryKey: queryKeys.teacherCalendar,
    queryFn: () => api.teacherCalendar(),
    enabled: enabled && online,
    staleTime: 5 * 60 * 1000
  });

  const persistDrafts = useCallback(
    async (nextDrafts: OfflineAttendanceDraft[]) => {
      if (!enabled) return;
      setDrafts(nextDrafts);
      await saveOfflineQueue(tenantId, teacherId, nextDrafts);
    },
    [enabled, tenantId, teacherId]
  );

  useEffect(() => {
    void fetchConnectivity().then(setConnectivity);
    return subscribeConnectivity(setConnectivity);
  }, []);

  useEffect(() => {
    if (!enabled) {
      setDrafts([]);
      return;
    }
    void loadOfflineQueue(tenantId, teacherId).then(setDrafts);
  }, [enabled, tenantId, teacherId]);

  const runSync = useCallback(async () => {
    if (!enabled || syncInFlight.current) return;
    if (!isOnline(connectivity)) return;

    const currentDrafts = draftsRef.current;
    const candidates = currentDrafts.filter(
      (draft) =>
        draft.syncStatus === "queued" ||
        draft.syncStatus === "syncing" ||
        (draft.syncStatus === "failed" && draft.conflictReason !== "window_closed")
    );
    if (candidates.length === 0) return;

    syncInFlight.current = true;
    setSyncing(true);
    let nextDrafts = [...currentDrafts];

    try {
      for (const candidate of candidates) {
        const result = await syncOfflineDraft(candidate);
        nextDrafts = nextDrafts.map((draft) => (draft.id === candidate.id ? result.draft : draft));
        if (!result.ok && result.conflict) {
          setActiveConflict(result.conflict);
          break;
        }
      }
      await persistDrafts(nextDrafts);
      void queryClient.invalidateQueries({ queryKey: queryKeys.teacherCalendar });
    } finally {
      syncInFlight.current = false;
      setSyncing(false);
    }
  }, [connectivity, enabled, persistDrafts, queryClient]);

  useEffect(() => {
    if (online && enabled) {
      void runSync();
    }
  }, [online, enabled, runSync]);

  useEffect(() => {
    if (!enabled) return;
    if (wasOnlineRef.current && !online) {
      const currentDrafts = draftsRef.current;
      const promoted = currentDrafts.map((draft) =>
        draft.syncStatus === "draft" ? { ...draft, syncStatus: "queued" as const } : draft
      );
      if (promoted.some((draft, index) => draft.syncStatus !== currentDrafts[index]?.syncStatus)) {
        void persistDrafts(promoted);
      }
    }
    wasOnlineRef.current = online;
  }, [enabled, online, persistDrafts]);

  const getDraftForLesson = useCallback(
    (lessonId: string) => draftsRef.current.find((draft) => draft.lessonId === lessonId),
    []
  );

  useEffect(() => {
    if (!enabled || !online || !calendarQ.data?.length || prefetchInFlight.current) return;

    const dateKey = new Date().toISOString().slice(0, 10);
    if (prefetchStateRef.current.dateKey !== dateKey) {
      prefetchStateRef.current = { dateKey, lessonIds: new Set<string>() };
    }

    const todayLessons = lessonsForDay(calendarQ.data, currentWeekday());
    const pendingLessons = todayLessons.filter((lesson) => !prefetchStateRef.current.lessonIds.has(lesson.id));
    if (pendingLessons.length === 0) {
      setCachedLessonCount(
        todayLessons.filter((lesson) => Boolean(getDraftForLesson(lesson.id))).length
      );
      return;
    }

    prefetchInFlight.current = true;
    setPrefetching(true);
    void (async () => {
      try {
        await saveTeacherCalendarCache(tenantId, teacherId, calendarQ.data ?? []);
        await prefetchTodayAttendanceSessions(pendingLessons, {
          getDraftForLesson,
          cacheOpenedSession: async (session, lesson) => {
            const currentDrafts = draftsRef.current;
            const existing = currentDrafts.find((draft) => draft.lessonId === session.lessonId);
            const nextDraft = existing
              ? applyRecordUpdatesToDraft(existing, session.records, { syncStatus: "synced" })
              : createDraftFromSession({
                  session,
                  tenantId,
                  teacherId,
                  lesson,
                  syncStatus: "synced",
                  baseVersion: recordsVersion(session.records)
                });
            await persistDrafts(upsertDraftInQueue(currentDrafts, { ...nextDraft, sessionId: session.id }));
          }
        });
        for (const lesson of pendingLessons) {
          prefetchStateRef.current.lessonIds.add(lesson.id);
        }
        setCachedLessonCount(
          todayLessons.filter((lesson) => Boolean(draftsRef.current.find((draft) => draft.lessonId === lesson.id))).length
        );
      } finally {
        prefetchInFlight.current = false;
        setPrefetching(false);
      }
    })();
  }, [calendarQ.data, calendarQ.dataUpdatedAt, enabled, getDraftForLesson, online, persistDrafts, teacherId, tenantId]);

  const cacheOpenedSession = useCallback(
    async (opened: AttendanceSession, lesson?: Lesson) => {
      if (!enabled) return;
      const currentDrafts = draftsRef.current;
      const existing = currentDrafts.find((draft) => draft.lessonId === opened.lessonId);
      const nextDraft = existing
        ? applyRecordUpdatesToDraft(existing, opened.records, { syncStatus: "synced" })
        : createDraftFromSession({
            session: opened,
            tenantId,
            teacherId,
            lesson,
            syncStatus: "synced",
            baseVersion: recordsVersion(opened.records)
          });
      await persistDrafts(upsertDraftInQueue(currentDrafts, { ...nextDraft, sessionId: opened.id }));
    },
    [enabled, persistDrafts, teacherId, tenantId]
  );

  const persistSessionChanges = useCallback(
    async (
      changed: AttendanceSession,
      options?: { finalizePending?: boolean; syncStatus?: OfflineAttendanceDraft["syncStatus"] }
    ) => {
      if (!enabled) return;
      const currentDrafts = draftsRef.current;
      const existing =
        currentDrafts.find((draft) => draft.lessonId === changed.lessonId) ??
        createDraftFromSession({
          session: changed,
          tenantId,
          teacherId,
          syncStatus: options?.syncStatus ?? (isOnline(connectivity) ? "draft" : "queued")
        });
      const syncStatus =
        options?.syncStatus ?? (options?.finalizePending ? "queued" : isOnline(connectivity) ? "draft" : "queued");
      const nextDraft = applyRecordUpdatesToDraft(existing, changed.records, {
        finalizePending: options?.finalizePending,
        syncStatus
      });
      await persistDrafts(upsertDraftInQueue(currentDrafts, nextDraft));
      if (syncStatus === "queued" && isOnline(connectivity)) {
        void runSync();
      }
    },
    [connectivity, enabled, persistDrafts, runSync, teacherId, tenantId]
  );

  const loadDraftSession = useCallback(
    (lessonId: string) => {
      const draft = drafts.find((item) => item.lessonId === lessonId);
      if (!draft) return null;
      if (draft.syncStatus === "synced" || isPendingSyncStatus(draft.syncStatus)) {
        return sessionFromDraft(draft);
      }
      return null;
    },
    [drafts]
  );

  const resolveConflictKeepLocal = useCallback(async () => {
    if (!activeConflict) return;
    const currentDrafts = draftsRef.current;
    const reopened = activeConflict.serverSession.finalizedAt
      ? await api.reopenAttendanceSession(activeConflict.serverSession.id)
      : activeConflict.serverSession;
    const nextDraft: OfflineAttendanceDraft = {
      ...activeConflict.draft,
      sessionId: reopened.id,
      syncStatus: "queued",
      conflictReason: undefined,
      lastError: undefined,
      baseVersion: recordsVersion(reopened.records)
    };
    const nextDrafts = upsertDraftInQueue(
      currentDrafts.filter((draft) => draft.id !== activeConflict.draft.id),
      nextDraft
    );
    setActiveConflict(null);
    await persistDrafts(nextDrafts);
    void runSync();
  }, [activeConflict, persistDrafts, runSync]);

  const resolveConflictKeepServer = useCallback(async () => {
    if (!activeConflict) return;
    const nextDrafts = draftsRef.current.filter((draft) => draft.id !== activeConflict.draft.id);
    setActiveConflict(null);
    await persistDrafts(nextDrafts);
  }, [activeConflict, persistDrafts]);

  const dismissConflict = useCallback(async () => {
    if (!activeConflict) return;
    const nextDrafts = draftsRef.current.map((draft) =>
      draft.id === activeConflict.draft.id
        ? { ...draft, syncStatus: "failed" as const, lastError: "Çakışma çözülmedi." }
        : draft
    );
    setActiveConflict(null);
    await persistDrafts(nextDrafts);
  }, [activeConflict, persistDrafts]);

  const retryFailedDraft = useCallback(
    async (draftId: string) => {
      const nextDrafts = draftsRef.current.map((draft) =>
        draft.id === draftId ? { ...draft, syncStatus: "queued" as const, lastError: undefined } : draft
      );
      await persistDrafts(nextDrafts);
      void runSync();
    },
    [persistDrafts, runSync]
  );

  const removeSyncedDrafts = useCallback(async () => {
    await persistDrafts(draftsRef.current.filter((draft) => draft.syncStatus !== "synced"));
  }, [persistDrafts]);

  const pendingCount = useMemo(
    () =>
      drafts.filter(
        (draft) =>
          draft.syncStatus === "queued" ||
          draft.syncStatus === "syncing" ||
          draft.syncStatus === "failed" ||
          draft.syncStatus === "conflict"
      ).length,
    [drafts]
  );

  const localBackupCount = useMemo(
    () => drafts.filter((draft) => draft.syncStatus === "draft").length,
    [drafts]
  );

  useEffect(() => {
    if (!enabled || !calendarQ.data?.length) return;
    const todayLessons = lessonsForDay(calendarQ.data, currentWeekday());
    setCachedLessonCount(todayLessons.filter((lesson) => getDraftForLesson(lesson.id)).length);
  }, [calendarQ.data, drafts, enabled, getDraftForLesson]);

  const value = useMemo<OfflineAttendanceContextValue>(
    () => ({
      online,
      drafts,
      pendingCount,
      localBackupCount,
      cachedLessonCount,
      prefetching,
      syncing,
      activeConflict,
      cacheOpenedSession,
      persistSessionChanges,
      loadDraftSession,
      getDraftForLesson,
      syncNow: runSync,
      resolveConflictKeepLocal,
      resolveConflictKeepServer,
      dismissConflict,
      retryFailedDraft,
      removeSyncedDrafts
    }),
    [
      online,
      drafts,
      pendingCount,
      localBackupCount,
      cachedLessonCount,
      prefetching,
      syncing,
      activeConflict,
      cacheOpenedSession,
      persistSessionChanges,
      loadDraftSession,
      getDraftForLesson,
      runSync,
      resolveConflictKeepLocal,
      resolveConflictKeepServer,
      dismissConflict,
      retryFailedDraft,
      removeSyncedDrafts
    ]
  );

  return <OfflineAttendanceContext.Provider value={value}>{children}</OfflineAttendanceContext.Provider>;
}

export function useOfflineAttendance() {
  const ctx = useContext(OfflineAttendanceContext);
  if (!ctx) {
    throw new Error("useOfflineAttendance must be used within OfflineAttendanceProvider");
  }
  return ctx;
}

export function useOptionalOfflineAttendance() {
  return useContext(OfflineAttendanceContext);
}
