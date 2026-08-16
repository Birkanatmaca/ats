package postgres

import (
	"context"
	"database/sql"
	"strings"
	"time"

	guidancedomain "ots/backend/internal/domain/guidance"
)

func (s *Store) GuidanceCanAccessStudent(ctx context.Context, tenantID, userID, studentID string) bool {
	if allowed, checked := s.userCanAccessStudentViaScopes(ctx, tenantID, userID, studentID); checked {
		return allowed
	}
	if s.userRequiresGuidanceScope(ctx, tenantID, userID) {
		return false
	}
	var exists bool
	err := s.db.QueryRowContext(ctx, `
SELECT EXISTS (
  SELECT 1 FROM students
  WHERE tenant_id = $1 AND id = $2::uuid AND deleted_at IS NULL
)`, tenantID, studentID).Scan(&exists)
	return err == nil && exists
}

func (s *Store) userRequiresGuidanceScope(ctx context.Context, tenantID, userID string) bool {
	var hasElevated bool
	_ = s.db.QueryRowContext(ctx, `
SELECT EXISTS (
  SELECT 1 FROM user_roles ur
  JOIN roles r ON r.id = ur.role_id
  WHERE ur.tenant_id = $1 AND ur.user_id = $2::uuid
    AND r.code IN ('super_admin', 'system_admin', 'principal')
)`, tenantID, userID).Scan(&hasElevated)
	if hasElevated {
		return false
	}
	var hasGuidance bool
	_ = s.db.QueryRowContext(ctx, `
SELECT EXISTS (
  SELECT 1 FROM user_roles ur
  JOIN roles r ON r.id = ur.role_id
  WHERE ur.tenant_id = $1 AND ur.user_id = $2::uuid AND r.code = 'guidance'
)`, tenantID, userID).Scan(&hasGuidance)
	return hasGuidance
}

