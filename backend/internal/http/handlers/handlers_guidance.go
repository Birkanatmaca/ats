package handlers

import (
	"errors"
	"net/http"
	"strings"

	guidanceapp "ots/backend/internal/app/guidance"
	"ots/backend/internal/domain/identity"
	guidancedomain "ots/backend/internal/domain/guidance"
	"ots/backend/internal/platform/httpx"
)

func (h *Handler) RegisterGuidanceRoutes(mux *http.ServeMux) {
	mux.HandleFunc("GET /api/v1/guidance/students", h.guidanceStudents)
	mux.HandleFunc("GET /api/v1/guidance/notes", h.listGuidanceNotes)
	mux.HandleFunc("POST /api/v1/guidance/notes", h.createGuidanceNote)
	mux.HandleFunc("PATCH /api/v1/guidance/notes/{id}", h.updateGuidanceNote)
	mux.HandleFunc("DELETE /api/v1/guidance/notes/{id}", h.deleteGuidanceNote)
	mux.HandleFunc("GET /api/v1/guidance/support-plans", h.listSupportPlans)
	mux.HandleFunc("POST /api/v1/guidance/support-plans", h.createSupportPlan)
	mux.HandleFunc("PATCH /api/v1/guidance/support-plans/{id}", h.updateSupportPlan)
	mux.HandleFunc("DELETE /api/v1/guidance/support-plans/{id}", h.deleteSupportPlan)
	mux.HandleFunc("GET /api/v1/guidance/risk-trackings", h.listRiskTrackings)
	mux.HandleFunc("POST /api/v1/guidance/risk-trackings", h.createRiskTracking)
	mux.HandleFunc("DELETE /api/v1/guidance/risk-trackings/{id}", h.deleteRiskTracking)
	h.RegisterGuidanceCaseRoutes(mux)
}

func requireGuidanceRole(w http.ResponseWriter, r *http.Request) (identity.Principal, bool) {
	return requirePrincipalRole(w, r, identity.RoleGuidance, identity.RolePrincipal, identity.RoleSystemAdmin)
}

func (h *Handler) guidanceStudents(w http.ResponseWriter, r *http.Request) {
	principal, ok := requireGuidanceRole(w, r)
	if !ok {
		return
	}
	items, err := h.guidance.ListStudents(r.Context(), principal.TenantID, principal.UserID)
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "GUIDANCE_STUDENTS_FAILED", "Öğrenci listesi alınamadı.", nil)
		return
	}
	httpx.WriteJSON(w, http.StatusOK, items, nil)
}

func (h *Handler) listGuidanceNotes(w http.ResponseWriter, r *http.Request) {
	principal, ok := requireGuidanceRole(w, r)
	if !ok {
		return
	}
	studentID := strings.TrimSpace(r.URL.Query().Get("studentId"))
	items := h.guidance.ListNotes(r.Context(), principal.TenantID, principal.UserID, studentID)
	httpx.WriteJSON(w, http.StatusOK, items, nil)
}

func (h *Handler) createGuidanceNote(w http.ResponseWriter, r *http.Request) {
	principal, ok := requireGuidanceRole(w, r)
	if !ok {
		return
	}
	var input guidancedomain.CreateNoteInput
	if err := httpx.DecodeJSON(r, &input); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Rehberlik notu okunamadı.", nil)
		return
	}
	created, err := h.guidance.CreateNote(r.Context(), principal.TenantID, principal.UserID, input)
	if errors.Is(err, guidanceapp.ErrStudentOutScope) {
		httpx.WriteError(w, http.StatusForbidden, "STUDENT_OUT_OF_SCOPE", "Bu öğrenci için not oluşturamazsınız.", nil)
		return
	}
	if errors.Is(err, guidanceapp.ErrInvalidInput) {
		httpx.WriteError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Öğrenci ve not metni zorunludur.", nil)
		return
	}
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "GUIDANCE_NOTE_CREATE_FAILED", "Rehberlik notu oluşturulamadı.", nil)
		return
	}
	httpx.WriteJSON(w, http.StatusCreated, created, nil)
}

