package postgres

import (
	"context"
	"strconv"
	"strings"

	billingdomain "ots/backend/internal/domain/billing"
)

func (s *Store) GetBillingSettings(ctx context.Context) (billingdomain.Settings, error) {
	rows, err := s.db.QueryContext(ctx, `
SELECT key, value FROM platform_settings
WHERE key IN (
  'billing_price_per_student_usd',
  'billing_usd_try_rate',
  'billing_quote_validity_days',
  'billing_company_name',
  'billing_company_email'
)`)
	if err != nil {
		return billingdomain.Settings{}, err
	}
	defer rows.Close()

	settings := billingdomain.Settings{
		UsdTryRate:        34.50,
		QuoteValidityDays: 30,
		CompanyName:       "OGTA Platform",
		CompanyEmail:      "billing@ogta.ai",
	}
	for rows.Next() {
		var key, value string
		if err := rows.Scan(&key, &value); err != nil {
			return billingdomain.Settings{}, err
		}
		switch key {
		case "billing_usd_try_rate":
			settings.UsdTryRate = parseBillingFloat(value, settings.UsdTryRate)
		case "billing_quote_validity_days":
			settings.QuoteValidityDays = parseBillingInt(value, settings.QuoteValidityDays)
		case "billing_company_name":
			if strings.TrimSpace(value) != "" {
				settings.CompanyName = strings.TrimSpace(value)
			}
		case "billing_company_email":
			if strings.TrimSpace(value) != "" {
				settings.CompanyEmail = strings.TrimSpace(value)
			}
		}
	}
	return settings, rows.Err()
}

func (s *Store) UpdateBillingSettings(ctx context.Context, input billingdomain.Settings) (billingdomain.Settings, error) {
	updates := map[string]string{
		"billing_usd_try_rate":        formatBillingFloat(input.UsdTryRate),
		"billing_quote_validity_days": strconv.Itoa(input.QuoteValidityDays),
		"billing_company_name":        input.CompanyName,
		"billing_company_email":       input.CompanyEmail,
	}
	for key, value := range updates {
		if _, err := s.db.ExecContext(ctx, `
INSERT INTO platform_settings (key, value, is_secret, updated_at)
VALUES ($1, $2, false, now())
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`, key, value); err != nil {
			return billingdomain.Settings{}, err
		}
	}
	return s.GetBillingSettings(ctx)
}

func parseBillingFloat(raw string, fallback float64) float64 {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return fallback
	}
	value, err := strconv.ParseFloat(raw, 64)
	if err != nil || value < 0 {
		return fallback
	}
	return value
}

func parseBillingInt(raw string, fallback int) int {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return fallback
	}
	value, err := strconv.Atoi(raw)
	if err != nil || value <= 0 {
		return fallback
	}
	return value
}

func formatBillingFloat(value float64) string {
	return strconv.FormatFloat(value, 'f', -1, 64)
}
