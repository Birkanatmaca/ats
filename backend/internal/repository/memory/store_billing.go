package memory

import (
	"context"
	"errors"
	"fmt"
	"sort"
	"strings"
	"time"

	billingdomain "ots/backend/internal/domain/billing"
)

func (s *Store) GetBillingSettings(_ context.Context) (billingdomain.Settings, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.billingSettings, nil
}

func (s *Store) UpdateBillingSettings(_ context.Context, input billingdomain.Settings) (billingdomain.Settings, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.billingSettings = input
	return s.billingSettings, nil
}

func (s *Store) GetBillingAccountByStudent(_ context.Context, tenantID, studentID string) (billingdomain.BillingAccount, bool, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	if tenantID != s.tenant.ID {
		return billingdomain.BillingAccount{}, false, nil
	}
	for _, account := range s.billingAccounts {
		if account.StudentID == studentID {
			return s.billingAccountSnapshotLocked(account), true, nil
		}
	}
	return billingdomain.BillingAccount{}, false, nil
}

func (s *Store) EnsureBillingAccount(_ context.Context, tenantID, studentID string) (billingdomain.BillingAccount, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if tenantID != s.tenant.ID {
		return billingdomain.BillingAccount{}, errors.New("tenant not found")
	}
	for _, account := range s.billingAccounts {
		if account.StudentID == studentID {
			return s.billingAccountSnapshotLocked(account), nil
		}
	}
	student, ok := s.studentByIDLocked(studentID)
	if !ok {
		return billingdomain.BillingAccount{}, errors.New("student not found")
	}
	account := billingdomain.BillingAccount{
		ID:           fmt.Sprintf("billing-account-%d", len(s.billingAccounts)+1),
		TenantID:     tenantID,
		StudentID:    student.ID,
		StudentName:  student.FullName,
		SchoolNumber: student.Number,
		ClassID:      student.ClassID,
		Status:       billingdomain.BillingAccountActive,
		CreatedAt:    s.clock(),
	}
	if class, ok := s.classByIDLocked(student.ClassID); ok {
		account.ClassName = class.Name
	}
	for _, link := range s.studentGuardians {
		if link.StudentID == student.ID {
			account.GuardianUserID = link.GuardianUserID
			break
		}
	}
	s.billingAccounts = append(s.billingAccounts, account)
	return s.billingAccountSnapshotLocked(account), nil
}

func (s *Store) CreatePaymentPlan(_ context.Context, tenantID, accountID, _ string, input billingdomain.CreatePaymentPlanInput, installments []billingdomain.InstallmentInput) (billingdomain.PaymentPlan, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if tenantID != s.tenant.ID {
		return billingdomain.PaymentPlan{}, errors.New("tenant not found")
	}
	if _, ok := s.billingAccountByIDLocked(accountID); !ok {
		return billingdomain.PaymentPlan{}, errors.New("account not found")
	}
	now := s.clock()
	plan := billingdomain.PaymentPlan{
		ID:               fmt.Sprintf("payment-plan-%d", len(s.paymentPlans)+1),
		TenantID:         tenantID,
		BillingAccountID: accountID,
		Name:             strings.TrimSpace(input.Name),
		TotalAmount:      input.TotalAmount,
		Currency:         strings.ToUpper(strings.TrimSpace(input.Currency)),
		StartDate:        strings.TrimSpace(input.StartDate),
		Status:           billingdomain.PaymentPlanActive,
		CreatedAt:        now,
		UpdatedAt:        now,
	}
	if plan.Currency == "" {
		plan.Currency = "TRY"
	}
	s.paymentPlans = append(s.paymentPlans, plan)
	for _, item := range installments {
		s.paymentInstallments = append(s.paymentInstallments, billingdomain.PaymentInstallment{
			ID:               fmt.Sprintf("installment-%d", len(s.paymentInstallments)+1),
			TenantID:         tenantID,
			PaymentPlanID:    plan.ID,
			BillingAccountID: accountID,
			DueDate:          item.DueDate,
			Amount:           item.Amount,
			PaidAmount:       0,
			RemainingAmount:  item.Amount,
			Status:           billingdomain.InstallmentPending,
		})
	}
	return s.paymentPlanSnapshotLocked(plan), nil
}

