package ai

import (
	"context"
	"time"

	aidomain "ots/backend/internal/domain/ai"
)

func (s *Service) UsageSummary(ctx context.Context, tenantID, userID string) (aidomain.UsageSummary, error) {
	since := s.clock().Add(-24 * time.Hour)
	startOfDay := time.Date(s.clock().Year(), s.clock().Month(), s.clock().Day(), 0, 0, 0, 0, s.clock().Location())
	last24h, err := s.repo.CountUserMessagesSince(ctx, tenantID, userID, since)
	if err != nil {
		return aidomain.UsageSummary{}, err
	}
	today, err := s.repo.CountUserMessagesSince(ctx, tenantID, userID, startOfDay)
	if err != nil {
		return aidomain.UsageSummary{}, err
	}
	limit := s.cfg.DailyMessageLimit
	remaining := limit - today
	if remaining < 0 {
		remaining = 0
	}
	return aidomain.UsageSummary{
		MessagesLast24h: last24h,
		MessagesToday:   today,
		DailyLimit:      limit,
		RemainingToday:  remaining,
	}, nil
}

func (s *Service) RunRetention(ctx context.Context, tenantID string) (aidomain.RetentionResult, error) {
	if s.cfg.RetentionDays <= 0 {
		return aidomain.RetentionResult{}, nil
	}
	cutoff := s.clock().Add(-time.Duration(s.cfg.RetentionDays) * 24 * time.Hour)
	return s.repo.PurgeExpiredAIRecords(ctx, tenantID, cutoff, s.clock())
}

func (s *Service) RunRetentionAll(ctx context.Context) (aidomain.RetentionResult, error) {
	tenantIDs, err := s.repo.ListAITenantIDs(ctx)
	if err != nil {
		return aidomain.RetentionResult{}, err
	}
	total := aidomain.RetentionResult{}
	for _, tenantID := range tenantIDs {
		result, err := s.RunRetention(ctx, tenantID)
		if err != nil {
			return total, err
		}
		total.ConversationsArchived += result.ConversationsArchived
		total.MessagesDeleted += result.MessagesDeleted
		total.PendingActionsExpired += result.PendingActionsExpired
	}
	return total, nil
}

func (s *Service) CheckDailyLimit(ctx context.Context, tenantID, userID string) error {
	if s.cfg.DailyMessageLimit <= 0 {
		return nil
	}
	startOfDay := time.Date(s.clock().Year(), s.clock().Month(), s.clock().Day(), 0, 0, 0, 0, s.clock().Location())
	count, err := s.repo.CountUserMessagesSince(ctx, tenantID, userID, startOfDay)
	if err != nil {
		return err
	}
	if count >= s.cfg.DailyMessageLimit {
		return ErrDailyLimitExceeded
	}
	return nil
}

