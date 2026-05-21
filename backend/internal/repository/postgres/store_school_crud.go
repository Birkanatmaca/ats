package postgres

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"
	"time"

	"ots/backend/internal/domain/identity"
	superadmindomain "ots/backend/internal/domain/superadmin"
	schooldomain "ots/backend/internal/domain/school"
)

func (s *Store) ListClasses(ctx context.Context, tenantID string) ([]schooldomain.PrincipalRosterClass, error) {
	return s.listPrincipalClasses(ctx, tenantID)
}

func (s *Store) CreateClass(ctx context.Context, tenantID string, input schooldomain.CreateClassInput) (schooldomain.PrincipalRosterClass, error) {
	var item schooldomain.PrincipalRosterClass
	err := s.db.QueryRowContext(ctx, `
INSERT INTO classes (tenant_id, name, level, branch)
VALUES ($1, $2, $3, NULLIF($4, ''))
RETURNING id::text, name, created_at`,
		tenantID, strings.TrimSpace(input.Name), strings.TrimSpace(input.Level), strings.TrimSpace(input.Branch),
	).Scan(&item.ID, &item.Name, &item.CreatedAt)
	if err != nil {
		return schooldomain.PrincipalRosterClass{}, err
	}
	return item, nil
}

func (s *Store) UpdateClass(ctx context.Context, tenantID string, classID string, input schooldomain.UpdateClassInput) (schooldomain.PrincipalRosterClass, error) {
	current, ok, err := s.getClass(ctx, tenantID, classID)
	if err != nil {
		return schooldomain.PrincipalRosterClass{}, err
	}
	if !ok {
		return schooldomain.PrincipalRosterClass{}, schooldomain.ErrClassNotFound
	}
	name := current.Name
	level := current.Level
	branch := current.Branch
	if input.Name != nil {
		name = strings.TrimSpace(*input.Name)
	}
	if input.Level != nil {
		level = strings.TrimSpace(*input.Level)
	}
	if input.Branch != nil {
		branch = strings.TrimSpace(*input.Branch)
	}
	var item schooldomain.PrincipalRosterClass
	err = s.db.QueryRowContext(ctx, `
UPDATE classes
SET name = $3, level = $4, branch = NULLIF($5, '')
WHERE tenant_id = $1 AND id = $2::uuid AND deleted_at IS NULL
RETURNING id::text, name, created_at`,
		tenantID, classID, name, level, branch,
	).Scan(&item.ID, &item.Name, &item.CreatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return schooldomain.PrincipalRosterClass{}, schooldomain.ErrClassNotFound
	}
	if err != nil {
		return schooldomain.PrincipalRosterClass{}, err
	}
	return item, nil
}

func (s *Store) ListStudents(ctx context.Context, tenantID string) ([]schooldomain.PrincipalRosterStudent, error) {
	return s.listPrincipalStudents(ctx, tenantID)
}

func (s *Store) CreateStudent(ctx context.Context, tenantID string, input schooldomain.CreateStudentInput) (schooldomain.PrincipalRosterStudent, error) {
	if input.ClassID != "" {
		if ok, err := s.classExists(ctx, tenantID, input.ClassID); err != nil {
			return schooldomain.PrincipalRosterStudent{}, err
		} else if !ok {
			return schooldomain.PrincipalRosterStudent{}, schooldomain.ErrClassNotFound
		}
	}
	dup, err := s.studentNumberExists(ctx, tenantID, "", strings.TrimSpace(input.SchoolNumber))
	if err != nil {
		return schooldomain.PrincipalRosterStudent{}, err
	}
	if dup {
		return schooldomain.PrincipalRosterStudent{}, schooldomain.ErrDuplicateNumber
	}

	fullName := schooldomain.JoinFullName(input.FirstName, input.LastName)
	status := schooldomain.StudentStatusDB(input.Status)
	var birthDate sql.NullTime
	if parsed, ok := parseOptionalDate(input.BirthDate); ok {
		birthDate = sql.NullTime{Time: parsed, Valid: true}
	}

	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return schooldomain.PrincipalRosterStudent{}, err
	}
	defer tx.Rollback()

	var studentID string
	err = tx.QueryRowContext(ctx, `
INSERT INTO students (tenant_id, full_name, student_number, birth_date, status)
VALUES ($1, $2, $3, $4, $5)
RETURNING id::text`,
		tenantID, fullName, strings.TrimSpace(input.SchoolNumber), birthDate, status,
	).Scan(&studentID)
	if err != nil {
		return schooldomain.PrincipalRosterStudent{}, err
	}

	if strings.TrimSpace(input.GuardianName) != "" {
		if err := s.upsertPrimaryGuardianTx(ctx, tx, tenantID, studentID, input.GuardianName, input.GuardianPhone); err != nil {
			return schooldomain.PrincipalRosterStudent{}, err
		}
	}

	if input.ClassID != "" {
		startsOn := time.Now().UTC().Format("2006-01-02")
		if _, err := tx.ExecContext(ctx, `
INSERT INTO class_students (tenant_id, class_id, student_id, starts_on)
VALUES ($1, $2::uuid, $3::uuid, $4::date)`,
			tenantID, input.ClassID, studentID, startsOn,
		); err != nil {
			return schooldomain.PrincipalRosterStudent{}, err
		}
	}

	if err := tx.Commit(); err != nil {
		return schooldomain.PrincipalRosterStudent{}, err
	}
	return s.loadPrincipalStudent(ctx, tenantID, studentID)
}