func (s *Store) UpdatePaymentPlan(_ context.Context, tenantID, planID string, input billingdomain.UpdatePaymentPlanInput) (billingdomain.PaymentPlan, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if tenantID != s.tenant.ID {
		return billingdomain.PaymentPlan{}, errors.New("tenant not found")
	}
	for index := range s.paymentPlans {
		if s.paymentPlans[index].ID != planID {
			continue
		}
		if input.Name != nil {
			s.paymentPlans[index].Name = *input.Name
		}
		if input.Status != nil {
			s.paymentPlans[index].Status = *input.Status
		}
		s.paymentPlans[index].UpdatedAt = s.clock()
		return s.paymentPlanSnapshotLocked(s.paymentPlans[index]), nil
	}
	return billingdomain.PaymentPlan{}, errors.New("payment plan not found")
}

func (s *Store) ListBillingInstallments(_ context.Context, tenantID string, filter billingdomain.InstallmentFilter) ([]billingdomain.PaymentInstallment, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	if tenantID != s.tenant.ID {
		return []billingdomain.PaymentInstallment{}, nil
	}
	out := make([]billingdomain.PaymentInstallment, 0)
	for _, item := range s.paymentInstallments {
		full := s.paymentInstallmentSnapshotLocked(item)
		if filter.StudentID != "" && full.StudentID != filter.StudentID {
			continue
		}
		if filter.ClassID != "" {
			account, _ := s.billingAccountByIDLocked(full.BillingAccountID)
			if account.ClassID != filter.ClassID {
				continue
			}
		}
		if filter.Status != "" && string(full.Status) != filter.Status {
			continue
		}
		out = append(out, full)
	}
	sort.Slice(out, func(i, j int) bool {
		if out[i].DueDate == out[j].DueDate {
			return out[i].StudentName < out[j].StudentName
		}
		return out[i].DueDate < out[j].DueDate
	})
	return out, nil
}

func (s *Store) GetBillingInstallment(_ context.Context, tenantID, installmentID string) (billingdomain.PaymentInstallment, bool, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	if tenantID != s.tenant.ID {
		return billingdomain.PaymentInstallment{}, false, nil
	}
	for _, item := range s.paymentInstallments {
		if item.ID == installmentID {
			return s.paymentInstallmentSnapshotLocked(item), true, nil
		}
	}
	return billingdomain.PaymentInstallment{}, false, nil
}

func (s *Store) CreateInstallmentPayment(_ context.Context, tenantID, installmentID, actorUserID string, input billingdomain.CreatePaymentInput) (billingdomain.Payment, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if tenantID != s.tenant.ID {
		return billingdomain.Payment{}, errors.New("tenant not found")
	}
	if _, ok := s.installmentIndexLocked(installmentID); !ok {
		return billingdomain.Payment{}, errors.New("installment not found")
	}
	paidAt := s.clock()
	if input.PaidAt != nil {
		paidAt = *input.PaidAt
	}
	now := s.clock()
	payment := billingdomain.Payment{
		ID:            fmt.Sprintf("payment-%d", len(s.payments)+1),
		TenantID:      tenantID,
		InstallmentID: installmentID,
		Amount:        input.Amount,
		Method:        input.Method,
		PaidAt:        paidAt,
		RecordedBy:    actorUserID,
		Note:          strings.TrimSpace(input.Note),
		CreatedAt:     now,
		UpdatedAt:     now,
	}
	s.payments = append(s.payments, payment)
	s.recalculateInstallmentLocked(installmentID)
	return payment, nil
}

func (s *Store) UpdatePayment(_ context.Context, tenantID, paymentID, actorUserID string, input billingdomain.UpdatePaymentInput) (billingdomain.Payment, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if tenantID != s.tenant.ID {
		return billingdomain.Payment{}, errors.New("tenant not found")
	}
	for index := range s.payments {
		if s.payments[index].ID != paymentID {
			continue
		}
		if input.Amount != nil {
			s.payments[index].Amount = *input.Amount
		}
		if input.Method != nil {
			s.payments[index].Method = *input.Method
		}
		if input.PaidAt != nil {
			s.payments[index].PaidAt = *input.PaidAt
		}
		if input.Note != nil {
			s.payments[index].Note = *input.Note
		}
		s.payments[index].RecordedBy = actorUserID
		s.payments[index].UpdatedAt = s.clock()
		s.recalculateInstallmentLocked(s.payments[index].InstallmentID)
		return s.payments[index], nil
	}
	return billingdomain.Payment{}, errors.New("payment not found")
}

func (s *Store) VoidPayment(_ context.Context, tenantID, paymentID, actorUserID string) (billingdomain.Payment, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if tenantID != s.tenant.ID {
		return billingdomain.Payment{}, errors.New("tenant not found")
	}
	now := s.clock()
	for index := range s.payments {
		if s.payments[index].ID != paymentID {
			continue
		}
		s.payments[index].Void = true
		s.payments[index].VoidedAt = &now
		s.payments[index].RecordedBy = actorUserID
		s.payments[index].UpdatedAt = now
		s.recalculateInstallmentLocked(s.payments[index].InstallmentID)
		return s.payments[index], nil
	}
	return billingdomain.Payment{}, errors.New("payment not found")
}

