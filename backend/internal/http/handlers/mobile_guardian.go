package handlers

import (
	"net/http"
	"strings"

	"ots/backend/internal/domain/identity"
	"ots/backend/internal/platform/httpx"
)

func (h *Handler) registerMobileGuardianRoutes(mux *http.ServeMux) {
	mux.HandleFunc("GET /api/v1/mobile/guardian/dashboard", h.mobileGuardianDashboard)
	mux.HandleFunc("GET /api/v1/mobile/guardian/students/{studentId}/documents", h.mobileGuardianStudentDocuments)
	mux.HandleFunc("GET /api/v1/mobile/guardian/students/{studentId}/attendance", h.mobileGuardianStudentAttendance)
	mux.HandleFunc("GET /api/v1/mobile/guardian/students/{studentId}/guidance", h.mobileGuardianStudentGuidance)
}

func (h *Handler) mobileGuardianDashboard(w http.ResponseWriter, r *http.Request) {
	principal, ok := requirePrincipal(w, r)
	if !ok {
		return
	}

	if principal.Role != identity.RoleGuardian {
		httpx.WriteError(w, http.StatusForbidden, "FORBIDDEN", "Yetkiniz yok.", nil)
		return
	}

	data := map[string]interface{}{
		"guardian": map[string]interface{}{
			"userId":   principal.UserID,
			"role":     string(principal.Role),
			"tenantId": principal.TenantID,
		},
		"students":          []interface{}{},
		"recentDocuments":   []interface{}{},
		"notificationCount": 0,
		"lastSyncedAt":      nil,
	}

	httpx.WriteJSON(w, http.StatusOK, data, nil)
}

func (h *Handler) mobileGuardianStudentDocuments(w http.ResponseWriter, r *http.Request) {
	principal, ok := requirePrincipal(w, r)
	if !ok {
		return
	}

	if principal.Role != identity.RoleGuardian {
		httpx.WriteError(w, http.StatusForbidden, "FORBIDDEN", "Yetkiniz yok.", nil)
		return
	}

	studentID := strings.TrimSpace(r.PathValue("studentId"))
	if studentID == "" {
		httpx.WriteError(w, http.StatusBadRequest, "VALIDATION_ERROR", "studentId zorunludur.", nil)
		return
	}

	httpx.WriteJSON(w, http.StatusOK, map[string]interface{}{
		"studentId":  studentID,
		"documents":  []interface{}{},
		"totalCount": 0,
	}, nil)
}

func (h *Handler) mobileGuardianStudentAttendance(w http.ResponseWriter, r *http.Request) {
	principal, ok := requirePrincipal(w, r)
	if !ok {
		return
	}

	if principal.Role != identity.RoleGuardian {
		httpx.WriteError(w, http.StatusForbidden, "FORBIDDEN", "Yetkiniz yok.", nil)
		return
	}

	studentID := strings.TrimSpace(r.PathValue("studentId"))
	if studentID == "" {
		httpx.WriteError(w, http.StatusBadRequest, "VALIDATION_ERROR", "studentId zorunludur.", nil)
		return
	}

	httpx.WriteJSON(w, http.StatusOK, map[string]interface{}{
		"studentId":      studentID,
		"attendanceRate": 0.95,
		"absentDays":     2,
		"lateArrivals":   1,
	}, nil)
}

func (h *Handler) mobileGuardianStudentGuidance(w http.ResponseWriter, r *http.Request) {
	principal, ok := requirePrincipal(w, r)
	if !ok {
		return
	}

	if principal.Role != identity.RoleGuardian {
		httpx.WriteError(w, http.StatusForbidden, "FORBIDDEN", "Yetkiniz yok.", nil)
		return
	}

	studentID := strings.TrimSpace(r.PathValue("studentId"))
	if studentID == "" {
		httpx.WriteError(w, http.StatusBadRequest, "VALIDATION_ERROR", "studentId zorunludur.", nil)
		return
	}

	httpx.WriteJSON(w, http.StatusOK, map[string]interface{}{
		"studentId":   studentID,
		"hasOpenCase": false,
		"riskLevel":   "low",
	}, nil)
}
