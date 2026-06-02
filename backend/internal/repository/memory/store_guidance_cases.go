package memory

import (
	"context"
	"fmt"
	"strings"
	"time"

	guidancedomain "ots/backend/internal/domain/guidance"
)

type guidanceCaseRecord struct {
	guidancedomain.Case
	Deleted bool
}

type guidanceCaseEventRecord struct {
	guidancedomain.CaseEvent
	Deleted bool
}

func (s *Store) ensureGuidanceCases() map[string]*guidanceCaseRecord {
	if s.guidanceCases == nil {
		s.guidanceCases = make(map[string]*guidanceCaseRecord)
	}
	return s.guidanceCases
}

func (s *Store) ensureGuidanceCaseEvents() map[string]*guidanceCaseEventRecord {
	if s.guidanceCaseEvents == nil {
		s.guidanceCaseEvents = make(map[string]*guidanceCaseEventRecord)
	}
	return s.guidanceCaseEvents
}

func (s *Store) ListGuidanceCases(_ context.Context, tenantID, studentID, status string) ([]guidancedomain.Case, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := make([]guidancedomain.Case, 0)
	for _, rec := range s.ensureGuidanceCases() {
		if rec.Deleted || rec.TenantID != tenantID {
			continue
		}
		if studentID != "" && rec.StudentID != studentID {
			continue
		}
		if status != "" && string(rec.Status) != status {
			continue
		}
		out = append(out, rec.Case)
	}
	return out, nil
}

func (s *Store) GetGuidanceCase(_ context.Context, tenantID, caseID string) (guidancedomain.Case, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	rec, ok := s.ensureGuidanceCases()[caseID]
	if !ok || rec.Deleted || rec.TenantID != tenantID {
		return guidancedomain.Case{}, false
	}
	return rec.Case, true
}

func (s *Store) CreateGuidanceCase(_ context.Context, tenantID, ownerUserID string, input guidancedomain.CreateCaseInput) (guidancedomain.Case, bool) {
	s.mu.Lock()
	defer s.mu.Unlock()
	st, ok := memoryFindStudent(s.students, input.StudentID)
	if !ok || st.TenantID != tenantID {
		return guidancedomain.Case{}, false
	}
	now := s.clock()
	id := fmt.Sprintf("guidance-case-%d", len(s.ensureGuidanceCases())+1)
	item := guidancedomain.Case{
		ID:          id,
		TenantID:    tenantID,
		StudentID:   input.StudentID,
		StudentName: st.FullName,
		ClassName:   memoryClassName(s.classes, st.ClassID),
		OwnerUserID: ownerUserID,
		OwnerName:   memoryAuthorName(s.users, ownerUserID),
		Status:      guidancedomain.CaseStatusOpen,
		Priority:    input.Priority,
		Title:       input.Title,
		Summary:     input.Summary,
		Sensitivity: input.Sensitivity,
		OpenedAt:    now,
		CreatedBy:   ownerUserID,
		UpdatedBy:   ownerUserID,
		CreatedAt:   now,
		UpdatedAt:   now,
	}
	s.ensureGuidanceCases()[id] = &guidanceCaseRecord{Case: item}
	return item, true
}

func (s *Store) UpdateGuidanceCase(_ context.Context, tenantID, caseID, actorUserID string, input guidancedomain.UpdateCaseInput) (guidancedomain.Case, bool) {
	s.mu.Lock()
	defer s.mu.Unlock()
	rec, ok := s.ensureGuidanceCases()[caseID]
	if !ok || rec.Deleted || rec.TenantID != tenantID {
		return guidancedomain.Case{}, false
	}
	if input.Title != nil {
		rec.Title = strings.TrimSpace(*input.Title)
	}
	if input.Summary != nil {
		rec.Summary = strings.TrimSpace(*input.Summary)
	}
	if input.Status != nil {
		rec.Status = *input.Status
	}
	if input.Priority != nil {
		rec.Priority = *input.Priority
	}
	if input.Sensitivity != nil {
		rec.Sensitivity = strings.TrimSpace(*input.Sensitivity)
	}
	if input.OwnerUserID != nil && strings.TrimSpace(*input.OwnerUserID) != "" {
		rec.OwnerUserID = strings.TrimSpace(*input.OwnerUserID)
		rec.OwnerName = memoryAuthorName(s.users, rec.OwnerUserID)
	}
	rec.UpdatedBy = actorUserID
	rec.UpdatedAt = s.clock()
	return rec.Case, true
}

