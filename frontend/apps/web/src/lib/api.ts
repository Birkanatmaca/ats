export type Role = "super_admin" | "system_admin" | "principal" | "guidance" | "teacher" | "guardian";

export type Principal = {
  userId: string;
  tenantId: string;
  role: Role;
  name: string;
  email?: string;
  mustChangePassword: boolean;
};

export type AuthSession = {
  accessToken: string;
  refreshToken: string;
  principal: Principal;
  expiresAt: string;
  refreshExpiresAt?: string;
};

export type SchoolClassRecord = {
  id: string;
  name: string;
  createdAt: string;
};

export type SchoolStudentRecord = {
  id: string;
  classId: string;
  sectionId: string;
  schoolNumber: string;
  firstName: string;
  lastName: string;
  gender: string;
  birthDate: string;
  guardianName: string;
  guardianPhone: string;
  status: string;
  createdAt: string;
};

export type SchoolTeacherRecord = {
  id: string;
  userId: string;
  fullName: string;
  title: string;
};

export type SchoolSubjectRecord = {
  id: string;
  name: string;
  code: string;
};

export type GuardianStudent = {
  id: string;
  fullName: string;
  className: string;
  schoolNumber: string;
  relation?: string;
};

export type GuardianStudentSchedule = {
  studentId: string;
  lessons: Lesson[];
};

export type GuardianStudentAttendance = {
  studentId: string;
  records: GuardianAttendanceRecord[];
};

export type GuardianAttendanceRecord = {
  id: string;
  date: string;
  lesson: string;
  status: AttendanceRecord["status"];
  note?: string;
};

export type GuardianNotification = {
  id: string;
  title: string;
  body: string;
  kind: string;
  readAt?: string;
  createdAt: string;
};

export type ClassSummary = {
  classId: string;
  className: string;
  date: string;
  lessonsTotal: number;
  lessonsCompleted: number;
  attendanceCompletionPct: number;
  absentCount: number;
  studentsTotal: number;
};

export type ScheduleGenerationResult = {
  schedule: Schedule;
  hardConflicts: number;
  softWarnings: string[];
  recommendation: string;
};

export type SchedulingRequirement = {
  id: string;
  classId: string;
  className: string;
  subjectId: string;
  subjectName: string;
  weeklyHours: number;
};

export type TeacherAvailability = {
  id: string;
  teacherId: string;
  teacherUserId: string;
  teacherName: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  availabilityType: string;
};

export type ScheduleValidationResult = {
  valid: boolean;
  hardConflicts: string[];
  softWarnings: string[];
};

export type Tenant = {
  id: string;
  name: string;
  plan: string;
  timezone: string;
};

export type PrincipalSummary = {
  activeStudents: number;
  activeTeachers: number;
  classes: number;
  todayLessons: number;
  attendanceCompletionPct: number;
  absentToday: number;
  openObservationSignals: number;
  classAttendance: ClassAttendance[];
  operations: OperationItem[];
};

export type ClassAttendance = {
  className: string;
  completed: number;
  total: number;
  absent: number;
  attentionNeed: string;
};

export type OperationItem = {
  id: string;
  title: string;
  status: string;
  priority: string;
  kind?: string;
  targetPath?: string;
};

export type UserNotification = {
  id: string;
  title: string;
  body: string;
  kind: string;
  readAt?: string | null;
  createdAt: string;
};

export type Lesson = {
  id: string;
  scheduleId: string;
  classId: string;
  className: string;
  teacherId: string;
  teacherName: string;
  subjectId: string;
  subjectName: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  startsAt: string;
  endsAt: string;
  room: string;
};

export type Schedule = {
  id: string;
  name: string;
  status: "draft" | "published";
  version: number;
  score: number;
  lessons: Lesson[];
  updatedAt: string;
};

export type CurrentLesson = {
  found: boolean;
  reason?: string;
  lesson?: Lesson;
};

export type AttendanceRecord = {
  studentId: string;
  studentName: string;
  number: string;
  status: "present" | "absent" | "late" | "excused" | "unknown";
  note?: string;
};

