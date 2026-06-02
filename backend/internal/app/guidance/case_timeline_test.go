package guidance

import (
	"context"
	"testing"
	"time"

	domain "ots/backend/internal/domain/guidance"
)

func TestUnifiedTimelineMergesSources(t *testing.T) {
	now := time.Now()
	repo := &caseTestRepo{
		scopeTestRepo: scopeTestRepo{
			access: map[string]bool{"student-a": true},
			notes: map[string]domain.Note{
				"note-1": {
					ID:          "note-1",
					StudentID:   "student-a",
					Title:       "Görüşme notu",
					Body:        "Detay",
					AuthorName:  "Rehber",
					Sensitivity: "normal",
					CreatedAt:   now,
				},
			},
			plans: map[string]domain.SupportPlan{
				"plan-1": {
					ID:          "plan-1",
					StudentID:   "student-a",
					Title:       "Destek planı",
					Description: "Haftalık takip",
					OwnerName:   "Rehber",
					UpdatedAt:   now,
				},
			},
			risks: map[string]domain.RiskTracking{
				"risk-1": {
					ID:            "risk-1",
					StudentID:     "student-a",
					Reason:        "Devamsızlık artışı",
					CounselorName: "Rehber",
					UpdatedAt:     now,
				},
			},
		},
		cases: map[string]domain.Case{
			"case-1": {ID: "case-1", StudentID: "student-a", Status: domain.CaseStatusOpen},
		},
		events: map[string]domain.CaseEvent{
			"event-1": {
				ID:         "event-1",
				CaseID:     "case-1",
				EventType:  domain.CaseEventTypeMeeting,
				Title:      "Veli görüşmesi",
				Body:       "Planlandı",
				ActorName:  "Rehber",
				Visibility: domain.CaseVisibilityPrincipalSummary,
				OccurredAt: now,
			},
		},
	}
	svc := NewService(repo)
	items, err := svc.ListCaseTimeline(context.Background(), "tenant-1", "counselor-1", "guidance", "case-1")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(items) != 4 {
		t.Fatalf("expected 4 timeline items, got %d", len(items))
	}
	sources := map[string]bool{}
	for _, item := range items {
		sources[item.Source] = true
	}
	for _, source := range []string{"case_event", "guidance_note", "support_plan", "risk_tracking"} {
		if !sources[source] {
			t.Fatalf("missing source %s in timeline", source)
		}
	}
}

func TestPrincipalTimelineMasksConfidentialNotes(t *testing.T) {
	now := time.Now()
	repo := &caseTestRepo{
		scopeTestRepo: scopeTestRepo{
			access: map[string]bool{"student-a": true},
			notes: map[string]domain.Note{
				"note-1": {
					ID:          "note-1",
					StudentID:   "student-a",
					Title:       "Gizli görüşme",
					Body:        "Hassas",
					AuthorName:  "Rehber",
					Sensitivity: "guidance_confidential",
					CreatedAt:   now,
				},
			},
		},
		cases: map[string]domain.Case{
			"case-1": {ID: "case-1", StudentID: "student-a", Status: domain.CaseStatusOpen},
		},
		events: map[string]domain.CaseEvent{},
	}
	svc := NewService(repo)
	items, err := svc.ListCaseTimeline(context.Background(), "tenant-1", "principal-user", "principal", "case-1")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(items) != 1 || !items[0].Masked || items[0].Title != "[Gizli kayıt]" {
		t.Fatalf("expected masked note for principal, got %#v", items)
	}
}