func (h *Handler) updateGuidanceNote(w http.ResponseWriter, r *http.Request) {
	principal, ok := requireGuidanceRole(w, r)
	if !ok {
		return
	}
	var input guidancedomain.UpdateNoteInput
	if err := httpx.DecodeJSON(r, &input); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Güncelleme verisi okunamadı.", nil)
		return
	}
	updated, err := h.guidance.UpdateNote(r.Context(), principal.TenantID, principal.UserID, r.PathValue("id"), input)
	if errors.Is(err, guidanceapp.ErrStudentOutScope) {
		httpx.WriteError(w, http.StatusForbidden, "STUDENT_OUT_OF_SCOPE", "Bu rehberlik notunu güncelleyemezsiniz.", nil)
		return
	}
	if errors.Is(err, guidanceapp.ErrNoteNotFound) {
		httpx.WriteError(w, http.StatusNotFound, "GUIDANCE_NOTE_NOT_FOUND", "Rehberlik notu bulunamadı.", nil)
		return
	}
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "GUIDANCE_NOTE_UPDATE_FAILED", "Rehberlik notu güncellenemedi.", nil)
		return
	}
	httpx.WriteJSON(w, http.StatusOK, updated, nil)
}

func (h *Handler) deleteGuidanceNote(w http.ResponseWriter, r *http.Request) {
	principal, ok := requireGuidanceRole(w, r)
	if !ok {
		return
	}
	if err := h.guidance.DeleteNote(r.Context(), principal.TenantID, principal.UserID, r.PathValue("id")); errors.Is(err, guidanceapp.ErrStudentOutScope) {
		httpx.WriteError(w, http.StatusForbidden, "STUDENT_OUT_OF_SCOPE", "Bu rehberlik notunu silemezsiniz.", nil)
		return
	} else if errors.Is(err, guidanceapp.ErrNoteNotFound) {
		httpx.WriteError(w, http.StatusNotFound, "GUIDANCE_NOTE_NOT_FOUND", "Rehberlik notu bulunamadı.", nil)
		return
	} else if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "GUIDANCE_NOTE_DELETE_FAILED", "Rehberlik notu silinemedi.", nil)
		return
	}
	httpx.WriteJSON(w, http.StatusNoContent, nil, nil)
}

func (h *Handler) listSupportPlans(w http.ResponseWriter, r *http.Request) {
	principal, ok := requireGuidanceRole(w, r)
	if !ok {
		return
	}
	studentID := strings.TrimSpace(r.URL.Query().Get("studentId"))
	items := h.guidance.ListPlans(r.Context(), principal.TenantID, principal.UserID, studentID)
	httpx.WriteJSON(w, http.StatusOK, items, nil)
}

func (h *Handler) createSupportPlan(w http.ResponseWriter, r *http.Request) {
	principal, ok := requireGuidanceRole(w, r)
	if !ok {
		return
	}
	var input guidancedomain.CreatePlanInput
	if err := httpx.DecodeJSON(r, &input); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Destek planı okunamadı.", nil)
		return
	}
	created, err := h.guidance.CreatePlan(r.Context(), principal.TenantID, principal.UserID, input)
	if errors.Is(err, guidanceapp.ErrStudentOutScope) {
		httpx.WriteError(w, http.StatusForbidden, "STUDENT_OUT_OF_SCOPE", "Bu öğrenci için plan oluşturamazsınız.", nil)
		return
	}
	if errors.Is(err, guidanceapp.ErrInvalidInput) {
		httpx.WriteError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Öğrenci ve plan başlığı zorunludur.", nil)
		return
	}
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "SUPPORT_PLAN_CREATE_FAILED", "Destek planı oluşturulamadı.", nil)
		return
	}
	httpx.WriteJSON(w, http.StatusCreated, created, nil)
}