func (s *Store) UpdateStudent(ctx context.Context, tenantID string, studentID string, input schooldomain.UpdateStudentInput) (schooldomain.PrincipalRosterStudent, error) {
	current, err := s.loadPrincipalStudent(ctx, tenantID, studentID)
	if errors.Is(err, schooldomain.ErrStudentNotFound) {
		return schooldomain.PrincipalRosterStudent{}, schooldomain.ErrStudentNotFound
	}
	if err != nil {
		return schooldomain.PrincipalRosterStudent{}, err
	}

	firstName := current.FirstName
	lastName := current.LastName
	schoolNumber := current.SchoolNumber
	status := current.Status
	birthDate := current.BirthDate
	classID := current.ClassID

	if input.FirstName != nil {
		firstName = strings.TrimSpace(*input.FirstName)
	}
	if input.LastName != nil {
		lastName = strings.TrimSpace(*input.LastName)
	}
	if input.SchoolNumber != nil {
		schoolNumber = strings.TrimSpace(*input.SchoolNumber)
	}
	if input.Status != nil {
		status = schooldomain.NormalizeStudentStatus(*input.Status)
	}
	if input.BirthDate != nil {
		birthDate = strings.TrimSpace(*input.BirthDate)
	}
	if input.ClassID != nil {
		classID = strings.TrimSpace(*input.ClassID)
	}

	fullName := schooldomain.JoinFullName(firstName, lastName)
	if fullName == "" {
		return schooldomain.PrincipalRosterStudent{}, schooldomain.ErrInvalidInput
	}
	if schoolNumber == "" {
		return schooldomain.PrincipalRosterStudent{}, schooldomain.ErrInvalidInput
	}

	dup, err := s.studentNumberExists(ctx, tenantID, studentID, schoolNumber)
	if err != nil {
		return schooldomain.PrincipalRosterStudent{}, err
	}
	if dup {
		return schooldomain.PrincipalRosterStudent{}, schooldomain.ErrDuplicateNumber
	}

	var birthSQL sql.NullTime
	if birthDate != "" {
		if parsed, ok := parseOptionalDate(birthDate); ok {
			birthSQL = sql.NullTime{Time: parsed, Valid: true}
		}
	}

	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return schooldomain.PrincipalRosterStudent{}, err
	}
	defer tx.Rollback()

	res, err := tx.ExecContext(ctx, `
UPDATE students
SET full_name = $3, student_number = $4, birth_date = $5, status = $6
WHERE tenant_id = $1 AND id = $2::uuid AND deleted_at IS NULL`,
		tenantID, studentID, fullName, schoolNumber, birthSQL, schooldomain.StudentStatusDB(status),
	)
	if err != nil {
		return schooldomain.PrincipalRosterStudent{}, err
	}
	rows, err := res.RowsAffected()
	if err != nil {
		return schooldomain.PrincipalRosterStudent{}, err
	}
	if rows == 0 {
		return schooldomain.PrincipalRosterStudent{}, schooldomain.ErrStudentNotFound
	}

	if input.GuardianName != nil || input.GuardianPhone != nil {
		name := current.GuardianName
		phone := current.GuardianPhone
		if input.GuardianName != nil {
			name = strings.TrimSpace(*input.GuardianName)
		}
		if input.GuardianPhone != nil {
			phone = strings.TrimSpace(*input.GuardianPhone)
		}
		if name != "" {
			if err := s.upsertPrimaryGuardianTx(ctx, tx, tenantID, studentID, name, phone); err != nil {
				return schooldomain.PrincipalRosterStudent{}, err
			}
		}
	}

	if input.ClassID != nil {
		if classID != "" {
			if ok, err := s.classExistsTx(ctx, tx, tenantID, classID); err != nil {
				return schooldomain.PrincipalRosterStudent{}, err
			} else if !ok {
				return schooldomain.PrincipalRosterStudent{}, schooldomain.ErrClassNotFound
			}
		}
		if err := s.reassignClassStudentTx(ctx, tx, tenantID, classID, studentID, time.Now().UTC().Format("2006-01-02")); err != nil {
			return schooldomain.PrincipalRosterStudent{}, err
		}
	}

	if err := tx.Commit(); err != nil {
		return schooldomain.PrincipalRosterStudent{}, err
	}
	return s.loadPrincipalStudent(ctx, tenantID, studentID)
}

