package handlers

import (
	"context"
	"errors"
	"net/http"
	"strconv"
	"strings"
	"time"

	academicapp "ots/backend/internal/app/academic"
	aiapp "ots/backend/internal/app/ai"
	announcementapp "ots/backend/internal/app/announcement"
	attendanceapp "ots/backend/internal/app/attendance"
	billingapp "ots/backend/internal/app/billing"
	dashboardapp "ots/backend/internal/app/dashboard"
	guardianapp "ots/backend/internal/app/guardian"
	guidanceapp "ots/backend/internal/app/guidance"
	homeworkapp "ots/backend/internal/app/homework"
	identityapp "ots/backend/internal/app/identity"
	lifeapp "ots/backend/internal/app/life"
	observationapp "ots/backend/internal/app/observation"
	pushapp "ots/backend/internal/app/push"
	schedulingapp "ots/backend/internal/app/scheduling"
	schoolapp "ots/backend/internal/app/school"
	studentimportapp "ots/backend/internal/app/studentimport"
	superadminapp "ots/backend/internal/app/superadmin"
	transportapp "ots/backend/internal/app/transport"
	attendanceDomain "ots/backend/internal/domain/attendance"
	"ots/backend/internal/domain/identity"
	observationDomain "ots/backend/internal/domain/observation"
	schedulingDomain "ots/backend/internal/domain/scheduling"
	schoolDomain "ots/backend/internal/domain/school"
	superadminDomain "ots/backend/internal/domain/superadmin"
	"ots/backend/internal/platform/httpx"
	"ots/backend/internal/platform/storage"
)

type Dependencies struct {
	Identity      *identityapp.Service
	School        *schoolapp.Service
	Scheduling    *schedulingapp.Service
	Academic      *academicapp.Service
	Attendance    *attendanceapp.Service
	Observation   *observationapp.Service
	Guardian      *guardianapp.Service
	Guidance      *guidanceapp.Service
	Homework      *homeworkapp.Service
	Dashboard     *dashboardapp.Service
	SuperAdmin    *superadminapp.Service
	Billing       *billingapp.Service
	Transport     *transportapp.Service
	Life          *lifeapp.Service
	AI            *aiapp.Service
	Push          *pushapp.Service
	Announcements *announcementapp.Service
	StudentImport *studentimportapp.Service
	FileStorage   *storage.LocalStore
	Clock         func() time.Time
}

type Handler struct {
	identity      *identityapp.Service
	school        *schoolapp.Service
	scheduling    *schedulingapp.Service
	academic      *academicapp.Service
	attendance    *attendanceapp.Service
	observation   *observationapp.Service
	guardian      *guardianapp.Service
	guidance      *guidanceapp.Service
	homework      *homeworkapp.Service
	dashboard     *dashboardapp.Service
	superAdmin    *superadminapp.Service
	billing       *billingapp.Service
	transport     *transportapp.Service
	life          *lifeapp.Service
	ai            *aiapp.Service
	push          *pushapp.Service
	announcements *announcementapp.Service
	studentImport *studentimportapp.Service
	fileStorage   *storage.LocalStore
	clock         func() time.Time
}

func New(deps Dependencies) *Handler {
	return &Handler{
		identity:      deps.Identity,
		school:        deps.School,
		scheduling:    deps.Scheduling,
		academic:      deps.Academic,
		attendance:    deps.Attendance,
		observation:   deps.Observation,
		guardian:      deps.Guardian,
		guidance:      deps.Guidance,
		homework:      deps.Homework,
		dashboard:     deps.Dashboard,
		superAdmin:    deps.SuperAdmin,
		billing:       deps.Billing,
		transport:     deps.Transport,
		life:          deps.Life,
		ai:            deps.AI,
		push:          deps.Push,
		announcements: deps.Announcements,
		studentImport: deps.StudentImport,
		fileStorage:   deps.FileStorage,
		clock:         deps.Clock,
	}
}

func (h *Handler) Register(mux *http.ServeMux) {
	mux.HandleFunc("GET /healthz", h.health)
	mux.HandleFunc("GET /api/v1/system/status", h.systemStatus)
	mux.HandleFunc("POST /api/v1/auth/login", h.login)
	mux.HandleFunc("POST /api/v1/auth/refresh", h.refresh)
	mux.HandleFunc("POST /api/v1/auth/logout", h.logout)
	mux.HandleFunc("POST /api/v1/auth/password/first-login", h.changePassword)
	mux.HandleFunc("POST /api/v1/auth/password/forgot", h.forgotPassword)
	mux.HandleFunc("POST /api/v1/auth/password/reset", h.resetPassword)
	mux.HandleFunc("GET /api/v1/me", h.me)
	h.registerProfileRoutes(mux)
	mux.HandleFunc("GET /api/v1/tenants/current", h.currentTenant)
	h.registerAnnouncementRoutes(mux)
	mux.HandleFunc("GET /api/v1/guardian/me/students", h.guardianStudents)
	mux.HandleFunc("GET /api/v1/guardian/students/{studentId}/schedule", h.guardianStudentSchedule)
	mux.HandleFunc("GET /api/v1/guardian/students/{studentId}/attendance", h.guardianStudentAttendance)
	mux.HandleFunc("GET /api/v1/guardian/students/{studentId}/guidance-updates", h.guardianStudentGuidanceUpdates)
	mux.HandleFunc("GET /api/v1/guardian/announcements", h.guardianAnnouncements)
	mux.HandleFunc("GET /api/v1/guardian/notifications", h.guardianNotifications)
	mux.HandleFunc("PATCH /api/v1/guardian/notifications/{id}/read", h.guardianNotificationRead)
	mux.HandleFunc("DELETE /api/v1/guardian/notifications/{id}", h.guardianNotificationDelete)
	mux.HandleFunc("GET /api/v1/notifications", h.userNotifications)
	mux.HandleFunc("PATCH /api/v1/notifications/{id}/read", h.userNotificationRead)
	mux.HandleFunc("DELETE /api/v1/notifications/{id}", h.userNotificationDelete)
	h.registerPushRoutes(mux)
	h.registerFileRoutes(mux)
	h.registerHomeworkRoutes(mux)
	h.registerMobileGuardianRoutes(mux)
	mux.HandleFunc("GET /api/v1/support/tickets", h.mySupportTickets)
	mux.HandleFunc("POST /api/v1/support/tickets", h.createSupportTicket)
	mux.HandleFunc("GET /api/v1/dashboard/principal/summary", h.principalSummary)
	mux.HandleFunc("GET /api/v1/dashboard/classes/{classId}/summary", h.classSummary)
	mux.HandleFunc("GET /api/v1/principal/teachers", h.principalTeachers)
	mux.HandleFunc("POST /api/v1/principal/teachers", h.provisionPrincipalTeacher)
	mux.HandleFunc("POST /api/v1/principal/guardians", h.provisionPrincipalGuardian)
	h.registerPrincipalGuardianRoutes(mux)
	mux.HandleFunc("GET /api/v1/principal/school/roster", h.principalSchoolRoster)
	mux.HandleFunc("GET /api/v1/super-admin/overview", h.superAdminOverview)
	mux.HandleFunc("GET /api/v1/super-admin/system/metrics", h.superAdminSystemMetrics)
	mux.HandleFunc("GET /api/v1/super-admin/institutions", h.superAdminInstitutions)
	mux.HandleFunc("POST /api/v1/super-admin/institutions", h.createSuperAdminInstitution)
	mux.HandleFunc("GET /api/v1/super-admin/institutions/{id}", h.superAdminInstitution)
	mux.HandleFunc("PATCH /api/v1/super-admin/institutions/{id}/modules", h.updateSuperAdminInstitutionModules)
	mux.HandleFunc("GET /api/v1/super-admin/institutions/{id}/users", h.superAdminInstitutionUsers)
	mux.HandleFunc("POST /api/v1/super-admin/institutions/{id}/users", h.createSuperAdminInstitutionUser)
	mux.HandleFunc("GET /api/v1/super-admin/users", h.superAdminUsers)
	mux.HandleFunc("POST /api/v1/super-admin/users", h.createSuperAdminUser)
	mux.HandleFunc("PATCH /api/v1/super-admin/users/{id}", h.updateSuperAdminUser)
	mux.HandleFunc("DELETE /api/v1/super-admin/users/{id}", h.deleteSuperAdminUser)
	mux.HandleFunc("GET /api/v1/super-admin/audit-logs", h.superAdminAuditLogs)
	mux.HandleFunc("DELETE /api/v1/super-admin/audit-logs", h.purgeSuperAdminAuditLogs)
	mux.HandleFunc("GET /api/v1/super-admin/settings", h.superAdminSettings)
	mux.HandleFunc("PATCH /api/v1/super-admin/settings", h.updateSuperAdminSettings)
	mux.HandleFunc("GET /api/v1/super-admin/support/tickets", h.superAdminSupportTickets)
	mux.HandleFunc("PATCH /api/v1/super-admin/support/tickets/{id}", h.updateSuperAdminSupportTicket)
	h.registerSuperAdminAIRoutes(mux)
	h.registerSuperAdminBillingRoutes(mux)
	mux.HandleFunc("GET /api/v1/scheduling/requirements", h.listSchedulingRequirements)
	mux.HandleFunc("POST /api/v1/scheduling/requirements", h.saveSchedulingRequirements)
	mux.HandleFunc("GET /api/v1/scheduling/teacher-availabilities", h.listTeacherAvailabilities)
	mux.HandleFunc("POST /api/v1/scheduling/teacher-availabilities", h.saveTeacherAvailabilities)
	mux.HandleFunc("GET /api/v1/schedules/current", h.currentSchedule)
	mux.HandleFunc("GET /api/v1/schedules/{id}", h.getSchedule)
	mux.HandleFunc("POST /api/v1/schedules/generate", h.generateSchedule)
	mux.HandleFunc("PATCH /api/v1/schedules/{id}/lessons/{lessonId}", h.updateScheduleLesson)
	mux.HandleFunc("POST /api/v1/schedules/{id}/validate", h.validateSchedule)
	mux.HandleFunc("POST /api/v1/schedules/{id}/publish", h.publishSchedule)
	mux.HandleFunc("POST /api/v1/schedules/{id}/clone", h.cloneSchedule)
	mux.HandleFunc("GET /api/v1/schedules/{id}/conflicts", h.scheduleConflicts)
	mux.HandleFunc("GET /api/v1/schedules/{id}/change-log", h.scheduleChangeLog)
	mux.HandleFunc("PATCH /api/v1/scheduling/teacher-availabilities/bulk", h.saveTeacherAvailabilitiesBulk)
	mux.HandleFunc("GET /api/v1/teachers/me/calendar", h.teacherCalendar)
	mux.HandleFunc("GET /api/v1/teachers/me/students", h.teacherStudents)
	mux.HandleFunc("GET /api/v1/attendance/current-lesson", h.currentLesson)
	mux.HandleFunc("POST /api/v1/attendance/sessions", h.createAttendanceSession)
	mux.HandleFunc("GET /api/v1/attendance/lessons/{lessonId}/session", h.getAttendanceSessionByLesson)
	mux.HandleFunc("GET /api/v1/attendance/sessions/{id}", h.getAttendanceSession)
	mux.HandleFunc("GET /api/v1/attendance/sessions/{id}/version", h.getAttendanceSessionVersion)
	mux.HandleFunc("PATCH /api/v1/attendance/sessions/{id}/records", h.updateAttendanceRecords)
	mux.HandleFunc("POST /api/v1/attendance/sessions/{id}/finalize", h.finalizeAttendanceSession)
	mux.HandleFunc("POST /api/v1/attendance/sessions/{id}/reopen", h.reopenAttendanceSession)
	mux.HandleFunc("GET /api/v1/dashboard/attendance/today", h.attendanceToday)
	mux.HandleFunc("GET /api/v1/students/{id}/attendance-summary", h.studentAttendanceSummary)
	h.registerAcademicRoutes(mux)
	h.registerBillingRoutes(mux)
	h.registerTransportRoutes(mux)
	h.registerLifeRoutes(mux)
	h.registerPrincipalAttendanceRoutes(mux)
	mux.HandleFunc("GET /api/v1/observations", h.listObservations)
	mux.HandleFunc("POST /api/v1/observations", h.createObservation)
	mux.HandleFunc("GET /api/v1/observations/{id}", h.getObservation)
	mux.HandleFunc("PATCH /api/v1/observations/{id}", h.updateObservation)
	mux.HandleFunc("DELETE /api/v1/observations/{id}", h.deleteObservation)
	mux.HandleFunc("GET /api/v1/academic-years", h.listAcademicYears)
	mux.HandleFunc("POST /api/v1/academic-years", h.createAcademicYear)
	mux.HandleFunc("GET /api/v1/terms", h.listTerms)
	mux.HandleFunc("POST /api/v1/terms", h.createTerm)
	mux.HandleFunc("GET /api/v1/classes", h.listClasses)
	mux.HandleFunc("POST /api/v1/classes", h.createClass)
	mux.HandleFunc("PATCH /api/v1/classes/{id}", h.updateClass)
	mux.HandleFunc("GET /api/v1/students", h.listStudents)
	mux.HandleFunc("POST /api/v1/students", h.createStudent)
	mux.HandleFunc("PATCH /api/v1/students/{id}", h.updateStudent)
	mux.HandleFunc("GET /api/v1/subjects", h.listSubjects)
	mux.HandleFunc("POST /api/v1/subjects", h.createSubject)
	mux.HandleFunc("GET /api/v1/teachers", h.listTeachers)
	mux.HandleFunc("POST /api/v1/teachers", h.createTeacher)
	mux.HandleFunc("PATCH /api/v1/teachers/{id}", h.updateTeacher)
	mux.HandleFunc("POST /api/v1/classes/{id}/students", h.assignClassStudent)
	mux.HandleFunc("POST /api/v1/students/import", h.importStudents)
	mux.HandleFunc("POST /api/v1/teachers/{id}/reset-password", h.resetTeacherPassword)
	mux.HandleFunc("POST /api/v1/principal/service-drivers", h.provisionPrincipalServiceDriver)
	h.registerStudentImportRoutes(mux)
	h.RegisterGuidanceRoutes(mux)
	h.registerAIRoutes(mux)
}

