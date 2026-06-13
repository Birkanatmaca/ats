package handlers

import (
	"context"
	"errors"
	"net/http"
	"strings"

	homeworkapp "ots/backend/internal/app/homework"
	homeworkdomain "ots/backend/internal/domain/homework"
	"ots/backend/internal/domain/identity"
	"ots/backend/internal/platform/httpx"
)

func (h *Handler) registerHomeworkRoutes(mux *http.ServeMux) {
	mux.HandleFunc("GET /api/v1/homework/assignments", h.listHomeworkAssignments)
	mux.HandleFunc("POST /api/v1/homework/assignments", h.createHomeworkAssignment)
	mux.HandleFunc("GET /api/v1/homework/assignments/{id}", h.getHomeworkAssignment)
	mux.HandleFunc("POST /api/v1/homework/assignments/{id}/submit", h.submitHomeworkAssignment)
}

func (h *Handler) createHomeworkAssignment(w http.ResponseWriter, r *http.Request) {
	if h.homework == nil {
		httpx.WriteError(w, http.StatusServiceUnavailable, "HOMEWORK_DISABLED", "Ödev servisi aktif değil.", nil)
		return
	}
	principal, ok := requirePrincipalRole(w, r, identity.RoleTeacher, identity.RolePrincipal)
	if !ok {
		return
	}
	var input homeworkdomain.CreateAssignmentInput
	if err := httpx.DecodeJSON(r, &input); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Ödev girdisi okunamadı.", nil)
		return
	}
	item, err := h.homework.CreateAssignment(r.Context(), principal.TenantID, principal.UserID, input)
	if errors.Is(err, homeworkapp.ErrForbidden) {
		httpx.WriteError(w, http.StatusForbidden, "FORBIDDEN", "Öğretmen yalnızca kendi sınıfı için ödev oluşturabilir.", nil)
		return
	}
	if errors.Is(err, homeworkapp.ErrInvalidInput) {
		httpx.WriteError(w, http.StatusBadRequest, "VALIDATION_ERROR", "classId, title ve dueDate zorunludur (YYYY-MM-DD).", nil)
		return
	}
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "HOMEWORK_CREATE_FAILED", "Ödev oluşturulamadı.", nil)
		return
	}
	httpx.WriteJSON(w, http.StatusCreated, item, nil)
}

func (h *Handler) listHomeworkAssignments(w http.ResponseWriter, r *http.Request) {
	if h.homework == nil {
		httpx.WriteError(w, http.StatusServiceUnavailable, "HOMEWORK_DISABLED", "Ödev servisi aktif değil.", nil)
		return
	}
	principal, ok := requirePrincipal(w, r)
	if !ok {
		return
	}
	classID := strings.TrimSpace(r.URL.Query().Get("classId"))
	if principal.Role == identity.RoleGuardian {
		studentID := strings.TrimSpace(r.URL.Query().Get("studentId"))
		if h.guardian == nil || studentID == "" || !h.guardian.HasStudent(r.Context(), principal.TenantID, principal.UserID, studentID) {
			httpx.WriteError(w, http.StatusForbidden, "FORBIDDEN", "Veli yalnızca bağlı öğrencilerini görüntüleyebilir.", nil)
			return
		}
		studentClassID, found := h.homework.StudentCurrentClassID(r.Context(), principal.TenantID, studentID)
		if !found {
			httpx.WriteJSON(w, http.StatusOK, []homeworkdomain.Assignment{}, nil)
			return
		}
		classID = studentClassID
	}
	items, err := h.homework.ListAssignments(r.Context(), principal.TenantID, classID)
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "HOMEWORK_LIST_FAILED", "Ödev listesi alınamadı.", nil)
		return
	}
	httpx.WriteJSON(w, http.StatusOK, items, nil)
}

