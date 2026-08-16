package billing

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"math"
	"strings"
	"time"

	billingdomain "ots/backend/internal/domain/billing"
	superadmindomain "ots/backend/internal/domain/superadmin"
)

var (
	ErrInvalidQuote     = errors.New("invalid billing quote input")
	ErrInvalidBilling   = errors.New("invalid billing input")
	ErrBillingNotFound  = errors.New("billing record not found")
	ErrBillingForbidden = errors.New("billing access forbidden")
)

type Repository interface {
	ListInstitutions(ctx context.Context) ([]superadmindomain.Institution, error)
	GetBillingSettings(ctx context.Context) (billingdomain.Settings, error)
	UpdateBillingSettings(ctx context.Context, input billingdomain.Settings) (billingdomain.Settings, error)
	GetBillingAccountByStudent(ctx context.Context, tenantID, studentID string) (billingdomain.BillingAccount, bool, error)
	EnsureBillingAccount(ctx context.Context, tenantID, studentID string) (billingdomain.BillingAccount, error)
	CreatePaymentPlan(ctx context.Context, tenantID, accountID, actorUserID string, input billingdomain.CreatePaymentPlanInput, installments []billingdomain.InstallmentInput) (billingdomain.PaymentPlan, error)
	UpdatePaymentPlan(ctx context.Context, tenantID, planID string, input billingdomain.UpdatePaymentPlanInput) (billingdomain.PaymentPlan, error)
	ListBillingInstallments(ctx context.Context, tenantID string, filter billingdomain.InstallmentFilter) ([]billingdomain.PaymentInstallment, error)
	GetBillingInstallment(ctx context.Context, tenantID, installmentID string) (billingdomain.PaymentInstallment, bool, error)
	CreateInstallmentPayment(ctx context.Context, tenantID, installmentID, actorUserID string, input billingdomain.CreatePaymentInput) (billingdomain.Payment, error)
	UpdatePayment(ctx context.Context, tenantID, paymentID, actorUserID string, input billingdomain.UpdatePaymentInput) (billingdomain.Payment, error)
	VoidPayment(ctx context.Context, tenantID, paymentID, actorUserID string) (billingdomain.Payment, error)
	GuardianHasStudent(ctx context.Context, tenantID string, guardianUserID string, studentID string) bool
	RecordOperationalAudit(ctx context.Context, tenantID, actorUserID, action, resourceType, resourceID, metadata string)
}

type Service struct {
	repo  Repository
	clock func() time.Time
}

func NewService(repo Repository, clock func() time.Time) *Service {
	if clock == nil {
		clock = time.Now
	}
	return &Service{repo: repo, clock: clock}
}

func (s *Service) Overview(ctx context.Context) (billingdomain.Overview, error) {
	settings, err := s.repo.GetBillingSettings(ctx)
	if err != nil {
		return billingdomain.Overview{}, err
	}
	institutions, err := s.repo.ListInstitutions(ctx)
	if err != nil {
		return billingdomain.Overview{}, err
	}

	packages := billingdomain.EffectivePackages(settings.Packages)
	settings.Packages = packages
	corePackage, ok := billingdomain.FindPackageIn(packages, billingdomain.PackageCore)
	if !ok {
		corePackage = packages[0]
	}
	out := billingdomain.Overview{
		Settings:     settings,
		Packages:     packages,
		UpdatedAt:    s.clock(),
		Institutions: make([]billingdomain.InstitutionLicenseRow, 0, len(institutions)),
	}
	for _, item := range institutions {
		_, annualUSD, _ := billingdomain.CalculateLicenseSubtotal(item.Students, corePackage.PricePerStudent, corePackage.MinOrderUSD, 1)
		row := billingdomain.InstitutionLicenseRow{
			TenantID:        item.ID,
			InstitutionName: item.Name,
			Plan:            item.Plan,
			Status:          item.Status,
			StudentCount:    item.Students,
			AnnualUSD:       annualUSD,
			AnnualTRY:       roundMoney(annualUSD * settings.UsdTryRate),
			PackageID:       billingdomain.PackageCore,
		}
		out.Institutions = append(out.Institutions, row)
		out.TotalStudents += item.Students
		out.TotalAnnualUSD += annualUSD
	}
	out.TotalInstitutions = len(institutions)
	if rate, err := s.TCMBUsdRate(ctx); err == nil {
		out.TCMB = &rate
		settings.UsdTryRate = rate.UsdTryRate
		out.Settings = settings
		for i := range out.Institutions {
			out.Institutions[i].AnnualTRY = roundMoney(out.Institutions[i].AnnualUSD * rate.UsdTryRate)
		}
	}
	out.TotalAnnualTRY = roundMoney(out.TotalAnnualUSD * settings.UsdTryRate)
	return out, nil
}

