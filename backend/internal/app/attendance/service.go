package attendance

import (
	"context"
	"errors"
	"time"

	domain "ots/backend/internal/domain/attendance"
)

var ErrSessionNotFound = errors.New("attendance session not found")
var ErrSessionFinalized = errors.New("attendance session finalized")
var ErrStudentNotFound = errors.New("student not found")
var ErrAttendanceWindowClosed = errors.New("attendance window closed")

type Repository interface {
	GetAttendanceSession(ctx context.Context, tenantID string, sessionID string) (domain.Session, bool)
	GetAttendanceSessionByLesson(ctx context.Context, tenantID string, lessonID string) (domain.Session, bool)
	GetOrCreateAttendanceSession(ctx context.Context, tenantID string, lessonID string, takenByUserID string) (domain.Session, bool)
	UpdateAttendanceRecords(ctx context.Context, tenantID string, sessionID string, actorUserID string, updates []domain.RecordUpdate) (domain.Session, bool)
	FinalizeAttendanceSession(ctx context.Context, tenantID string, sessionID string, finalizedAt time.Time, actorUserID string) (domain.Session, bool)
	ReopenAttendanceSession(ctx context.Context, tenantID string, sessionID string, actorUserID string) (domain.Session, bool)
	StudentAttendanceSummary(ctx context.Context, tenantID string, studentID string) (domain.StudentSummary, bool)
	AttendanceDayReport(ctx context.Context, tenantID string, date time.Time) domain.DayReport
}

type Service struct {
	repo Repository
}

func NewService(repo Repository) *Service {
	return &Service{repo: repo}
}

func (s *Service) GetSession(ctx context.Context, tenantID string, sessionID string) (domain.Session, error) {
	session, ok := s.repo.GetAttendanceSession(ctx, tenantID, sessionID)
	if !ok {
		return domain.Session{}, ErrSessionNotFound
	}
	return session, nil
}

func (s *Service) GetSessionByLesson(ctx context.Context, tenantID string, lessonID string) (domain.Session, error) {
	session, ok := s.repo.GetAttendanceSessionByLesson(ctx, tenantID, lessonID)
	if !ok {
		return domain.Session{}, ErrSessionNotFound
	}
	return session, nil
}

func (s *Service) GetOrCreateSession(ctx context.Context, tenantID string, lessonID string, takenByUserID string) (domain.Session, bool) {
	return s.repo.GetOrCreateAttendanceSession(ctx, tenantID, lessonID, takenByUserID)
}

func (s *Service) DayReport(ctx context.Context, tenantID string, date time.Time) domain.DayReport {
	return s.repo.AttendanceDayReport(ctx, tenantID, date)
}

func (s *Service) UpdateRecords(ctx context.Context, tenantID string, sessionID string, principalUserID string, updates []domain.RecordUpdate) (domain.Session, error) {
	session, ok := s.repo.GetAttendanceSession(ctx, tenantID, sessionID)
	if !ok {
		return domain.Session{}, ErrSessionNotFound
	}
	if session.FinalizedAt != nil {
		return domain.Session{}, ErrSessionFinalized
	}
	session, ok = s.repo.UpdateAttendanceRecords(ctx, tenantID, sessionID, principalUserID, updates)
	if !ok {
		return domain.Session{}, ErrSessionNotFound
	}
	return session, nil
}

func (s *Service) ReopenSession(ctx context.Context, tenantID string, sessionID string, actorUserID string) (domain.Session, error) {
	session, ok := s.repo.ReopenAttendanceSession(ctx, tenantID, sessionID, actorUserID)
	if !ok {
		return domain.Session{}, ErrSessionNotFound
	}
	return session, nil
}

func (s *Service) FinalizeSession(ctx context.Context, tenantID string, sessionID string, finalizedAt time.Time, actorUserID string) (domain.Session, error) {
	session, ok := s.repo.FinalizeAttendanceSession(ctx, tenantID, sessionID, finalizedAt, actorUserID)
	if !ok {
		return domain.Session{}, ErrSessionNotFound
	}
	return session, nil
}

func (s *Service) StudentSummary(ctx context.Context, tenantID string, studentID string) (domain.StudentSummary, error) {
	summary, ok := s.repo.StudentAttendanceSummary(ctx, tenantID, studentID)
	if !ok {
		return domain.StudentSummary{}, ErrStudentNotFound
	}
	return summary, nil
}
