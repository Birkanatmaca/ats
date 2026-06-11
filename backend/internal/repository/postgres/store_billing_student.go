package postgres

import (
	"context"
	"database/sql"
	"errors"
	"math"
	"strings"
	"time"

	billingdomain "ots/backend/internal/domain/billing"
)

func (s *Store) GetBillingAccountByStudent(ctx context.Context, tenantID, studentID string) (billingdomain.BillingAccount, bool, error) {
	account, ok, err := s.loadBillingAccount(ctx, tenantID, "student", studentID)
	if err != nil || !ok {
		return billingdomain.BillingAccount{}, ok, err
	}
	return account, true, nil
}

func (s *Store) EnsureBillingAccount(ctx context.Context, tenantID, studentID string) (billingdomain.BillingAccount, error) {
	account, ok, err := s.GetBillingAccountByStudent(ctx, tenantID, studentID)
	if err != nil {
		return billingdomain.BillingAccount{}, err
	}
	if ok {
		return account, nil
	}

	var accountID string
	err = s.db.QueryRowContext(ctx, `
INSERT INTO billing_accounts (tenant_id, student_id, guardian_user_id)
SELECT $1::uuid, st.id, guardian_link.user_id
FROM students st
LEFT JOIN LATERAL (
	SELECT g.user_id
	FROM student_guardians sg
	JOIN guardians g ON g.id = sg.guardian_id AND g.tenant_id = sg.tenant_id
	WHERE sg.tenant_id = st.tenant_id AND sg.student_id = st.id
	ORDER BY sg.is_primary DESC, g.created_at
	LIMIT 1
) guardian_link ON true
WHERE st.tenant_id = $1
  AND st.id = $2::uuid
  AND st.deleted_at IS NULL
ON CONFLICT (tenant_id, student_id)
DO UPDATE SET guardian_user_id = COALESCE(billing_accounts.guardian_user_id, EXCLUDED.guardian_user_id)
RETURNING id::text`, tenantID, studentID).Scan(&accountID)
	if errors.Is(err, sql.ErrNoRows) {
		return billingdomain.BillingAccount{}, errors.New("student not found")
	}
	if err != nil {
		return billingdomain.BillingAccount{}, err
	}

	account, ok, err = s.loadBillingAccount(ctx, tenantID, "account", accountID)
	if err != nil {
		return billingdomain.BillingAccount{}, err
	}
	if !ok {
		return billingdomain.BillingAccount{}, errors.New("account not found")
	}
	return account, nil
}

func (s *Store) CreatePaymentPlan(ctx context.Context, tenantID, accountID, _ string, input billingdomain.CreatePaymentPlanInput, installments []billingdomain.InstallmentInput) (billingdomain.PaymentPlan, error) {
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return billingdomain.PaymentPlan{}, err
	}
	defer rollback(tx)

	var planID string
	err = tx.QueryRowContext(ctx, `
INSERT INTO payment_plans (tenant_id, billing_account_id, name, total_amount, currency, start_date)
SELECT $1::uuid, ba.id, $3, $4, $5, $6::date
FROM billing_accounts ba
WHERE ba.tenant_id = $1 AND ba.id = $2::uuid
RETURNING id::text`,
		tenantID,
		accountID,
		strings.TrimSpace(input.Name),
		input.TotalAmount,
		strings.ToUpper(strings.TrimSpace(input.Currency)),
		strings.TrimSpace(input.StartDate),
	).Scan(&planID)
	if errors.Is(err, sql.ErrNoRows) {
		return billingdomain.PaymentPlan{}, errors.New("account not found")
	}
	if err != nil {
		return billingdomain.PaymentPlan{}, err
	}

	for _, installment := range installments {
		if _, err := tx.ExecContext(ctx, `
INSERT INTO payment_installments (tenant_id, payment_plan_id, due_date, amount, paid_amount, status)
VALUES ($1::uuid, $2::uuid, $3::date, $4, 0, 'pending')`,
			tenantID, planID, installment.DueDate, installment.Amount,
		); err != nil {
			return billingdomain.PaymentPlan{}, err
		}
	}

	if err := tx.Commit(); err != nil {
		return billingdomain.PaymentPlan{}, err
	}
	plan, ok, err := s.getPaymentPlanByID(ctx, tenantID, planID)
	if err != nil || !ok {
		return billingdomain.PaymentPlan{}, err
	}
	return plan, nil
}

