package postgres

import (
	"context"
	"database/sql"
	"encoding/json"
	"strings"

	domain "ots/backend/internal/domain/homework"
)

func (s *Store) CreateAssignment(ctx context.Context, item domain.Assignment) (domain.Assignment, error) {
	attachmentsJSON, _ := json.Marshal(item.AttachmentKeys)
	var newID string
	err := s.db.QueryRowContext(ctx, `
INSERT INTO homework_assignments (
    id, tenant_id, class_id, course, title, description, due_date,
    created_by, attachment_keys, created_at, updated_at
) VALUES (
    gen_random_uuid(), $1::uuid, NULLIF($2, '')::uuid, $3, $4, $5, $6::date,
    $7::uuid, $8::jsonb, $9, $9
)
RETURNING id::text`,
		item.TenantID,
		item.ClassID,
		item.Course,
		item.Title,
		item.Description,
		item.DueDate,
		item.CreatedBy,
		string(attachmentsJSON),
		item.CreatedAt,
	).Scan(&newID)
	if err != nil {
		return domain.Assignment{}, err
	}
	item.ID = newID
	return item, nil
}

func (s *Store) ListAssignments(ctx context.Context, tenantID, classID string) ([]domain.Assignment, error) {
	query := `
SELECT
    a.id::text, a.tenant_id::text, COALESCE(a.class_id::text,''), a.course,
    a.title, a.description, a.due_date::text, a.created_by::text,
    a.attachment_keys, a.created_at, a.updated_at,
    COUNT(s.id) AS submission_count
FROM homework_assignments a
LEFT JOIN homework_submissions s ON s.assignment_id = a.id AND s.tenant_id = a.tenant_id
WHERE a.tenant_id = $1`

	args := []any{tenantID}
	if classID != "" {
		query += ` AND a.class_id = $2::uuid`
		args = append(args, classID)
	}
	query += ` GROUP BY a.id ORDER BY a.due_date DESC`

	rows, err := s.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []domain.Assignment
	for rows.Next() {
		item, err := scanAssignmentRow(rows)
		if err != nil {
			continue
		}
		out = append(out, item)
	}
	if out == nil {
		out = []domain.Assignment{}
	}
	return out, rows.Err()
}

func (s *Store) GetAssignment(ctx context.Context, tenantID, assignmentID string) (domain.Assignment, bool, error) {
	row := s.db.QueryRowContext(ctx, `
SELECT
    a.id::text, a.tenant_id::text, COALESCE(a.class_id::text,''), a.course,
    a.title, a.description, a.due_date::text, a.created_by::text,
    a.attachment_keys, a.created_at, a.updated_at,
    COUNT(s.id) AS submission_count
FROM homework_assignments a
LEFT JOIN homework_submissions s ON s.assignment_id = a.id AND s.tenant_id = a.tenant_id
WHERE a.tenant_id = $1 AND a.id = $2::uuid
GROUP BY a.id`, tenantID, assignmentID)

	item, err := scanAssignmentRow(row)
	if err == sql.ErrNoRows {
		return domain.Assignment{}, false, nil
	}
	if err != nil {
		return domain.Assignment{}, false, err
	}
	return item, true, nil
}

func (s *Store) SubmitAssignment(ctx context.Context, sub domain.Submission) (domain.Submission, error) {
	var newID string
	err := s.db.QueryRowContext(ctx, `
INSERT INTO homework_submissions (
    id, tenant_id, assignment_id, student_id, content, file_key, submitted_at, updated_at
) VALUES (
    gen_random_uuid(), $1::uuid, $2::uuid, $3::uuid, $4, $5, $6, $6
)
ON CONFLICT (tenant_id, assignment_id, student_id)
DO UPDATE SET
    content    = EXCLUDED.content,
    file_key   = EXCLUDED.file_key,
    updated_at = now()
RETURNING id::text`,
		sub.TenantID,
		sub.AssignmentID,
		sub.StudentID,
		sub.Content,
		sub.FileKey,
		sub.SubmittedAt,
	).Scan(&newID)
	if err != nil {
		return domain.Submission{}, err
	}
	sub.ID = newID
	return sub, nil
}

