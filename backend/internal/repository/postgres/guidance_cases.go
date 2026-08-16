package postgres

import (
	"context"
	"database/sql"
	"strconv"
	"strings"
	"time"

	guidancedomain "ots/backend/internal/domain/guidance"
)

func (s *Store) ListGuidanceCases(ctx context.Context, tenantID, studentID, status string) ([]guidancedomain.Case, error) {
	query := `
SELECT
  c.id::text, c.tenant_id::text, c.student_id::text, st.full_name,
  COALESCE(cl.name, ''), c.owner_user_id::text, owner_u.full_name,
  c.status, c.priority, c.title, c.summary, c.sensitivity,
  c.opened_at, c.closed_at, c.created_by::text, c.updated_by::text, c.created_at, c.updated_at
FROM guidance_cases c
JOIN students st ON st.id = c.student_id AND st.tenant_id = c.tenant_id
LEFT JOIN LATERAL (
  SELECT class_id FROM class_students
  WHERE tenant_id = c.tenant_id AND student_id = c.student_id AND ends_on IS NULL
  ORDER BY starts_on DESC LIMIT 1
) cs ON true
LEFT JOIN classes cl ON cl.id = cs.class_id AND cl.tenant_id = c.tenant_id
JOIN users owner_u ON owner_u.id = c.owner_user_id
WHERE c.tenant_id = $1 AND c.deleted_at IS NULL`
	args := []any{tenantID}
	argN := 2
	if strings.TrimSpace(studentID) != "" {
		query += ` AND c.student_id = $` + strconv.Itoa(argN) + `::uuid`
		args = append(args, studentID)
		argN++
	}
	if strings.TrimSpace(status) != "" {
		query += ` AND c.status = $` + strconv.Itoa(argN)
		args = append(args, status)
	}
	query += ` ORDER BY c.updated_at DESC`

	rows, err := s.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanGuidanceCases(rows)
}

func scanGuidanceCases(rows *sql.Rows) ([]guidancedomain.Case, error) {
	out := make([]guidancedomain.Case, 0)
	for rows.Next() {
		var item guidancedomain.Case
		var status, priority string
		var closedAt sql.NullTime
		if err := rows.Scan(
			&item.ID, &item.TenantID, &item.StudentID, &item.StudentName, &item.ClassName,
			&item.OwnerUserID, &item.OwnerName, &status, &priority, &item.Title, &item.Summary, &item.Sensitivity,
			&item.OpenedAt, &closedAt, &item.CreatedBy, &item.UpdatedBy, &item.CreatedAt, &item.UpdatedAt,
		); err != nil {
			return nil, err
		}
		item.Status = guidancedomain.CaseStatus(status)
		item.Priority = guidancedomain.CasePriority(priority)
		if closedAt.Valid {
			item.ClosedAt = &closedAt.Time
		}
		out = append(out, item)
	}
	return out, rows.Err()
}

