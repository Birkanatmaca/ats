package handlers

import (
	"errors"
	"net/http"
	"strconv"

	aiapp "ots/backend/internal/app/ai"
	aidomain "ots/backend/internal/domain/ai"
	"ots/backend/internal/platform/httpx"
)

func (h *Handler) registerSuperAdminAIRoutes(mux *http.ServeMux) {
	mux.HandleFunc("GET /api/v1/super-admin/ai/overview", h.superAdminAIOverview)
	mux.HandleFunc("GET /api/v1/super-admin/ai/provider", h.superAdminAIProvider)
	mux.HandleFunc("PATCH /api/v1/super-admin/ai/provider", h.updateSuperAdminAIProvider)
	mux.HandleFunc("POST /api/v1/super-admin/ai/provider/test", h.testSuperAdminAIProvider)
	mux.HandleFunc("POST /api/v1/super-admin/ai/provider/keys", h.addSuperAdminAIProviderKey)
	mux.HandleFunc("PATCH /api/v1/super-admin/ai/provider/keys/{id}", h.updateSuperAdminAIProviderKey)
	mux.HandleFunc("DELETE /api/v1/super-admin/ai/provider/keys/{id}", h.deleteSuperAdminAIProviderKey)
	mux.HandleFunc("POST /api/v1/super-admin/ai/provider/keys/reorder", h.reorderSuperAdminAIProviderKeys)
	mux.HandleFunc("POST /api/v1/super-admin/ai/provider/keys/{id}/test", h.testSuperAdminAIProviderKey)
	mux.HandleFunc("POST /api/v1/super-admin/ai/provider/keys/{id}/reset", h.resetSuperAdminAIProviderKey)
	mux.HandleFunc("PATCH /api/v1/super-admin/ai/cost-settings", h.updateSuperAdminAICostSettings)
	mux.HandleFunc("PATCH /api/v1/super-admin/institutions/{id}/ai-quota", h.updateSuperAdminInstitutionAIQuota)
	mux.HandleFunc("POST /api/v1/super-admin/ai/retention/run", h.runSuperAdminAIRetention)
}

func (h *Handler) superAdminAIOverview(w http.ResponseWriter, r *http.Request) {
	if _, ok := requireSuperAdmin(w, r); !ok {
		return
	}
	if h.ai == nil {
		httpx.WriteError(w, http.StatusServiceUnavailable, "AI_UNAVAILABLE", "ogta.ai servisi henüz etkin değil.", nil)
		return
	}
	days := 30
	if raw := r.URL.Query().Get("days"); raw != "" {
		parsed, err := strconv.Atoi(raw)
		if err != nil || parsed <= 0 {
			httpx.WriteError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Geçerli bir days parametresi gönderilmelidir.", nil)
			return
		}
		days = parsed
	}
	overview, err := h.ai.PlatformAnalytics(r.Context(), days)
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "AI_ANALYTICS_FAILED", "AI kullanım özeti alınamadı.", nil)
		return
	}
	httpx.WriteJSON(w, http.StatusOK, overview, nil)
}

func (h *Handler) superAdminAIProvider(w http.ResponseWriter, r *http.Request) {
	if _, ok := requireSuperAdmin(w, r); !ok {
		return
	}
	if h.ai == nil {
		httpx.WriteError(w, http.StatusServiceUnavailable, "AI_UNAVAILABLE", "ogta.ai servisi henüz etkin değil.", nil)
		return
	}
	status, err := h.ai.ProviderStatus(r.Context())
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "AI_PROVIDER_FAILED", "AI sağlayıcı durumu alınamadı.", nil)
		return
	}
	httpx.WriteJSON(w, http.StatusOK, map[string]any{
		"status":  status,
		"models":  h.ai.SupportedModels(),
	}, nil)
}

func (h *Handler) updateSuperAdminAIProvider(w http.ResponseWriter, r *http.Request) {
	if _, ok := requireSuperAdmin(w, r); !ok {
		return
	}
	if h.ai == nil {
		httpx.WriteError(w, http.StatusServiceUnavailable, "AI_UNAVAILABLE", "ogta.ai servisi henüz etkin değil.", nil)
		return
	}
	var input aidomain.ProviderSettings
	if err := httpx.DecodeJSON(r, &input); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "VALIDATION_ERROR", "AI sağlayıcı ayarları okunamadı.", nil)
		return
	}
	updated, err := h.ai.UpdateProviderSettings(r.Context(), input)
	if errors.Is(err, aiapp.ErrInvalidProviderSettings) {
		httpx.WriteError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Geçerli bir model seçilmelidir.", nil)
		return
	}
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "AI_PROVIDER_FAILED", "AI sağlayıcı ayarları güncellenemedi.", nil)
		return
	}
	status, err := h.ai.ProviderStatus(r.Context())
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "AI_PROVIDER_FAILED", "AI sağlayıcı durumu alınamadı.", nil)
		return
	}
	httpx.WriteJSON(w, http.StatusOK, map[string]any{
		"settings": updated,
		"status":   status,
	}, nil)
}

