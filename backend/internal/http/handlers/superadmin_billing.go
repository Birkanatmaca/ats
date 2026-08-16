package handlers

import (
	"errors"
	"net/http"

	billingapp "ots/backend/internal/app/billing"
	billingdomain "ots/backend/internal/domain/billing"
	"ots/backend/internal/platform/httpx"
)

func (h *Handler) registerSuperAdminBillingRoutes(mux *http.ServeMux) {
	mux.HandleFunc("GET /api/v1/super-admin/billing/overview", h.superAdminBillingOverview)
	mux.HandleFunc("GET /api/v1/super-admin/billing/settings", h.superAdminBillingSettings)
	mux.HandleFunc("PATCH /api/v1/super-admin/billing/settings", h.updateSuperAdminBillingSettings)
	mux.HandleFunc("GET /api/v1/super-admin/billing/fx/tcmb", h.superAdminBillingTCMBRate)
	mux.HandleFunc("POST /api/v1/super-admin/billing/quotes/preview", h.superAdminBillingQuotePreview)
}

func (h *Handler) superAdminBillingOverview(w http.ResponseWriter, r *http.Request) {
	if _, ok := requireSuperAdmin(w, r); !ok {
		return
	}
	if h.billing == nil {
		httpx.WriteError(w, http.StatusServiceUnavailable, "BILLING_UNAVAILABLE", "Faturalama servisi henüz etkin değil.", nil)
		return
	}
	overview, err := h.billing.Overview(r.Context())
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "BILLING_OVERVIEW_FAILED", "Faturalama özeti alınamadı.", nil)
		return
	}
	httpx.WriteJSON(w, http.StatusOK, overview, nil)
}

func (h *Handler) superAdminBillingSettings(w http.ResponseWriter, r *http.Request) {
	if _, ok := requireSuperAdmin(w, r); !ok {
		return
	}
	if h.billing == nil {
		httpx.WriteError(w, http.StatusServiceUnavailable, "BILLING_UNAVAILABLE", "Faturalama servisi henüz etkin değil.", nil)
		return
	}
	settings, err := h.billing.GetSettings(r.Context())
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "BILLING_SETTINGS_FAILED", "Faturalama ayarları alınamadı.", nil)
		return
	}
	httpx.WriteJSON(w, http.StatusOK, settings, nil)
}

func (h *Handler) updateSuperAdminBillingSettings(w http.ResponseWriter, r *http.Request) {
	if _, ok := requireSuperAdmin(w, r); !ok {
		return
	}
	if h.billing == nil {
		httpx.WriteError(w, http.StatusServiceUnavailable, "BILLING_UNAVAILABLE", "Faturalama servisi henüz etkin değil.", nil)
		return
	}
	var input billingdomain.Settings
	if err := httpx.DecodeJSON(r, &input); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Faturalama ayarları okunamadı.", nil)
		return
	}
	updated, err := h.billing.UpdateSettings(r.Context(), input)
	if errors.Is(err, billingapp.ErrInvalidQuote) {
		httpx.WriteError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Faturalama ayarları geçerli olmalıdır.", nil)
		return
	}
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "BILLING_SETTINGS_FAILED", "Faturalama ayarları güncellenemedi.", nil)
		return
	}
	httpx.WriteJSON(w, http.StatusOK, updated, nil)
}

func (h *Handler) superAdminBillingTCMBRate(w http.ResponseWriter, r *http.Request) {
	if _, ok := requireSuperAdmin(w, r); !ok {
		return
	}
	if h.billing == nil {
		httpx.WriteError(w, http.StatusServiceUnavailable, "BILLING_UNAVAILABLE", "Faturalama servisi henüz etkin değil.", nil)
		return
	}
	rate, err := h.billing.TCMBUsdRate(r.Context())
	if errors.Is(err, billingapp.ErrTCMBUnavailable) {
		httpx.WriteError(w, http.StatusBadGateway, "TCMB_UNAVAILABLE", "TCMB kuru alınamadı. Daha sonra tekrar deneyin.", nil)
		return
	}
	if err != nil {
		httpx.WriteError(w, http.StatusBadGateway, "TCMB_UNAVAILABLE", "TCMB kuru alınamadı. Daha sonra tekrar deneyin.", nil)
		return
	}
	httpx.WriteJSON(w, http.StatusOK, rate, nil)
}

func (h *Handler) superAdminBillingQuotePreview(w http.ResponseWriter, r *http.Request) {
	if _, ok := requireSuperAdmin(w, r); !ok {
		return
	}
	if h.billing == nil {
		httpx.WriteError(w, http.StatusServiceUnavailable, "BILLING_UNAVAILABLE", "Faturalama servisi henüz etkin değil.", nil)
		return
	}
	var input billingdomain.QuotePreviewInput
	if err := httpx.DecodeJSON(r, &input); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Teklif bilgileri okunamadı.", nil)
		return
	}
	quote, err := h.billing.PreviewQuote(r.Context(), input)
	if errors.Is(err, billingapp.ErrInvalidQuote) {
		httpx.WriteError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Geçerli bir teklif oluşturulamadı.", nil)
		return
	}
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "BILLING_QUOTE_FAILED", "Teklif hesaplanamadı.", nil)
		return
	}
	httpx.WriteJSON(w, http.StatusOK, quote, nil)
}
