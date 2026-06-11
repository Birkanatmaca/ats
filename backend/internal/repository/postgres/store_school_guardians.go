package postgres

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"strings"

	schooldomain "ots/backend/internal/domain/school"
)

type managedGuardianStudentRow struct {
	StudentID    string `json:"studentId"`
	StudentName  string `json:"studentName"`
	ClassName    string `json:"className"`
	SchoolNumber string `json:"schoolNumber"`
	Relation     string `json:"relation"`
	IsPrimary    bool   `json:"isPrimary"`
}

func (s *Store) ListManagedGuardians(ctx context.Context, tenantID string) ([]schooldomain.ManagedGuardian, error) {
	rows, err := s.db.QueryContext(ctx, managedGuardianSelectSQL+`
WHERE g.tenant_id = $1
GROUP BY g.id, g.tenant_id, g.user_id, g.full_name, g.email, g.phone, g.created_at, u.is_active, u.must_change_password, tm.status
ORDER BY g.full_name`, tenantID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanManagedGuardianRows(rows)
}

func (s *Store) GetManagedGuardian(ctx context.Context, tenantID, guardianID string) (schooldomain.ManagedGuardian, bool) {
	row := s.db.QueryRowContext(ctx, managedGuardianSelectSQL+`
WHERE g.tenant_id = $1 AND g.id = $2::uuid
GROUP BY g.id, g.tenant_id, g.user_id, g.full_name, g.email, g.phone, g.created_at, u.is_active, u.must_change_password, tm.status`, tenantID, guardianID)
	item, ok := scanManagedGuardianRow(row)
	return item, ok
}

func (s *Store) UpdateManagedGuardian(ctx context.Context, tenantID, guardianID string, input schooldomain.UpdateManagedGuardianInput) (schooldomain.ManagedGuardian, error) {
	current, ok := s.GetManagedGuardian(ctx, tenantID, guardianID)
	if !ok {
		return schooldomain.ManagedGuardian{}, schooldomain.ErrGuardianNotFound
	}

	fullName := current.FullName
	if input.FirstName != nil || input.LastName != nil {
		first := current.FirstName
		last := current.LastName
		if input.FirstName != nil {
			first = strings.TrimSpace(*input.FirstName)
		}
		if input.LastName != nil {
			last = strings.TrimSpace(*input.LastName)
		}
		fullName = schooldomain.JoinFullName(first, last)
		if fullName == "" {
			return schooldomain.ManagedGuardian{}, schooldomain.ErrInvalidInput
		}
		_, err := s.db.ExecContext(ctx, `UPDATE users SET full_name = $1, updated_at = now() WHERE id = $2::uuid`, fullName, current.UserID)
		if err != nil {
			return schooldomain.ManagedGuardian{}, err
		}
	}

	phone := current.Phone
	if input.Phone != nil {
		phone = strings.TrimSpace(*input.Phone)
	}
	_, err := s.db.ExecContext(ctx, `
UPDATE guardians
SET full_name = $1, phone = $2
WHERE tenant_id = $3 AND id = $4::uuid`, fullName, phone, tenantID, guardianID)
	if err != nil {
		return schooldomain.ManagedGuardian{}, err
	}
	updated, ok := s.GetManagedGuardian(ctx, tenantID, guardianID)
	if !ok {
		return schooldomain.ManagedGuardian{}, schooldomain.ErrGuardianNotFound
	}
	return updated, nil
}

func (s *Store) SetManagedGuardianStatus(ctx context.Context, tenantID, guardianID, status string) (schooldomain.ManagedGuardian, error) {
	current, ok := s.GetManagedGuardian(ctx, tenantID, guardianID)
	if !ok {
		return schooldomain.ManagedGuardian{}, schooldomain.ErrGuardianNotFound
	}
	isActive := status == "active"
	membershipStatus := "active"
	if !isActive {
		membershipStatus = "passive"
	}
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return schooldomain.ManagedGuardian{}, err
	}
	defer func() { _ = tx.Rollback() }()

	if _, err := tx.ExecContext(ctx, `UPDATE users SET is_active = $1, updated_at = now() WHERE id = $2::uuid`, isActive, current.UserID); err != nil {
		return schooldomain.ManagedGuardian{}, err
	}
	if _, err := tx.ExecContext(ctx, `
UPDATE tenant_memberships
SET status = $1
WHERE tenant_id = $2 AND user_id = $3::uuid`, membershipStatus, tenantID, current.UserID); err != nil {
		return schooldomain.ManagedGuardian{}, err
	}
	if err := tx.Commit(); err != nil {
		return schooldomain.ManagedGuardian{}, err
	}
	updated, ok := s.GetManagedGuardian(ctx, tenantID, guardianID)
	if !ok {
		return schooldomain.ManagedGuardian{}, schooldomain.ErrGuardianNotFound
	}
	return updated, nil
}

