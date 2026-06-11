package handlers

import (
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
	submission, err := h.homework.SubmitAssignment(r.Context(), principal.TenantID, r.PathValue("id"), principal.UserID, input)
	if errors.Is(err, homeworkapp.ErrInvalidInput) {
		httpx.WriteError(w, http.StatusBadRequest, "VALIDATION_ERROR", "content veya fileKey gerekli.", nil)
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
