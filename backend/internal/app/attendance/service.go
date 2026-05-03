package attendance

import (
	"context"
	"errors"

	domain "ots/backend/internal/domain/attendance"
)

var ErrSessionNotFound = errors.New("attendance session not found")

type Repository interface {
	GetOrCreateAttendanceSession(ctx context.Context, tenantID string, lessonID string) (domain.Session, bool)
	UpdateAttendanceRecords(ctx context.Context, tenantID string, sessionID string, updates []domain.RecordUpdate) (domain.Session, bool)
}

type Service struct {
	repo Repository
}

func NewService(repo Repository) *Service {
	return &Service{repo: repo}
}

func (s *Service) GetOrCreateSession(ctx context.Context, tenantID string, lessonID string) (domain.Session, bool) {
	return s.repo.GetOrCreateAttendanceSession(ctx, tenantID, lessonID)
}

func (s *Service) UpdateRecords(ctx context.Context, tenantID string, sessionID string, updates []domain.RecordUpdate) (domain.Session, error) {
	session, ok := s.repo.UpdateAttendanceRecords(ctx, tenantID, sessionID, updates)
	if !ok {
		return domain.Session{}, ErrSessionNotFound
	}
	return session, nil
}