func (s *Store) ListGuidanceStudents(ctx context.Context, tenantID, userID string) ([]guidancedomain.Student, error) {
	rows, err := s.db.QueryContext(ctx, `
SELECT
  s.id::text,
  s.student_number,
  s.full_name,
  COALESCE(cs.class_id::text, ''),
  COALESCE(c.name, ''),
  s.status
FROM students s
LEFT JOIN LATERAL (
  SELECT class_id FROM class_students
  WHERE tenant_id = s.tenant_id AND student_id = s.id AND ends_on IS NULL
  ORDER BY starts_on DESC LIMIT 1
) cs ON true
LEFT JOIN classes c ON c.id = cs.class_id AND c.tenant_id = s.tenant_id
WHERE s.tenant_id = $1 AND s.deleted_at IS NULL
ORDER BY c.name NULLS LAST, s.full_name`, tenantID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []guidancedomain.Student
	for rows.Next() {
		var item guidancedomain.Student
		var fullName, status string
		if err := rows.Scan(&item.ID, &item.SchoolNumber, &fullName, &item.ClassID, &item.ClassName, &status); err != nil {
			return nil, err
		}
		item.FirstName, item.LastName = splitFullName(fullName)
		item.FullName = fullName
		item.Status = status
		if s.GuidanceCanAccessStudent(ctx, tenantID, userID, item.ID) {
			out = append(out, item)
		}
	}
	return out, rows.Err()
}

func (s *Store) ListGuidanceNotes(ctx context.Context, tenantID, studentID string) ([]guidancedomain.Note, error) {
	query := `
SELECT
  n.id::text, n.tenant_id::text, n.student_id::text, s.full_name,
  COALESCE(c.name, ''), n.author_id::text, u.full_name,
  n.note_type, n.title, n.body, n.sensitivity, n.created_at, n.updated_at
FROM guidance_notes n
JOIN students s ON s.id = n.student_id AND s.tenant_id = n.tenant_id
LEFT JOIN LATERAL (
  SELECT class_id FROM class_students
  WHERE tenant_id = n.tenant_id AND student_id = n.student_id AND ends_on IS NULL
  ORDER BY starts_on DESC LIMIT 1
) cs ON true
LEFT JOIN classes c ON c.id = cs.class_id AND c.tenant_id = n.tenant_id
JOIN users u ON u.id = n.author_id
WHERE n.tenant_id = $1 AND n.deleted_at IS NULL`
	args := []any{tenantID}
	if strings.TrimSpace(studentID) != "" {
		query += ` AND n.student_id = $2::uuid`
		args = append(args, studentID)
	}
	query += ` ORDER BY n.created_at DESC`

	rows, err := s.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanGuidanceNotes(rows)
}

func scanGuidanceNotes(rows *sql.Rows) ([]guidancedomain.Note, error) {
	out := make([]guidancedomain.Note, 0)
	for rows.Next() {
		var item guidancedomain.Note
		var noteType string
		if err := rows.Scan(
			&item.ID, &item.TenantID, &item.StudentID, &item.StudentName, &item.ClassName,
			&item.AuthorID, &item.AuthorName, &noteType, &item.Title, &item.Body,
			&item.Sensitivity, &item.CreatedAt, &item.UpdatedAt,
		); err != nil {
			return nil, err
		}
		item.NoteType = guidancedomain.NoteType(noteType)
		out = append(out, item)
	}
	return out, rows.Err()
}

func (s *Store) GetGuidanceNote(ctx context.Context, tenantID, noteID string) (guidancedomain.Note, bool) {
	rows, err := s.db.QueryContext(ctx, `
SELECT
  n.id::text, n.tenant_id::text, n.student_id::text, s.full_name,
  COALESCE(c.name, ''), n.author_id::text, u.full_name,
  n.note_type, n.title, n.body, n.sensitivity, n.created_at, n.updated_at
FROM guidance_notes n
JOIN students s ON s.id = n.student_id AND s.tenant_id = n.tenant_id
LEFT JOIN LATERAL (
  SELECT class_id FROM class_students
  WHERE tenant_id = n.tenant_id AND student_id = n.student_id AND ends_on IS NULL
  ORDER BY starts_on DESC LIMIT 1
) cs ON true
LEFT JOIN classes c ON c.id = cs.class_id AND c.tenant_id = n.tenant_id
JOIN users u ON u.id = n.author_id
WHERE n.tenant_id = $1 AND n.id = $2::uuid AND n.deleted_at IS NULL`, tenantID, noteID)
	if err != nil {
		return guidancedomain.Note{}, false
	}
	defer rows.Close()
	items, err := scanGuidanceNotes(rows)
	if err != nil || len(items) == 0 {
		return guidancedomain.Note{}, false
	}
	return items[0], true
}

func (s *Store) CreateGuidanceNote(ctx context.Context, tenantID, authorID string, input guidancedomain.CreateNoteInput) (guidancedomain.Note, bool) {
	var noteID string
	err := s.db.QueryRowContext(ctx, `
INSERT INTO guidance_notes (tenant_id, student_id, author_id, note_type, title, body)
VALUES ($1, $2::uuid, $3::uuid, $4, $5, $6)
RETURNING id::text`,
		tenantID, input.StudentID, authorID, string(input.NoteType), input.Title, input.Body).Scan(&noteID)
	if err != nil {
		return guidancedomain.Note{}, false
	}
	return s.GetGuidanceNote(ctx, tenantID, noteID)
}

func (s *Store) UpdateGuidanceNote(ctx context.Context, tenantID, noteID string, input guidancedomain.UpdateNoteInput) (guidancedomain.Note, bool) {
	current, ok := s.GetGuidanceNote(ctx, tenantID, noteID)
	if !ok {
		return guidancedomain.Note{}, false
	}
	noteType := string(current.NoteType)
	title := current.Title
	body := current.Body
	if input.NoteType != nil {
		noteType = string(*input.NoteType)
	}
	if input.Title != nil {
		title = *input.Title
	}
	if input.Body != nil {
		body = *input.Body
	}
	_, err := s.db.ExecContext(ctx, `
UPDATE guidance_notes SET note_type = $3, title = $4, body = $5, updated_at = now()
WHERE tenant_id = $1 AND id = $2::uuid AND deleted_at IS NULL`,
		tenantID, noteID, noteType, title, body)
	if err != nil {
		return guidancedomain.Note{}, false
	}
	return s.GetGuidanceNote(ctx, tenantID, noteID)
}

func (s *Store) DeleteGuidanceNote(ctx context.Context, tenantID, noteID string) bool {
	res, err := s.db.ExecContext(ctx, `
UPDATE guidance_notes SET deleted_at = now(), updated_at = now()
WHERE tenant_id = $1 AND id = $2::uuid AND deleted_at IS NULL`, tenantID, noteID)
	if err != nil {
		return false
	}
	n, _ := res.RowsAffected()
	return n > 0
}

func (s *Store) ListSupportPlans(ctx context.Context, tenantID, studentID string) ([]guidancedomain.SupportPlan, error) {
	query := `
SELECT
  p.id::text, p.tenant_id::text, p.student_id::text, s.full_name,
  COALESCE(c.name, ''), p.owner_id::text, u.full_name,
  p.title, p.description, p.status,
  COALESCE(p.due_date::text, ''), p.created_at, p.updated_at
FROM support_plans p
JOIN students s ON s.id = p.student_id AND s.tenant_id = p.tenant_id
LEFT JOIN LATERAL (
  SELECT class_id FROM class_students
  WHERE tenant_id = p.tenant_id AND student_id = p.student_id AND ends_on IS NULL
  ORDER BY starts_on DESC LIMIT 1
) cs ON true
LEFT JOIN classes c ON c.id = cs.class_id AND c.tenant_id = p.tenant_id
JOIN users u ON u.id = p.owner_id
WHERE p.tenant_id = $1 AND p.deleted_at IS NULL`
	args := []any{tenantID}
	if strings.TrimSpace(studentID) != "" {
		query += ` AND p.student_id = $2::uuid`
		args = append(args, studentID)
	}
	query += ` ORDER BY p.due_date NULLS LAST, p.updated_at DESC`

	rows, err := s.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanSupportPlans(rows)
}

func scanSupportPlans(rows *sql.Rows) ([]guidancedomain.SupportPlan, error) {
	out := make([]guidancedomain.SupportPlan, 0)
	for rows.Next() {
		var item guidancedomain.SupportPlan
		var status string
		if err := rows.Scan(
			&item.ID, &item.TenantID, &item.StudentID, &item.StudentName, &item.ClassName,
			&item.OwnerID, &item.OwnerName, &item.Title, &item.Description, &status,
			&item.DueDate, &item.CreatedAt, &item.UpdatedAt,
		); err != nil {
			return nil, err
		}
		item.Status = guidancedomain.PlanStatus(status)
		out = append(out, item)
	}
	return out, rows.Err()
}

func (s *Store) GetSupportPlan(ctx context.Context, tenantID, planID string) (guidancedomain.SupportPlan, bool) {
	rows, err := s.db.QueryContext(ctx, `
SELECT
  p.id::text, p.tenant_id::text, p.student_id::text, s.full_name,
  COALESCE(c.name, ''), p.owner_id::text, u.full_name,
  p.title, p.description, p.status,
  COALESCE(p.due_date::text, ''), p.created_at, p.updated_at
FROM support_plans p
JOIN students s ON s.id = p.student_id AND s.tenant_id = p.tenant_id
LEFT JOIN LATERAL (
  SELECT class_id FROM class_students
  WHERE tenant_id = p.tenant_id AND student_id = p.student_id AND ends_on IS NULL
  ORDER BY starts_on DESC LIMIT 1
) cs ON true
LEFT JOIN classes c ON c.id = cs.class_id AND c.tenant_id = p.tenant_id
JOIN users u ON u.id = p.owner_id
WHERE p.tenant_id = $1 AND p.id = $2::uuid AND p.deleted_at IS NULL`, tenantID, planID)
	if err != nil {
		return guidancedomain.SupportPlan{}, false
	}
	defer rows.Close()
	items, err := scanSupportPlans(rows)
	if err != nil || len(items) == 0 {
		return guidancedomain.SupportPlan{}, false
	}
	return items[0], true
}

func (s *Store) CreateSupportPlan(ctx context.Context, tenantID, ownerID string, input guidancedomain.CreatePlanInput) (guidancedomain.SupportPlan, bool) {
	var planID string
	var dueDate any
	if strings.TrimSpace(input.DueDate) != "" {
		if t, err := time.Parse("2006-01-02", input.DueDate); err == nil {
			dueDate = t
		}
	}
	err := s.db.QueryRowContext(ctx, `
INSERT INTO support_plans (tenant_id, student_id, owner_id, title, description, status, due_date)
VALUES ($1, $2::uuid, $3::uuid, $4, $5, $6, $7)
RETURNING id::text`,
		tenantID, input.StudentID, ownerID, input.Title, input.Description, string(input.Status), dueDate).Scan(&planID)
	if err != nil {
		return guidancedomain.SupportPlan{}, false
	}
	return s.GetSupportPlan(ctx, tenantID, planID)
}

func (s *Store) UpdateSupportPlan(ctx context.Context, tenantID, planID string, input guidancedomain.UpdatePlanInput) (guidancedomain.SupportPlan, bool) {
	current, ok := s.GetSupportPlan(ctx, tenantID, planID)
	if !ok {
		return guidancedomain.SupportPlan{}, false
	}
	title := current.Title
	description := current.Description
	status := string(current.Status)
	dueDate := current.DueDate
	if input.Title != nil {
		title = *input.Title
	}
	if input.Description != nil {
		description = *input.Description
	}
	if input.Status != nil {
		status = string(*input.Status)
	}
	if input.DueDate != nil {
		dueDate = *input.DueDate
	}
	var dueVal any
	if strings.TrimSpace(dueDate) != "" {
		if t, err := time.Parse("2006-01-02", dueDate); err == nil {
			dueVal = t
		}
	}
	_, err := s.db.ExecContext(ctx, `
UPDATE support_plans SET title = $3, description = $4, status = $5, due_date = $6, updated_at = now()
WHERE tenant_id = $1 AND id = $2::uuid AND deleted_at IS NULL`,
		tenantID, planID, title, description, status, dueVal)
	if err != nil {
		return guidancedomain.SupportPlan{}, false
	}
	return s.GetSupportPlan(ctx, tenantID, planID)
}

func (s *Store) DeleteSupportPlan(ctx context.Context, tenantID, planID string) bool {
	res, err := s.db.ExecContext(ctx, `
UPDATE support_plans SET deleted_at = now(), updated_at = now()
WHERE tenant_id = $1 AND id = $2::uuid AND deleted_at IS NULL`, tenantID, planID)
	if err != nil {
		return false
	}
	n, _ := res.RowsAffected()
	return n > 0
}

func (s *Store) ListRiskTrackings(ctx context.Context, tenantID, studentID string) ([]guidancedomain.RiskTracking, error) {
	query := `
SELECT
  t.id::text, t.tenant_id::text, t.student_id::text, s.full_name,
  COALESCE(c.name, ''), t.counselor_id::text, u.full_name,
  t.reason, t.created_at, t.updated_at
FROM guidance_risk_trackings t
JOIN students s ON s.id = t.student_id AND s.tenant_id = t.tenant_id
LEFT JOIN LATERAL (
  SELECT class_id FROM class_students
  WHERE tenant_id = t.tenant_id AND student_id = t.student_id AND ends_on IS NULL
  ORDER BY starts_on DESC LIMIT 1
) cs ON true
LEFT JOIN classes c ON c.id = cs.class_id AND c.tenant_id = t.tenant_id
JOIN users u ON u.id = t.counselor_id
WHERE t.tenant_id = $1 AND t.deleted_at IS NULL`
	args := []any{tenantID}
	if strings.TrimSpace(studentID) != "" {
		query += ` AND t.student_id = $2::uuid`
		args = append(args, studentID)
	}
	query += ` ORDER BY t.created_at DESC`

	rows, err := s.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanRiskTrackings(rows)
}

func scanRiskTrackings(rows *sql.Rows) ([]guidancedomain.RiskTracking, error) {
	out := make([]guidancedomain.RiskTracking, 0)
	for rows.Next() {
		var item guidancedomain.RiskTracking
		if err := rows.Scan(
			&item.ID, &item.TenantID, &item.StudentID, &item.StudentName, &item.ClassName,
			&item.CounselorID, &item.CounselorName, &item.Reason, &item.CreatedAt, &item.UpdatedAt,
		); err != nil {
			return nil, err
		}
		out = append(out, item)
	}
	return out, rows.Err()
}

func (s *Store) GetRiskTrackingByStudent(ctx context.Context, tenantID, studentID string) (guidancedomain.RiskTracking, bool) {
	items, err := s.ListRiskTrackings(ctx, tenantID, studentID)
	if err != nil || len(items) == 0 {
		return guidancedomain.RiskTracking{}, false
	}
	return items[0], true
}

func (s *Store) GetRiskTracking(ctx context.Context, tenantID, trackingID string) (guidancedomain.RiskTracking, bool) {
	items, err := s.ListRiskTrackings(ctx, tenantID, "")
	if err != nil {
		return guidancedomain.RiskTracking{}, false
	}
	for _, item := range items {
		if item.ID == trackingID {
			return item, true
		}
	}
	return guidancedomain.RiskTracking{}, false
}

func (s *Store) CreateRiskTracking(ctx context.Context, tenantID, counselorID string, input guidancedomain.CreateRiskTrackingInput) (guidancedomain.RiskTracking, bool) {
	var trackingID string
	err := s.db.QueryRowContext(ctx, `
INSERT INTO guidance_risk_trackings (tenant_id, student_id, counselor_id, reason)
VALUES ($1, $2::uuid, $3::uuid, $4)
RETURNING id::text`,
		tenantID, input.StudentID, counselorID, input.Reason).Scan(&trackingID)
	if err != nil {
		return guidancedomain.RiskTracking{}, false
	}
	item, ok := s.GetRiskTrackingByStudent(ctx, tenantID, input.StudentID)
	if !ok {
		return guidancedomain.RiskTracking{}, false
	}
	return item, trackingID != ""
}

func (s *Store) DeleteRiskTracking(ctx context.Context, tenantID, trackingID string) bool {
	res, err := s.db.ExecContext(ctx, `
UPDATE guidance_risk_trackings SET deleted_at = now(), updated_at = now()
WHERE tenant_id = $1 AND id = $2::uuid AND deleted_at IS NULL`, tenantID, trackingID)
	if err != nil {
		return false
	}
	n, _ := res.RowsAffected()
	return n > 0
}
