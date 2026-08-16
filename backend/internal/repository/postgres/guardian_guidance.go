package postgres

import (
	"context"

	guardiandomain "ots/backend/internal/domain/guardian"
)

func (s *Store) ListGuardianGuidanceUpdates(ctx context.Context, tenantID string, guardianUserID string, studentID string) []guardiandomain.GuidanceUpdate {
	if !s.GuardianHasStudent(ctx, tenantID, guardianUserID, studentID) {
		return []guardiandomain.GuidanceUpdate{}
	}

	rows, err := s.db.QueryContext(ctx, `
SELECT
  e.id::text,
  e.case_id::text,
  c.title,
  e.event_type,
  e.title,
  e.body,
  u.full_name,
  e.occurred_at
FROM guidance_case_events e
JOIN guidance_cases c ON c.id = e.case_id AND c.tenant_id = e.tenant_id
JOIN users u ON u.id = e.actor_user_id
WHERE e.tenant_id = $1
  AND c.student_id = $2
  AND e.visibility = 'shared_with_guardian'
  AND e.deleted_at IS NULL
  AND c.deleted_at IS NULL
ORDER BY e.occurred_at DESC
LIMIT 50`, tenantID, studentID)
	if err != nil {
		return []guardiandomain.GuidanceUpdate{}
	}
	defer rows.Close()

	out := make([]guardiandomain.GuidanceUpdate, 0)
	for rows.Next() {
		var item guardiandomain.GuidanceUpdate
		if err := rows.Scan(
			&item.ID,
			&item.CaseID,
			&item.CaseTitle,
			&item.EventType,
			&item.Title,
			&item.Body,
			&item.ActorName,
			&item.OccurredAt,
		); err != nil {
			continue
		}
		out = append(out, item)
	}
	return out
}
