package memory

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

	schooldomain "ots/backend/internal/domain/school"
	studentimportdomain "ots/backend/internal/domain/studentimport"
)

type memoryImportJob struct {
	Job  studentimportdomain.ImportJob
	Rows []studentimportdomain.ImportRow
}

func (s *Store) ensureImportJobsLocked() map[string]memoryImportJob {
	if s.studentImportJobs == nil {
		s.studentImportJobs = map[string]memoryImportJob{}
	}
	return s.studentImportJobs
}

func (s *Store) ListImportJobs(_ context.Context, tenantID string, limit int) ([]studentimportdomain.ImportJob, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	if limit <= 0 {
		limit = 50
	}
	out := make([]studentimportdomain.ImportJob, 0)
	for _, item := range s.ensureImportJobsLocked() {
		if item.Job.TenantID != tenantID {
			continue
		}
		out = append(out, item.Job)
		if len(out) >= limit {
			break
		}
	}
	return out, nil
}

func (s *Store) GetImportJob(_ context.Context, tenantID, jobID string) (studentimportdomain.ImportJob, bool, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	item, ok := s.ensureImportJobsLocked()[jobID]
	if !ok || item.Job.TenantID != tenantID {
		return studentimportdomain.ImportJob{}, false, nil
	}
	return item.Job, true, nil
}

func (s *Store) CreateImportJob(_ context.Context, tenantID, userID string, input studentimportdomain.CreateJobInput, rows []studentimportdomain.ImportRow) (studentimportdomain.ImportJob, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	jobs := s.ensureImportJobsLocked()
	id := fmt.Sprintf("import-job-%d", len(jobs)+1)
	now := s.clock()
	storedRows := make([]studentimportdomain.ImportRow, 0, len(rows))
	for i, row := range rows {
		row.ID = fmt.Sprintf("%s-row-%d", id, i+1)
		row.JobID = id
		storedRows = append(storedRows, row)
	}
	job := studentimportdomain.ImportJob{
		ID:         id,
		TenantID:   tenantID,
		Status:     studentimportdomain.JobStatusValidating,
		FileName:   strings.TrimSpace(input.FileName),
		UploadedBy: userID,
		TotalRows:  len(storedRows),
		Options:    input.Options,
		CreatedAt:  now,
	}
	jobs[id] = memoryImportJob{Job: job, Rows: storedRows}
	return job, nil
}

func (s *Store) UpdateImportJobStats(_ context.Context, tenantID, jobID string, status studentimportdomain.JobStatus, stats studentimportdomain.ImportJob, completedAt *time.Time) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	item, ok := s.ensureImportJobsLocked()[jobID]
	if !ok || item.Job.TenantID != tenantID {
		return fmt.Errorf("not found")
	}
	item.Job.Status = status
	item.Job.TotalRows = stats.TotalRows
	item.Job.ValidRows = stats.ValidRows
	item.Job.WarningRows = stats.WarningRows
	item.Job.ErrorRows = stats.ErrorRows
	item.Job.ImportedRows = stats.ImportedRows
	item.Job.CompletedAt = completedAt
	s.studentImportJobs[jobID] = item
	return nil
}

func (s *Store) SetImportJobStatus(_ context.Context, tenantID, jobID string, status studentimportdomain.JobStatus) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	item, ok := s.ensureImportJobsLocked()[jobID]
	if !ok || item.Job.TenantID != tenantID {
		return fmt.Errorf("not found")
	}
	item.Job.Status = status
	s.studentImportJobs[jobID] = item
	return nil
}

func (s *Store) ListImportRows(_ context.Context, tenantID, jobID string) ([]studentimportdomain.ImportRow, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	item, ok := s.ensureImportJobsLocked()[jobID]
	if !ok || item.Job.TenantID != tenantID {
		return nil, fmt.Errorf("not found")
	}
	return append([]studentimportdomain.ImportRow(nil), item.Rows...), nil
}

func (s *Store) GetImportRow(_ context.Context, tenantID, jobID, rowID string) (studentimportdomain.ImportRow, bool, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	item, ok := s.ensureImportJobsLocked()[jobID]
	if !ok || item.Job.TenantID != tenantID {
		return studentimportdomain.ImportRow{}, false, nil
	}
	for _, row := range item.Rows {
		if row.ID == rowID {
			return row, true, nil
		}
	}
	return studentimportdomain.ImportRow{}, false, nil
}