func (h *Handler) health(w http.ResponseWriter, r *http.Request) {
	httpx.WriteJSON(w, http.StatusOK, map[string]any{
		"status": "ok",
		"time":   h.clock().UTC(),
	}, nil)
}

func (h *Handler) systemStatus(w http.ResponseWriter, r *http.Request) {
	status, err := h.superAdmin.SystemStatus(r.Context())
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "SYSTEM_STATUS_FAILED", "Sistem durumu alınamadı.", nil)
		return
	}
	httpx.WriteJSON(w, http.StatusOK, status, nil)
}

func (h *Handler) login(w http.ResponseWriter, r *http.Request) {
	var input identity.LoginInput
	if err := httpx.DecodeJSON(r, &input); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Giriş bilgileri okunamadı.", nil)
		return
	}

	session, err := h.identity.Login(r.Context(), input)
	if errors.Is(err, identityapp.ErrInvalidCredentials) {
		httpx.WriteError(w, http.StatusUnauthorized, "INVALID_CREDENTIALS", "E-posta veya şifre hatalı.", nil)
		return
	}
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "LOGIN_FAILED", "Giriş yapılamadı.", nil)
		return
	}
	httpx.WriteJSON(w, http.StatusOK, session, nil)
}

func (h *Handler) refresh(w http.ResponseWriter, r *http.Request) {
	var input identity.RefreshInput
	if err := httpx.DecodeJSON(r, &input); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Refresh token okunamadı.", nil)
		return
	}

	session, err := h.identity.Refresh(r.Context(), input)
	if errors.Is(err, identityapp.ErrInvalidRefreshToken) {
		httpx.WriteError(w, http.StatusUnauthorized, "INVALID_REFRESH_TOKEN", "Geçersiz veya süresi dolmuş refresh token.", nil)
		return
	}
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "REFRESH_FAILED", "Oturum yenilenemedi.", nil)
		return
	}
	httpx.WriteJSON(w, http.StatusOK, session, nil)
}

func (h *Handler) logout(w http.ResponseWriter, r *http.Request) {
	if err := h.identity.Logout(r.Context()); err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "LOGOUT_FAILED", "Çıkış yapılamadı.", nil)
		return
	}
	httpx.WriteJSON(w, http.StatusOK, map[string]string{"status": "ok"}, nil)
}

func (h *Handler) changePassword(w http.ResponseWriter, r *http.Request) {
	principal, ok := requirePrincipal(w, r)
	if !ok {
		return
	}
	var input identity.PasswordChangeInput
	if err := httpx.DecodeJSON(r, &input); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Şifre bilgisi okunamadı.", nil)
		return
	}

	session, err := h.identity.ChangePassword(r.Context(), principal, input)
	if errors.Is(err, identityapp.ErrWeakPassword) {
		httpx.WriteError(w, http.StatusBadRequest, "WEAK_PASSWORD", "Şifre en az 8 karakter olmalıdır.", nil)
		return
	}
	if errors.Is(err, identityapp.ErrUserNotFound) {
		httpx.WriteError(w, http.StatusNotFound, "USER_NOT_FOUND", "Kullanıcı bulunamadı.", nil)
		return
	}
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "PASSWORD_CHANGE_FAILED", "Şifre güncellenemedi.", nil)
		return
	}
	httpx.WriteJSON(w, http.StatusOK, session, nil)
}

func (h *Handler) me(w http.ResponseWriter, r *http.Request) {
	principal, ok := identity.PrincipalFromContext(r.Context())
	if !ok {
		httpx.WriteError(w, http.StatusUnauthorized, "UNAUTHENTICATED", "Oturum bilgisi bulunamadı.", nil)
		return
	}
	httpx.WriteJSON(w, http.StatusOK, principal, nil)
}

func (h *Handler) currentTenant(w http.ResponseWriter, r *http.Request) {
	principal, ok := requirePrincipal(w, r)
	if !ok {
		return
	}
	tenant, found := h.school.CurrentTenant(r.Context(), principal.TenantID)
	if !found {
		httpx.WriteError(w, http.StatusNotFound, "TENANT_NOT_FOUND", "Kurum bulunamadı.", nil)
		return
	}
	httpx.WriteJSON(w, http.StatusOK, tenant, nil)
}

func (h *Handler) guardianStudents(w http.ResponseWriter, r *http.Request) {
	principal, ok := requireGuardian(w, r)
	if !ok {
		return
	}
	httpx.WriteJSON(w, http.StatusOK, h.guardian.ListStudents(r.Context(), principal.TenantID, principal.UserID), nil)
}

func (h *Handler) guardianStudentSchedule(w http.ResponseWriter, r *http.Request) {
	principal, ok := requireGuardian(w, r)
	if !ok {
		return
	}
	schedule, err := h.guardian.StudentSchedule(r.Context(), principal.TenantID, principal.UserID, r.PathValue("studentId"))
	if errors.Is(err, guardianapp.ErrForbidden) {
		httpx.WriteError(w, http.StatusForbidden, "FORBIDDEN", "Bu öğrenciye erişim yetkiniz yok.", nil)
		return
	}
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "GUARDIAN_SCHEDULE_FAILED", "Ders programı alınamadı.", nil)
		return
	}
	httpx.WriteJSON(w, http.StatusOK, schedule, nil)
}

func (h *Handler) guardianStudentAttendance(w http.ResponseWriter, r *http.Request) {
	principal, ok := requireGuardian(w, r)
	if !ok {
		return
	}
	attendance, err := h.guardian.StudentAttendance(r.Context(), principal.TenantID, principal.UserID, r.PathValue("studentId"))
	if errors.Is(err, guardianapp.ErrForbidden) {
		httpx.WriteError(w, http.StatusForbidden, "FORBIDDEN", "Bu öğrenciye erişim yetkiniz yok.", nil)
		return
	}
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "GUARDIAN_ATTENDANCE_FAILED", "Devamsızlık kayıtları alınamadı.", nil)
		return
	}
	httpx.WriteJSON(w, http.StatusOK, attendance, nil)
}