func (s *Store) UpdatePaymentPlan(ctx context.Context, tenantID, planID string, input billingdomain.UpdatePaymentPlanInput) (billingdomain.PaymentPlan, error) {
	current, ok, err := s.getPaymentPlanByID(ctx, tenantID, planID)
	if err != nil {
		return billingdomain.PaymentPlan{}, err
	}
	if !ok {
		return billingdomain.PaymentPlan{}, errors.New("payment plan not found")
	}

	name := current.Name
	status := current.Status
	if input.Name != nil {
		name = strings.TrimSpace(*input.Name)
	}
	if input.Status != nil {
		status = *input.Status
	}

	result, err := s.db.ExecContext(ctx, `
UPDATE payment_plans
SET name = $3, status = $4, updated_at = now()
WHERE tenant_id = $1 AND id = $2::uuid`, tenantID, planID, name, string(status))
	if err != nil {
		return billingdomain.PaymentPlan{}, err
	}
	affected, err := result.RowsAffected()
	if err != nil {
		return billingdomain.PaymentPlan{}, err
	}
	if affected == 0 {
		return billingdomain.PaymentPlan{}, errors.New("payment plan not found")
	}

	updated, ok, err := s.getPaymentPlanByID(ctx, tenantID, planID)
	if err != nil || !ok {
		return billingdomain.PaymentPlan{}, err
	}
	return updated, nil
}

func (s *Store) ListBillingInstallments(ctx context.Context, tenantID string, filter billingdomain.InstallmentFilter) ([]billingdomain.PaymentInstallment, error) {
	rows, err := s.db.QueryContext(ctx, billingInstallmentSelect(`
WHERE pi.tenant_id = $1
ORDER BY pi.due_date ASC, st.full_name ASC`), tenantID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := []billingdomain.PaymentInstallment{}
	for rows.Next() {
		item, ok := scanBillingInstallment(rows, s.clock())
		if !ok {
			continue
		}
		if filter.StudentID != "" && item.StudentID != filter.StudentID {
			continue
		}
		if filter.ClassID != "" && item.ClassID != filter.ClassID {
			continue
		}
		if filter.Status != "" && string(item.Status) != filter.Status {
			continue
		}
		item.Payments, err = s.listPaymentsForInstallment(ctx, tenantID, item.ID)
		if err != nil {
			return nil, err
		}
		out = append(out, item)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return out, nil
}

func (s *Store) GetBillingInstallment(ctx context.Context, tenantID, installmentID string) (billingdomain.PaymentInstallment, bool, error) {
	row := s.db.QueryRowContext(ctx, billingInstallmentSelect(`
WHERE pi.tenant_id = $1 AND pi.id = $2::uuid`), tenantID, installmentID)
	item, ok := scanBillingInstallment(row, s.clock())
	if !ok {
		return billingdomain.PaymentInstallment{}, false, nil
	}
	payments, err := s.listPaymentsForInstallment(ctx, tenantID, item.ID)
	if err != nil {
		return billingdomain.PaymentInstallment{}, false, err
	}
	item.Payments = payments
	return item, true, nil
}

func (s *Store) CreateInstallmentPayment(ctx context.Context, tenantID, installmentID, actorUserID string, input billingdomain.CreatePaymentInput) (billingdomain.Payment, error) {
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return billingdomain.Payment{}, err
	}
	defer rollback(tx)

	if err := lockBillingInstallmentTx(ctx, tx, tenantID, installmentID); err != nil {
		return billingdomain.Payment{}, err
	}

	var paymentID string
	err = tx.QueryRowContext(ctx, `
INSERT INTO payments (tenant_id, installment_id, amount, method, paid_at, recorded_by, note)
VALUES ($1::uuid, $2::uuid, $3, $4, $5, NULLIF($6, '')::uuid, NULLIF($7, ''))
RETURNING id::text`,
		tenantID, installmentID, input.Amount, string(input.Method), *input.PaidAt, actorUserID, strings.TrimSpace(input.Note),
	).Scan(&paymentID)
	if err != nil {
		return billingdomain.Payment{}, err
	}
	if err := s.updateBillingInstallmentStateTx(ctx, tx, tenantID, installmentID); err != nil {
		return billingdomain.Payment{}, err
	}
	if err := tx.Commit(); err != nil {
		return billingdomain.Payment{}, err
	}
	return s.getPaymentByID(ctx, tenantID, paymentID)
}

func (s *Store) UpdatePayment(ctx context.Context, tenantID, paymentID, actorUserID string, input billingdomain.UpdatePaymentInput) (billingdomain.Payment, error) {
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return billingdomain.Payment{}, err
	}
	defer rollback(tx)

	current, installmentID, err := getPaymentForUpdateTx(ctx, tx, tenantID, paymentID)
	if err != nil {
		return billingdomain.Payment{}, err
	}
	if input.Amount != nil {
		current.Amount = *input.Amount
	}
	if input.Method != nil {
		current.Method = *input.Method
	}
	if input.PaidAt != nil {
		current.PaidAt = *input.PaidAt
	}
	if input.Note != nil {
		current.Note = *input.Note
	}

	_, err = tx.ExecContext(ctx, `
UPDATE payments
SET amount = $3,
    method = $4,
    paid_at = $5,
    note = NULLIF($6, ''),
    recorded_by = NULLIF($7, '')::uuid,
    updated_at = now()
WHERE tenant_id = $1 AND id = $2::uuid AND void = false`,
		tenantID, paymentID, current.Amount, string(current.Method), current.PaidAt, strings.TrimSpace(current.Note), actorUserID,
	)
	if err != nil {
		return billingdomain.Payment{}, err
	}
	if err := s.updateBillingInstallmentStateTx(ctx, tx, tenantID, installmentID); err != nil {
		return billingdomain.Payment{}, err
	}
	if err := tx.Commit(); err != nil {
		return billingdomain.Payment{}, err
	}
	return s.getPaymentByID(ctx, tenantID, paymentID)
}

