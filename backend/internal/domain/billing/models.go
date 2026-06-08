package billing

import "time"

type Settings struct {
	UsdTryRate        float64 `json:"usdTryRate"`
	QuoteValidityDays int     `json:"quoteValidityDays"`
	CompanyName       string  `json:"companyName"`
	CompanyEmail      string  `json:"companyEmail"`
}

type InstitutionLicenseRow struct {
	TenantID        string  `json:"tenantId"`
	InstitutionName string  `json:"institutionName"`
	Plan            string  `json:"plan"`
	Status          string  `json:"status"`
	StudentCount    int     `json:"studentCount"`
	AnnualUSD       float64 `json:"annualUsd"`
	AnnualTRY       float64 `json:"annualTry"`
	PackageID       string  `json:"packageId"`
}

type Overview struct {
	Settings          Settings                `json:"settings"`
	Packages          []LicensePackage        `json:"packages"`
	TotalInstitutions int                     `json:"totalInstitutions"`
	TotalStudents     int                     `json:"totalStudents"`
	TotalAnnualUSD    float64                 `json:"totalAnnualUsd"`
	TotalAnnualTRY    float64                 `json:"totalAnnualTry"`
	Institutions      []InstitutionLicenseRow `json:"institutions"`
	UpdatedAt         time.Time               `json:"updatedAt"`
}

type QuoteLineItem struct {
	Label     string  `json:"label"`
	Quantity  int     `json:"quantity"`
	UnitPrice float64 `json:"unitPrice"`
	UnitLabel string  `json:"unitLabel"`
	AmountUSD float64 `json:"amountUsd"`
}

type QuotePreviewInput struct {
	TenantID           string   `json:"tenantId"`
	InstitutionName    string   `json:"institutionName"`
	ContactName        string   `json:"contactName"`
	ContactEmail       string   `json:"contactEmail"`
	PackageID          string   `json:"packageId"`
	StudentCount       int      `json:"studentCount"`
	TermYears          int      `json:"termYears"`
	DiscountPercent    float64  `json:"discountPercent"`
	UsdTryRate         float64  `json:"usdTryRate"`
	PricePerStudentUSD *float64 `json:"pricePerStudentUsd,omitempty"`
	MinOrderUSD        *float64 `json:"minOrderUsd,omitempty"`
	Notes              string   `json:"notes"`
}

type QuotePreview struct {
	QuoteNumber            string          `json:"quoteNumber"`
	IssuedAt               time.Time       `json:"issuedAt"`
	ValidUntil             time.Time       `json:"validUntil"`
	TenantID               string          `json:"tenantId"`
	InstitutionName        string          `json:"institutionName"`
	ContactName            string          `json:"contactName"`
	ContactEmail           string          `json:"contactEmail"`
	PackageID              string          `json:"packageId"`
	PackageName            string          `json:"packageName"`
	PackageFeatures        []string        `json:"packageFeatures"`
	StudentCount           int             `json:"studentCount"`
	TermYears              int             `json:"termYears"`
	PricePerStudent        float64         `json:"pricePerStudentUsd"`
	MinOrderUSD            float64         `json:"minOrderUsd"`
	DefaultPricePerStudent float64         `json:"defaultPricePerStudentUsd"`
	DefaultMinOrderUSD     float64         `json:"defaultMinOrderUsd"`
	PricingCustomized      bool            `json:"pricingCustomized"`
	MinimumApplied         bool            `json:"minimumApplied"`
	CalculatedUSD          float64         `json:"calculatedUsd"`
	DiscountPercent        float64         `json:"discountPercent"`
	SubtotalUSD            float64         `json:"subtotalUsd"`
	DiscountUSD            float64         `json:"discountUsd"`
	TotalUSD               float64         `json:"totalUsd"`
	TotalTRY               float64         `json:"totalTry"`
	UsdTryRate             float64         `json:"usdTryRate"`
	LineItems              []QuoteLineItem `json:"lineItems"`
	Notes                  string          `json:"notes"`
	CompanyName            string          `json:"companyName"`
	CompanyEmail           string          `json:"companyEmail"`
}

type BillingAccountStatus string

const (
	BillingAccountActive BillingAccountStatus = "active"
	BillingAccountPaused BillingAccountStatus = "paused"
	BillingAccountClosed BillingAccountStatus = "closed"
)

type PaymentPlanStatus string

const (
	PaymentPlanActive    PaymentPlanStatus = "active"
	PaymentPlanCompleted PaymentPlanStatus = "completed"
	PaymentPlanCancelled PaymentPlanStatus = "cancelled"
)

type InstallmentStatus string

const (
	InstallmentPending   InstallmentStatus = "pending"
	InstallmentPartial   InstallmentStatus = "partial"
	InstallmentPaid      InstallmentStatus = "paid"
	InstallmentOverdue   InstallmentStatus = "overdue"
	InstallmentCancelled InstallmentStatus = "cancelled"
)

type PaymentMethod string

const (
	PaymentCash         PaymentMethod = "cash"
	PaymentBankTransfer PaymentMethod = "bank_transfer"
	PaymentCard         PaymentMethod = "card"
	PaymentOther        PaymentMethod = "other"
)