export type AttendanceSession = {
  id: string;
  lessonId: string;
  classId: string;
  className: string;
  subjectName: string;
  teacherId: string;
  startedAt: string;
  finalizedAt?: string;
  records: AttendanceRecord[];
};

export type AttendanceDayRecord = {
  studentId: string;
  classId: string;
  status: AttendanceRecord["status"];
};

export type AttendanceDayReport = {
  date: string;
  records: AttendanceDayRecord[];
};

export type StudentAttendanceSummary = {
  studentId: string;
  records: Array<{
    date: string;
    subjectName: string;
    className: string;
    status: AttendanceRecord["status"];
  }>;
  present: number;
  absent: number;
  late: number;
  excused: number;
};

export type Observation = {
  id: string;
  studentId: string;
  studentName: string;
  classId: string;
  className: string;
  authorId: string;
  authorName: string;
  category: string;
  note: string;
  sensitivity: string;
  createdAt: string;
};

export type PrincipalSchoolRoster = {
  classes: Array<{ id: string; name: string; createdAt: string }>;
  sections: Array<{
    id: string;
    classId: string;
    name: string;
    gradeLevel: string;
    advisor: string;
    capacity: number;
    createdAt: string;
  }>;
  students: Array<{
    id: string;
    classId: string;
    sectionId: string;
    schoolNumber: string;
    firstName: string;
    lastName: string;
    gender: string;
    birthDate: string;
    guardianName: string;
    guardianPhone: string;
    status: "active" | "passive";
    createdAt: string;
  }>;
};

export type Announcement = {
  id: string;
  title: string;
  body: string;
  audience: string;
  publishedAt: string;
};

export type SuperAdminOverview = {
  institutions: number;
  activeUsers: number;
  systemHealth: string;
  monthlyRevenueTry: number;
  openSecuritySignals: number;
  usage: UsagePoint[];
  incidents: Incident[];
  modules: ModuleStatus[];
};

export type UsagePoint = {
  label: string;
  value: number;
};

export type Incident = {
  id: string;
  title: string;
  severity: string;
  status: string;
};

export type ModuleStatus = {
  name: string;
  status: string;
  description: string;
};

export type SystemStatus = {
  maintenance: MaintenanceMode;
};

export type SystemMetrics = {
  updatedAt: string;
  health: string;
  resources: ResourceMetric[];
  services: ServiceMetric[];
};

export type ResourceMetric = {
  key: string;
  label: string;
  value: number;
  unit: string;
  status: string;
  description: string;
};

export type ServiceMetric = {
  key: string;
  name: string;
  status: string;
  latencyMs?: number;
  description: string;
};

export type PlatformSettings = {
  maintenance: MaintenanceMode;
  credentials: IntegrationCredential[];
};

export type MaintenanceMode = {
  enabled: boolean;
  message: string;
  updatedAt?: string;
};

export type IntegrationCredential = {
  key: string;
  label: string;
  provider: string;
  description: string;
  configured: boolean;
  maskedValue: string;
  updatedAt?: string;
};

export type SupportTicket = {
  id: string;
  tenantId: string;
  tenant: string;
  reporterId?: string;
  reporterName: string;
  reporterEmail: string;
  type: string;
  subject: string;
  message: string;
  status: string;
  priority: string;
  internalNote: string;
  createdAt: string;
  updatedAt: string;
};

export type Institution = {
  id: string;
  name: string;
  plan: string;
  timezone: string;
  students: number;
  users: number;
  status: string;
  lastActivityAt: string;
};

export type InstitutionDetail = Institution & {
  createdAt: string;
  updatedAt: string;
};

export type UserAccount = {
  id: string;
  tenantId: string;
  tenant: string;
  fullName: string;
  email: string;
  role: string;
  status: string;
  mustChangePassword: boolean;
  createdAt: string;
};

export type CreatedUserCredential = {
  user: UserAccount;
  temporaryPassword: string;
};

export type AuditEntry = {
  id: string;
  tenant: string;
  actor: string;
  action: string;
  resourceType: string;
  sensitivity: string;
  createdAt: string;
};