func (s *Service) UpdateSettings(ctx context.Context, input billingdomain.Settings) (billingdomain.Settings, error) {
	if input.UsdTryRate <= 0 || input.QuoteValidityDays <= 0 {
		return billingdomain.Settings{}, ErrInvalidQuote
	}
	input.CompanyName = strings.TrimSpace(input.CompanyName)
	input.CompanyEmail = strings.TrimSpace(input.CompanyEmail)
	if input.CompanyName == "" {
		input.CompanyName = "OGTA Platform"
	}
	if len(input.Packages) > 0 {
		normalized, err := normalizeLicensePackages(input.Packages)
		if err != nil {
			return billingdomain.Settings{}, err
		}
		input.Packages = normalized
	}
	return s.repo.UpdateBillingSettings(ctx, input)
}

func (s *Service) GetSettings(ctx context.Context) (billingdomain.Settings, error) {
	return s.repo.GetBillingSettings(ctx)
}

func (s *Service) PreviewQuote(ctx context.Context, input billingdomain.QuotePreviewInput) (billingdomain.QuotePreview, error) {
	settings, err := s.repo.GetBillingSettings(ctx)
	if err != nil {
		return billingdomain.QuotePreview{}, err
	}
	if input.StudentCount <= 0 {
		return billingdomain.QuotePreview{}, ErrInvalidQuote
	}
	if input.TermYears <= 0 {
		input.TermYears = 1
	}
	if strings.TrimSpace(input.PackageID) == "" {
		input.PackageID = billingdomain.PackageCore
	}
	packages := billingdomain.EffectivePackages(settings.Packages)
	pkg, ok := billingdomain.FindPackageIn(packages, input.PackageID)
	if !ok {
		return billingdomain.QuotePreview{}, ErrInvalidQuote
	}
	if input.UsdTryRate <= 0 {
		input.UsdTryRate = settings.UsdTryRate
	}
	if input.DiscountPercent < 0 || input.DiscountPercent > 100 {
		return billingdomain.QuotePreview{}, ErrInvalidQuote
	}

	pricing := billingdomain.ResolveQuotePricing(pkg, input.PricePerStudentUSD, input.MinOrderUSD)
	if pricing.PricePerStudent <= 0 {
		return billingdomain.QuotePreview{}, ErrInvalidQuote
	}
	if pricing.MinOrderUSD < 0 {
		return billingdomain.QuotePreview{}, ErrInvalidQuote
	}

	institutionName := strings.TrimSpace(input.InstitutionName)
	if institutionName == "" && strings.TrimSpace(input.TenantID) != "" {
		institutions, err := s.repo.ListInstitutions(ctx)
		if err != nil {
			return billingdomain.QuotePreview{}, err
		}
		for _, item := range institutions {
			if item.ID == input.TenantID {
				institutionName = item.Name
				break
			}
		}
	}
	if institutionName == "" {
		institutionName = "Kurum"
	}

	calculatedUSD, subtotalUSD, minimumApplied := billingdomain.CalculateLicenseSubtotal(
		input.StudentCount,
		pricing.PricePerStudent,
		pricing.MinOrderUSD,
		input.TermYears,
	)
	discount := roundMoney(subtotalUSD * input.DiscountPercent / 100)
	totalUSD := roundMoney(subtotalUSD - discount)
	issuedAt := s.clock()
	validUntil := issuedAt.AddDate(0, 0, settings.QuoteValidityDays)

	lineItems := []billingdomain.QuoteLineItem{
		{
			Label:     fmt.Sprintf("OGTA %s paketi — öğrenci lisansı (%d yıl)", pkg.Name, input.TermYears),
			Quantity:  input.StudentCount,
			UnitPrice: pricing.PricePerStudent,
			UnitLabel: "öğrenci / yıl",
			AmountUSD: calculatedUSD,
		},
	}
	if minimumApplied {
		adjustment := roundMoney(subtotalUSD - calculatedUSD)
		if pricing.MinOrderUSD > 0 {
			lineItems = append(lineItems, billingdomain.QuoteLineItem{
				Label:     fmt.Sprintf("Minimum sipariş tutarı (yıllık $%.0f)", pricing.MinOrderUSD),
				Quantity:  1,
				UnitPrice: adjustment,
				UnitLabel: "USD",
				AmountUSD: adjustment,
			})
		}
	}
	if discount > 0 {
		lineItems = append(lineItems, billingdomain.QuoteLineItem{
			Label:     fmt.Sprintf("İndirim (%.0f%%)", input.DiscountPercent),
			Quantity:  1,
			UnitPrice: -discount,
			UnitLabel: "USD",
			AmountUSD: -discount,
		})
	}

	return billingdomain.QuotePreview{
		QuoteNumber:            fmt.Sprintf("OGTA-%s-%04d", issuedAt.Format("20060102"), issuedAt.Unix()%10000),
		IssuedAt:               issuedAt,
		ValidUntil:             validUntil,
		TenantID:               strings.TrimSpace(input.TenantID),
		InstitutionName:        institutionName,
		ContactName:            strings.TrimSpace(input.ContactName),
		ContactEmail:           strings.TrimSpace(input.ContactEmail),
		PackageID:              pkg.ID,
		PackageName:            pkg.Name,
		PackageFeatures:        append([]string(nil), pkg.Features...),
		StudentCount:           input.StudentCount,
		TermYears:              input.TermYears,
		PricePerStudent:        pricing.PricePerStudent,
		MinOrderUSD:            pricing.MinOrderUSD,
		DefaultPricePerStudent: pricing.DefaultPricePerStudent,
		DefaultMinOrderUSD:     pricing.DefaultMinOrderUSD,
		PricingCustomized:      pricing.PricingCustomized,
		MinimumApplied:         minimumApplied,
		CalculatedUSD:          calculatedUSD,
		DiscountPercent:        input.DiscountPercent,
		SubtotalUSD:            subtotalUSD,
		DiscountUSD:            discount,
		TotalUSD:               totalUSD,
		TotalTRY:               roundMoney(totalUSD * input.UsdTryRate),
		UsdTryRate:             input.UsdTryRate,
		LineItems:              lineItems,
		Notes:                  strings.TrimSpace(input.Notes),
		CompanyName:            settings.CompanyName,
		CompanyEmail:           settings.CompanyEmail,
	}, nil
}

