import type {
  AiCapabilitiesResult,
  AiConversation,
  AcademicAssessment,
  AcademicAssessmentType,
  AcademicImportResult,
  AcademicResult,
  AcademicResultInput,
  AiMessage,
  AiSendMessageResult,
  Announcement,
  AnnouncementTemplate,
  AttendanceDayReport,
  AttendanceRecord,
  AttendanceSession,
  AuthSession,
  BillingAccount,
  BillingDashboard,
  ClassAttendanceSheet,
  ClassAcademicSummary,
  CreatePaymentInput,
  CreatePaymentPlanInput,
  CurrentLesson,
  GuidanceNote,
  GuidanceCase,
  GuidanceCaseCloseResult,
  GuidanceCaseEvent,
  GuidanceCaseTimelineItem,
  GuidanceCaseInboxStats,
  GuidanceStudentCaseSummary,
  GuidanceRiskTracking,
  GuidanceSupportPlan,
  GuidanceStudent,
  GuardianAttendanceRecord,
  GuardianBillingSummary,
  GuardianNotification,
  GuardianStudent,
  Lesson,
  NotificationPreferences,
  Observation,
  Principal,
  PrincipalRosterStudent,
  PrincipalSchoolRoster,
  PrincipalSummary,
  Payment,
  PaymentInstallment,
  PaymentPlan,
  Schedule,
  ScheduleGenerationResult,
  ScheduleValidationResult,
  ScheduleConflictsResult,
  ScheduleChangeLog,
  SchedulingRequirement,
  GuardianServiceSummary,
  DriverServiceSummary,
  RequirementInput,
  Club,
  ClubInput,
  ClubMembership,
  ClubMembershipInput,
  GuardianLifeSummary,
  MealMenu,
  MealMenuInput,
  ServiceAssignment,
  ServiceAssignmentInput,
  ServiceRoute,
  ServiceRouteInput,
  ServiceStaff,
  ServiceTrip,
  ServiceTripEvent,
  ServiceTripLocation,
  ServiceVehicle,
  StudyAttendance,
  StudyAttendanceInput,
  StudySession,
  StudySessionInput,
  TeacherAvailability,
  UpdateScheduleLessonInput,
  SchoolStudentRecord,
  StudentAttendanceSummary,
  StudentAcademicSummary,
  StudentFormPayload,
  StudentImportCommitPreview,
  StudentImportCommitResult,
  StudentImportJob,
  StudentImportRow,
  SupportTicket,
  Tenant,
  UpdatePaymentInput,
  UpdatePaymentPlanInput,
  UserAccount,
  UserNotification,
  UserProfile
} from "@/shared/api/types";
import { clearAuthSession, readAuthSession, storeAuthSession } from "@/shared/auth/session";

type Envelope<T> = { data: T; meta?: unknown };

function normalizeRosterStudent(student: PrincipalRosterStudent): PrincipalRosterStudent {
  return {
    ...student,
    classId: student.classId ?? "",
    sectionId: student.sectionId ?? "",
    schoolNumber: student.schoolNumber ?? "",
    firstName: student.firstName ?? "",
    lastName: student.lastName ?? "",
    gender: student.gender ?? "",
    birthDate: student.birthDate ?? "",
    guardianName: student.guardianName ?? "",
    guardianPhone: student.guardianPhone ?? "",
    status: student.status === "passive" ? "passive" : "active"
  };
}

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

