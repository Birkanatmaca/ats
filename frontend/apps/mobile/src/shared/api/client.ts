import type {
  AiCapabilitiesResult,
  AiConversation,
  AiMessage,
  AiSendMessageResult,
  Announcement,
  AttendanceDayReport,
  AttendanceRecord,
  AttendanceSession,
  AuthSession,
  CurrentLesson,
  GuidanceNote,
  GuidanceStudent,
  GuardianAttendanceRecord,
  GuardianNotification,
  GuardianStudent,
  Lesson,
  Observation,
  Principal,
  PrincipalSchoolRoster,
  PrincipalSummary,
  Schedule,
  ScheduleGenerationResult,
  ScheduleValidationResult,
  SchoolStudentRecord,
  SupportTicket,
  Tenant,
  UserAccount,
  UserNotification,
  UserProfile
} from "@/shared/api/types";
import { clearAuthSession, readAuthSession, storeAuthSession } from "@/shared/auth/session";

type Envelope<T> = { data: T; meta?: unknown };

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? "";

function asArray<T>(value: T[] | null | undefined): T[] {
  return value ?? [];
}

let refreshInFlight: Promise<AuthSession | null> | null = null;

async function authHeaders(): Promise<Record<string, string>> {
  const session = await readAuthSession();
  if (!session?.accessToken) return {};
  return { Authorization: `Bearer ${session.accessToken}` };
}

