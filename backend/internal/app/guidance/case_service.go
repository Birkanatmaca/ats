package guidance

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	domain "ots/backend/internal/domain/guidance"
)

type CaseViewMode string

const (
	CaseViewFull     CaseViewMode = "full"
	CaseViewSummary  CaseViewMode = "summary"
)

func caseViewModeForRole(role string) CaseViewMode {
	switch role {
	case "guidance":
		return CaseViewFull
	default:
		return CaseViewSummary
	}
}

func canMutateCases(role string) bool {
	return role == "guidance"
}

func maskCase(item domain.Case, mode CaseViewMode) domain.Case {
	if mode != CaseViewSummary {
		return item
	}
	if item.Sensitivity == "guidance_confidential" || item.Sensitivity == "sensitive_student" {
		item.Summary = "[Gizli özet — rehberlik görüşmesi gerekir]"
		item.Masked = true
	}
	return item
}

func maskCaseEvent(item domain.CaseEvent, mode CaseViewMode) domain.CaseEvent {
	if mode != CaseViewSummary {
		return item
	}
	if item.Visibility == domain.CaseVisibilityGuidanceOnly {
		item.Title = "[Gizli kayıt]"
		item.Body = ""
		item.Masked = true
	}
	return item
}

func (s *Service) ListCases(ctx context.Context, tenantID, userID, role, studentID, status string) []domain.Case {
	if studentID != "" && !s.repo.GuidanceCanAccessStudent(ctx, tenantID, userID, studentID) {
		return nil
	}
	items, _ := s.repo.ListGuidanceCases(ctx, tenantID, studentID, status)
	mode := caseViewModeForRole(role)
	out := make([]domain.Case, 0, len(items))
	for _, item := range items {
		if !s.repo.GuidanceCanAccessStudent(ctx, tenantID, userID, item.StudentID) {
			continue
		}
		out = append(out, maskCase(item, mode))
	}
	return out
}

func (s *Service) GetCase(ctx context.Context, tenantID, userID, role, caseID string) (domain.Case, error) {
	item, ok := s.repo.GetGuidanceCase(ctx, tenantID, strings.TrimSpace(caseID))
	if !ok {
		return domain.Case{}, ErrCaseNotFound
	}
	if !s.repo.GuidanceCanAccessStudent(ctx, tenantID, userID, item.StudentID) {
		return domain.Case{}, ErrStudentOutScope
	}
	return maskCase(item, caseViewModeForRole(role)), nil
}

func (s *Service) CreateCase(ctx context.Context, tenantID, actorID, role string, input domain.CreateCaseInput) (domain.Case, error) {
	if !canMutateCases(role) {
		return domain.Case{}, ErrGuidanceForbidden
	}
	studentID := strings.TrimSpace(input.StudentID)
	title := strings.TrimSpace(input.Title)
	if studentID == "" || title == "" {
		return domain.Case{}, ErrInvalidInput
	}
	if !s.repo.GuidanceCanAccessStudent(ctx, tenantID, actorID, studentID) {
		return domain.Case{}, ErrStudentOutScope
	}
	priority := input.Priority
	if priority == "" {
		priority = domain.CasePriorityMedium
	}
	sensitivity := strings.TrimSpace(input.Sensitivity)
	if sensitivity == "" {
		sensitivity = "guidance_confidential"
	}
	created, ok := s.repo.CreateGuidanceCase(ctx, tenantID, actorID, domain.CreateCaseInput{
		StudentID:   studentID,
		Title:       title,
		Summary:     strings.TrimSpace(input.Summary),
		Priority:    priority,
		Sensitivity: sensitivity,
	})
	if !ok {
		return domain.Case{}, ErrInvalidInput
	}
	s.repo.RecordOperationalAudit(ctx, tenantID, actorID, "guidance.case.create", "guidance_case", created.ID, `{}`)
	_, _ = s.repo.CreateGuidanceCaseEvent(ctx, tenantID, created.ID, actorID, domain.CreateCaseEventInput{
		EventType:  domain.CaseEventTypeStatusChange,
		Title:      "Vaka açıldı",
		Body:       created.Title,
		Visibility: domain.CaseVisibilityGuidanceOnly,
	})
	return created, nil
}

