package handlers

import (
	"errors"
	"net/http"
	"strings"
	"time"

	attendanceapp "ots/backend/internal/app/attendance"
	attendanceDomain "ots/backend/internal/domain/attendance"
	"ots/backend/internal/platform/httpx"
)

func (h *Handler) registerPrincipalAttendanceRoutes(mux *http.ServeMux) {
	mux.HandleFunc("GET /api/v1/principal/attendance/classes/{classId}", h.principalClassAttendanceSheet)
	mux.HandleFunc("PUT /api/v1/principal/attendance/classes/{classId}", h.savePrincipalClassAttendance)
}

func (h *Handler) principalClassAttendanceSheet(w http.ResponseWriter, r *http.Request) {
	principal, ok := requireSchoolOperator(w, r)
	if !ok {
		return
	}
	if !h.canViewTenantAttendanceReport(principal) {
		httpx.WriteError(w, http.StatusForbidden, "FORBIDDEN", "Bu rapor yalnızca müdür ve sistem yöneticisi rollerine açıktır.", nil)
		return
	}

	classID := strings.TrimSpace(r.PathValue("classId"))
	if classID == "" {
		httpx.WriteError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Sınıf kimliği gerekli.", nil)
		return
	}

	date, err := h.parseAttendanceDate(r)
	if err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Geçerli bir date parametresi gönderilmelidir (YYYY-MM-DD).", nil)
		return
	}

	sheet, err := h.attendance.ClassAttendanceSheet(r.Context(), principal.TenantID, classID, date)
	if errors.Is(err, attendanceapp.ErrStudentNotFound) {
		httpx.WriteError(w, http.StatusNotFound, "CLASS_NOT_FOUND", "Sınıf bulunamadı.", nil)
		return
	}
	if err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "ATTENDANCE_SHEET_FAILED", "Yoklama listesi alınamadı.", nil)
		return
	}
	httpx.WriteJSON(w, http.StatusOK, sheet, nil)
}

func (h *Handler) savePrincipalClassAttendance(w http.ResponseWriter, r *http.Request) {
	principal, ok := requireSchoolOperator(w, r)
	if !ok {
		return
	}
	if !h.canViewTenantAttendanceReport(principal) {
		httpx.WriteError(w, http.StatusForbidden, "FORBIDDEN", "Bu rapor yalnızca müdür ve sistem yöneticisi rollerine açıktır.", nil)
		return
	}

	classID := strings.TrimSpace(r.PathValue("classId"))
	if classID == "" {
		httpx.WriteError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Sınıf kimliği gerekli.", nil)
		return
	}

	date, err := h.parseAttendanceDate(r)
	if err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Geçerli bir date parametresi gönderilmelidir (YYYY-MM-DD).", nil)
		return
	}

	var request struct {
		Records []attendanceDomain.RecordUpdate `json:"records"`
	}
	if err := httpx.DecodeJSON(r, &request); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Yoklama kayıtları okunamadı.", nil)
		return
	}

	sheet, err := h.attendance.SaveClassAttendance(r.Context(), principal.TenantID, classID, date, principal.UserID, request.Records)
	if errors.Is(err, attendanceapp.ErrStudentNotFound) {
		httpx.WriteError(w, http.StatusNotFound, "CLASS_NOT_FOUND", "Sınıf bulunamadı.", nil)
		return
	}
	if errors.Is(err, attendanceapp.ErrAttendanceWindowClosed) {
		httpx.WriteError(w, http.StatusConflict, "ATTENDANCE_SAVE_FAILED", "Yoklama kaydedilemedi.", nil)
		return
	}
	if err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "ATTENDANCE_SAVE_FAILED", "Yoklama kaydedilemedi.", nil)
		return
	}
	httpx.WriteJSON(w, http.StatusOK, sheet, nil)
}

func (h *Handler) parseAttendanceDate(r *http.Request) (time.Time, error) {
	date := h.clock()
	if raw := strings.TrimSpace(r.URL.Query().Get("date")); raw != "" {
		parsed, err := time.Parse("2006-01-02", raw)
		if err != nil {
			return time.Time{}, err
		}
		date = parsed
	}
	return date, nil
}