func (h *Handler) guardianStudentGuidanceUpdates(w http.ResponseWriter, r *http.Request) {
	principal, ok := requireGuardian(w, r)
	if !ok {
		return
	}
	updates, err := h.guardian.StudentGuidanceUpdates(r.Context(), principal.TenantID, principal.UserID, r.PathValue("studentId"))
	if errors.Is(err, guardianapp.ErrForbidden) {
		httpx.WriteError(w, http.StatusForbidden, "FORBIDDEN", "Bu öğrenciye erişim yetkiniz yok.", nil)
		return
	}
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "GUARDIAN_GUIDANCE_UPDATES_FAILED", "Rehberlik paylaşımları alınamadı.", nil)
		return
	}
	httpx.WriteJSON(w, http.StatusOK, updates, nil)
}

func (h *Handler) guardianNotifications(w http.ResponseWriter, r *http.Request) {
	principal, ok := requireGuardian(w, r)
	if !ok {
		return
	}
	httpx.WriteJSON(w, http.StatusOK, h.guardian.ListNotifications(r.Context(), principal.TenantID, principal.UserID), nil)
}

func (h *Handler) guardianNotificationRead(w http.ResponseWriter, r *http.Request) {
	principal, ok := requireGuardian(w, r)
	if !ok {
		return
	}
	notification, err := h.guardian.MarkNotificationRead(r.Context(), principal.TenantID, principal.UserID, r.PathValue("id"))
	if errors.Is(err, guardianapp.ErrNotificationNotFound) {
		httpx.WriteError(w, http.StatusNotFound, "NOTIFICATION_NOT_FOUND", "Bildirim bulunamadı.", nil)
		return
	}
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "NOTIFICATION_READ_FAILED", "Bildirim güncellenemedi.", nil)
		return
	}
	httpx.WriteJSON(w, http.StatusOK, notification, nil)
}

func (h *Handler) guardianNotificationDelete(w http.ResponseWriter, r *http.Request) {
	principal, ok := requireGuardian(w, r)
	if !ok {
		return
	}
	err := h.guardian.DeleteNotification(r.Context(), principal.TenantID, principal.UserID, r.PathValue("id"))
	if errors.Is(err, guardianapp.ErrNotificationNotFound) {
		httpx.WriteError(w, http.StatusNotFound, "NOTIFICATION_NOT_FOUND", "Bildirim bulunamadı.", nil)
		return
	}
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "NOTIFICATION_DELETE_FAILED", "Bildirim silinemedi.", nil)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *Handler) principalSummary(w http.ResponseWriter, r *http.Request) {
	principal, ok := requirePrincipal(w, r)
	if !ok {
		return
	}
	httpx.WriteJSON(w, http.StatusOK, h.dashboard.PrincipalSummary(r.Context(), principal.TenantID), nil)
}

func (h *Handler) classSummary(w http.ResponseWriter, r *http.Request) {
	principal, ok := requirePrincipal(w, r)
	if !ok {
		return
	}
	date := h.clock()
	if raw := strings.TrimSpace(r.URL.Query().Get("date")); raw != "" {
		parsed, err := time.Parse("2006-01-02", raw)
		if err != nil {
			httpx.WriteError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Geçerli bir date parametresi gönderilmelidir (YYYY-MM-DD).", nil)
			return
		}
		date = parsed
	}
	summary, found := h.dashboard.ClassSummary(r.Context(), principal.TenantID, r.PathValue("classId"), date)
	if !found {
		httpx.WriteError(w, http.StatusNotFound, "CLASS_NOT_FOUND", "Sınıf bulunamadı.", nil)
		return
	}
	httpx.WriteJSON(w, http.StatusOK, summary, nil)
}

func (h *Handler) superAdminOverview(w http.ResponseWriter, r *http.Request) {
	if _, ok := requireSuperAdmin(w, r); !ok {
		return
	}
	overview, err := h.superAdmin.Overview(r.Context())
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "SUPER_ADMIN_OVERVIEW_FAILED", "Genel durum verisi alınamadı.", nil)
		return
	}
	httpx.WriteJSON(w, http.StatusOK, overview, nil)
}

func (h *Handler) superAdminSystemMetrics(w http.ResponseWriter, r *http.Request) {
	if _, ok := requireSuperAdmin(w, r); !ok {
		return
	}
	metrics, err := h.superAdmin.SystemMetrics(r.Context())
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "SYSTEM_METRICS_FAILED", "Sistem metrikleri alınamadı.", nil)
		return
	}
	httpx.WriteJSON(w, http.StatusOK, metrics, nil)
}

func (h *Handler) superAdminInstitutions(w http.ResponseWriter, r *http.Request) {
	if _, ok := requireSuperAdmin(w, r); !ok {
		return
	}
	institutions, err := h.superAdmin.Institutions(r.Context())
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "INSTITUTIONS_FAILED", "Kurumlar alınamadı.", nil)
		return
	}
	httpx.WriteJSON(w, http.StatusOK, institutions, nil)
}

func (h *Handler) createSuperAdminInstitution(w http.ResponseWriter, r *http.Request) {
	principal, ok := requireSuperAdmin(w, r)
	if !ok {
		return
	}
	var input superadminDomain.CreateInstitutionInput
	if err := httpx.DecodeJSON(r, &input); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Kurum bilgileri okunamadı.", nil)
		return
	}
	institution, err := h.superAdmin.CreateInstitution(r.Context(), principal, input)
	if errors.Is(err, superadminapp.ErrInvalidInstitution) {
		httpx.WriteError(w, http.StatusBadRequest, "INVALID_INSTITUTION", "Kurum adı zorunludur.", nil)
		return
	}
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "INSTITUTION_CREATE_FAILED", "Kurum oluşturulamadı.", nil)
		return
	}
	httpx.WriteJSON(w, http.StatusCreated, institution, nil)
}

func (h *Handler) superAdminInstitution(w http.ResponseWriter, r *http.Request) {
	if _, ok := requireSuperAdmin(w, r); !ok {
		return
	}
	institution, found, err := h.superAdmin.Institution(r.Context(), r.PathValue("id"))
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "INSTITUTION_FAILED", "Kurum bilgisi alınamadı.", nil)
		return
	}
	if !found {
		httpx.WriteError(w, http.StatusNotFound, "INSTITUTION_NOT_FOUND", "Kurum bulunamadı.", nil)
		return
	}
	httpx.WriteJSON(w, http.StatusOK, institution, nil)
}

func (h *Handler) updateSuperAdminInstitutionModules(w http.ResponseWriter, r *http.Request) {
	principal, ok := requireSuperAdmin(w, r)
	if !ok {
		return
	}
	var input superadminDomain.UpdateInstitutionModulesInput
	if err := httpx.DecodeJSON(r, &input); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Modül listesi okunamadı.", nil)
		return
	}
	institution, found, err := h.superAdmin.UpdateInstitutionModules(r.Context(), principal, r.PathValue("id"), input)
	if errors.Is(err, superadminapp.ErrInvalidInstitution) {
		httpx.WriteError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Geçerli modül listesi gerekli.", nil)
		return
	}
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "INSTITUTION_MODULES_FAILED", "Kurum modülleri güncellenemedi.", nil)
		return
	}
	if !found {
		httpx.WriteError(w, http.StatusNotFound, "INSTITUTION_NOT_FOUND", "Kurum bulunamadı.", nil)
		return
	}
	httpx.WriteJSON(w, http.StatusOK, institution, nil)
}

func (h *Handler) principalTeachers(w http.ResponseWriter, r *http.Request) {
	principal, ok := requirePrincipal(w, r)
	if !ok {
		return
	}
	if principal.Role != identity.RolePrincipal && principal.Role != identity.RoleSystemAdmin && principal.Role != identity.RoleSuperAdmin {
		httpx.WriteError(w, http.StatusForbidden, "FORBIDDEN", "Bu işlem için yetkiniz yok.", nil)
		return
	}
	users, err := h.superAdmin.InstitutionUsers(r.Context(), principal.TenantID)
	if errors.Is(err, superadminapp.ErrInstitutionNotFound) {
		httpx.WriteError(w, http.StatusNotFound, "INSTITUTION_NOT_FOUND", "Kurum bulunamadı.", nil)
		return
	}
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "TEACHERS_FAILED", "Öğretmenler alınamadı.", nil)
		return
	}
	teachers := make([]superadminDomain.UserAccount, 0, len(users))
	for _, user := range users {
		if user.Role == string(identity.RoleTeacher) && user.Status == "active" {
			teachers = append(teachers, user)
		}
	}
	httpx.WriteJSON(w, http.StatusOK, teachers, nil)
}

func (h *Handler) principalSchoolRoster(w http.ResponseWriter, r *http.Request) {
	principal, ok := requirePrincipal(w, r)
	if !ok {
		return
	}
	if principal.Role != identity.RolePrincipal && principal.Role != identity.RoleSystemAdmin && principal.Role != identity.RoleSuperAdmin {
		httpx.WriteError(w, http.StatusForbidden, "FORBIDDEN", "Bu işlem için yetkiniz yok.", nil)
		return
	}
	roster, err := h.school.PrincipalRoster(r.Context(), principal.TenantID)
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "ROSTER_FAILED", "Okul listesi alınamadı.", nil)
		return
	}
	httpx.WriteJSON(w, http.StatusOK, roster, nil)
}

func (h *Handler) superAdminInstitutionUsers(w http.ResponseWriter, r *http.Request) {
	if _, ok := requireSuperAdmin(w, r); !ok {
		return
	}
	users, err := h.superAdmin.InstitutionUsers(r.Context(), r.PathValue("id"))
	if errors.Is(err, superadminapp.ErrInstitutionNotFound) {
		httpx.WriteError(w, http.StatusNotFound, "INSTITUTION_NOT_FOUND", "Kurum bulunamadı.", nil)
		return
	}
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "INSTITUTION_USERS_FAILED", "Kurum kullanıcıları alınamadı.", nil)
		return
	}
	httpx.WriteJSON(w, http.StatusOK, users, nil)
}

