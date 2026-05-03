package scheduling

import (
	"context"
	"time"

	domain "ots/backend/internal/domain/scheduling"
)

type Repository interface {
	CurrentSchedule(ctx context.Context, tenantID string) (domain.Schedule, bool)
	GenerateDraftSchedule(ctx context.Context, tenantID string) domain.GenerationResult
	TeacherCalendar(ctx context.Context, tenantID string, teacherID string) []domain.Lesson
	ActiveLessonForTeacher(ctx context.Context, tenantID string, teacherID string, now time.Time) (domain.Lesson, bool)
}

type Service struct {
	repo Repository
}

func NewService(repo Repository) *Service {
	return &Service{repo: repo}
}

func (s *Service) CurrentSchedule(ctx context.Context, tenantID string) (domain.Schedule, bool) {
	return s.repo.CurrentSchedule(ctx, tenantID)
}

func (s *Service) GenerateDraft(ctx context.Context, tenantID string) domain.GenerationResult {
	return s.repo.GenerateDraftSchedule(ctx, tenantID)
}

func (s *Service) TeacherCalendar(ctx context.Context, tenantID string, teacherID string) []domain.Lesson {
	return s.repo.TeacherCalendar(ctx, tenantID, teacherID)
}

func (s *Service) ActiveLessonForTeacher(ctx context.Context, tenantID string, teacherID string, now time.Time) (domain.Lesson, bool) {
	return s.repo.ActiveLessonForTeacher(ctx, tenantID, teacherID, now)
}
