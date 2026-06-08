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
  createdAt?: string;
  updatedAt?: string;
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
  stops?: Array<{ name: string; plannedTime: string; sortOrder?: number }>;
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

export type GuardianServiceSummary = {
  studentId: string;
  studentName: string;
  schoolNumber: string;
  className?: string;
  assignments: ServiceAssignment[];
  routes: ServiceRoute[];
  updatedAt: string;
  hasAssignment: boolean;
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

  if (response.status === 204) {
    return undefined as T;
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
  assignServiceStudent: (payload: ServiceAssignmentInput) =>
    request<ServiceAssignment>("/api/v1/services/assignments", { method: "POST", body: JSON.stringify(payload) }),
  guardianService: (studentId: string) =>
    request<GuardianServiceSummary>(`/api/v1/guardian/students/${studentId}/service`),
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

  aiCapabilities: () => request<AiCapabilitiesResult>("/api/v1/ai/capabilities"),
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