func (h *Handler) createSuperAdminInstitutionUser(w http.ResponseWriter, r *http.Request) {
	principal, ok := requireSuperAdmin(w, r)
	if !ok {
		return
	}
	var input superadminDomain.CreateInstitutionUserInput
	if err := httpx.DecodeJSON(r, &input); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Kullanıcı bilgileri okunamadı.", nil)
		return
	}
	credential, err := h.superAdmin.CreateInstitutionUser(r.Context(), principal, r.PathValue("id"), input)
	if errors.Is(err, superadminapp.ErrInstitutionNotFound) {
		httpx.WriteError(w, http.StatusNotFound, "INSTITUTION_NOT_FOUND", "Kurum bulunamadı.", nil)
		return
	}
	if errors.Is(err, superadminapp.ErrInvalidUser) {
		httpx.WriteError(w, http.StatusBadRequest, "INVALID_USER", "Geçerli e-posta ve rol gönderilmelidir.", nil)
		return
	}
	if errors.Is(err, superadminapp.ErrUserAlreadyExists) {
		httpx.WriteError(w, http.StatusConflict, "USER_ALREADY_EXISTS", "Bu e-posta adresiyle kullanıcı zaten var.", nil)
		return
	}
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "INSTITUTION_USER_CREATE_FAILED", "Kullanıcı oluşturulamadı.", nil)
		return
	}
	httpx.WriteJSON(w, http.StatusCreated, credential, nil)
}

func (h *Handler) superAdminUsers(w http.ResponseWriter, r *http.Request) {
	if _, ok := requireSuperAdmin(w, r); !ok {
		return
	}
	users, err := h.superAdmin.Users(r.Context())
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "USERS_FAILED", "Kullanıcılar alınamadı.", nil)
		return
	}
	httpx.WriteJSON(w, http.StatusOK, users, nil)
}

func (h *Handler) createSuperAdminUser(w http.ResponseWriter, r *http.Request) {
	principal, ok := requireSuperAdmin(w, r)
	if !ok {
		return
	}
	var input superadminDomain.CreateUserInput
	if err := httpx.DecodeJSON(r, &input); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Kullanıcı bilgileri okunamadı.", nil)
		return
	}
	credential, err := h.superAdmin.CreateUser(r.Context(), principal, input)
	if errors.Is(err, superadminapp.ErrInstitutionNotFound) {
		httpx.WriteError(w, http.StatusNotFound, "INSTITUTION_NOT_FOUND", "Kurum bulunamadı.", nil)
		return
	}
	if errors.Is(err, superadminapp.ErrInvalidUser) {
		httpx.WriteError(w, http.StatusBadRequest, "INVALID_USER", "Geçerli kurum, e-posta ve rol gönderilmelidir.", nil)
		return
	}
	if errors.Is(err, superadminapp.ErrUserAlreadyExists) {
		httpx.WriteError(w, http.StatusConflict, "USER_ALREADY_EXISTS", "Bu e-posta adresiyle kullanıcı zaten var.", nil)
		return
	}
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "USER_CREATE_FAILED", "Kullanıcı oluşturulamadı.", nil)
		return
	}
	httpx.WriteJSON(w, http.StatusCreated, credential, nil)
}

func (h *Handler) updateSuperAdminUser(w http.ResponseWriter, r *http.Request) {
	principal, ok := requireSuperAdmin(w, r)
	if !ok {
		return
	}
	var input superadminDomain.UpdateUserInput
	if err := httpx.DecodeJSON(r, &input); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Kullanıcı bilgileri okunamadı.", nil)
		return
	}
	user, found, err := h.superAdmin.UpdateUser(r.Context(), principal, r.PathValue("id"), input)
	if errors.Is(err, superadminapp.ErrInstitutionNotFound) {
		httpx.WriteError(w, http.StatusNotFound, "INSTITUTION_NOT_FOUND", "Kurum bulunamadı.", nil)
		return
	}
	if errors.Is(err, superadminapp.ErrInvalidUser) {
		httpx.WriteError(w, http.StatusBadRequest, "INVALID_USER", "Geçerli kullanıcı bilgileri gönderilmelidir.", nil)
		return
	}
	if errors.Is(err, superadminapp.ErrUserAlreadyExists) {
		httpx.WriteError(w, http.StatusConflict, "USER_ALREADY_EXISTS", "Bu e-posta adresi başka bir kullanıcıda kullanılıyor.", nil)
		return
	}
	if errors.Is(err, superadminapp.ErrProtectedUser) {
		httpx.WriteError(w, http.StatusForbidden, "PROTECTED_USER", "Süper admin hesabı bu ekrandan değiştirilemez.", nil)
		return
	}
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "USER_UPDATE_FAILED", "Kullanıcı güncellenemedi.", nil)
		return
	}
	if !found {
		httpx.WriteError(w, http.StatusNotFound, "USER_NOT_FOUND", "Kullanıcı bulunamadı.", nil)
		return
	}
	httpx.WriteJSON(w, http.StatusOK, user, nil)
}

func (h *Handler) deleteSuperAdminUser(w http.ResponseWriter, r *http.Request) {
	principal, ok := requireSuperAdmin(w, r)
	if !ok {
		return
	}
	user, found, err := h.superAdmin.DeleteUser(r.Context(), principal, r.PathValue("id"), r.URL.Query().Get("tenantId"))
	if errors.Is(err, superadminapp.ErrInvalidUser) {
		httpx.WriteError(w, http.StatusBadRequest, "INVALID_USER", "tenantId zorunludur.", nil)
		return
	}
	if errors.Is(err, superadminapp.ErrProtectedUser) {
		httpx.WriteError(w, http.StatusForbidden, "PROTECTED_USER", "Süper admin hesabı silinemez.", nil)
		return
	}
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "USER_DELETE_FAILED", "Kullanıcı silinemedi.", nil)
		return
	}
	if !found {
		httpx.WriteError(w, http.StatusNotFound, "USER_NOT_FOUND", "Kullanıcı bulunamadı.", nil)
		return
	}
	httpx.WriteJSON(w, http.StatusOK, user, nil)
}

func (h *Handler) superAdminAuditLogs(w http.ResponseWriter, r *http.Request) {
	if _, ok := requireSuperAdmin(w, r); !ok {
		return
	}
	query := superadminDomain.AuditLogQuery{
		TenantID:     strings.TrimSpace(r.URL.Query().Get("tenantId")),
		Action:       strings.TrimSpace(r.URL.Query().Get("action")),
		ActorID:      strings.TrimSpace(r.URL.Query().Get("actorId")),
		ActorRole:    strings.TrimSpace(r.URL.Query().Get("actorRole")),
		ResourceType: strings.TrimSpace(r.URL.Query().Get("resourceType")),
		Sensitivity:  strings.TrimSpace(r.URL.Query().Get("sensitivity")),
		Search:       strings.TrimSpace(r.URL.Query().Get("search")),
		Limit:        parsePositiveLimit(r.URL.Query().Get("limit"), 100),
	}
	auditLogs, err := h.superAdmin.AuditLogs(r.Context(), query)
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "AUDIT_LOGS_FAILED", "Loglar alınamadı.", nil)
		return
	}
	httpx.WriteJSON(w, http.StatusOK, auditLogs, nil)
}

func (h *Handler) purgeSuperAdminAuditLogs(w http.ResponseWriter, r *http.Request) {
	principal, ok := requireSuperAdmin(w, r)
	if !ok {
		return
	}
	olderThanDays, err := parsePositiveIntParam(r.URL.Query().Get("olderThanDays"), 30)
	if err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Silme süresi okunamadı.", nil)
		return
	}
	if olderThanDays < 1 {
		olderThanDays = 1
	}
	if olderThanDays > 3650 {
		olderThanDays = 3650
	}
	cutoff := h.clock().UTC().Add(-time.Duration(olderThanDays) * 24 * time.Hour)
	tenantID := strings.TrimSpace(r.URL.Query().Get("tenantId"))
	result, purgeErr := h.superAdmin.PurgeAuditLogs(r.Context(), principal, cutoff, tenantID)
	if purgeErr != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "AUDIT_PURGE_FAILED", "Loglar temizlenemedi.", nil)
		return
	}
	httpx.WriteJSON(w, http.StatusOK, result, nil)
}

func parsePositiveLimit(raw string, fallback int) int {
	value, err := parsePositiveIntParam(raw, fallback)
	if err != nil {
		return fallback
	}
	if value > 250 {
		return 250
	}
	return value
}

func parsePositiveIntParam(raw string, fallback int) (int, error) {
	trimmed := strings.TrimSpace(raw)
	if trimmed == "" {
		return fallback, nil
	}
	value, err := strconv.Atoi(trimmed)
	if err != nil {
		return 0, err
	}
	return value, nil
}

func (h *Handler) superAdminSettings(w http.ResponseWriter, r *http.Request) {
	if _, ok := requireSuperAdmin(w, r); !ok {
		return
	}
	settings, err := h.superAdmin.Settings(r.Context())
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "SETTINGS_FAILED", "Ayarlar alınamadı.", nil)
		return
	}
	httpx.WriteJSON(w, http.StatusOK, settings, nil)
}

func (h *Handler) updateSuperAdminSettings(w http.ResponseWriter, r *http.Request) {
	principal, ok := requireSuperAdmin(w, r)
	if !ok {
		return
	}
	var input superadminDomain.UpdatePlatformSettingsInput
	if err := httpx.DecodeJSON(r, &input); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Ayar bilgileri okunamadı.", nil)
		return
	}
	settings, err := h.superAdmin.UpdateSettings(r.Context(), principal, input)
	if errors.Is(err, superadminapp.ErrInvalidSettings) {
		httpx.WriteError(w, http.StatusBadRequest, "INVALID_SETTINGS", "Ayar anahtarları veya bakım mesajı geçersiz.", nil)
		return
	}
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "SETTINGS_UPDATE_FAILED", "Ayarlar güncellenemedi.", nil)
		return
	}
	httpx.WriteJSON(w, http.StatusOK, settings, nil)
}

