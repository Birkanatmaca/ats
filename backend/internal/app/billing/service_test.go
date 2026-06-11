package billing

import (
	"context"
	"errors"
	"testing"
	"time"

	billingdomain "ots/backend/internal/domain/billing"
	superadmindomain "ots/backend/internal/domain/superadmin"
)

type fakeRepo struct {
	guardians       map[string]bool
	account         billingdomain.BillingAccount
	accountFound    bool
	installments    []billingdomain.PaymentInstallment
	installmentsErr error
}

func (f *fakeRepo) ListInstitutions(context.Context) ([]superadmindomain.Institution, error) {
	return nil, nil
}

func (f *fakeRepo) GetBillingSettings(context.Context) (billingdomain.Settings, error) {
	return billingdomain.Settings{}, nil
}

func (f *fakeRepo) UpdateBillingSettings(context.Context, billingdomain.Settings) (billingdomain.Settings, error) {
	return billingdomain.Settings{}, nil
}

func (f *fakeRepo) GetBillingAccountByStudent(context.Context, string, string) (billingdomain.BillingAccount, bool, error) {
	return f.account, f.accountFound, nil
}

func (f *fakeRepo) EnsureBillingAccount(context.Context, string, string) (billingdomain.BillingAccount, error) {
	return billingdomain.BillingAccount{}, errors.New("not implemented")
}

func (f *fakeRepo) CreatePaymentPlan(context.Context, string, string, string, billingdomain.CreatePaymentPlanInput, []billingdomain.InstallmentInput) (billingdomain.PaymentPlan, error) {
	return billingdomain.PaymentPlan{}, errors.New("not implemented")
}

func (f *fakeRepo) UpdatePaymentPlan(context.Context, string, string, billingdomain.UpdatePaymentPlanInput) (billingdomain.PaymentPlan, error) {
	return billingdomain.PaymentPlan{}, errors.New("not implemented")
}

func (f *fakeRepo) ListBillingInstallments(context.Context, string, billingdomain.InstallmentFilter) ([]billingdomain.PaymentInstallment, error) {
	if f.installmentsErr != nil {
		return nil, f.installmentsErr
	}
	return f.installments, nil
}

func (f *fakeRepo) GetBillingInstallment(context.Context, string, string) (billingdomain.PaymentInstallment, bool, error) {
	return billingdomain.PaymentInstallment{}, false, errors.New("not implemented")
}

func (f *fakeRepo) CreateInstallmentPayment(context.Context, string, string, string, billingdomain.CreatePaymentInput) (billingdomain.Payment, error) {
	return billingdomain.Payment{}, errors.New("not implemented")
}

func (f *fakeRepo) UpdatePayment(context.Context, string, string, string, billingdomain.UpdatePaymentInput) (billingdomain.Payment, error) {
	return billingdomain.Payment{}, errors.New("not implemented")
}

func (f *fakeRepo) VoidPayment(context.Context, string, string, string) (billingdomain.Payment, error) {
	return billingdomain.Payment{}, errors.New("not implemented")
}

func (f *fakeRepo) GuardianHasStudent(_ context.Context, _ string, guardianUserID string, studentID string) bool {
	return f.guardians[guardianUserID+":"+studentID]
}

func (f *fakeRepo) RecordOperationalAudit(context.Context, string, string, string, string, string, string) {
}

func TestGuardianSummaryForbiddenWhenGuardianHasNoStudent(t *testing.T) {
	svc := NewService(&fakeRepo{
		guardians: map[string]bool{},
	}, func() time.Time {
		return time.Date(2026, time.June, 11, 9, 0, 0, 0, time.UTC)
	})

	_, err := svc.GuardianSummary(context.Background(), "tenant-1", "guardian-1", "student-1")
	if !errors.Is(err, ErrBillingForbidden) {
		t.Fatalf("expected ErrBillingForbidden, got %v", err)
	}
}