async function refreshSession(): Promise<AuthSession | null> {
  const session = await readAuthSession();
  if (!session?.refreshToken) {
    await clearAuthSession();
    return null;
  }
  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/v1/auth/refresh`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken: session.refreshToken })
        });
        if (!response.ok) {
          await clearAuthSession();
          return null;
        }
        const envelope = (await response.json()) as Envelope<AuthSession>;
        const next = envelope.data;
        if (!next?.accessToken || !next.principal?.role) {
          await clearAuthSession();
          return null;
        }
        next.principal.mustChangePassword = Boolean(next.principal.mustChangePassword);
        await storeAuthSession(next);
        return next;
      } catch {
        await clearAuthSession();
        return null;
      } finally {
        refreshInFlight = null;
      }
    })();
  }
  return refreshInFlight;
}

export async function request<T>(path: string, init?: RequestInit, retried = false): Promise<T> {
  const headers = new Headers(init?.headers);
  if (!headers.has("Content-Type") && init?.body) {
    headers.set("Content-Type", "application/json");
  }
  for (const [key, value] of Object.entries(await authHeaders())) {
    headers.set(key, value);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers });

  if (response.status === 401 && !retried && path !== "/api/v1/auth/refresh") {
    const refreshed = await refreshSession();
    if (refreshed) return request<T>(path, init, true);
  }

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    const message = payload?.error?.message ?? `API isteği başarısız: ${response.status}`;
    throw new Error(message);
  }

  const envelope = (await response.json()) as Envelope<T>;
  return (envelope.data ?? null) as T;
}

export const api = {
  login: (payload: { email: string; password: string }) =>
    request<AuthSession>("/api/v1/auth/login", { method: "POST", body: JSON.stringify(payload) }),
  changePassword: (payload: { newPassword: string }) =>
    request<AuthSession>("/api/v1/auth/password/first-login", {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  logout: () => request<{ ok: boolean }>("/api/v1/auth/logout", { method: "POST", body: "{}" }),
  me: () => request<Principal>("/api/v1/me"),
  tenant: () => request<Tenant>("/api/v1/tenants/current"),

  teacherCalendar: () => request<Lesson[] | null>("/api/v1/teachers/me/calendar").then(asArray),
  teacherStudents: () => request<SchoolStudentRecord[] | null>("/api/v1/teachers/me/students").then(asArray),
  currentLesson: () => request<CurrentLesson>("/api/v1/attendance/current-lesson"),
  observations: () => request<Observation[] | null>("/api/v1/observations").then(asArray),
  createAttendanceSession: (lessonId: string) =>
    request<AttendanceSession>("/api/v1/attendance/sessions", {
      method: "POST",
      body: JSON.stringify({ lessonId })
    }),
  getAttendanceSessionByLesson: (lessonId: string) =>
    request<AttendanceSession>(`/api/v1/attendance/sessions/by-lesson/${lessonId}`),
  updateAttendanceRecords: (sessionId: string, records: AttendanceRecord[]) =>
    request<AttendanceSession>(`/api/v1/attendance/sessions/${sessionId}/records`, {
      method: "PATCH",
      body: JSON.stringify({
        records: records.map((r) => ({ studentId: r.studentId, status: r.status, note: r.note ?? "" }))
      })
    }),
  finalizeAttendanceSession: (sessionId: string) =>
    request<AttendanceSession>(`/api/v1/attendance/sessions/${sessionId}/finalize`, {
      method: "POST",
      body: "{}"
    }),
  reopenAttendanceSession: (sessionId: string) =>
    request<AttendanceSession>(`/api/v1/attendance/sessions/${sessionId}/reopen`, {
      method: "POST",
      body: "{}"
    }),
  createObservation: (payload: { studentId: string; category: string; note: string }) =>
    request<Observation>("/api/v1/observations", { method: "POST", body: JSON.stringify(payload) }),

  guardianStudents: () => request<GuardianStudent[] | null>("/api/v1/guardian/me/students").then(asArray),
  guardianStudentSchedule: (studentId: string) =>
    request<{ studentId: string; lessons: Lesson[] }>(`/api/v1/guardian/students/${studentId}/schedule`),
  guardianStudentAttendance: (studentId: string) =>
    request<{ studentId: string; records: GuardianAttendanceRecord[] }>(
      `/api/v1/guardian/students/${studentId}/attendance`
    ),

  guidanceStudents: () => request<GuidanceStudent[] | null>("/api/v1/guidance/students").then(asArray),
  guidanceNotes: () => request<GuidanceNote[] | null>("/api/v1/guidance/notes").then(asArray),
  observationsFiltered: (params?: { category?: string; className?: string; date?: string }) => {
    const query = new URLSearchParams();
    if (params?.category) query.set("category", params.category);
    if (params?.className) query.set("className", params.className);
    if (params?.date) query.set("date", params.date);
    const suffix = query.toString() ? `?${query.toString()}` : "";
    return request<Observation[] | null>(`/api/v1/observations${suffix}`).then(asArray);
  },
  createGuidanceNote: (payload: { studentId: string; noteType: string; title: string; body: string }) =>
    request<GuidanceNote>("/api/v1/guidance/notes", { method: "POST", body: JSON.stringify(payload) }),

  dashboard: () => request<PrincipalSummary>("/api/v1/dashboard/principal/summary"),
  principalRoster: () =>
    request<PrincipalSchoolRoster>("/api/v1/principal/school/roster").then((roster) => ({
      classes: roster?.classes ?? [],
      sections: roster?.sections ?? [],
      students: roster?.students ?? []
    })),
  attendanceToday: (date?: string) =>
    request<AttendanceDayReport>(
      `/api/v1/dashboard/attendance/today${date ? `?date=${encodeURIComponent(date)}` : ""}`
    ),

  announcements: () => request<Announcement[] | null>("/api/v1/announcements").then(asArray),
  guardianAnnouncements: () => request<Announcement[] | null>("/api/v1/guardian/announcements").then(asArray),
  createAnnouncement: (payload: { title: string; body: string; audience: string }) =>
    request<Announcement>("/api/v1/announcements", { method: "POST", body: JSON.stringify(payload) }),
  notifications: () => request<UserNotification[] | null>("/api/v1/notifications").then(asArray),
  notificationMarkRead: (id: string) =>
    request<UserNotification>(`/api/v1/notifications/${id}/read`, { method: "PATCH", body: "{}" }),
  guardianNotifications: () => request<GuardianNotification[] | null>("/api/v1/guardian/notifications").then(asArray),
  guardianNotificationMarkRead: (id: string) =>
    request<GuardianNotification>(`/api/v1/guardian/notifications/${id}/read`, { method: "PATCH", body: "{}" }),
  supportTickets: () => request<SupportTicket[] | null>("/api/v1/support/tickets").then(asArray),
  createSupportTicket: (payload: { type: string; subject: string; message: string }) =>
    request<SupportTicket>("/api/v1/support/tickets", { method: "POST", body: JSON.stringify(payload) }),
  profile: () => request<UserProfile>("/api/v1/profile"),
  updateProfile: (payload: { avatarUrl?: string | null; profileAccent?: string }) =>
    request<UserProfile>("/api/v1/profile", { method: "PATCH", body: JSON.stringify(payload) }),
  principalTeachers: () => request<UserAccount[] | null>("/api/v1/principal/teachers").then(asArray),
  provisionTeacher: (payload: { email: string; firstName: string; lastName: string; title: string }) =>
    request<{ email: string; temporaryPassword: string; teacher?: UserAccount }>("/api/v1/principal/teachers", {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  resetTeacherPassword: (teacherId: string) =>
    request<{ temporaryPassword: string }>(`/api/v1/teachers/${teacherId}/reset-password`, {
      method: "POST",
      body: "{}"
    }),
  schedule: () => request<Schedule>("/api/v1/schedules/current"),
  generateSchedule: () =>
    request<ScheduleGenerationResult>("/api/v1/schedules/generate", { method: "POST", body: "{}" }),
  validateSchedule: (scheduleId: string) =>
    request<ScheduleValidationResult>(`/api/v1/schedules/${scheduleId}/validate`, { method: "POST", body: "{}" }),
  publishSchedule: (scheduleId: string) =>
    request<Schedule>(`/api/v1/schedules/${scheduleId}/publish`, { method: "POST", body: "{}" }),
  aiCapabilities: () => request<AiCapabilitiesResult>("/api/v1/ai/capabilities"),
  createAiConversation: (payload?: { title?: string }) =>
    request<AiConversation>("/api/v1/ai/conversations", { method: "POST", body: JSON.stringify(payload ?? {}) }),
  sendAiMessage: (conversationId: string, payload: { content: string; selectedCandidateId?: string }) =>
    request<AiSendMessageResult>(`/api/v1/ai/conversations/${conversationId}/messages`, {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  confirmAiAction: (actionId: string) =>
    request<{ message: AiMessage }>(`/api/v1/ai/actions/${actionId}/confirm`, { method: "POST", body: "{}" }),
  cancelAiAction: (actionId: string) =>
    request<void>(`/api/v1/ai/actions/${actionId}/cancel`, { method: "POST", body: "{}" })
};