func (s *Store) UpdateImportRow(_ context.Context, tenantID, jobID, rowID string, row studentimportdomain.ImportRow) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	item, ok := s.ensureImportJobsLocked()[jobID]
	if !ok || item.Job.TenantID != tenantID {
		return fmt.Errorf("not found")
	}
	for i := range item.Rows {
		if item.Rows[i].ID == rowID {
			item.Rows[i] = row
			s.studentImportJobs[jobID] = item
			return nil
		}
	}
	return fmt.Errorf("not found")
}

func (s *Store) ReplaceImportRows(_ context.Context, tenantID, jobID string, rows []studentimportdomain.ImportRow) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	item, ok := s.ensureImportJobsLocked()[jobID]
	if !ok || item.Job.TenantID != tenantID {
		return fmt.Errorf("not found")
	}
	item.Rows = append([]studentimportdomain.ImportRow(nil), rows...)
	s.studentImportJobs[jobID] = item
	return nil
}

func (s *Store) ListClassRefs(_ context.Context, tenantID string) ([]studentimportdomain.ClassRef, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	if tenantID != s.tenant.ID {
		return []studentimportdomain.ClassRef{}, nil
	}
	out := make([]studentimportdomain.ClassRef, 0, len(s.classes))
	for _, class := range s.classes {
		out = append(out, studentimportdomain.ClassRef{ID: class.ID, Name: class.Name})
	}
	return out, nil
}

func (s *Store) CreateClassRef(_ context.Context, tenantID, name string) (studentimportdomain.ClassRef, error) {
	created, err := s.CreateClass(context.Background(), tenantID, schooldomain.CreateClassInput{Name: name, Level: name})
	if err != nil {
		return studentimportdomain.ClassRef{}, err
	}
	return studentimportdomain.ClassRef{ID: created.ID, Name: created.Name}, nil
}

func (s *Store) ListExistingSchoolNumbers(_ context.Context, tenantID string) (map[string]struct{}, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := map[string]struct{}{}
	for _, student := range s.students {
		if student.TenantID != tenantID {
			continue
		}
		out[strings.ToLower(strings.TrimSpace(student.Number))] = struct{}{}
	}
	return out, nil
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
	relation := strings.TrimSpace(input.Relation)
	if relation == "" {
		relation = "Veli"
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	userID := ""
	for _, user := range s.users {
		if user.TenantID == tenantID && strings.ToLower(user.Email) == email {
			userID = user.ID
			break
		}
	}
	if userID == "" {
		return schooldomain.ProvisionGuardianResult{}, schooldomain.ErrDuplicateEmail
	}

	linked := 0
	for _, rawStudentID := range input.StudentIDs {
		studentID := strings.TrimSpace(rawStudentID)
		if studentID == "" {
			continue
		}
		if _, ok := s.studentByID(studentID); !ok {
			return schooldomain.ProvisionGuardianResult{}, schooldomain.ErrStudentNotFound
		}
		alreadyLinked := false
		for _, link := range s.studentGuardians {
			if link.GuardianUserID == userID && link.StudentID == studentID {
				alreadyLinked = true
				break
			}
		}
		if alreadyLinked {
			continue
		}
		s.studentGuardians = append(s.studentGuardians, memoryStudentGuardian{
			GuardianUserID: userID,
			StudentID:      studentID,
			Relation:       relation,
		})
		linked++
	}
	if linked == 0 {
		return schooldomain.ProvisionGuardianResult{}, schooldomain.ErrInvalidInput
	}
	return schooldomain.ProvisionGuardianResult{
		UserID:         userID,
		Email:          email,
		LinkedStudents: linked,
	}, nil
}

func (s *Store) DeactivateImportedStudents(_ context.Context, tenantID string, studentIDs []string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	for i := range s.students {
		if s.students[i].TenantID != tenantID {
			continue
		}
		for _, studentID := range studentIDs {
			if s.students[i].ID == studentID {
				s.students[i].Status = "passive"
			}
		}
	}
	return nil
}

func cloneImportRow(row studentimportdomain.ImportRow) studentimportdomain.ImportRow {
	raw, _ := json.Marshal(row.RawData)
	out := row
	_ = json.Unmarshal(raw, &out.RawData)
	return out
}

var _ = cloneImportRow
