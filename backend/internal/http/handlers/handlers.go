package handlers

import (
	"errors"
	"net/http"
	"time"

	attendanceapp "ots/backend/internal/app/attendance"
	dashboardapp "ots/backend/internal/app/dashboard"
	observationapp "ots/backend/internal/app/observation"
	schedulingapp "ots/backend/internal/app/scheduling"
	schoolapp "ots/backend/internal/app/school"
	attendanceDomain "ots/backend/internal/domain/attendance"
	"ots/backend/internal/domain/identity"
	observationDomain "ots/backend/internal/domain/observation"
	"ots/backend/internal/platform/httpx"
)

type Dependencies struct {
	School      *schoolapp.Service
	Scheduling  *schedulingapp.Service
	Attendance  *attendanceapp.Service
	Observation *observationapp.Service
	Dashboard   *dashboardapp.Service
	Clock       func() time.Time
}

type Handler struct {
	school      *schoolapp.Service
	scheduling  *schedulingapp.Service
	attendance  *attendanceapp.Service
	observation *observationapp.Service
	dashboard   *dashboardapp.Service
	clock       func() time.Time
}

func New(deps Dependencies) *Handler {
	return &Handler{
		school:      deps.School,
		scheduling:  deps.Scheduling,
		attendance:  deps.Attendance,
		observation: deps.Observation,
		dashboard:   deps.Dashboard,
		clock:       deps.Clock,
	}
}

func (h *Handler) Register(mux *http.ServeMux) {
	mux.HandleFunc("GET /healthz", h.health)
	mux.HandleFunc("GET /api/v1/me", h.me)
	mux.HandleFunc("GET /api/v1/tenants/current", h.currentTenant)
	mux.HandleFunc("GET /api/v1/announcements", h.announcements)
	mux.HandleFunc("GET /api/v1/dashboard/principal/summary", h.principalSummary)
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
