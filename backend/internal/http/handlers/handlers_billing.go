package handlers

import (
	"context"
	"errors"
	"net/http"

	billingapp "ots/backend/internal/app/billing"
	billingdomain "ots/backend/internal/domain/billing"
	"ots/backend/internal/domain/identity"
	schooldomain "ots/backend/internal/domain/school"
	"ots/backend/internal/platform/httpx"
)

func (h *Handler) registerBillingRoutes(mux *http.ServeMux) {
	mux.HandleFunc("GET /api/v1/billing/students/{studentId}/account", h.billingStudentAccount)
	mux.HandleFunc("POST /api/v1/billing/students/{studentId}/plans", h.createBillingStudentPlan)
	mux.HandleFunc("PATCH /api/v1/billing/plans/{id}", h.updateBillingPlan)
	mux.HandleFunc("GET /api/v1/billing/installments", h.listBillingInstallments)
	mux.HandleFunc("POST /api/v1/billing/installments/{id}/payments", h.createBillingPayment)
	mux.HandleFunc("PATCH /api/v1/billing/payments/{id}", h.updateBillingPayment)
	mux.HandleFunc("DELETE /api/v1/billing/payments/{id}", h.voidBillingPayment)
	mux.HandleFunc("GET /api/v1/billing/dashboard", h.billingDashboard)
	mux.HandleFunc("GET /api/v1/billing/reports/overdue", h.billingOverdueReport)
	mux.HandleFunc("GET /api/v1/guardian/students/{studentId}/billing", h.guardianBillingSummary)
}

func (h *Handler) billingStudentAccount(w http.ResponseWriter, r *http.Request) {
	principal, ok := h.requireBillingAccess(w, r)
	if !ok {
		return
	}
	account, err := h.billing.StudentAccount(r.Context(), principal.TenantID, r.PathValue("studentId"))
	writeBillingLookup(w, account, err)
}

func (h *Handler) createBillingStudentPlan(w http.ResponseWriter, r *http.Request) {
	principal, ok := h.requireBillingAccess(w, r)
	if !ok {
		return
	}
	var input billingdomain.CreatePaymentPlanInput
	if err := httpx.DecodeJSON(r, &input); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Ödeme planı verisi okunamadı.", nil)
		return
	}
	account, err := h.billing.CreateStudentPlan(r.Context(), principal.TenantID, r.PathValue("studentId"), principal.UserID, input)
	if writeBillingError(w, err) {
		return
	}
	httpx.WriteJSON(w, http.StatusCreated, account, nil)
}

func (h *Handler) updateBillingPlan(w http.ResponseWriter, r *http.Request) {
	principal, ok := h.requireBillingAccess(w, r)
	if !ok {
		return
	}
	var input billingdomain.UpdatePaymentPlanInput
	if err := httpx.DecodeJSON(r, &input); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Ödeme planı güncellemesi okunamadı.", nil)
		return
	}
	plan, err := h.billing.UpdatePlan(r.Context(), principal.TenantID, r.PathValue("id"), principal.UserID, input)
	if writeBillingError(w, err) {
		return
	}
	httpx.WriteJSON(w, http.StatusOK, plan, nil)
}

func (h *Handler) listBillingInstallments(w http.ResponseWriter, r *http.Request) {
	principal, ok := h.requireBillingAccess(w, r)
	if !ok {
		return
	}
	filter := billingdomain.InstallmentFilter{
		StudentID: r.URL.Query().Get("studentId"),
		ClassID:   r.URL.Query().Get("classId"),
		Status:    r.URL.Query().Get("status"),
	}
	items, err := h.billing.ListInstallments(r.Context(), principal.TenantID, filter)
	if writeBillingError(w, err) {
		return
	}
	httpx.WriteJSON(w, http.StatusOK, items, nil)
}

func (h *Handler) createBillingPayment(w http.ResponseWriter, r *http.Request) {
	principal, ok := h.requireBillingAccess(w, r)
	if !ok {
		return
	}
	var input billingdomain.CreatePaymentInput
	if err := httpx.DecodeJSON(r, &input); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Ödeme verisi okunamadı.", nil)
		return
	}
	installment, err := h.billing.RecordPayment(r.Context(), principal.TenantID, r.PathValue("id"), principal.UserID, input)
	if writeBillingError(w, err) {
		return
	}
	if h.push != nil && installment.StudentID != "" {
		h.dispatchPush(func(ctx context.Context) {
			h.push.NotifyBillingPaymentRecorded(ctx, principal.TenantID, installment.StudentID)
		})
	}
	httpx.WriteJSON(w, http.StatusCreated, installment, nil)
}

