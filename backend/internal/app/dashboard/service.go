package dashboard

import (
	"context"
	"time"

	domain "ots/backend/internal/domain/dashboard"
)

type Repository interface {
	PrincipalSummary(ctx context.Context, tenantID string) domain.PrincipalSummary
	ClassSummary(ctx context.Context, tenantID string, classID string, date time.Time) (domain.ClassSummary, bool)
}

type Service struct {
	repo Repository
}

func NewService(repo Repository) *Service {
	return &Service{repo: repo}
}

func (s *Service) PrincipalSummary(ctx context.Context, tenantID string) domain.PrincipalSummary {
	return s.repo.PrincipalSummary(ctx, tenantID)
}

func (s *Service) ClassSummary(ctx context.Context, tenantID string, classID string, date time.Time) (domain.ClassSummary, bool) {
	return s.repo.ClassSummary(ctx, tenantID, classID, date)
}
