package dashboard

import (
	"context"
	"time"

	domain "ots/backend/internal/domain/dashboard"
)

type Repository interface {
	PrincipalSummary(ctx context.Context, tenantID string) domain.PrincipalSummary
	PrincipalReportOverview(ctx context.Context, tenantID string, from time.Time, to time.Time) domain.PrincipalReportOverview
	ClassSummary(ctx context.Context, tenantID string, classID string, date time.Time) (domain.ClassSummary, bool)
	TeacherOverview(ctx context.Context, tenantID string, teacherID string, from time.Time, to time.Time) (domain.TeacherOverview, bool)
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

func (s *Service) PrincipalReportOverview(ctx context.Context, tenantID string, from time.Time, to time.Time) domain.PrincipalReportOverview {
	return s.repo.PrincipalReportOverview(ctx, tenantID, from, to)
}

func (s *Service) ClassSummary(ctx context.Context, tenantID string, classID string, date time.Time) (domain.ClassSummary, bool) {
	return s.repo.ClassSummary(ctx, tenantID, classID, date)
}

func (s *Service) TeacherOverview(ctx context.Context, tenantID string, teacherID string, from time.Time, to time.Time) (domain.TeacherOverview, bool) {
	return s.repo.TeacherOverview(ctx, tenantID, teacherID, from, to)
}
