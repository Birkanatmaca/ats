package memory

import (
	"context"
	"sort"

	guidancedomain "ots/backend/internal/domain/guidance"
	guardiandomain "ots/backend/internal/domain/guardian"
)

func (s *Store) ListGuardianGuidanceUpdates(_ context.Context, tenantID string, guardianUserID string, studentID string) []guardiandomain.GuidanceUpdate {
	s.mu.RLock()
	defer s.mu.RUnlock()

	if tenantID != s.tenant.ID || !s.guardianHasStudentLocked(guardianUserID, studentID) {
		return []guardiandomain.GuidanceUpdate{}
	}

	out := make([]guardiandomain.GuidanceUpdate, 0)
	for _, eventRec := range s.ensureGuidanceCaseEvents() {
		if eventRec.Deleted || eventRec.TenantID != tenantID {
			continue
		}
		if eventRec.Visibility != guidancedomain.CaseVisibilitySharedWithGuardian {
			continue
		}
		caseRec, ok := s.ensureGuidanceCases()[eventRec.CaseID]
		if !ok || caseRec.Deleted || caseRec.TenantID != tenantID || caseRec.StudentID != studentID {
			continue
		}
		out = append(out, guardiandomain.GuidanceUpdate{
			ID:         eventRec.ID,
			CaseID:     eventRec.CaseID,
			CaseTitle:  caseRec.Title,
			EventType:  string(eventRec.EventType),
			Title:      eventRec.Title,
			Body:       eventRec.Body,
			ActorName:  eventRec.ActorName,
			OccurredAt: eventRec.OccurredAt,
		})
	}

	sort.Slice(out, func(i, j int) bool {
		return out[i].OccurredAt.After(out[j].OccurredAt)
	})
	if len(out) > 50 {
		out = out[:50]
	}
	return out
}