type Envelope<T> = {
  data: T;
  meta?: unknown;
};

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";
const AUTH_STORAGE_KEY = "ots.auth.session";

export function readAuthSession(): AuthSession | null {
  try {
    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const session = JSON.parse(raw) as Partial<AuthSession>;
    if (!session.accessToken || !session.principal?.role) {
      clearAuthSession();
      return null;
    }
    if (session.expiresAt && new Date(session.expiresAt).getTime() <= Date.now()) {
      const refreshValid =
        session.refreshToken &&
        (!session.refreshExpiresAt || new Date(session.refreshExpiresAt).getTime() > Date.now());
      if (!refreshValid) {
        clearAuthSession();
        return null;
      }
    }
    session.principal.mustChangePassword = Boolean(session.principal.mustChangePassword);
    return session as AuthSession;
  } catch {
    return null;
  }
}

export function storeAuthSession(session: AuthSession) {
  window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
}

export function clearAuthSession() {
  window.localStorage.removeItem(AUTH_STORAGE_KEY);
}

function authHeaders(): Record<string, string> {
  const session = readAuthSession();
  if (!session?.accessToken) {
    return {};
  }
  return {
    Authorization: `Bearer ${session.accessToken}`
  };
}

let refreshInFlight: Promise<AuthSession | null> | null = null;

async function refreshSession(): Promise<AuthSession | null> {
  const session = readAuthSession();
  if (!session?.refreshToken) {
    clearAuthSession();
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
          clearAuthSession();
          return null;
        }
        const envelope = (await response.json()) as Envelope<AuthSession>;
        const next = envelope.data;
        if (!next?.accessToken || !next.principal?.role) {
          clearAuthSession();
          return null;
        }
        next.principal.mustChangePassword = Boolean(next.principal.mustChangePassword);
        storeAuthSession(next);
        return next;
      } catch {
        clearAuthSession();
        return null;
      } finally {
        refreshInFlight = null;
      }
    })();
  }
  return refreshInFlight;
}

async function request<T>(path: string, init?: RequestInit, retried = false): Promise<T> {
  const headers = new Headers(init?.headers);
  if (!headers.has("Content-Type") && init?.body) {
    headers.set("Content-Type", "application/json");
  }
  for (const [key, value] of Object.entries(authHeaders())) {
    headers.set(key, value);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers
  });

  if (response.status === 401 && !retried && path !== "/api/v1/auth/refresh") {
    const refreshed = await refreshSession();
    if (refreshed) {
      return request<T>(path, init, true);
    }
  }

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    const message = payload?.error?.message ?? `API request failed: ${response.status}`;
    throw new Error(message);
  }

  const envelope = (await response.json()) as Envelope<T>;
  return (envelope.data ?? null) as T;
}

function asArray<T>(value: T[] | null | undefined): T[] {
  return value ?? [];
}