func (h *Handler) testSuperAdminAIProvider(w http.ResponseWriter, r *http.Request) {
	if _, ok := requireSuperAdmin(w, r); !ok {
		return
	}
	if h.ai == nil {
		httpx.WriteError(w, http.StatusServiceUnavailable, "AI_UNAVAILABLE", "ogta.ai servisi henüz etkin değil.", nil)
		return
	}
	result, err := h.ai.TestProviderConnection(r.Context())
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "AI_PROVIDER_TEST_FAILED", "AI bağlantı testi başarısız.", nil)
		return
	}
	httpx.WriteJSON(w, http.StatusOK, result, nil)
}

func (h *Handler) addSuperAdminAIProviderKey(w http.ResponseWriter, r *http.Request) {
	if _, ok := requireSuperAdmin(w, r); !ok {
		return
	}
	if h.ai == nil {
		httpx.WriteError(w, http.StatusServiceUnavailable, "AI_UNAVAILABLE", "ogta.ai servisi henüz etkin değil.", nil)
		return
	}
	var input aidomain.ProviderKeyInput
	if err := httpx.DecodeJSON(r, &input); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "VALIDATION_ERROR", "API anahtarı okunamadı.", nil)
		return
	}
	item, err := h.ai.AddProviderKey(r.Context(), input)
	if !writeAIProviderKeyError(w, err) {
		return
	}
	status, err := h.ai.ProviderStatus(r.Context())
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "AI_PROVIDER_FAILED", "AI sağlayıcı durumu alınamadı.", nil)
		return
	}
	httpx.WriteJSON(w, http.StatusOK, map[string]any{"key": item, "status": status}, nil)
}

func (h *Handler) updateSuperAdminAIProviderKey(w http.ResponseWriter, r *http.Request) {
	if _, ok := requireSuperAdmin(w, r); !ok {
		return
	}
	if h.ai == nil {
		httpx.WriteError(w, http.StatusServiceUnavailable, "AI_UNAVAILABLE", "ogta.ai servisi henüz etkin değil.", nil)
		return
	}
	var input aidomain.ProviderKeyUpdate
	if err := httpx.DecodeJSON(r, &input); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "VALIDATION_ERROR", "API anahtarı güncellemesi okunamadı.", nil)
		return
	}
	item, err := h.ai.UpdateProviderKey(r.Context(), r.PathValue("id"), input)
	if !writeAIProviderKeyError(w, err) {
		return
	}
	status, err := h.ai.ProviderStatus(r.Context())
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "AI_PROVIDER_FAILED", "AI sağlayıcı durumu alınamadı.", nil)
		return
	}
	httpx.WriteJSON(w, http.StatusOK, map[string]any{"key": item, "status": status}, nil)
}

func (h *Handler) deleteSuperAdminAIProviderKey(w http.ResponseWriter, r *http.Request) {
	if _, ok := requireSuperAdmin(w, r); !ok {
		return
	}
	if h.ai == nil {
		httpx.WriteError(w, http.StatusServiceUnavailable, "AI_UNAVAILABLE", "ogta.ai servisi henüz etkin değil.", nil)
		return
	}
	if err := h.ai.DeleteProviderKey(r.Context(), r.PathValue("id")); !writeAIProviderKeyError(w, err) {
		return
	}
	status, err := h.ai.ProviderStatus(r.Context())
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "AI_PROVIDER_FAILED", "AI sağlayıcı durumu alınamadı.", nil)
		return
	}
	httpx.WriteJSON(w, http.StatusOK, map[string]any{"status": status}, nil)
}

func (h *Handler) reorderSuperAdminAIProviderKeys(w http.ResponseWriter, r *http.Request) {
	if _, ok := requireSuperAdmin(w, r); !ok {
		return
	}
	if h.ai == nil {
		httpx.WriteError(w, http.StatusServiceUnavailable, "AI_UNAVAILABLE", "ogta.ai servisi henüz etkin değil.", nil)
		return
	}
	var input aidomain.ProviderKeyReorder
	if err := httpx.DecodeJSON(r, &input); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Anahtar sırası okunamadı.", nil)
		return
	}
	keys, err := h.ai.ReorderProviderKeys(r.Context(), input.OrderedIDs)
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "AI_PROVIDER_FAILED", "Anahtar sırası güncellenemedi.", nil)
		return
	}
	status, err := h.ai.ProviderStatus(r.Context())
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "AI_PROVIDER_FAILED", "AI sağlayıcı durumu alınamadı.", nil)
		return
	}
	httpx.WriteJSON(w, http.StatusOK, map[string]any{"keys": keys, "status": status}, nil)
}

func (h *Handler) testSuperAdminAIProviderKey(w http.ResponseWriter, r *http.Request) {
	if _, ok := requireSuperAdmin(w, r); !ok {
		return
	}
	if h.ai == nil {
		httpx.WriteError(w, http.StatusServiceUnavailable, "AI_UNAVAILABLE", "ogta.ai servisi henüz etkin değil.", nil)
		return
	}
	result, err := h.ai.TestProviderKey(r.Context(), r.PathValue("id"))
	if errors.Is(err, aiapp.ErrProviderKeyNotFound) {
		httpx.WriteError(w, http.StatusNotFound, "AI_PROVIDER_KEY_NOT_FOUND", "API anahtarı bulunamadı.", nil)
		return
	}
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "AI_PROVIDER_TEST_FAILED", "AI bağlantı testi başarısız.", nil)
		return
	}
	httpx.WriteJSON(w, http.StatusOK, result, nil)
}