func (h *Handler) getHomeworkAssignment(w http.ResponseWriter, r *http.Request) {
	if h.homework == nil {
		httpx.WriteError(w, http.StatusServiceUnavailable, "HOMEWORK_DISABLED", "Ödev servisi aktif değil.", nil)
		return
	}
	principal, ok := requirePrincipal(w, r)
	if !ok {
		return
	}
	if principal.Role == identity.RoleGuardian {
		studentID := strings.TrimSpace(r.URL.Query().Get("studentId"))
		if h.guardian == nil || studentID == "" || !h.guardian.HasStudent(r.Context(), principal.TenantID, principal.UserID, studentID) {
			httpx.WriteError(w, http.StatusForbidden, "FORBIDDEN", "Veli yalnızca bağlı öğrencilerinin ödevlerini görüntüleyebilir.", nil)
			return
		}
		if !h.homework.StudentCanAccessAssignment(r.Context(), principal.TenantID, studentID, r.PathValue("id")) {
			httpx.WriteError(w, http.StatusForbidden, "FORBIDDEN", "Veli yalnızca bağlı öğrencilerinin ödevlerini görüntüleyebilir.", nil)
			return
		}
	}
	item, err := h.homework.GetAssignment(r.Context(), principal.TenantID, r.PathValue("id"))
	if errors.Is(err, homeworkapp.ErrNotFound) {
		httpx.WriteError(w, http.StatusNotFound, "HOMEWORK_NOT_FOUND", "Ödev bulunamadı.", nil)
		return
	}
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "HOMEWORK_GET_FAILED", "Ödev okunamadı.", nil)
		return
	}
	httpx.WriteJSON(w, http.StatusOK, item, nil)
}

func (h *Handler) submitHomeworkAssignment(w http.ResponseWriter, r *http.Request) {
	if h.homework == nil {
		httpx.WriteError(w, http.StatusServiceUnavailable, "HOMEWORK_DISABLED", "Ödev servisi aktif değil.", nil)
		return
	}
	principal, ok := requirePrincipal(w, r)
	if !ok {
		return
	}
	var input homeworkdomain.SubmitAssignmentInput
	if err := httpx.DecodeJSON(r, &input); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Teslim girdisi okunamadı.", nil)
		return
	}
	input.StudentID = strings.TrimSpace(input.StudentID)
	if input.StudentID == "" {
		httpx.WriteError(w, http.StatusBadRequest, "VALIDATION_ERROR", "studentId zorunludur.", nil)
		return
	}
	if principal.Role == identity.RoleGuardian {
		if h.guardian == nil || !h.guardian.HasStudent(r.Context(), principal.TenantID, principal.UserID, input.StudentID) {
			httpx.WriteError(w, http.StatusForbidden, "FORBIDDEN", "Veli yalnızca bağlı öğrencisi adına teslim yapabilir.", nil)
			return
		}
	} else if !hasStudentScope(r.Context(), input.StudentID) {
		httpx.WriteError(w, http.StatusForbidden, "FORBIDDEN", "Öğrenci yalnızca kendi ödevini teslim edebilir.", nil)
		return
	}
	submission, err := h.homework.SubmitAssignment(r.Context(), principal.TenantID, r.PathValue("id"), input.StudentID, input)
	if errors.Is(err, homeworkapp.ErrInvalidInput) {
		httpx.WriteError(w, http.StatusBadRequest, "VALIDATION_ERROR", "content veya fileKey gerekli.", nil)
		return
	}
	if errors.Is(err, homeworkapp.ErrForbidden) {
		httpx.WriteError(w, http.StatusForbidden, "FORBIDDEN", "Öğrenci yalnızca kendi sınıf ödevine teslim yapabilir.", nil)
		return
	}
	if errors.Is(err, homeworkapp.ErrNotFound) {
		httpx.WriteError(w, http.StatusNotFound, "HOMEWORK_NOT_FOUND", "Ödev bulunamadı.", nil)
		return
	}
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "HOMEWORK_SUBMIT_FAILED", "Ödev teslim edilemedi.", nil)
		return
	}
	httpx.WriteJSON(w, http.StatusCreated, submission, nil)
}

func hasStudentScope(ctx context.Context, studentID string) bool {
	scopes, ok := identity.ScopesFromContext(ctx)
	if !ok {
		return false
	}
	for _, scope := range scopes {
		if scope.Type == identity.ScopeStudent && strings.TrimSpace(scope.StudentID) == studentID {
			return true
		}
	}
	return false
}
