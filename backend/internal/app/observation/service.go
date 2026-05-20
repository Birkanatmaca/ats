package observation

import (
	"context"
	"errors"
	"strings"

	domain "ots/backend/internal/domain/observation"
)

var (
	ErrInvalidObservation = errors.New("invalid observation")
	ErrObservationNotFound = errors.New("observation not found")
)

type Repository interface {
	ListObservations(ctx context.Context, tenantID string) []domain.Observation
	GetObservation(ctx context.Context, tenantID string, observationID string) (domain.Observation, bool)
	CreateObservation(ctx context.Context, tenantID string, authorID string, input domain.CreateInput) (domain.Observation, bool)
	UpdateObservation(ctx context.Context, tenantID string, observationID string, input domain.UpdateInput) (domain.Observation, bool)
	DeleteObservation(ctx context.Context, tenantID string, observationID string) bool
}

type Service struct {
	repo Repository
}

func NewService(repo Repository) *Service {
	return &Service{repo: repo}
}

func (s *Service) List(ctx context.Context, tenantID string) []domain.Observation {
	return s.repo.ListObservations(ctx, tenantID)
}

func (s *Service) Get(ctx context.Context, tenantID string, observationID string) (domain.Observation, error) {
	observationID = strings.TrimSpace(observationID)
	if observationID == "" {
		return domain.Observation{}, ErrObservationNotFound
	}
	item, ok := s.repo.GetObservation(ctx, tenantID, observationID)
	if !ok {
		return domain.Observation{}, ErrObservationNotFound
	}
	return item, nil
}

func (s *Service) Create(ctx context.Context, tenantID string, authorID string, input domain.CreateInput) (domain.Observation, error) {
	if strings.TrimSpace(input.StudentID) == "" || strings.TrimSpace(input.Note) == "" || strings.TrimSpace(string(input.Category)) == "" {
		return domain.Observation{}, ErrInvalidObservation
	}
	created, ok := s.repo.CreateObservation(ctx, tenantID, authorID, input)
	if !ok {
		return domain.Observation{}, ErrInvalidObservation
	}
	return created, nil
}

func (s *Service) Update(ctx context.Context, tenantID string, observationID string, input domain.UpdateInput) (domain.Observation, error) {
	observationID = strings.TrimSpace(observationID)
	if observationID == "" {
		return domain.Observation{}, ErrObservationNotFound
	}
	if input.Category == nil && input.Note == nil {
		return domain.Observation{}, ErrInvalidObservation
	}
	if input.Category != nil && strings.TrimSpace(string(*input.Category)) == "" {
		return domain.Observation{}, ErrInvalidObservation
	}
	if input.Note != nil && strings.TrimSpace(*input.Note) == "" {
		return domain.Observation{}, ErrInvalidObservation
	}
	updated, ok := s.repo.UpdateObservation(ctx, tenantID, observationID, input)
	if !ok {
		return domain.Observation{}, ErrObservationNotFound
	}
	return updated, nil
}

func (s *Service) Delete(ctx context.Context, tenantID string, observationID string) error {
	observationID = strings.TrimSpace(observationID)
	if observationID == "" {
		return ErrObservationNotFound
	}
	if !s.repo.DeleteObservation(ctx, tenantID, observationID) {
		return ErrObservationNotFound
	}
	return nil
}
