package handlers

import (
	"errors"
	"net/http"

	schoolapp "ots/backend/internal/app/school"
	schooldomain "ots/backend/internal/domain/school"
	"ots/backend/internal/platform/httpx"
)

func (h *Handler) registerPrincipalGuardianRoutes(mux *http.ServeMux) {
	mux.HandleFunc("GET /api/v1/principal/guardians", h.listPrincipalGuardians)
	mux.HandleFunc("GET /api/v1/principal/guardians/{id}", h.getPrincipalGuardian)
	mux.HandleFunc("PATCH /api/v1/principal/guardians/{id}", h.updatePrincipalGuardian)
	mux.HandleFunc("POST /api/v1/principal/guardians/{id}/status", h.setPrincipalGuardianStatus)
	mux.HandleFunc("POST /api/v1/principal/guardians/{id}/reset-password", h.resetPrincipalGuardianPassword)
	mux.HandleFunc("POST /api/v1/principal/guardians/{id}/students", h.linkPrincipalGuardianStudent)
	mux.HandleFunc("DELETE /api/v1/principal/guardians/{id}/students/{studentId}", h.unlinkPrincipalGuardianStudent)
}

func (h *Handler) listPrincipalGuardians(w http.ResponseWriter, r *http.Request) {
	principal, ok := requireSchoolOperator(w, r)
	if !ok {
		return
	}
	items, err := h.school.ListManagedGuardians(r.Context(), principal.TenantID)
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "GUARDIAN_LIST_FAILED", "Veli listesi alınamadı.", nil)
		return
	}
	httpx.WriteJSON(w, http.StatusOK, items, nil)
}

func (h *Handler) getPrincipalGuardian(w http.ResponseWriter, r *http.Request) {
	principal, ok := requireSchoolOperator(w, r)
	if !ok {
		return
	}
	item, err := h.school.GetManagedGuardian(r.Context(), principal.TenantID, r.PathValue("id"))
	if errors.Is(err, schoolapp.ErrGuardianNotFound) {
		httpx.WriteError(w, http.StatusNotFound, "GUARDIAN_NOT_FOUND", "Veli kaydı bulunamadı.", nil)
		return
	}
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "GUARDIAN_GET_FAILED", "Veli kaydı alınamadı.", nil)
		return
	}
	httpx.WriteJSON(w, http.StatusOK, item, nil)
}

func (h *Handler) updatePrincipalGuardian(w http.ResponseWriter, r *http.Request) {
	principal, ok := requireSchoolOperator(w, r)
	if !ok {
		return
	}
	var input schooldomain.UpdateManagedGuardianInput
	if err := httpx.DecodeJSON(r, &input); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Veli bilgileri okunamadı.", nil)
		return
	}
	item, err := h.school.UpdateManagedGuardian(r.Context(), principal.TenantID, r.PathValue("id"), input)
	if errors.Is(err, schoolapp.ErrGuardianNotFound) {
		httpx.WriteError(w, http.StatusNotFound, "GUARDIAN_NOT_FOUND", "Veli kaydı bulunamadı.", nil)
		return
	}
	if errors.Is(err, schoolapp.ErrInvalidInput) {
		httpx.WriteError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Geçerli veli bilgileri gönderilmelidir.", nil)
		return
	}
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "GUARDIAN_UPDATE_FAILED", "Veli kaydı güncellenemedi.", nil)
		return
	}
	httpx.WriteJSON(w, http.StatusOK, item, nil)
}