func (s *Store) ListSubjects(ctx context.Context, tenantID string) ([]schooldomain.Subject, error) {
	rows, err := s.db.QueryContext(ctx, `
SELECT id::text, tenant_id::text, name, code
FROM subjects
WHERE tenant_id = $1
ORDER BY name`, tenantID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := []schooldomain.Subject{}
	for rows.Next() {
		var item schooldomain.Subject
		if err := rows.Scan(&item.ID, &item.TenantID, &item.Name, &item.Code); err != nil {
			return nil, err
		}
		out = append(out, item)
	}
	return out, rows.Err()
}

func (s *Store) CreateSubject(ctx context.Context, tenantID string, input schooldomain.CreateSubjectInput) (schooldomain.Subject, error) {
	code := strings.ToUpper(strings.TrimSpace(input.Code))
	exists, err := s.subjectCodeExists(ctx, tenantID, code)
	if err != nil {
		return schooldomain.Subject{}, err
	}
	if exists {
		return schooldomain.Subject{}, schooldomain.ErrDuplicateCode
	}
	var item schooldomain.Subject
	err = s.db.QueryRowContext(ctx, `
INSERT INTO subjects (tenant_id, name, code)
VALUES ($1, $2, $3)
RETURNING id::text, tenant_id::text, name, code`,
		tenantID, strings.TrimSpace(input.Name), code,
	).Scan(&item.ID, &item.TenantID, &item.Name, &item.Code)
	if err != nil {
		return schooldomain.Subject{}, err
	}
	return item, nil
}

func (s *Store) ListTeachers(ctx context.Context, tenantID string) ([]schooldomain.Teacher, error) {
	rows, err := s.db.QueryContext(ctx, `
SELECT t.id::text, t.tenant_id::text, t.user_id::text, u.full_name, COALESCE(t.title, '')
FROM teachers t
JOIN users u ON u.id = t.user_id
WHERE t.tenant_id = $1
ORDER BY u.full_name`, tenantID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := []schooldomain.Teacher{}
	for rows.Next() {
		var item schooldomain.Teacher
		if err := rows.Scan(&item.ID, &item.TenantID, &item.UserID, &item.FullName, &item.Title); err != nil {
			return nil, err
		}
		out = append(out, item)
	}
	return out, rows.Err()
}

func (s *Store) CreateTeacher(ctx context.Context, tenantID string, input schooldomain.CreateTeacherInput) (schooldomain.Teacher, error) {
	ok, err := s.tenantUserExists(ctx, tenantID, input.UserID)
	if err != nil {
		return schooldomain.Teacher{}, err
	}
	if !ok {
		return schooldomain.Teacher{}, schooldomain.ErrUserNotInTenant
	}
	dup, err := s.teacherUserExists(ctx, tenantID, input.UserID)
	if err != nil {
		return schooldomain.Teacher{}, err
	}
	if dup {
		return schooldomain.Teacher{}, schooldomain.ErrDuplicateTeacher
	}
	title := strings.TrimSpace(input.Title)
	var item schooldomain.Teacher
	err = s.db.QueryRowContext(ctx, `
INSERT INTO teachers (tenant_id, user_id, title)
VALUES ($1, $2::uuid, NULLIF($3, ''))
RETURNING id::text, tenant_id::text, user_id::text, COALESCE(title, '')`,
		tenantID, input.UserID, title,
	).Scan(&item.ID, &item.TenantID, &item.UserID, &item.Title)
	if err != nil {
		return schooldomain.Teacher{}, err
	}
	_ = s.db.QueryRowContext(ctx, `SELECT full_name FROM users WHERE id = $1::uuid`, input.UserID).Scan(&item.FullName)
	return item, nil
}

func (s *Store) UpdateTeacher(ctx context.Context, tenantID string, teacherID string, input schooldomain.UpdateTeacherInput) (schooldomain.Teacher, error) {
	if input.Title == nil {
		return s.loadTeacher(ctx, tenantID, teacherID)
	}
	title := strings.TrimSpace(*input.Title)
	var item schooldomain.Teacher
	err := s.db.QueryRowContext(ctx, `
UPDATE teachers
SET title = NULLIF($3, '')
WHERE tenant_id = $1 AND id = $2::uuid
RETURNING id::text, tenant_id::text, user_id::text, COALESCE(title, '')`,
		tenantID, teacherID, title,
	).Scan(&item.ID, &item.TenantID, &item.UserID, &item.Title)
	if errors.Is(err, sql.ErrNoRows) {
		return schooldomain.Teacher{}, schooldomain.ErrTeacherNotFound
	}
	if err != nil {
		return schooldomain.Teacher{}, err
	}
	_ = s.db.QueryRowContext(ctx, `SELECT full_name FROM users WHERE id = $1::uuid`, item.UserID).Scan(&item.FullName)
	return item, nil
}

func (s *Store) AssignClassStudent(ctx context.Context, tenantID string, classID string, input schooldomain.AssignClassStudentInput) (schooldomain.ClassStudentAssignment, error) {
	if ok, err := s.classExists(ctx, tenantID, classID); err != nil {
		return schooldomain.ClassStudentAssignment{}, err
	} else if !ok {
		return schooldomain.ClassStudentAssignment{}, schooldomain.ErrClassNotFound
	}
	if ok, err := s.studentExists(ctx, tenantID, input.StudentID); err != nil {
		return schooldomain.ClassStudentAssignment{}, err
	} else if !ok {
		return schooldomain.ClassStudentAssignment{}, schooldomain.ErrStudentNotFound
	}
	startsOn := strings.TrimSpace(input.StartsOn)
	if startsOn == "" {
		startsOn = time.Now().UTC().Format("2006-01-02")
	}
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return schooldomain.ClassStudentAssignment{}, err
	}
	defer tx.Rollback()
	if err := s.reassignClassStudentTx(ctx, tx, tenantID, classID, input.StudentID, startsOn); err != nil {
		return schooldomain.ClassStudentAssignment{}, err
	}
	if err := tx.Commit(); err != nil {
		return schooldomain.ClassStudentAssignment{}, err
	}
	return schooldomain.ClassStudentAssignment{
		TenantID:  tenantID,
		ClassID:   classID,
		StudentID: input.StudentID,
		StartsOn:  startsOn,
	}, nil
}

func (s *Store) ListAcademicYears(ctx context.Context, tenantID string) ([]schooldomain.AcademicYear, error) {
	rows, err := s.db.QueryContext(ctx, `
SELECT id::text, tenant_id::text, name, starts_on::text, ends_on::text, is_active
FROM academic_years
WHERE tenant_id = $1
ORDER BY starts_on DESC`, tenantID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanAcademicYears(rows)
}

func (s *Store) CreateAcademicYear(ctx context.Context, tenantID string, input schooldomain.CreateAcademicYearInput) (schooldomain.AcademicYear, error) {
	var item schooldomain.AcademicYear
	err := s.db.QueryRowContext(ctx, `
INSERT INTO academic_years (tenant_id, name, starts_on, ends_on, is_active)
VALUES ($1, $2, $3::date, $4::date, $5)
RETURNING id::text, tenant_id::text, name, starts_on::text, ends_on::text, is_active`,
		tenantID, strings.TrimSpace(input.Name), input.StartsOn, input.EndsOn, input.IsActive,
	).Scan(&item.ID, &item.TenantID, &item.Name, &item.StartsOn, &item.EndsOn, &item.IsActive)
	if err != nil {
		return schooldomain.AcademicYear{}, err
	}
	return item, nil
}

func (s *Store) ListTerms(ctx context.Context, tenantID string) ([]schooldomain.Term, error) {
	rows, err := s.db.QueryContext(ctx, `
SELECT id::text, tenant_id::text, academic_year_id::text, name, starts_on::text, ends_on::text, is_active
FROM terms
WHERE tenant_id = $1
ORDER BY starts_on DESC`, tenantID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanTerms(rows)
}

func (s *Store) CreateTerm(ctx context.Context, tenantID string, input schooldomain.CreateTermInput) (schooldomain.Term, error) {
	ok, err := s.academicYearExists(ctx, tenantID, input.AcademicYearID)
	if err != nil {
		return schooldomain.Term{}, err
	}
	if !ok {
		return schooldomain.Term{}, schooldomain.ErrAcademicYearNotFound
	}
	var item schooldomain.Term
	err = s.db.QueryRowContext(ctx, `
INSERT INTO terms (tenant_id, academic_year_id, name, starts_on, ends_on, is_active)
VALUES ($1, $2::uuid, $3, $4::date, $5::date, $6)
RETURNING id::text, tenant_id::text, academic_year_id::text, name, starts_on::text, ends_on::text, is_active`,
		tenantID, input.AcademicYearID, strings.TrimSpace(input.Name), input.StartsOn, input.EndsOn, input.IsActive,
	).Scan(&item.ID, &item.TenantID, &item.AcademicYearID, &item.Name, &item.StartsOn, &item.EndsOn, &item.IsActive)
	if err != nil {
		return schooldomain.Term{}, err
	}
	return item, nil
}

type classRow struct {
	Name   string
	Level  string
	Branch string
}

func (s *Store) getClass(ctx context.Context, tenantID, classID string) (classRow, bool, error) {
	var row classRow
	err := s.db.QueryRowContext(ctx, `
SELECT name, level, COALESCE(branch, '')
FROM classes
WHERE tenant_id = $1 AND id = $2::uuid AND deleted_at IS NULL`,
		tenantID, classID,
	).Scan(&row.Name, &row.Level, &row.Branch)
	if errors.Is(err, sql.ErrNoRows) {
		return classRow{}, false, nil
	}
	if err != nil {
		return classRow{}, false, err
	}
	return row, true, nil
}

func (s *Store) classExists(ctx context.Context, tenantID, classID string) (bool, error) {
	var exists bool
	err := s.db.QueryRowContext(ctx, `
SELECT EXISTS(
	SELECT 1 FROM classes WHERE tenant_id = $1 AND id = $2::uuid AND deleted_at IS NULL
)`, tenantID, classID).Scan(&exists)
	return exists, err
}

func (s *Store) classExistsTx(ctx context.Context, tx *sql.Tx, tenantID, classID string) (bool, error) {
	var exists bool
	err := tx.QueryRowContext(ctx, `
SELECT EXISTS(
	SELECT 1 FROM classes WHERE tenant_id = $1 AND id = $2::uuid AND deleted_at IS NULL
)`, tenantID, classID).Scan(&exists)
	return exists, err
}

func (s *Store) studentExists(ctx context.Context, tenantID, studentID string) (bool, error) {
	var exists bool
	err := s.db.QueryRowContext(ctx, `
SELECT EXISTS(
	SELECT 1 FROM students WHERE tenant_id = $1 AND id = $2::uuid AND deleted_at IS NULL
)`, tenantID, studentID).Scan(&exists)
	return exists, err
}

func (s *Store) studentNumberExists(ctx context.Context, tenantID, studentID, number string) (bool, error) {
	var exists bool
	err := s.db.QueryRowContext(ctx, `
SELECT EXISTS(
	SELECT 1 FROM students
	WHERE tenant_id = $1 AND student_number = $2 AND deleted_at IS NULL
		AND ($3 = '' OR id <> $3::uuid)
)`, tenantID, number, studentID).Scan(&exists)
	return exists, err
}

func (s *Store) subjectCodeExists(ctx context.Context, tenantID, code string) (bool, error) {
	var exists bool
	err := s.db.QueryRowContext(ctx, `
SELECT EXISTS(SELECT 1 FROM subjects WHERE tenant_id = $1 AND code = $2)`,
		tenantID, code).Scan(&exists)
	return exists, err
}

func (s *Store) tenantUserExists(ctx context.Context, tenantID, userID string) (bool, error) {
	var exists bool
	err := s.db.QueryRowContext(ctx, `
SELECT EXISTS(
	SELECT 1 FROM tenant_memberships
	WHERE tenant_id = $1 AND user_id = $2::uuid AND status = 'active'
)`, tenantID, userID).Scan(&exists)
	return exists, err
}

func (s *Store) teacherUserExists(ctx context.Context, tenantID, userID string) (bool, error) {
	var exists bool
	err := s.db.QueryRowContext(ctx, `
SELECT EXISTS(SELECT 1 FROM teachers WHERE tenant_id = $1 AND user_id = $2::uuid)`,
		tenantID, userID).Scan(&exists)
	return exists, err
}

func (s *Store) academicYearExists(ctx context.Context, tenantID, yearID string) (bool, error) {
	var exists bool
	err := s.db.QueryRowContext(ctx, `
SELECT EXISTS(SELECT 1 FROM academic_years WHERE tenant_id = $1 AND id = $2::uuid)`,
		tenantID, yearID).Scan(&exists)
	return exists, err
}

func (s *Store) loadTeacher(ctx context.Context, tenantID, teacherID string) (schooldomain.Teacher, error) {
	var item schooldomain.Teacher
	err := s.db.QueryRowContext(ctx, `
SELECT t.id::text, t.tenant_id::text, t.user_id::text, u.full_name, COALESCE(t.title, '')
FROM teachers t
JOIN users u ON u.id = t.user_id
WHERE t.tenant_id = $1 AND t.id = $2::uuid`,
		tenantID, teacherID,
	).Scan(&item.ID, &item.TenantID, &item.UserID, &item.FullName, &item.Title)
	if errors.Is(err, sql.ErrNoRows) {
		return schooldomain.Teacher{}, schooldomain.ErrTeacherNotFound
	}
	if err != nil {
		return schooldomain.Teacher{}, err
	}
	return item, nil
}

func (s *Store) loadPrincipalStudent(ctx context.Context, tenantID, studentID string) (schooldomain.PrincipalRosterStudent, error) {
	item, ok, err := s.getPrincipalStudent(ctx, tenantID, studentID)
	if err != nil {
		return schooldomain.PrincipalRosterStudent{}, err
	}
	if !ok {
		return schooldomain.PrincipalRosterStudent{}, schooldomain.ErrStudentNotFound
	}
	return item, nil
}

func (s *Store) getPrincipalStudent(ctx context.Context, tenantID, studentID string) (schooldomain.PrincipalRosterStudent, bool, error) {
	students, err := s.listPrincipalStudents(ctx, tenantID)
	if err != nil {
		return schooldomain.PrincipalRosterStudent{}, false, err
	}
	for _, student := range students {
		if student.ID == studentID {
			return student, true, nil
		}
	}
	return schooldomain.PrincipalRosterStudent{}, false, nil
}

func (s *Store) reassignClassStudentTx(ctx context.Context, tx *sql.Tx, tenantID, classID, studentID, startsOn string) error {
	if classID == "" {
		_, err := tx.ExecContext(ctx, `
UPDATE class_students
SET ends_on = $3::date
WHERE tenant_id = $1 AND student_id = $2::uuid AND ends_on IS NULL`,
			tenantID, studentID, startsOn,
		)
		return err
	}
	_, err := tx.ExecContext(ctx, `
UPDATE class_students
SET ends_on = ($4::date - INTERVAL '1 day')
WHERE tenant_id = $1 AND student_id = $2::uuid AND ends_on IS NULL`,
		tenantID, studentID, classID, startsOn,
	)
	if err != nil {
		return err
	}
	_, err = tx.ExecContext(ctx, `
INSERT INTO class_students (tenant_id, class_id, student_id, starts_on)
VALUES ($1, $2::uuid, $3::uuid, $4::date)`,
		tenantID, classID, studentID, startsOn,
	)
	return err
}

func (s *Store) upsertPrimaryGuardianTx(ctx context.Context, tx *sql.Tx, tenantID, studentID, fullName, phone string) error {
	var guardianID string
	err := tx.QueryRowContext(ctx, `
SELECT g.id::text
FROM student_guardians sg
JOIN guardians g ON g.id = sg.guardian_id AND g.tenant_id = sg.tenant_id
WHERE sg.tenant_id = $1 AND sg.student_id = $2::uuid AND sg.is_primary = true
LIMIT 1`, tenantID, studentID).Scan(&guardianID)
	if errors.Is(err, sql.ErrNoRows) {
		err = tx.QueryRowContext(ctx, `
INSERT INTO guardians (tenant_id, full_name, phone)
VALUES ($1, $2, NULLIF($3, ''))
RETURNING id::text`, tenantID, strings.TrimSpace(fullName), strings.TrimSpace(phone)).Scan(&guardianID)
		if err != nil {
			return err
		}
		_, err = tx.ExecContext(ctx, `
INSERT INTO student_guardians (tenant_id, student_id, guardian_id, relation, is_primary)
VALUES ($1, $2::uuid, $3::uuid, 'veli', true)`,
			tenantID, studentID, guardianID,
		)
		return err
	}
	if err != nil {
		return err
	}
	_, err = tx.ExecContext(ctx, `
UPDATE guardians SET full_name = $3, phone = NULLIF($4, '')
WHERE tenant_id = $1 AND id = $2::uuid`,
		tenantID, guardianID, strings.TrimSpace(fullName), strings.TrimSpace(phone),
	)
	return err
}

func parseOptionalDate(value string) (time.Time, bool) {
	value = strings.TrimSpace(value)
	if value == "" {
		return time.Time{}, false
	}
	layouts := []string{"2006-01-02", time.RFC3339}
	for _, layout := range layouts {
		if parsed, err := time.Parse(layout, value); err == nil {
			return parsed, true
		}
	}
	return time.Time{}, false
}

func scanAcademicYears(rows *sql.Rows) ([]schooldomain.AcademicYear, error) {
	out := []schooldomain.AcademicYear{}
	for rows.Next() {
		var item schooldomain.AcademicYear
		if err := rows.Scan(&item.ID, &item.TenantID, &item.Name, &item.StartsOn, &item.EndsOn, &item.IsActive); err != nil {
			return nil, err
		}
		out = append(out, item)
	}
	return out, rows.Err()
}

func scanTerms(rows *sql.Rows) ([]schooldomain.Term, error) {
	out := []schooldomain.Term{}
	for rows.Next() {
		var item schooldomain.Term
		if err := rows.Scan(&item.ID, &item.TenantID, &item.AcademicYearID, &item.Name, &item.StartsOn, &item.EndsOn, &item.IsActive); err != nil {
			return nil, err
		}
		out = append(out, item)
	}
	return out, rows.Err()
}

func (s *Store) ProvisionTeacher(ctx context.Context, tenantID string, input schooldomain.ProvisionTeacherInput) (schooldomain.ProvisionTeacherResult, error) {
	email := strings.ToLower(strings.TrimSpace(input.Email))
	fullName := schooldomain.JoinFullName(input.FirstName, input.LastName)
	title := strings.TrimSpace(input.Title)

	cred, err := s.CreateInstitutionUser(ctx, identity.Principal{TenantID: tenantID}, tenantID, superadmindomain.CreateInstitutionUserInput{
		Email:    email,
		FullName: fullName,
		Role:     string(identity.RoleTeacher),
	})
	if errors.Is(err, superadmindomain.ErrUserAlreadyExists) {
		return schooldomain.ProvisionTeacherResult{}, schooldomain.ErrDuplicateEmail
	}
	if err != nil {
		return schooldomain.ProvisionTeacherResult{}, err
	}

	teacher, err := s.CreateTeacher(ctx, tenantID, schooldomain.CreateTeacherInput{
		UserID: cred.User.ID,
		Title:  title,
	})
	if err != nil {
		return schooldomain.ProvisionTeacherResult{}, err
	}

	return schooldomain.ProvisionTeacherResult{
		Teacher:           teacher,
		Email:             email,
		TemporaryPassword: cred.TemporaryPassword,
	}, nil
}

func (s *Store) ProvisionGuardian(ctx context.Context, tenantID string, input schooldomain.ProvisionGuardianInput) (schooldomain.ProvisionGuardianResult, error) {
	email := strings.ToLower(strings.TrimSpace(input.Email))
	fullName := schooldomain.JoinFullName(input.FirstName, input.LastName)
	relation := strings.TrimSpace(input.Relation)
	if relation == "" {
		relation = "Veli"
	}
	if len(input.StudentIDs) == 0 {
		return schooldomain.ProvisionGuardianResult{}, schooldomain.ErrInvalidInput
	}

	cred, err := s.CreateInstitutionUser(ctx, identity.Principal{TenantID: tenantID}, tenantID, superadmindomain.CreateInstitutionUserInput{
		Email:    email,
		FullName: fullName,
		Role:     string(identity.RoleGuardian),
	})
	if errors.Is(err, superadmindomain.ErrUserAlreadyExists) {
		return schooldomain.ProvisionGuardianResult{}, schooldomain.ErrDuplicateEmail
	}
	if err != nil {
		return schooldomain.ProvisionGuardianResult{}, err
	}

	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return schooldomain.ProvisionGuardianResult{}, err
	}
	defer func() { _ = tx.Rollback() }()

	var guardianID string
	err = tx.QueryRowContext(ctx, `
SELECT id::text FROM guardians WHERE tenant_id = $1 AND user_id = $2::uuid`, tenantID, cred.User.ID).Scan(&guardianID)
	if errors.Is(err, sql.ErrNoRows) {
		err = tx.QueryRowContext(ctx, `
INSERT INTO guardians (tenant_id, user_id, full_name, email)
VALUES ($1, $2::uuid, $3, $4)
RETURNING id::text`, tenantID, cred.User.ID, fullName, email).Scan(&guardianID)
	}
	if err != nil {
		return schooldomain.ProvisionGuardianResult{}, err
	}

	linked := 0
	for _, studentID := range input.StudentIDs {
		studentID = strings.TrimSpace(studentID)
		if studentID == "" {
			continue
		}
		var exists bool
		err = tx.QueryRowContext(ctx, `
SELECT EXISTS (SELECT 1 FROM students WHERE tenant_id = $1 AND id = $2::uuid)`, tenantID, studentID).Scan(&exists)
		if err != nil || !exists {
			return schooldomain.ProvisionGuardianResult{}, schooldomain.ErrStudentNotFound
		}
		_, err = tx.ExecContext(ctx, `
INSERT INTO student_guardians (tenant_id, student_id, guardian_id, relation, is_primary)
VALUES ($1, $2::uuid, $3::uuid, $4, false)
ON CONFLICT (tenant_id, student_id, guardian_id) DO NOTHING`, tenantID, studentID, guardianID, relation)
		if err != nil {
			return schooldomain.ProvisionGuardianResult{}, err
		}
		linked++
	}
	if linked == 0 {
		return schooldomain.ProvisionGuardianResult{}, schooldomain.ErrInvalidInput
	}
	if err := tx.Commit(); err != nil {
		return schooldomain.ProvisionGuardianResult{}, err
	}
	return schooldomain.ProvisionGuardianResult{
		Email:             email,
		TemporaryPassword: cred.TemporaryPassword,
		LinkedStudents:    linked,
	}, nil
}

func (s *Store) ResetTeacherPassword(ctx context.Context, tenantID string, teacherID string) (string, error) {
	teacher, err := s.loadTeacher(ctx, tenantID, teacherID)
	if errors.Is(err, schooldomain.ErrTeacherNotFound) {
		return "", schooldomain.ErrTeacherNotFound
	}
	if err != nil {
		return "", err
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
WHERE id = $2::uuid`, passwordHash, teacher.UserID)
	if err != nil {
		return "", err
	}
	rows, _ := res.RowsAffected()
	if rows == 0 {
		return "", identity.ErrUserNotFound
	}
	return tempPassword, nil
}

func (s *Store) ImportStudents(ctx context.Context, tenantID string, input schooldomain.ImportStudentsInput) (schooldomain.ImportStudentsResult, error) {
	if ok, err := s.classExists(ctx, tenantID, input.ClassID); err != nil {
		return schooldomain.ImportStudentsResult{}, err
	} else if !ok {
		return schooldomain.ImportStudentsResult{}, schooldomain.ErrClassNotFound
	}

	result := schooldomain.ImportStudentsResult{}
	for index, row := range input.Students {
		_, err := s.CreateStudent(ctx, tenantID, schooldomain.CreateStudentInput{
			FirstName:    row.FirstName,
			LastName:     row.LastName,
			SchoolNumber: row.SchoolNumber,
			ClassID:      input.ClassID,
			Status:       "active",
		})
		if err != nil {
			result.Failed++
			result.Errors = append(result.Errors, fmt.Sprintf("Satır %d: %v", index+1, err))
			continue
		}
		result.Created++
	}
	return result, nil
}