func (s *Service) UpdateCase(ctx context.Context, tenantID, userID, role, caseID string, input domain.UpdateCaseInput) (domain.Case, error) {
	if !canMutateCases(role) {
		return domain.Case{}, ErrGuidanceForbidden
	}
	current, ok := s.repo.GetGuidanceCase(ctx, tenantID, strings.TrimSpace(caseID))
	if !ok {
		return domain.Case{}, ErrCaseNotFound
	}
	if !s.repo.GuidanceCanAccessStudent(ctx, tenantID, userID, current.StudentID) {
		return domain.Case{}, ErrStudentOutScope
	}
	if input.OwnerUserID != nil && strings.TrimSpace(*input.OwnerUserID) != "" && *input.OwnerUserID != current.OwnerUserID {
		meta, _ := json.Marshal(map[string]string{
			"fromOwnerUserId": current.OwnerUserID,
			"toOwnerUserId":   strings.TrimSpace(*input.OwnerUserID),
		})
		s.repo.RecordOperationalAudit(ctx, tenantID, userID, "guidance.case.owner_change", "guidance_case", current.ID, string(meta))
	}
	updated, ok := s.repo.UpdateGuidanceCase(ctx, tenantID, strings.TrimSpace(caseID), userID, input)
	if !ok {
		return domain.Case{}, ErrCaseNotFound
	}
	s.repo.RecordOperationalAudit(ctx, tenantID, userID, "guidance.case.update", "guidance_case", updated.ID, `{}`)
	return updated, nil
}

func (s *Service) CloseCase(ctx context.Context, tenantID, userID, role, caseID string, now time.Time) (domain.CloseCaseResult, error) {
	if !canMutateCases(role) {
		return domain.CloseCaseResult{}, ErrGuidanceForbidden
	}
	current, ok := s.repo.GetGuidanceCase(ctx, tenantID, strings.TrimSpace(caseID))
	if !ok {
		return domain.CloseCaseResult{}, ErrCaseNotFound
	}
	if !s.repo.GuidanceCanAccessStudent(ctx, tenantID, userID, current.StudentID) {
		return domain.CloseCaseResult{}, ErrStudentOutScope
	}
	warnings := make([]string, 0)
	plans := s.ListPlans(ctx, tenantID, userID, current.StudentID)
	for _, plan := range plans {
		if plan.Status == domain.PlanStatusOpen || plan.Status == domain.PlanStatusMonitoring {
			warnings = append(warnings, fmt.Sprintf("Açık destek planı: %s", plan.Title))
		}
	}
	closed, ok := s.repo.CloseGuidanceCase(ctx, tenantID, strings.TrimSpace(caseID), userID, now)
	if !ok {
		return domain.CloseCaseResult{}, ErrCaseNotFound
	}
	s.repo.RecordOperationalAudit(ctx, tenantID, userID, "guidance.case.close", "guidance_case", closed.ID, `{}`)
	_, _ = s.repo.CreateGuidanceCaseEvent(ctx, tenantID, closed.ID, userID, domain.CreateCaseEventInput{
		EventType:  domain.CaseEventTypeStatusChange,
		Title:      "Vaka kapatıldı",
		Body:       closed.Title,
		Visibility: domain.CaseVisibilityGuidanceOnly,
	})
	return domain.CloseCaseResult{Case: closed, Warnings: warnings}, nil
}

