package observation

import (
	"context"
	"errors"
	"strings"

	domain "ots/backend/internal/domain/observation"
)

var ErrInvalidObservation = errors.New("invalid observation")

type Repository interface {
	ListObservations(ctx context.Context, tenantID string) []domain.Observation
	CreateObservation(ctx context.Context, tenantID string, authorID string, input domain.CreateInput) (domain.Observation, bool)
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
