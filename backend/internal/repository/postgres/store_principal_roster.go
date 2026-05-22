package postgres

import (
	"context"
	"database/sql"
	"strings"

	schooldomain "ots/backend/internal/domain/school"
)

func (s *Store) PrincipalRoster(ctx context.Context, tenantID string) (schooldomain.PrincipalRoster, error) {
	classes, err := s.listPrincipalClasses(ctx, tenantID)
	if err != nil {
		return schooldomain.PrincipalRoster{}, err
	}
	students, err := s.listPrincipalStudents(ctx, tenantID)
	if err != nil {
		return schooldomain.PrincipalRoster{}, err
	}
	sections := make([]schooldomain.PrincipalRosterSection, 0, len(classes))
	for _, class := range classes {
		sections = append(sections, schooldomain.PrincipalRosterSection{
			ID:         defaultSectionID(class.ID),
			ClassID:    class.ID,
			Name:       "A",
			GradeLevel: "",
			Advisor:    "",
			Capacity:   40,
			CreatedAt:  class.CreatedAt,
		})
	}
	for i := range students {
		if students[i].ClassID != "" && students[i].SectionID == "" {
			students[i].SectionID = defaultSectionID(students[i].ClassID)
		}
	}
	return schooldomain.PrincipalRoster{
		Classes:  classes,
		Sections: sections,
		Students: students,
	}, nil
}

func defaultSectionID(classID string) string {
	return classID + "-default"
}

func (s *Store) listPrincipalClasses(ctx context.Context, tenantID string) ([]schooldomain.PrincipalRosterClass, error) {
	const query = `
SELECT id::text, name, created_at
FROM classes
WHERE tenant_id = $1 AND deleted_at IS NULL
ORDER BY name`

	rows, err := s.db.QueryContext(ctx, query, tenantID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := []schooldomain.PrincipalRosterClass{}
	for rows.Next() {
		var item schooldomain.PrincipalRosterClass
		if err := rows.Scan(&item.ID, &item.Name, &item.CreatedAt); err != nil {
			return nil, err
		}
		out = append(out, item)
	}
	return out, rows.Err()
}

func (s *Store) listPrincipalStudents(ctx context.Context, tenantID string) ([]schooldomain.PrincipalRosterStudent, error) {
	const query = `
SELECT
	s.id::text,
	COALESCE(cs.class_id::text, '') AS class_id,
	s.student_number,
	s.full_name,
	s.birth_date,
	s.status,
	s.created_at,
	COALESCE(g.full_name, '') AS guardian_name,
	COALESCE(g.phone, '') AS guardian_phone
FROM students s
LEFT JOIN LATERAL (
	SELECT class_id
	FROM class_students
	WHERE tenant_id = s.tenant_id
		AND student_id = s.id
		AND ends_on IS NULL
	ORDER BY starts_on DESC
	LIMIT 1
) cs ON true
LEFT JOIN LATERAL (
	SELECT g.full_name, g.phone
	FROM student_guardians sg
	JOIN guardians g ON g.id = sg.guardian_id AND g.tenant_id = sg.tenant_id
	WHERE sg.tenant_id = s.tenant_id
		AND sg.student_id = s.id
		AND sg.is_primary = true
	LIMIT 1
) g ON true
WHERE s.tenant_id = $1 AND s.deleted_at IS NULL
ORDER BY s.student_number`

	rows, err := s.db.QueryContext(ctx, query, tenantID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := []schooldomain.PrincipalRosterStudent{}
	for rows.Next() {
		var (
			item      schooldomain.PrincipalRosterStudent
			fullName  string
			birthDate sql.NullTime
			status    string
		)
		if err := rows.Scan(
			&item.ID,
			&item.ClassID,
			&item.SchoolNumber,
			&fullName,
			&birthDate,
			&status,
			&item.CreatedAt,
			&item.GuardianName,
			&item.GuardianPhone,
		); err != nil {
			return nil, err
		}
		item.FirstName, item.LastName = splitFullName(fullName)
		if birthDate.Valid {
			item.BirthDate = birthDate.Time.Format("2006-01-02")
		}
		switch strings.ToLower(strings.TrimSpace(status)) {
		case "passive", "inactive", "archived":
			item.Status = "passive"
		default:
			item.Status = "active"
		}
		out = append(out, item)
	}
	return out, rows.Err()
}

func (s *Store) ListStudentsPage(ctx context.Context, tenantID, query string, offset, limit int) ([]schooldomain.PrincipalRosterStudent, int, error) {
	q := "%" + strings.TrimSpace(query) + "%"
	countQuery := `
SELECT COUNT(*)
FROM students s
WHERE s.tenant_id = $1 AND s.deleted_at IS NULL
  AND ($2 = '' OR s.full_name ILIKE $3 OR s.student_number ILIKE $3)`
	var total int
	if err := s.db.QueryRowContext(ctx, countQuery, tenantID, strings.TrimSpace(query), q).Scan(&total); err != nil {
		return nil, 0, err
	}
	const pageQuery = `
SELECT
	s.id::text,
	COALESCE(cs.class_id::text, '') AS class_id,
	s.student_number,
	s.full_name,
	s.birth_date,
	s.status,
	s.created_at,
	COALESCE(g.full_name, '') AS guardian_name,
	COALESCE(g.phone, '') AS guardian_phone
FROM students s
LEFT JOIN LATERAL (
	SELECT class_id
	FROM class_students
	WHERE tenant_id = s.tenant_id AND student_id = s.id AND ends_on IS NULL
	ORDER BY starts_on DESC
	LIMIT 1
) cs ON true
LEFT JOIN LATERAL (
	SELECT g.full_name, g.phone
	FROM student_guardians sg
	JOIN guardians g ON g.id = sg.guardian_id AND g.tenant_id = sg.tenant_id
	WHERE sg.tenant_id = s.tenant_id AND sg.student_id = s.id AND sg.is_primary = true
	LIMIT 1
) g ON true
WHERE s.tenant_id = $1 AND s.deleted_at IS NULL
  AND ($2 = '' OR s.full_name ILIKE $3 OR s.student_number ILIKE $3)
ORDER BY s.student_number
LIMIT $4 OFFSET $5`
	rows, err := s.db.QueryContext(ctx, pageQuery, tenantID, strings.TrimSpace(query), q, limit, offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()
	out := []schooldomain.PrincipalRosterStudent{}
	for rows.Next() {
		var (
			item      schooldomain.PrincipalRosterStudent
			fullName  string
			birthDate sql.NullTime
			status    string
		)
		if err := rows.Scan(
			&item.ID, &item.ClassID, &item.SchoolNumber, &fullName, &birthDate, &status,
			&item.CreatedAt, &item.GuardianName, &item.GuardianPhone,
		); err != nil {
			return nil, 0, err
		}
		item.FirstName, item.LastName = splitFullName(fullName)
		if birthDate.Valid {
			item.BirthDate = birthDate.Time.Format("2006-01-02")
		}
		switch strings.ToLower(strings.TrimSpace(status)) {
		case "passive", "inactive", "archived":
			item.Status = "passive"
		default:
			item.Status = "active"
		}
		out = append(out, item)
	}
	return out, total, rows.Err()
}

func splitFullName(fullName string) (string, string) {
	parts := strings.Fields(strings.TrimSpace(fullName))
	if len(parts) == 0 {
		return "", ""
	}
	if len(parts) == 1 {
		return parts[0], ""
	}
	return strings.Join(parts[:len(parts)-1], " "), parts[len(parts)-1]
}
