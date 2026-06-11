package guidance

import (
	"context"
	"testing"
	"time"

	attendancedomain "ots/backend/internal/domain/attendance"
	domain "ots/backend/internal/domain/guidance"
	observationdomain "ots/backend/internal/domain/observation"
)

type earlyWarningTestRepo struct {
	scopeTestRepo
	attendance map[string]attendancedomain.StudentSummary
	obs        []observationdomain.Observation
	cases      map[string]domain.Case
	risks      map[string]domain.RiskTracking
}

func (r *earlyWarningTestRepo) ListGuidanceStudents(context.Context, string, string) ([]domain.Student, error) {
	return []domain.Student{
		{ID: "student-a", FullName: "Ali Veli", ClassName: "9-A"},
	}, nil
}

func (r *earlyWarningTestRepo) StudentAttendanceSummary(_ context.Context, _, studentID string) (attendancedomain.StudentSummary, bool) {
	summary, ok := r.attendance[studentID]
	return summary, ok
}

func (r *earlyWarningTestRepo) ListObservations(context.Context, string) []observationdomain.Observation {
	return append([]observationdomain.Observation(nil), r.obs...)
}

func (r *earlyWarningTestRepo) ListGuidanceCases(context.Context, string, string, string) ([]domain.Case, error) {
	out := make([]domain.Case, 0, len(r.cases))
	for _, item := range r.cases {
		out = append(out, item)
	}
	return out, nil
}

func (r *earlyWarningTestRepo) GetRiskTrackingByStudent(_ context.Context, _, studentID string) (domain.RiskTracking, bool) {
	item, ok := r.risks[studentID]
	return item, ok
}

func TestListEarlyWarningsDetectsAbsentAndRepeatObservations(t *testing.T) {
	now := time.Now()
	repo := &earlyWarningTestRepo{
		scopeTestRepo: scopeTestRepo{access: map[string]bool{"student-a": true}},
		attendance: map[string]attendancedomain.StudentSummary{
			"student-a": {StudentID: "student-a", Absent: 4},
		},
		obs: []observationdomain.Observation{
			{StudentID: "student-a", Category: observationdomain.CategoryAbsenceRisk, CreatedAt: now.Add(-24 * time.Hour)},
			{StudentID: "student-a", Category: observationdomain.CategoryAbsenceRisk, CreatedAt: now.Add(-48 * time.Hour)},
		},
		cases: map[string]domain.Case{},
		risks: map[string]domain.RiskTracking{},
	}
	svc := NewService(repo)
	signals, err := svc.ListEarlyWarnings(context.Background(), "tenant-1", "counselor-1", "guidance")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(signals) < 2 {
		t.Fatalf("expected at least 2 signals, got %#v", signals)
	}
}

func TestListEarlyWarningsFlagsRiskWithoutCase(t *testing.T) {
	repo := &earlyWarningTestRepo{
		scopeTestRepo: scopeTestRepo{access: map[string]bool{"student-a": true}},
		attendance:    map[string]attendancedomain.StudentSummary{},
		obs:           nil,
		cases:         map[string]domain.Case{},
		risks: map[string]domain.RiskTracking{
			"student-a": {StudentID: "student-a"},
		},
	}
	svc := NewService(repo)
	signals, err := svc.ListEarlyWarnings(context.Background(), "tenant-1", "counselor-1", "guidance")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	found := false
	for _, item := range signals {
		if item.SignalType == "risk_without_case" {
			found = true
			break
		}
	}
	if !found {
		t.Fatalf("expected risk_without_case signal, got %#v", signals)
	}
}
