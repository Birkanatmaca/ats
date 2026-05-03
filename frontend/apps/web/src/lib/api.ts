export type Role = "system_admin" | "principal" | "guidance" | "teacher" | "guardian";

export type Principal = {
  userId: string;
  tenantId: string;
  role: Role;
  name: string;
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

type Envelope<T> = {
  data: T;
  meta?: unknown;
};

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "X-Tenant-Id": "tenant-demo",
      "X-User-Id": "teacher-1",
      "X-User-Name": "Ayşe Kara",
      "X-Role": "principal",
      ...init?.headers
    }
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`);
  }

  const envelope = (await response.json()) as Envelope<T>;
  return envelope.data;
}

export const api = {
  me: () => request<Principal>("/api/v1/me"),
  tenant: () => request<Tenant>("/api/v1/tenants/current"),
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

