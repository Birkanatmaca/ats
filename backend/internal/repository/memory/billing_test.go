package memory

import (
	"context"
	"errors"
	"testing"
	"time"

	billingapp "ots/backend/internal/app/billing"
	billingdomain "ots/backend/internal/domain/billing"
	superadmindomain "ots/backend/internal/domain/superadmin"
)

func TestBillingCreatePlanAndRecordPaymentUpdatesInstallment(t *testing.T) {
	fixed := time.Date(2026, time.April, 30, 9, 5, 0, 0, time.Local)
	store := NewStore(func() time.Time { return fixed })
	service := billingapp.NewService(store, func() time.Time { return fixed })
	ctx := context.Background()

	account, err := service.CreateStudentPlan(ctx, demoTenantID, "student-1", demoPrincipalUserID, billingdomain.CreatePaymentPlanInput{
		Name:             "2026 Eğitim Ücreti",
		TotalAmount:      12000,
		Currency:         "TRY",
		StartDate:        "2026-04-30",
		InstallmentCount: 3,
	})
	if err != nil {
		t.Fatalf("expected plan create, got %v", err)
	}
	if len(account.Plans) == 0 || len(account.Plans[0].Installments) != 3 {
		t.Fatalf("expected three installments, got %#v", account.Plans)
	}

	installment := account.Plans[0].Installments[0]
	updated, err := service.RecordPayment(ctx, demoTenantID, installment.ID, demoPrincipalUserID, billingdomain.CreatePaymentInput{
		Amount: installment.Amount,
		Method: billingdomain.PaymentCash,
	})
	if err != nil {
		t.Fatalf("expected payment record, got %v", err)
	}
	if updated.Status != billingdomain.InstallmentPaid {
		t.Fatalf("expected paid installment, got %s", updated.Status)
	}
	if updated.RemainingAmount != 0 {
		t.Fatalf("expected zero remaining, got %.2f", updated.RemainingAmount)
	}
}

func TestBillingOverdueReportUsesEffectiveStatus(t *testing.T) {
	fixed := time.Date(2026, time.April, 30, 9, 5, 0, 0, time.Local)
	store := NewStore(func() time.Time { return fixed })
	service := billingapp.NewService(store, func() time.Time { return fixed })
	ctx := context.Background()

	items, err := service.OverdueReport(ctx, demoTenantID)
	if err != nil {
		t.Fatalf("expected overdue report, got %v", err)
	}
	if len(items) == 0 {
		t.Fatal("expected at least one overdue installment")
	}
	for _, item := range items {
		if item.Status != billingdomain.InstallmentOverdue {
			t.Fatalf("expected only overdue installments, got %s", item.Status)
		}
	}
}

func TestBillingGuardianSummaryScope(t *testing.T) {
	fixed := time.Date(2026, time.April, 30, 9, 5, 0, 0, time.Local)
	store := NewStore(func() time.Time { return fixed })
	service := billingapp.NewService(store, func() time.Time { return fixed })
	ctx := context.Background()

	summary, err := service.GuardianSummary(ctx, demoTenantID, demoGuardianUserID, "student-2")
	if err != nil {
		t.Fatalf("expected linked guardian summary, got %v", err)
	}
	if summary.Account.StudentID != "student-2" {
		t.Fatalf("expected student-2 summary, got %s", summary.Account.StudentID)
	}
	if summary.OutstandingAmount <= 0 || len(summary.PaymentHistory) == 0 {
		t.Fatalf("expected outstanding amount and history, got %#v", summary)
	}

	if _, err := service.GuardianSummary(ctx, demoTenantID, demoGuardianUserID, "student-1"); !errors.Is(err, billingapp.ErrBillingForbidden) {
		t.Fatalf("expected forbidden for unlinked student, got %v", err)
	}
}

func TestBillingPaymentWritesAudit(t *testing.T) {
	fixed := time.Date(2026, time.April, 30, 9, 5, 0, 0, time.Local)
	store := NewStore(func() time.Time { return fixed })
	service := billingapp.NewService(store, func() time.Time { return fixed })
	ctx := context.Background()

	before, _ := store.ListAuditEntries(ctx, superadmindomain.AuditLogQuery{})
	beforeCount := countAuditAction(before, "billing.payment.create")
	if _, err := service.RecordPayment(ctx, demoTenantID, "installment-student-2-3", demoPrincipalUserID, billingdomain.CreatePaymentInput{
		Amount: 5000,
		Method: billingdomain.PaymentBankTransfer,
	}); err != nil {
		t.Fatalf("expected payment, got %v", err)
	}
	after, _ := store.ListAuditEntries(ctx, superadmindomain.AuditLogQuery{})
	afterCount := countAuditAction(after, "billing.payment.create")
	if afterCount != beforeCount+1 {
		t.Fatalf("expected one payment audit, before=%d after=%d", beforeCount, afterCount)
	}
}

func countAuditAction(entries []superadmindomain.AuditEntry, action string) int {
	count := 0
	for _, entry := range entries {
		if entry.Action == action {
			count++
		}
	}
	return count
}