func (s *Service) ReopenCase(ctx context.Context, tenantID, userID, role, caseID string) (domain.Case, error) {
	if !canMutateCases(role) {
		return domain.Case{}, ErrGuidanceForbidden
	}
	current, ok := s.repo.GetGuidanceCase(ctx, tenantID, strings.TrimSpace(caseID))
	if !ok {
		return domain.Case{}, ErrCaseNotFound
	}
	if !s.repo.GuidanceCanAccessStudent(ctx, tenantID, userID, current.StudentID) {
		return domain.Case{}, ErrStudentOutScope
	}
	reopened, ok := s.repo.ReopenGuidanceCase(ctx, tenantID, strings.TrimSpace(caseID), userID)
	if !ok {
		return domain.Case{}, ErrCaseNotFound
	}
	s.repo.RecordOperationalAudit(ctx, tenantID, userID, "guidance.case.reopen", "guidance_case", reopened.ID, `{}`)
	_, _ = s.repo.CreateGuidanceCaseEvent(ctx, tenantID, reopened.ID, userID, domain.CreateCaseEventInput{
		EventType:  domain.CaseEventTypeStatusChange,
		Title:      "Vaka yeniden açıldı",
		Body:       reopened.Title,
		Visibility: domain.CaseVisibilityGuidanceOnly,
	})
	return reopened, nil
}

func (s *Service) ListCaseEvents(ctx context.Context, tenantID, userID, role, caseID string) ([]domain.CaseEvent, error) {
	current, ok := s.repo.GetGuidanceCase(ctx, tenantID, strings.TrimSpace(caseID))
	if !ok {
		return nil, ErrCaseNotFound
	}
	if !s.repo.GuidanceCanAccessStudent(ctx, tenantID, userID, current.StudentID) {
		return nil, ErrStudentOutScope
	}
	items, err := s.repo.ListGuidanceCaseEvents(ctx, tenantID, strings.TrimSpace(caseID))
	if err != nil {
		return nil, err
	}
	mode := caseViewModeForRole(role)
	out := make([]domain.CaseEvent, 0, len(items))
	for _, item := range items {
		out = append(out, maskCaseEvent(item, mode))
	}
	return out, nil
}

func (s *Service) CreateCaseEvent(ctx context.Context, tenantID, userID, role, caseID string, input domain.CreateCaseEventInput) (domain.CaseEvent, error) {
	if !canMutateCases(role) {
		return domain.CaseEvent{}, ErrGuidanceForbidden
	}
	current, ok := s.repo.GetGuidanceCase(ctx, tenantID, strings.TrimSpace(caseID))
	if !ok {
		return domain.CaseEvent{}, ErrCaseNotFound
	}
	if current.Status == domain.CaseStatusClosed {
		return domain.CaseEvent{}, ErrCaseClosed
	}
	if !s.repo.GuidanceCanAccessStudent(ctx, tenantID, userID, current.StudentID) {
		return domain.CaseEvent{}, ErrStudentOutScope
	}
	body := strings.TrimSpace(input.Body)
	title := strings.TrimSpace(input.Title)
	if body == "" && title == "" {
		return domain.CaseEvent{}, ErrInvalidInput
	}
	eventType := input.EventType
	if eventType == "" {
		eventType = domain.CaseEventTypeNote
	}
	visibility := input.Visibility
	if visibility == "" {
		visibility = domain.CaseVisibilityGuidanceOnly
	}
	created, ok := s.repo.CreateGuidanceCaseEvent(ctx, tenantID, strings.TrimSpace(caseID), userID, domain.CreateCaseEventInput{
		EventType:  eventType,
		Title:      title,
		Body:       body,
		Visibility: visibility,
		OccurredAt: input.OccurredAt,
	})
	if !ok {
		return domain.CaseEvent{}, ErrInvalidInput
	}
	s.repo.RecordOperationalAudit(ctx, tenantID, userID, "guidance.case_event.create", "guidance_case_event", created.ID, `{}`)
	return created, nil
}

func (s *Service) UpdateCaseEvent(ctx context.Context, tenantID, userID, role, caseID, eventID string, input domain.UpdateCaseEventInput) (domain.CaseEvent, error) {
	if !canMutateCases(role) {
		return domain.CaseEvent{}, ErrGuidanceForbidden
	}
	current, ok := s.repo.GetGuidanceCase(ctx, tenantID, strings.TrimSpace(caseID))
	if !ok {
		return domain.CaseEvent{}, ErrCaseNotFound
	}
	if current.Status == domain.CaseStatusClosed {
		return domain.CaseEvent{}, ErrCaseClosed
	}
	if !s.repo.GuidanceCanAccessStudent(ctx, tenantID, userID, current.StudentID) {
		return domain.CaseEvent{}, ErrStudentOutScope
	}
	updated, ok := s.repo.UpdateGuidanceCaseEvent(ctx, tenantID, strings.TrimSpace(caseID), strings.TrimSpace(eventID), input)
	if !ok {
		return domain.CaseEvent{}, ErrCaseEventNotFound
	}
	s.repo.RecordOperationalAudit(ctx, tenantID, userID, "guidance.case_event.update", "guidance_case_event", updated.ID, `{}`)
	return updated, nil
}