func (s *Service) StudentAccount(ctx context.Context, tenantID, studentID string) (billingdomain.BillingAccount, error) {
	account, ok, err := s.repo.GetBillingAccountByStudent(ctx, tenantID, strings.TrimSpace(studentID))
	if err != nil {
		return billingdomain.BillingAccount{}, err
	}
	if !ok {
		return billingdomain.BillingAccount{}, ErrBillingNotFound
	}
	return account, nil
}

func (s *Service) CreateStudentPlan(ctx context.Context, tenantID, studentID, actorUserID string, input billingdomain.CreatePaymentPlanInput) (billingdomain.BillingAccount, error) {
	input = normalizePaymentPlanInput(input)
	installments, err := buildInstallments(input)
	if err != nil {
		return billingdomain.BillingAccount{}, err
	}
	account, err := s.repo.EnsureBillingAccount(ctx, tenantID, strings.TrimSpace(studentID))
	if err != nil {
		if isBillingNotFoundError(err) {
			return billingdomain.BillingAccount{}, ErrBillingNotFound
		}
		return billingdomain.BillingAccount{}, err
	}
	plan, err := s.repo.CreatePaymentPlan(ctx, tenantID, account.ID, actorUserID, input, installments)
	if err != nil {
		if isBillingNotFoundError(err) {
			return billingdomain.BillingAccount{}, ErrBillingNotFound
		}
		return billingdomain.BillingAccount{}, err
	}
	s.repo.RecordOperationalAudit(ctx, tenantID, actorUserID, "billing.plan.create", "payment_plan", plan.ID, fmt.Sprintf(`{"studentId":"%s","totalAmount":%.2f}`, studentID, input.TotalAmount))
	return s.StudentAccount(ctx, tenantID, studentID)
}

