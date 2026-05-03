package school

import (
	"context"

	domain "ots/backend/internal/domain/school"
)

type Repository interface {
	CurrentTenant(ctx context.Context, tenantID string) (domain.Tenant, bool)
	ListAnnouncements(ctx context.Context, tenantID string) []domain.Announcement
}

type Service struct {
	repo Repository
}

func NewService(repo Repository) *Service {
	return &Service{repo: repo}
}

func (s *Service) CurrentTenant(ctx context.Context, tenantID string) (domain.Tenant, bool) {
	return s.repo.CurrentTenant(ctx, tenantID)
}

func (s *Service) ListAnnouncements(ctx context.Context, tenantID string) []domain.Announcement {
	return s.repo.ListAnnouncements(ctx, tenantID)
}