func (s *Store) CountSubmissions(ctx context.Context, tenantID, assignmentID string) (int, error) {
	var count int
	err := s.db.QueryRowContext(ctx, `
SELECT COUNT(*) FROM homework_submissions
WHERE tenant_id = $1 AND assignment_id = $2::uuid`, tenantID, assignmentID).Scan(&count)
	return count, err
}

func (s *Store) TeacherCanManageClass(ctx context.Context, tenantID, teacherUserID, classID string) bool {
	var exists bool
	err := s.db.QueryRowContext(ctx, `
SELECT EXISTS (
  SELECT 1
  FROM schedule_lessons sl
  JOIN schedules sch ON sch.id = sl.schedule_id AND sch.tenant_id = sl.tenant_id
  JOIN teachers t ON t.id = sl.teacher_id AND t.tenant_id = sl.tenant_id
  WHERE sl.tenant_id = $1
    AND t.user_id = $2
    AND sch.status = 'published'
    AND sl.class_id = NULLIF($3, '')::uuid
)`, tenantID, teacherUserID, classID).Scan(&exists)
	return err == nil && exists
}

func (s *Store) StudentCurrentClassID(ctx context.Context, tenantID, studentID string) (string, bool) {
	var classID string
	err := s.db.QueryRowContext(ctx, `
SELECT cs.class_id::text
FROM class_students cs
WHERE cs.tenant_id = $1::uuid
  AND cs.student_id = $2::uuid
  AND (cs.ends_on IS NULL OR cs.ends_on >= CURRENT_DATE)
ORDER BY cs.starts_on DESC NULLS LAST
LIMIT 1`, tenantID, studentID).Scan(&classID)
	if err == sql.ErrNoRows {
		return "", false
	}
	if err != nil {
		return "", false
	}
	return classID, true
}

func (s *Store) StudentCanAccessAssignment(ctx context.Context, tenantID, studentID, assignmentID string) bool {
	var exists bool
	err := s.db.QueryRowContext(ctx, `
SELECT EXISTS (
  SELECT 1
  FROM homework_assignments a
  JOIN class_students cs
    ON cs.tenant_id = a.tenant_id
   AND cs.class_id = a.class_id
   AND cs.student_id = $2::uuid
   AND (cs.ends_on IS NULL OR cs.ends_on >= CURRENT_DATE)
  WHERE a.tenant_id = $1::uuid
    AND a.id = $3::uuid
)`, tenantID, studentID, assignmentID).Scan(&exists)
	return err == nil && exists
}

type assignmentScanner interface {
	Scan(dest ...any) error
}

func scanAssignmentRow(row assignmentScanner) (domain.Assignment, error) {
	var item domain.Assignment
	var attachmentsRaw string
	if err := row.Scan(
		&item.ID,
		&item.TenantID,
		&item.ClassID,
		&item.Course,
		&item.Title,
		&item.Description,
		&item.DueDate,
		&item.CreatedBy,
		&attachmentsRaw,
		&item.CreatedAt,
		&item.UpdatedAt,
		&item.SubmissionCount,
	); err != nil {
		return domain.Assignment{}, err
	}
	if err := json.Unmarshal([]byte(attachmentsRaw), &item.AttachmentKeys); err != nil {
		item.AttachmentKeys = []string{}
	}
	if item.AttachmentKeys == nil {
		item.AttachmentKeys = []string{}
	}
	return item, nil
}

// RecordHomeworkAudit satisfies the homework.Repository interface.
func (s *Store) RecordHomeworkAudit(ctx context.Context, tenantID, actorID, action, resourceType, resourceID string) {
	s.RecordOperationalAudit(ctx, tenantID, actorID, action, resourceType, strings.TrimSpace(resourceID), "{}")
}