func (s *Service) UpdatePlan(ctx context.Context, tenantID, planID, actorUserID string, input billingdomain.UpdatePaymentPlanInput) (billingdomain.PaymentPlan, error) {
	if input.Name != nil {
		value := strings.TrimSpace(*input.Name)
		input.Name = &value
	}
	plan, err := s.repo.UpdatePaymentPlan(ctx, tenantID, strings.TrimSpace(planID), input)
	if err != nil {
		if isBillingNotFoundError(err) {
			return billingdomain.PaymentPlan{}, ErrBillingNotFound
		}
		return billingdomain.PaymentPlan{}, err
	}
	s.repo.RecordOperationalAudit(ctx, tenantID, actorUserID, "billing.plan.update", "payment_plan", plan.ID, `{}`)
	return plan, nil
}

func (s *Service) ListInstallments(ctx context.Context, tenantID string, filter billingdomain.InstallmentFilter) ([]billingdomain.PaymentInstallment, error) {
	filter.StudentID = strings.TrimSpace(filter.StudentID)
	filter.ClassID = strings.TrimSpace(filter.ClassID)
	filter.Status = strings.TrimSpace(filter.Status)
	return s.repo.ListBillingInstallments(ctx, tenantID, filter)
}

func (s *Service) RecordPayment(ctx context.Context, tenantID, installmentID, actorUserID string, input billingdomain.CreatePaymentInput) (billingdomain.PaymentInstallment, error) {
	input.Note = strings.TrimSpace(input.Note)
	input.Method = normalizePaymentMethod(input.Method)
	if input.Amount <= 0 {
		return billingdomain.PaymentInstallment{}, ErrInvalidBilling
	}
	if input.PaidAt == nil {
		now := s.clock()
		input.PaidAt = &now
	}
	payment, err := s.repo.CreateInstallmentPayment(ctx, tenantID, strings.TrimSpace(installmentID), actorUserID, input)
	if err != nil {
		if isBillingNotFoundError(err) {
			return billingdomain.PaymentInstallment{}, ErrBillingNotFound
		}
		return billingdomain.PaymentInstallment{}, err
	}
	s.repo.RecordOperationalAudit(ctx, tenantID, actorUserID, "billing.payment.create", "payment", payment.ID, fmt.Sprintf(`{"installmentId":"%s","amount":%.2f}`, installmentID, input.Amount))
	installment, ok, err := s.repo.GetBillingInstallment(ctx, tenantID, installmentID)
	if err != nil {
		return billingdomain.PaymentInstallment{}, err
	}
	if !ok {
		return billingdomain.PaymentInstallment{}, ErrBillingNotFound
	}
	return installment, nil
}

func (s *Service) UpdatePayment(ctx context.Context, tenantID, paymentID, actorUserID string, input billingdomain.UpdatePaymentInput) (billingdomain.Payment, error) {
	if input.Amount != nil && *input.Amount <= 0 {
		return billingdomain.Payment{}, ErrInvalidBilling
	}
	if input.Method != nil {
		value := normalizePaymentMethod(*input.Method)
		input.Method = &value
	}
	if input.Note != nil {
		value := strings.TrimSpace(*input.Note)
		input.Note = &value
	}
	payment, err := s.repo.UpdatePayment(ctx, tenantID, strings.TrimSpace(paymentID), actorUserID, input)
	if err != nil {
		if isBillingNotFoundError(err) {
			return billingdomain.Payment{}, ErrBillingNotFound
		}
		return billingdomain.Payment{}, err
	}
	s.repo.RecordOperationalAudit(ctx, tenantID, actorUserID, "billing.payment.update", "payment", payment.ID, `{}`)
	return payment, nil
}

func (s *Service) VoidPayment(ctx context.Context, tenantID, paymentID, actorUserID string) (billingdomain.Payment, error) {
	payment, err := s.repo.VoidPayment(ctx, tenantID, strings.TrimSpace(paymentID), actorUserID)
	if err != nil {
		if isBillingNotFoundError(err) {
			return billingdomain.Payment{}, ErrBillingNotFound
		}
		return billingdomain.Payment{}, err
	}
	s.repo.RecordOperationalAudit(ctx, tenantID, actorUserID, "billing.payment.void", "payment", payment.ID, `{}`)
	return payment, nil
}

