package ai

import "time"

type CostSettings struct {
	InputCostPer1MUSD  float64 `json:"inputCostPer1mUsd"`
	OutputCostPer1MUSD float64 `json:"outputCostPer1mUsd"`
	UsdTryRate         float64 `json:"usdTryRate"`
}

type UsagePoint struct {
	Label       string `json:"label"`
	UserMessages int   `json:"userMessages"`
	TokenInput  int    `json:"tokenInput"`
	TokenOutput int    `json:"tokenOutput"`
}

type TenantUsageRow struct {
	TenantID     string  `json:"tenantId"`
	TenantName   string  `json:"tenantName"`
	UserMessages int     `json:"userMessages"`
	TokenInput   int     `json:"tokenInput"`
	TokenOutput  int     `json:"tokenOutput"`
	EstCostUSD   float64 `json:"estCostUsd"`
	EstCostTRY   float64 `json:"estCostTry"`
}

type ModelUsageRow struct {
	Model       string `json:"model"`
	Messages    int    `json:"messages"`
	TokenInput  int    `json:"tokenInput"`
	TokenOutput int    `json:"tokenOutput"`
}

type PlatformAnalytics struct {
	PeriodDays       int              `json:"periodDays"`
	UpdatedAt        time.Time        `json:"updatedAt"`
	TotalConversations int            `json:"totalConversations"`
	TotalUserMessages  int            `json:"totalUserMessages"`
	TotalAssistantMessages int        `json:"totalAssistantMessages"`
	ActiveUsers        int            `json:"activeUsers"`
	TokenInput         int            `json:"tokenInput"`
	TokenOutput        int            `json:"tokenOutput"`
	EstCostUSD         float64          `json:"estCostUsd"`
	EstCostTRY         float64          `json:"estCostTry"`
	CostSettings       CostSettings     `json:"costSettings"`
	DailyUsage         []UsagePoint     `json:"dailyUsage"`
	ByTenant           []TenantUsageRow `json:"byTenant"`
	ByModel            []ModelUsageRow  `json:"byModel"`
}