func (s *Service) DeleteCaseEvent(ctx context.Context, tenantID, userID, role, caseID, eventID string) error {
	if !canMutateCases(role) {
		return ErrGuidanceForbidden
	}
	current, ok := s.repo.GetGuidanceCase(ctx, tenantID, strings.TrimSpace(caseID))
	if !ok {
		return ErrCaseNotFound
	}
	if !s.repo.GuidanceCanAccessStudent(ctx, tenantID, userID, current.StudentID) {
		return ErrStudentOutScope
	}
	if !s.repo.DeleteGuidanceCaseEvent(ctx, tenantID, strings.TrimSpace(caseID), strings.TrimSpace(eventID)) {
		return ErrCaseEventNotFound
	}
	s.repo.RecordOperationalAudit(ctx, tenantID, userID, "guidance.case_event.delete", "guidance_case_event", strings.TrimSpace(eventID), `{}`)
	return nil
}

func (s *Service) StudentCaseSummary(ctx context.Context, tenantID, userID, role, studentID string) (domain.StudentCaseSummary, error) {
	studentID = strings.TrimSpace(studentID)
	if studentID == "" {
		return domain.StudentCaseSummary{}, ErrInvalidInput
	}
	if !s.repo.GuidanceCanAccessStudent(ctx, tenantID, userID, studentID) {
		return domain.StudentCaseSummary{}, ErrStudentOutScope
	}
	cases := s.ListCases(ctx, tenantID, userID, role, studentID, "")
	mode := caseViewModeForRole(role)
	active := make([]domain.Case, 0)
	critical := 0
	for _, item := range cases {
		if item.Status != domain.CaseStatusClosed {
			active = append(active, maskCase(item, mode))
			if item.Priority == domain.CasePriorityCritical || item.Priority == domain.CasePriorityHigh {
				critical++
			}
		}
	}
	openPlans := 0
	for _, plan := range s.ListPlans(ctx, tenantID, userID, studentID) {
		if plan.Status == domain.PlanStatusOpen || plan.Status == domain.PlanStatusMonitoring {
			openPlans++
		}
	}
	studentName := ""
	className := ""
	if len(active) > 0 {
		studentName = active[0].StudentName
		className = active[0].ClassName
	} else if len(cases) > 0 {
		studentName = cases[0].StudentName
		className = cases[0].ClassName
	}
	return domain.StudentCaseSummary{
		StudentID:       studentID,
		StudentName:     studentName,
		ClassName:       className,
		ActiveCaseCount: len(active),
		CriticalCount:   critical,
		OpenPlanCount:   openPlans,
		Cases:           active,
	}, nil
}

func (s *Service) CaseInboxStats(ctx context.Context, tenantID, userID, role string) domain.GuidanceCaseInboxStats {
	cases := s.ListCases(ctx, tenantID, userID, role, "", "")
	stats := domain.GuidanceCaseInboxStats{}
	for _, item := range cases {
		switch item.Status {
		case domain.CaseStatusOpen:
			stats.OpenCount++
		case domain.CaseStatusMonitoring:
			stats.MonitoringCount++
		}
		if item.Priority == domain.CasePriorityCritical {
			stats.CriticalCount++
		}
	}
	plans := s.ListPlans(ctx, tenantID, userID, "")
	now := time.Now()
	for _, plan := range plans {
		if plan.Status != domain.PlanStatusOpen && plan.Status != domain.PlanStatusMonitoring {
			continue
		}
		if plan.DueDate != "" {
			if due, err := time.Parse("2006-01-02", plan.DueDate); err == nil && due.Before(now) {
				stats.OverduePlanCount++
			}
		}
	}
	return stats
}
