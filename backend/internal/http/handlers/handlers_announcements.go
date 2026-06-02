package handlers

import (
	"context"
	"errors"
	"net/http"
	"strings"

	announcementapp "ots/backend/internal/app/announcement"
	announcementdomain "ots/backend/internal/domain/announcement"
	"ots/backend/internal/domain/identity"
	"ots/backend/internal/platform/httpx"
)

func (h *Handler) registerAnnouncementRoutes(mux *http.ServeMux) {
	mux.HandleFunc("GET /api/v1/announcements", h.listAnnouncements)
	mux.HandleFunc("POST /api/v1/announcements", h.createAnnouncement)
	mux.HandleFunc("GET /api/v1/announcements/{id}", h.getAnnouncement)
	mux.HandleFunc("PATCH /api/v1/announcements/{id}", h.updateAnnouncement)
	mux.HandleFunc("DELETE /api/v1/announcements/{id}", h.deleteAnnouncement)
	mux.HandleFunc("POST /api/v1/announcements/{id}/publish", h.publishAnnouncement)
	mux.HandleFunc("POST /api/v1/announcements/{id}/archive", h.archiveAnnouncement)
	mux.HandleFunc("PATCH /api/v1/announcements/{id}/read", h.markAnnouncementRead)

	mux.HandleFunc("GET /api/v1/announcement-templates", h.listAnnouncementTemplates)
	mux.HandleFunc("POST /api/v1/announcement-templates", h.createAnnouncementTemplate)
	mux.HandleFunc("PATCH /api/v1/announcement-templates/{id}", h.updateAnnouncementTemplate)
	mux.HandleFunc("DELETE /api/v1/announcement-templates/{id}", h.deleteAnnouncementTemplate)
}

func (h *Handler) canManageAnnouncements(role identity.Role) bool {
	return role == identity.RolePrincipal || role == identity.RoleSystemAdmin || role == identity.RoleSuperAdmin
}

func (h *Handler) listAnnouncements(w http.ResponseWriter, r *http.Request) {
	principal, ok := requirePrincipal(w, r)
	if !ok {
		return
	}
	manage := h.canManageAnnouncements(principal.Role) && strings.EqualFold(strings.TrimSpace(r.URL.Query().Get("manage")), "true")
	items, err := h.announcements.ListForUser(r.Context(), principal.TenantID, principal.UserID, manage)
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "ANNOUNCEMENTS_LIST_FAILED", "Duyurular okunamadı.", nil)
		return
	}
	if manage {
		items, err = h.announcements.EnrichManageStats(r.Context(), principal.TenantID, items)
		if err != nil {
			httpx.WriteError(w, http.StatusInternalServerError, "ANNOUNCEMENTS_STATS_FAILED", "Duyuru istatistikleri okunamadı.", nil)
			return
		}
	}
	httpx.WriteJSON(w, http.StatusOK, items, nil)
}

func (h *Handler) createAnnouncement(w http.ResponseWriter, r *http.Request) {
	principal, ok := requirePrincipalRole(w, r, identity.RolePrincipal, identity.RoleSystemAdmin, identity.RoleSuperAdmin)
	if !ok {
		return
	}
	var input announcementdomain.CreateInput
	if err := httpx.DecodeJSON(r, &input); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Duyuru bilgileri okunamadı.", nil)
		return
	}
	if !input.Publish && strings.TrimSpace(input.Audience) != "" && len(input.Audiences) == 0 {
		input.Publish = true
	}
	created, err := h.announcements.Create(r.Context(), principal.TenantID, principal.UserID, input)
	if errors.Is(err, announcementapp.ErrInvalidInput) {
		httpx.WriteError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Başlık, içerik ve hedef kitle zorunludur.", nil)
		return
	}
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "ANNOUNCEMENT_CREATE_FAILED", "Duyuru oluşturulamadı.", nil)
		return
	}
	if created.Status == announcementdomain.StatusPublished {
		h.dispatchAnnouncementPush(principal.TenantID, created)
	}
	httpx.WriteJSON(w, http.StatusCreated, created, nil)
}

func (h *Handler) getAnnouncement(w http.ResponseWriter, r *http.Request) {
	principal, ok := requirePrincipal(w, r)
	if !ok {
		return
	}
	manage := h.canManageAnnouncements(principal.Role)
	item, err := h.announcements.Get(r.Context(), principal.TenantID, principal.UserID, r.PathValue("id"), manage)
	if errors.Is(err, announcementapp.ErrNotFound) {
		httpx.WriteError(w, http.StatusNotFound, "ANNOUNCEMENT_NOT_FOUND", "Duyuru bulunamadı.", nil)
		return
	}
	if errors.Is(err, announcementapp.ErrForbidden) {
		httpx.WriteError(w, http.StatusForbidden, "FORBIDDEN", "Bu duyuruya erişiminiz yok.", nil)
		return
	}
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "ANNOUNCEMENT_LOOKUP_FAILED", "Duyuru okunamadı.", nil)
		return
	}
	httpx.WriteJSON(w, http.StatusOK, item, nil)
}

