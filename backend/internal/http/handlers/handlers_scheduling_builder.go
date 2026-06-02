package handlers

import (
	"net/http"

	"ots/backend/internal/domain/identity"
	schedulingdomain "ots/backend/internal/domain/scheduling"
	"ots/backend/internal/platform/httpx"
)

func (h *Handler) cloneSchedule(w http.ResponseWriter, r *http.Request) {
	principal, ok := requirePrincipalRole(w, r, identity.RolePrincipal, identity.RoleSystemAdmin)
	if !ok {
		return
	}
	schedule, found, err := h.scheduling.CloneSchedule(r.Context(), principal.TenantID, r.PathValue("id"), principal.UserID)
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "SCHEDULE_CLONE_FAILED", "Program kopyalanamadı.", nil)
		return
	}
	if !found {
		httpx.WriteError(w, http.StatusNotFound, "SCHEDULE_NOT_FOUND", "Ders programı bulunamadı.", nil)
		return
	}
	httpx.WriteJSON(w, http.StatusCreated, schedule, nil)
}

func (h *Handler) scheduleConflicts(w http.ResponseWriter, r *http.Request) {
	principal, ok := requirePrincipalRole(w, r, identity.RolePrincipal, identity.RoleSystemAdmin)
	if !ok {
		return
	}
	httpx.WriteJSON(w, http.StatusOK, h.scheduling.ScheduleConflicts(r.Context(), principal.TenantID, r.PathValue("id")), nil)
}

func (h *Handler) scheduleChangeLog(w http.ResponseWriter, r *http.Request) {
	principal, ok := requirePrincipalRole(w, r, identity.RolePrincipal, identity.RoleSystemAdmin)
	if !ok {
		return
	}
	items := h.scheduling.ListScheduleChangeLogs(r.Context(), principal.TenantID, r.PathValue("id"), 50)
	httpx.WriteJSON(w, http.StatusOK, items, nil)
}

func (h *Handler) saveTeacherAvailabilitiesBulk(w http.ResponseWriter, r *http.Request) {
	principal, ok := requirePrincipalRole(w, r, identity.RolePrincipal, identity.RoleSystemAdmin)
	if !ok {
		return
	}
	var input schedulingdomain.BulkAvailabilityInput
	if err := httpx.DecodeJSON(r, &input); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Müsaitlik verisi okunamadı.", nil)
		return
	}
	items, err := h.scheduling.SaveTeacherAvailabilitiesBulk(r.Context(), principal.TenantID, input.Items)
	if err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "AVAILABILITY_SAVE_FAILED", "Öğretmen müsaitlikleri kaydedilemedi.", nil)
		return
	}
	httpx.WriteJSON(w, http.StatusOK, items, nil)
}