func (s *Store) VoidPayment(ctx context.Context, tenantID, paymentID, actorUserID string) (billingdomain.Payment, error) {
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return billingdomain.Payment{}, err
	}
	defer rollback(tx)

	current, installmentID, err := getPaymentForUpdateTx(ctx, tx, tenantID, paymentID)
	if err != nil {
		return billingdomain.Payment{}, err
	}
	_, err = tx.ExecContext(ctx, `
UPDATE payments
SET void = true,
    voided_at = COALESCE(voided_at, now()),
    recorded_by = NULLIF($3, '')::uuid,
    updated_at = now()
WHERE tenant_id = $1 AND id = $2::uuid`, tenantID, paymentID, actorUserID)
	if err != nil {
		return billingdomain.Payment{}, err
	}
	if err := s.updateBillingInstallmentStateTx(ctx, tx, tenantID, installmentID); err != nil {
		return billingdomain.Payment{}, err
	}
	if err := tx.Commit(); err != nil {
		return billingdomain.Payment{}, err
	}
	current.Void = true
	return s.getPaymentByID(ctx, tenantID, paymentID)
}

func (s *Store) loadBillingAccount(ctx context.Context, tenantID, lookupType, lookupID string) (billingdomain.BillingAccount, bool, error) {
	condition := "ba.id = $2::uuid"
	if lookupType == "student" {
		condition = "ba.student_id = $2::uuid"
	}
	row := s.db.QueryRowContext(ctx, billingAccountSelect("WHERE ba.tenant_id = $1 AND "+condition), tenantID, lookupID)
	account, ok := scanBillingAccount(row)
	if !ok {
		return billingdomain.BillingAccount{}, false, nil
	}
	plans, err := s.listPaymentPlansForAccount(ctx, tenantID, account.ID)
	if err != nil {
		return billingdomain.BillingAccount{}, false, err
	}
	account.Plans = plans
	return account, true, nil
}