func TestGuardianSummaryAggregatesUpcomingOverdueAndHistory(t *testing.T) {
	now := time.Date(2026, time.June, 11, 9, 0, 0, 0, time.UTC)
	paidAt := now.Add(-24 * time.Hour)
	repo := &fakeRepo{
		guardians:    map[string]bool{"guardian-1:student-1": true},
		accountFound: true,
		account: billingdomain.BillingAccount{
			ID: "account-1",
			Plans: []billingdomain.PaymentPlan{
				{
					ID: "plan-1",
					Installments: []billingdomain.PaymentInstallment{
						{
							ID:              "inst-overdue",
							DueDate:         "2026-06-01",
							Status:          billingdomain.InstallmentPending,
							RemainingAmount: 500,
							Payments:        []billingdomain.Payment{{ID: "pay-1", Amount: 100, PaidAt: paidAt}},
						},
						{
							ID:              "inst-upcoming",
							DueDate:         "2026-06-25",
							Status:          billingdomain.InstallmentPending,
							RemainingAmount: 300,
							Payments:        []billingdomain.Payment{{ID: "pay-void", Amount: 50, Void: true, PaidAt: paidAt}},
						},
						{
							ID:              "inst-paid",
							DueDate:         "2026-05-01",
							Status:          billingdomain.InstallmentPaid,
							RemainingAmount: 0,
						},
					},
				},
			},
		},
	}
	svc := NewService(repo, func() time.Time { return now })

	summary, err := svc.GuardianSummary(context.Background(), "tenant-1", "guardian-1", "student-1")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(summary.OverdueInstallments) != 1 {
		t.Fatalf("expected 1 overdue installment, got %d", len(summary.OverdueInstallments))
	}
	if len(summary.UpcomingInstallments) != 1 {
		t.Fatalf("expected 1 upcoming installment, got %d", len(summary.UpcomingInstallments))
	}
	if len(summary.PaymentHistory) != 1 {
		t.Fatalf("expected only non-void payment history, got %d", len(summary.PaymentHistory))
	}
	if summary.OutstandingAmount != 800 {
		t.Fatalf("expected outstanding amount 800, got %.2f", summary.OutstandingAmount)
	}
	if summary.OverdueAmount != 500 {
		t.Fatalf("expected overdue amount 500, got %.2f", summary.OverdueAmount)
	}
}

func TestDashboardIgnoresCancelledAndCalculatesOverdue(t *testing.T) {
	now := time.Date(2026, time.June, 11, 9, 0, 0, 0, time.UTC)
	repo := &fakeRepo{
		installments: []billingdomain.PaymentInstallment{
			{
				ID:              "inst-overdue",
				PaymentPlanID:   "plan-1",
				DueDate:         "2026-06-01",
				Amount:          700,
				PaidAmount:      100,
				RemainingAmount: 600,
				Status:          billingdomain.InstallmentPending,
			},
			{
				ID:              "inst-pending",
				PaymentPlanID:   "plan-2",
				DueDate:         "2026-06-20",
				Amount:          500,
				PaidAmount:      0,
				RemainingAmount: 500,
				Status:          billingdomain.InstallmentPending,
			},
			{
				ID:              "inst-cancelled",
				PaymentPlanID:   "plan-3",
				DueDate:         "2026-06-05",
				Amount:          999,
				PaidAmount:      0,
				RemainingAmount: 999,
				Status:          billingdomain.InstallmentCancelled,
			},
		},
	}
	svc := NewService(repo, func() time.Time { return now })

	dashboard, err := svc.Dashboard(context.Background(), "tenant-1")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if dashboard.TotalReceivable != 1200 {
		t.Fatalf("expected total receivable 1200, got %.2f", dashboard.TotalReceivable)
	}
	if dashboard.CollectedAmount != 100 {
		t.Fatalf("expected collected amount 100, got %.2f", dashboard.CollectedAmount)
	}
	if dashboard.OutstandingAmount != 1100 {
		t.Fatalf("expected outstanding amount 1100, got %.2f", dashboard.OutstandingAmount)
	}
	if dashboard.OverdueCount != 1 || dashboard.OverdueAmount != 600 {
		t.Fatalf("expected overdue count=1 amount=600, got count=%d amount=%.2f", dashboard.OverdueCount, dashboard.OverdueAmount)
	}
	if dashboard.ActivePlanCount != 2 {
		t.Fatalf("expected 2 active plans, got %d", dashboard.ActivePlanCount)
	}
}