type BillingAccount struct {
	ID             string               `json:"id"`
	TenantID       string               `json:"tenantId"`
	StudentID      string               `json:"studentId"`
	StudentName    string               `json:"studentName"`
	SchoolNumber   string               `json:"schoolNumber"`
	ClassID        string               `json:"classId,omitempty"`
	ClassName      string               `json:"className,omitempty"`
	GuardianUserID string               `json:"guardianUserId,omitempty"`
	Status         BillingAccountStatus `json:"status"`
	CreatedAt      time.Time            `json:"createdAt"`
	Plans          []PaymentPlan        `json:"plans"`
}

type PaymentPlan struct {
	ID               string               `json:"id"`
	TenantID         string               `json:"tenantId"`
	BillingAccountID string               `json:"billingAccountId"`
	Name             string               `json:"name"`
	TotalAmount      float64              `json:"totalAmount"`
	Currency         string               `json:"currency"`
	StartDate        string               `json:"startDate"`
	Status           PaymentPlanStatus    `json:"status"`
	CreatedAt        time.Time            `json:"createdAt"`
	UpdatedAt        time.Time            `json:"updatedAt"`
	Installments     []PaymentInstallment `json:"installments"`
}

type PaymentInstallment struct {
	ID               string            `json:"id"`
	TenantID         string            `json:"tenantId"`
	PaymentPlanID    string            `json:"paymentPlanId"`
	BillingAccountID string            `json:"billingAccountId"`
	StudentID        string            `json:"studentId,omitempty"`
	StudentName      string            `json:"studentName,omitempty"`
	ClassID          string            `json:"classId,omitempty"`
	ClassName        string            `json:"className,omitempty"`
	PlanName         string            `json:"planName,omitempty"`
	DueDate          string            `json:"dueDate"`
	Amount           float64           `json:"amount"`
	PaidAmount       float64           `json:"paidAmount"`
	RemainingAmount  float64           `json:"remainingAmount"`
	Status           InstallmentStatus `json:"status"`
	Payments         []Payment         `json:"payments,omitempty"`
}

type Payment struct {
	ID            string        `json:"id"`
	TenantID      string        `json:"tenantId"`
	InstallmentID string        `json:"installmentId"`
	Amount        float64       `json:"amount"`
	Method        PaymentMethod `json:"method"`
	PaidAt        time.Time     `json:"paidAt"`
	RecordedBy    string        `json:"recordedBy,omitempty"`
	Note          string        `json:"note,omitempty"`
	Void          bool          `json:"void"`
	VoidedAt      *time.Time    `json:"voidedAt,omitempty"`
	CreatedAt     time.Time     `json:"createdAt"`
	UpdatedAt     time.Time     `json:"updatedAt"`
}

type CreatePaymentPlanInput struct {
	Name             string             `json:"name"`
	TotalAmount      float64            `json:"totalAmount"`
	Currency         string             `json:"currency"`
	StartDate        string             `json:"startDate"`
	InstallmentCount int                `json:"installmentCount"`
	Installments     []InstallmentInput `json:"installments,omitempty"`
}

type InstallmentInput struct {
	DueDate string  `json:"dueDate"`
	Amount  float64 `json:"amount"`
}

type UpdatePaymentPlanInput struct {
	Name   *string            `json:"name,omitempty"`
	Status *PaymentPlanStatus `json:"status,omitempty"`
}

type InstallmentFilter struct {
	StudentID string `json:"studentId,omitempty"`
	ClassID   string `json:"classId,omitempty"`
	Status    string `json:"status,omitempty"`
}

type CreatePaymentInput struct {
	Amount float64       `json:"amount"`
	Method PaymentMethod `json:"method"`
	PaidAt *time.Time    `json:"paidAt,omitempty"`
	Note   string        `json:"note,omitempty"`
}

type UpdatePaymentInput struct {
	Amount *float64       `json:"amount,omitempty"`
	Method *PaymentMethod `json:"method,omitempty"`
	PaidAt *time.Time     `json:"paidAt,omitempty"`
	Note   *string        `json:"note,omitempty"`
}

type BillingDashboard struct {
	TotalReceivable     float64              `json:"totalReceivable"`
	CollectedAmount     float64              `json:"collectedAmount"`
	OutstandingAmount   float64              `json:"outstandingAmount"`
	OverdueAmount       float64              `json:"overdueAmount"`
	OverdueCount        int                  `json:"overdueCount"`
	ActivePlanCount     int                  `json:"activePlanCount"`
	OverdueInstallments []PaymentInstallment `json:"overdueInstallments"`
	UpdatedAt           time.Time            `json:"updatedAt"`
}

type GuardianBillingSummary struct {
	Account              BillingAccount       `json:"account"`
	UpcomingInstallments []PaymentInstallment `json:"upcomingInstallments"`
	OverdueInstallments  []PaymentInstallment `json:"overdueInstallments"`
	PaymentHistory       []Payment            `json:"paymentHistory"`
	OutstandingAmount    float64              `json:"outstandingAmount"`
	OverdueAmount        float64              `json:"overdueAmount"`
}
