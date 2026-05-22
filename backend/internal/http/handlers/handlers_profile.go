package handlers

import (
	"errors"
	"net/http"

	superadminapp "ots/backend/internal/app/superadmin"
	"ots/backend/internal/domain/identity"
	superadminDomain "ots/backend/internal/domain/superadmin"
	"ots/backend/internal/platform/httpx"
)

func (h *Handler) registerProfileRoutes(mux *http.ServeMux) {
	mux.HandleFunc("GET /api/v1/profile", h.getProfile)
	mux.HandleFunc("PATCH /api/v1/profile", h.updateProfile)
	mux.HandleFunc("GET /api/v1/principal/users", h.principalUsers)
	mux.HandleFunc("PATCH /api/v1/principal/users/{id}", h.principalUpdateUser)
}

func (h *Handler) getProfile(w http.ResponseWriter, r *http.Request) {
	principal, ok := requirePrincipal(w, r)
	if !ok {
		return
	}
	profile, found, err := h.superAdmin.GetUserProfile(r.Context(), principal.TenantID, principal.UserID)
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "PROFILE_FAILED", "Profil alınamadı.", nil)
		return
	}
	if !found {
		httpx.WriteError(w, http.StatusNotFound, "PROFILE_NOT_FOUND", "Profil bulunamadı.", nil)
		return
	}
	httpx.WriteJSON(w, http.StatusOK, profile, nil)
}

func (h *Handler) updateProfile(w http.ResponseWriter, r *http.Request) {
	principal, ok := requirePrincipal(w, r)
	if !ok {
		return
	}
	var input superadminDomain.UpdateSelfProfileInput
	if err := httpx.DecodeJSON(r, &input); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Profil güncellemesi okunamadı.", nil)
		return
	}
	profile, err := h.superAdmin.UpdateSelfProfile(r.Context(), principal, input)
	if errors.Is(err, superadminapp.ErrInvalidUser) {
		httpx.WriteError(w, http.StatusBadRequest, "INVALID_PROFILE", "Görsel ayarlar geçersiz.", nil)
		return
	}
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "PROFILE_UPDATE_FAILED", "Profil güncellenemedi.", nil)
		return
	}
	httpx.WriteJSON(w, http.StatusOK, profile, nil)
}

func (h *Handler) principalUsers(w http.ResponseWriter, r *http.Request) {
	principal, ok := requirePrincipalRole(w, r, identity.RolePrincipal, identity.RoleSystemAdmin)
	if !ok {
		return
	}
	users, err := h.superAdmin.InstitutionUsers(r.Context(), principal.TenantID)
	if errors.Is(err, superadminapp.ErrInstitutionNotFound) {
		httpx.WriteError(w, http.StatusNotFound, "INSTITUTION_NOT_FOUND", "Kurum bulunamadı.", nil)
		return
	}
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "USERS_FAILED", "Kullanıcılar alınamadı.", nil)
		return
	}
	httpx.WriteJSON(w, http.StatusOK, users, nil)
}

func (h *Handler) principalUpdateUser(w http.ResponseWriter, r *http.Request) {
	principal, ok := requirePrincipalRole(w, r, identity.RolePrincipal, identity.RoleSystemAdmin)
	if !ok {
		return
	}
	var input superadminDomain.UpdateUserInput
	if err := httpx.DecodeJSON(r, &input); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Kullanıcı güncellemesi okunamadı.", nil)
		return
	}
	input.TenantID = principal.TenantID
	user, found, err := h.superAdmin.UpdateUser(r.Context(), principal, r.PathValue("id"), input)
	if errors.Is(err, superadminapp.ErrInvalidUser) {
		httpx.WriteError(w, http.StatusBadRequest, "INVALID_USER", "Kullanıcı bilgileri geçersiz.", nil)
		return
	}
	if errors.Is(err, superadminapp.ErrProtectedUser) {
		httpx.WriteError(w, http.StatusForbidden, "PROTECTED_USER", "Bu kullanıcı düzenlenemez.", nil)
		return
	}
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "USER_UPDATE_FAILED", "Kullanıcı güncellenemedi.", nil)
		return
	}
	if !found {
		httpx.WriteError(w, http.StatusNotFound, "USER_NOT_FOUND", "Kullanıcı bulunamadı.", nil)
		return
	}
	httpx.WriteJSON(w, http.StatusOK, user, nil)
}