func (h *Handler) updateSupportPlan(w http.ResponseWriter, r *http.Request) {
	principal, ok := requireGuidanceRole(w, r)
	if !ok {
		return
	}
	var input guidancedomain.UpdatePlanInput
	if err := httpx.DecodeJSON(r, &input); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Güncelleme verisi okunamadı.", nil)
		return
	}
	updated, err := h.guidance.UpdatePlan(r.Context(), principal.TenantID, principal.UserID, r.PathValue("id"), input)
	if errors.Is(err, guidanceapp.ErrStudentOutScope) {
		httpx.WriteError(w, http.StatusForbidden, "STUDENT_OUT_OF_SCOPE", "Bu destek planını güncelleyemezsiniz.", nil)
		return
	}
	if errors.Is(err, guidanceapp.ErrPlanNotFound) {
		httpx.WriteError(w, http.StatusNotFound, "SUPPORT_PLAN_NOT_FOUND", "Destek planı bulunamadı.", nil)
		return
	}
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "SUPPORT_PLAN_UPDATE_FAILED", "Destek planı güncellenemedi.", nil)
		return
	}
	httpx.WriteJSON(w, http.StatusOK, updated, nil)
}

func (h *Handler) deleteSupportPlan(w http.ResponseWriter, r *http.Request) {
	principal, ok := requireGuidanceRole(w, r)
	if !ok {
		return
	}
	if err := h.guidance.DeletePlan(r.Context(), principal.TenantID, principal.UserID, r.PathValue("id")); errors.Is(err, guidanceapp.ErrStudentOutScope) {
		httpx.WriteError(w, http.StatusForbidden, "STUDENT_OUT_OF_SCOPE", "Bu destek planını silemezsiniz.", nil)
		return
	} else if errors.Is(err, guidanceapp.ErrPlanNotFound) {
		httpx.WriteError(w, http.StatusNotFound, "SUPPORT_PLAN_NOT_FOUND", "Destek planı bulunamadı.", nil)
		return
	} else if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "SUPPORT_PLAN_DELETE_FAILED", "Destek planı silinemedi.", nil)
		return
	}
	httpx.WriteJSON(w, http.StatusNoContent, nil, nil)
}

func (h *Handler) listRiskTrackings(w http.ResponseWriter, r *http.Request) {
	principal, ok := requireGuidanceRole(w, r)
	if !ok {
		return
	}
	studentID := strings.TrimSpace(r.URL.Query().Get("studentId"))
	items := h.guidance.ListRiskTrackings(r.Context(), principal.TenantID, principal.UserID, studentID)
	httpx.WriteJSON(w, http.StatusOK, items, nil)
}

func (h *Handler) createRiskTracking(w http.ResponseWriter, r *http.Request) {
	principal, ok := requireGuidanceRole(w, r)
	if !ok {
		return
	}
	var input guidancedomain.CreateRiskTrackingInput
	if err := httpx.DecodeJSON(r, &input); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Risk takibi verisi okunamadı.", nil)
		return
	}
	created, err := h.guidance.CreateRiskTracking(r.Context(), principal.TenantID, principal.UserID, input)
	if errors.Is(err, guidanceapp.ErrStudentOutScope) {
		httpx.WriteError(w, http.StatusForbidden, "STUDENT_OUT_OF_SCOPE", "Bu öğrenci için risk takibi açılamaz.", nil)
		return
	}
	if errors.Is(err, guidanceapp.ErrInvalidInput) {
		httpx.WriteError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Öğrenci seçimi zorunludur.", nil)
		return
	}
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "RISK_TRACKING_CREATE_FAILED", "Risk takibi açılamadı.", nil)
		return
	}
	httpx.WriteJSON(w, http.StatusCreated, created, nil)
}

func (h *Handler) deleteRiskTracking(w http.ResponseWriter, r *http.Request) {
	principal, ok := requireGuidanceRole(w, r)
	if !ok {
		return
	}
	if err := h.guidance.DeleteRiskTracking(r.Context(), principal.TenantID, principal.UserID, r.PathValue("id")); errors.Is(err, guidanceapp.ErrStudentOutScope) {
		httpx.WriteError(w, http.StatusForbidden, "STUDENT_OUT_OF_SCOPE", "Bu risk takibini kapatamazsınız.", nil)
		return
	} else if errors.Is(err, guidanceapp.ErrTrackingNotFound) {
		httpx.WriteError(w, http.StatusNotFound, "RISK_TRACKING_NOT_FOUND", "Risk takibi kaydı bulunamadı.", nil)
		return
	} else if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "RISK_TRACKING_DELETE_FAILED", "Risk takibi kapatılamadı.", nil)
		return
	}
	httpx.WriteJSON(w, http.StatusNoContent, nil, nil)
}