export class ApiError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
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
    const code = payload?.error?.code as string | undefined;
    throw new ApiError(message, response.status, code);
  }

  if (response.status === 204) {
    return undefined as T;
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
  registerDeviceToken: (payload: { token: string; platform: string }) =>
    request<{ id: string; token: string; platform: string; preferences: NotificationPreferences }>(
      "/api/v1/me/device-tokens",
      { method: "POST", body: JSON.stringify(payload) }
    ),
  unregisterDeviceToken: (token: string) =>
    request<void>(`/api/v1/me/device-tokens?token=${encodeURIComponent(token)}`, { method: "DELETE" }),
  notificationPreferences: () => request<NotificationPreferences>("/api/v1/me/notification-preferences"),
  updateNotificationPreferences: (payload: Partial<NotificationPreferences>) =>
    request<NotificationPreferences>("/api/v1/me/notification-preferences", {
      method: "PATCH",
      body: JSON.stringify(payload)
    }),
  pushTest: (payload?: { title?: string; body?: string }) =>
    request<{ message: string }>("/api/v1/push/test", {
      method: "POST",
      body: JSON.stringify(payload ?? {})
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
    request<AttendanceSession>(`/api/v1/attendance/lessons/${lessonId}/session`),
  getAttendanceSession: (sessionId: string) =>
    request<AttendanceSession>(`/api/v1/attendance/sessions/${sessionId}`),
  getAttendanceSessionVersion: (sessionId: string) =>
    request<{ sessionId: string; version: string; finalizedAt?: string | null }>(
      `/api/v1/attendance/sessions/${sessionId}/version`
    ),
  updateAttendanceRecords: (
    sessionId: string,
    records: AttendanceRecord[],
    options?: { idempotencyKey?: string }
  ) =>
    request<AttendanceSession>(`/api/v1/attendance/sessions/${sessionId}/records`, {
      method: "PATCH",
      headers: options?.idempotencyKey ? { "Idempotency-Key": options.idempotencyKey } : undefined,
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
  guardianBilling: (studentId: string) =>
    request<GuardianBillingSummary>(`/api/v1/guardian/students/${studentId}/billing`),
  guardianService: (studentId: string) =>
    request<GuardianServiceSummary>(`/api/v1/guardian/students/${studentId}/service`),
  guardianLife: (studentId: string) =>
    request<GuardianLifeSummary>(`/api/v1/guardian/students/${studentId}/life`),

  guidanceStudents: () => request<GuidanceStudent[] | null>("/api/v1/guidance/students").then(asArray),
  guidanceNotes: (studentId?: string) => {
    const suffix = studentId ? `?studentId=${encodeURIComponent(studentId)}` : "";
    return request<GuidanceNote[] | null>(`/api/v1/guidance/notes${suffix}`).then(asArray);
  },
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
  updateGuidanceNote: (noteId: string, payload: { noteType?: string; title?: string; body?: string }) =>
    request<GuidanceNote>(`/api/v1/guidance/notes/${noteId}`, {
      method: "PATCH",
      body: JSON.stringify(payload)
    }),
  deleteGuidanceNote: (noteId: string) => request<void>(`/api/v1/guidance/notes/${noteId}`, { method: "DELETE" }),
  guidanceSupportPlans: (studentId?: string) => {
    const suffix = studentId ? `?studentId=${encodeURIComponent(studentId)}` : "";
    return request<GuidanceSupportPlan[] | null>(`/api/v1/guidance/support-plans${suffix}`).then(asArray);
  },
  createGuidanceSupportPlan: (payload: {
    studentId: string;
    title: string;
    description?: string;
    status?: string;
    dueDate?: string;
  }) =>
    request<GuidanceSupportPlan>("/api/v1/guidance/support-plans", {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  updateGuidanceSupportPlan: (
    planId: string,
    payload: { title?: string; description?: string; status?: string; dueDate?: string }
  ) =>
    request<GuidanceSupportPlan>(`/api/v1/guidance/support-plans/${planId}`, {
      method: "PATCH",
      body: JSON.stringify(payload)
    }),
  deleteGuidanceSupportPlan: (planId: string) =>
    request<void>(`/api/v1/guidance/support-plans/${planId}`, { method: "DELETE" }),
  guidanceRiskTrackings: (studentId?: string) => {
    const suffix = studentId ? `?studentId=${encodeURIComponent(studentId)}` : "";
    return request<GuidanceRiskTracking[] | null>(`/api/v1/guidance/risk-trackings${suffix}`).then(asArray);
  },
  createGuidanceRiskTracking: (payload: { studentId: string; reason?: string }) =>
    request<GuidanceRiskTracking>("/api/v1/guidance/risk-trackings", {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  deleteGuidanceRiskTracking: (trackingId: string) =>
    request<void>(`/api/v1/guidance/risk-trackings/${trackingId}`, { method: "DELETE" }),

  guidanceCases: (params?: { studentId?: string; status?: string }) => {
    const query = new URLSearchParams();
    if (params?.studentId) query.set("studentId", params.studentId);
    if (params?.status) query.set("status", params.status);
    const suffix = query.toString() ? `?${query.toString()}` : "";
    return request<GuidanceCase[] | null>(`/api/v1/guidance/cases${suffix}`).then(asArray);
  },
  guidanceCaseStats: () => request<GuidanceCaseInboxStats>("/api/v1/guidance/cases/stats"),
  guidanceCase: (caseId: string) => request<GuidanceCase>(`/api/v1/guidance/cases/${caseId}`),
  createGuidanceCase: (payload: {
    studentId: string;
    title: string;
    summary?: string;
    priority?: GuidanceCase["priority"];
    sensitivity?: string;
  }) =>
    request<GuidanceCase>("/api/v1/guidance/cases", { method: "POST", body: JSON.stringify(payload) }),
  updateGuidanceCase: (
    caseId: string,
    payload: Partial<{
      title: string;
      summary: string;
      status: GuidanceCase["status"];
      priority: GuidanceCase["priority"];
      sensitivity: string;
    }>
  ) =>
    request<GuidanceCase>(`/api/v1/guidance/cases/${caseId}`, {
      method: "PATCH",
      body: JSON.stringify(payload)
    }),
  closeGuidanceCase: (caseId: string) =>
    request<GuidanceCaseCloseResult>(`/api/v1/guidance/cases/${caseId}/close`, { method: "POST", body: "{}" }),
  reopenGuidanceCase: (caseId: string) =>
    request<GuidanceCase>(`/api/v1/guidance/cases/${caseId}/reopen`, { method: "POST", body: "{}" }),
  guidanceCaseEvents: (caseId: string) =>
    request<GuidanceCaseEvent[] | null>(`/api/v1/guidance/cases/${caseId}/events`).then(asArray),
  guidanceCaseTimeline: (caseId: string) =>
    request<GuidanceCaseTimelineItem[] | null>(`/api/v1/guidance/cases/${caseId}/timeline`).then(asArray),
  createGuidanceCaseEvent: (
    caseId: string,
    payload: {
      eventType?: GuidanceCaseEvent["eventType"];
      title: string;
      body: string;
      visibility?: GuidanceCaseEvent["visibility"];
    }
  ) =>
    request<GuidanceCaseEvent>(`/api/v1/guidance/cases/${caseId}/events`, {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  deleteGuidanceCaseEvent: (caseId: string, eventId: string) =>
    request<void>(`/api/v1/guidance/cases/${caseId}/events/${eventId}`, { method: "DELETE" }),
  guidanceStudentCaseSummary: (studentId: string) =>
    request<GuidanceStudentCaseSummary>(`/api/v1/guidance/students/${studentId}/case-summary`),

  dashboard: () => request<PrincipalSummary>("/api/v1/dashboard/principal/summary"),
  listStudents: () => request<PrincipalRosterStudent[] | null>("/api/v1/students").then(asArray),
  principalRoster: async () => {
    const [rosterResult, studentsResult] = await Promise.allSettled([
      request<PrincipalSchoolRoster>("/api/v1/principal/school/roster"),
      request<PrincipalRosterStudent[] | null>("/api/v1/students").then(asArray)
    ]);

    const roster = rosterResult.status === "fulfilled" ? rosterResult.value : null;
    const listedStudents = studentsResult.status === "fulfilled" ? studentsResult.value : [];
    const rosterStudents = roster?.students ?? [];

    if (!roster && studentsResult.status === "rejected") {
      throw studentsResult.reason;
    }
    if (rosterResult.status === "rejected" && studentsResult.status === "rejected") {
      throw rosterResult.reason;
    }

    const students = listedStudents.length > rosterStudents.length ? listedStudents : rosterStudents.length > 0 ? rosterStudents : listedStudents;

    return {
      classes: roster?.classes ?? [],
      sections: roster?.sections ?? [],
      students: students.map(normalizeRosterStudent)
    };
  },
  createStudent: (payload: StudentFormPayload) =>
    request<PrincipalRosterStudent>("/api/v1/students", {
      method: "POST",
      body: JSON.stringify({
        firstName: payload.firstName,
        lastName: payload.lastName,
        schoolNumber: payload.schoolNumber,
        classId: payload.classId,
        birthDate: payload.birthDate,
        gender: payload.gender,
        status: payload.status,
        guardianName: payload.guardianName,
        guardianPhone: payload.guardianPhone
      })
    }),
  patchStudent: (studentId: string, payload: Partial<StudentFormPayload>) =>
    request<PrincipalRosterStudent>(`/api/v1/students/${studentId}`, {
      method: "PATCH",
      body: JSON.stringify(payload)
    }),
  studentAttendanceSummary: (studentId: string) =>
    request<StudentAttendanceSummary>(`/api/v1/students/${studentId}/attendance-summary`),
  billingStudentAccount: (studentId: string) =>
    request<BillingAccount>(`/api/v1/billing/students/${studentId}/account`),
  createBillingPlan: (studentId: string, payload: CreatePaymentPlanInput) =>
    request<BillingAccount>(`/api/v1/billing/students/${studentId}/plans`, {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  updateBillingPlan: (planId: string, payload: UpdatePaymentPlanInput) =>
    request<PaymentPlan>(`/api/v1/billing/plans/${planId}`, {
      method: "PATCH",
      body: JSON.stringify(payload)
    }),
  billingInstallments: (params?: { studentId?: string; classId?: string; status?: string }) => {
    const query = new URLSearchParams();
    if (params?.studentId) query.set("studentId", params.studentId);
    if (params?.classId) query.set("classId", params.classId);
    if (params?.status) query.set("status", params.status);
    const suffix = query.toString() ? `?${query.toString()}` : "";
    return request<PaymentInstallment[] | null>(`/api/v1/billing/installments${suffix}`).then(asArray);
  },
  createBillingPayment: (installmentId: string, payload: CreatePaymentInput) =>
    request<PaymentInstallment>(`/api/v1/billing/installments/${installmentId}/payments`, {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  updateBillingPayment: (paymentId: string, payload: UpdatePaymentInput) =>
    request<Payment>(`/api/v1/billing/payments/${paymentId}`, {
      method: "PATCH",
      body: JSON.stringify(payload)
    }),
  voidBillingPayment: (paymentId: string) =>
    request<Payment>(`/api/v1/billing/payments/${paymentId}`, { method: "DELETE" }),
  billingDashboard: () => request<BillingDashboard>("/api/v1/billing/dashboard"),
  billingOverdueReport: () =>
    request<PaymentInstallment[] | null>("/api/v1/billing/reports/overdue").then(asArray),
  serviceRoutes: () => request<ServiceRoute[] | null>("/api/v1/services/routes").then(asArray),
  serviceRoute: (routeId: string) => request<ServiceRoute>(`/api/v1/services/routes/${routeId}`),
  createServiceRoute: (payload: ServiceRouteInput) =>
    request<ServiceRoute>("/api/v1/services/routes", { method: "POST", body: JSON.stringify(payload) }),
  updateServiceRoute: (routeId: string, payload: Partial<ServiceRouteInput>) =>
    request<ServiceRoute>(`/api/v1/services/routes/${routeId}`, { method: "PATCH", body: JSON.stringify(payload) }),
  deleteServiceRoute: (routeId: string) =>
    request<void>(`/api/v1/services/routes/${routeId}`, { method: "DELETE" }),
  serviceVehicles: () => request<ServiceVehicle[] | null>("/api/v1/services/vehicles").then(asArray),
  createServiceVehicle: (payload: { plate: string; capacity: number; brand?: string; model?: string }) =>
    request<ServiceVehicle>("/api/v1/services/vehicles", { method: "POST", body: JSON.stringify(payload) }),
  serviceStaff: () => request<ServiceStaff[] | null>("/api/v1/services/staff").then(asArray),
  createServiceStaff: (payload: { fullName: string; phone?: string; role: "driver" | "attendant" }) =>
    request<ServiceStaff>("/api/v1/services/staff", { method: "POST", body: JSON.stringify(payload) }),
  activeServiceTrips: () => request<ServiceTrip[] | null>("/api/v1/services/trips/active").then(asArray),
  serviceTripLocations: (tripId: string, limit = 20) =>
    request<ServiceTripLocation[] | null>(
      `/api/v1/services/trips/${tripId}/locations?limit=${encodeURIComponent(String(limit))}`
    ).then(asArray),
  serviceTripEvents: (tripId: string, limit = 20) =>
    request<ServiceTripEvent[] | null>(
      `/api/v1/services/trips/${tripId}/events?limit=${encodeURIComponent(String(limit))}`
    ).then(asArray),
  driverSession: () => request<DriverServiceSummary>("/api/v1/driver/me"),
  startDriverSharing: () => request<ServiceStaff>("/api/v1/driver/sharing/start", { method: "POST", body: "{}" }),
  stopDriverSharing: () => request<ServiceStaff>("/api/v1/driver/sharing/stop", { method: "POST", body: "{}" }),
  recordDriverTripLocation: (
    tripId: string,
    payload: {
      latitude: number;
      longitude: number;
      accuracyMeters?: number;
      speedKph?: number;
      headingDegrees?: number;
      capturedAt?: string;
    }
  ) =>
    request<ServiceTripLocation>(`/api/v1/driver/trips/${tripId}/locations`, {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  guardianStudentServiceTrip: (studentId: string) =>
    request<ServiceTrip>(`/api/v1/guardian/students/${studentId}/service/trip`),
  guardianStudentServiceTripLocations: (studentId: string, limit = 20) =>
    request<ServiceTripLocation[] | null>(
      `/api/v1/guardian/students/${studentId}/service/trip/locations?limit=${encodeURIComponent(String(limit))}`
    ).then(asArray),
  assignServiceStudent: (payload: ServiceAssignmentInput) =>
    request<ServiceAssignment>("/api/v1/services/assignments", { method: "POST", body: JSON.stringify(payload) }),
  lifeMeals: (params?: { fromDate?: string; toDate?: string }) => {
    const query = new URLSearchParams();
    if (params?.fromDate) query.set("fromDate", params.fromDate);
    if (params?.toDate) query.set("toDate", params.toDate);
    const suffix = query.toString() ? `?${query.toString()}` : "";
    return request<MealMenu[] | null>(`/api/v1/life/meals${suffix}`).then(asArray);
  },
  createLifeMeal: (payload: MealMenuInput) =>
    request<MealMenu>("/api/v1/life/meals", { method: "POST", body: JSON.stringify(payload) }),
  updateLifeMeal: (mealId: string, payload: Partial<MealMenuInput>) =>
    request<MealMenu>(`/api/v1/life/meals/${mealId}`, { method: "PATCH", body: JSON.stringify(payload) }),
  deleteLifeMeal: (mealId: string) => request<void>(`/api/v1/life/meals/${mealId}`, { method: "DELETE" }),
  studySessions: () => request<StudySession[] | null>("/api/v1/life/study-sessions").then(asArray),
  createStudySession: (payload: StudySessionInput) =>
    request<StudySession>("/api/v1/life/study-sessions", { method: "POST", body: JSON.stringify(payload) }),
  updateStudySession: (sessionId: string, payload: Partial<StudySessionInput>) =>
    request<StudySession>(`/api/v1/life/study-sessions/${sessionId}`, {
      method: "PATCH",
      body: JSON.stringify(payload)
    }),
  recordStudyAttendance: (sessionId: string, records: StudyAttendanceInput[]) =>
    request<StudyAttendance[]>(`/api/v1/life/study-sessions/${sessionId}/attendance`, {
      method: "POST",
      body: JSON.stringify({ records })
    }),
  clubs: () => request<Club[] | null>("/api/v1/life/clubs").then(asArray),
  createClub: (payload: ClubInput) =>
    request<Club>("/api/v1/life/clubs", { method: "POST", body: JSON.stringify(payload) }),
  updateClub: (clubId: string, payload: Partial<ClubInput>) =>
    request<Club>(`/api/v1/life/clubs/${clubId}`, { method: "PATCH", body: JSON.stringify(payload) }),
  addClubMembership: (clubId: string, payload: ClubMembershipInput) =>
    request<ClubMembership>(`/api/v1/life/clubs/${clubId}/memberships`, {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  attendanceToday: (date?: string) =>
    request<AttendanceDayReport>(
      `/api/v1/dashboard/attendance/today${date ? `?date=${encodeURIComponent(date)}` : ""}`
    ),
  principalClassAttendance: (classId: string, date?: string) =>
    request<ClassAttendanceSheet>(
      `/api/v1/principal/attendance/classes/${encodeURIComponent(classId)}${date ? `?date=${encodeURIComponent(date)}` : ""}`
    ),
  savePrincipalClassAttendance: (
    classId: string,
    date: string,
    records: { studentId: string; status: AttendanceRecord["status"] }[]
  ) =>
    request<ClassAttendanceSheet>(
      `/api/v1/principal/attendance/classes/${encodeURIComponent(classId)}?date=${encodeURIComponent(date)}`,
      {
        method: "PUT",
        body: JSON.stringify({ records: records.map((r) => ({ studentId: r.studentId, status: r.status, note: "" })) })
      }
    ),

  announcements: (params?: { manage?: boolean }) => {
    const suffix = params?.manage ? "?manage=true" : "";
    return request<Announcement[] | null>(`/api/v1/announcements${suffix}`).then(asArray);
  },
  guardianAnnouncements: () => request<Announcement[] | null>("/api/v1/guardian/announcements").then(asArray),
  createAnnouncement: (payload: {
    title: string;
    body: string;
    audience?: string;
    audiences?: Announcement["audiences"];
    publish?: boolean;
    scheduledAt?: string | null;
  }) => request<Announcement>("/api/v1/announcements", { method: "POST", body: JSON.stringify(payload) }),
  publishAnnouncement: (announcementId: string) =>
    request<Announcement>(`/api/v1/announcements/${announcementId}/publish`, { method: "POST", body: "{}" }),
  markAnnouncementRead: (announcementId: string) =>
    request<void>(`/api/v1/announcements/${announcementId}/read`, { method: "PATCH", body: "{}" }),
  announcementTemplates: () => request<AnnouncementTemplate[] | null>("/api/v1/announcement-templates").then(asArray),
  notifications: () => request<UserNotification[] | null>("/api/v1/notifications").then(asArray),
  notificationMarkRead: (id: string) =>
    request<UserNotification>(`/api/v1/notifications/${id}/read`, { method: "PATCH", body: "{}" }),
  notificationDelete: (id: string) =>
    request<void>(`/api/v1/notifications/${id}`, { method: "DELETE" }),
  guardianNotifications: () => request<GuardianNotification[] | null>("/api/v1/guardian/notifications").then(asArray),
  guardianNotificationMarkRead: (id: string) =>
    request<GuardianNotification>(`/api/v1/guardian/notifications/${id}/read`, { method: "PATCH", body: "{}" }),
  guardianNotificationDelete: (id: string) =>
    request<void>(`/api/v1/guardian/notifications/${id}`, { method: "DELETE" }),
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
  listStudentImportJobs: () => request<StudentImportJob[] | null>("/api/v1/imports/students").then(asArray),
  getStudentImportJob: (jobId: string) => request<StudentImportJob>(`/api/v1/imports/students/${jobId}`),
  listStudentImportRows: (jobId: string) =>
    request<StudentImportRow[] | null>(`/api/v1/imports/students/${jobId}/rows`).then(asArray),
  previewStudentImportJob: (jobId: string) =>
    request<StudentImportCommitPreview>(`/api/v1/imports/students/${jobId}/preview`),
  commitStudentImportJob: (jobId: string) =>
    request<StudentImportCommitResult>(`/api/v1/imports/students/${jobId}/commit`, { method: "POST", body: "{}" }),
  rollbackStudentImportJob: (jobId: string) =>
    request<StudentImportJob>(`/api/v1/imports/students/${jobId}/rollback`, { method: "POST", body: "{}" }),
  schedule: () => request<Schedule>("/api/v1/schedules/current"),
  scheduleOptional: async () => {
    try {
      return await request<Schedule>("/api/v1/schedules/current");
    } catch (error) {
      if (error instanceof Error && error.message.includes("Aktif ders programı bulunamadı")) {
        return null;
      }
      throw error;
    }
  },
  getSchedule: (scheduleId: string) => request<Schedule>(`/api/v1/schedules/${scheduleId}`),
  generateSchedule: () =>
    request<ScheduleGenerationResult>("/api/v1/schedules/generate", { method: "POST", body: "{}" }),
  updateScheduleLesson: (scheduleId: string, lessonId: string, payload: UpdateScheduleLessonInput) =>
    request<Lesson>(`/api/v1/schedules/${scheduleId}/lessons/${lessonId}`, {
      method: "PATCH",
      body: JSON.stringify(payload)
    }),
  validateSchedule: (scheduleId: string) =>
    request<ScheduleValidationResult>(`/api/v1/schedules/${scheduleId}/validate`, { method: "POST", body: "{}" }),
  scheduleConflicts: (scheduleId: string) =>
    request<ScheduleConflictsResult>(`/api/v1/schedules/${scheduleId}/conflicts`),
  scheduleChangeLog: (scheduleId: string) =>
    request<ScheduleChangeLog[] | null>(`/api/v1/schedules/${scheduleId}/change-log`).then(asArray),
  cloneSchedule: (scheduleId: string) =>
    request<Schedule>(`/api/v1/schedules/${scheduleId}/clone`, { method: "POST", body: "{}" }),
  publishSchedule: (scheduleId: string) =>
    request<Schedule>(`/api/v1/schedules/${scheduleId}/publish`, { method: "POST", body: "{}" }),
  academicAssessments: () => request<AcademicAssessment[] | null>("/api/v1/academic/assessments").then(asArray),
  createAcademicAssessment: (payload: {
    name: string;
    subjectId: string;
    classId?: string;
    assessmentType: AcademicAssessmentType;
    maxScore: number;
    assessmentDate: string;
  }) =>
    request<AcademicAssessment>("/api/v1/academic/assessments", {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  academicResults: (assessmentId: string) =>
    request<AcademicResult[] | null>(`/api/v1/academic/assessments/${assessmentId}/results`).then(asArray),
  saveAcademicResults: (assessmentId: string, results: AcademicResultInput[]) =>
    request<AcademicResult[]>(`/api/v1/academic/assessments/${assessmentId}/results`, {
      method: "POST",
      body: JSON.stringify({ results })
    }),
  importAcademicResults: (assessmentId: string, rows: AcademicResultInput[]) =>
    request<AcademicImportResult>("/api/v1/academic/results/import", {
      method: "POST",
      body: JSON.stringify({ assessmentId, rows })
    }),
  studentAcademicSummary: (studentId: string) =>
    request<StudentAcademicSummary>(`/api/v1/students/${studentId}/academic-summary`),
  classAcademicSummary: (classId: string) =>
    request<ClassAcademicSummary>(`/api/v1/classes/${classId}/academic-summary`),
  guardianAcademicReport: (studentId: string) =>
    request<StudentAcademicSummary>(`/api/v1/guardian/students/${studentId}/academic-report`),
  listTeacherAvailabilities: () =>
    request<TeacherAvailability[] | null>("/api/v1/scheduling/teacher-availabilities").then(asArray),
  saveTeacherAvailabilitiesBulk: (items: Array<{
    teacherId: string;
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    availabilityType?: string;
  }>) =>
    request<TeacherAvailability[]>("/api/v1/scheduling/teacher-availabilities/bulk", {
      method: "PATCH",
      body: JSON.stringify({ items })
    }),
  listSchedulingRequirements: () =>
    request<SchedulingRequirement[] | null>("/api/v1/scheduling/requirements").then(asArray),
  saveSchedulingRequirements: (items: RequirementInput[]) =>
    request<SchedulingRequirement[]>("/api/v1/scheduling/requirements", {
      method: "POST",
      body: JSON.stringify(items)
    }),
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