func (h *Handler) updateAnnouncement(w http.ResponseWriter, r *http.Request) {
	principal, ok := requirePrincipalRole(w, r, identity.RolePrincipal, identity.RoleSystemAdmin, identity.RoleSuperAdmin)
	if !ok {
		return
	}
	var input announcementdomain.UpdateInput
	if err := httpx.DecodeJSON(r, &input); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Duyuru güncellemesi okunamadı.", nil)
		return
	}
	updated, err := h.announcements.Update(r.Context(), principal.TenantID, principal.UserID, r.PathValue("id"), input)
	if errors.Is(err, announcementapp.ErrInvalidInput) {
		httpx.WriteError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Güncellenecek duyuru alanları geçerli olmalıdır.", nil)
		return
	}
	if errors.Is(err, announcementapp.ErrPublishedImmutable) {
		httpx.WriteError(w, http.StatusConflict, "ANNOUNCEMENT_IMMUTABLE", "Yayınlanmış duyuruda hedef kitle değiştirilemez.", nil)
		return
	}
	if errors.Is(err, announcementapp.ErrNotFound) {
		httpx.WriteError(w, http.StatusNotFound, "ANNOUNCEMENT_NOT_FOUND", "Duyuru bulunamadı.", nil)
		return
	}
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "ANNOUNCEMENT_UPDATE_FAILED", "Duyuru güncellenemedi.", nil)
		return
	}
	httpx.WriteJSON(w, http.StatusOK, updated, nil)
}

func (h *Handler) deleteAnnouncement(w http.ResponseWriter, r *http.Request) {
	principal, ok := requirePrincipalRole(w, r, identity.RolePrincipal, identity.RoleSystemAdmin, identity.RoleSuperAdmin)
	if !ok {
		return
	}
	if err := h.announcements.Delete(r.Context(), principal.TenantID, principal.UserID, r.PathValue("id")); errors.Is(err, announcementapp.ErrNotFound) {
		httpx.WriteError(w, http.StatusNotFound, "ANNOUNCEMENT_NOT_FOUND", "Duyuru bulunamadı.", nil)
		return
	} else if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "ANNOUNCEMENT_DELETE_FAILED", "Duyuru silinemedi.", nil)
		return
	}
	httpx.WriteJSON(w, http.StatusNoContent, nil, nil)
}

func (h *Handler) publishAnnouncement(w http.ResponseWriter, r *http.Request) {
	principal, ok := requirePrincipalRole(w, r, identity.RolePrincipal, identity.RoleSystemAdmin, identity.RoleSuperAdmin)
	if !ok {
		return
	}
	published, userIDs, err := h.announcements.Publish(r.Context(), principal.TenantID, principal.UserID, r.PathValue("id"))
	if errors.Is(err, announcementapp.ErrNotFound) {
		httpx.WriteError(w, http.StatusNotFound, "ANNOUNCEMENT_NOT_FOUND", "Duyuru bulunamadı.", nil)
		return
	}
	if errors.Is(err, announcementapp.ErrInvalidInput) {
		httpx.WriteError(w, http.StatusConflict, "ANNOUNCEMENT_NOT_DUE", "Planlanmış duyuru henüz yayınlanamaz.", nil)
		return
	}
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "ANNOUNCEMENT_PUBLISH_FAILED", "Duyuru yayınlanamadı.", nil)
		return
	}
	h.dispatchAnnouncementPushToUsers(principal.TenantID, published, userIDs)
	httpx.WriteJSON(w, http.StatusOK, published, nil)
}

func (h *Handler) archiveAnnouncement(w http.ResponseWriter, r *http.Request) {
	principal, ok := requirePrincipalRole(w, r, identity.RolePrincipal, identity.RoleSystemAdmin, identity.RoleSuperAdmin)
	if !ok {
		return
	}
	archived, err := h.announcements.Archive(r.Context(), principal.TenantID, principal.UserID, r.PathValue("id"))
	if errors.Is(err, announcementapp.ErrNotFound) {
		httpx.WriteError(w, http.StatusNotFound, "ANNOUNCEMENT_NOT_FOUND", "Duyuru bulunamadı.", nil)
		return
	}
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "ANNOUNCEMENT_ARCHIVE_FAILED", "Duyuru arşivlenemedi.", nil)
		return
	}
	httpx.WriteJSON(w, http.StatusOK, archived, nil)
}

func (h *Handler) markAnnouncementRead(w http.ResponseWriter, r *http.Request) {
	principal, ok := requirePrincipal(w, r)
	if !ok {
		return
	}
	if err := h.announcements.MarkRead(r.Context(), principal.TenantID, principal.UserID, r.PathValue("id")); errors.Is(err, announcementapp.ErrNotFound) {
		httpx.WriteError(w, http.StatusNotFound, "ANNOUNCEMENT_NOT_FOUND", "Duyuru bulunamadı.", nil)
		return
	} else if errors.Is(err, announcementapp.ErrForbidden) {
		httpx.WriteError(w, http.StatusForbidden, "FORBIDDEN", "Bu duyuruyu okundu işaretleyemezsiniz.", nil)
		return
	} else if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "ANNOUNCEMENT_READ_FAILED", "Okundu bilgisi kaydedilemedi.", nil)
		return
	}
	httpx.WriteJSON(w, http.StatusNoContent, nil, nil)
}