func (h *Handler) mySupportTickets(w http.ResponseWriter, r *http.Request) {
	principal, ok := requirePrincipal(w, r)
	if !ok {
		return
	}
	tickets, err := h.superAdmin.MySupportTickets(r.Context(), principal)
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "SUPPORT_TICKETS_FAILED", "Destek talepleri alınamadı.", nil)
		return
	}
	httpx.WriteJSON(w, http.StatusOK, tickets, nil)
}

func (h *Handler) createSupportTicket(w http.ResponseWriter, r *http.Request) {
	principal, ok := requirePrincipal(w, r)
	if !ok {
		return
	}
	var input superadminDomain.CreateSupportTicketInput
	if err := httpx.DecodeJSON(r, &input); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Destek talebi okunamadı.", nil)
		return
	}
	ticket, err := h.superAdmin.CreateSupportTicket(r.Context(), principal, input)
	if errors.Is(err, superadminapp.ErrInvalidSupportTicket) {
		httpx.WriteError(w, http.StatusBadRequest, "INVALID_SUPPORT_TICKET", "Talep türü, konu ve mesaj alanları geçerli olmalıdır.", nil)
		return
	}
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "SUPPORT_TICKET_CREATE_FAILED", "Destek talebi oluşturulamadı.", nil)
		return
	}
	httpx.WriteJSON(w, http.StatusCreated, ticket, nil)
}

func (h *Handler) superAdminSupportTickets(w http.ResponseWriter, r *http.Request) {
	if _, ok := requireSuperAdmin(w, r); !ok {
		return
	}
	tickets, err := h.superAdmin.SupportTickets(r.Context())
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "SUPPORT_TICKETS_FAILED", "Destek talepleri alınamadı.", nil)
		return
	}
	httpx.WriteJSON(w, http.StatusOK, tickets, nil)
}

func (h *Handler) updateSuperAdminSupportTicket(w http.ResponseWriter, r *http.Request) {
	principal, ok := requireSuperAdmin(w, r)
	if !ok {
		return
	}
	var input superadminDomain.UpdateSupportTicketInput
	if err := httpx.DecodeJSON(r, &input); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Destek talebi güncellemesi okunamadı.", nil)
		return
	}
	ticket, found, err := h.superAdmin.UpdateSupportTicket(r.Context(), principal, r.PathValue("id"), input)
	if errors.Is(err, superadminapp.ErrInvalidSupportTicket) {
		httpx.WriteError(w, http.StatusBadRequest, "INVALID_SUPPORT_TICKET", "Talep durumu, önceliği veya not alanı geçersiz.", nil)
		return
	}
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "SUPPORT_TICKET_UPDATE_FAILED", "Destek talebi güncellenemedi.", nil)
		return
	}
	if !found {
		httpx.WriteError(w, http.StatusNotFound, "SUPPORT_TICKET_NOT_FOUND", "Destek talebi bulunamadı.", nil)
		return
	}
	h.dispatchPush(func(ctx context.Context) {
		h.pushSupportTicketUpdate(ctx, ticket)
	})
	httpx.WriteJSON(w, http.StatusOK, ticket, nil)
}

func (h *Handler) currentSchedule(w http.ResponseWriter, r *http.Request) {
	principal, ok := requirePrincipal(w, r)
	if !ok {
		return
	}
	schedule, found := h.scheduling.CurrentSchedule(r.Context(), principal.TenantID)
	if !found {
		httpx.WriteError(w, http.StatusNotFound, "SCHEDULE_NOT_FOUND", "Aktif ders programı bulunamadı.", nil)
		return
	}
	httpx.WriteJSON(w, http.StatusOK, schedule, nil)
}

func (h *Handler) listSchedulingRequirements(w http.ResponseWriter, r *http.Request) {
	principal, ok := requirePrincipalRole(w, r, identity.RolePrincipal, identity.RoleSystemAdmin)
	if !ok {
		return
	}
	httpx.WriteJSON(w, http.StatusOK, h.scheduling.ListRequirements(r.Context(), principal.TenantID), nil)
}

func (h *Handler) saveSchedulingRequirements(w http.ResponseWriter, r *http.Request) {
	principal, ok := requirePrincipalRole(w, r, identity.RolePrincipal, identity.RoleSystemAdmin)
	if !ok {
		return
	}
	var items []schedulingDomain.RequirementInput
	if err := httpx.DecodeJSON(r, &items); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Ders saat ihtiyaçları okunamadı.", nil)
		return
	}
	saved, err := h.scheduling.SaveRequirements(r.Context(), principal.TenantID, items)
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "REQUIREMENTS_SAVE_FAILED", "Ders saat ihtiyaçları kaydedilemedi.", nil)
		return
	}
	httpx.WriteJSON(w, http.StatusOK, saved, nil)
}

func (h *Handler) listTeacherAvailabilities(w http.ResponseWriter, r *http.Request) {
	principal, ok := requirePrincipalRole(w, r, identity.RolePrincipal, identity.RoleSystemAdmin)
	if !ok {
		return
	}
	httpx.WriteJSON(w, http.StatusOK, h.scheduling.ListTeacherAvailabilities(r.Context(), principal.TenantID), nil)
}

func (h *Handler) saveTeacherAvailabilities(w http.ResponseWriter, r *http.Request) {
	principal, ok := requirePrincipalRole(w, r, identity.RolePrincipal, identity.RoleSystemAdmin)
	if !ok {
		return
	}
	var items []schedulingDomain.AvailabilityInput
	if err := httpx.DecodeJSON(r, &items); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Öğretmen müsaitlikleri okunamadı.", nil)
		return
	}
	saved, err := h.scheduling.SaveTeacherAvailabilities(r.Context(), principal.TenantID, items)
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "AVAILABILITIES_SAVE_FAILED", "Öğretmen müsaitlikleri kaydedilemedi.", nil)
		return
	}
	httpx.WriteJSON(w, http.StatusOK, saved, nil)
}

func (h *Handler) getSchedule(w http.ResponseWriter, r *http.Request) {
	principal, ok := requirePrincipal(w, r)
	if !ok {
		return
	}
	schedule, found := h.scheduling.GetSchedule(r.Context(), principal.TenantID, r.PathValue("id"))
	if !found {
		httpx.WriteError(w, http.StatusNotFound, "SCHEDULE_NOT_FOUND", "Ders programı bulunamadı.", nil)
		return
	}
	httpx.WriteJSON(w, http.StatusOK, schedule, nil)
}

func (h *Handler) generateSchedule(w http.ResponseWriter, r *http.Request) {
	principal, ok := requirePrincipalRole(w, r, identity.RolePrincipal, identity.RoleSystemAdmin)
	if !ok {
		return
	}
	result := h.scheduling.GenerateDraft(r.Context(), principal.TenantID)
	httpx.WriteJSON(w, http.StatusCreated, result, nil)
}

func (h *Handler) updateScheduleLesson(w http.ResponseWriter, r *http.Request) {
	principal, ok := requirePrincipalRole(w, r, identity.RolePrincipal, identity.RoleSystemAdmin)
	if !ok {
		return
	}
	var input schedulingDomain.UpdateLessonInput
	if err := httpx.DecodeJSON(r, &input); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Ders güncellemesi okunamadı.", nil)
		return
	}
	lesson, found, err := h.scheduling.UpdateLesson(r.Context(), principal.TenantID, r.PathValue("id"), r.PathValue("lessonId"), principal.UserID, input)
	if err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "LESSON_UPDATE_FAILED", "Ders güncellenemedi.", nil)
		return
	}
	if !found {
		httpx.WriteError(w, http.StatusNotFound, "LESSON_NOT_FOUND", "Ders bloğu bulunamadı.", nil)
		return
	}
	httpx.WriteJSON(w, http.StatusOK, lesson, nil)
}

func (h *Handler) validateSchedule(w http.ResponseWriter, r *http.Request) {
	principal, ok := requirePrincipalRole(w, r, identity.RolePrincipal, identity.RoleSystemAdmin)
	if !ok {
		return
	}
	httpx.WriteJSON(w, http.StatusOK, h.scheduling.ValidateSchedule(r.Context(), principal.TenantID, r.PathValue("id")), nil)
}

func (h *Handler) publishSchedule(w http.ResponseWriter, r *http.Request) {
	principal, ok := requirePrincipalRole(w, r, identity.RolePrincipal, identity.RoleSystemAdmin)
	if !ok {
		return
	}
	schedule, found, err := h.scheduling.PublishSchedule(r.Context(), principal.TenantID, r.PathValue("id"), principal.UserID)
	if err != nil {
		httpx.WriteError(w, http.StatusConflict, "SCHEDULE_PUBLISH_FAILED", "Program yayınlanamadı; doğrulama hatalarını giderin.", nil)
		return
	}
	if !found {
		httpx.WriteError(w, http.StatusNotFound, "SCHEDULE_NOT_FOUND", "Ders programı bulunamadı.", nil)
		return
	}
	h.dispatchPush(func(ctx context.Context) {
		h.pushSchedulePublished(ctx, principal.TenantID)
	})
	httpx.WriteJSON(w, http.StatusOK, schedule, nil)
}

func (h *Handler) teacherCalendar(w http.ResponseWriter, r *http.Request) {
	principal, ok := requirePrincipal(w, r)
	if !ok {
		return
	}
	httpx.WriteJSON(w, http.StatusOK, h.scheduling.TeacherCalendar(r.Context(), principal.TenantID, principal.UserID), nil)
}

func (h *Handler) teacherStudents(w http.ResponseWriter, r *http.Request) {
	principal, ok := requirePrincipalRole(w, r, identity.RoleTeacher)
	if !ok {
		return
	}
	items, err := h.school.ListStudentsForTeacher(r.Context(), principal.TenantID, principal.UserID)
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Öğretmen öğrenci listesi alınamadı.", nil)
		return
	}
	httpx.WriteJSON(w, http.StatusOK, items, nil)
}