func (s *Store) ResetManagedGuardianPassword(ctx context.Context, tenantID, guardianID string) (string, error) {
	current, ok := s.GetManagedGuardian(ctx, tenantID, guardianID)
	if !ok {
		return "", schooldomain.ErrGuardianNotFound
	}
	tempPassword, err := temporaryPassword()
	if err != nil {
		return "", err
	}
	passwordHash, err := hashPassword(tempPassword)
	if err != nil {
		return "", err
	}
	res, err := s.db.ExecContext(ctx, `
UPDATE users SET password_hash = $1, must_change_password = true, updated_at = now()
WHERE id = $2::uuid`, passwordHash, current.UserID)
	if err != nil {
		return "", err
	}
	rows, _ := res.RowsAffected()
	if rows == 0 {
		return "", schooldomain.ErrGuardianNotFound
	}
	return tempPassword, nil
}

func (s *Store) LinkManagedGuardianStudent(ctx context.Context, tenantID, guardianID string, input schooldomain.LinkManagedGuardianStudentInput) (schooldomain.ManagedGuardian, error) {
	current, ok := s.GetManagedGuardian(ctx, tenantID, guardianID)
	if !ok {
		return schooldomain.ManagedGuardian{}, schooldomain.ErrGuardianNotFound
	}
	studentID := strings.TrimSpace(input.StudentID)
	var exists bool
	if err := s.db.QueryRowContext(ctx, `
SELECT EXISTS (SELECT 1 FROM students WHERE tenant_id = $1 AND id = $2::uuid AND deleted_at IS NULL)`, tenantID, studentID).Scan(&exists); err != nil || !exists {
		return schooldomain.ManagedGuardian{}, schooldomain.ErrStudentNotFound
	}
	for _, student := range current.Students {
		if student.StudentID == studentID {
			return schooldomain.ManagedGuardian{}, schooldomain.ErrGuardianLinkExists
		}
	}
	relation := strings.TrimSpace(input.Relation)
	if relation == "" {
		relation = "Veli"
	}
	isPrimary := false
	if input.IsPrimary != nil {
		isPrimary = *input.IsPrimary
	}
	if isPrimary {
		if _, err := s.db.ExecContext(ctx, `
UPDATE student_guardians SET is_primary = false
WHERE tenant_id = $1 AND student_id = $2::uuid`, tenantID, studentID); err != nil {
			return schooldomain.ManagedGuardian{}, err
		}
	}
	_, err := s.db.ExecContext(ctx, `
INSERT INTO student_guardians (tenant_id, student_id, guardian_id, relation, is_primary)
VALUES ($1, $2::uuid, $3::uuid, $4, $5)
ON CONFLICT (tenant_id, student_id, guardian_id) DO NOTHING`, tenantID, studentID, guardianID, relation, isPrimary)
	if err != nil {
		return schooldomain.ManagedGuardian{}, err
	}
	updated, ok := s.GetManagedGuardian(ctx, tenantID, guardianID)
	if !ok {
		return schooldomain.ManagedGuardian{}, schooldomain.ErrGuardianNotFound
	}
	return updated, nil
}

