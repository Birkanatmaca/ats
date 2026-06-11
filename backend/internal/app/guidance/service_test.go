package guidance

import (
	"context"
	"testing"
	"time"

	attendancedomain "ots/backend/internal/domain/attendance"
	domain "ots/backend/internal/domain/guidance"
	observationdomain "ots/backend/internal/domain/observation"
)

type scopeTestRepo struct {
	access map[string]bool
	notes  map[string]domain.Note
	plans  map[string]domain.SupportPlan
	risks  map[string]domain.RiskTracking
}

func (r *scopeTestRepo) ListGuidanceStudents(context.Context, string, string) ([]domain.Student, error) {
	return nil, nil
}

func (r *scopeTestRepo) GuidanceCanAccessStudent(_ context.Context, _, userID, studentID string) bool {
	if userID == "principal-user" {
		return true
	}
	return r.access[studentID]
}

func (r *scopeTestRepo) ListGuidanceNotes(_ context.Context, _, studentID string) ([]domain.Note, error) {
	out := make([]domain.Note, 0)
	for _, note := range r.notes {
		if studentID == "" || note.StudentID == studentID {
			out = append(out, note)
		}
	}
	return out, nil
}

func (r *scopeTestRepo) GetGuidanceNote(_ context.Context, _, noteID string) (domain.Note, bool) {
	note, ok := r.notes[noteID]
	return note, ok
}

func (r *scopeTestRepo) CreateGuidanceNote(context.Context, string, string, domain.CreateNoteInput) (domain.Note, bool) {
	return domain.Note{}, false
}

func (r *scopeTestRepo) UpdateGuidanceNote(_ context.Context, _, noteID string, input domain.UpdateNoteInput) (domain.Note, bool) {
	note, ok := r.notes[noteID]
	if !ok {
		return domain.Note{}, false
	}
	if input.Body != nil {
		note.Body = *input.Body
	}
	r.notes[noteID] = note
	return note, true
}

func (r *scopeTestRepo) DeleteGuidanceNote(_ context.Context, _, noteID string) bool {
	if _, ok := r.notes[noteID]; !ok {
		return false
	}
	delete(r.notes, noteID)
	return true
}

func (r *scopeTestRepo) ListSupportPlans(_ context.Context, _, studentID string) ([]domain.SupportPlan, error) {
	out := make([]domain.SupportPlan, 0)
	for _, plan := range r.plans {
		if studentID == "" || plan.StudentID == studentID {
			out = append(out, plan)
		}
	}
	return out, nil
}

func (r *scopeTestRepo) GetSupportPlan(_ context.Context, _, planID string) (domain.SupportPlan, bool) {
	plan, ok := r.plans[planID]
	return plan, ok
}

func (r *scopeTestRepo) CreateSupportPlan(context.Context, string, string, domain.CreatePlanInput) (domain.SupportPlan, bool) {
	return domain.SupportPlan{}, false
}

func (r *scopeTestRepo) UpdateSupportPlan(_ context.Context, _, planID string, input domain.UpdatePlanInput) (domain.SupportPlan, bool) {
	plan, ok := r.plans[planID]
	if !ok {
		return domain.SupportPlan{}, false
	}
	if input.Title != nil {
		plan.Title = *input.Title
	}
	r.plans[planID] = plan
	return plan, true
}

func (r *scopeTestRepo) DeleteSupportPlan(_ context.Context, _, planID string) bool {
	if _, ok := r.plans[planID]; !ok {
		return false
	}
	delete(r.plans, planID)
	return true
}

func (r *scopeTestRepo) ListRiskTrackings(_ context.Context, _, studentID string) ([]domain.RiskTracking, error) {
	out := make([]domain.RiskTracking, 0)
	for _, item := range r.risks {
		if studentID == "" || item.StudentID == studentID {
			out = append(out, item)
		}
	}
	return out, nil
}

func (r *scopeTestRepo) GetRiskTracking(_ context.Context, _, trackingID string) (domain.RiskTracking, bool) {
	item, ok := r.risks[trackingID]
	return item, ok
}

func (r *scopeTestRepo) GetRiskTrackingByStudent(context.Context, string, string) (domain.RiskTracking, bool) {
	return domain.RiskTracking{}, false
}

func (r *scopeTestRepo) CreateRiskTracking(context.Context, string, string, domain.CreateRiskTrackingInput) (domain.RiskTracking, bool) {
	return domain.RiskTracking{}, false
}

func (r *scopeTestRepo) DeleteRiskTracking(_ context.Context, _, trackingID string) bool {
	if _, ok := r.risks[trackingID]; !ok {
		return false
	}
	delete(r.risks, trackingID)
	return true
}

func (r *scopeTestRepo) RecordOperationalAudit(context.Context, string, string, string, string, string, string) {
}