func (s *Service) Dashboard(ctx context.Context, tenantID string) (billingdomain.BillingDashboard, error) {
	items, err := s.repo.ListBillingInstallments(ctx, tenantID, billingdomain.InstallmentFilter{})
	if err != nil {
		return billingdomain.BillingDashboard{}, err
	}
	dashboard := billingdomain.BillingDashboard{UpdatedAt: s.clock(), OverdueInstallments: []billingdomain.PaymentInstallment{}}
	activePlans := map[string]struct{}{}
	for _, item := range items {
		if item.Status == billingdomain.InstallmentCancelled {
			continue
		}
		dashboard.TotalReceivable += item.Amount
		dashboard.CollectedAmount += item.PaidAmount
		dashboard.OutstandingAmount += item.RemainingAmount
		activePlans[item.PaymentPlanID] = struct{}{}
		if effectiveInstallmentStatus(item, s.clock()) == billingdomain.InstallmentOverdue {
			dashboard.OverdueAmount += item.RemainingAmount
			dashboard.OverdueCount++
			dashboard.OverdueInstallments = append(dashboard.OverdueInstallments, item)
		}
	}
	dashboard.ActivePlanCount = len(activePlans)
	dashboard.TotalReceivable = roundMoney(dashboard.TotalReceivable)
	dashboard.CollectedAmount = roundMoney(dashboard.CollectedAmount)
	dashboard.OutstandingAmount = roundMoney(dashboard.OutstandingAmount)
	dashboard.OverdueAmount = roundMoney(dashboard.OverdueAmount)
	if len(dashboard.OverdueInstallments) > 10 {
		dashboard.OverdueInstallments = dashboard.OverdueInstallments[:10]
	}
	return dashboard, nil
}

func (s *Service) OverdueReport(ctx context.Context, tenantID string) ([]billingdomain.PaymentInstallment, error) {
	items, err := s.repo.ListBillingInstallments(ctx, tenantID, billingdomain.InstallmentFilter{Status: string(billingdomain.InstallmentOverdue)})
	if err != nil {
		return nil, err
	}
	return items, nil
}

func (s *Service) GuardianSummary(ctx context.Context, tenantID, guardianUserID, studentID string) (billingdomain.GuardianBillingSummary, error) {
	studentID = strings.TrimSpace(studentID)
	if studentID == "" || !s.repo.GuardianHasStudent(ctx, tenantID, guardianUserID, studentID) {
		return billingdomain.GuardianBillingSummary{}, ErrBillingForbidden
	}
	account, err := s.StudentAccount(ctx, tenantID, studentID)
	if err != nil {
		return billingdomain.GuardianBillingSummary{}, err
	}
	summary := billingdomain.GuardianBillingSummary{Account: account}
	for _, plan := range account.Plans {
		for _, installment := range plan.Installments {
			switch effectiveInstallmentStatus(installment, s.clock()) {
			case billingdomain.InstallmentOverdue:
				summary.OverdueInstallments = append(summary.OverdueInstallments, installment)
				summary.OverdueAmount += installment.RemainingAmount
			case billingdomain.InstallmentPaid, billingdomain.InstallmentCancelled:
			default:
				summary.UpcomingInstallments = append(summary.UpcomingInstallments, installment)
			}
			summary.OutstandingAmount += installment.RemainingAmount
			for _, payment := range installment.Payments {
				if !payment.Void {
					summary.PaymentHistory = append(summary.PaymentHistory, payment)
				}
			}
		}
	}
	summary.OutstandingAmount = roundMoney(summary.OutstandingAmount)
	summary.OverdueAmount = roundMoney(summary.OverdueAmount)
	if len(summary.UpcomingInstallments) > 5 {
		summary.UpcomingInstallments = summary.UpcomingInstallments[:5]
	}
	if len(summary.PaymentHistory) > 8 {
		summary.PaymentHistory = summary.PaymentHistory[:8]
	}
	return summary, nil
}

