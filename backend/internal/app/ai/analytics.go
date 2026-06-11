package ai

import (
	"context"
	"strconv"
	"time"

	aidomain "ots/backend/internal/domain/ai"
)

func (s *Service) PlatformAnalytics(ctx context.Context, days int) (aidomain.PlatformAnalytics, error) {
	if days <= 0 {
		days = 30
	}
	if days > 365 {
		days = 365
	}
	since := s.clock().AddDate(0, 0, -days+1).Truncate(24 * time.Hour)
	costSettings, err := s.repo.GetAICostSettings(ctx)
	if err != nil {
		return aidomain.PlatformAnalytics{}, err
	}
	raw, err := s.repo.GetAIPlatformAnalytics(ctx, since)
	if err != nil {
		return aidomain.PlatformAnalytics{}, err
	}
	raw.PeriodDays = days
	raw.UpdatedAt = s.clock()
	raw.CostSettings = costSettings
	raw.EstCostUSD = estimateCostUSD(raw.TokenInput, raw.TokenOutput, costSettings)
	raw.EstCostTRY = raw.EstCostUSD * costSettings.UsdTryRate
	provider, err := s.ProviderStatus(ctx)
	if err != nil {
		return aidomain.PlatformAnalytics{}, err
	}
	raw.Provider = provider
	for i := range raw.ByTenant {
		raw.ByTenant[i].EstCostUSD = estimateCostUSD(raw.ByTenant[i].TokenInput, raw.ByTenant[i].TokenOutput, costSettings)
		raw.ByTenant[i].EstCostTRY = raw.ByTenant[i].EstCostUSD * costSettings.UsdTryRate
	}
	return raw, nil
}

func (s *Service) UpdateCostSettings(ctx context.Context, input aidomain.CostSettings) (aidomain.CostSettings, error) {
	if input.InputCostPer1MUSD < 0 || input.OutputCostPer1MUSD < 0 || input.UsdTryRate <= 0 {
		return aidomain.CostSettings{}, ErrInvalidCostSettings
	}
	return s.repo.UpdateAICostSettings(ctx, input)
}

func estimateCostUSD(tokenInput, tokenOutput int, settings aidomain.CostSettings) float64 {
	in := float64(tokenInput) / 1_000_000 * settings.InputCostPer1MUSD
	out := float64(tokenOutput) / 1_000_000 * settings.OutputCostPer1MUSD
	return roundMoney(in + out)
}

func roundMoney(value float64) float64 {
	rounded, _ := strconv.ParseFloat(strconv.FormatFloat(value, 'f', 4, 64), 64)
	return rounded
}
