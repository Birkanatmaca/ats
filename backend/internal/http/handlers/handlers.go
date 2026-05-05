package handlers

import (
	"errors"
	"net/http"
	"time"

	attendanceapp "ots/backend/internal/app/attendance"
	dashboardapp "ots/backend/internal/app/dashboard"
	identityapp "ots/backend/internal/app/identity"
	observationapp "ots/backend/internal/app/observation"
	schedulingapp "ots/backend/internal/app/scheduling"
	schoolapp "ots/backend/internal/app/school"
	superadminapp "ots/backend/internal/app/superadmin"
	attendanceDomain "ots/backend/internal/domain/attendance"
	"ots/backend/internal/domain/identity"
	observationDomain "ots/backend/internal/domain/observation"
	superadminDomain "ots/backend/internal/domain/superadmin"
	"ots/backend/internal/platform/httpx"
)

type Dependencies struct {
	Identity    *identityapp.Service
	School      *schoolapp.Service
	Scheduling  *schedulingapp.Service
	Attendance  *attendanceapp.Service
	Observation *observationapp.Service
	Dashboard   *dashboardapp.Service
	SuperAdmin  *superadminapp.Service
	Clock       func() time.Time
}

type Handler struct {
	identity    *identityapp.Service
	school      *schoolapp.Service
	scheduling  *schedulingapp.Service
	attendance  *attendanceapp.Service
	observation *observationapp.Service
	dashboard   *dashboardapp.Service
	superAdmin  *superadminapp.Service
	clock       func() time.Time
}

func New(deps Dependencies) *Handler {
	return &Handler{
		identity:    deps.Identity,
		school:      deps.School,
		scheduling:  deps.Scheduling,
		attendance:  deps.Attendance,
		observation: deps.Observation,
		dashboard:   deps.Dashboard,
		superAdmin:  deps.SuperAdmin,
		clock:       deps.Clock,
	}
}

func (h *Handler) Register(mux *http.ServeMux) {
	mux.HandleFunc("GET /healthz", h.health)
	mux.HandleFunc("GET /api/v1/system/status", h.systemStatus)
	mux.HandleFunc("POST /api/v1/auth/login", h.login)
	mux.HandleFunc("POST /api/v1/auth/password/first-login", h.changePassword)
	mux.HandleFunc("GET /api/v1/me", h.me)
	mux.HandleFunc("GET /api/v1/tenants/current", h.currentTenant)
	mux.HandleFunc("GET /api/v1/announcements", h.announcements)
	mux.HandleFunc("POST /api/v1/support/tickets", h.createSupportTicket)
	mux.HandleFunc("GET /api/v1/dashboard/principal/summary", h.principalSummary)
	mux.HandleFunc("GET /api/v1/super-admin/overview", h.superAdminOverview)
	mux.HandleFunc("GET /api/v1/super-admin/system/metrics", h.superAdminSystemMetrics)
	mux.HandleFunc("GET /api/v1/super-admin/institutions", h.superAdminInstitutions)
	mux.HandleFunc("POST /api/v1/super-admin/institutions", h.createSuperAdminInstitution)
	mux.HandleFunc("GET /api/v1/super-admin/institutions/{id}", h.superAdminInstitution)
	mux.HandleFunc("GET /api/v1/super-admin/institutions/{id}/users", h.superAdminInstitutionUsers)
	mux.HandleFunc("POST /api/v1/super-admin/institutions/{id}/users", h.createSuperAdminInstitutionUser)
	mux.HandleFunc("GET /api/v1/super-admin/users", h.superAdminUsers)
	mux.HandleFunc("POST /api/v1/super-admin/users", h.createSuperAdminUser)
	mux.HandleFunc("PATCH /api/v1/super-admin/users/{id}", h.updateSuperAdminUser)
	mux.HandleFunc("DELETE /api/v1/super-admin/users/{id}", h.deleteSuperAdminUser)
	mux.HandleFunc("GET /api/v1/super-admin/audit-logs", h.superAdminAuditLogs)
	mux.HandleFunc("GET /api/v1/super-admin/settings", h.superAdminSettings)
	mux.HandleFunc("PATCH /api/v1/super-admin/settings", h.updateSuperAdminSettings)
	mux.HandleFunc("GET /api/v1/super-admin/support/tickets", h.superAdminSupportTickets)
	mux.HandleFunc("PATCH /api/v1/super-admin/support/tickets/{id}", h.updateSuperAdminSupportTicket)
	mux.HandleFunc("GET /api/v1/schedules/current", h.currentSchedule)
	mux.HandleFunc("POST /api/v1/schedules/generate", h.generateSchedule)
	mux.HandleFunc("GET /api/v1/teachers/me/calendar", h.teacherCalendar)
	mux.HandleFunc("GET /api/v1/attendance/current-lesson", h.currentLesson)
	mux.HandleFunc("POST /api/v1/attendance/sessions", h.createAttendanceSession)
	mux.HandleFunc("PATCH /api/v1/attendance/sessions/{id}/records", h.updateAttendanceRecords)
	mux.HandleFunc("GET /api/v1/observations", h.listObservations)
	mux.HandleFunc("POST /api/v1/observations", h.createObservation)
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

func (h *Handler) announcements(w http.ResponseWriter, r *http.Request) {
	principal, ok := requirePrincipal(w, r)
	if !ok {
		return
	}
	httpx.WriteJSON(w, http.StatusOK, h.school.ListAnnouncements(r.Context(), principal.TenantID), nil)
}

func (h *Handler) principalSummary(w http.ResponseWriter, r *http.Request) {
	principal, ok := requirePrincipal(w, r)
	if !ok {
		return
	}
	httpx.WriteJSON(w, http.StatusOK, h.dashboard.PrincipalSummary(r.Context(), principal.TenantID), nil)
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
	auditLogs, err := h.superAdmin.AuditLogs(r.Context())
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "AUDIT_LOGS_FAILED", "Loglar alınamadı.", nil)
		return
	}
	httpx.WriteJSON(w, http.StatusOK, auditLogs, nil)
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

