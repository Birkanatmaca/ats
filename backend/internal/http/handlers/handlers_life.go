package handlers

import (
	"errors"
	"net/http"

	lifeapp "ots/backend/internal/app/life"
	"ots/backend/internal/domain/identity"
	lifedomain "ots/backend/internal/domain/life"
	"ots/backend/internal/platform/httpx"
)

func (h *Handler) registerLifeRoutes(mux *http.ServeMux) {
	mux.HandleFunc("GET /api/v1/life/meals", h.listLifeMeals)
	mux.HandleFunc("POST /api/v1/life/meals", h.createLifeMeal)
	mux.HandleFunc("PATCH /api/v1/life/meals/{id}", h.updateLifeMeal)
	mux.HandleFunc("DELETE /api/v1/life/meals/{id}", h.deleteLifeMeal)
	mux.HandleFunc("GET /api/v1/life/study-sessions", h.listStudySessions)
	mux.HandleFunc("POST /api/v1/life/study-sessions", h.createStudySession)
	mux.HandleFunc("PATCH /api/v1/life/study-sessions/{id}", h.updateStudySession)
	mux.HandleFunc("POST /api/v1/life/study-sessions/{id}/attendance", h.recordStudyAttendance)
	mux.HandleFunc("GET /api/v1/life/clubs", h.listLifeClubs)
	mux.HandleFunc("POST /api/v1/life/clubs", h.createLifeClub)
	mux.HandleFunc("PATCH /api/v1/life/clubs/{id}", h.updateLifeClub)
	mux.HandleFunc("POST /api/v1/life/clubs/{id}/memberships", h.addLifeClubMembership)
	mux.HandleFunc("GET /api/v1/guardian/students/{studentId}/life", h.guardianStudentLife)
}

func (h *Handler) listLifeMeals(w http.ResponseWriter, r *http.Request) {
	principal, ok := requireLifeViewer(w, r)
	if !ok {
		return
	}
	items, err := h.life.Meals(r.Context(), principal.TenantID, lifedomain.MealFilter{
		FromDate: r.URL.Query().Get("fromDate"),
		ToDate:   r.URL.Query().Get("toDate"),
	})
	if writeLifeError(w, err) {
		return
	}
	httpx.WriteJSON(w, http.StatusOK, items, nil)
}

func (h *Handler) createLifeMeal(w http.ResponseWriter, r *http.Request) {
	principal, ok := requireLifeOperator(w, r)
	if !ok {
		return
	}
	var input lifedomain.CreateMealInput
	if err := httpx.DecodeJSON(r, &input); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Yemek menüsü verisi okunamadı.", nil)
		return
	}
	item, err := h.life.CreateMeal(r.Context(), principal.TenantID, principal.UserID, input)
	if writeLifeError(w, err) {
		return
	}
	httpx.WriteJSON(w, http.StatusCreated, item, nil)
}

func (h *Handler) updateLifeMeal(w http.ResponseWriter, r *http.Request) {
	principal, ok := requireLifeOperator(w, r)
	if !ok {
		return
	}
	var input lifedomain.UpdateMealInput
	if err := httpx.DecodeJSON(r, &input); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Yemek menüsü güncellemesi okunamadı.", nil)
		return
	}
	item, err := h.life.UpdateMeal(r.Context(), principal.TenantID, r.PathValue("id"), principal.UserID, input)
	if writeLifeError(w, err) {
		return
	}
	httpx.WriteJSON(w, http.StatusOK, item, nil)
}

func (h *Handler) deleteLifeMeal(w http.ResponseWriter, r *http.Request) {
	principal, ok := requireLifeOperator(w, r)
	if !ok {
		return
	}
	if err := h.life.DeleteMeal(r.Context(), principal.TenantID, r.PathValue("id"), principal.UserID); writeLifeError(w, err) {
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *Handler) listStudySessions(w http.ResponseWriter, r *http.Request) {
	principal, ok := requireLifeViewer(w, r)
	if !ok {
		return
	}
	items, err := h.life.StudySessions(r.Context(), principal)
	if writeLifeError(w, err) {
		return
	}
	httpx.WriteJSON(w, http.StatusOK, items, nil)
}

func (h *Handler) createStudySession(w http.ResponseWriter, r *http.Request) {
	principal, ok := requireLifeOperator(w, r)
	if !ok {
		return
	}
	var input lifedomain.CreateStudySessionInput
	if err := httpx.DecodeJSON(r, &input); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Etüt oturumu verisi okunamadı.", nil)
		return
	}
	item, err := h.life.CreateStudySession(r.Context(), principal, input)
	if writeLifeError(w, err) {
		return
	}
	httpx.WriteJSON(w, http.StatusCreated, item, nil)
}