func (h *Handler) listAnnouncementTemplates(w http.ResponseWriter, r *http.Request) {
	principal, ok := requirePrincipalRole(w, r, identity.RolePrincipal, identity.RoleSystemAdmin, identity.RoleSuperAdmin)
	if !ok {
		return
	}
	items, err := h.announcements.ListTemplates(r.Context(), principal.TenantID)
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "ANNOUNCEMENT_TEMPLATES_FAILED", "Duyuru şablonları okunamadı.", nil)
		return
	}
	httpx.WriteJSON(w, http.StatusOK, items, nil)
}

func (h *Handler) createAnnouncementTemplate(w http.ResponseWriter, r *http.Request) {
	principal, ok := requirePrincipalRole(w, r, identity.RolePrincipal, identity.RoleSystemAdmin, identity.RoleSuperAdmin)
	if !ok {
		return
	}
	var input announcementdomain.CreateTemplateInput
	if err := httpx.DecodeJSON(r, &input); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Şablon bilgileri okunamadı.", nil)
		return
	}
	created, err := h.announcements.CreateTemplate(r.Context(), principal.TenantID, principal.UserID, input)
	if errors.Is(err, announcementapp.ErrInvalidInput) {
		httpx.WriteError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Şablon adı ve içerik zorunludur.", nil)
		return
	}
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "ANNOUNCEMENT_TEMPLATE_CREATE_FAILED", "Şablon oluşturulamadı.", nil)
		return
	}
	httpx.WriteJSON(w, http.StatusCreated, created, nil)
}

func (h *Handler) updateAnnouncementTemplate(w http.ResponseWriter, r *http.Request) {
	principal, ok := requirePrincipalRole(w, r, identity.RolePrincipal, identity.RoleSystemAdmin, identity.RoleSuperAdmin)
	if !ok {
		return
	}
	var input announcementdomain.UpdateTemplateInput
	if err := httpx.DecodeJSON(r, &input); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Şablon güncellemesi okunamadı.", nil)
		return
	}
	updated, err := h.announcements.UpdateTemplate(r.Context(), principal.TenantID, principal.UserID, r.PathValue("id"), input)
	if errors.Is(err, announcementapp.ErrTemplateNotFound) {
		httpx.WriteError(w, http.StatusNotFound, "ANNOUNCEMENT_TEMPLATE_NOT_FOUND", "Şablon bulunamadı.", nil)
		return
	}
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "ANNOUNCEMENT_TEMPLATE_UPDATE_FAILED", "Şablon güncellenemedi.", nil)
		return
	}
	httpx.WriteJSON(w, http.StatusOK, updated, nil)
}

func (h *Handler) deleteAnnouncementTemplate(w http.ResponseWriter, r *http.Request) {
	principal, ok := requirePrincipalRole(w, r, identity.RolePrincipal, identity.RoleSystemAdmin, identity.RoleSuperAdmin)
	if !ok {
		return
	}
	if err := h.announcements.DeleteTemplate(r.Context(), principal.TenantID, principal.UserID, r.PathValue("id")); errors.Is(err, announcementapp.ErrTemplateNotFound) {
		httpx.WriteError(w, http.StatusNotFound, "ANNOUNCEMENT_TEMPLATE_NOT_FOUND", "Şablon bulunamadı.", nil)
		return
	} else if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "ANNOUNCEMENT_TEMPLATE_DELETE_FAILED", "Şablon silinemedi.", nil)
		return
	}
	httpx.WriteJSON(w, http.StatusNoContent, nil, nil)
}

func (h *Handler) dispatchAnnouncementPush(tenantID string, item announcementdomain.Announcement) {
	userIDs, err := h.announcements.ResolveTargetUserIDs(context.Background(), tenantID, item.Audiences)
	if err != nil {
		return
	}
	h.dispatchAnnouncementPushToUsers(tenantID, item, userIDs)
}

func (h *Handler) dispatchAnnouncementPushToUsers(tenantID string, item announcementdomain.Announcement, userIDs []string) {
	if h.push == nil || len(userIDs) == 0 {
		return
	}
	h.dispatchPush(func(ctx context.Context) {
		h.push.NotifyAnnouncementToUsers(ctx, tenantID, item.ID, item.Title, item.Body, userIDs)
	})
}

func (h *Handler) guardianAnnouncements(w http.ResponseWriter, r *http.Request) {
	principal, ok := requireGuardian(w, r)
	if !ok {
		return
	}
	items, err := h.announcements.ListForUser(r.Context(), principal.TenantID, principal.UserID, false)
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "ANNOUNCEMENTS_LIST_FAILED", "Duyurular okunamadı.", nil)
		return
	}
	httpx.WriteJSON(w, http.StatusOK, items, nil)
}