func (s *Store) listPaymentPlansForAccount(ctx context.Context, tenantID, accountID string) ([]billingdomain.PaymentPlan, error) {
	rows, err := s.db.QueryContext(ctx, `
SELECT id::text, tenant_id::text, billing_account_id::text, name, total_amount::float8,
       currency, start_date::text, status, created_at, updated_at
FROM payment_plans
WHERE tenant_id = $1 AND billing_account_id = $2::uuid
ORDER BY created_at DESC`, tenantID, accountID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	plans := []billingdomain.PaymentPlan{}
	for rows.Next() {
		plan, ok := scanPaymentPlan(rows)
		if !ok {
			continue
		}
		installments, err := s.listInstallmentsForPlan(ctx, tenantID, plan.ID)
		if err != nil {
			return nil, err
		}
		plan.Installments = installments
		plans = append(plans, plan)
	}
	return plans, rows.Err()
}

func (s *Store) getPaymentPlanByID(ctx context.Context, tenantID, planID string) (billingdomain.PaymentPlan, bool, error) {
	row := s.db.QueryRowContext(ctx, `
SELECT id::text, tenant_id::text, billing_account_id::text, name, total_amount::float8,
       currency, start_date::text, status, created_at, updated_at
FROM payment_plans
WHERE tenant_id = $1 AND id = $2::uuid`, tenantID, planID)
	plan, ok := scanPaymentPlan(row)
	if !ok {
		return billingdomain.PaymentPlan{}, false, nil
	}
	installments, err := s.listInstallmentsForPlan(ctx, tenantID, plan.ID)
	if err != nil {
		return billingdomain.PaymentPlan{}, false, err
	}
	plan.Installments = installments
	return plan, true, nil
}

func (s *Store) listInstallmentsForPlan(ctx context.Context, tenantID, planID string) ([]billingdomain.PaymentInstallment, error) {
	rows, err := s.db.QueryContext(ctx, billingInstallmentSelect(`
WHERE pi.tenant_id = $1 AND pi.payment_plan_id = $2::uuid
ORDER BY pi.due_date ASC`), tenantID, planID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := []billingdomain.PaymentInstallment{}
	for rows.Next() {
		item, ok := scanBillingInstallment(rows, s.clock())
		if !ok {
			continue
		}
		item.Payments, err = s.listPaymentsForInstallment(ctx, tenantID, item.ID)
		if err != nil {
			return nil, err
		}
		out = append(out, item)
	}
	return out, rows.Err()
}

func (s *Store) listPaymentsForInstallment(ctx context.Context, tenantID, installmentID string) ([]billingdomain.Payment, error) {
	rows, err := s.db.QueryContext(ctx, `
SELECT id::text, tenant_id::text, installment_id::text, amount::float8, method,
       paid_at, COALESCE(recorded_by::text, ''), COALESCE(note, ''), void, voided_at,
       created_at, updated_at
FROM payments
WHERE tenant_id = $1 AND installment_id = $2::uuid
ORDER BY paid_at DESC`, tenantID, installmentID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []billingdomain.Payment{}
	for rows.Next() {
		payment, ok := scanPayment(rows)
		if ok {
			out = append(out, payment)
		}
	}
	return out, rows.Err()
}

func (s *Store) getPaymentByID(ctx context.Context, tenantID, paymentID string) (billingdomain.Payment, error) {
	row := s.db.QueryRowContext(ctx, `
SELECT id::text, tenant_id::text, installment_id::text, amount::float8, method,
       paid_at, COALESCE(recorded_by::text, ''), COALESCE(note, ''), void, voided_at,
       created_at, updated_at
FROM payments
WHERE tenant_id = $1 AND id = $2::uuid`, tenantID, paymentID)
	payment, ok := scanPayment(row)
	if !ok {
		return billingdomain.Payment{}, errors.New("payment not found")
	}
	return payment, nil
}

func (s *Store) updateBillingInstallmentStateTx(ctx context.Context, tx *sql.Tx, tenantID, installmentID string) error {
	var amount, paidAmount float64
	var dueDate string
	var currentStatus string
	err := tx.QueryRowContext(ctx, `
SELECT amount::float8, due_date::text, status
FROM payment_installments
WHERE tenant_id = $1 AND id = $2::uuid
FOR UPDATE`, tenantID, installmentID).Scan(&amount, &dueDate, &currentStatus)
	if errors.Is(err, sql.ErrNoRows) {
		return errors.New("installment not found")
	}
	if err != nil {
		return err
	}
	err = tx.QueryRowContext(ctx, `
SELECT COALESCE(SUM(amount), 0)::float8
FROM payments
WHERE tenant_id = $1 AND installment_id = $2::uuid AND void = false`, tenantID, installmentID).Scan(&paidAmount)
	if err != nil {
		return err
	}
	status := postgresInstallmentStatus(amount, paidAmount, dueDate, billingdomain.InstallmentStatus(currentStatus), s.clock())
	_, err = tx.ExecContext(ctx, `
UPDATE payment_installments
SET paid_amount = $3, status = $4, updated_at = now()
WHERE tenant_id = $1 AND id = $2::uuid`, tenantID, installmentID, postgresRoundMoney(paidAmount), string(status))
	return err
}

func lockBillingInstallmentTx(ctx context.Context, tx *sql.Tx, tenantID, installmentID string) error {
	var exists int
	err := tx.QueryRowContext(ctx, `
SELECT 1
FROM payment_installments
WHERE tenant_id = $1 AND id = $2::uuid
FOR UPDATE`, tenantID, installmentID).Scan(&exists)
	if errors.Is(err, sql.ErrNoRows) {
		return errors.New("installment not found")
	}
	return err
}

func getPaymentForUpdateTx(ctx context.Context, tx *sql.Tx, tenantID, paymentID string) (billingdomain.Payment, string, error) {
	row := tx.QueryRowContext(ctx, `
SELECT id::text, tenant_id::text, installment_id::text, amount::float8, method,
       paid_at, COALESCE(recorded_by::text, ''), COALESCE(note, ''), void, voided_at,
       created_at, updated_at
FROM payments
WHERE tenant_id = $1 AND id = $2::uuid AND void = false
FOR UPDATE`, tenantID, paymentID)
	payment, ok := scanPayment(row)
	if !ok {
		return billingdomain.Payment{}, "", errors.New("payment not found")
	}
	return payment, payment.InstallmentID, nil
}

func billingAccountSelect(where string) string {
	return `
SELECT ba.id::text,
       ba.tenant_id::text,
       ba.student_id::text,
       st.full_name,
       st.student_number,
       COALESCE(active_class.class_id::text, ''),
       COALESCE(c.name, ''),
       COALESCE(ba.guardian_user_id::text, ''),
       ba.status,
       ba.created_at
FROM billing_accounts ba
JOIN students st ON st.id = ba.student_id AND st.tenant_id = ba.tenant_id
LEFT JOIN LATERAL (
	SELECT class_id
	FROM class_students
	WHERE tenant_id = st.tenant_id
	  AND student_id = st.id
	  AND (ends_on IS NULL OR ends_on >= CURRENT_DATE)
	ORDER BY starts_on DESC NULLS LAST
	LIMIT 1
) active_class ON true
LEFT JOIN classes c ON c.id = active_class.class_id AND c.tenant_id = st.tenant_id
` + where
}

func billingInstallmentSelect(where string) string {
	return `
SELECT pi.id::text,
       pi.tenant_id::text,
       pi.payment_plan_id::text,
       ba.id::text,
       st.id::text,
       st.full_name,
       COALESCE(active_class.class_id::text, ''),
       COALESCE(c.name, ''),
       pp.name,
       pi.due_date::text,
       pi.amount::float8,
       pi.paid_amount::float8,
       GREATEST(pi.amount - pi.paid_amount, 0)::float8,
       pi.status
FROM payment_installments pi
JOIN payment_plans pp ON pp.id = pi.payment_plan_id AND pp.tenant_id = pi.tenant_id
JOIN billing_accounts ba ON ba.id = pp.billing_account_id AND ba.tenant_id = pp.tenant_id
JOIN students st ON st.id = ba.student_id AND st.tenant_id = ba.tenant_id
LEFT JOIN LATERAL (
	SELECT class_id
	FROM class_students
	WHERE tenant_id = st.tenant_id
	  AND student_id = st.id
	  AND (ends_on IS NULL OR ends_on >= CURRENT_DATE)
	ORDER BY starts_on DESC NULLS LAST
	LIMIT 1
) active_class ON true
LEFT JOIN classes c ON c.id = active_class.class_id AND c.tenant_id = st.tenant_id
` + where
}

type scanner interface {
	Scan(dest ...any) error
}

func scanBillingAccount(row scanner) (billingdomain.BillingAccount, bool) {
	var item billingdomain.BillingAccount
	var status string
	err := row.Scan(
		&item.ID,
		&item.TenantID,
		&item.StudentID,
		&item.StudentName,
		&item.SchoolNumber,
		&item.ClassID,
		&item.ClassName,
		&item.GuardianUserID,
		&status,
		&item.CreatedAt,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return billingdomain.BillingAccount{}, false
	}
	if err != nil {
		return billingdomain.BillingAccount{}, false
	}
	item.Status = billingdomain.BillingAccountStatus(status)
	item.Plans = []billingdomain.PaymentPlan{}
	return item, true
}

func scanPaymentPlan(row scanner) (billingdomain.PaymentPlan, bool) {
	var item billingdomain.PaymentPlan
	var status string
	err := row.Scan(
		&item.ID,
		&item.TenantID,
		&item.BillingAccountID,
		&item.Name,
		&item.TotalAmount,
		&item.Currency,
		&item.StartDate,
		&status,
		&item.CreatedAt,
		&item.UpdatedAt,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return billingdomain.PaymentPlan{}, false
	}
	if err != nil {
		return billingdomain.PaymentPlan{}, false
	}
	item.Status = billingdomain.PaymentPlanStatus(status)
	item.Installments = []billingdomain.PaymentInstallment{}
	return item, true
}

func scanBillingInstallment(row scanner, now time.Time) (billingdomain.PaymentInstallment, bool) {
	var item billingdomain.PaymentInstallment
	var status string
	err := row.Scan(
		&item.ID,
		&item.TenantID,
		&item.PaymentPlanID,
		&item.BillingAccountID,
		&item.StudentID,
		&item.StudentName,
		&item.ClassID,
		&item.ClassName,
		&item.PlanName,
		&item.DueDate,
		&item.Amount,
		&item.PaidAmount,
		&item.RemainingAmount,
		&status,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return billingdomain.PaymentInstallment{}, false
	}
	if err != nil {
		return billingdomain.PaymentInstallment{}, false
	}
	item.PaidAmount = postgresRoundMoney(item.PaidAmount)
	item.RemainingAmount = postgresRoundMoney(item.Amount - item.PaidAmount)
	if item.RemainingAmount < 0 {
		item.RemainingAmount = 0
	}
	item.Status = postgresInstallmentStatus(item.Amount, item.PaidAmount, item.DueDate, billingdomain.InstallmentStatus(status), now)
	item.Payments = []billingdomain.Payment{}
	return item, true
}

func scanPayment(row scanner) (billingdomain.Payment, bool) {
	var item billingdomain.Payment
	var method string
	var voidedAt sql.NullTime
	err := row.Scan(
		&item.ID,
		&item.TenantID,
		&item.InstallmentID,
		&item.Amount,
		&method,
		&item.PaidAt,
		&item.RecordedBy,
		&item.Note,
		&item.Void,
		&voidedAt,
		&item.CreatedAt,
		&item.UpdatedAt,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return billingdomain.Payment{}, false
	}
	if err != nil {
		return billingdomain.Payment{}, false
	}
	item.Method = billingdomain.PaymentMethod(method)
	if voidedAt.Valid {
		item.VoidedAt = &voidedAt.Time
	}
	return item, true
}

func postgresInstallmentStatus(amount, paidAmount float64, dueDate string, current billingdomain.InstallmentStatus, now time.Time) billingdomain.InstallmentStatus {
	if current == billingdomain.InstallmentCancelled {
		return current
	}
	paidAmount = postgresRoundMoney(paidAmount)
	if paidAmount >= amount {
		return billingdomain.InstallmentPaid
	}
	if dueBeforeToday(dueDate, now) {
		return billingdomain.InstallmentOverdue
	}
	if paidAmount > 0 {
		return billingdomain.InstallmentPartial
	}
	return billingdomain.InstallmentPending
}

func dueBeforeToday(dueDate string, now time.Time) bool {
	due, err := time.Parse("2006-01-02", dueDate)
	if err != nil {
		return false
	}
	today := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())
	return due.Before(today)
}

func postgresRoundMoney(value float64) float64 {
	return math.Round(value*100) / 100
}
