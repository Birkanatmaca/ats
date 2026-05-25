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
	mux.HandleFunc("PATCH /api/v1/super-admin/ai/cost-settings", h.updateSuperAdminAICostSettings)
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