func (s *Store) GetGuidanceCase(ctx context.Context, tenantID, caseID string) (guidancedomain.Case, bool) {
	row := s.db.QueryRowContext(ctx, `
SELECT
  c.id::text, c.tenant_id::text, c.student_id::text, st.full_name,
  COALESCE(cl.name, ''), c.owner_user_id::text, owner_u.full_name,
  c.status, c.priority, c.title, c.summary, c.sensitivity,
  c.opened_at, c.closed_at, c.created_by::text, c.updated_by::text, c.created_at, c.updated_at
FROM guidance_cases c
JOIN students st ON st.id = c.student_id AND st.tenant_id = c.tenant_id
LEFT JOIN LATERAL (
  SELECT class_id FROM class_students
  WHERE tenant_id = c.tenant_id AND student_id = c.student_id AND ends_on IS NULL
  ORDER BY starts_on DESC LIMIT 1
) cs ON true
LEFT JOIN classes cl ON cl.id = cs.class_id AND cl.tenant_id = c.tenant_id
JOIN users owner_u ON owner_u.id = c.owner_user_id
WHERE c.tenant_id = $1 AND c.id = $2::uuid AND c.deleted_at IS NULL`, tenantID, caseID)
	var item guidancedomain.Case
	var status, priority string
	var closedAt sql.NullTime
	if err := row.Scan(
		&item.ID, &item.TenantID, &item.StudentID, &item.StudentName, &item.ClassName,
		&item.OwnerUserID, &item.OwnerName, &status, &priority, &item.Title, &item.Summary, &item.Sensitivity,
		&item.OpenedAt, &closedAt, &item.CreatedBy, &item.UpdatedBy, &item.CreatedAt, &item.UpdatedAt,
	); err != nil {
		return guidancedomain.Case{}, false
	}
	item.Status = guidancedomain.CaseStatus(status)
	item.Priority = guidancedomain.CasePriority(priority)
	if closedAt.Valid {
		item.ClosedAt = &closedAt.Time
	}
	return item, true
}

func (s *Store) CreateGuidanceCase(ctx context.Context, tenantID, ownerUserID string, input guidancedomain.CreateCaseInput) (guidancedomain.Case, bool) {
	var item guidancedomain.Case
	var closedAt sql.NullTime
	err := s.db.QueryRowContext(ctx, `
INSERT INTO guidance_cases (
  tenant_id, student_id, owner_user_id, status, priority, title, summary, sensitivity, created_by, updated_by
) VALUES ($1, $2::uuid, $3::uuid, 'open', $4, $5, $6, $7, $3::uuid, $3::uuid)
RETURNING
  id::text, tenant_id::text, student_id::text, owner_user_id::text,
  status, priority, title, summary, sensitivity, opened_at, closed_at,
  created_by::text, updated_by::text, created_at, updated_at`,
		tenantID, input.StudentID, ownerUserID, string(input.Priority), input.Title, input.Summary, input.Sensitivity,
	).Scan(
		&item.ID, &item.TenantID, &item.StudentID, &item.OwnerUserID,
		&item.Status, &item.Priority, &item.Title, &item.Summary, &item.Sensitivity, &item.OpenedAt, &closedAt,
		&item.CreatedBy, &item.UpdatedBy, &item.CreatedAt, &item.UpdatedAt,
	)
	if err != nil {
		return guidancedomain.Case{}, false
	}
	_ = s.db.QueryRowContext(ctx, `SELECT full_name FROM students WHERE tenant_id = $1 AND id = $2::uuid`, tenantID, item.StudentID).Scan(&item.StudentName)
	_ = s.db.QueryRowContext(ctx, `SELECT full_name FROM users WHERE id = $1::uuid`, item.OwnerUserID).Scan(&item.OwnerName)
	_ = s.db.QueryRowContext(ctx, `
SELECT COALESCE(c.name, '')
FROM class_students cs
LEFT JOIN classes c ON c.id = cs.class_id AND c.tenant_id = cs.tenant_id
WHERE cs.tenant_id = $1 AND cs.student_id = $2::uuid AND cs.ends_on IS NULL
ORDER BY cs.starts_on DESC LIMIT 1`, tenantID, item.StudentID).Scan(&item.ClassName)
	if closedAt.Valid {
		item.ClosedAt = &closedAt.Time
	}
	return item, true
}