func (s *Store) billingAccountSnapshotLocked(account billingdomain.BillingAccount) billingdomain.BillingAccount {
	account.Plans = []billingdomain.PaymentPlan{}
	for _, plan := range s.paymentPlans {
		if plan.BillingAccountID == account.ID {
			account.Plans = append(account.Plans, s.paymentPlanSnapshotLocked(plan))
		}
	}
	return account
}

func (s *Store) paymentPlanSnapshotLocked(plan billingdomain.PaymentPlan) billingdomain.PaymentPlan {
	plan.Installments = []billingdomain.PaymentInstallment{}
	for _, item := range s.paymentInstallments {
		if item.PaymentPlanID == plan.ID {
			plan.Installments = append(plan.Installments, s.paymentInstallmentSnapshotLocked(item))
		}
	}
	sort.Slice(plan.Installments, func(i, j int) bool { return plan.Installments[i].DueDate < plan.Installments[j].DueDate })
	return plan
}

func (s *Store) paymentInstallmentSnapshotLocked(item billingdomain.PaymentInstallment) billingdomain.PaymentInstallment {
	item.Payments = []billingdomain.Payment{}
	total := 0.0
	for _, payment := range s.payments {
		if payment.InstallmentID == item.ID {
			item.Payments = append(item.Payments, payment)
			if !payment.Void {
				total += payment.Amount
			}
		}
	}
	item.PaidAmount = memoryRoundMoney(total)
	item.RemainingAmount = memoryRoundMoney(item.Amount - item.PaidAmount)
	if item.RemainingAmount < 0 {
		item.RemainingAmount = 0
	}
	item.Status = memoryInstallmentStatus(item, s.clock())
	if account, ok := s.billingAccountByIDLocked(item.BillingAccountID); ok {
		item.StudentID = account.StudentID
		item.StudentName = account.StudentName
		item.ClassID = account.ClassID
		item.ClassName = account.ClassName
	}
	if plan, ok := s.paymentPlanByIDLocked(item.PaymentPlanID); ok {
		item.PlanName = plan.Name
	}
	sort.Slice(item.Payments, func(i, j int) bool { return item.Payments[i].PaidAt.After(item.Payments[j].PaidAt) })
	return item
}

func (s *Store) recalculateInstallmentLocked(installmentID string) {
	index, ok := s.installmentIndexLocked(installmentID)
	if !ok {
		return
	}
	item := s.paymentInstallmentSnapshotLocked(s.paymentInstallments[index])
	s.paymentInstallments[index].PaidAmount = item.PaidAmount
	s.paymentInstallments[index].RemainingAmount = item.RemainingAmount
	s.paymentInstallments[index].Status = item.Status
}

func (s *Store) installmentIndexLocked(id string) (int, bool) {
	for index := range s.paymentInstallments {
		if s.paymentInstallments[index].ID == id {
			return index, true
		}
	}
	return 0, false
}

func (s *Store) billingAccountByIDLocked(id string) (billingdomain.BillingAccount, bool) {
	for _, item := range s.billingAccounts {
		if item.ID == id {
			return item, true
		}
	}
	return billingdomain.BillingAccount{}, false
}

func (s *Store) paymentPlanByIDLocked(id string) (billingdomain.PaymentPlan, bool) {
	for _, item := range s.paymentPlans {
		if item.ID == id {
			return item, true
		}
	}
	return billingdomain.PaymentPlan{}, false
}

func memoryInstallmentStatus(item billingdomain.PaymentInstallment, now time.Time) billingdomain.InstallmentStatus {
	if item.Status == billingdomain.InstallmentCancelled {
		return item.Status
	}
	if item.PaidAmount >= item.Amount {
		return billingdomain.InstallmentPaid
	}
	if item.PaidAmount > 0 {
		if memoryDueBeforeToday(item.DueDate, now) {
			return billingdomain.InstallmentOverdue
		}
		return billingdomain.InstallmentPartial
	}
	if memoryDueBeforeToday(item.DueDate, now) {
		return billingdomain.InstallmentOverdue
	}
	return billingdomain.InstallmentPending
}

func memoryDueBeforeToday(dueDate string, now time.Time) bool {
	due, err := time.Parse("2006-01-02", dueDate)
	if err != nil {
		return false
	}
	today := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())
	return due.Before(today)
}

func memoryRoundMoney(value float64) float64 {
	return float64(int(value*100+0.5)) / 100
}