func (h *Handler) updateStudySession(w http.ResponseWriter, r *http.Request) {
	principal, ok := requireLifeViewer(w, r)
	if !ok {
		return
	}
	var input lifedomain.UpdateStudySessionInput
	if err := httpx.DecodeJSON(r, &input); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Etüt oturumu güncellemesi okunamadı.", nil)
		return
	}
	item, err := h.life.UpdateStudySession(r.Context(), principal, r.PathValue("id"), input)
	if writeLifeError(w, err) {
		return
	}
	httpx.WriteJSON(w, http.StatusOK, item, nil)
}

func (h *Handler) recordStudyAttendance(w http.ResponseWriter, r *http.Request) {
	principal, ok := requireLifeViewer(w, r)
	if !ok {
		return
	}
	var input lifedomain.RecordStudyAttendanceInput
	if err := httpx.DecodeJSON(r, &input); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Etüt katılım verisi okunamadı.", nil)
		return
	}
	items, err := h.life.RecordStudyAttendance(r.Context(), principal, r.PathValue("id"), input)
	if writeLifeError(w, err) {
		return
	}
	httpx.WriteJSON(w, http.StatusCreated, items, nil)
}

func (h *Handler) listLifeClubs(w http.ResponseWriter, r *http.Request) {
	principal, ok := requireLifeViewer(w, r)
	if !ok {
		return
	}
	items, err := h.life.Clubs(r.Context(), principal)
	if writeLifeError(w, err) {
		return
	}
	httpx.WriteJSON(w, http.StatusOK, items, nil)
}

func (h *Handler) createLifeClub(w http.ResponseWriter, r *http.Request) {
	principal, ok := requireLifeOperator(w, r)
	if !ok {
		return
	}
	var input lifedomain.CreateClubInput
	if err := httpx.DecodeJSON(r, &input); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Kulüp verisi okunamadı.", nil)
		return
	}
	item, err := h.life.CreateClub(r.Context(), principal, input)
	if writeLifeError(w, err) {
		return
	}
	httpx.WriteJSON(w, http.StatusCreated, item, nil)
}

func (h *Handler) updateLifeClub(w http.ResponseWriter, r *http.Request) {
	principal, ok := requireLifeViewer(w, r)
	if !ok {
		return
	}
	var input lifedomain.UpdateClubInput
	if err := httpx.DecodeJSON(r, &input); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Kulüp güncellemesi okunamadı.", nil)
		return
	}
	item, err := h.life.UpdateClub(r.Context(), principal, r.PathValue("id"), input)
	if writeLifeError(w, err) {
		return
	}
	httpx.WriteJSON(w, http.StatusOK, item, nil)
}

func (h *Handler) addLifeClubMembership(w http.ResponseWriter, r *http.Request) {
	principal, ok := requireLifeViewer(w, r)
	if !ok {
		return
	}
	var input lifedomain.ClubMembershipInput
	if err := httpx.DecodeJSON(r, &input); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Kulüp üyelik verisi okunamadı.", nil)
		return
	}
	item, err := h.life.AddClubMembership(r.Context(), principal, r.PathValue("id"), input)
	if writeLifeError(w, err) {
		return
	}
	httpx.WriteJSON(w, http.StatusCreated, item, nil)
}

func (h *Handler) guardianStudentLife(w http.ResponseWriter, r *http.Request) {
	principal, ok := requireGuardian(w, r)
	if !ok {
		return
	}
	summary, err := h.life.GuardianSummary(r.Context(), principal.TenantID, principal.UserID, r.PathValue("studentId"))
	if writeLifeError(w, err) {
		return
	}
	httpx.WriteJSON(w, http.StatusOK, summary, nil)
}

func requireLifeViewer(w http.ResponseWriter, r *http.Request) (identity.Principal, bool) {
	return requirePrincipalRole(w, r, identity.RolePrincipal, identity.RoleSystemAdmin, identity.RoleTeacher)
}

func requireLifeOperator(w http.ResponseWriter, r *http.Request) (identity.Principal, bool) {
	return requirePrincipalRole(w, r, identity.RolePrincipal, identity.RoleSystemAdmin)
}

func writeLifeError(w http.ResponseWriter, err error) bool {
	if err == nil {
		return false
	}
	if errors.Is(err, lifeapp.ErrInvalidInput) {
		httpx.WriteError(w, http.StatusBadRequest, "LIFE_VALIDATION_ERROR", "Okul yaşamı verisi eksik veya geçersiz.", nil)
		return true
	}
	if errors.Is(err, lifeapp.ErrForbidden) {
		httpx.WriteError(w, http.StatusForbidden, "FORBIDDEN", "Bu okul yaşamı bilgisine erişim yetkiniz yok.", nil)
		return true
	}
	if errors.Is(err, lifeapp.ErrNotFound) {
		httpx.WriteError(w, http.StatusNotFound, "LIFE_NOT_FOUND", "Okul yaşamı kaydı bulunamadı.", nil)
		return true
	}
	httpx.WriteError(w, http.StatusInternalServerError, "LIFE_OPERATION_FAILED", "Okul yaşamı işlemi tamamlanamadı.", nil)
	return true
}
