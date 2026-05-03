package dashboard

import (
	"context"

	domain "ots/backend/internal/domain/dashboard"
)

type Repository interface {
	PrincipalSummary(ctx context.Context, tenantID string) domain.PrincipalSummary
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
