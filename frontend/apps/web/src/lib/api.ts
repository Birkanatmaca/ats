export type Role = "super_admin" | "system_admin" | "principal" | "guidance" | "teacher" | "guardian" | "driver";

export type Principal = {
  userId: string;
  tenantId: string;
  role: Role;
  name: string;
  email?: string;
  mustChangePassword: boolean;
};

export type UserProfile = {
  id: string;
  tenantId: string;
  tenant?: string;
  fullName: string;
  email: string;
  phone?: string;
  role: Role;
  status: string;
  avatarUrl?: string;
  profileAccent?: string;
  mustChangePassword: boolean;
  createdAt: string;
};

export type UploadCategory = "profile" | "guidance" | "announcement" | "support" | "studentimport" | "homework" | "student" | "report";

export type UploadResourceType =
  | "profile"
  | "guidance_case"
  | "announcement"
  | "support_ticket"
  | "student_import_job"
  | "homework_assignment"
  | "homework_submission"
  | "student"
  | "student_report"
  | "billing_account"
  | "service_trip";

export type FileUploadMeta = {
  key: string;
  url: string;
  sizeBytes: number;
  contentType: string;
  category?: string;
  originalName?: string;
  resourceType?: string;
  resourceId?: string;
  uploadedBy?: string;
  uploadedAt: string;
};

export type GeneratedReportFile = FileUploadMeta & {
  reportType: string;
  title: string;
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
  startTime?: string;
  endTime?: string;
  dayOfWeek?: number;
};

export type GuardianNotification = {
  id: string;
  title: string;
  body: string;
  kind: string;
  readAt?: string;
  createdAt: string;
};

