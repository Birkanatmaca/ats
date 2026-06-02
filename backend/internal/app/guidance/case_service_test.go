package guidance

import (
	"context"
	"testing"
	"time"

	domain "ots/backend/internal/domain/guidance"
)

type caseTestRepo struct {
	scopeTestRepo
	cases  map[string]domain.Case
	events map[string]domain.CaseEvent
}

func (r *caseTestRepo) ListGuidanceCases(_ context.Context, _, studentID, status string) ([]domain.Case, error) {
	out := make([]domain.Case, 0)
	for _, item := range r.cases {
		if studentID != "" && item.StudentID != studentID {
			continue
		}
		if status != "" && string(item.Status) != status {
			continue
		}
		out = append(out, item)
	}
	return out, nil
}

func (r *caseTestRepo) GetGuidanceCase(_ context.Context, _, caseID string) (domain.Case, bool) {
	item, ok := r.cases[caseID]
	return item, ok
}

func (r *caseTestRepo) CreateGuidanceCase(_ context.Context, _, ownerID string, input domain.CreateCaseInput) (domain.Case, bool) {
	now := time.Now()
	item := domain.Case{
		ID:          "case-1",
		StudentID:   input.StudentID,
		OwnerUserID: ownerID,
		Status:      domain.CaseStatusOpen,
		Priority:    input.Priority,
		Title:       input.Title,
		Summary:     input.Summary,
		Sensitivity: input.Sensitivity,
		OpenedAt:    now,
		CreatedAt:   now,
		UpdatedAt:   now,
	}
	r.cases[item.ID] = item
	return item, true
}

func (r *caseTestRepo) CloseGuidanceCase(_ context.Context, _, caseID, _ string, closedAt time.Time) (domain.Case, bool) {
	item, ok := r.cases[caseID]
	if !ok {
		return domain.Case{}, false
	}
	item.Status = domain.CaseStatusClosed
	item.ClosedAt = &closedAt
	r.cases[caseID] = item
	return item, true
}

func (r *caseTestRepo) CreateGuidanceCaseEvent(_ context.Context, _, caseID, actorID string, input domain.CreateCaseEventInput) (domain.CaseEvent, bool) {
	now := time.Now()
	item := domain.CaseEvent{
		ID:          "event-1",
		CaseID:      caseID,
		EventType:   input.EventType,
		Title:       input.Title,
		Body:        input.Body,
		ActorUserID: actorID,
		Visibility:  input.Visibility,
		OccurredAt:  now,
		CreatedAt:   now,
		UpdatedAt:   now,
	}
	r.events[item.ID] = item
	return item, true
}

func (r *caseTestRepo) ListGuidanceCaseEvents(_ context.Context, _, caseID string) ([]domain.CaseEvent, error) {
	out := make([]domain.CaseEvent, 0)
	for _, item := range r.events {
		if item.CaseID == caseID {
			out = append(out, item)
		}
	}
	return out, nil
}

func TestCreateCaseRejectsOutOfScopeStudent(t *testing.T) {
	repo := &caseTestRepo{
		scopeTestRepo: scopeTestRepo{access: map[string]bool{}},
		cases:         map[string]domain.Case{},
		events:        map[string]domain.CaseEvent{},
	}
	svc := NewService(repo)
	_, err := svc.CreateCase(context.Background(), "tenant-1", "counselor-1", "guidance", domain.CreateCaseInput{
		StudentID: "student-b",
		Title:     "Test",
		Priority:  domain.CasePriorityMedium,
	})
	if err != ErrStudentOutScope {
		t.Fatalf("expected ErrStudentOutScope, got %v", err)
	}
}

func TestPrincipalSeesMaskedCaseSummary(t *testing.T) {
	repo := &caseTestRepo{
		scopeTestRepo: scopeTestRepo{access: map[string]bool{"student-a": true}},
		cases: map[string]domain.Case{
			"case-1": {
				ID:          "case-1",
				StudentID:   "student-a",
				StudentName: "Ali Veli",
				ClassName:   "9-A",
				Status:      domain.CaseStatusOpen,
				Priority:    domain.CasePriorityCritical,
				Title:       "Davranış takibi",
				Summary:     "Hassas detay",
				Sensitivity: "guidance_confidential",
			},
		},
		events: map[string]domain.CaseEvent{},
	}
	svc := NewService(repo)
	item, err := svc.GetCase(context.Background(), "tenant-1", "principal-1", "principal", "case-1")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !item.Masked || item.Summary == "Hassas detay" {
		t.Fatalf("expected masked summary for principal, got %#v", item)
	}
}

func TestCreateCaseEventRejectsClosedCase(t *testing.T) {
	now := time.Now()
	repo := &caseTestRepo{
		scopeTestRepo: scopeTestRepo{access: map[string]bool{"student-a": true}},
		cases: map[string]domain.Case{
			"case-1": {
				ID:        "case-1",
				StudentID: "student-a",
				Status:    domain.CaseStatusClosed,
				ClosedAt:  &now,
			},
		},
		events: map[string]domain.CaseEvent{},
	}
	svc := NewService(repo)
	_, err := svc.CreateCaseEvent(context.Background(), "tenant-1", "counselor-1", "guidance", "case-1", domain.CreateCaseEventInput{
		Title: "Veli görüşmesi",
		Body:  "Not",
	})
	if err != ErrCaseClosed {
		t.Fatalf("expected ErrCaseClosed, got %v", err)
	}
}

func TestPrincipalCannotCreateCase(t *testing.T) {
	repo := &caseTestRepo{
		scopeTestRepo: scopeTestRepo{access: map[string]bool{"student-a": true}},
		cases:         map[string]domain.Case{},
		events:        map[string]domain.CaseEvent{},
	}
	svc := NewService(repo)
	_, err := svc.CreateCase(context.Background(), "tenant-1", "principal-1", "principal", domain.CreateCaseInput{
		StudentID: "student-a",
		Title:     "Test",
	})
	if err != ErrGuidanceForbidden {
		t.Fatalf("expected ErrGuidanceForbidden, got %v", err)
	}
}
