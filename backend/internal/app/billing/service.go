package billing

import (
	"context"
	"errors"
	"fmt"
	"math"
	"strings"
	"time"

	billingdomain "ots/backend/internal/domain/billing"
	superadmindomain "ots/backend/internal/domain/superadmin"
)

var ErrInvalidQuote = errors.New("invalid billing quote input")

type Repository interface {
	ListInstitutions(ctx context.Context) ([]superadmindomain.Institution, error)
	GetBillingSettings(ctx context.Context) (billingdomain.Settings, error)
	UpdateBillingSettings(ctx context.Context, input billingdomain.Settings) (billingdomain.Settings, error)
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

	corePackage, _ := billingdomain.FindPackage(billingdomain.PackageCore)
	out := billingdomain.Overview{
		Settings:     settings,
		Packages:     billingdomain.DefaultPackages(),
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
	pkg, ok := billingdomain.FindPackage(input.PackageID)
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

func roundMoney(value float64) float64 {
	return math.Round(value*100) / 100
}
