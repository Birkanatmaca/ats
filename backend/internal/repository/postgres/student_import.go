package postgres

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"strings"
	"time"

	"ots/backend/internal/domain/identity"
	schooldomain "ots/backend/internal/domain/school"
	studentimportdomain "ots/backend/internal/domain/studentimport"
)

func (s *Store) ListImportJobs(ctx context.Context, tenantID string, limit int) ([]studentimportdomain.ImportJob, error) {
	if limit <= 0 || limit > 100 {
		limit = 50
	}
	rows, err := s.db.QueryContext(ctx, `
SELECT id::text, tenant_id::text, status, file_name, COALESCE(uploaded_by::text, ''),
       total_rows, valid_rows, warning_rows, error_rows, imported_rows, options, created_at, completed_at
FROM student_import_jobs
WHERE tenant_id = $1
ORDER BY created_at DESC
LIMIT $2`, tenantID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := make([]studentimportdomain.ImportJob, 0)
	for rows.Next() {
		item, err := scanImportJob(rows)
		if err != nil {
			continue
		}
		out = append(out, item)
	}
	return out, rows.Err()
}

func (s *Store) GetImportJob(ctx context.Context, tenantID, jobID string) (studentimportdomain.ImportJob, bool, error) {
	row := s.db.QueryRowContext(ctx, `
SELECT id::text, tenant_id::text, status, file_name, COALESCE(uploaded_by::text, ''),
       total_rows, valid_rows, warning_rows, error_rows, imported_rows, options, created_at, completed_at
FROM student_import_jobs
WHERE tenant_id = $1 AND id = $2`, tenantID, jobID)
	item, err := scanImportJob(row)
	if err == sql.ErrNoRows {
		return studentimportdomain.ImportJob{}, false, nil
	}
	if err != nil {
		return studentimportdomain.ImportJob{}, false, err
	}
	return item, true, nil
}

func (s *Store) CreateImportJob(ctx context.Context, tenantID, userID string, input studentimportdomain.CreateJobInput, rows []studentimportdomain.ImportRow) (studentimportdomain.ImportJob, error) {
	optionsPayload, _ := json.Marshal(input.Options)
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return studentimportdomain.ImportJob{}, err
	}
	defer tx.Rollback()

	var job studentimportdomain.ImportJob
	var optionsRaw []byte
	var completedAt sql.NullTime
	err = tx.QueryRowContext(ctx, `
INSERT INTO student_import_jobs (tenant_id, status, file_name, uploaded_by, total_rows, options)
VALUES ($1, 'validating', $2, NULLIF($3, '')::uuid, $4, $5::jsonb)
RETURNING id::text, tenant_id::text, status, file_name, COALESCE(uploaded_by::text, ''),
          total_rows, valid_rows, warning_rows, error_rows, imported_rows, options, created_at, completed_at`,
		tenantID, strings.TrimSpace(input.FileName), userID, len(rows), string(optionsPayload),
	).Scan(
		&job.ID, &job.TenantID, &job.Status, &job.FileName, &job.UploadedBy,
		&job.TotalRows, &job.ValidRows, &job.WarningRows, &job.ErrorRows, &job.ImportedRows, &optionsRaw, &job.CreatedAt, &completedAt,
	)
	if err != nil {
		return studentimportdomain.ImportJob{}, err
	}
	_ = json.Unmarshal(optionsRaw, &job.Options)
	if completedAt.Valid {
		job.CompletedAt = &completedAt.Time
	}

	for _, row := range rows {
		if err := insertImportRowTx(ctx, tx, tenantID, job.ID, row); err != nil {
			return studentimportdomain.ImportJob{}, err
		}
	}
	if err := tx.Commit(); err != nil {
		return studentimportdomain.ImportJob{}, err
	}
	return job, nil
}

