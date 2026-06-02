package postgres

import (
	"context"
	"database/sql"
	"errors"
	"strings"

	academicdomain "ots/backend/internal/domain/academic"
)

func (s *Store) ListAcademicAssessments(ctx context.Context, tenantID string) ([]academicdomain.Assessment, error) {
	rows, err := s.db.QueryContext(ctx, `
SELECT aa.id::text, aa.tenant_id::text, aa.name, aa.subject_id::text, sub.name,
       COALESCE(aa.class_id::text, ''), COALESCE(c.name, ''), aa.assessment_type,
       aa.max_score::float8, aa.assessment_date::text, COALESCE(aa.created_by::text, ''),
       aa.created_at, aa.updated_at
FROM academic_assessments aa
JOIN subjects sub ON sub.id = aa.subject_id AND sub.tenant_id = aa.tenant_id
LEFT JOIN classes c ON c.id = aa.class_id AND c.tenant_id = aa.tenant_id
WHERE aa.tenant_id = $1 AND aa.deleted_at IS NULL
ORDER BY aa.assessment_date DESC, aa.created_at DESC`, tenantID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []academicdomain.Assessment{}
	for rows.Next() {
		item, ok := scanAcademicAssessment(rows)
		if ok {
			out = append(out, item)
		}
	}
	return out, rows.Err()
}

func (s *Store) GetAcademicAssessment(ctx context.Context, tenantID, assessmentID string) (academicdomain.Assessment, bool, error) {
	row := s.db.QueryRowContext(ctx, `
SELECT aa.id::text, aa.tenant_id::text, aa.name, aa.subject_id::text, sub.name,
       COALESCE(aa.class_id::text, ''), COALESCE(c.name, ''), aa.assessment_type,
       aa.max_score::float8, aa.assessment_date::text, COALESCE(aa.created_by::text, ''),
       aa.created_at, aa.updated_at
FROM academic_assessments aa
JOIN subjects sub ON sub.id = aa.subject_id AND sub.tenant_id = aa.tenant_id
LEFT JOIN classes c ON c.id = aa.class_id AND c.tenant_id = aa.tenant_id
WHERE aa.tenant_id = $1 AND aa.id = $2 AND aa.deleted_at IS NULL`, tenantID, assessmentID)
	item, ok := scanAcademicAssessment(row)
	if !ok {
		return academicdomain.Assessment{}, false, nil
	}
	return item, true, nil
}

func (s *Store) CreateAcademicAssessment(ctx context.Context, tenantID, actorUserID string, input academicdomain.CreateAssessmentInput) (academicdomain.Assessment, error) {
	var id string
	err := s.db.QueryRowContext(ctx, `
INSERT INTO academic_assessments (tenant_id, name, subject_id, class_id, assessment_type, max_score, assessment_date, created_by)
VALUES ($1, $2, $3, NULLIF($4, '')::uuid, $5, $6, $7::date, NULLIF($8, '')::uuid)
RETURNING id::text`, tenantID, input.Name, input.SubjectID, input.ClassID, string(input.AssessmentType), input.MaxScore, input.AssessmentDate, actorUserID).Scan(&id)
	if err != nil {
		return academicdomain.Assessment{}, err
	}
	item, ok, err := s.GetAcademicAssessment(ctx, tenantID, id)
	if err != nil || !ok {
		return academicdomain.Assessment{}, err
	}
	return item, nil
}

func (s *Store) UpdateAcademicAssessment(ctx context.Context, tenantID, assessmentID string, input academicdomain.UpdateAssessmentInput) (academicdomain.Assessment, error) {
	current, ok, err := s.GetAcademicAssessment(ctx, tenantID, assessmentID)
	if err != nil {
		return academicdomain.Assessment{}, err
	}
	if !ok {
		return academicdomain.Assessment{}, errors.New("assessment not found")
	}
	name := current.Name
	subjectID := current.SubjectID
	classID := current.ClassID
	assessmentType := current.AssessmentType
	maxScore := current.MaxScore
	assessmentDate := current.AssessmentDate
	if input.Name != nil {
		name = *input.Name
	}
	if input.SubjectID != nil {
		subjectID = *input.SubjectID
	}
	if input.ClassID != nil {
		classID = *input.ClassID
	}
	if input.AssessmentType != nil {
		assessmentType = *input.AssessmentType
	}
	if input.MaxScore != nil {
		maxScore = *input.MaxScore
	}
	if input.AssessmentDate != nil {
		assessmentDate = *input.AssessmentDate
	}
	_, err = s.db.ExecContext(ctx, `
UPDATE academic_assessments
SET name = $3, subject_id = $4, class_id = NULLIF($5, '')::uuid,
    assessment_type = $6, max_score = $7, assessment_date = $8::date, updated_at = now()
WHERE tenant_id = $1 AND id = $2 AND deleted_at IS NULL`,
		tenantID, assessmentID, name, subjectID, classID, string(assessmentType), maxScore, assessmentDate)
	if err != nil {
		return academicdomain.Assessment{}, err
	}
	updated, ok, err := s.GetAcademicAssessment(ctx, tenantID, assessmentID)
	if err != nil || !ok {
		return academicdomain.Assessment{}, err
	}
	return updated, nil
}

func (s *Store) DeleteAcademicAssessment(ctx context.Context, tenantID, assessmentID string) error {
	result, err := s.db.ExecContext(ctx, `
UPDATE academic_assessments SET deleted_at = now(), updated_at = now()
WHERE tenant_id = $1 AND id = $2 AND deleted_at IS NULL`, tenantID, assessmentID)
	if err != nil {
		return err
	}
	affected, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if affected == 0 {
		return errors.New("assessment not found")
	}
	return nil
}

func (s *Store) ListAcademicResults(ctx context.Context, tenantID, assessmentID string) ([]academicdomain.Result, error) {
	rows, err := s.db.QueryContext(ctx, academicResultsSelect(`
WHERE ar.tenant_id = $1 AND ar.assessment_id = $2
ORDER BY c.name, st.full_name`), tenantID, assessmentID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanAcademicResults(rows)
}

func (s *Store) SaveAcademicResults(ctx context.Context, tenantID, assessmentID, _ string, rows []academicdomain.ResultInput) ([]academicdomain.Result, error) {
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer rollback(tx)
	for _, row := range rows {
		student, ok, err := s.ResolveAcademicStudent(ctx, tenantID, row)
		if err != nil {
			return nil, err
		}
		if !ok {
			continue
		}
		_, err = tx.ExecContext(ctx, `
INSERT INTO academic_results (tenant_id, assessment_id, student_id, score, percentile, note)
VALUES ($1, $2, $3, $4, $5, NULLIF($6, ''))
ON CONFLICT (tenant_id, assessment_id, student_id)
DO UPDATE SET score = EXCLUDED.score, percentile = EXCLUDED.percentile,
              note = EXCLUDED.note, updated_at = now()`,
			tenantID, assessmentID, student.ID, row.Score, row.Percentile, strings.TrimSpace(row.Note))
		if err != nil {
			return nil, err
		}
	}
	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return s.ListAcademicResults(ctx, tenantID, assessmentID)
}

func (s *Store) ResolveAcademicStudent(ctx context.Context, tenantID string, input academicdomain.ResultInput) (academicdomain.StudentRef, bool, error) {
	studentID := strings.TrimSpace(input.StudentID)
	schoolNumber := strings.TrimSpace(input.SchoolNumber)
	fullName := strings.TrimSpace(input.FullName)
	row := s.db.QueryRowContext(ctx, `
SELECT st.id::text, st.full_name, st.student_number,
       COALESCE(cs.class_id::text, ''), COALESCE(c.name, '')
FROM students st
LEFT JOIN LATERAL (
	SELECT class_id FROM class_students
	WHERE tenant_id = st.tenant_id AND student_id = st.id
	  AND (ends_on IS NULL OR ends_on >= CURRENT_DATE)
	ORDER BY starts_on DESC NULLS LAST
	LIMIT 1
) cs ON true
LEFT JOIN classes c ON c.id = cs.class_id AND c.tenant_id = st.tenant_id
WHERE st.tenant_id = $1
  AND st.deleted_at IS NULL
  AND st.status = 'active'
  AND (
    (NULLIF($2, '')::uuid IS NOT NULL AND st.id = NULLIF($2, '')::uuid)
    OR ($2 = '' AND $3 <> '' AND st.student_number = $3)
    OR ($2 = '' AND $3 = '' AND $4 <> '' AND lower(st.full_name) = lower($4))
  )
ORDER BY st.full_name
LIMIT 1`, tenantID, studentID, schoolNumber, fullName)
	var item academicdomain.StudentRef
	err := row.Scan(&item.ID, &item.FullName, &item.SchoolNumber, &item.ClassID, &item.ClassName)
	if errors.Is(err, sql.ErrNoRows) {
		return academicdomain.StudentRef{}, false, nil
	}
	if err != nil {
		return academicdomain.StudentRef{}, false, err
	}
	return item, true, nil
}

func (s *Store) StudentAcademicDataset(ctx context.Context, tenantID, studentID string) (academicdomain.StudentAcademicDataset, bool, error) {
	student, ok, err := s.ResolveAcademicStudent(ctx, tenantID, academicdomain.ResultInput{StudentID: studentID})
	if err != nil || !ok {
		return academicdomain.StudentAcademicDataset{}, ok, err
	}
	rows, err := s.db.QueryContext(ctx, academicResultsSelect(`
WHERE ar.tenant_id = $1 AND ar.student_id = $2
ORDER BY aa.assessment_date DESC`), tenantID, studentID)
	if err != nil {
		return academicdomain.StudentAcademicDataset{}, false, err
	}
	results, err := scanAcademicResults(rows)
	if err != nil {
		return academicdomain.StudentAcademicDataset{}, false, err
	}
	assessments := filterAssessmentsForResults(awaitAssessments(ctx, s, tenantID), results)
	outcomes, err := s.listStudentOutcomeProgress(ctx, tenantID, studentID)
	if err != nil {
		return academicdomain.StudentAcademicDataset{}, false, err
	}
	return academicdomain.StudentAcademicDataset{Student: student, Assessments: assessments, Results: results, Outcomes: outcomes}, true, nil
}

func (s *Store) ClassAcademicDataset(ctx context.Context, tenantID, classID string) (academicdomain.ClassAcademicDataset, bool, error) {
	var class academicdomain.ClassRef
	err := s.db.QueryRowContext(ctx, `
SELECT id::text, name FROM classes
WHERE tenant_id = $1 AND id = $2 AND deleted_at IS NULL`, tenantID, classID).Scan(&class.ID, &class.Name)
	if errors.Is(err, sql.ErrNoRows) {
		return academicdomain.ClassAcademicDataset{}, false, nil
	}
	if err != nil {
		return academicdomain.ClassAcademicDataset{}, false, err
	}
	students, err := s.listAcademicStudentsForClass(ctx, tenantID, classID)
	if err != nil {
		return academicdomain.ClassAcademicDataset{}, false, err
	}
	rows, err := s.db.QueryContext(ctx, academicResultsSelect(`
JOIN class_students active_cs ON active_cs.tenant_id = ar.tenant_id
  AND active_cs.student_id = ar.student_id
  AND active_cs.class_id = $2
  AND (active_cs.ends_on IS NULL OR active_cs.ends_on >= CURRENT_DATE)
WHERE ar.tenant_id = $1
ORDER BY aa.assessment_date DESC`), tenantID, classID)
	if err != nil {
		return academicdomain.ClassAcademicDataset{}, false, err
	}
	results, err := scanAcademicResults(rows)
	if err != nil {
		return academicdomain.ClassAcademicDataset{}, false, err
	}
	assessments := filterAssessmentsForResults(awaitAssessments(ctx, s, tenantID), results)
	for _, assessment := range awaitAssessments(ctx, s, tenantID) {
		if assessment.ClassID == classID && !assessmentInList(assessments, assessment.ID) {
			assessments = append(assessments, assessment)
		}
	}
	return academicdomain.ClassAcademicDataset{Class: class, Students: students, Assessments: assessments, Results: results}, true, nil
}

func (s *Store) TeacherCanManageClassSubject(ctx context.Context, tenantID, teacherUserID, classID, subjectID string) bool {
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
    AND (NULLIF($3, '')::uuid IS NULL OR sl.class_id = NULLIF($3, '')::uuid)
    AND (NULLIF($4, '')::uuid IS NULL OR sl.subject_id = NULLIF($4, '')::uuid)
)`, tenantID, teacherUserID, classID, subjectID).Scan(&exists)
	return err == nil && exists
}

type academicAssessmentScanner interface {
	Scan(dest ...any) error
}

func scanAcademicAssessment(scanner academicAssessmentScanner) (academicdomain.Assessment, bool) {
	var item academicdomain.Assessment
	var assessmentType string
	err := scanner.Scan(
		&item.ID, &item.TenantID, &item.Name, &item.SubjectID, &item.SubjectName,
		&item.ClassID, &item.ClassName, &assessmentType, &item.MaxScore,
		&item.AssessmentDate, &item.CreatedBy, &item.CreatedAt, &item.UpdatedAt,
	)
	if err != nil {
		return academicdomain.Assessment{}, false
	}
	item.AssessmentType = academicdomain.AssessmentType(assessmentType)
	return item, true
}

func academicResultsSelect(where string) string {
	return `
SELECT ar.id::text, ar.tenant_id::text, ar.assessment_id::text, ar.student_id::text,
       st.full_name, COALESCE(cs.class_id::text, ''), COALESCE(c.name, ''),
       ar.score::float8, ar.percentile::float8, COALESCE(ar.note, ''),
       ar.created_at, ar.updated_at
FROM academic_results ar
JOIN academic_assessments aa ON aa.id = ar.assessment_id AND aa.tenant_id = ar.tenant_id AND aa.deleted_at IS NULL
JOIN students st ON st.id = ar.student_id AND st.tenant_id = ar.tenant_id
LEFT JOIN LATERAL (
	SELECT class_id FROM class_students
	WHERE tenant_id = st.tenant_id AND student_id = st.id
	  AND (ends_on IS NULL OR ends_on >= CURRENT_DATE)
	ORDER BY starts_on DESC NULLS LAST
	LIMIT 1
) cs ON true
LEFT JOIN classes c ON c.id = cs.class_id AND c.tenant_id = st.tenant_id
` + where
}

func scanAcademicResults(rows *sql.Rows) ([]academicdomain.Result, error) {
	defer rows.Close()
	out := []academicdomain.Result{}
	for rows.Next() {
		var item academicdomain.Result
		var percentile sql.NullFloat64
		if err := rows.Scan(
			&item.ID, &item.TenantID, &item.AssessmentID, &item.StudentID, &item.StudentName,
			&item.ClassID, &item.ClassName, &item.Score, &percentile, &item.Note,
			&item.CreatedAt, &item.UpdatedAt,
		); err != nil {
			return nil, err
		}
		if percentile.Valid {
			item.Percentile = &percentile.Float64
		}
		out = append(out, item)
	}
	return out, rows.Err()
}

func awaitAssessments(ctx context.Context, s *Store, tenantID string) []academicdomain.Assessment {
	items, err := s.ListAcademicAssessments(ctx, tenantID)
	if err != nil {
		return []academicdomain.Assessment{}
	}
	return items
}

func filterAssessmentsForResults(assessments []academicdomain.Assessment, results []academicdomain.Result) []academicdomain.Assessment {
	ids := map[string]struct{}{}
	for _, result := range results {
		ids[result.AssessmentID] = struct{}{}
	}
	out := []academicdomain.Assessment{}
	for _, assessment := range assessments {
		if _, ok := ids[assessment.ID]; ok {
			out = append(out, assessment)
		}
	}
	return out
}

func assessmentInList(items []academicdomain.Assessment, id string) bool {
	for _, item := range items {
		if item.ID == id {
			return true
		}
	}
	return false
}

func (s *Store) listAcademicStudentsForClass(ctx context.Context, tenantID, classID string) ([]academicdomain.StudentRef, error) {
	rows, err := s.db.QueryContext(ctx, `
SELECT st.id::text, st.full_name, st.student_number, cs.class_id::text, c.name
FROM class_students cs
JOIN students st ON st.id = cs.student_id AND st.tenant_id = cs.tenant_id
JOIN classes c ON c.id = cs.class_id AND c.tenant_id = cs.tenant_id
WHERE cs.tenant_id = $1 AND cs.class_id = $2
  AND (cs.ends_on IS NULL OR cs.ends_on >= CURRENT_DATE)
  AND st.status = 'active' AND st.deleted_at IS NULL
ORDER BY st.student_number`, tenantID, classID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []academicdomain.StudentRef{}
	for rows.Next() {
		var item academicdomain.StudentRef
		if err := rows.Scan(&item.ID, &item.FullName, &item.SchoolNumber, &item.ClassID, &item.ClassName); err != nil {
			return nil, err
		}
		out = append(out, item)
	}
	return out, rows.Err()
}

func (s *Store) listStudentOutcomeProgress(ctx context.Context, tenantID, studentID string) ([]academicdomain.StudentOutcomeProgress, error) {
	rows, err := s.db.QueryContext(ctx, `
SELECT sop.id::text, sop.tenant_id::text, sop.student_id::text, sop.outcome_id::text,
       lo.code, lo.title, sub.name, sop.status, COALESCE(sop.evidence, ''),
       COALESCE(sop.updated_by::text, ''), sop.updated_at
FROM student_outcome_progress sop
JOIN learning_outcomes lo ON lo.id = sop.outcome_id AND lo.tenant_id = sop.tenant_id
JOIN subjects sub ON sub.id = lo.subject_id AND sub.tenant_id = lo.tenant_id
WHERE sop.tenant_id = $1 AND sop.student_id = $2
ORDER BY sub.name, lo.code`, tenantID, studentID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []academicdomain.StudentOutcomeProgress{}
	for rows.Next() {
		var item academicdomain.StudentOutcomeProgress
		var status string
		if err := rows.Scan(
			&item.ID, &item.TenantID, &item.StudentID, &item.OutcomeID,
			&item.OutcomeCode, &item.OutcomeTitle, &item.SubjectName, &status,
			&item.Evidence, &item.UpdatedBy, &item.UpdatedAt,
		); err != nil {
			return nil, err
		}
		item.Status = academicdomain.OutcomeStatus(status)
		out = append(out, item)
	}
	return out, rows.Err()
}
