package handlers

import (
	"context"
	"errors"
	"net/http"
	"os"
	"strconv"
	"strings"

	pushapp "ots/backend/internal/app/push"
	pushdomain "ots/backend/internal/domain/push"
	attendancedomain "ots/backend/internal/domain/attendance"
	"ots/backend/internal/domain/identity"
	schooldomain "ots/backend/internal/domain/school"
	superadmindomain "ots/backend/internal/domain/superadmin"
	"ots/backend/internal/platform/httpx"
)

func (h *Handler) registerPushRoutes(mux *http.ServeMux) {
	mux.HandleFunc("GET /api/v1/me/notification-preferences", h.notificationPreferences)
	mux.HandleFunc("PATCH /api/v1/me/notification-preferences", h.updateNotificationPreferences)
	mux.HandleFunc("GET /api/v1/me/device-tokens", h.listMyDeviceTokens)
	mux.HandleFunc("POST /api/v1/me/device-tokens", h.registerDeviceToken)
	mux.HandleFunc("DELETE /api/v1/me/device-tokens", h.unregisterDeviceToken)
	mux.HandleFunc("PATCH /api/v1/me/device-tokens/{id}/revoke", h.revokeDeviceToken)
	mux.HandleFunc("POST /api/v1/push/test", h.pushTest)
	mux.HandleFunc("GET /api/v1/super-admin/push/health", h.superAdminPushHealth)
	mux.HandleFunc("GET /api/v1/super-admin/push/logs", h.superAdminPushLogs)
}

func (h *Handler) registerDeviceToken(w http.ResponseWriter, r *http.Request) {
	principal, ok := requirePrincipal(w, r)
	if !ok {
		return
	}
	if h.push == nil {
		httpx.WriteError(w, http.StatusServiceUnavailable, "PUSH_UNAVAILABLE", "Push bildirim servisi kullanılamıyor.", nil)
		return
	}
	var input pushdomain.RegisterDeviceTokenInput
	if err := httpx.DecodeJSON(r, &input); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Cihaz token bilgisi okunamadı.", nil)
		return
	}
	item, err := h.push.RegisterDeviceToken(r.Context(), principal.TenantID, principal.UserID, input)
	if errors.Is(err, pushapp.ErrInvalidDeviceToken) {
		httpx.WriteError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Geçerli bir cihaz tokenı gerekli.", nil)
		return
	}
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "DEVICE_TOKEN_REGISTER_FAILED", "Cihaz token kaydedilemedi.", nil)
		return
	}
	httpx.WriteJSON(w, http.StatusCreated, item, nil)
}

func (h *Handler) listMyDeviceTokens(w http.ResponseWriter, r *http.Request) {
	principal, ok := requirePrincipal(w, r)
	if !ok {
		return
	}
	if h.push == nil {
		httpx.WriteJSON(w, http.StatusOK, []pushdomain.DeviceToken{}, nil)
		return
	}
	items, err := h.push.MyDeviceTokens(r.Context(), principal.TenantID, principal.UserID)
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "DEVICE_TOKEN_LIST_FAILED", "Cihaz token listesi alınamadı.", nil)
		return
	}
	httpx.WriteJSON(w, http.StatusOK, items, nil)
}

func (h *Handler) revokeDeviceToken(w http.ResponseWriter, r *http.Request) {
	principal, ok := requirePrincipal(w, r)
	if !ok {
		return
	}
	if h.push == nil {
		httpx.WriteJSON(w, http.StatusNoContent, nil, nil)
		return
	}
	if err := h.push.RevokeDeviceToken(r.Context(), principal.TenantID, principal.UserID, r.PathValue("id")); errors.Is(err, pushapp.ErrDeviceTokenNotFound) {
		httpx.WriteError(w, http.StatusNotFound, "DEVICE_TOKEN_NOT_FOUND", "Cihaz token bulunamadı.", nil)
		return
	} else if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "DEVICE_TOKEN_REVOKE_FAILED", "Cihaz token iptal edilemedi.", nil)
		return
	}
	httpx.WriteJSON(w, http.StatusNoContent, nil, nil)
}

func (h *Handler) unregisterDeviceToken(w http.ResponseWriter, r *http.Request) {
	principal, ok := requirePrincipal(w, r)
	if !ok {
		return
	}
	if h.push == nil {
		httpx.WriteJSON(w, http.StatusNoContent, nil, nil)
		return
	}
	token := strings.TrimSpace(r.URL.Query().Get("token"))
	if token == "" {
		httpx.WriteError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Token gerekli.", nil)
		return
	}
	if !h.push.UnregisterDeviceToken(r.Context(), principal.TenantID, principal.UserID, token) {
		httpx.WriteError(w, http.StatusNotFound, "DEVICE_TOKEN_NOT_FOUND", "Cihaz token bulunamadı.", nil)
		return
	}
	httpx.WriteJSON(w, http.StatusNoContent, nil, nil)
}