func (s *Store) UpdateImportJobStats(ctx context.Context, tenantID, jobID string, status studentimportdomain.JobStatus, stats studentimportdomain.ImportJob, completedAt *time.Time) error {
	_, err := s.db.ExecContext(ctx, `
UPDATE student_import_jobs
SET status = $1, total_rows = $2, valid_rows = $3, warning_rows = $4, error_rows = $5,
    imported_rows = $6, completed_at = $7
WHERE tenant_id = $8 AND id = $9`,
		string(status), stats.TotalRows, stats.ValidRows, stats.WarningRows, stats.ErrorRows, stats.ImportedRows, completedAt, tenantID, jobID,
	)
	return err
}

func (s *Store) SetImportJobStatus(ctx context.Context, tenantID, jobID string, status studentimportdomain.JobStatus) error {
	_, err := s.db.ExecContext(ctx, `
UPDATE student_import_jobs SET status = $1 WHERE tenant_id = $2 AND id = $3`,
		string(status), tenantID, jobID)
	return err
}

func (s *Store) ListImportRows(ctx context.Context, tenantID, jobID string) ([]studentimportdomain.ImportRow, error) {
	rows, err := s.db.QueryContext(ctx, `
SELECT id::text, job_id::text, row_number, raw_data, normalized_data, status, error_messages,
       COALESCE(created_student_id::text, ''), COALESCE(created_guardian_user_id::text, '')
FROM student_import_rows
WHERE tenant_id = $1 AND job_id = $2
ORDER BY row_number ASC`, tenantID, jobID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := make([]studentimportdomain.ImportRow, 0)
	for rows.Next() {
		item, err := scanImportRow(rows)
		if err != nil {
			continue
		}
		out = append(out, item)
	}
	return out, rows.Err()
}

func (s *Store) GetImportRow(ctx context.Context, tenantID, jobID, rowID string) (studentimportdomain.ImportRow, bool, error) {
	row := s.db.QueryRowContext(ctx, `
SELECT id::text, job_id::text, row_number, raw_data, normalized_data, status, error_messages,
       COALESCE(created_student_id::text, ''), COALESCE(created_guardian_user_id::text, '')
FROM student_import_rows
WHERE tenant_id = $1 AND job_id = $2 AND id = $3`, tenantID, jobID, rowID)
	item, err := scanImportRow(row)
	if err == sql.ErrNoRows {
		return studentimportdomain.ImportRow{}, false, nil
	}
	if err != nil {
		return studentimportdomain.ImportRow{}, false, err
	}
	return item, true, nil
}

func (s *Store) UpdateImportRow(ctx context.Context, tenantID, jobID, rowID string, row studentimportdomain.ImportRow) error {
	rawData, _ := json.Marshal(row.RawData)
	normalized, _ := json.Marshal(row.NormalizedData)
	messages, _ := json.Marshal(row.ErrorMessages)
	_, err := s.db.ExecContext(ctx, `
UPDATE student_import_rows
SET normalized_data = $1::jsonb, status = $2, error_messages = $3::jsonb,
    created_student_id = NULLIF($4, '')::uuid, created_guardian_user_id = NULLIF($5, '')::uuid
WHERE tenant_id = $6 AND job_id = $7 AND id = $8`,
		string(normalized), string(row.Status), string(messages), row.CreatedStudentID, row.CreatedGuardianUserID, tenantID, jobID, rowID,
	)
	_ = rawData
	return err
}

func (s *Store) ReplaceImportRows(ctx context.Context, tenantID, jobID string, rows []studentimportdomain.ImportRow) error {
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()
	if _, err := tx.ExecContext(ctx, `DELETE FROM student_import_rows WHERE tenant_id = $1 AND job_id = $2`, tenantID, jobID); err != nil {
		return err
	}
	for _, row := range rows {
		if err := insertImportRowTx(ctx, tx, tenantID, jobID, row); err != nil {
			return err
		}
	}
	return tx.Commit()
}

func (s *Store) ListClassRefs(ctx context.Context, tenantID string) ([]studentimportdomain.ClassRef, error) {
	classes, err := s.listPrincipalClasses(ctx, tenantID)
	if err != nil {
		return nil, err
	}
	out := make([]studentimportdomain.ClassRef, 0, len(classes))
	for _, class := range classes {
		out = append(out, studentimportdomain.ClassRef{ID: class.ID, Name: class.Name})
	}
	return out, nil
}

func (s *Store) CreateClassRef(ctx context.Context, tenantID, name string) (studentimportdomain.ClassRef, error) {
	created, err := s.CreateClass(ctx, tenantID, schooldomain.CreateClassInput{Name: strings.TrimSpace(name), Level: strings.TrimSpace(name)})
	if err != nil {
		return studentimportdomain.ClassRef{}, err
	}
	return studentimportdomain.ClassRef{ID: created.ID, Name: created.Name}, nil
}

func (s *Store) ListExistingSchoolNumbers(ctx context.Context, tenantID string) (map[string]struct{}, error) {
	rows, err := s.db.QueryContext(ctx, `
SELECT lower(trim(student_number)) FROM students WHERE tenant_id = $1 AND deleted_at IS NULL`, tenantID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := map[string]struct{}{}
	for rows.Next() {
		var number string
		if err := rows.Scan(&number); err != nil {
			continue
		}
		out[number] = struct{}{}
	}
	return out, rows.Err()
}

func (s *Store) CreateImportedStudent(ctx context.Context, tenantID string, input schooldomain.CreateStudentInput) (string, error) {
	created, err := s.CreateStudent(ctx, tenantID, input)
	if err != nil {
		return "", err
	}
	return created.ID, nil
}

func (s *Store) ProvisionImportedGuardian(ctx context.Context, tenantID string, input schooldomain.ProvisionGuardianInput) (schooldomain.ProvisionGuardianResult, error) {
	result, err := s.ProvisionGuardian(ctx, tenantID, input)
	if err == nil {
		return result, nil
	}
	if !errors.Is(err, schooldomain.ErrDuplicateEmail) {
		return schooldomain.ProvisionGuardianResult{}, err
	}

	email := strings.ToLower(strings.TrimSpace(input.Email))
	fullName := schooldomain.JoinFullName(input.FirstName, input.LastName)
	relation := strings.TrimSpace(input.Relation)
	if relation == "" {
		relation = "Veli"
	}

	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return schooldomain.ProvisionGuardianResult{}, err
	}
	defer tx.Rollback()

	var userID string
	err = tx.QueryRowContext(ctx, `
SELECT u.id::text
FROM users u
JOIN tenant_memberships tm ON tm.user_id = u.id AND tm.tenant_id = $1::uuid AND tm.status = 'active'
WHERE lower(u.email) = lower($2) AND u.is_active = true
LIMIT 1`, tenantID, email).Scan(&userID)
	if errors.Is(err, sql.ErrNoRows) {
		return schooldomain.ProvisionGuardianResult{}, schooldomain.ErrDuplicateEmail
	}
	if err != nil {
		return schooldomain.ProvisionGuardianResult{}, err
	}

	roleID, err := ensureRole(ctx, tx, tenantID, string(identity.RoleGuardian))
	if err != nil {
		return schooldomain.ProvisionGuardianResult{}, err
	}
	if _, err := tx.ExecContext(ctx, `
INSERT INTO user_roles (tenant_id, user_id, role_id)
VALUES ($1::uuid, $2::uuid, $3::uuid)
ON CONFLICT DO NOTHING`, tenantID, userID, roleID); err != nil {
		return schooldomain.ProvisionGuardianResult{}, err
	}

	var guardianID string
	err = tx.QueryRowContext(ctx, `
SELECT id::text FROM guardians WHERE tenant_id = $1::uuid AND user_id = $2::uuid`, tenantID, userID).Scan(&guardianID)
	if errors.Is(err, sql.ErrNoRows) {
		err = tx.QueryRowContext(ctx, `
INSERT INTO guardians (tenant_id, user_id, full_name, email)
VALUES ($1::uuid, $2::uuid, $3, $4)
RETURNING id::text`, tenantID, userID, fullName, email).Scan(&guardianID)
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
SELECT EXISTS (SELECT 1 FROM students WHERE tenant_id = $1::uuid AND id = $2::uuid)`, tenantID, studentID).Scan(&exists)
		if err != nil || !exists {
			return schooldomain.ProvisionGuardianResult{}, schooldomain.ErrStudentNotFound
		}
		res, err := tx.ExecContext(ctx, `
INSERT INTO student_guardians (tenant_id, student_id, guardian_id, relation, is_primary)
VALUES ($1::uuid, $2::uuid, $3::uuid, $4, false)
ON CONFLICT (tenant_id, student_id, guardian_id) DO NOTHING`, tenantID, studentID, guardianID, relation)
		if err != nil {
			return schooldomain.ProvisionGuardianResult{}, err
		}
		if rows, _ := res.RowsAffected(); rows > 0 {
			linked++
		}
	}
	if linked == 0 {
		return schooldomain.ProvisionGuardianResult{}, schooldomain.ErrInvalidInput
	}
	if err := tx.Commit(); err != nil {
		return schooldomain.ProvisionGuardianResult{}, err
	}
	return schooldomain.ProvisionGuardianResult{
		UserID:         userID,
		Email:          email,
		LinkedStudents: linked,
	}, nil
}

func (s *Store) DeactivateImportedStudents(ctx context.Context, tenantID string, studentIDs []string) error {
	for _, studentID := range studentIDs {
		if strings.TrimSpace(studentID) == "" {
			continue
		}
		if _, err := s.db.ExecContext(ctx, `
UPDATE students SET status = 'passive'
WHERE tenant_id = $1 AND id = $2::uuid AND deleted_at IS NULL`, tenantID, studentID); err != nil {
			return err
		}
	}
	return nil
}

func insertImportRowTx(ctx context.Context, tx *sql.Tx, tenantID, jobID string, row studentimportdomain.ImportRow) error {
	rawData, _ := json.Marshal(row.RawData)
	normalized, _ := json.Marshal(row.NormalizedData)
	messages, _ := json.Marshal(row.ErrorMessages)
	_, err := tx.ExecContext(ctx, `
INSERT INTO student_import_rows (tenant_id, job_id, row_number, raw_data, normalized_data, status, error_messages)
VALUES ($1, $2::uuid, $3, $4::jsonb, $5::jsonb, $6, $7::jsonb)`,
		tenantID, jobID, row.RowNumber, string(rawData), string(normalized), string(row.Status), string(messages),
	)
	return err
}

type importJobScanner interface {
	Scan(dest ...any) error
}

func scanImportJob(scanner importJobScanner) (studentimportdomain.ImportJob, error) {
	var item studentimportdomain.ImportJob
	var optionsRaw []byte
	var completedAt sql.NullTime
	if err := scanner.Scan(
		&item.ID, &item.TenantID, &item.Status, &item.FileName, &item.UploadedBy,
		&item.TotalRows, &item.ValidRows, &item.WarningRows, &item.ErrorRows, &item.ImportedRows, &optionsRaw, &item.CreatedAt, &completedAt,
	); err != nil {
		return studentimportdomain.ImportJob{}, err
	}
	if len(optionsRaw) > 0 {
		_ = json.Unmarshal(optionsRaw, &item.Options)
	}
	if completedAt.Valid {
		item.CompletedAt = &completedAt.Time
	}
	return item, nil
}

func scanImportRow(scanner importJobScanner) (studentimportdomain.ImportRow, error) {
	var item studentimportdomain.ImportRow
	var rawData, normalized, messages []byte
	if err := scanner.Scan(
		&item.ID, &item.JobID, &item.RowNumber, &rawData, &normalized, &item.Status, &messages,
		&item.CreatedStudentID, &item.CreatedGuardianUserID,
	); err != nil {
		return studentimportdomain.ImportRow{}, err
	}
	_ = json.Unmarshal(rawData, &item.RawData)
	_ = json.Unmarshal(normalized, &item.NormalizedData)
	_ = json.Unmarshal(messages, &item.ErrorMessages)
	if item.RawData == nil {
		item.RawData = map[string]any{}
	}
	return item, nil
}