func (s *Store) UpdateGuidanceCase(ctx context.Context, tenantID, caseID, actorUserID string, input guidancedomain.UpdateCaseInput) (guidancedomain.Case, bool) {
	current, ok := s.GetGuidanceCase(ctx, tenantID, caseID)
	if !ok {
		return guidancedomain.Case{}, false
	}
	if input.Title != nil {
		current.Title = strings.TrimSpace(*input.Title)
	}
	if input.Summary != nil {
		current.Summary = strings.TrimSpace(*input.Summary)
	}
	if input.Status != nil {
		current.Status = *input.Status
	}
	if input.Priority != nil {
		current.Priority = *input.Priority
	}
	if input.Sensitivity != nil {
		current.Sensitivity = strings.TrimSpace(*input.Sensitivity)
	}
	if input.OwnerUserID != nil && strings.TrimSpace(*input.OwnerUserID) != "" {
		current.OwnerUserID = strings.TrimSpace(*input.OwnerUserID)
	}
	_, err := s.db.ExecContext(ctx, `
UPDATE guidance_cases
SET title = $3, summary = $4, status = $5, priority = $6, sensitivity = $7,
    owner_user_id = $8::uuid, updated_by = $9::uuid, updated_at = now()
WHERE tenant_id = $1 AND id = $2::uuid AND deleted_at IS NULL`,
		tenantID, caseID, current.Title, current.Summary, string(current.Status), string(current.Priority),
		current.Sensitivity, current.OwnerUserID, actorUserID,
	)
	if err != nil {
		return guidancedomain.Case{}, false
	}
	return s.GetGuidanceCase(ctx, tenantID, caseID)
}

func (s *Store) CloseGuidanceCase(ctx context.Context, tenantID, caseID, actorUserID string, closedAt time.Time) (guidancedomain.Case, bool) {
	_, err := s.db.ExecContext(ctx, `
UPDATE guidance_cases
SET status = 'closed', closed_at = $4, updated_by = $3::uuid, updated_at = now()
WHERE tenant_id = $1 AND id = $2::uuid AND deleted_at IS NULL`, tenantID, caseID, actorUserID, closedAt)
	if err != nil {
		return guidancedomain.Case{}, false
	}
	return s.GetGuidanceCase(ctx, tenantID, caseID)
}

func (s *Store) ReopenGuidanceCase(ctx context.Context, tenantID, caseID, actorUserID string) (guidancedomain.Case, bool) {
	_, err := s.db.ExecContext(ctx, `
UPDATE guidance_cases
SET status = 'monitoring', closed_at = NULL, updated_by = $3::uuid, updated_at = now()
WHERE tenant_id = $1 AND id = $2::uuid AND deleted_at IS NULL`, tenantID, caseID, actorUserID)
	if err != nil {
		return guidancedomain.Case{}, false
	}
	return s.GetGuidanceCase(ctx, tenantID, caseID)
}

