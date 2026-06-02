export type Role =
  | "super_admin"
  | "system_admin"
  | "principal"
  | "guidance"
  | "teacher"
  | "guardian";

export type NotificationPreferences = {
  attendance: boolean;
  announcements: boolean;
  support: boolean;
  guidance: boolean;
  schedule: boolean;
};

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

export type ClassAttendanceStudent = {
  studentId: string;
  firstName: string;
  lastName: string;
  schoolNumber: string;
  status: AttendanceRecord["status"];
};

export type ClassAttendanceSheet = {
  date: string;
  classId: string;
  className: string;
  sectionId?: string;
  sessionId?: string;
  lessonId?: string;
  finalized: boolean;
  canEdit: boolean;
  message?: string;
  students: ClassAttendanceStudent[];
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

export type AnnouncementAudienceTarget = {
  type: "all" | "role" | "class" | "section" | "student" | "user";
  id?: string;
  role?: string;
};

export type Announcement = {
  id: string;
  title: string;
  body: string;
  audience: string;
  audiences?: AnnouncementAudienceTarget[];
  status?: "draft" | "scheduled" | "published" | "archived";
  publishedAt?: string;
  scheduledAt?: string;
  readCount?: number;
  targetCount?: number;
};

export type AnnouncementTemplate = {
  id: string;
  name: string;
  titleTemplate: string;
  bodyTemplate: string;
  category: string;
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
  students: PrincipalRosterStudent[];
};

export type PrincipalRosterStudent = {
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
};

export type StudentFormPayload = {
  schoolNumber: string;
  firstName: string;
  lastName: string;
  classId: string;
  gender: string;
  birthDate: string;
  guardianName: string;
  guardianPhone: string;
  status: "active" | "passive";
};

export type StudentAttendanceSummary = {
  studentId: string;
  records: Array<{
    date: string;
    subjectName: string;
    className: string;
    status: string;
  }>;
  present: number;
  absent: number;
  late: number;
  excused: number;
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

export type GuidanceSupportPlan = {
  id: string;
  tenantId: string;
  studentId: string;
  studentName: string;
  className: string;
  ownerId: string;
  ownerName: string;
  title: string;
  description: string;
  status: "open" | "monitoring" | "closed";
  dueDate?: string;
  createdAt: string;
  updatedAt: string;
};

export type GuidanceRiskTracking = {
  id: string;
  tenantId: string;
  studentId: string;
  studentName: string;
  className: string;
  counselorId: string;
  counselorName: string;
  reason: string;
  createdAt: string;
  updatedAt: string;
};

export type GuidanceCaseStatus = "open" | "monitoring" | "closed";
export type GuidanceCasePriority = "low" | "medium" | "high" | "critical";
export type GuidanceCaseEventType =
  | "note"
  | "meeting"
  | "plan"
  | "risk"
  | "status_change"
  | "file"
  | "follow_up";
export type GuidanceCaseEventVisibility = "guidance_only" | "principal_summary" | "shared_with_guardian";

export type GuidanceCase = {
  id: string;
  tenantId: string;
  studentId: string;
  studentName: string;
  className: string;
  ownerUserId: string;
  ownerName: string;
  status: GuidanceCaseStatus;
  priority: GuidanceCasePriority;
  title: string;
  summary: string;
  sensitivity: string;
  openedAt: string;
  closedAt?: string;
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
  masked?: boolean;
};

export type GuidanceCaseEvent = {
  id: string;
  tenantId: string;
  caseId: string;
  eventType: GuidanceCaseEventType;
  title: string;
  body: string;
  actorUserId: string;
  actorName: string;
  visibility: GuidanceCaseEventVisibility;
  occurredAt: string;
  createdAt: string;
  updatedAt: string;
  masked?: boolean;
};

export type GuidanceCaseTimelineItem = {
  id: string;
  source: "case_event" | "guidance_note" | "support_plan" | "risk_tracking";
  eventType: string;
  title: string;
  body: string;
  actorName: string;
  occurredAt: string;
  visibility?: GuidanceCaseEventVisibility;
  masked?: boolean;
};

export type GuidanceCaseCloseResult = {
  case: GuidanceCase;
  warnings?: string[];
};

export type GuidanceStudentCaseSummary = {
  studentId: string;
  studentName: string;
  className: string;
  activeCaseCount: number;
  criticalCount: number;
  openPlanCount: number;
  cases: GuidanceCase[];
};

export type GuidanceCaseInboxStats = {
  openCount: number;
  monitoringCount: number;
  criticalCount: number;
  overduePlanCount: number;
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
  status: "draft" | "published" | "archived";
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

export type ScheduleConflict = {
  severity: "hard" | "soft";
  type: string;
  message: string;
  lessonIds?: string[];
};

export type ScheduleConflictsResult = {
  valid: boolean;
  conflicts: ScheduleConflict[];
  hardConflicts: string[];
  softWarnings: string[];
};

export type ScheduleChangeLog = {
  id: string;
  scheduleId: string;
  actorUserId?: string;
  lessonId?: string;
  changeType: string;
  before: Record<string, unknown>;
  after: Record<string, unknown>;
  createdAt: string;
};

export type AcademicAssessmentType = "exam" | "quiz" | "homework" | "project";

export type AcademicAssessment = {
  id: string;
  name: string;
  subjectId: string;
  subjectName: string;
  classId?: string;
  className?: string;
  assessmentType: AcademicAssessmentType;
  maxScore: number;
  assessmentDate: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
};

export type AcademicResult = {
  id: string;
  assessmentId: string;
  studentId: string;
  studentName: string;
  classId?: string;
  className?: string;
  score: number;
  percentile?: number;
  note?: string;
  createdAt: string;
  updatedAt: string;
};

export type AcademicResultInput = {
  studentId?: string;
  schoolNumber?: string;
  fullName?: string;
  score: number;
  percentile?: number;
  note?: string;
};

export type AcademicImportResult = {
  imported: number;
  failed: number;
  rows: Array<{ rowNumber: number; status: string; studentId?: string; errors?: string[] }>;
  results: AcademicResult[];
};

export type StudentAcademicSummary = {
  student: {
    id: string;
    fullName: string;
    schoolNumber: string;
    classId: string;
    className: string;
  };
  averagePercent: number;
  assessmentCount: number;
  subjectSummaries: Array<{
    subjectId: string;
    subjectName: string;
    averagePercent: number;
    assessmentCount: number;
    latestScore: number;
    latestMaxScore: number;
    trend: string;
    needsSupport: boolean;
  }>;
  recentResults: Array<{
    assessmentId: string;
    assessmentName: string;
    subjectId: string;
    subjectName: string;
    assessmentDate: string;
    score: number;
    maxScore: number;
    percent: number;
    note?: string;
  }>;
  outcomes: Array<{
    id: string;
    outcomeCode: string;
    outcomeTitle: string;
    subjectName: string;
    status: string;
    evidence?: string;
    updatedAt: string;
  }>;
  supportSignals: string[];
  aiWeeklySummary: string;
};

export type ClassAcademicSummary = {
  class: { id: string; name: string };
  averagePercent: number;
  assessmentCount: number;
  studentCount: number;
  subjectSummaries: Array<{
    subjectId: string;
    subjectName: string;
    averagePercent: number;
    assessmentCount: number;
    trend: string;
    needsSupportCount: number;
  }>;
  supportStudents: Array<{
    studentId: string;
    studentName: string;
    schoolNumber: string;
    averagePercent: number;
    signal: string;
  }>;
  aiWeeklySummary: string;
};

export type SchedulingRequirement = {
  id: string;
  classId: string;
  className: string;
  subjectId: string;
  subjectName: string;
  weeklyHours: number;
};

export type RequirementInput = {
  classId: string;
  subjectId: string;
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

export type UpdateScheduleLessonInput = {
  teacherId?: string;
  subjectId?: string;
  dayOfWeek?: number;
  startTime?: string;
  endTime?: string;
  room?: string;
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

export type StudentImportJobOptions = {
  createMissingClasses: boolean;
  inviteGuardians: boolean;
};

export type StudentImportJobStatus =
  | "draft"
  | "validating"
  | "ready"
  | "importing"
  | "completed"
  | "failed"
  | "cancelled";

export type StudentImportRowStatus = "valid" | "warning" | "error" | "imported";

export type StudentImportNormalizedRow = {
  schoolNumber: string;
  firstName: string;
  lastName: string;
  className: string;
  sectionName: string;
  classId?: string;
  guardianName?: string;
  guardianPhone?: string;
  guardianEmail?: string;
  guardianRelation?: string;
  gender?: string;
  birthDate?: string;
  studentStatus?: string;
};

export type StudentImportRow = {
  id: string;
  jobId: string;
  rowNumber: number;
  rawData: Record<string, unknown>;
  normalizedData: StudentImportNormalizedRow;
  status: StudentImportRowStatus;
  errorMessages: string[];
  createdStudentId?: string;
  createdGuardianUserId?: string;
};

export type StudentImportJob = {
  id: string;
  tenantId: string;
  status: StudentImportJobStatus;
  fileName: string;
  uploadedBy?: string;
  totalRows: number;
  validRows: number;
  warningRows: number;
  errorRows: number;
  importedRows: number;
  options: StudentImportJobOptions;
  createdAt: string;
  completedAt?: string | null;
};

export type StudentImportCommitPreview = {
  studentsToCreate: number;
  guardiansToInvite: number;
  skippedRows: number;
};

export type StudentImportCommitResult = {
  job: StudentImportJob;
  createdStudents: number;
  createdGuardians: number;
  skippedRows: number;
  failedRows: number;
};