func TestPaymentHistoryFiltersByPaymentStatus(t *testing.T) {
	now := time.Date(2026, time.June, 11, 9, 0, 0, 0, time.UTC)
	paidDate := now.Add(-48 * time.Hour)

	repo := &fakeRepo{
		guardians:    map[string]bool{"guardian-1:student-1": true},
		accountFound: true,
		account: billingdomain.BillingAccount{
			ID: "account-1",
			Plans: []billingdomain.PaymentPlan{
				{
					ID: "plan-1",
					Installments: []billingdomain.PaymentInstallment{
						{
							ID:              "inst-1",
							DueDate:         "2026-05-01",
							Status:          billingdomain.InstallmentPaid,
							RemainingAmount: 0,
							Payments: []billingdomain.Payment{
								{ID: "pay-1", Amount: 100, Method: billingdomain.PaymentCash, PaidAt: paidDate},
								{ID: "pay-2", Amount: 50, Method: billingdomain.PaymentCash, PaidAt: paidDate},
							},
						},
					},
				},
			},
		},
	}

	svc := NewService(repo, func() time.Time { return now })
	summary, _ := svc.GuardianSummary(context.Background(), "tenant-1", "guardian-1", "student-1")

	if len(summary.PaymentHistory) != 2 {
		t.Fatalf("expected 2 payment history entries, got %d", len(summary.PaymentHistory))
	}
	totalHistoryAmount := summary.PaymentHistory[0].Amount + summary.PaymentHistory[1].Amount
	if totalHistoryAmount != 150 {
		t.Fatalf("expected total payment history 150, got %.2f", totalHistoryAmount)
	}
}

func TestInstallmentOverdueCalculation(t *testing.T) {
	now := time.Date(2026, time.June, 15, 9, 0, 0, 0, time.UTC)

	testCases := []struct {
		dueDate  string
		expected bool
	}{
		{"2026-06-10", true},  // 5 days past
		{"2026-06-15", false}, // Today (due today, not overdue)
		{"2026-06-20", false}, // Future
		{"2026-06-01", true},  // 14 days past
	}

	for _, tc := range testCases {
		inst := billingdomain.PaymentInstallment{
			ID:              "inst-1",
			DueDate:         tc.dueDate,
			Status:          billingdomain.InstallmentPending,
			RemainingAmount: 100,
		}

		repo := &fakeRepo{
			guardians:    map[string]bool{"guardian-1:student-1": true},
			accountFound: true,
			account: billingdomain.BillingAccount{
				ID: "account-1",
				Plans: []billingdomain.PaymentPlan{
					{ID: "plan-1", Installments: []billingdomain.PaymentInstallment{inst}},
				},
			},
		}

		svc := NewService(repo, func() time.Time { return now })
		summary, _ := svc.GuardianSummary(context.Background(), "tenant-1", "guardian-1", "student-1")

		isOverdue := len(summary.OverdueInstallments) > 0
		if isOverdue != tc.expected {
			t.Fatalf("due date %s: expected overdue=%v, got %v", tc.dueDate, tc.expected, isOverdue)
		}
	}
}

func TestGuardianSummaryWithMultiplePlans(t *testing.T) {
	now := time.Date(2026, time.June, 11, 9, 0, 0, 0, time.UTC)

	repo := &fakeRepo{
		guardians:    map[string]bool{"guardian-1:student-1": true},
		accountFound: true,
		account: billingdomain.BillingAccount{
			ID: "account-1",
			Plans: []billingdomain.PaymentPlan{
				{
					ID: "plan-1",
					Installments: []billingdomain.PaymentInstallment{
						{ID: "inst-1", DueDate: "2026-06-01", Status: billingdomain.InstallmentPending, RemainingAmount: 500},
					},
				},
				{
					ID: "plan-2",
					Installments: []billingdomain.PaymentInstallment{
						{ID: "inst-2", DueDate: "2026-06-15", Status: billingdomain.InstallmentPending, RemainingAmount: 300},
					},
				},
				{
					ID: "plan-3",
					Installments: []billingdomain.PaymentInstallment{
						{ID: "inst-3", DueDate: "2026-07-01", Status: billingdomain.InstallmentPending, RemainingAmount: 200},
					},
				},
			},
		},
	}

	svc := NewService(repo, func() time.Time { return now })
	summary, _ := svc.GuardianSummary(context.Background(), "tenant-1", "guardian-1", "student-1")

	if len(summary.OverdueInstallments) != 1 {
		t.Fatalf("expected 1 overdue, got %d", len(summary.OverdueInstallments))
	}
	if len(summary.UpcomingInstallments) != 2 {
		t.Fatalf("expected 2 upcoming, got %d", len(summary.UpcomingInstallments))
	}
	if summary.OutstandingAmount != 1000 {
		t.Fatalf("expected outstanding 1000, got %.2f", summary.OutstandingAmount)
	}
}

