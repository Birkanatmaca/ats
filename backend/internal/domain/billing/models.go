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