func (h *Handler) setPrincipalGuardianStatus(w http.ResponseWriter, r *http.Request) {
	principal, ok := requireSchoolOperator(w, r)
	if !ok {
		return
	}
	var input schooldomain.SetManagedGuardianStatusInput
	if err := httpx.DecodeJSON(r, &input); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Durum bilgisi okunamadı.", nil)
		return
	}
	item, err := h.school.SetManagedGuardianStatus(r.Context(), principal.TenantID, r.PathValue("id"), input.Status)
	if errors.Is(err, schoolapp.ErrGuardianNotFound) {
		httpx.WriteError(w, http.StatusNotFound, "GUARDIAN_NOT_FOUND", "Veli kaydı bulunamadı.", nil)
		return
	}
	if errors.Is(err, schoolapp.ErrInvalidInput) {
		httpx.WriteError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Durum active veya passive olmalıdır.", nil)
		return
	}
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "GUARDIAN_STATUS_FAILED", "Veli durumu güncellenemedi.", nil)
		return
	}
	httpx.WriteJSON(w, http.StatusOK, item, nil)
}

func (h *Handler) resetPrincipalGuardianPassword(w http.ResponseWriter, r *http.Request) {
	principal, ok := requireSchoolOperator(w, r)
	if !ok {
		return
	}
	tempPassword, err := h.school.ResetManagedGuardianPassword(r.Context(), principal.TenantID, r.PathValue("id"))
	if errors.Is(err, schoolapp.ErrGuardianNotFound) {
		httpx.WriteError(w, http.StatusNotFound, "GUARDIAN_NOT_FOUND", "Veli kaydı bulunamadı.", nil)
		return
	}
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "GUARDIAN_RESET_FAILED", "Veli şifresi sıfırlanamadı.", nil)
		return
	}
	httpx.WriteJSON(w, http.StatusOK, map[string]string{"temporaryPassword": tempPassword}, nil)
}

func (h *Handler) linkPrincipalGuardianStudent(w http.ResponseWriter, r *http.Request) {
	principal, ok := requireSchoolOperator(w, r)
	if !ok {
		return
	}
	var input schooldomain.LinkManagedGuardianStudentInput
	if err := httpx.DecodeJSON(r, &input); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Öğrenci bağlantı verisi okunamadı.", nil)
		return
	}
	item, err := h.school.LinkManagedGuardianStudent(r.Context(), principal.TenantID, r.PathValue("id"), input)
	if errors.Is(err, schoolapp.ErrGuardianNotFound) {
		httpx.WriteError(w, http.StatusNotFound, "GUARDIAN_NOT_FOUND", "Veli kaydı bulunamadı.", nil)
		return
	}
	if errors.Is(err, schoolapp.ErrStudentNotFound) {
		httpx.WriteError(w, http.StatusNotFound, "STUDENT_NOT_FOUND", "Bağlanacak öğrenci bulunamadı.", nil)
		return
	}
	if errors.Is(err, schoolapp.ErrGuardianLinkExists) {
		httpx.WriteError(w, http.StatusConflict, "GUARDIAN_LINK_EXISTS", "Bu öğrenci zaten veliye bağlı.", nil)
		return
	}
	if errors.Is(err, schoolapp.ErrInvalidInput) {
		httpx.WriteError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Geçerli öğrenci bilgisi gönderilmelidir.", nil)
		return
	}
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "GUARDIAN_LINK_FAILED", "Öğrenci bağlantısı oluşturulamadı.", nil)
		return
	}
	httpx.WriteJSON(w, http.StatusOK, item, nil)
}

func (h *Handler) unlinkPrincipalGuardianStudent(w http.ResponseWriter, r *http.Request) {
	principal, ok := requireSchoolOperator(w, r)
	if !ok {
		return
	}
	item, err := h.school.UnlinkManagedGuardianStudent(r.Context(), principal.TenantID, r.PathValue("id"), r.PathValue("studentId"))
	if errors.Is(err, schoolapp.ErrGuardianNotFound) {
		httpx.WriteError(w, http.StatusNotFound, "GUARDIAN_NOT_FOUND", "Veli kaydı bulunamadı.", nil)
		return
	}
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "GUARDIAN_UNLINK_FAILED", "Öğrenci bağlantısı kaldırılamadı.", nil)
		return
	}
	httpx.WriteJSON(w, http.StatusOK, item, nil)
}