export type GuardianGuidanceUpdate = {
  id: string;
  caseId: string;
  caseTitle: string;
  eventType: GuidanceCaseEventType;
  title: string;
  body: string;
  actorName: string;
  occurredAt: string;
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
  student: { id: string; fullName: string; schoolNumber: string; classId: string; className: string };
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

export type PageResult<T> = {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

export type Tenant = {
  id: string;
  name: string;
  plan: string;
  timezone: string;
  enabledModules?: string[];
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

export type PrincipalReportOverview = {
  from: string;
  to: string;
  generatedAt: string;
  attendance: {
    sessions: number;
    finalizedSessions: number;
    present: number;
    absent: number;
    late: number;
    excused: number;
    completionPct: number;
    daily: Array<{
      date: string;
      sessions: number;
      finalizedSessions: number;
      absent: number;
      late: number;
    }>;
  };
  billing: {
    collectedAmount: number;
    paymentCount: number;
    overdueAmount: number;
    overdueCount: number;
    upcomingAmount: number;
    upcomingCount: number;
    currency: string;
  };
  guidance: {
    openCases: number;
    monitoringCases: number;
    closedCases: number;
    highPriorityOpen: number;
    newCases: number;
    events: number;
  };
  transport: {
    trips: number;
    completedTrips: number;
    activeTrips: number;
    events: number;
    delayEvents: number;
    incidentEvents: number;
  };
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
  status: "draft" | "published" | "archived";
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

export type GuidanceCaseInboxStats = {
  openCount: number;
  monitoringCount: number;
  criticalCount: number;
  overduePlanCount: number;
};

export type GuidanceEarlyWarningSignal = {
  id: string;
  studentId: string;
  studentName: string;
  className: string;
  signalType: "attendance_absent" | "observation_repeat" | "risk_without_case";
  severity: "medium" | "high";
  title: string;
  summary: string;
  suggestedAction: string;
  hasOpenCase: boolean;
  detectedAt: string;
};

export type ManagedGuardianStudent = {
  studentId: string;
  studentName: string;
  className: string;
  schoolNumber: string;
  relation: string;
  isPrimary: boolean;
};

export type ManagedGuardian = {
  id: string;
  tenantId: string;
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  phone: string;
  status: "active" | "passive";
  mustChangePassword: boolean;
  students: ManagedGuardianStudent[];
  createdAt: string;
};

export type ProvisionGuardianResult = {
  userId: string;
  email: string;
  temporaryPassword: string;
  linkedStudents: number;
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
  tenantId?: string;
  title: string;
  body: string;
  status?: "draft" | "scheduled" | "published" | "archived";
  audience: string;
  audiences?: AnnouncementAudienceTarget[];
  publishedAt: string;
  scheduledAt?: string;
  readAt?: string;
  readCount?: number;
  targetCount?: number;
  deliveryCount?: number;
  pushSentCount?: number;
  pushDroppedCount?: number;
  pushFailedCount?: number;
  createdAt?: string;
  updatedAt?: string;
};

export type AnnouncementTemplate = {
  id: string;
  name: string;
  titleTemplate: string;
  bodyTemplate: string;
  category: string;
};

export type AnnouncementAudienceTarget = {
  type: "all" | "role" | "class" | "section" | "student" | "user";
  id?: string;
  role?: string;
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

export type PushHealth = {
  activeTokens: number;
  revokedTokens: number;
  sentLast24h: number;
  failedLast24h: number;
  failureRate24h: number;
};

export type PushDeliveryLog = {
  id: string;
  tenantId: string;
  userId: string;
  deviceTokenId?: string;
  sourceKind?: string;
  category: string;
  title: string;
  status: string;
  provider: string;
  providerReceiptId?: string;
  errorCode?: string;
  errorMessage?: string;
  sentAt?: string;
  createdAt: string;
};

export type UsagePoint = {
  label: string;
  value: number;
};

export type AICostSettings = {
  inputCostPer1mUsd: number;
  outputCostPer1mUsd: number;
  usdTryRate: number;
};

export type AIUsagePoint = {
  label: string;
  userMessages: number;
  tokenInput: number;
  tokenOutput: number;
};

export type AITenantUsageRow = {
  tenantId: string;
  tenantName: string;
  userMessages: number;
  tokenInput: number;
  tokenOutput: number;
  estCostUsd: number;
  estCostTry: number;
  dailyMessageLimit?: number | null;
  monthlyTokenLimit?: number | null;
};

export type AIRoleUsageRow = {
  role: string;
  userMessages: number;
  tokenInput: number;
  tokenOutput: number;
};

export type AIProviderStatus = {
  keySource: "env" | "platform" | "none" | string;
  keyConfigured: boolean;
  keyHint?: string;
  envOverridesKey: boolean;
  model: string;
  useLlm: boolean;
  llmReady: boolean;
  fallbackRuleEngine: boolean;
};

export type AIProviderSettings = {
  model: string;
  useLlm: boolean;
};

export type AIProviderTestResult = {
  ok: boolean;
  model: string;
  latencyMs: number;
  responseHint?: string;
  error?: string;
};

export type AiUsageSummary = {
  messagesLast24h: number;
  messagesToday: number;
  dailyLimit: number;
  remainingToday: number;
  tenantMessagesToday: number;
  tenantDailyLimit: number;
  tenantRemainingToday: number;
  tenantTokensThisMonth: number;
  tenantMonthlyTokenLimit: number;
};

export type AIModelUsageRow = {
  model: string;
  messages: number;
  tokenInput: number;
  tokenOutput: number;
};

export type AIPlatformAnalytics = {
  periodDays: number;
  updatedAt: string;
  totalConversations: number;
  totalUserMessages: number;
  totalAssistantMessages: number;
  activeUsers: number;
  tokenInput: number;
  tokenOutput: number;
  estCostUsd: number;
  estCostTry: number;
  costSettings: AICostSettings;
  dailyUsage: AIUsagePoint[];
  byTenant: AITenantUsageRow[];
  byModel: AIModelUsageRow[];
  byRole: AIRoleUsageRow[];
  provider: AIProviderStatus;
};

export type AIRetentionResult = {
  conversationsArchived: number;
  messagesDeleted: number;
  pendingActionsExpired: number;
};

export type BillingSettings = {
  usdTryRate: number;
  quoteValidityDays: number;
  companyName: string;
  companyEmail: string;
};

export type BillingLicensePackage = {
  id: string;
  name: string;
  tagline: string;
  pricePerStudentUsd: number;
  minOrderUsd: number;
  features: string[];
};

export type BillingInstitutionRow = {
  tenantId: string;
  institutionName: string;
  plan: string;
  status: string;
  studentCount: number;
  annualUsd: number;
  annualTry: number;
  packageId: string;
};

export type BillingOverview = {
  settings: BillingSettings;
  packages: BillingLicensePackage[];
  totalInstitutions: number;
  totalStudents: number;
  totalAnnualUsd: number;
  totalAnnualTry: number;
  institutions: BillingInstitutionRow[];
  updatedAt: string;
};

export type BillingQuoteLineItem = {
  label: string;
  quantity: number;
  unitPrice: number;
  unitLabel: string;
  amountUsd: number;
};

export type BillingQuotePreviewInput = {
  tenantId?: string;
  institutionName?: string;
  contactName?: string;
  contactEmail?: string;
  packageId: string;
  studentCount: number;
  termYears?: number;
  discountPercent?: number;
  usdTryRate?: number;
  pricePerStudentUsd?: number;
  minOrderUsd?: number;
  notes?: string;
};

export type BillingQuotePreview = {
  quoteNumber: string;
  issuedAt: string;
  validUntil: string;
  tenantId: string;
  institutionName: string;
  contactName: string;
  contactEmail: string;
  packageId: string;
  packageName: string;
  packageFeatures: string[];
  studentCount: number;
  termYears: number;
  pricePerStudentUsd: number;
  minOrderUsd: number;
  defaultPricePerStudentUsd: number;
  defaultMinOrderUsd: number;
  pricingCustomized: boolean;
  minimumApplied: boolean;
  calculatedUsd: number;
  discountPercent: number;
  subtotalUsd: number;
  discountUsd: number;
  totalUsd: number;
  totalTry: number;
  usdTryRate: number;
  lineItems: BillingQuoteLineItem[];
  notes: string;
  companyName: string;
  companyEmail: string;
};

export type BillingAccountStatus = "active" | "paused" | "closed";
export type PaymentPlanStatus = "active" | "completed" | "cancelled";
export type PaymentInstallmentStatus = "pending" | "partial" | "paid" | "overdue" | "cancelled";
export type PaymentMethod = "cash" | "bank_transfer" | "card" | "other";

export type Payment = {
  id: string;
  tenantId: string;
  installmentId: string;
  amount: number;
  method: PaymentMethod;
  paidAt: string;
  recordedBy?: string;
  note?: string;
  void: boolean;
  voidedAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type PaymentInstallment = {
  id: string;
  tenantId: string;
  paymentPlanId: string;
  billingAccountId: string;
  studentId?: string;
  studentName?: string;
  classId?: string;
  className?: string;
  planName?: string;
  dueDate: string;
  amount: number;
  paidAmount: number;
  remainingAmount: number;
  status: PaymentInstallmentStatus;
  payments?: Payment[];
};

export type PaymentPlan = {
  id: string;
  tenantId: string;
  billingAccountId: string;
  name: string;
  totalAmount: number;
  currency: string;
  startDate: string;
  status: PaymentPlanStatus;
  createdAt: string;
  updatedAt: string;
  installments: PaymentInstallment[];
};

export type BillingAccount = {
  id: string;
  tenantId: string;
  studentId: string;
  studentName: string;
  schoolNumber: string;
  classId?: string;
  className?: string;
  guardianUserId?: string;
  status: BillingAccountStatus;
  createdAt: string;
  plans: PaymentPlan[];
};

export type CreatePaymentPlanInput = {
  name: string;
  totalAmount: number;
  currency?: string;
  startDate: string;
  installmentCount?: number;
  installments?: Array<{ dueDate: string; amount: number }>;
};

export type UpdatePaymentPlanInput = {
  name?: string;
  status?: PaymentPlanStatus;
};

export type CreatePaymentInput = {
  amount: number;
  method: PaymentMethod;
  paidAt?: string;
  note?: string;
};

export type UpdatePaymentInput = Partial<CreatePaymentInput>;

export type BillingDashboard = {
  totalReceivable: number;
  collectedAmount: number;
  outstandingAmount: number;
  overdueAmount: number;
  overdueCount: number;
  activePlanCount: number;
  overdueInstallments: PaymentInstallment[];
  updatedAt: string;
};

export type GuardianBillingSummary = {
  account: BillingAccount;
  upcomingInstallments: PaymentInstallment[];
  overdueInstallments: PaymentInstallment[];
  paymentHistory: Payment[];
  outstandingAmount: number;
  overdueAmount: number;
};

export type ServiceDirection = "morning" | "evening" | "both";
export type ServiceStatus = "active" | "passive" | "archived";
export type ServiceStaffRole = "driver" | "attendant";

export type ServiceVehicle = {
  id: string;
  tenantId: string;
  plate: string;
  capacity: number;
  brand?: string;
  model?: string;
  status: ServiceStatus;
  assignedCount: number;
  createdAt: string;
  updatedAt: string;
};

export type ServiceStaff = {
  id: string;
  tenantId: string;
  userId?: string;
  fullName: string;
  phone?: string;
  role: ServiceStaffRole;
  status: ServiceStatus;
  sharingStatus?: string;
  lastSeenAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type ServiceRouteStop = {
  id: string;
  tenantId: string;
  routeId: string;
  name: string;
  plannedTime: string;
  sortOrder: number;
  latitude?: number;
  longitude?: number;
};

export type ServiceAssignment = {
  id: string;
  tenantId: string;
  studentId: string;
  studentName?: string;
  schoolNumber?: string;
  classId?: string;
  className?: string;
  routeId: string;
  routeName?: string;
  stopId?: string;
  stopName?: string;
  direction: ServiceDirection;
  status: ServiceStatus;
  createdAt: string;
  updatedAt: string;
};

export type ServiceRoute = {
  id: string;
  tenantId: string;
  name: string;
  direction: ServiceDirection;
  vehicleId?: string;
  vehiclePlate?: string;
  vehicleCapacity?: number;
  driverId?: string;
  driverName?: string;
  driverPhone?: string;
  driverSharingStatus?: string;
  driverLastSeenAt?: string;
  attendantId?: string;
  attendantName?: string;
  attendantPhone?: string;
  status: ServiceStatus;
  stops: ServiceRouteStop[];
  assignments: ServiceAssignment[];
  capacityWarning?: string;
  createdAt: string;
  updatedAt: string;
};

export type ServiceRouteInput = {
  name: string;
  direction: ServiceDirection;
  vehicleId?: string;
  driverId?: string;
  attendantId?: string;
  status?: ServiceStatus;
  stops?: Array<{
    id?: string;
    name: string;
    plannedTime: string;
    sortOrder?: number;
    latitude?: number;
    longitude?: number;
  }>;
};

export type ServiceDelayNotification = {
  routeId: string;
  routeName: string;
  delayMinutes: number;
  deliveredCount: number;
};

export type ServiceAssignmentInput = {
  studentId: string;
  routeId: string;
  stopId?: string;
  direction: ServiceDirection;
  status?: ServiceStatus;
};

export type ServiceTripStatus = "active" | "completed" | "canceled";

export type ServiceTripLocation = {
  id: string;
  tenantId: string;
  tripId: string;
  latitude: number;
  longitude: number;
  accuracyMeters?: number;
  speedKph?: number;
  headingDegrees?: number;
  capturedAt: string;
  createdAt: string;
};

export type ServiceLiveStatus = {
  active: boolean;
  lastLocationAt?: string;
  speedKph?: number;
  etaMinutes?: number | null;
  distanceKm?: number | null;
  locationStale?: boolean;
  stopLatitude?: number;
  stopLongitude?: number;
};

export type ServiceTrip = {
  id: string;
  tenantId: string;
  routeId: string;
  routeName?: string;
  driverUserId: string;
  driverId: string;
  driverName?: string;
  direction: ServiceDirection;
  status: ServiceTripStatus;
  startedAt: string;
  endedAt?: string;
  lastLocation?: ServiceTripLocation;
  liveStatus?: ServiceLiveStatus;
  createdAt: string;
  updatedAt: string;
};

export type ServiceTripEvent = {
  id: string;
  tenantId: string;
  tripId: string;
  eventType: string;
  payload?: Record<string, unknown>;
  createdAt: string;
};

export type ServiceTripEventInput = {
  eventType: string;
  studentId?: string;
  stopId?: string;
  note?: string;
  payload?: Record<string, unknown>;
};

export type StartServiceTripInput = {
  direction?: ServiceDirection;
};

export type ServiceTripLive = {
  trip: ServiceTrip;
  liveStatus?: ServiceLiveStatus;
  locations: ServiceTripLocation[];
  events: ServiceTripEvent[];
  updatedAt: string;
};

export type ServiceTripTimelineItem = {
  id: string;
  type: "event" | "location";
  eventType?: string;
  event?: ServiceTripEvent;
  location?: ServiceTripLocation;
  occurredAt: string;
};

export type GuardianServiceSummary = {
  studentId: string;
  studentName: string;
  schoolNumber: string;
  className?: string;
  assignments: ServiceAssignment[];
  routes: ServiceRoute[];
  activeTrip?: ServiceTrip;
  liveStatus?: ServiceLiveStatus;
  updatedAt: string;
  hasAssignment: boolean;
};

export type GuardianServiceLive = {
  studentId: string;
  active: boolean;
  activeTrip?: ServiceTrip;
  liveStatus?: ServiceLiveStatus;
  locations: ServiceTripLocation[];
  events: ServiceTripEvent[];
  updatedAt: string;
};

export type LifeMealType = "breakfast" | "lunch" | "snack";
export type LifeStatus = "active" | "passive" | "archived";
export type StudyAttendanceStatus = "attended" | "absent" | "excused";
export type ClubMembershipStatus = "active" | "waitlisted" | "left";

export type MealMenu = {
  id: string;
  tenantId: string;
  date: string;
  mealType: LifeMealType;
  title: string;
  description?: string;
  allergens: string[];
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
};

export type StudyAttendance = {
  id: string;
  tenantId: string;
  sessionId: string;
  studentId: string;
  studentName?: string;
  schoolNumber?: string;
  classId?: string;
  className?: string;
  status: StudyAttendanceStatus;
  createdAt: string;
  updatedAt: string;
};

export type StudySession = {
  id: string;
  tenantId: string;
  subjectId?: string;
  subjectName?: string;
  teacherUserId?: string;
  teacherName?: string;
  classId?: string;
  className?: string;
  title: string;
  startsAt: string;
  endsAt: string;
  capacity: number;
  status: LifeStatus;
  attendance: StudyAttendance[];
  capacityWarning?: string;
  createdAt: string;
  updatedAt: string;
};

export type ClubMembership = {
  id: string;
  tenantId: string;
  clubId: string;
  clubName?: string;
  studentId: string;
  studentName?: string;
  schoolNumber?: string;
  classId?: string;
  className?: string;
  status: ClubMembershipStatus;
  createdAt: string;
  updatedAt: string;
};

export type Club = {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  advisorUserId?: string;
  advisorName?: string;
  capacity: number;
  status: LifeStatus;
  memberships: ClubMembership[];
  capacityWarning?: string;
  createdAt: string;
  updatedAt: string;
};

export type GuardianLifeSummary = {
  studentId: string;
  studentName: string;
  schoolNumber: string;
  className?: string;
  meals: MealMenu[];
  studySessions: StudySession[];
  clubMemberships: ClubMembership[];
  clubs: Club[];
  updatedAt: string;
};

export type MealMenuInput = {
  date: string;
  mealType: LifeMealType;
  title: string;
  description?: string;
  allergens?: string[];
};

export type StudySessionInput = {
  subjectId?: string;
  teacherUserId?: string;
  classId?: string;
  title: string;
  startsAt: string;
  endsAt: string;
  capacity: number;
  status?: LifeStatus;
};

export type StudyAttendanceInput = {
  studentId: string;
  status: StudyAttendanceStatus;
};

export type ClubInput = {
  name: string;
  description?: string;
  advisorUserId?: string;
  capacity: number;
  status?: LifeStatus;
};

export type ClubMembershipInput = {
  studentId: string;
  status?: ClubMembershipStatus;
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
  enabledModules?: string[];
  createdAt: string;
  updatedAt: string;
};

export type UserAccount = {
  id: string;
  tenantId: string;
  tenant: string;
  fullName: string;
  email: string;
  phone?: string;
  role: string;
  status: string;
  avatarUrl?: string;
  profileAccent?: string;
  mustChangePassword: boolean;
  createdAt: string;
};

export type CreatedUserCredential = {
  user: UserAccount;
  temporaryPassword: string;
};

export type AiMessage = {
  id: string;
  conversationId: string;
  role: string;
  content: string;
  createdAt?: string;
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

export type AiPendingAction = {
  id: string;
  actionType: string;
  riskLevel: string;
  status: string;
};

export type AiSendMessageResult = {
  message: AiMessage;
  candidates?: AiCandidate[];
  pendingAction?: AiPendingActionSummary | null;
};

export type AiStreamEvent = {
  type: "token" | "done" | "error";
  delta?: string;
  message?: AiMessage;
  candidates?: AiCandidate[];
  pendingAction?: AiPendingActionSummary | null;
  error?: string;
};

export type AiTenantQuota = {
  dailyMessageLimit?: number | null;
  monthlyTokenLimit?: number | null;
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

export type AuditEntry = {
  id: string;
  tenantId?: string;
  tenant: string;
  actorId?: string;
  actor: string;
  actorEmail?: string;
  actorRole?: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  sensitivity: string;
  metadata?: string;
  createdAt: string;
};

export type SuperAdminAuditLogQuery = {
  tenantId?: string;
  action?: string;
  actorId?: string;
  actorRole?: string;
  resourceType?: string;
  sensitivity?: string;
  search?: string;
  limit?: number;
};

export type AuditPurgeResult = {
  deletedCount: number;
  before: string;
  tenantId?: string;
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

function filePublicURL(key: string) {
  return `${API_BASE_URL}/api/v1/files/public/${key.replace(/^\/+/, "")}`;
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

function isFormDataBody(body: BodyInit | null | undefined): body is FormData {
  return typeof FormData !== "undefined" && body instanceof FormData;
}

async function request<T>(path: string, init?: RequestInit, retried = false): Promise<T> {
  const headers = new Headers(init?.headers);
  if (!headers.has("Content-Type") && init?.body && !isFormDataBody(init.body)) {
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

  if (response.status === 204) {
    return undefined as T;
  }

  const envelope = (await response.json()) as Envelope<T>;
  return (envelope.data ?? null) as T;
}

async function requestBlob(path: string, init?: RequestInit, retried = false): Promise<Blob> {
  const headers = new Headers(init?.headers);
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
      return requestBlob(path, init, true);
    }
  }

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    const message = payload?.error?.message ?? `API request failed: ${response.status}`;
    throw new Error(message);
  }

  return response.blob();
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
  updateSuperAdminInstitutionModules: (institutionId: string, enabledModules: string[]) =>
    request<InstitutionDetail>(`/api/v1/super-admin/institutions/${institutionId}/modules`, {
      method: "PATCH",
      body: JSON.stringify({ enabledModules })
    }),
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
  superAdminAuditLogs: (query?: SuperAdminAuditLogQuery) => {
    const params = new URLSearchParams();
    if (query?.tenantId) params.set("tenantId", query.tenantId);
    if (query?.action) params.set("action", query.action);
    if (query?.actorId) params.set("actorId", query.actorId);
    if (query?.actorRole) params.set("actorRole", query.actorRole);
    if (query?.resourceType) params.set("resourceType", query.resourceType);
    if (query?.sensitivity) params.set("sensitivity", query.sensitivity);
    if (query?.search) params.set("search", query.search);
    if (typeof query?.limit === "number") params.set("limit", String(query.limit));
    const suffix = params.toString() ? `?${params.toString()}` : "";
    return request<AuditEntry[]>(`/api/v1/super-admin/audit-logs${suffix}`);
  },
  purgeSuperAdminAuditLogs: (payload: { olderThanDays: number; tenantId?: string }) => {
    const params = new URLSearchParams({ olderThanDays: String(payload.olderThanDays) });
    if (payload.tenantId) params.set("tenantId", payload.tenantId);
    return request<AuditPurgeResult>(`/api/v1/super-admin/audit-logs?${params.toString()}`, {
      method: "DELETE"
    });
  },
  superAdminPushHealth: (tenantId?: string) => {
    const suffix = tenantId ? `?tenantId=${encodeURIComponent(tenantId)}` : "";
    return request<PushHealth>(`/api/v1/super-admin/push/health${suffix}`);
  },
  superAdminPushLogs: (params?: { tenantId?: string; limit?: number }) => {
    const query = new URLSearchParams();
    if (params?.tenantId) query.set("tenantId", params.tenantId);
    if (params?.limit) query.set("limit", String(params.limit));
    const suffix = query.toString() ? `?${query.toString()}` : "";
    return request<PushDeliveryLog[]>(`/api/v1/super-admin/push/logs${suffix}`);
  },
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
  supportTickets: () => request<SupportTicket[] | null>("/api/v1/support/tickets").then(asArray),
  createSupportTicket: (payload: { type: string; subject: string; message: string }) =>
    request<SupportTicket>("/api/v1/support/tickets", {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  uploadFile: (payload: {
    file: File;
    category: UploadCategory;
    resourceType: UploadResourceType;
    resourceId: string;
  }) => {
    const formData = new FormData();
    formData.set("file", payload.file);
    formData.set("category", payload.category);
    formData.set("resourceType", payload.resourceType);
    formData.set("resourceId", payload.resourceId);
    return request<FileUploadMeta>("/api/v1/files/upload", {
      method: "POST",
      body: formData
    });
  },
  files: (query: { resourceType: UploadResourceType; resourceId: string; category?: UploadCategory; offset?: number; limit?: number }) => {
    const params = new URLSearchParams();
    params.set("resourceType", query.resourceType);
    params.set("resourceId", query.resourceId);
    if (query.category) params.set("category", query.category);
    if (typeof query.offset === "number") params.set("offset", String(query.offset));
    if (typeof query.limit === "number") params.set("limit", String(query.limit));
    return request<FileUploadMeta[] | null>(`/api/v1/files?${params.toString()}`).then(asArray);
  },
  downloadFile: (key: string) => requestBlob(`/api/v1/files/${key.replace(/^\/+/, "")}`),
  filePublicURL,
  generateAttendanceReport: (payload: { studentId: string }) =>
    request<GeneratedReportFile>("/api/v1/reports/attendance", {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  generateBillingReceiptReport: (payload: { studentId: string; paymentId?: string }) =>
    request<GeneratedReportFile>("/api/v1/reports/billing-receipt", {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  generateGuidanceCaseSummaryReport: (payload: { caseId: string }) =>
    request<GeneratedReportFile>("/api/v1/reports/guidance-case-summary", {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  generateStudentDevelopmentReport: (payload: { studentId: string; teacherNote?: string; counselorNote?: string }) =>
    request<GeneratedReportFile>("/api/v1/reports/student-development", {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  generateServiceTripReport: (payload: { tripId: string }) =>
    request<GeneratedReportFile>("/api/v1/reports/service-trip", {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  profile: () => request<UserProfile>("/api/v1/profile"),
  updateProfile: (payload: { avatarUrl?: string | null; profileAccent?: string }) =>
    request<UserProfile>("/api/v1/profile", { method: "PATCH", body: JSON.stringify(payload) }),
  principalUsers: () => request<UserAccount[] | null>("/api/v1/principal/users").then(asArray),
  updatePrincipalUser: (
    userId: string,
    payload: {
      email: string;
      fullName: string;
      phone?: string;
      role: string;
      status: string;
      avatarUrl?: string;
      profileAccent?: string;
    }
  ) =>
    request<UserAccount>(`/api/v1/principal/users/${userId}`, {
      method: "PATCH",
      body: JSON.stringify({ ...payload, tenantId: "" })
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
  superAdminAIOverview: (days = 30) =>
    request<AIPlatformAnalytics>(`/api/v1/super-admin/ai/overview?days=${encodeURIComponent(String(days))}`),
  superAdminAIProvider: () =>
    request<{ status: AIProviderStatus; models: string[] }>("/api/v1/super-admin/ai/provider"),
  updateSuperAdminAIProvider: (payload: AIProviderSettings) =>
    request<{ settings: AIProviderSettings; status: AIProviderStatus }>("/api/v1/super-admin/ai/provider", {
      method: "PATCH",
      body: JSON.stringify(payload)
    }),
  testSuperAdminAIProvider: () =>
    request<AIProviderTestResult>("/api/v1/super-admin/ai/provider/test", { method: "POST" }),
  updateSuperAdminAICostSettings: (payload: AICostSettings) =>
    request<AICostSettings>("/api/v1/super-admin/ai/cost-settings", {
      method: "PATCH",
      body: JSON.stringify(payload)
    }),
  runSuperAdminAIRetention: () =>
    request<AIRetentionResult>("/api/v1/super-admin/ai/retention/run", { method: "POST" }),
  updateSuperAdminInstitutionAIQuota: (institutionId: string, payload: AiTenantQuota) =>
    request<AiTenantQuota>(`/api/v1/super-admin/institutions/${institutionId}/ai-quota`, {
      method: "PATCH",
      body: JSON.stringify(payload)
    }),
  superAdminBillingOverview: () => request<BillingOverview>("/api/v1/super-admin/billing/overview"),
  superAdminBillingSettings: () => request<BillingSettings>("/api/v1/super-admin/billing/settings"),
  updateSuperAdminBillingSettings: (payload: BillingSettings) =>
    request<BillingSettings>("/api/v1/super-admin/billing/settings", {
      method: "PATCH",
      body: JSON.stringify(payload)
    }),
  previewSuperAdminBillingQuote: (payload: BillingQuotePreviewInput) =>
    request<BillingQuotePreview>("/api/v1/super-admin/billing/quotes/preview", {
      method: "POST",
      body: JSON.stringify(payload)
    }),
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
  guardianBilling: (studentId: string) =>
    request<GuardianBillingSummary>(`/api/v1/guardian/students/${studentId}/billing`),
  serviceRoutes: () => request<ServiceRoute[] | null>("/api/v1/services/routes").then(asArray),
  serviceRoute: (routeId: string) => request<ServiceRoute>(`/api/v1/services/routes/${routeId}`),
  createServiceRoute: (payload: ServiceRouteInput) =>
    request<ServiceRoute>("/api/v1/services/routes", { method: "POST", body: JSON.stringify(payload) }),
  updateServiceRoute: (routeId: string, payload: Partial<ServiceRouteInput>) =>
    request<ServiceRoute>(`/api/v1/services/routes/${routeId}`, { method: "PATCH", body: JSON.stringify(payload) }),
  reportServiceRouteDelay: (routeId: string, payload: { delayMinutes: number; note?: string }) =>
    request<ServiceDelayNotification>(`/api/v1/services/routes/${routeId}/delay`, {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  deleteServiceRoute: (routeId: string) =>
    request<void>(`/api/v1/services/routes/${routeId}`, { method: "DELETE" }),
  serviceVehicles: () => request<ServiceVehicle[] | null>("/api/v1/services/vehicles").then(asArray),
  createServiceVehicle: (payload: { plate: string; capacity: number; brand?: string; model?: string }) =>
    request<ServiceVehicle>("/api/v1/services/vehicles", { method: "POST", body: JSON.stringify(payload) }),
  serviceStaff: () => request<ServiceStaff[] | null>("/api/v1/services/staff").then(asArray),
  createServiceStaff: (payload: { fullName: string; phone?: string; role: ServiceStaffRole }) =>
    request<ServiceStaff>("/api/v1/services/staff", { method: "POST", body: JSON.stringify(payload) }),
  activeServiceTrips: () => request<ServiceTrip[] | null>("/api/v1/services/trips/active").then(asArray),
  startServiceRouteTrip: (routeId: string, payload: StartServiceTripInput = {}) =>
    request<ServiceTrip>(`/api/v1/services/routes/${routeId}/start`, {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  completeServiceTrip: (tripId: string) =>
    request<ServiceTrip>(`/api/v1/services/trips/${tripId}/complete`, { method: "POST", body: "{}" }),
  serviceTripLive: (tripId: string, limit = 120, eventLimit = 50) =>
    request<ServiceTripLive>(
      `/api/v1/services/trips/${tripId}/live?limit=${encodeURIComponent(String(limit))}&eventLimit=${encodeURIComponent(String(eventLimit))}`
    ),
  serviceTripTimeline: (tripId: string, limit = 50) =>
    request<ServiceTripTimelineItem[] | null>(
      `/api/v1/services/trips/${tripId}/timeline?limit=${encodeURIComponent(String(limit))}`
    ).then(asArray),
  serviceTripLocations: (tripId: string, limit = 20) =>
    request<ServiceTripLocation[] | null>(
      `/api/v1/services/trips/${tripId}/locations?limit=${encodeURIComponent(String(limit))}`
    ).then(asArray),
  serviceTripEvents: (tripId: string, limit = 20) =>
    request<ServiceTripEvent[] | null>(
      `/api/v1/services/trips/${tripId}/events?limit=${encodeURIComponent(String(limit))}`
    ).then(asArray),
  createServiceTripEvent: (tripId: string, payload: ServiceTripEventInput) =>
    request<ServiceTripEvent>(`/api/v1/services/trips/${tripId}/events`, {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  assignServiceStudent: (payload: ServiceAssignmentInput) =>
    request<ServiceAssignment>("/api/v1/services/assignments", { method: "POST", body: JSON.stringify(payload) }),
  guardianService: (studentId: string) =>
    request<GuardianServiceSummary>(`/api/v1/guardian/students/${studentId}/service`),
  guardianServiceLive: (studentId: string, limit = 20, eventLimit = 20) =>
    request<GuardianServiceLive>(
      `/api/v1/guardian/students/${studentId}/service/live?limit=${encodeURIComponent(String(limit))}&eventLimit=${encodeURIComponent(String(eventLimit))}`
    ),
  guardianLife: (studentId: string) =>
    request<GuardianLifeSummary>(`/api/v1/guardian/students/${studentId}/life`),
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
  dashboard: () => request<PrincipalSummary>("/api/v1/dashboard/principal/summary"),
  principalReports: (params?: { from?: string; to?: string }) => {
    const search = new URLSearchParams();
    if (params?.from) search.set("from", params.from);
    if (params?.to) search.set("to", params.to);
    const suffix = search.toString() ? `?${search.toString()}` : "";
    return request<PrincipalReportOverview>(`/api/v1/dashboard/principal/reports${suffix}`);
  },
  schedule: () => request<Schedule>("/api/v1/schedules/current"),
  teacherCalendar: () => request<Lesson[] | null>("/api/v1/teachers/me/calendar").then(asArray),
  teacherStudents: () => request<SchoolStudentRecord[] | null>("/api/v1/teachers/me/students").then(asArray),
  currentLesson: () => request<CurrentLesson>("/api/v1/attendance/current-lesson"),
  announcements: (params?: { manage?: boolean }) => {
    const query = params?.manage ? "?manage=true" : "";
    return request<Announcement[] | null>(`/api/v1/announcements${query}`).then(asArray);
  },
  observations: () => request<Observation[] | null>("/api/v1/observations").then(asArray),
  createAttendanceSession: (lessonId: string) =>
    request<AttendanceSession>("/api/v1/attendance/sessions", {
      method: "POST",
      body: JSON.stringify({ lessonId })
    }),
  getAttendanceSessionByLesson: (lessonId: string) =>
    request<AttendanceSession>(`/api/v1/attendance/lessons/${lessonId}/session`),
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
  reopenAttendanceSession: (sessionId: string) =>
    request<AttendanceSession>(`/api/v1/attendance/sessions/${sessionId}/reopen`, {
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
  scheduleConflicts: (scheduleId: string) =>
    request<ScheduleConflictsResult>(`/api/v1/schedules/${scheduleId}/conflicts`),
  scheduleChangeLog: (scheduleId: string) =>
    request<ScheduleChangeLog[] | null>(`/api/v1/schedules/${scheduleId}/change-log`).then(asArray),
  cloneSchedule: (scheduleId: string) =>
    request<Schedule>(`/api/v1/schedules/${scheduleId}/clone`, {
      method: "POST",
      body: "{}"
    }),
  publishSchedule: (scheduleId: string) =>
    request<Schedule>(`/api/v1/schedules/${scheduleId}/publish`, {
      method: "POST",
      body: "{}"
    }),
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
  listSchedulingRequirements: () =>
    request<SchedulingRequirement[] | null>("/api/v1/scheduling/requirements").then(asArray),
  saveSchedulingRequirements: (items: Array<{ classId: string; subjectId: string; weeklyHours: number }>) =>
    request<SchedulingRequirement[]>("/api/v1/scheduling/requirements", {
      method: "POST",
      body: JSON.stringify(items)
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
      body: JSON.stringify(items)
    }),
  saveTeacherAvailabilitiesBulk: (
    items: Array<{
      teacherId: string;
      dayOfWeek: number;
      startTime: string;
      endTime: string;
      availabilityType?: string;
    }>
  ) =>
    request<TeacherAvailability[]>("/api/v1/scheduling/teacher-availabilities/bulk", {
      method: "PATCH",
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
  listStudentsPage: (params?: { page?: number; limit?: number; q?: string }) => {
    const search = new URLSearchParams();
    if (params?.page) {
      search.set("page", String(params.page));
    }
    if (params?.limit) {
      search.set("limit", String(params.limit));
    }
    if (params?.q?.trim()) {
      search.set("q", params.q.trim());
    }
    const query = search.toString();
    return request<PageResult<SchoolStudentRecord>>(`/api/v1/students${query ? `?${query}` : "?page=1&limit=25"}`);
  },
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
  createAnnouncement: (payload: {
    title: string;
    body: string;
    audience?: string;
    audiences?: AnnouncementAudienceTarget[];
    scheduledAt?: string;
    publish?: boolean;
  }) =>
    request<Announcement>("/api/v1/announcements", {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  updateAnnouncement: (
    announcementId: string,
    payload: { title?: string; body?: string; audience?: string; audiences?: AnnouncementAudienceTarget[]; scheduledAt?: string }
  ) =>
    request<Announcement>(`/api/v1/announcements/${announcementId}`, {
      method: "PATCH",
      body: JSON.stringify(payload)
    }),
  publishAnnouncement: (announcementId: string) =>
    request<Announcement>(`/api/v1/announcements/${announcementId}/publish`, { method: "POST", body: "{}" }),
  announcementTemplates: () =>
    request<AnnouncementTemplate[] | null>("/api/v1/announcement-templates").then(asArray),
  markAnnouncementRead: (announcementId: string) =>
    request<void>(`/api/v1/announcements/${announcementId}/read`, { method: "PATCH", body: "{}" }),
  classSummary: (classId: string, date?: string) =>
    request<ClassSummary>(
      `/api/v1/dashboard/classes/${classId}/summary${date ? `?date=${encodeURIComponent(date)}` : ""}`
    ),
  guardianStudents: () => request<GuardianStudent[] | null>("/api/v1/guardian/me/students").then(asArray),
  guardianStudentSchedule: (studentId: string) =>
    request<GuardianStudentSchedule>(`/api/v1/guardian/students/${studentId}/schedule`),
  guardianStudentAttendance: (studentId: string) =>
    request<GuardianStudentAttendance>(`/api/v1/guardian/students/${studentId}/attendance`),
  guardianStudentGuidanceUpdates: (studentId: string) =>
    request<GuardianGuidanceUpdate[] | null>(`/api/v1/guardian/students/${studentId}/guidance-updates`).then(asArray),
  guardianAnnouncements: () => request<Announcement[] | null>("/api/v1/guardian/announcements").then(asArray),
  guardianNotifications: () => request<GuardianNotification[] | null>("/api/v1/guardian/notifications").then(asArray),
  guardianNotificationMarkRead: (notificationId: string) =>
    request<GuardianNotification>(`/api/v1/guardian/notifications/${notificationId}/read`, {
      method: "PATCH",
      body: "{}"
    }),
  guardianNotificationDelete: (notificationId: string) =>
    request<void>(`/api/v1/guardian/notifications/${notificationId}`, { method: "DELETE" }),
  notifications: () => request<UserNotification[] | null>("/api/v1/notifications").then(asArray),
  notificationMarkRead: (notificationId: string) =>
    request<UserNotification>(`/api/v1/notifications/${notificationId}/read`, {
      method: "PATCH",
      body: "{}"
    }),
  notificationDelete: (notificationId: string) =>
    request<void>(`/api/v1/notifications/${notificationId}`, { method: "DELETE" }),
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
  principalGuardians: () => request<ManagedGuardian[] | null>("/api/v1/principal/guardians").then(asArray),
  principalGuardian: (guardianId: string) => request<ManagedGuardian>(`/api/v1/principal/guardians/${guardianId}`),
  provisionGuardian: (payload: {
    email: string;
    firstName: string;
    lastName: string;
    studentIds: string[];
    relation?: string;
  }) =>
    request<ProvisionGuardianResult>("/api/v1/principal/guardians", {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  updatePrincipalGuardian: (
    guardianId: string,
    payload: Partial<{ firstName: string; lastName: string; phone: string }>
  ) =>
    request<ManagedGuardian>(`/api/v1/principal/guardians/${guardianId}`, {
      method: "PATCH",
      body: JSON.stringify(payload)
    }),
  setPrincipalGuardianStatus: (guardianId: string, status: "active" | "passive") =>
    request<ManagedGuardian>(`/api/v1/principal/guardians/${guardianId}/status`, {
      method: "POST",
      body: JSON.stringify({ status })
    }),
  resetPrincipalGuardianPassword: (guardianId: string) =>
    request<{ temporaryPassword: string }>(`/api/v1/principal/guardians/${guardianId}/reset-password`, {
      method: "POST",
      body: "{}"
    }),
  linkPrincipalGuardianStudent: (
    guardianId: string,
    payload: { studentId: string; relation?: string; isPrimary?: boolean }
  ) =>
    request<ManagedGuardian>(`/api/v1/principal/guardians/${guardianId}/students`, {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  unlinkPrincipalGuardianStudent: (guardianId: string, studentId: string) =>
    request<ManagedGuardian>(`/api/v1/principal/guardians/${guardianId}/students/${studentId}`, {
      method: "DELETE"
    }),
  provisionServiceDriver: (payload: { email: string; firstName: string; lastName: string; phone?: string; title?: string }) =>
    request<{ userId: string; serviceStaffId: string; email: string; temporaryPassword: string }>(
      "/api/v1/principal/service-drivers",
      {
        method: "POST",
        body: JSON.stringify(payload)
      }
    ),
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
  listStudentImportJobs: () => request<StudentImportJob[] | null>("/api/v1/imports/students").then(asArray),
  createStudentImportJob: (payload: {
    fileName: string;
    rows: Array<Record<string, unknown>>;
    options: StudentImportJobOptions;
  }) =>
    request<StudentImportJob>("/api/v1/imports/students", {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  getStudentImportJob: (jobId: string) => request<StudentImportJob>(`/api/v1/imports/students/${jobId}`),
  listStudentImportRows: (jobId: string) =>
    request<StudentImportRow[] | null>(`/api/v1/imports/students/${jobId}/rows`).then(asArray),
  validateStudentImportJob: (jobId: string) =>
    request<StudentImportJob>(`/api/v1/imports/students/${jobId}/validate`, { method: "POST", body: "{}" }),
  previewStudentImportJob: (jobId: string) =>
    request<StudentImportCommitPreview>(`/api/v1/imports/students/${jobId}/preview`),
  commitStudentImportJob: (jobId: string) =>
    request<StudentImportCommitResult>(`/api/v1/imports/students/${jobId}/commit`, { method: "POST", body: "{}" }),
  cancelStudentImportJob: (jobId: string) =>
    request<StudentImportJob>(`/api/v1/imports/students/${jobId}/cancel`, { method: "POST", body: "{}" }),
  rollbackStudentImportJob: (jobId: string) =>
    request<StudentImportJob>(`/api/v1/imports/students/${jobId}/rollback`, { method: "POST", body: "{}" }),
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
  },
  guidanceStudents: () => request<GuidanceStudent[] | null>("/api/v1/guidance/students").then(asArray),
  guidanceNotes: (studentId?: string) => {
    const suffix = studentId ? `?studentId=${encodeURIComponent(studentId)}` : "";
    return request<GuidanceNote[] | null>(`/api/v1/guidance/notes${suffix}`).then(asArray);
  },
  createGuidanceNote: (payload: { studentId: string; noteType: string; title: string; body: string }) =>
    request<GuidanceNote>("/api/v1/guidance/notes", {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  updateGuidanceNote: (noteId: string, payload: { noteType?: string; title?: string; body?: string }) =>
    request<GuidanceNote>(`/api/v1/guidance/notes/${noteId}`, {
      method: "PATCH",
      body: JSON.stringify(payload)
    }),
  deleteGuidanceNote: (noteId: string) =>
    request<void>(`/api/v1/guidance/notes/${noteId}`, { method: "DELETE" }),
  supportPlans: (studentId?: string) => {
    const suffix = studentId ? `?studentId=${encodeURIComponent(studentId)}` : "";
    return request<GuidanceSupportPlan[] | null>(`/api/v1/guidance/support-plans${suffix}`).then(asArray);
  },
  createSupportPlan: (payload: {
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
  updateSupportPlan: (
    planId: string,
    payload: { title?: string; description?: string; status?: string; dueDate?: string }
  ) =>
    request<GuidanceSupportPlan>(`/api/v1/guidance/support-plans/${planId}`, {
      method: "PATCH",
      body: JSON.stringify(payload)
    }),
  deleteSupportPlan: (planId: string) =>
    request<void>(`/api/v1/guidance/support-plans/${planId}`, { method: "DELETE" }),
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
    priority?: GuidanceCasePriority;
    sensitivity?: string;
  }) =>
    request<GuidanceCase>("/api/v1/guidance/cases", { method: "POST", body: JSON.stringify(payload) }),
  updateGuidanceCase: (
    caseId: string,
    payload: Partial<{
      title: string;
      summary: string;
      status: GuidanceCaseStatus;
      priority: GuidanceCasePriority;
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
      eventType?: GuidanceCaseEventType;
      title: string;
      body: string;
      visibility?: GuidanceCaseEventVisibility;
    }
  ) =>
    request<GuidanceCaseEvent>(`/api/v1/guidance/cases/${caseId}/events`, {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  guidanceEarlyWarnings: () =>
    request<GuidanceEarlyWarningSignal[] | null>("/api/v1/guidance/early-warnings").then(asArray),

  aiCapabilities: () => request<AiCapabilitiesResult>("/api/v1/ai/capabilities"),
  aiUsage: () => request<AiUsageSummary>("/api/v1/ai/usage"),
  createAiConversation: (payload?: { title?: string }) =>
    request<AiConversation>("/api/v1/ai/conversations", {
      method: "POST",
      body: JSON.stringify(payload ?? {})
    }),
  sendAiMessage: (conversationId: string, payload: { content: string; selectedCandidateId?: string }) =>
    request<AiSendMessageResult>(`/api/v1/ai/conversations/${conversationId}/messages`, {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  sendAiMessageStream: async (
    conversationId: string,
    payload: { content: string; selectedCandidateId?: string },
    onEvent: (event: AiStreamEvent) => void
  ) => {
    const headers = new Headers({ "Content-Type": "application/json" });
    for (const [key, value] of Object.entries(authHeaders())) {
      headers.set(key, value);
    }
    const response = await fetch(`${API_BASE_URL}/api/v1/ai/conversations/${conversationId}/messages:stream`, {
      method: "POST",
      headers,
      body: JSON.stringify(payload)
    });
    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: { message?: string } } | null;
      throw new Error(payload?.error?.message ?? "Mesaj akışı başlatılamadı.");
    }
    if (!response.body) {
      throw new Error("Mesaj akışı desteklenmiyor.");
    }
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      buffer += decoder.decode(value, { stream: true });
      const chunks = buffer.split("\n\n");
      buffer = chunks.pop() ?? "";
      for (const chunk of chunks) {
        const dataLine = chunk.split("\n").find((line) => line.startsWith("data:"));
        if (!dataLine) {
          continue;
        }
        const payloadText = dataLine.replace(/^data:\s*/, "");
        onEvent(JSON.parse(payloadText) as AiStreamEvent);
      }
    }
  },
  confirmAiAction: (actionId: string) =>
    request<{ message: AiMessage }>(`/api/v1/ai/actions/${actionId}/confirm`, {
      method: "POST",
      body: "{}"
    }),
  cancelAiAction: (actionId: string) =>
    request<AiPendingAction>(`/api/v1/ai/actions/${actionId}/cancel`, {
      method: "POST",
      body: "{}"
    })
};