func (h *Handler) updateBillingPayment(w http.ResponseWriter, r *http.Request) {
	principal, ok := h.requireBillingAccess(w, r)
	if !ok {
		return
	}
	var input billingdomain.UpdatePaymentInput
	if err := httpx.DecodeJSON(r, &input); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Ödeme güncellemesi okunamadı.", nil)
		return
	}
	payment, err := h.billing.UpdatePayment(r.Context(), principal.TenantID, r.PathValue("id"), principal.UserID, input)
	if writeBillingError(w, err) {
		return
	}
	httpx.WriteJSON(w, http.StatusOK, payment, nil)
}

func (h *Handler) voidBillingPayment(w http.ResponseWriter, r *http.Request) {
	principal, ok := h.requireBillingAccess(w, r)
	if !ok {
		return
	}
	payment, err := h.billing.VoidPayment(r.Context(), principal.TenantID, r.PathValue("id"), principal.UserID)
	if writeBillingError(w, err) {
		return
	}
	httpx.WriteJSON(w, http.StatusOK, payment, nil)
}

func (h *Handler) billingDashboard(w http.ResponseWriter, r *http.Request) {
	principal, ok := h.requireBillingAccess(w, r)
	if !ok {
		return
	}
	dashboard, err := h.billing.Dashboard(r.Context(), principal.TenantID)
	if writeBillingError(w, err) {
		return
	}
	httpx.WriteJSON(w, http.StatusOK, dashboard, nil)
}

func (h *Handler) billingOverdueReport(w http.ResponseWriter, r *http.Request) {
	principal, ok := h.requireBillingAccess(w, r)
	if !ok {
		return
	}
	items, err := h.billing.OverdueReport(r.Context(), principal.TenantID)
	if writeBillingError(w, err) {
		return
	}
	httpx.WriteJSON(w, http.StatusOK, items, nil)
}

func (h *Handler) guardianBillingSummary(w http.ResponseWriter, r *http.Request) {
	principal, ok := requireGuardian(w, r)
	if !ok || !h.requireBillingModule(w, r, principal.TenantID) {
		return
	}
	summary, err := h.billing.GuardianSummary(r.Context(), principal.TenantID, principal.UserID, r.PathValue("studentId"))
	if writeBillingError(w, err) {
		return
	}
	httpx.WriteJSON(w, http.StatusOK, summary, nil)
}

func (h *Handler) requireBillingAccess(w http.ResponseWriter, r *http.Request) (identity.Principal, bool) {
	principal, ok := requirePrincipalRole(w, r, identity.RolePrincipal, identity.RoleSystemAdmin)
	if !ok {
		return principal, false
	}
	if !h.requireBillingModule(w, r, principal.TenantID) {
		return principal, false
	}
	return principal, true
}

func (h *Handler) requireBillingModule(w http.ResponseWriter, r *http.Request, tenantID string) bool {
	tenant, ok := h.school.CurrentTenant(r.Context(), tenantID)
	if !ok || !schooldomain.HasModule(tenant.EnabledModules, schooldomain.ModuleBilling) {
		httpx.WriteError(w, http.StatusForbidden, "MODULE_DISABLED", "Tahsilat modülü bu kurumda aktif değil.", nil)
		return false
	}
	return true
}

func writeBillingLookup(w http.ResponseWriter, data any, err error) {
	if writeBillingError(w, err) {
		return
	}
	httpx.WriteJSON(w, http.StatusOK, data, nil)
}

func writeBillingError(w http.ResponseWriter, err error) bool {
	if err == nil {
		return false
	}
	if errors.Is(err, billingapp.ErrInvalidBilling) {
		httpx.WriteError(w, http.StatusBadRequest, "BILLING_VALIDATION_ERROR", "Tahsilat verisi eksik veya geçersiz.", nil)
		return true
	}
	if errors.Is(err, billingapp.ErrBillingForbidden) {
		httpx.WriteError(w, http.StatusForbidden, "FORBIDDEN", "Bu tahsilat kaydına erişim yetkiniz yok.", nil)
		return true
	}
	if errors.Is(err, billingapp.ErrBillingNotFound) {
		httpx.WriteError(w, http.StatusNotFound, "BILLING_NOT_FOUND", "Tahsilat kaydı bulunamadı.", nil)
		return true
	}
	httpx.WriteError(w, http.StatusInternalServerError, "BILLING_OPERATION_FAILED", "Tahsilat işlemi tamamlanamadı.", nil)
	return true
}
