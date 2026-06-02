package guidance

import (
	"context"
	"sort"
	"strconv"
	"strings"
	"time"

	domain "ots/backend/internal/domain/guidance"
)

func maskTimelineItem(item domain.CaseTimelineItem, mode CaseViewMode) domain.CaseTimelineItem {
	if mode != CaseViewSummary {
		return item
	}
	if item.Visibility == string(domain.CaseVisibilityGuidanceOnly) {
		item.Title = "[Gizli kayıt]"
		item.Body = ""
		item.Masked = true
	}
	return item
}

func (s *Service) ListCaseTimeline(ctx context.Context, tenantID, userID, role, caseID string) ([]domain.CaseTimelineItem, error) {
	current, ok := s.repo.GetGuidanceCase(ctx, tenantID, strings.TrimSpace(caseID))
	if !ok {
		return nil, ErrCaseNotFound
	}
	if !s.repo.GuidanceCanAccessStudent(ctx, tenantID, userID, current.StudentID) {
		return nil, ErrStudentOutScope
	}

	mode := caseViewModeForRole(role)
	items := make([]domain.CaseTimelineItem, 0)

	events, err := s.repo.ListGuidanceCaseEvents(ctx, tenantID, current.ID)
	if err != nil {
		return nil, err
	}
	for _, event := range events {
		masked := maskCaseEvent(event, mode)
		items = append(items, domain.CaseTimelineItem{
			ID:         masked.ID,
			Source:     "case_event",
			EventType:  string(masked.EventType),
			Title:      masked.Title,
			Body:       masked.Body,
			ActorName:  masked.ActorName,
			OccurredAt: masked.OccurredAt,
			Visibility: string(masked.Visibility),
			Masked:     masked.Masked,
		})
	}

	for _, note := range s.ListNotes(ctx, tenantID, userID, current.StudentID) {
		item := domain.CaseTimelineItem{
			ID:         note.ID,
			Source:     "guidance_note",
			EventType:  string(note.NoteType),
			Title:      note.Title,
			Body:       note.Body,
			ActorName:  note.AuthorName,
			OccurredAt: note.CreatedAt,
			Visibility: string(domain.CaseVisibilityGuidanceOnly),
		}
		if note.Sensitivity == "guidance_confidential" || note.Sensitivity == "sensitive_student" {
			item.Visibility = string(domain.CaseVisibilityGuidanceOnly)
		} else {
			item.Visibility = string(domain.CaseVisibilityPrincipalSummary)
		}
		items = append(items, maskTimelineItem(item, mode))
	}

	for _, plan := range s.ListPlans(ctx, tenantID, userID, current.StudentID) {
		body := plan.Description
		if plan.DueDate != "" {
			body = strings.TrimSpace(body + " · Son tarih: " + plan.DueDate)
		}
		items = append(items, domain.CaseTimelineItem{
			ID:         plan.ID,
			Source:     "support_plan",
			EventType:  "plan",
			Title:      plan.Title,
			Body:       body,
			ActorName:  plan.OwnerName,
			OccurredAt: plan.UpdatedAt,
			Visibility: string(domain.CaseVisibilityPrincipalSummary),
		})
	}

	for _, tracking := range s.ListRiskTrackings(ctx, tenantID, userID, current.StudentID) {
		body := tracking.Reason
		if body == "" {
			body = "Manuel risk takibi açık"
		}
		items = append(items, domain.CaseTimelineItem{
			ID:         tracking.ID,
			Source:     "risk_tracking",
			EventType:  "risk",
			Title:      "Risk takibi",
			Body:       body,
			ActorName:  tracking.CounselorName,
			OccurredAt: tracking.UpdatedAt,
			Visibility: string(domain.CaseVisibilityPrincipalSummary),
		})
	}

	sort.Slice(items, func(i, j int) bool {
		return items[i].OccurredAt.After(items[j].OccurredAt)
	})
	return items, nil
}

func (s *Service) BuildStudentCaseTimelineSummary(ctx context.Context, tenantID, userID, role, studentID string, since time.Time) (string, error) {
	if !s.repo.GuidanceCanAccessStudent(ctx, tenantID, userID, studentID) {
		return "", ErrStudentOutScope
	}
	cases := s.ListCases(ctx, tenantID, userID, role, studentID, "")
	if len(cases) == 0 {
		return "Bu öğrenci için açık vaka dosyası bulunmuyor.", nil
	}
	activeCase := cases[0]
	for _, item := range cases {
		if item.Status != domain.CaseStatusClosed {
			activeCase = item
			break
		}
	}
	items, err := s.ListCaseTimeline(ctx, tenantID, userID, role, activeCase.ID)
	if err != nil {
		return "", err
	}
	lines := make([]string, 0, 8)
	lines = append(lines, activeCase.StudentName+" · "+activeCase.Title)
	counts := map[string]int{}
	for _, item := range items {
		if item.OccurredAt.Before(since) {
			continue
		}
		counts[item.Source]++
	}
	if len(counts) == 0 {
		return activeCase.StudentName + " için son 30 günde vaka zaman çizelgesinde kayıt yok.", nil
	}
	for source, count := range counts {
		switch source {
		case "guidance_note":
			lines = append(lines, "- "+strconv.Itoa(count)+" rehberlik notu")
		case "support_plan":
			lines = append(lines, "- "+strconv.Itoa(count)+" destek planı kaydı")
		case "risk_tracking":
			lines = append(lines, "- "+strconv.Itoa(count)+" risk takibi")
		case "case_event":
			lines = append(lines, "- "+strconv.Itoa(count)+" vaka olayı")
		}
	}
	lines = append(lines, "Bu özet yalnızca bilgilendirme amaçlıdır; tanı veya etiket içermez.")
	return strings.Join(lines, "\n"), nil
}
