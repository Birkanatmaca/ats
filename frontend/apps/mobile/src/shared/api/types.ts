export type Role =
  | "super_admin"
  | "system_admin"
  | "principal"
  | "guidance"
  | "teacher"
  | "guardian";

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

export type Tenant = {
  id: string;
  name: string;
  plan: string;
  timezone: string;
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

export type GuardianStudent = {
  id: string;
  fullName: string;
  className: string;
  schoolNumber: string;
  relation?: string;
};

export type GuardianAttendanceRecord = {
  id: string;
  date: string;
  lesson: string;
  status: AttendanceRecord["status"];
  note?: string;
  startTime?: string;
  endTime?: string;
  dayOfWeek?: number;
};

export type PrincipalSummary = {
  activeStudents: number;
  activeTeachers: number;
  classes: number;
  todayLessons: number;
  attendanceCompletionPct: number;
  absentToday: number;
  openObservationSignals: number;
  classAttendance: Array<{
    className: string;
    completed: number;
    total: number;
    absent: number;
    attentionNeed: string;
  }>;
  operations: Array<{
    id: string;
    title: string;
    status: string;
    priority: string;
    kind?: string;
    targetPath?: string;
  }>;
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

export type GuidanceStudent = {
  id: string;
  schoolNumber: string;
  firstName: string;
  lastName: string;
  fullName: string;
  classId: string;
  className: string;
  status: string;
};

export type GuidanceNote = {
  id: string;
  tenantId: string;
  studentId: string;
  studentName: string;
  className: string;
  authorId: string;
  authorName: string;
  noteType: string;
  title: string;
  body: string;
  sensitivity: string;
  createdAt: string;
  updatedAt: string;
};

export type UserNotification = {
  id: string;
  title: string;
  body: string;
  kind: string;
  readAt?: string | null;
  createdAt: string;
};

export type GuardianNotification = {
  id: string;
  title: string;
  body: string;
  kind: string;
  readAt?: string;
  createdAt: string;
};

export type SupportTicket = {
  id: string;
  subject: string;
  message: string;
  type: string;
  status: string;
  priority: string;
  createdAt: string;
};

export type UserProfile = {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  role: Role;
  status: string;
  avatarUrl?: string;
  profileAccent?: string;
};

export type UserAccount = {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  role: string;
  status: string;
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

export type ScheduleGenerationResult = {
  schedule: Schedule;
  hardConflicts: number;
  softWarnings: string[];
  recommendation: string;
};

export type ScheduleValidationResult = {
  valid: boolean;
  hardConflicts: string[];
  softWarnings: string[];
};

export type AiMessage = {
  id: string;
  conversationId: string;
  role: string;
  content: string;
};

export type AiCandidate = {
  kind: string;
  id: string;
  label: string;
  meta: string;
};

export type AiPendingActionSummary = {
  id: string;
  actionType: string;
  riskLevel: string;
  summary: string;
  confirmLabel: string;
  cancelLabel: string;
};

export type AiSendMessageResult = {
  message: AiMessage;
  candidates?: AiCandidate[];
  pendingAction?: AiPendingActionSummary | null;
};

export type AiConversation = {
  id: string;
  title: string;
  status: string;
};

export type AiCapabilitiesResult = {
  role: string;
  capabilities: Array<{ key: string; label: string; description: string }>;
  suggestions: string[];
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