func (h *Handler) currentLesson(w http.ResponseWriter, r *http.Request) {
	principal, ok := requirePrincipal(w, r)
	if !ok {
		return
	}
	lesson, found := h.scheduling.ActiveLessonForTeacher(r.Context(), principal.TenantID, principal.UserID, h.clock())
	if !found {
		httpx.WriteJSON(w, http.StatusOK, attendanceDomain.CurrentLesson{
			Found:  false,
			Reason: "Yayınlanmış programa göre şu anda aktif ders bulunamadı.",
		}, nil)
		return
	}
	httpx.WriteJSON(w, http.StatusOK, attendanceDomain.CurrentLesson{Found: true, Lesson: lesson}, nil)
}

func (h *Handler) createAttendanceSession(w http.ResponseWriter, r *http.Request) {
	principal, ok := requirePrincipal(w, r)
	if !ok {
		return
	}
	var request struct {
		LessonID string `json:"lessonId"`
	}
	if err := httpx.DecodeJSON(r, &request); err != nil || request.LessonID == "" {
		httpx.WriteError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Geçerli bir lessonId gönderilmelidir.", nil)
		return
	}
	if _, ok := h.teacherLessonInAttendanceWindow(w, r, principal, request.LessonID); !ok {
		return
	}
	session, found := h.attendance.GetOrCreateSession(r.Context(), principal.TenantID, request.LessonID, principal.UserID)
	if !found {
		httpx.WriteError(w, http.StatusNotFound, "LESSON_NOT_FOUND", "Ders bloğu bulunamadı.", nil)
		return
	}
	httpx.WriteJSON(w, http.StatusCreated, session, nil)
}

func (h *Handler) getAttendanceSessionByLesson(w http.ResponseWriter, r *http.Request) {
	principal, ok := requirePrincipal(w, r)
	if !ok {
		return
	}
	lessonID := r.PathValue("lessonId")
	if _, ok := h.teacherLessonInAttendanceWindow(w, r, principal, lessonID); !ok {
		return
	}
	session, err := h.attendance.GetSessionByLesson(r.Context(), principal.TenantID, lessonID)
	if errors.Is(err, attendanceapp.ErrSessionNotFound) {
		httpx.WriteError(w, http.StatusNotFound, "ATTENDANCE_SESSION_NOT_FOUND", "Bu ders için yoklama oturumu bulunamadı.", nil)
		return
	}
	if err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "ATTENDANCE_SESSION_LOOKUP_FAILED", "Yoklama oturumu okunamadı.", nil)
		return
	}
	httpx.WriteJSON(w, http.StatusOK, session, nil)
}

func (h *Handler) getAttendanceSession(w http.ResponseWriter, r *http.Request) {
	principal, ok := requirePrincipal(w, r)
	if !ok {
		return
	}
	session, err := h.attendance.GetSession(r.Context(), principal.TenantID, r.PathValue("id"))
	if errors.Is(err, attendanceapp.ErrSessionNotFound) {
		httpx.WriteError(w, http.StatusNotFound, "ATTENDANCE_SESSION_NOT_FOUND", "Yoklama oturumu bulunamadı.", nil)
		return
	}
	if err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "ATTENDANCE_SESSION_LOOKUP_FAILED", "Yoklama oturumu okunamadı.", nil)
		return
	}
	if !h.attendanceSessionInWindow(w, r, principal, session) {
		return
	}
	httpx.WriteJSON(w, http.StatusOK, session, nil)
}

func (h *Handler) getAttendanceSessionVersion(w http.ResponseWriter, r *http.Request) {
	principal, ok := requirePrincipal(w, r)
	if !ok {
		return
	}
	session, err := h.attendance.GetSession(r.Context(), principal.TenantID, r.PathValue("id"))
	if errors.Is(err, attendanceapp.ErrSessionNotFound) {
		httpx.WriteError(w, http.StatusNotFound, "ATTENDANCE_SESSION_NOT_FOUND", "Yoklama oturumu bulunamadı.", nil)
		return
	}
	if err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "ATTENDANCE_SESSION_LOOKUP_FAILED", "Yoklama oturumu okunamadı.", nil)
		return
	}
	httpx.WriteJSON(w, http.StatusOK, map[string]any{
		"sessionId":   session.ID,
		"version":     attendanceSessionVersion(session),
		"finalizedAt": session.FinalizedAt,
	}, nil)
}

func (h *Handler) attendanceToday(w http.ResponseWriter, r *http.Request) {
	principal, ok := requirePrincipal(w, r)
	if !ok {
		return
	}
	if !h.canViewTenantAttendanceReport(principal) {
		httpx.WriteError(w, http.StatusForbidden, "FORBIDDEN", "Bu rapor yalnızca müdür ve sistem yöneticisi rollerine açıktır.", nil)
		return
	}
	date := h.clock()
	if raw := strings.TrimSpace(r.URL.Query().Get("date")); raw != "" {
		parsed, err := time.Parse("2006-01-02", raw)
		if err != nil {
			httpx.WriteError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Geçerli bir date parametresi gönderilmelidir (YYYY-MM-DD).", nil)
			return
		}
		date = parsed
	}
	httpx.WriteJSON(w, http.StatusOK, h.attendance.DayReport(r.Context(), principal.TenantID, date), nil)
}

func (h *Handler) updateAttendanceRecords(w http.ResponseWriter, r *http.Request) {
	principal, ok := requirePrincipal(w, r)
	if !ok {
		return
	}
	var request struct {
		Records []attendanceDomain.RecordUpdate `json:"records"`
	}
	if err := httpx.DecodeJSON(r, &request); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Yoklama kayıtları okunamadı.", nil)
		return
	}
	current, err := h.attendance.GetSession(r.Context(), principal.TenantID, r.PathValue("id"))
	if errors.Is(err, attendanceapp.ErrSessionNotFound) {
		httpx.WriteError(w, http.StatusNotFound, "ATTENDANCE_SESSION_NOT_FOUND", "Yoklama oturumu bulunamadı.", nil)
		return
	}
	if err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "ATTENDANCE_SESSION_LOOKUP_FAILED", "Yoklama oturumu okunamadı.", nil)
		return
	}
	if !h.attendanceSessionInWindow(w, r, principal, current) {
		return
	}
	idempotencyKey := strings.TrimSpace(r.Header.Get("Idempotency-Key"))
	if idempotencyKey != "" {
		cacheKey := idempotencyCacheKey(principal.TenantID, r.PathValue("id"), idempotencyKey)
		if cached, ok := lookupIdempotentSession(cacheKey); ok {
			httpx.WriteJSON(w, http.StatusOK, cached, nil)
			return
		}
	}
	session, err := h.attendance.UpdateRecords(r.Context(), principal.TenantID, r.PathValue("id"), principal.UserID, request.Records)
	if errors.Is(err, attendanceapp.ErrSessionNotFound) {
		httpx.WriteError(w, http.StatusNotFound, "ATTENDANCE_SESSION_NOT_FOUND", "Yoklama oturumu bulunamadı.", nil)
		return
	}
	if errors.Is(err, attendanceapp.ErrSessionFinalized) {
		httpx.WriteError(w, http.StatusConflict, "ATTENDANCE_SESSION_FINALIZED", "Kesinleşmiş yoklama oturumu güncellenemez.", nil)
		return
	}
	if err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "ATTENDANCE_UPDATE_FAILED", "Yoklama kaydı güncellenemedi.", nil)
		return
	}
	if idempotencyKey != "" {
		cacheKey := idempotencyCacheKey(principal.TenantID, r.PathValue("id"), idempotencyKey)
		rememberIdempotentSession(cacheKey, session)
	}
	httpx.WriteJSON(w, http.StatusOK, session, nil)
}

func (h *Handler) finalizeAttendanceSession(w http.ResponseWriter, r *http.Request) {
	principal, ok := requirePrincipal(w, r)
	if !ok {
		return
	}
	current, err := h.attendance.GetSession(r.Context(), principal.TenantID, r.PathValue("id"))
	if errors.Is(err, attendanceapp.ErrSessionNotFound) {
		httpx.WriteError(w, http.StatusNotFound, "ATTENDANCE_SESSION_NOT_FOUND", "Yoklama oturumu bulunamadı.", nil)
		return
	}
	if err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "ATTENDANCE_SESSION_LOOKUP_FAILED", "Yoklama oturumu okunamadı.", nil)
		return
	}
	if !h.attendanceSessionInWindow(w, r, principal, current) {
		return
	}
	session, err := h.attendance.FinalizeSession(r.Context(), principal.TenantID, r.PathValue("id"), h.clock(), principal.UserID)
	if errors.Is(err, attendanceapp.ErrSessionNotFound) {
		httpx.WriteError(w, http.StatusNotFound, "ATTENDANCE_SESSION_NOT_FOUND", "Yoklama oturumu bulunamadı.", nil)
		return
	}
	if err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "ATTENDANCE_FINALIZE_FAILED", "Yoklama oturumu kesinleştirilemedi.", nil)
		return
	}
	h.dispatchPush(func(ctx context.Context) {
		h.pushAttendanceSession(ctx, principal.TenantID, session)
	})
	httpx.WriteJSON(w, http.StatusOK, session, nil)
}

func (h *Handler) reopenAttendanceSession(w http.ResponseWriter, r *http.Request) {
	principal, ok := requirePrincipal(w, r)
	if !ok {
		return
	}
	current, err := h.attendance.GetSession(r.Context(), principal.TenantID, r.PathValue("id"))
	if errors.Is(err, attendanceapp.ErrSessionNotFound) {
		httpx.WriteError(w, http.StatusNotFound, "ATTENDANCE_SESSION_NOT_FOUND", "Yoklama oturumu bulunamadı.", nil)
		return
	}
	if err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "ATTENDANCE_SESSION_LOOKUP_FAILED", "Yoklama oturumu okunamadı.", nil)
		return
	}
	if !h.attendanceSessionInWindow(w, r, principal, current) {
		return
	}
	session, err := h.attendance.ReopenSession(r.Context(), principal.TenantID, r.PathValue("id"), principal.UserID)
	if errors.Is(err, attendanceapp.ErrSessionNotFound) {
		httpx.WriteError(w, http.StatusNotFound, "ATTENDANCE_SESSION_NOT_FOUND", "Yoklama oturumu bulunamadı.", nil)
		return
	}
	if err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "ATTENDANCE_REOPEN_FAILED", "Yoklama oturumu düzenleme için açılamadı.", nil)
		return
	}
	httpx.WriteJSON(w, http.StatusOK, session, nil)
}