func (r *scopeTestRepo) StudentAttendanceSummary(context.Context, string, string) (attendancedomain.StudentSummary, bool) {
	return attendancedomain.StudentSummary{}, false
}

func (r *scopeTestRepo) ListObservations(context.Context, string) []observationdomain.Observation {
	return nil
}

func (r *scopeTestRepo) ListGuidanceCases(context.Context, string, string, string) ([]domain.Case, error) {
	return nil, nil
}

func (r *scopeTestRepo) GetGuidanceCase(context.Context, string, string) (domain.Case, bool) {
	return domain.Case{}, false
}

func (r *scopeTestRepo) CreateGuidanceCase(context.Context, string, string, domain.CreateCaseInput) (domain.Case, bool) {
	return domain.Case{}, false
}

func (r *scopeTestRepo) UpdateGuidanceCase(context.Context, string, string, string, domain.UpdateCaseInput) (domain.Case, bool) {
	return domain.Case{}, false
}

func (r *scopeTestRepo) CloseGuidanceCase(context.Context, string, string, string, time.Time) (domain.Case, bool) {
	return domain.Case{}, false
}

func (r *scopeTestRepo) ReopenGuidanceCase(context.Context, string, string, string) (domain.Case, bool) {
	return domain.Case{}, false
}

func (r *scopeTestRepo) ListGuidanceCaseEvents(context.Context, string, string) ([]domain.CaseEvent, error) {
	return nil, nil
}

func (r *scopeTestRepo) GetGuidanceCaseEvent(context.Context, string, string, string) (domain.CaseEvent, bool) {
	return domain.CaseEvent{}, false
}

func (r *scopeTestRepo) CreateGuidanceCaseEvent(context.Context, string, string, string, domain.CreateCaseEventInput) (domain.CaseEvent, bool) {
	return domain.CaseEvent{}, false
}

func (r *scopeTestRepo) UpdateGuidanceCaseEvent(context.Context, string, string, string, domain.UpdateCaseEventInput) (domain.CaseEvent, bool) {
	return domain.CaseEvent{}, false
}

func (r *scopeTestRepo) DeleteGuidanceCaseEvent(context.Context, string, string, string) bool {
	return false
}

func TestListNotesFiltersByGuidanceScope(t *testing.T) {
	repo := &scopeTestRepo{
		access: map[string]bool{"student-a": true},
		notes: map[string]domain.Note{
			"note-a": {ID: "note-a", StudentID: "student-a", Body: "allowed"},
			"note-b": {ID: "note-b", StudentID: "student-b", Body: "blocked"},
		},
	}
	svc := NewService(repo)
	ctx := context.Background()

	items := svc.ListNotes(ctx, "tenant-1", "guidance-user", "")
	if len(items) != 1 || items[0].ID != "note-a" {
		t.Fatalf("expected scoped note list, got %#v", items)
	}
}

func TestUpdateNoteRejectsOutOfScopeStudent(t *testing.T) {
	repo := &scopeTestRepo{
		access: map[string]bool{},
		notes: map[string]domain.Note{
			"note-b": {ID: "note-b", StudentID: "student-b", Body: "blocked"},
		},
	}
	svc := NewService(repo)
	ctx := context.Background()
	body := "changed"

	_, err := svc.UpdateNote(ctx, "tenant-1", "guidance-user", "note-b", domain.UpdateNoteInput{Body: &body})
	if err != ErrStudentOutScope {
		t.Fatalf("expected ErrStudentOutScope, got %v", err)
	}
}

func TestDeletePlanRejectsOutOfScopeStudent(t *testing.T) {
	repo := &scopeTestRepo{
		access: map[string]bool{},
		plans: map[string]domain.SupportPlan{
			"plan-b": {ID: "plan-b", StudentID: "student-b", Title: "blocked"},
		},
	}
	svc := NewService(repo)
	ctx := context.Background()

	if err := svc.DeletePlan(ctx, "tenant-1", "guidance-user", "plan-b"); err != ErrStudentOutScope {
		t.Fatalf("expected ErrStudentOutScope, got %v", err)
	}
}

func TestDeleteRiskTrackingRejectsOutOfScopeStudent(t *testing.T) {
	now := time.Now()
	repo := &scopeTestRepo{
		access: map[string]bool{},
		risks: map[string]domain.RiskTracking{
			"risk-b": {ID: "risk-b", StudentID: "student-b", CreatedAt: now, UpdatedAt: now},
		},
	}
	svc := NewService(repo)
	ctx := context.Background()

	if err := svc.DeleteRiskTracking(ctx, "tenant-1", "guidance-user", "risk-b"); err != ErrStudentOutScope {
		t.Fatalf("expected ErrStudentOutScope, got %v", err)
	}
}