func (h *Handler) notificationPreferences(w http.ResponseWriter, r *http.Request) {
	principal, ok := requirePrincipal(w, r)
	if !ok {
		return
	}
	if h.push == nil {
		httpx.WriteJSON(w, http.StatusOK, pushdomain.DefaultPreferences(), nil)
		return
	}
	prefs, err := h.push.Preferences(r.Context(), principal.TenantID, principal.UserID)
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "NOTIFICATION_PREFS_FAILED", "Bildirim tercihleri okunamadı.", nil)
		return
	}
	httpx.WriteJSON(w, http.StatusOK, prefs, nil)
}

func (h *Handler) updateNotificationPreferences(w http.ResponseWriter, r *http.Request) {
	principal, ok := requirePrincipal(w, r)
	if !ok {
		return
	}
	if h.push == nil {
		httpx.WriteError(w, http.StatusServiceUnavailable, "PUSH_UNAVAILABLE", "Push bildirim servisi kullanılamıyor.", nil)
		return
	}
	var input pushdomain.UpdatePreferencesInput
	if err := httpx.DecodeJSON(r, &input); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Bildirim tercihleri okunamadı.", nil)
		return
	}
	prefs, err := h.push.UpdatePreferences(r.Context(), principal.TenantID, principal.UserID, input)
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "NOTIFICATION_PREFS_UPDATE_FAILED", "Bildirim tercihleri güncellenemedi.", nil)
		return
	}
	httpx.WriteJSON(w, http.StatusOK, prefs, nil)
}

func (h *Handler) pushTest(w http.ResponseWriter, r *http.Request) {
	principal, ok := requirePrincipal(w, r)
	if !ok {
		return
	}
	if h.push == nil {
		httpx.WriteError(w, http.StatusServiceUnavailable, "PUSH_UNAVAILABLE", "Push bildirim servisi kullanılamıyor.", nil)
		return
	}
	if !pushTestAllowed(principal) {
		httpx.WriteError(w, http.StatusForbidden, "FORBIDDEN", "Test push yalnızca yetkili kullanıcılar içindir.", nil)
		return
	}
	var input pushdomain.TestPushInput
	if err := httpx.DecodeJSON(r, &input); err != nil && r.ContentLength > 0 {
		httpx.WriteError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Test push verisi okunamadı.", nil)
		return
	}
	if err := h.push.SendTest(r.Context(), principal.TenantID, principal.UserID, input.Title, input.Body); err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "PUSH_TEST_FAILED", "Test push gönderilemedi.", nil)
		return
	}
	httpx.WriteJSON(w, http.StatusOK, map[string]string{"message": "Test push kuyruğa alındı."}, nil)
}

func (h *Handler) superAdminPushHealth(w http.ResponseWriter, r *http.Request) {
	if _, ok := requireSuperAdmin(w, r); !ok {
		return
	}
	if h.push == nil {
		httpx.WriteJSON(w, http.StatusOK, pushdomain.PushHealth{}, nil)
		return
	}
	tenantID := strings.TrimSpace(r.URL.Query().Get("tenantId"))
	health, err := h.push.Health(r.Context(), tenantID)
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "PUSH_HEALTH_FAILED", "Push sağlık durumu okunamadı.", nil)
		return
	}
	httpx.WriteJSON(w, http.StatusOK, health, nil)
}

func (h *Handler) superAdminPushLogs(w http.ResponseWriter, r *http.Request) {
	if _, ok := requireSuperAdmin(w, r); !ok {
		return
	}
	if h.push == nil {
		httpx.WriteJSON(w, http.StatusOK, []pushdomain.DeliveryLog{}, nil)
		return
	}
	limit := 50
	if raw := strings.TrimSpace(r.URL.Query().Get("limit")); raw != "" {
		if parsed, err := strconv.Atoi(raw); err == nil {
			limit = parsed
		}
	}
	tenantID := strings.TrimSpace(r.URL.Query().Get("tenantId"))
	logs, err := h.push.DeliveryLogs(r.Context(), tenantID, limit)
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "PUSH_LOGS_FAILED", "Push logları okunamadı.", nil)
		return
	}
	httpx.WriteJSON(w, http.StatusOK, logs, nil)
}

func pushTestAllowed(principal identity.Principal) bool {
	if os.Getenv("ENVIRONMENT") == "development" || os.Getenv("ENVIRONMENT") == "local" {
		return true
	}
	switch principal.Role {
	case identity.RoleSuperAdmin, identity.RoleSystemAdmin, identity.RolePrincipal:
		return true
	default:
		return false
	}
}

func (h *Handler) dispatchPush(fn func(context.Context)) {
	if h.push == nil {
		return
	}
	go fn(context.Background())
}

func (h *Handler) pushAttendanceSession(ctx context.Context, tenantID string, session attendancedomain.Session) {
	h.push.NotifyAttendanceSession(ctx, tenantID, session)
}

func (h *Handler) pushAnnouncement(ctx context.Context, tenantID string, announcement schooldomain.Announcement) {
	h.push.NotifyAnnouncement(ctx, tenantID, announcement)
}

func (h *Handler) pushSupportTicketUpdate(ctx context.Context, ticket superadmindomain.SupportTicket) {
	h.push.NotifySupportTicketUpdate(ctx, ticket)
}

func (h *Handler) pushSchedulePublished(ctx context.Context, tenantID string) {
	h.push.NotifySchedulePublished(ctx, tenantID)
}