export const api = {
  login: (payload: { email: string; password: string }) =>
    request<AuthSession>("/api/v1/auth/login", {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  changePassword: (payload: { newPassword: string }) =>
    request<AuthSession>("/api/v1/auth/password/first-login", {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  refresh: (payload: { refreshToken: string }) =>
    request<AuthSession>("/api/v1/auth/refresh", {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  logout: () =>
    request<{ ok: boolean }>("/api/v1/auth/logout", {
      method: "POST",
      body: "{}"
    }),
  me: () => request<Principal>("/api/v1/me"),
  systemStatus: () => request<SystemStatus>("/api/v1/system/status"),
  tenant: () => request<Tenant>("/api/v1/tenants/current"),
  superAdminOverview: () => request<SuperAdminOverview>("/api/v1/super-admin/overview"),
  superAdminSystemMetrics: () => request<SystemMetrics>("/api/v1/super-admin/system/metrics"),
  superAdminInstitutions: () => request<Institution[]>("/api/v1/super-admin/institutions"),
  createSuperAdminInstitution: (payload: { name: string; plan: string; timezone: string }) =>
    request<InstitutionDetail>("/api/v1/super-admin/institutions", {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  superAdminInstitution: (institutionId: string) =>
    request<InstitutionDetail>(`/api/v1/super-admin/institutions/${institutionId}`),
  superAdminInstitutionUsers: (institutionId: string) =>
    request<UserAccount[]>(`/api/v1/super-admin/institutions/${institutionId}/users`),
  createSuperAdminInstitutionUser: (
    institutionId: string,
    payload: { email: string; fullName: string; role: string }
  ) =>
    request<CreatedUserCredential>(`/api/v1/super-admin/institutions/${institutionId}/users`, {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  superAdminUsers: () => request<UserAccount[]>("/api/v1/super-admin/users"),
  createSuperAdminUser: (payload: { tenantId: string; email: string; fullName: string; role: string }) =>
    request<CreatedUserCredential>("/api/v1/super-admin/users", {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  updateSuperAdminUser: (
    userId: string,
    payload: { tenantId: string; email: string; fullName: string; role: string; status: string }
  ) =>
    request<UserAccount>(`/api/v1/super-admin/users/${userId}`, {
      method: "PATCH",
      body: JSON.stringify(payload)
    }),
  deleteSuperAdminUser: (userId: string, tenantId: string) =>
    request<UserAccount>(`/api/v1/super-admin/users/${userId}?tenantId=${encodeURIComponent(tenantId)}`, {
      method: "DELETE"
    }),
  superAdminAuditLogs: () => request<AuditEntry[]>("/api/v1/super-admin/audit-logs"),
  superAdminSettings: () => request<PlatformSettings>("/api/v1/super-admin/settings"),
  superAdminSupportTickets: () => request<SupportTicket[]>("/api/v1/super-admin/support/tickets"),
  updateSuperAdminSupportTicket: (
    ticketId: string,
    payload: { status: string; priority: string; internalNote: string }
  ) =>
    request<SupportTicket>(`/api/v1/super-admin/support/tickets/${ticketId}`, {
      method: "PATCH",
      body: JSON.stringify(payload)
    }),
  createSupportTicket: (payload: { type: string; subject: string; message: string }) =>
    request<SupportTicket>("/api/v1/support/tickets", {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  principalTeachers: () => request<UserAccount[] | null>("/api/v1/principal/teachers").then(asArray),
  principalRoster: () =>
    request<PrincipalSchoolRoster>("/api/v1/principal/school/roster").then((roster) => ({
      classes: roster?.classes ?? [],
      sections: roster?.sections ?? [],
      students: roster?.students ?? []
    })),
  updateSuperAdminSettings: (payload: {
    maintenance: { enabled: boolean; message: string };
    credentials: Array<{ key: string; value: string; clear?: boolean }>;
  }) =>
    request<PlatformSettings>("/api/v1/super-admin/settings", {
      method: "PATCH",
      body: JSON.stringify(payload)
    }),
  dashboard: () => request<PrincipalSummary>("/api/v1/dashboard/principal/summary"),
  schedule: () => request<Schedule>("/api/v1/schedules/current"),
  teacherCalendar: () => request<Lesson[] | null>("/api/v1/teachers/me/calendar").then(asArray),
  currentLesson: () => request<CurrentLesson>("/api/v1/attendance/current-lesson"),
  announcements: () => request<Announcement[] | null>("/api/v1/announcements").then(asArray),
  observations: () => request<Observation[] | null>("/api/v1/observations").then(asArray),
  createAttendanceSession: (lessonId: string) =>
    request<AttendanceSession>("/api/v1/attendance/sessions", {
      method: "POST",
      body: JSON.stringify({ lessonId })
    }),
  getAttendanceSession: (sessionId: string) => request<AttendanceSession>(`/api/v1/attendance/sessions/${sessionId}`),
  attendanceToday: (date?: string) =>
    request<AttendanceDayReport>(`/api/v1/dashboard/attendance/today${date ? `?date=${encodeURIComponent(date)}` : ""}`),
  updateAttendanceRecords: (sessionId: string, records: AttendanceRecord[]) =>
    request<AttendanceSession>(`/api/v1/attendance/sessions/${sessionId}/records`, {
      method: "PATCH",
      body: JSON.stringify({
        records: records.map((record) => ({
          studentId: record.studentId,
          status: record.status,
          note: record.note ?? ""
        }))
      })
    }),
  finalizeAttendanceSession: (sessionId: string) =>
    request<AttendanceSession>(`/api/v1/attendance/sessions/${sessionId}/finalize`, {
      method: "POST",
      body: "{}"
    }),
  studentAttendanceSummary: (studentId: string) =>
    request<StudentAttendanceSummary>(`/api/v1/students/${studentId}/attendance-summary`),
  createObservation: (payload: { studentId: string; category: string; note: string }) =>
    request<Observation>("/api/v1/observations", {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  generateSchedule: () =>
    request<ScheduleGenerationResult>("/api/v1/schedules/generate", {
      method: "POST",
      body: "{}"
    }),
  getSchedule: (scheduleId: string) => request<Schedule>(`/api/v1/schedules/${scheduleId}`),
  updateScheduleLesson: (
    scheduleId: string,
    lessonId: string,
    payload: {
      teacherId?: string;
      subjectId?: string;
      dayOfWeek?: number;
      startTime?: string;
      endTime?: string;
      room?: string;
    }
  ) =>
    request<Lesson>(`/api/v1/schedules/${scheduleId}/lessons/${lessonId}`, {
      method: "PATCH",
      body: JSON.stringify(payload)
    }),
  validateSchedule: (scheduleId: string) =>
    request<ScheduleValidationResult>(`/api/v1/schedules/${scheduleId}/validate`, {
      method: "POST",
      body: "{}"
    }),
  publishSchedule: (scheduleId: string) =>
    request<Schedule>(`/api/v1/schedules/${scheduleId}/publish`, {
      method: "POST",
      body: "{}"
    }),
  listSchedulingRequirements: () =>
    request<SchedulingRequirement[] | null>("/api/v1/scheduling/requirements").then(asArray),
  saveSchedulingRequirements: (items: Array<{ classId: string; subjectId: string; weeklyHours: number }>) =>
    request<SchedulingRequirement[]>("/api/v1/scheduling/requirements", {
      method: "POST",
      body: JSON.stringify({ items })
    }),
  listTeacherAvailabilities: () =>
    request<TeacherAvailability[] | null>("/api/v1/scheduling/teacher-availabilities").then(asArray),
  saveTeacherAvailabilities: (
    items: Array<{
      teacherId: string;
      dayOfWeek: number;
      startTime: string;
      endTime: string;
      availabilityType: string;
    }>
  ) =>
    request<TeacherAvailability[]>("/api/v1/scheduling/teacher-availabilities", {
      method: "POST",
      body: JSON.stringify({ items })
    }),
  listClasses: () => request<SchoolClassRecord[] | null>("/api/v1/classes").then(asArray),
  createClass: (payload: { name: string; level?: string; branch?: string }) =>
    request<SchoolClassRecord>("/api/v1/classes", {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  updateClass: (classId: string, payload: { name?: string; level?: string; branch?: string }) =>
    request<SchoolClassRecord>(`/api/v1/classes/${classId}`, {
      method: "PATCH",
      body: JSON.stringify(payload)
    }),
  listStudents: () => request<SchoolStudentRecord[] | null>("/api/v1/students").then(asArray),
  createStudent: (payload: {
    firstName: string;
    lastName: string;
    schoolNumber: string;
    classId?: string;
    birthDate?: string;
    gender?: string;
    status?: string;
    guardianName?: string;
    guardianPhone?: string;
  }) =>
    request<SchoolStudentRecord>("/api/v1/students", {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  patchStudent: (
    studentId: string,
    payload: {
      firstName?: string;
      lastName?: string;
      schoolNumber?: string;
      classId?: string;
      birthDate?: string;
      gender?: string;
      status?: string;
      guardianName?: string;
      guardianPhone?: string;
    }
  ) =>
    request<SchoolStudentRecord>(`/api/v1/students/${studentId}`, {
      method: "PATCH",
      body: JSON.stringify(payload)
    }),
  listSubjects: () => request<SchoolSubjectRecord[] | null>("/api/v1/subjects").then(asArray),
  createSubject: (payload: { name: string; code: string }) =>
    request<SchoolSubjectRecord>("/api/v1/subjects", {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  listTeachers: () => request<SchoolTeacherRecord[] | null>("/api/v1/teachers").then(asArray),
  createTeacher: (payload: { userId: string; title: string }) =>
    request<SchoolTeacherRecord>("/api/v1/teachers", {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  updateTeacher: (teacherId: string, payload: { title?: string }) =>
    request<SchoolTeacherRecord>(`/api/v1/teachers/${teacherId}`, {
      method: "PATCH",
      body: JSON.stringify(payload)
    }),
  assignClassStudent: (classId: string, payload: { studentId: string; startsOn?: string }) =>
    request<{ tenantId: string; classId: string; studentId: string; startsOn: string }>(
      `/api/v1/classes/${classId}/students`,
      {
        method: "POST",
        body: JSON.stringify(payload)
      }
    ),
  createAnnouncement: (payload: { title: string; body: string; audience: string }) =>
    request<Announcement>("/api/v1/announcements", {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  updateAnnouncement: (
    announcementId: string,
    payload: { title?: string; body?: string; audience?: string }
  ) =>
    request<Announcement>(`/api/v1/announcements/${announcementId}`, {
      method: "PATCH",
      body: JSON.stringify(payload)
    }),
  classSummary: (classId: string, date?: string) =>
    request<ClassSummary>(
      `/api/v1/dashboard/classes/${classId}/summary${date ? `?date=${encodeURIComponent(date)}` : ""}`
    ),
  guardianStudents: () => request<GuardianStudent[] | null>("/api/v1/guardian/me/students").then(asArray),
  guardianStudentSchedule: (studentId: string) =>
    request<GuardianStudentSchedule>(`/api/v1/guardian/students/${studentId}/schedule`),
  guardianStudentAttendance: (studentId: string) =>
    request<GuardianStudentAttendance>(`/api/v1/guardian/students/${studentId}/attendance`),
  guardianAnnouncements: () => request<Announcement[] | null>("/api/v1/guardian/announcements").then(asArray),
  guardianNotifications: () => request<GuardianNotification[] | null>("/api/v1/guardian/notifications").then(asArray),
  guardianNotificationMarkRead: (notificationId: string) =>
    request<GuardianNotification>(`/api/v1/guardian/notifications/${notificationId}/read`, {
      method: "PATCH",
      body: "{}"
    }),
  notifications: () => request<UserNotification[] | null>("/api/v1/notifications").then(asArray),
  notificationMarkRead: (notificationId: string) =>
    request<UserNotification>(`/api/v1/notifications/${notificationId}/read`, {
      method: "PATCH",
      body: "{}"
    }),
  passwordForgot: (payload: { email: string }) =>
    request<{ message: string; resetToken?: string }>("/api/v1/auth/password/forgot", {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  passwordReset: (payload: { token: string; newPassword: string }) =>
    request<{ message: string }>("/api/v1/auth/password/reset", {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  provisionTeacher: (payload: { email: string; firstName: string; lastName: string; title: string }) =>
    request<{ teacher: SchoolTeacherRecord; email: string; temporaryPassword: string }>("/api/v1/principal/teachers", {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  resetTeacherPassword: (teacherId: string) =>
    request<{ temporaryPassword: string }>(`/api/v1/teachers/${teacherId}/reset-password`, {
      method: "POST",
      body: "{}"
    }),
  importStudents: (payload: {
    classId: string;
    students: Array<{ firstName: string; lastName: string; schoolNumber: string }>;
  }) =>
    request<{ created: number; failed: number; errors?: string[] }>("/api/v1/students/import", {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  observationsFiltered: (params?: { category?: string; className?: string; date?: string }) => {
    const query = new URLSearchParams();
    if (params?.category) {
      query.set("category", params.category);
    }
    if (params?.className) {
      query.set("className", params.className);
    }
    if (params?.date) {
      query.set("date", params.date);
    }
    const suffix = query.toString() ? `?${query.toString()}` : "";
    return request<Observation[] | null>(`/api/v1/observations${suffix}`).then(asArray);
  }
};