func (s *Store) UnlinkManagedGuardianStudent(ctx context.Context, tenantID, guardianID, studentID string) (schooldomain.ManagedGuardian, error) {
	if _, ok := s.GetManagedGuardian(ctx, tenantID, guardianID); !ok {
		return schooldomain.ManagedGuardian{}, schooldomain.ErrGuardianNotFound
	}
	if _, err := s.db.ExecContext(ctx, `
DELETE FROM student_guardians
WHERE tenant_id = $1 AND guardian_id = $2::uuid AND student_id = $3::uuid`, tenantID, guardianID, studentID); err != nil {
		return schooldomain.ManagedGuardian{}, err
	}
	updated, ok := s.GetManagedGuardian(ctx, tenantID, guardianID)
	if !ok {
		return schooldomain.ManagedGuardian{}, schooldomain.ErrGuardianNotFound
	}
	return updated, nil
}

const managedGuardianSelectSQL = `
SELECT
	g.id::text,
	g.tenant_id::text,
	g.user_id::text,
	g.email,
	g.full_name,
	COALESCE(g.phone, ''),
	g.created_at,
	u.is_active,
	u.must_change_password,
	tm.status,
	COALESCE(
		json_agg(
			json_build_object(
				'studentId', s.id::text,
				'studentName', s.full_name,
				'className', COALESCE(c.name, ''),
				'schoolNumber', s.student_number,
				'relation', sg.relation,
				'isPrimary', sg.is_primary
			)
			ORDER BY s.full_name
		) FILTER (WHERE s.id IS NOT NULL),
		'[]'::json
	) AS students
FROM guardians g
JOIN users u ON u.id = g.user_id
JOIN tenant_memberships tm ON tm.user_id = g.user_id AND tm.tenant_id = g.tenant_id
LEFT JOIN student_guardians sg ON sg.tenant_id = g.tenant_id AND sg.guardian_id = g.id
LEFT JOIN students s ON s.id = sg.student_id AND s.tenant_id = sg.tenant_id AND s.deleted_at IS NULL
LEFT JOIN LATERAL (
	SELECT cs.class_id
	FROM class_students cs
	WHERE cs.tenant_id = s.tenant_id AND cs.student_id = s.id AND (cs.ends_on IS NULL OR cs.ends_on >= CURRENT_DATE)
	ORDER BY cs.starts_on DESC NULLS LAST
	LIMIT 1
) active_class ON true
LEFT JOIN classes c ON c.id = active_class.class_id AND c.tenant_id = s.tenant_id
`

func scanManagedGuardianRows(rows *sql.Rows) ([]schooldomain.ManagedGuardian, error) {
	out := make([]schooldomain.ManagedGuardian, 0)
	for rows.Next() {
		item, ok := scanManagedGuardianFromScanner(rows)
		if !ok {
			continue
		}
		out = append(out, item)
	}
	return out, rows.Err()
}

func scanManagedGuardianRow(row *sql.Row) (schooldomain.ManagedGuardian, bool) {
	item, ok := scanManagedGuardianFromScanner(row)
	return item, ok
}

type managedGuardianScanner interface {
	Scan(dest ...any) error
}

func scanManagedGuardianFromScanner(scanner managedGuardianScanner) (schooldomain.ManagedGuardian, bool) {
	var (
		item             schooldomain.ManagedGuardian
		fullName         string
		isActive         bool
		membershipStatus string
		studentsJSON     []byte
	)
	if err := scanner.Scan(
		&item.ID,
		&item.TenantID,
		&item.UserID,
		&item.Email,
		&fullName,
		&item.Phone,
		&item.CreatedAt,
		&isActive,
		&item.MustChangePassword,
		&membershipStatus,
		&studentsJSON,
	); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return schooldomain.ManagedGuardian{}, false
		}
		return schooldomain.ManagedGuardian{}, false
	}
	item.FirstName, item.LastName = splitFullName(fullName)
	item.FullName = fullName
	item.Status = managedGuardianStatus(isActive, membershipStatus)
	item.Students = make([]schooldomain.ManagedGuardianStudent, 0)
	if len(studentsJSON) > 0 {
		var rows []managedGuardianStudentRow
		if err := json.Unmarshal(studentsJSON, &rows); err == nil {
			for _, row := range rows {
				item.Students = append(item.Students, schooldomain.ManagedGuardianStudent(row))
			}
		}
	}
	return item, true
}

func managedGuardianStatus(isActive bool, membershipStatus string) string {
	if !isActive || strings.EqualFold(strings.TrimSpace(membershipStatus), "passive") {
		return "passive"
	}
	return "active"
}
