package homework

import (
	"context"
	"errors"
	"testing"
	"time"

	domain "ots/backend/internal/domain/homework"
	memrepo "ots/backend/internal/repository/memory"
)

func newTestService(clock func() time.Time) *Service {
	return NewService(memrepo.NewHomeworkStore(clock), clock)
}

func TestCreateAndListAssignments(t *testing.T) {
	clock := func() time.Time { return time.Date(2026, time.June, 11, 10, 0, 0, 0, time.UTC) }
	svc := newTestService(clock)

	created, err := svc.CreateAssignment(context.Background(), "tenant-1", "teacher-1", domain.CreateAssignmentInput{
		ClassID:     "class-1",
		Course:      "Math",
		Title:       "Worksheet 1",
		Description: "Solve questions 1-10",
		DueDate:     "2026-06-20",
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if created.TenantID != "tenant-1" {
		t.Fatalf("expected tenant-1, got %s", created.TenantID)
	}

	items, err := svc.ListAssignments(context.Background(), "tenant-1", "class-1")
	if err != nil {
		t.Fatalf("unexpected list error: %v", err)
	}
	if len(items) != 1 {
		t.Fatalf("expected 1 item, got %d", len(items))
	}
}

func TestSubmitAssignmentIncreasesSubmissionCount(t *testing.T) {
	clock := func() time.Time { return time.Date(2026, time.June, 11, 10, 0, 0, 0, time.UTC) }
	svc := newTestService(clock)

	assignment, err := svc.CreateAssignment(context.Background(), "tenant-1", "teacher-1", domain.CreateAssignmentInput{
		ClassID: "class-1", Title: "HW", DueDate: "2026-06-20",
	})
	if err != nil {
		t.Fatalf("unexpected create error: %v", err)
	}

	_, err = svc.SubmitAssignment(context.Background(), "tenant-1", assignment.ID, "student-1", domain.SubmitAssignmentInput{Content: "done"})
	if err != nil {
		t.Fatalf("unexpected submit error: %v", err)
	}
	got, err := svc.GetAssignment(context.Background(), "tenant-1", assignment.ID)
	if err != nil {
		t.Fatalf("unexpected get error: %v", err)
	}
	if got.SubmissionCount != 1 {
		t.Fatalf("expected submission count 1, got %d", got.SubmissionCount)
	}
}

func TestCreateAssignmentValidatesInput(t *testing.T) {
	svc := newTestService(time.Now)
	_, err := svc.CreateAssignment(context.Background(), "tenant-1", "teacher-1", domain.CreateAssignmentInput{})
	if !errors.Is(err, ErrInvalidInput) {
		t.Fatalf("expected ErrInvalidInput, got %v", err)
	}
}

func TestSubmitRequiresContentOrFile(t *testing.T) {
	clock := func() time.Time { return time.Date(2026, time.June, 11, 10, 0, 0, 0, time.UTC) }
	svc := newTestService(clock)

	a, _ := svc.CreateAssignment(context.Background(), "tenant-1", "teacher-1", domain.CreateAssignmentInput{
		ClassID: "c1", Title: "T", DueDate: "2026-07-01",
	})
	_, err := svc.SubmitAssignment(context.Background(), "tenant-1", a.ID, "student-1", domain.SubmitAssignmentInput{})
	if !errors.Is(err, ErrInvalidInput) {
		t.Fatalf("expected ErrInvalidInput for empty submission, got %v", err)
	}
}

func TestSubmitUnknownAssignmentReturnsNotFound(t *testing.T) {
	svc := newTestService(time.Now)
	_, err := svc.SubmitAssignment(context.Background(), "tenant-1", "nonexistent-id", "student-1", domain.SubmitAssignmentInput{Content: "x"})
	if !errors.Is(err, ErrNotFound) {
		t.Fatalf("expected ErrNotFound, got %v", err)
	}
}

func TestListFiltersByClass(t *testing.T) {
	clock := func() time.Time { return time.Date(2026, time.June, 11, 10, 0, 0, 0, time.UTC) }
	svc := newTestService(clock)

	svc.CreateAssignment(context.Background(), "t1", "teacher", domain.CreateAssignmentInput{ClassID: "classA", Title: "HW-A", DueDate: "2026-07-01"})
	svc.CreateAssignment(context.Background(), "t1", "teacher", domain.CreateAssignmentInput{ClassID: "classB", Title: "HW-B", DueDate: "2026-07-01"})

	items, _ := svc.ListAssignments(context.Background(), "t1", "classA")
	if len(items) != 1 || items[0].ClassID != "classA" {
		t.Fatalf("expected 1 classA assignment, got %d", len(items))
	}
	all, _ := svc.ListAssignments(context.Background(), "t1", "")
	if len(all) != 2 {
		t.Fatalf("expected 2 total, got %d", len(all))
	}
}

func TestUpsertSubmission(t *testing.T) {
	clock := func() time.Time { return time.Date(2026, time.June, 11, 10, 0, 0, 0, time.UTC) }
	svc := newTestService(clock)

	a, _ := svc.CreateAssignment(context.Background(), "t1", "teacher", domain.CreateAssignmentInput{ClassID: "c1", Title: "T", DueDate: "2026-07-01"})

	svc.SubmitAssignment(context.Background(), "t1", a.ID, "s1", domain.SubmitAssignmentInput{Content: "v1"})
	svc.SubmitAssignment(context.Background(), "t1", a.ID, "s1", domain.SubmitAssignmentInput{Content: "v2"})

	// Same student re-submits — should still count as 1
	got, _ := svc.GetAssignment(context.Background(), "t1", a.ID)
	if got.SubmissionCount != 1 {
		t.Fatalf("expected 1 submission after upsert, got %d", got.SubmissionCount)
	}
}