func (s *Store) ListGuidanceCaseEvents(ctx context.Context, tenantID, caseID string) ([]guidancedomain.CaseEvent, error) {
	rows, err := s.db.QueryContext(ctx, `
SELECT
  e.id::text, e.tenant_id::text, e.case_id::text, e.event_type, e.title, e.body,
  e.actor_user_id::text, u.full_name, e.visibility, e.occurred_at, e.created_at, e.updated_at
FROM guidance_case_events e
JOIN users u ON u.id = e.actor_user_id
WHERE e.tenant_id = $1 AND e.case_id = $2::uuid AND e.deleted_at IS NULL
ORDER BY e.occurred_at DESC`, tenantID, caseID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := make([]guidancedomain.CaseEvent, 0)
	for rows.Next() {
		var item guidancedomain.CaseEvent
		var eventType, visibility string
		if err := rows.Scan(
			&item.ID, &item.TenantID, &item.CaseID, &eventType, &item.Title, &item.Body,
			&item.ActorUserID, &item.ActorName, &visibility, &item.OccurredAt, &item.CreatedAt, &item.UpdatedAt,
		); err != nil {
			return nil, err
		}
		item.EventType = guidancedomain.CaseEventType(eventType)
		item.Visibility = guidancedomain.CaseEventVisibility(visibility)
		out = append(out, item)
	}
	return out, rows.Err()
}

func (s *Store) GetGuidanceCaseEvent(ctx context.Context, tenantID, caseID, eventID string) (guidancedomain.CaseEvent, bool) {
	items, err := s.ListGuidanceCaseEvents(ctx, tenantID, caseID)
	if err != nil {
		return guidancedomain.CaseEvent{}, false
	}
	for _, item := range items {
		if item.ID == eventID {
			return item, true
		}
	}
	return guidancedomain.CaseEvent{}, false
}

func (s *Store) CreateGuidanceCaseEvent(ctx context.Context, tenantID, caseID, actorUserID string, input guidancedomain.CreateCaseEventInput) (guidancedomain.CaseEvent, bool) {
	occurredAt := time.Now()
	if input.OccurredAt != nil {
		occurredAt = *input.OccurredAt
	}
	var item guidancedomain.CaseEvent
	var eventType, visibility string
	err := s.db.QueryRowContext(ctx, `
INSERT INTO guidance_case_events (
  tenant_id, case_id, event_type, title, body, actor_user_id, visibility, occurred_at
) VALUES ($1, $2::uuid, $3, $4, $5, $6::uuid, $7, $8)
RETURNING id::text, tenant_id::text, case_id::text, event_type, title, body,
          actor_user_id::text, visibility, occurred_at, created_at, updated_at`,
		tenantID, caseID, string(input.EventType), input.Title, input.Body, actorUserID, string(input.Visibility), occurredAt,
	).Scan(
		&item.ID, &item.TenantID, &item.CaseID, &eventType, &item.Title, &item.Body,
		&item.ActorUserID, &visibility, &item.OccurredAt, &item.CreatedAt, &item.UpdatedAt,
	)
	if err != nil {
		return guidancedomain.CaseEvent{}, false
	}
	item.EventType = guidancedomain.CaseEventType(eventType)
	item.Visibility = guidancedomain.CaseEventVisibility(visibility)
	_ = s.db.QueryRowContext(ctx, `SELECT full_name FROM users WHERE id = $1::uuid`, item.ActorUserID).Scan(&item.ActorName)
	return item, true
}

func (s *Store) UpdateGuidanceCaseEvent(ctx context.Context, tenantID, caseID, eventID string, input guidancedomain.UpdateCaseEventInput) (guidancedomain.CaseEvent, bool) {
	current, ok := s.GetGuidanceCaseEvent(ctx, tenantID, caseID, eventID)
	if !ok {
		return guidancedomain.CaseEvent{}, false
	}
	if input.EventType != nil {
		current.EventType = *input.EventType
	}
	if input.Title != nil {
		current.Title = strings.TrimSpace(*input.Title)
	}
	if input.Body != nil {
		current.Body = strings.TrimSpace(*input.Body)
	}
	if input.Visibility != nil {
		current.Visibility = *input.Visibility
	}
	if input.OccurredAt != nil {
		current.OccurredAt = *input.OccurredAt
	}
	_, err := s.db.ExecContext(ctx, `
UPDATE guidance_case_events
SET event_type = $4, title = $5, body = $6, visibility = $7, occurred_at = $8, updated_at = now()
WHERE tenant_id = $1 AND case_id = $2::uuid AND id = $3::uuid AND deleted_at IS NULL`,
		tenantID, caseID, eventID, string(current.EventType), current.Title, current.Body, string(current.Visibility), current.OccurredAt,
	)
	if err != nil {
		return guidancedomain.CaseEvent{}, false
	}
	return s.GetGuidanceCaseEvent(ctx, tenantID, caseID, eventID)
}

func (s *Store) DeleteGuidanceCaseEvent(ctx context.Context, tenantID, caseID, eventID string) bool {
	res, err := s.db.ExecContext(ctx, `
UPDATE guidance_case_events SET deleted_at = now(), updated_at = now()
WHERE tenant_id = $1 AND case_id = $2::uuid AND id = $3::uuid AND deleted_at IS NULL`, tenantID, caseID, eventID)
	if err != nil {
		return false
	}
	n, _ := res.RowsAffected()
	return n > 0
}
