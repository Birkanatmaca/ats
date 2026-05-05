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
  principal: Principal;
  expiresAt: string;
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
  if (!session) {
    return {};
  }
  return {
    Authorization: `Bearer ${session.accessToken}`,
    "X-Tenant-Id": session.principal.tenantId,
    "X-User-Id": session.principal.userId,
    "X-User-Name": session.principal.name,
    "X-User-Email": session.principal.email ?? "",
    "X-Role": session.principal.role,
    "X-Must-Change-Password": String(session.principal.mustChangePassword)
  };
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  headers.set("Content-Type", "application/json");
  for (const [key, value] of Object.entries(authHeaders())) {
    headers.set(key, value);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    const message = payload?.error?.message ?? `API request failed: ${response.status}`;
    throw new Error(message);
  }

  const envelope = (await response.json()) as Envelope<T>;
  return envelope.data;
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
  currentLesson: () => request<CurrentLesson>("/api/v1/attendance/current-lesson"),
  announcements: () => request<Announcement[]>("/api/v1/announcements"),
  observations: () => request<Observation[]>("/api/v1/observations"),
  createAttendanceSession: (lessonId: string) =>
    request<AttendanceSession>("/api/v1/attendance/sessions", {
      method: "POST",
      body: JSON.stringify({ lessonId })
    }),
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
  createObservation: (payload: { studentId: string; category: string; note: string }) =>
    request<Observation>("/api/v1/observations", {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  generateSchedule: () =>
    request<{ schedule: Schedule; hardConflicts: number; softWarnings: string[]; recommendation: string }>(
      "/api/v1/schedules/generate",
      { method: "POST", body: "{}" }
    )
};