func (h *Handler) generateSchedule(w http.ResponseWriter, r *http.Request) {
	principal, ok := requirePrincipal(w, r)
	if !ok {
		return
	}
	result := h.scheduling.GenerateDraft(r.Context(), principal.TenantID)
	httpx.WriteJSON(w, http.StatusCreated, result, nil)
}

func (h *Handler) teacherCalendar(w http.ResponseWriter, r *http.Request) {
	principal, ok := requirePrincipal(w, r)
	if !ok {
		return
	}
	httpx.WriteJSON(w, http.StatusOK, h.scheduling.TeacherCalendar(r.Context(), principal.TenantID, principal.UserID), nil)
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
	session, found := h.attendance.GetOrCreateSession(r.Context(), principal.TenantID, request.LessonID)
	if !found {
		httpx.WriteError(w, http.StatusNotFound, "LESSON_NOT_FOUND", "Ders bloğu bulunamadı.", nil)
		return
	}
	httpx.WriteJSON(w, http.StatusCreated, session, nil)
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
	session, err := h.attendance.UpdateRecords(r.Context(), principal.TenantID, r.PathValue("id"), request.Records)
	if errors.Is(err, attendanceapp.ErrSessionNotFound) {
		httpx.WriteError(w, http.StatusNotFound, "ATTENDANCE_SESSION_NOT_FOUND", "Yoklama oturumu bulunamadı.", nil)
		return
	}
	if err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "ATTENDANCE_UPDATE_FAILED", "Yoklama kaydı güncellenemedi.", nil)
		return
	}
	httpx.WriteJSON(w, http.StatusOK, session, nil)
}

func (h *Handler) listObservations(w http.ResponseWriter, r *http.Request) {
	principal, ok := requirePrincipal(w, r)
	if !ok {
		return
	}
	httpx.WriteJSON(w, http.StatusOK, h.observation.List(r.Context(), principal.TenantID), nil)
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
