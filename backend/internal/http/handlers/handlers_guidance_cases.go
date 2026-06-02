package handlers

import (
	"errors"
	"net/http"
	"strings"

	guidanceapp "ots/backend/internal/app/guidance"
	guidancedomain "ots/backend/internal/domain/guidance"
	"ots/backend/internal/platform/httpx"
)

func (h *Handler) RegisterGuidanceCaseRoutes(mux *http.ServeMux) {
	mux.HandleFunc("GET /api/v1/guidance/cases", h.listGuidanceCases)
	mux.HandleFunc("POST /api/v1/guidance/cases", h.createGuidanceCase)
	mux.HandleFunc("GET /api/v1/guidance/cases/stats", h.guidanceCaseStats)
	mux.HandleFunc("GET /api/v1/guidance/cases/{id}", h.getGuidanceCase)
	mux.HandleFunc("PATCH /api/v1/guidance/cases/{id}", h.updateGuidanceCase)
	mux.HandleFunc("POST /api/v1/guidance/cases/{id}/close", h.closeGuidanceCase)
	mux.HandleFunc("POST /api/v1/guidance/cases/{id}/reopen", h.reopenGuidanceCase)
	mux.HandleFunc("GET /api/v1/guidance/cases/{id}/timeline", h.listGuidanceCaseTimeline)
	mux.HandleFunc("GET /api/v1/guidance/cases/{id}/events", h.listGuidanceCaseEvents)
	mux.HandleFunc("POST /api/v1/guidance/cases/{id}/events", h.createGuidanceCaseEvent)
	mux.HandleFunc("PATCH /api/v1/guidance/cases/{id}/events/{eventId}", h.updateGuidanceCaseEvent)
	mux.HandleFunc("DELETE /api/v1/guidance/cases/{id}/events/{eventId}", h.deleteGuidanceCaseEvent)
	mux.HandleFunc("GET /api/v1/guidance/students/{id}/case-summary", h.guidanceStudentCaseSummary)
}

func (h *Handler) listGuidanceCases(w http.ResponseWriter, r *http.Request) {
	principal, ok := requireGuidanceRole(w, r)
	if !ok {
		return
	}
	studentID := strings.TrimSpace(r.URL.Query().Get("studentId"))
	status := strings.TrimSpace(r.URL.Query().Get("status"))
	items := h.guidance.ListCases(r.Context(), principal.TenantID, principal.UserID, string(principal.Role), studentID, status)
	httpx.WriteJSON(w, http.StatusOK, items, nil)
}

func (h *Handler) guidanceCaseStats(w http.ResponseWriter, r *http.Request) {
	principal, ok := requireGuidanceRole(w, r)
	if !ok {
		return
	}
	stats := h.guidance.CaseInboxStats(r.Context(), principal.TenantID, principal.UserID, string(principal.Role))
	httpx.WriteJSON(w, http.StatusOK, stats, nil)
}

func (h *Handler) createGuidanceCase(w http.ResponseWriter, r *http.Request) {
	principal, ok := requireGuidanceRole(w, r)
	if !ok {
		return
	}
	var input guidancedomain.CreateCaseInput
	if err := httpx.DecodeJSON(r, &input); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Vaka dosyası verisi okunamadı.", nil)
		return
	}
	created, err := h.guidance.CreateCase(r.Context(), principal.TenantID, principal.UserID, string(principal.Role), input)
	if errors.Is(err, guidanceapp.ErrGuidanceForbidden) {
		httpx.WriteError(w, http.StatusForbidden, "FORBIDDEN", "Bu işlem yalnızca rehberlik personeline açıktır.", nil)
		return
	}
	if errors.Is(err, guidanceapp.ErrStudentOutScope) {
		httpx.WriteError(w, http.StatusForbidden, "STUDENT_OUT_OF_SCOPE", "Bu öğrenci için vaka oluşturamazsınız.", nil)
		return
	}
	if errors.Is(err, guidanceapp.ErrInvalidInput) {
		httpx.WriteError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Öğrenci ve vaka başlığı zorunludur.", nil)
		return
	}
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "GUIDANCE_CASE_CREATE_FAILED", "Vaka dosyası oluşturulamadı.", nil)
		return
	}
	httpx.WriteJSON(w, http.StatusCreated, created, nil)
}