func (s *Store) CloseGuidanceCase(_ context.Context, tenantID, caseID, actorUserID string, closedAt time.Time) (guidancedomain.Case, bool) {
	s.mu.Lock()
	defer s.mu.Unlock()
	rec, ok := s.ensureGuidanceCases()[caseID]
	if !ok || rec.Deleted || rec.TenantID != tenantID {
		return guidancedomain.Case{}, false
	}
	rec.Status = guidancedomain.CaseStatusClosed
	rec.ClosedAt = &closedAt
	rec.UpdatedBy = actorUserID
	rec.UpdatedAt = closedAt
	return rec.Case, true
}

func (s *Store) ReopenGuidanceCase(_ context.Context, tenantID, caseID, actorUserID string) (guidancedomain.Case, bool) {
	s.mu.Lock()
	defer s.mu.Unlock()
	rec, ok := s.ensureGuidanceCases()[caseID]
	if !ok || rec.Deleted || rec.TenantID != tenantID {
		return guidancedomain.Case{}, false
	}
	rec.Status = guidancedomain.CaseStatusMonitoring
	rec.ClosedAt = nil
	rec.UpdatedBy = actorUserID
	rec.UpdatedAt = s.clock()
	return rec.Case, true
}

func (s *Store) ListGuidanceCaseEvents(_ context.Context, tenantID, caseID string) ([]guidancedomain.CaseEvent, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := make([]guidancedomain.CaseEvent, 0)
	for _, rec := range s.ensureGuidanceCaseEvents() {
		if rec.Deleted || rec.TenantID != tenantID || rec.CaseID != caseID {
			continue
		}
		out = append(out, rec.CaseEvent)
	}
	return out, nil
}

func (s *Store) GetGuidanceCaseEvent(_ context.Context, tenantID, caseID, eventID string) (guidancedomain.CaseEvent, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	rec, ok := s.ensureGuidanceCaseEvents()[eventID]
	if !ok || rec.Deleted || rec.TenantID != tenantID || rec.CaseID != caseID {
		return guidancedomain.CaseEvent{}, false
	}
	return rec.CaseEvent, true
}

func (s *Store) CreateGuidanceCaseEvent(_ context.Context, tenantID, caseID, actorUserID string, input guidancedomain.CreateCaseEventInput) (guidancedomain.CaseEvent, bool) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if _, ok := s.ensureGuidanceCases()[caseID]; !ok {
		return guidancedomain.CaseEvent{}, false
	}
	now := s.clock()
	occurredAt := now
	if input.OccurredAt != nil {
		occurredAt = *input.OccurredAt
	}
	id := fmt.Sprintf("guidance-case-event-%d", len(s.ensureGuidanceCaseEvents())+1)
	item := guidancedomain.CaseEvent{
		ID:          id,
		TenantID:    tenantID,
		CaseID:      caseID,
		EventType:   input.EventType,
		Title:       input.Title,
		Body:        input.Body,
		ActorUserID: actorUserID,
		ActorName:   memoryAuthorName(s.users, actorUserID),
		Visibility:  input.Visibility,
		OccurredAt:  occurredAt,
		CreatedAt:   now,
		UpdatedAt:   now,
	}
	s.ensureGuidanceCaseEvents()[id] = &guidanceCaseEventRecord{CaseEvent: item}
	return item, true
}

func (s *Store) UpdateGuidanceCaseEvent(_ context.Context, tenantID, caseID, eventID string, input guidancedomain.UpdateCaseEventInput) (guidancedomain.CaseEvent, bool) {
	s.mu.Lock()
	defer s.mu.Unlock()
	rec, ok := s.ensureGuidanceCaseEvents()[eventID]
	if !ok || rec.Deleted || rec.TenantID != tenantID || rec.CaseID != caseID {
		return guidancedomain.CaseEvent{}, false
	}
	if input.EventType != nil {
		rec.EventType = *input.EventType
	}
	if input.Title != nil {
		rec.Title = strings.TrimSpace(*input.Title)
	}
	if input.Body != nil {
		rec.Body = strings.TrimSpace(*input.Body)
	}
	if input.Visibility != nil {
		rec.Visibility = *input.Visibility
	}
	if input.OccurredAt != nil {
		rec.OccurredAt = *input.OccurredAt
	}
	rec.UpdatedAt = s.clock()
	return rec.CaseEvent, true
}

func (s *Store) DeleteGuidanceCaseEvent(_ context.Context, tenantID, caseID, eventID string) bool {
	s.mu.Lock()
	defer s.mu.Unlock()
	rec, ok := s.ensureGuidanceCaseEvents()[eventID]
	if !ok || rec.TenantID != tenantID || rec.CaseID != caseID {
		return false
	}
	rec.Deleted = true
	return true
}