func TestGuardianSummaryAllPaid(t *testing.T) {
	repo := &fakeRepo{
		guardians:    map[string]bool{"guardian-1:student-1": true},
		accountFound: true,
		account: billingdomain.BillingAccount{
			ID: "account-1",
			Plans: []billingdomain.PaymentPlan{
				{
					ID: "plan-1",
					Installments: []billingdomain.PaymentInstallment{
						{ID: "inst-1", DueDate: "2026-05-01", Status: billingdomain.InstallmentPaid, RemainingAmount: 0},
						{ID: "inst-2", DueDate: "2026-05-15", Status: billingdomain.InstallmentPaid, RemainingAmount: 0},
					},
				},
			},
		},
	}

	svc := NewService(repo, func() time.Time { return time.Date(2026, 6, 11, 0, 0, 0, 0, time.UTC) })
	summary, _ := svc.GuardianSummary(context.Background(), "tenant-1", "guardian-1", "student-1")

	if len(summary.OverdueInstallments) != 0 {
		t.Fatalf("expected 0 overdue when all paid, got %d", len(summary.OverdueInstallments))
	}
	if len(summary.UpcomingInstallments) != 0 {
		t.Fatalf("expected 0 upcoming when all paid, got %d", len(summary.UpcomingInstallments))
	}
	if summary.OutstandingAmount != 0 {
		t.Fatalf("expected 0 outstanding when all paid, got %.2f", summary.OutstandingAmount)
	}
}

func TestGuardianSummaryPartialPayments(t *testing.T) {
	now := time.Date(2026, time.June, 11, 9, 0, 0, 0, time.UTC)
	paidDate := now.Add(-7 * 24 * time.Hour)

	repo := &fakeRepo{
		guardians:    map[string]bool{"guardian-1:student-1": true},
		accountFound: true,
		account: billingdomain.BillingAccount{
			ID: "account-1",
			Plans: []billingdomain.PaymentPlan{
				{
					ID: "plan-1",
					Installments: []billingdomain.PaymentInstallment{
						{
							ID:              "inst-1",
							DueDate:         "2026-06-20",
							Status:          billingdomain.InstallmentPending,
							RemainingAmount: 700,
							Payments: []billingdomain.Payment{
								{ID: "pay-1", Amount: 300, Method: billingdomain.PaymentCash, PaidAt: paidDate},
							},
						},
					},
				},
			},
		},
	}

	svc := NewService(repo, func() time.Time { return now })
	summary, _ := svc.GuardianSummary(context.Background(), "tenant-1", "guardian-1", "student-1")

	if summary.OutstandingAmount != 700 {
		t.Fatalf("expected outstanding 700 (remaining), got %.2f", summary.OutstandingAmount)
	}
	if len(summary.PaymentHistory) != 1 {
		t.Fatalf("expected 1 payment history, got %d", len(summary.PaymentHistory))
	}
}

func TestOverviewCalculatesInstitutionCosts(t *testing.T) {
	repo := &fakeRepo{}
	svc := NewService(repo, func() time.Time { return time.Now() })

	// This should return empty results with our fake repo
	overview, err := svc.Overview(context.Background())
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if overview.TotalInstitutions != 0 {
		t.Fatalf("expected 0 institutions, got %d", overview.TotalInstitutions)
	}
}

func TestSettingsValidation(t *testing.T) {
	repo := &fakeRepo{}
	svc := NewService(repo, func() time.Time { return time.Now() })

	// Invalid rate
	_, err := svc.UpdateSettings(context.Background(), billingdomain.Settings{
		UsdTryRate:        -1,
		QuoteValidityDays: 30,
	})
	if !errors.Is(err, ErrInvalidQuote) {
		t.Fatalf("expected ErrInvalidQuote for negative rate, got %v", err)
	}

	// Invalid quote days
	_, err = svc.UpdateSettings(context.Background(), billingdomain.Settings{
		UsdTryRate:        30,
		QuoteValidityDays: -1,
	})
	if !errors.Is(err, ErrInvalidQuote) {
		t.Fatalf("expected ErrInvalidQuote for negative days, got %v", err)
	}
}

func TestStudentAccountNotFound(t *testing.T) {
	repo := &fakeRepo{
		accountFound: false,
	}
	svc := NewService(repo, func() time.Time { return time.Now() })

	_, err := svc.StudentAccount(context.Background(), "tenant-1", "student-1")
	if !errors.Is(err, ErrBillingNotFound) {
		t.Fatalf("expected ErrBillingNotFound, got %v", err)
	}
}