func (h *Handler) getGuidanceCase(w http.ResponseWriter, r *http.Request) {
	principal, ok := requireGuidanceRole(w, r)
	if !ok {
		return
	}
	item, err := h.guidance.GetCase(r.Context(), principal.TenantID, principal.UserID, string(principal.Role), r.PathValue("id"))
	if errors.Is(err, guidanceapp.ErrStudentOutScope) {
		httpx.WriteError(w, http.StatusForbidden, "STUDENT_OUT_OF_SCOPE", "Bu vaka dosyasına erişiminiz yok.", nil)
		return
	}
	if errors.Is(err, guidanceapp.ErrCaseNotFound) {
		httpx.WriteError(w, http.StatusNotFound, "GUIDANCE_CASE_NOT_FOUND", "Vaka dosyası bulunamadı.", nil)
		return
	}
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "GUIDANCE_CASE_LOOKUP_FAILED", "Vaka dosyası okunamadı.", nil)
		return
	}
	httpx.WriteJSON(w, http.StatusOK, item, nil)
}

func (h *Handler) updateGuidanceCase(w http.ResponseWriter, r *http.Request) {
	principal, ok := requireGuidanceRole(w, r)
	if !ok {
		return
	}
	var input guidancedomain.UpdateCaseInput
	if err := httpx.DecodeJSON(r, &input); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Güncelleme verisi okunamadı.", nil)
		return
	}
	updated, err := h.guidance.UpdateCase(r.Context(), principal.TenantID, principal.UserID, string(principal.Role), r.PathValue("id"), input)
	if errors.Is(err, guidanceapp.ErrGuidanceForbidden) {
		httpx.WriteError(w, http.StatusForbidden, "FORBIDDEN", "Bu işlem yalnızca rehberlik personeline açıktır.", nil)
		return
	}
	if errors.Is(err, guidanceapp.ErrStudentOutScope) {
		httpx.WriteError(w, http.StatusForbidden, "STUDENT_OUT_OF_SCOPE", "Bu vaka dosyasını güncelleyemezsiniz.", nil)
		return
	}
	if errors.Is(err, guidanceapp.ErrCaseNotFound) {
		httpx.WriteError(w, http.StatusNotFound, "GUIDANCE_CASE_NOT_FOUND", "Vaka dosyası bulunamadı.", nil)
		return
	}
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "GUIDANCE_CASE_UPDATE_FAILED", "Vaka dosyası güncellenemedi.", nil)
		return
	}
	httpx.WriteJSON(w, http.StatusOK, updated, nil)
}

func (h *Handler) closeGuidanceCase(w http.ResponseWriter, r *http.Request) {
	principal, ok := requireGuidanceRole(w, r)
	if !ok {
		return
	}
	result, err := h.guidance.CloseCase(r.Context(), principal.TenantID, principal.UserID, string(principal.Role), r.PathValue("id"), h.clock())
	if errors.Is(err, guidanceapp.ErrGuidanceForbidden) {
		httpx.WriteError(w, http.StatusForbidden, "FORBIDDEN", "Bu işlem yalnızca rehberlik personeline açıktır.", nil)
		return
	}
	if errors.Is(err, guidanceapp.ErrStudentOutScope) {
		httpx.WriteError(w, http.StatusForbidden, "STUDENT_OUT_OF_SCOPE", "Bu vaka dosyasını kapatamazsınız.", nil)
		return
	}
	if errors.Is(err, guidanceapp.ErrCaseNotFound) {
		httpx.WriteError(w, http.StatusNotFound, "GUIDANCE_CASE_NOT_FOUND", "Vaka dosyası bulunamadı.", nil)
		return
	}
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "GUIDANCE_CASE_CLOSE_FAILED", "Vaka dosyası kapatılamadı.", nil)
		return
	}
	httpx.WriteJSON(w, http.StatusOK, result, nil)
}