func (h *Handler) studentAttendanceSummary(w http.ResponseWriter, r *http.Request) {
	principal, ok := requirePrincipal(w, r)
	if !ok {
		return
	}
	studentID := r.PathValue("id")
	if !h.canViewStudentAttendanceSummary(r.Context(), principal, studentID) {
		httpx.WriteError(w, http.StatusForbidden, "FORBIDDEN", "Bu öğrencinin devamsızlık özetine erişim yetkiniz yok.", nil)
		return
	}
	summary, err := h.attendance.StudentSummary(r.Context(), principal.TenantID, studentID)
	if errors.Is(err, attendanceapp.ErrStudentNotFound) {
		httpx.WriteError(w, http.StatusNotFound, "STUDENT_NOT_FOUND", "Öğrenci bulunamadı.", nil)
		return
	}
	if err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "ATTENDANCE_SUMMARY_FAILED", "Devamsızlık özeti alınamadı.", nil)
		return
	}
	httpx.WriteJSON(w, http.StatusOK, summary, nil)
}

func (h *Handler) listObservations(w http.ResponseWriter, r *http.Request) {
	principal, ok := requirePrincipal(w, r)
	if !ok {
		return
	}
	items := h.filterObservationsForRole(r.Context(), principal, h.observation.List(r.Context(), principal.TenantID))
	if principal.Role == identity.RoleGuardian {
		httpx.WriteError(w, http.StatusForbidden, "FORBIDDEN", "Veli hesapları gözlem kayıtlarına erişemez.", nil)
		return
	}
	category := strings.TrimSpace(r.URL.Query().Get("category"))
	classFilter := strings.TrimSpace(strings.ToLower(r.URL.Query().Get("className")))
	dateFilter := strings.TrimSpace(r.URL.Query().Get("date"))
	if category != "" || classFilter != "" || dateFilter != "" {
		filtered := make([]observationDomain.Observation, 0, len(items))
		for _, item := range items {
			if category != "" && string(item.Category) != category {
				continue
			}
			if classFilter != "" && !strings.Contains(strings.ToLower(item.ClassName), classFilter) {
				continue
			}
			if dateFilter != "" && !strings.HasPrefix(item.CreatedAt.Format("2006-01-02"), dateFilter) {
				continue
			}
			filtered = append(filtered, item)
		}
		items = filtered
	}
	if principal.Role == identity.RoleGuidance {
		h.observation.RecordGuidanceViewAudit(r.Context(), principal.TenantID, principal.UserID, len(items))
	}
	httpx.WriteJSON(w, http.StatusOK, items, nil)
}

func (h *Handler) createObservation(w http.ResponseWriter, r *http.Request) {
	principal, ok := requirePrincipal(w, r)
	if !ok {
		return
	}
	var input observationDomain.CreateInput
	if err := httpx.DecodeJSON(r, &input); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Gözlem kaydı okunamadı.", nil)
		return
	}
	switch principal.Role {
	case identity.RoleTeacher:
		if !h.observation.TeacherCanObserveStudent(r.Context(), principal.TenantID, principal.UserID, input.StudentID) {
			httpx.WriteError(w, http.StatusForbidden, "STUDENT_OUT_OF_SCOPE", "Bu öğrenci için gözlem kaydı oluşturamazsınız.", nil)
			return
		}
	case identity.RoleGuidance:
		if h.guidance != nil && !h.guidance.CanAccessStudent(r.Context(), principal.TenantID, principal.UserID, input.StudentID) {
			httpx.WriteError(w, http.StatusForbidden, "STUDENT_OUT_OF_SCOPE", "Bu öğrenci için gözlem kaydı oluşturamazsınız.", nil)
			return
		}
	}
	created, err := h.observation.Create(r.Context(), principal.TenantID, principal.UserID, input)
	if errors.Is(err, observationapp.ErrInvalidObservation) {
		httpx.WriteError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Öğrenci, kategori ve not zorunludur.", nil)
		return
	}
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "OBSERVATION_CREATE_FAILED", "Gözlem kaydı oluşturulamadı.", nil)
		return
	}
	httpx.WriteJSON(w, http.StatusCreated, created, nil)
}

func (h *Handler) getObservation(w http.ResponseWriter, r *http.Request) {
	principal, ok := requirePrincipal(w, r)
	if !ok {
		return
	}
	item, err := h.observation.Get(r.Context(), principal.TenantID, r.PathValue("id"))
	if errors.Is(err, observationapp.ErrObservationNotFound) {
		httpx.WriteError(w, http.StatusNotFound, "OBSERVATION_NOT_FOUND", "Gözlem kaydı bulunamadı.", nil)
		return
	}
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "OBSERVATION_LOOKUP_FAILED", "Gözlem kaydı alınamadı.", nil)
		return
	}
	if !h.canReadObservation(r.Context(), principal, item) {
		httpx.WriteError(w, http.StatusForbidden, "FORBIDDEN", "Bu gözlem kaydına erişim yetkiniz yok.", nil)
		return
	}
	httpx.WriteJSON(w, http.StatusOK, item, nil)
}

func (h *Handler) updateObservation(w http.ResponseWriter, r *http.Request) {
	principal, ok := requirePrincipal(w, r)
	if !ok {
		return
	}
	current, err := h.observation.Get(r.Context(), principal.TenantID, r.PathValue("id"))
	if errors.Is(err, observationapp.ErrObservationNotFound) {
		httpx.WriteError(w, http.StatusNotFound, "OBSERVATION_NOT_FOUND", "Gözlem kaydı bulunamadı.", nil)
		return
	}
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "OBSERVATION_LOOKUP_FAILED", "Gözlem kaydı alınamadı.", nil)
		return
	}
	if !h.canModifyObservation(principal, current) {
		httpx.WriteError(w, http.StatusForbidden, "FORBIDDEN", "Bu gözlem kaydını güncelleme yetkiniz yok.", nil)
		return
	}
	var input observationDomain.UpdateInput
	if err := httpx.DecodeJSON(r, &input); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Gözlem güncellemesi okunamadı.", nil)
		return
	}
	updated, err := h.observation.Update(r.Context(), principal.TenantID, r.PathValue("id"), input)
	if errors.Is(err, observationapp.ErrInvalidObservation) {
		httpx.WriteError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Güncellenecek gözlem alanları geçerli olmalıdır.", nil)
		return
	}
	if errors.Is(err, observationapp.ErrObservationNotFound) {
		httpx.WriteError(w, http.StatusNotFound, "OBSERVATION_NOT_FOUND", "Gözlem kaydı bulunamadı.", nil)
		return
	}
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "OBSERVATION_UPDATE_FAILED", "Gözlem kaydı güncellenemedi.", nil)
		return
	}
	httpx.WriteJSON(w, http.StatusOK, updated, nil)
}

func (h *Handler) deleteObservation(w http.ResponseWriter, r *http.Request) {
	principal, ok := requirePrincipal(w, r)
	if !ok {
		return
	}
	current, err := h.observation.Get(r.Context(), principal.TenantID, r.PathValue("id"))
	if errors.Is(err, observationapp.ErrObservationNotFound) {
		httpx.WriteError(w, http.StatusNotFound, "OBSERVATION_NOT_FOUND", "Gözlem kaydı bulunamadı.", nil)
		return
	}
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "OBSERVATION_LOOKUP_FAILED", "Gözlem kaydı alınamadı.", nil)
		return
	}
	if !h.canModifyObservation(principal, current) {
		httpx.WriteError(w, http.StatusForbidden, "FORBIDDEN", "Bu gözlem kaydını silme yetkiniz yok.", nil)
		return
	}
	if err := h.observation.Delete(r.Context(), principal.TenantID, r.PathValue("id")); errors.Is(err, observationapp.ErrObservationNotFound) {
		httpx.WriteError(w, http.StatusNotFound, "OBSERVATION_NOT_FOUND", "Gözlem kaydı bulunamadı.", nil)
		return
	} else if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "OBSERVATION_DELETE_FAILED", "Gözlem kaydı silinemedi.", nil)
		return
	}
	httpx.WriteJSON(w, http.StatusNoContent, nil, nil)
}

func requirePrincipal(w http.ResponseWriter, r *http.Request) (identity.Principal, bool) {
	principal, ok := identity.PrincipalFromContext(r.Context())
	if !ok {
		httpx.WriteError(w, http.StatusUnauthorized, "UNAUTHENTICATED", "Oturum bilgisi bulunamadı.", nil)
		return identity.Principal{}, false
	}
	return principal, true
}

func requireSuperAdmin(w http.ResponseWriter, r *http.Request) (identity.Principal, bool) {
	principal, ok := requirePrincipal(w, r)
	if !ok {
		return identity.Principal{}, false
	}
	if principal.Role != identity.RoleSuperAdmin {
		httpx.WriteError(w, http.StatusForbidden, "FORBIDDEN", "Bu alan yalnızca süper admin yetkisine açıktır.", nil)
		return identity.Principal{}, false
	}
	return principal, true
}

func (h *Handler) forgotPassword(w http.ResponseWriter, r *http.Request) {
	var input identity.PasswordForgotInput
	if err := httpx.DecodeJSON(r, &input); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "VALIDATION_ERROR", "E-posta bilgisi okunamadı.", nil)
		return
	}
	result, err := h.identity.ForgotPassword(r.Context(), input)
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "PASSWORD_FORGOT_FAILED", "Şifre sıfırlama isteği işlenemedi.", nil)
		return
	}
	httpx.WriteJSON(w, http.StatusOK, result, nil)
}

