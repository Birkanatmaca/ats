package scheduling

import (
	"context"
	"time"

	domain "ots/backend/internal/domain/scheduling"
)

type Repository interface {
	ListRequirements(ctx context.Context, tenantID string) []domain.ClassSubjectRequirement
	SaveRequirements(ctx context.Context, tenantID string, items []domain.RequirementInput) ([]domain.ClassSubjectRequirement, error)
	ListTeacherAvailabilities(ctx context.Context, tenantID string) []domain.TeacherAvailability
	SaveTeacherAvailabilities(ctx context.Context, tenantID string, items []domain.AvailabilityInput) ([]domain.TeacherAvailability, error)
	CurrentSchedule(ctx context.Context, tenantID string) (domain.Schedule, bool)
	GetSchedule(ctx context.Context, tenantID string, scheduleID string) (domain.Schedule, bool)
	GenerateDraftSchedule(ctx context.Context, tenantID string) domain.GenerationResult
	UpdateScheduleLesson(ctx context.Context, tenantID string, scheduleID string, lessonID string, actorUserID string, input domain.UpdateLessonInput) (domain.Lesson, bool, error)
	ValidateSchedule(ctx context.Context, tenantID string, scheduleID string) domain.ValidationResult
	ScheduleConflicts(ctx context.Context, tenantID, scheduleID string) domain.ConflictsResult
	CloneSchedule(ctx context.Context, tenantID, scheduleID, actorUserID string) (domain.Schedule, bool, error)
	ListScheduleChangeLogs(ctx context.Context, tenantID, scheduleID string, limit int) []domain.ScheduleChangeLog
	SaveTeacherAvailabilitiesBulk(ctx context.Context, tenantID string, items []domain.AvailabilityInput) ([]domain.TeacherAvailability, error)
	PublishSchedule(ctx context.Context, tenantID string, scheduleID string, actorUserID string) (domain.Schedule, bool, error)
	TeacherCalendar(ctx context.Context, tenantID string, teacherID string) []domain.Lesson
	ActiveLessonForTeacher(ctx context.Context, tenantID string, teacherID string, now time.Time) (domain.Lesson, bool)
}

type Service struct {
	repo Repository
}

func NewService(repo Repository) *Service {
	return &Service{repo: repo}
}

func (s *Service) ListRequirements(ctx context.Context, tenantID string) []domain.ClassSubjectRequirement {
	return s.repo.ListRequirements(ctx, tenantID)
}

func (s *Service) SaveRequirements(ctx context.Context, tenantID string, items []domain.RequirementInput) ([]domain.ClassSubjectRequirement, error) {
	return s.repo.SaveRequirements(ctx, tenantID, items)
}

func (s *Service) ListTeacherAvailabilities(ctx context.Context, tenantID string) []domain.TeacherAvailability {
	return s.repo.ListTeacherAvailabilities(ctx, tenantID)
}

func (s *Service) SaveTeacherAvailabilities(ctx context.Context, tenantID string, items []domain.AvailabilityInput) ([]domain.TeacherAvailability, error) {
	return s.repo.SaveTeacherAvailabilities(ctx, tenantID, items)
}

func (s *Service) CurrentSchedule(ctx context.Context, tenantID string) (domain.Schedule, bool) {
	return s.repo.CurrentSchedule(ctx, tenantID)
}

func (s *Service) GetSchedule(ctx context.Context, tenantID string, scheduleID string) (domain.Schedule, bool) {
	return s.repo.GetSchedule(ctx, tenantID, scheduleID)
}

func (s *Service) GenerateDraft(ctx context.Context, tenantID string) domain.GenerationResult {
	return s.repo.GenerateDraftSchedule(ctx, tenantID)
}

func (s *Service) UpdateLesson(ctx context.Context, tenantID string, scheduleID string, lessonID string, actorUserID string, input domain.UpdateLessonInput) (domain.Lesson, bool, error) {
	return s.repo.UpdateScheduleLesson(ctx, tenantID, scheduleID, lessonID, actorUserID, input)
}

func (s *Service) ValidateSchedule(ctx context.Context, tenantID string, scheduleID string) domain.ValidationResult {
	return s.repo.ValidateSchedule(ctx, tenantID, scheduleID)
}

func (s *Service) ScheduleConflicts(ctx context.Context, tenantID, scheduleID string) domain.ConflictsResult {
	return s.repo.ScheduleConflicts(ctx, tenantID, scheduleID)
}

func (s *Service) CloneSchedule(ctx context.Context, tenantID, scheduleID, actorUserID string) (domain.Schedule, bool, error) {
	return s.repo.CloneSchedule(ctx, tenantID, scheduleID, actorUserID)
}

func (s *Service) ListScheduleChangeLogs(ctx context.Context, tenantID, scheduleID string, limit int) []domain.ScheduleChangeLog {
	return s.repo.ListScheduleChangeLogs(ctx, tenantID, scheduleID, limit)
}

func (s *Service) SaveTeacherAvailabilitiesBulk(ctx context.Context, tenantID string, items []domain.AvailabilityInput) ([]domain.TeacherAvailability, error) {
	return s.repo.SaveTeacherAvailabilitiesBulk(ctx, tenantID, items)
}

func (s *Service) PublishSchedule(ctx context.Context, tenantID string, scheduleID string, actorUserID string) (domain.Schedule, bool, error) {
	return s.repo.PublishSchedule(ctx, tenantID, scheduleID, actorUserID)
}

func (s *Service) TeacherCalendar(ctx context.Context, tenantID string, teacherID string) []domain.Lesson {
	return s.repo.TeacherCalendar(ctx, tenantID, teacherID)
}

func (s *Service) ActiveLessonForTeacher(ctx context.Context, tenantID string, teacherID string, now time.Time) (domain.Lesson, bool) {
	return s.repo.ActiveLessonForTeacher(ctx, tenantID, teacherID, now)
}

func (s *Service) TeacherLessonByID(ctx context.Context, tenantID string, teacherUserID string, lessonID string) (domain.Lesson, bool) {
	for _, lesson := range s.repo.TeacherCalendar(ctx, tenantID, teacherUserID) {
		if lesson.ID == lessonID {
			return lesson, true
		}
	}
	return domain.Lesson{}, false
}