func (h *Handler) reopenGuidanceCase(w http.ResponseWriter, r *http.Request) {
	principal, ok := requireGuidanceRole(w, r)
	if !ok {
		return
	}
	item, err := h.guidance.ReopenCase(r.Context(), principal.TenantID, principal.UserID, string(principal.Role), r.PathValue("id"))
	if errors.Is(err, guidanceapp.ErrGuidanceForbidden) {
		httpx.WriteError(w, http.StatusForbidden, "FORBIDDEN", "Bu işlem yalnızca rehberlik personeline açıktır.", nil)
		return
	}
	if errors.Is(err, guidanceapp.ErrStudentOutScope) {
		httpx.WriteError(w, http.StatusForbidden, "STUDENT_OUT_OF_SCOPE", "Bu vaka dosyasını yeniden açamazsınız.", nil)
		return
	}
	if errors.Is(err, guidanceapp.ErrCaseNotFound) {
		httpx.WriteError(w, http.StatusNotFound, "GUIDANCE_CASE_NOT_FOUND", "Vaka dosyası bulunamadı.", nil)
		return
	}
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "GUIDANCE_CASE_REOPEN_FAILED", "Vaka dosyası yeniden açılamadı.", nil)
		return
	}
	httpx.WriteJSON(w, http.StatusOK, item, nil)
}

func (h *Handler) listGuidanceCaseTimeline(w http.ResponseWriter, r *http.Request) {
	principal, ok := requireGuidanceRole(w, r)
	if !ok {
		return
	}
	items, err := h.guidance.ListCaseTimeline(r.Context(), principal.TenantID, principal.UserID, string(principal.Role), r.PathValue("id"))
	if errors.Is(err, guidanceapp.ErrStudentOutScope) {
		httpx.WriteError(w, http.StatusForbidden, "STUDENT_OUT_OF_SCOPE", "Bu vaka zaman çizelgesine erişiminiz yok.", nil)
		return
	}
	if errors.Is(err, guidanceapp.ErrCaseNotFound) {
		httpx.WriteError(w, http.StatusNotFound, "GUIDANCE_CASE_NOT_FOUND", "Vaka dosyası bulunamadı.", nil)
		return
	}
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "GUIDANCE_CASE_TIMELINE_FAILED", "Vaka zaman çizelgesi okunamadı.", nil)
		return
	}
	httpx.WriteJSON(w, http.StatusOK, items, nil)
}

func (h *Handler) listGuidanceCaseEvents(w http.ResponseWriter, r *http.Request) {
	principal, ok := requireGuidanceRole(w, r)
	if !ok {
		return
	}
	items, err := h.guidance.ListCaseEvents(r.Context(), principal.TenantID, principal.UserID, string(principal.Role), r.PathValue("id"))
	if errors.Is(err, guidanceapp.ErrStudentOutScope) {
		httpx.WriteError(w, http.StatusForbidden, "STUDENT_OUT_OF_SCOPE", "Bu vaka olaylarına erişiminiz yok.", nil)
		return
	}
	if errors.Is(err, guidanceapp.ErrCaseNotFound) {
		httpx.WriteError(w, http.StatusNotFound, "GUIDANCE_CASE_NOT_FOUND", "Vaka dosyası bulunamadı.", nil)
		return
	}
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "GUIDANCE_CASE_EVENTS_FAILED", "Vaka olayları okunamadı.", nil)
		return
	}
	httpx.WriteJSON(w, http.StatusOK, items, nil)
}

func (h *Handler) createGuidanceCaseEvent(w http.ResponseWriter, r *http.Request) {
	principal, ok := requireGuidanceRole(w, r)
	if !ok {
		return
	}
	var input guidancedomain.CreateCaseEventInput
	if err := httpx.DecodeJSON(r, &input); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Olay verisi okunamadı.", nil)
		return
	}
	created, err := h.guidance.CreateCaseEvent(r.Context(), principal.TenantID, principal.UserID, string(principal.Role), r.PathValue("id"), input)
	if errors.Is(err, guidanceapp.ErrGuidanceForbidden) {
		httpx.WriteError(w, http.StatusForbidden, "FORBIDDEN", "Bu işlem yalnızca rehberlik personeline açıktır.", nil)
		return
	}
	if errors.Is(err, guidanceapp.ErrCaseClosed) {
		httpx.WriteError(w, http.StatusConflict, "GUIDANCE_CASE_CLOSED", "Kapalı vakaya yeni kayıt eklenemez. Önce yeniden açın.", nil)
		return
	}
	if errors.Is(err, guidanceapp.ErrStudentOutScope) {
		httpx.WriteError(w, http.StatusForbidden, "STUDENT_OUT_OF_SCOPE", "Bu vakaya kayıt ekleyemezsiniz.", nil)
		return
	}
	if errors.Is(err, guidanceapp.ErrInvalidInput) {
		httpx.WriteError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Başlık veya içerik zorunludur.", nil)
		return
	}
	if errors.Is(err, guidanceapp.ErrCaseNotFound) {
		httpx.WriteError(w, http.StatusNotFound, "GUIDANCE_CASE_NOT_FOUND", "Vaka dosyası bulunamadı.", nil)
		return
	}
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "GUIDANCE_CASE_EVENT_CREATE_FAILED", "Vaka olayı oluşturulamadı.", nil)
		return
	}
	httpx.WriteJSON(w, http.StatusCreated, created, nil)
}