func (h *Handler) resetPassword(w http.ResponseWriter, r *http.Request) {
	var input identity.PasswordResetInput
	if err := httpx.DecodeJSON(r, &input); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Şifre sıfırlama bilgisi okunamadı.", nil)
		return
	}
	if err := h.identity.ResetPassword(r.Context(), input); errors.Is(err, identityapp.ErrWeakPassword) {
		httpx.WriteError(w, http.StatusBadRequest, "WEAK_PASSWORD", "Şifre en az 8 karacter olmalıdır.", nil)
		return
	} else if errors.Is(err, identityapp.ErrInvalidResetToken) {
		httpx.WriteError(w, http.StatusBadRequest, "INVALID_RESET_TOKEN", "Geçersiz veya süresi dolmuş sıfırlama bağlantısı.", nil)
		return
	} else if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "PASSWORD_RESET_FAILED", "Şifre sıfırlanamadı.", nil)
		return
	}
	httpx.WriteJSON(w, http.StatusOK, map[string]string{"message": "Şifreniz güncellendi. Giriş yapabilirsiniz."}, nil)
}

func (h *Handler) userNotifications(w http.ResponseWriter, r *http.Request) {
	principal, ok := requirePrincipal(w, r)
	if !ok {
		return
	}
	httpx.WriteJSON(w, http.StatusOK, h.guardian.ListNotifications(r.Context(), principal.TenantID, principal.UserID), nil)
}

func (h *Handler) userNotificationRead(w http.ResponseWriter, r *http.Request) {
	principal, ok := requirePrincipal(w, r)
	if !ok {
		return
	}
	notification, err := h.guardian.MarkNotificationRead(r.Context(), principal.TenantID, principal.UserID, r.PathValue("id"))
	if errors.Is(err, guardianapp.ErrNotificationNotFound) {
		httpx.WriteError(w, http.StatusNotFound, "NOTIFICATION_NOT_FOUND", "Bildirim bulunamadı.", nil)
		return
	}
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "NOTIFICATION_READ_FAILED", "Bildirim güncellenemedi.", nil)
		return
	}
	httpx.WriteJSON(w, http.StatusOK, notification, nil)
}

func (h *Handler) userNotificationDelete(w http.ResponseWriter, r *http.Request) {
	principal, ok := requirePrincipal(w, r)
	if !ok {
		return
	}
	err := h.guardian.DeleteNotification(r.Context(), principal.TenantID, principal.UserID, r.PathValue("id"))
	if errors.Is(err, guardianapp.ErrNotificationNotFound) {
		httpx.WriteError(w, http.StatusNotFound, "NOTIFICATION_NOT_FOUND", "Bildirim bulunamadı.", nil)
		return
	}
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "NOTIFICATION_DELETE_FAILED", "Bildirim silinemedi.", nil)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *Handler) provisionPrincipalTeacher(w http.ResponseWriter, r *http.Request) {
	principal, ok := requireSchoolOperator(w, r)
	if !ok {
		return
	}
	var input schoolDomain.ProvisionTeacherInput
	if err := httpx.DecodeJSON(r, &input); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Öğretmen bilgileri okunamadı.", nil)
		return
	}
	result, err := h.school.ProvisionTeacher(r.Context(), principal.TenantID, input)
	if errors.Is(err, schoolapp.ErrInvalidInput) {
		httpx.WriteError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Geçerli ad, soyad ve e-posta gönderilmelidir.", nil)
		return
	}
	if errors.Is(err, schoolapp.ErrDuplicateEmail) {
		httpx.WriteError(w, http.StatusConflict, "EMAIL_ALREADY_EXISTS", "Bu e-posta adresi zaten kayıtlı.", nil)
		return
	}
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "TEACHER_PROVISION_FAILED", "Öğretmen oluşturulamadı.", nil)
		return
	}
	httpx.WriteJSON(w, http.StatusCreated, result, nil)
}

func (h *Handler) provisionPrincipalGuardian(w http.ResponseWriter, r *http.Request) {
	principal, ok := requireSchoolOperator(w, r)
	if !ok {
		return
	}
	var input schoolDomain.ProvisionGuardianInput
	if err := httpx.DecodeJSON(r, &input); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Veli bilgileri okunamadı.", nil)
		return
	}
	result, err := h.school.ProvisionGuardian(r.Context(), principal.TenantID, input)
	if errors.Is(err, schoolapp.ErrInvalidInput) {
		httpx.WriteError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Geçerli ad, e-posta ve en az bir öğrenci gönderilmelidir.", nil)
		return
	}
	if errors.Is(err, schoolapp.ErrDuplicateEmail) {
		httpx.WriteError(w, http.StatusConflict, "EMAIL_ALREADY_EXISTS", "Bu e-posta adresi zaten kayıtlı.", nil)
		return
	}
	if errors.Is(err, schoolapp.ErrStudentNotFound) {
		httpx.WriteError(w, http.StatusNotFound, "STUDENT_NOT_FOUND", "Bağlanacak öğrenci bulunamadı.", nil)
		return
	}
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "GUARDIAN_PROVISION_FAILED", "Veli oluşturulamadı.", nil)
		return
	}
	httpx.WriteJSON(w, http.StatusCreated, result, nil)
}

func (h *Handler) provisionPrincipalServiceDriver(w http.ResponseWriter, r *http.Request) {
	principal, ok := requireSchoolOperator(w, r)
	if !ok {
		return
	}
	var input schoolDomain.ProvisionServiceDriverInput
	if err := httpx.DecodeJSON(r, &input); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Şoför bilgileri okunamadı.", nil)
		return
	}
	result, err := h.school.ProvisionServiceDriver(r.Context(), principal.TenantID, input)
	if errors.Is(err, schoolapp.ErrInvalidInput) {
		httpx.WriteError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Geçerli ad, soyad ve e-posta gönderilmelidir.", nil)
		return
	}
	if errors.Is(err, schoolapp.ErrDuplicateEmail) {
		httpx.WriteError(w, http.StatusConflict, "EMAIL_ALREADY_EXISTS", "Bu e-posta adresi zaten kayıtlı.", nil)
		return
	}
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "DRIVER_PROVISION_FAILED", "Şoför oluşturulamadı.", nil)
		return
	}
	httpx.WriteJSON(w, http.StatusCreated, result, nil)
}

func (h *Handler) resetTeacherPassword(w http.ResponseWriter, r *http.Request) {
	principal, ok := requireSchoolOperator(w, r)
	if !ok {
		return
	}
	tempPassword, err := h.school.ResetTeacherPassword(r.Context(), principal.TenantID, r.PathValue("id"))
	if errors.Is(err, schoolapp.ErrTeacherNotFound) {
		httpx.WriteError(w, http.StatusNotFound, "TEACHER_NOT_FOUND", "Öğretmen bulunamadı.", nil)
		return
	}
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "TEACHER_RESET_FAILED", "Şifre sıfırlanamadı.", nil)
		return
	}
	httpx.WriteJSON(w, http.StatusOK, map[string]string{"temporaryPassword": tempPassword}, nil)
}

func (h *Handler) importStudents(w http.ResponseWriter, r *http.Request) {
	principal, ok := requireSchoolOperator(w, r)
	if !ok {
		return
	}
	var input schoolDomain.ImportStudentsInput
	if err := httpx.DecodeJSON(r, &input); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "VALIDATION_ERROR", "İçe aktarma verisi okunamadı.", nil)
		return
	}
	result, err := h.school.ImportStudents(r.Context(), principal.TenantID, input)
	if errors.Is(err, schoolapp.ErrInvalidInput) {
		httpx.WriteError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Sınıf ve öğrenci listesi zorunludur.", nil)
		return
	}
	if errors.Is(err, schoolapp.ErrClassNotFound) {
		httpx.WriteError(w, http.StatusNotFound, "CLASS_NOT_FOUND", "Sınıf bulunamadı.", nil)
		return
	}
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "STUDENT_IMPORT_FAILED", "Öğrenci içe aktarılamadı.", nil)
		return
	}
	httpx.WriteJSON(w, http.StatusOK, result, nil)
}

func (h *Handler) teacherLessonInAttendanceWindow(w http.ResponseWriter, r *http.Request, principal identity.Principal, lessonID string) (schedulingDomain.Lesson, bool) {
	lesson, ok := h.scheduling.TeacherLessonByID(r.Context(), principal.TenantID, principal.UserID, lessonID)
	if !ok {
		httpx.WriteError(w, http.StatusNotFound, "LESSON_NOT_FOUND", "Ders bloğu bulunamadı.", nil)
		return schedulingDomain.Lesson{}, false
	}
	if !schedulingDomain.LessonAttendanceWindowOpen(lesson, h.clock()) {
		httpx.WriteError(w, http.StatusForbidden, "ATTENDANCE_WINDOW_CLOSED", "Yoklama penceresi kapalı. Ders başlangıcından 10 dk önce ile bitişinden 10 dk sonrasına kadar erişilebilir.", nil)
		return schedulingDomain.Lesson{}, false
	}
	return lesson, true
}

func (h *Handler) attendanceSessionInWindow(w http.ResponseWriter, r *http.Request, principal identity.Principal, session attendanceDomain.Session) bool {
	_, ok := h.teacherLessonInAttendanceWindow(w, r, principal, session.LessonID)
	return ok
}

func requireGuardian(w http.ResponseWriter, r *http.Request) (identity.Principal, bool) {
	return requirePrincipalRole(w, r, identity.RoleGuardian)
}

func requirePrincipalRole(w http.ResponseWriter, r *http.Request, roles ...identity.Role) (identity.Principal, bool) {
	principal, ok := requirePrincipal(w, r)
	if !ok {
		return identity.Principal{}, false
	}
	for _, role := range roles {
		if principal.Role == role {
			return principal, true
		}
	}
	httpx.WriteError(w, http.StatusForbidden, "FORBIDDEN", "Bu işlem için yetkiniz yok.", nil)
	return identity.Principal{}, false
}