func normalizeLicensePackages(packages []billingdomain.LicensePackage) ([]billingdomain.LicensePackage, error) {
	out := make([]billingdomain.LicensePackage, 0, len(packages))
	for _, item := range packages {
		item.ID = strings.TrimSpace(item.ID)
		item.Name = strings.TrimSpace(item.Name)
		item.Tagline = strings.TrimSpace(item.Tagline)
		if item.ID == "" || item.Name == "" || item.PricePerStudent <= 0 || item.MinOrderUSD < 0 {
			return nil, ErrInvalidQuote
		}
		features := make([]string, 0, len(item.Features))
		for _, feature := range item.Features {
			feature = strings.TrimSpace(feature)
			if feature != "" {
				features = append(features, feature)
			}
		}
		item.Features = features
		out = append(out, item)
	}
	if len(out) == 0 {
		return nil, ErrInvalidQuote
	}
	return out, nil
}

func normalizePaymentPlanInput(input billingdomain.CreatePaymentPlanInput) billingdomain.CreatePaymentPlanInput {
	input.Name = strings.TrimSpace(input.Name)
	input.Currency = strings.ToUpper(strings.TrimSpace(input.Currency))
	if input.Currency == "" {
		input.Currency = "TRY"
	}
	input.StartDate = strings.TrimSpace(input.StartDate)
	return input
}

func buildInstallments(input billingdomain.CreatePaymentPlanInput) ([]billingdomain.InstallmentInput, error) {
	if input.Name == "" || input.TotalAmount <= 0 || input.StartDate == "" {
		return nil, ErrInvalidBilling
	}
	start, err := time.Parse("2006-01-02", input.StartDate)
	if err != nil {
		return nil, ErrInvalidBilling
	}
	if len(input.Installments) > 0 {
		total := 0.0
		out := make([]billingdomain.InstallmentInput, 0, len(input.Installments))
		for _, item := range input.Installments {
			if item.Amount <= 0 {
				return nil, ErrInvalidBilling
			}
			if _, err := time.Parse("2006-01-02", item.DueDate); err != nil {
				return nil, ErrInvalidBilling
			}
			total += item.Amount
			out = append(out, billingdomain.InstallmentInput{DueDate: strings.TrimSpace(item.DueDate), Amount: roundMoney(item.Amount)})
		}
		if math.Abs(roundMoney(total)-roundMoney(input.TotalAmount)) > 0.01 {
			return nil, ErrInvalidBilling
		}
		return out, nil
	}
	if input.InstallmentCount <= 0 {
		input.InstallmentCount = 1
	}
	base := math.Floor(input.TotalAmount/float64(input.InstallmentCount)*100) / 100
	out := make([]billingdomain.InstallmentInput, 0, input.InstallmentCount)
	remaining := input.TotalAmount
	for index := 0; index < input.InstallmentCount; index++ {
		amount := base
		if index == input.InstallmentCount-1 {
			amount = roundMoney(remaining)
		}
		out = append(out, billingdomain.InstallmentInput{
			DueDate: start.AddDate(0, index, 0).Format("2006-01-02"),
			Amount:  roundMoney(amount),
		})
		remaining = roundMoney(remaining - amount)
	}
	return out, nil
}

func normalizePaymentMethod(value billingdomain.PaymentMethod) billingdomain.PaymentMethod {
	switch value {
	case billingdomain.PaymentCash, billingdomain.PaymentBankTransfer, billingdomain.PaymentCard:
		return value
	default:
		return billingdomain.PaymentOther
	}
}

func effectiveInstallmentStatus(item billingdomain.PaymentInstallment, now time.Time) billingdomain.InstallmentStatus {
	if item.Status == billingdomain.InstallmentCancelled || item.Status == billingdomain.InstallmentPaid {
		return item.Status
	}
	due, err := time.Parse("2006-01-02", item.DueDate)
	if err == nil && due.Before(time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())) && item.RemainingAmount > 0 {
		return billingdomain.InstallmentOverdue
	}
	return item.Status
}

func isBillingNotFoundError(err error) bool {
	if errors.Is(err, sql.ErrNoRows) {
		return true
	}
	text := strings.ToLower(err.Error())
	return strings.Contains(text, "not found") || strings.Contains(text, "no rows")
}

func roundMoney(value float64) float64 {
	return math.Round(value*100) / 100
}