func (h *Handler) updateGuidanceCaseEvent(w http.ResponseWriter, r *http.Request) {
	principal, ok := requireGuidanceRole(w, r)
	if !ok {
		return
	}
	var input guidancedomain.UpdateCaseEventInput
	if err := httpx.DecodeJSON(r, &input); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Güncelleme verisi okunamadı.", nil)
		return
	}
	updated, err := h.guidance.UpdateCaseEvent(r.Context(), principal.TenantID, principal.UserID, string(principal.Role), r.PathValue("id"), r.PathValue("eventId"), input)
	if errors.Is(err, guidanceapp.ErrGuidanceForbidden) {
		httpx.WriteError(w, http.StatusForbidden, "FORBIDDEN", "Bu işlem yalnızca rehberlik personeline açıktır.", nil)
		return
	}
	if errors.Is(err, guidanceapp.ErrCaseClosed) {
		httpx.WriteError(w, http.StatusConflict, "GUIDANCE_CASE_CLOSED", "Kapalı vakadaki kayıtlar güncellenemez.", nil)
		return
	}
	if errors.Is(err, guidanceapp.ErrCaseEventNotFound) {
		httpx.WriteError(w, http.StatusNotFound, "GUIDANCE_CASE_EVENT_NOT_FOUND", "Vaka olayı bulunamadı.", nil)
		return
	}
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "GUIDANCE_CASE_EVENT_UPDATE_FAILED", "Vaka olayı güncellenemedi.", nil)
		return
	}
	httpx.WriteJSON(w, http.StatusOK, updated, nil)
}

func (h *Handler) deleteGuidanceCaseEvent(w http.ResponseWriter, r *http.Request) {
	principal, ok := requireGuidanceRole(w, r)
	if !ok {
		return
	}
	if err := h.guidance.DeleteCaseEvent(r.Context(), principal.TenantID, principal.UserID, string(principal.Role), r.PathValue("id"), r.PathValue("eventId")); errors.Is(err, guidanceapp.ErrGuidanceForbidden) {
		httpx.WriteError(w, http.StatusForbidden, "FORBIDDEN", "Bu işlem yalnızca rehberlik personeline açıktır.", nil)
		return
	} else if errors.Is(err, guidanceapp.ErrCaseEventNotFound) {
		httpx.WriteError(w, http.StatusNotFound, "GUIDANCE_CASE_EVENT_NOT_FOUND", "Vaka olayı bulunamadı.", nil)
		return
	} else if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "GUIDANCE_CASE_EVENT_DELETE_FAILED", "Vaka olayı silinemedi.", nil)
		return
	}
	httpx.WriteJSON(w, http.StatusNoContent, nil, nil)
}

func (h *Handler) guidanceStudentCaseSummary(w http.ResponseWriter, r *http.Request) {
	principal, ok := requireGuidanceRole(w, r)
	if !ok {
		return
	}
	summary, err := h.guidance.StudentCaseSummary(r.Context(), principal.TenantID, principal.UserID, string(principal.Role), r.PathValue("id"))
	if errors.Is(err, guidanceapp.ErrStudentOutScope) {
		httpx.WriteError(w, http.StatusForbidden, "STUDENT_OUT_OF_SCOPE", "Bu öğrenci vaka özetine erişilemez.", nil)
		return
	}
	if errors.Is(err, guidanceapp.ErrInvalidInput) {
		httpx.WriteError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Geçerli bir öğrenci kimliği gerekir.", nil)
		return
	}
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "GUIDANCE_CASE_SUMMARY_FAILED", "Vaka özeti okunamadı.", nil)
		return
	}
	httpx.WriteJSON(w, http.StatusOK, summary, nil)
}
