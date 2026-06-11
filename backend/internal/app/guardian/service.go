package guardian

import (
	"context"
	"errors"
	"strings"

	domain "ots/backend/internal/domain/guardian"
	schooldomain "ots/backend/internal/domain/school"
)

var (
	ErrForbidden             = errors.New("guardian student access denied")
	ErrNotificationNotFound  = errors.New("notification not found")
)

type Repository interface {
	GuardianHasStudent(ctx context.Context, tenantID string, guardianUserID string, studentID string) bool
	ListGuardianStudents(ctx context.Context, tenantID string, guardianUserID string) []domain.Student
	StudentScheduleForGuardian(ctx context.Context, tenantID string, guardianUserID string, studentID string) (domain.StudentSchedule, bool)
	StudentAttendanceForGuardian(ctx context.Context, tenantID string, guardianUserID string, studentID string) (domain.StudentAttendance, bool)
	ListGuardianAnnouncements(ctx context.Context, tenantID string) []schooldomain.Announcement
	ListGuardianNotifications(ctx context.Context, tenantID string, userID string) []domain.Notification
	MarkGuardianNotificationRead(ctx context.Context, tenantID string, userID string, notificationID string) (domain.Notification, bool)
	DeleteGuardianNotification(ctx context.Context, tenantID string, userID string, notificationID string) bool
	ListGuardianGuidanceUpdates(ctx context.Context, tenantID string, guardianUserID string, studentID string) []domain.GuidanceUpdate
}

type Service struct {
	repo Repository
}

func NewService(repo Repository) *Service {
	return &Service{repo: repo}
}

func (s *Service) ListStudents(ctx context.Context, tenantID string, guardianUserID string) []domain.Student {
	return s.repo.ListGuardianStudents(ctx, tenantID, guardianUserID)
}

func (s *Service) HasStudent(ctx context.Context, tenantID string, guardianUserID string, studentID string) bool {
	studentID = strings.TrimSpace(studentID)
	if studentID == "" {
		return false
	}
	return s.repo.GuardianHasStudent(ctx, tenantID, guardianUserID, studentID)
}

func (s *Service) StudentSchedule(ctx context.Context, tenantID string, guardianUserID string, studentID string) (domain.StudentSchedule, error) {
	studentID = strings.TrimSpace(studentID)
	if studentID == "" || !s.repo.GuardianHasStudent(ctx, tenantID, guardianUserID, studentID) {
		return domain.StudentSchedule{}, ErrForbidden
	}
	schedule, ok := s.repo.StudentScheduleForGuardian(ctx, tenantID, guardianUserID, studentID)
	if !ok {
		return domain.StudentSchedule{}, ErrForbidden
	}
	return schedule, nil
}

func (s *Service) StudentAttendance(ctx context.Context, tenantID string, guardianUserID string, studentID string) (domain.StudentAttendance, error) {
	studentID = strings.TrimSpace(studentID)
	if studentID == "" || !s.repo.GuardianHasStudent(ctx, tenantID, guardianUserID, studentID) {
		return domain.StudentAttendance{}, ErrForbidden
	}
	attendance, ok := s.repo.StudentAttendanceForGuardian(ctx, tenantID, guardianUserID, studentID)
	if !ok {
		return domain.StudentAttendance{}, ErrForbidden
	}
	return attendance, nil
}

func (s *Service) StudentGuidanceUpdates(ctx context.Context, tenantID string, guardianUserID string, studentID string) ([]domain.GuidanceUpdate, error) {
	studentID = strings.TrimSpace(studentID)
	if studentID == "" || !s.repo.GuardianHasStudent(ctx, tenantID, guardianUserID, studentID) {
		return nil, ErrForbidden
	}
	return s.repo.ListGuardianGuidanceUpdates(ctx, tenantID, guardianUserID, studentID), nil
}

func (s *Service) ListAnnouncements(ctx context.Context, tenantID string) []schooldomain.Announcement {
	return s.repo.ListGuardianAnnouncements(ctx, tenantID)
}

func (s *Service) ListNotifications(ctx context.Context, tenantID string, userID string) []domain.Notification {
	return s.repo.ListGuardianNotifications(ctx, tenantID, userID)
}

func (s *Service) MarkNotificationRead(ctx context.Context, tenantID string, userID string, notificationID string) (domain.Notification, error) {
	notificationID = strings.TrimSpace(notificationID)
	if notificationID == "" {
		return domain.Notification{}, ErrNotificationNotFound
	}
	notification, ok := s.repo.MarkGuardianNotificationRead(ctx, tenantID, userID, notificationID)
	if !ok {
		return domain.Notification{}, ErrNotificationNotFound
	}
	return notification, nil
}

func (s *Service) DeleteNotification(ctx context.Context, tenantID string, userID string, notificationID string) error {
	notificationID = strings.TrimSpace(notificationID)
	if notificationID == "" {
		return ErrNotificationNotFound
	}
	if !s.repo.DeleteGuardianNotification(ctx, tenantID, userID, notificationID) {
		return ErrNotificationNotFound
	}
	return nil
}