func (h *Handler) resetSuperAdminAIProviderKey(w http.ResponseWriter, r *http.Request) {
	if _, ok := requireSuperAdmin(w, r); !ok {
		return
	}
	if h.ai == nil {
		httpx.WriteError(w, http.StatusServiceUnavailable, "AI_UNAVAILABLE", "ogta.ai servisi henüz etkin değil.", nil)
		return
	}
	reset := true
	item, err := h.ai.UpdateProviderKey(r.Context(), r.PathValue("id"), aidomain.ProviderKeyUpdate{ResetStatus: reset})
	if !writeAIProviderKeyError(w, err) {
		return
	}
	status, err := h.ai.ProviderStatus(r.Context())
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "AI_PROVIDER_FAILED", "AI sağlayıcı durumu alınamadı.", nil)
		return
	}
	httpx.WriteJSON(w, http.StatusOK, map[string]any{"key": item, "status": status}, nil)
}

func writeAIProviderKeyError(w http.ResponseWriter, err error) bool {
	if err == nil {
		return true
	}
	switch {
	case errors.Is(err, aiapp.ErrInvalidProviderKey):
		httpx.WriteError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Geçerli bir API anahtarı ve etiket girilmelidir.", nil)
	case errors.Is(err, aiapp.ErrProviderKeyNotFound):
		httpx.WriteError(w, http.StatusNotFound, "AI_PROVIDER_KEY_NOT_FOUND", "API anahtarı bulunamadı.", nil)
	case errors.Is(err, aiapp.ErrProviderKeyLimit):
		httpx.WriteError(w, http.StatusBadRequest, "AI_PROVIDER_KEY_LIMIT", "En fazla 10 API anahtarı eklenebilir.", nil)
	case errors.Is(err, aiapp.ErrProviderKeyDuplicate):
		httpx.WriteError(w, http.StatusConflict, "AI_PROVIDER_KEY_DUPLICATE", "Bu API anahtarı zaten kayıtlı.", nil)
	default:
		httpx.WriteError(w, http.StatusInternalServerError, "AI_PROVIDER_FAILED", "API anahtarı kaydedilemedi.", nil)
	}
	return false
}

func (h *Handler) updateSuperAdminAICostSettings(w http.ResponseWriter, r *http.Request) {
	if _, ok := requireSuperAdmin(w, r); !ok {
		return
	}
	if h.ai == nil {
		httpx.WriteError(w, http.StatusServiceUnavailable, "AI_UNAVAILABLE", "ogta.ai servisi henüz etkin değil.", nil)
		return
	}
	var input aidomain.CostSettings
	if err := httpx.DecodeJSON(r, &input); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Maliyet ayarları okunamadı.", nil)
		return
	}
	updated, err := h.ai.UpdateCostSettings(r.Context(), input)
	if errors.Is(err, aiapp.ErrInvalidCostSettings) {
		httpx.WriteError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Maliyet ayarları geçerli olmalıdır.", nil)
		return
	}
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "AI_COST_SETTINGS_FAILED", "Maliyet ayarları güncellenemedi.", nil)
		return
	}
	httpx.WriteJSON(w, http.StatusOK, updated, nil)
}

func (h *Handler) updateSuperAdminInstitutionAIQuota(w http.ResponseWriter, r *http.Request) {
	if _, ok := requireSuperAdmin(w, r); !ok {
		return
	}
	if h.ai == nil {
		httpx.WriteError(w, http.StatusServiceUnavailable, "AI_UNAVAILABLE", "ogta.ai servisi henüz etkin değil.", nil)
		return
	}
	var input aidomain.TenantQuota
	if err := httpx.DecodeJSON(r, &input); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Kota ayarları okunamadı.", nil)
		return
	}
	updated, err := h.ai.UpdateTenantQuota(r.Context(), r.PathValue("id"), input)
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "AI_TENANT_QUOTA_FAILED", "Kurum kotası güncellenemedi.", nil)
		return
	}
	httpx.WriteJSON(w, http.StatusOK, updated, nil)
}

func (h *Handler) runSuperAdminAIRetention(w http.ResponseWriter, r *http.Request) {
	if _, ok := requireSuperAdmin(w, r); !ok {
		return
	}
	if h.ai == nil {
		httpx.WriteError(w, http.StatusServiceUnavailable, "AI_UNAVAILABLE", "ogta.ai servisi henüz etkin değil.", nil)
		return
	}
	result, err := h.ai.RunRetentionAll(r.Context())
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "AI_RETENTION_FAILED", "AI saklama temizliği çalıştırılamadı.", nil)
		return
	}
	httpx.WriteJSON(w, http.StatusOK, result, nil)
}
