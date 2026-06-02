package studentimport

import (
	"context"
	"errors"
	"strings"
	"time"

	schooldomain "ots/backend/internal/domain/school"
	domain "ots/backend/internal/domain/studentimport"
)

var (
	ErrInvalidInput = errors.New("invalid student import input")
	ErrNotFound     = errors.New("student import job not found")
	ErrForbidden    = errors.New("student import forbidden")
	ErrInvalidState = errors.New("student import invalid state")
)

type Repository interface {
	ListImportJobs(ctx context.Context, tenantID string, limit int) ([]domain.ImportJob, error)
	GetImportJob(ctx context.Context, tenantID, jobID string) (domain.ImportJob, bool, error)
	CreateImportJob(ctx context.Context, tenantID, userID string, input domain.CreateJobInput, rows []domain.ImportRow) (domain.ImportJob, error)
	UpdateImportJobStats(ctx context.Context, tenantID, jobID string, status domain.JobStatus, stats domain.ImportJob, completedAt *time.Time) error
	ListImportRows(ctx context.Context, tenantID, jobID string) ([]domain.ImportRow, error)
	GetImportRow(ctx context.Context, tenantID, jobID, rowID string) (domain.ImportRow, bool, error)
	UpdateImportRow(ctx context.Context, tenantID, jobID, rowID string, row domain.ImportRow) error
	ReplaceImportRows(ctx context.Context, tenantID, jobID string, rows []domain.ImportRow) error
	SetImportJobStatus(ctx context.Context, tenantID, jobID string, status domain.JobStatus) error

	ListClassRefs(ctx context.Context, tenantID string) ([]domain.ClassRef, error)
	CreateClassRef(ctx context.Context, tenantID, name string) (domain.ClassRef, error)
	ListExistingSchoolNumbers(ctx context.Context, tenantID string) (map[string]struct{}, error)
	CreateImportedStudent(ctx context.Context, tenantID string, input schooldomain.CreateStudentInput) (string, error)
	ProvisionImportedGuardian(ctx context.Context, tenantID string, input schooldomain.ProvisionGuardianInput) (schooldomain.ProvisionGuardianResult, error)
	DeactivateImportedStudents(ctx context.Context, tenantID string, studentIDs []string) error

	RecordOperationalAudit(ctx context.Context, tenantID, userID, action, resourceType, resourceID, metadata string)
}

type Service struct {
	repo  Repository
	clock func() time.Time
}

func NewService(repo Repository, clock func() time.Time) *Service {
	if clock == nil {
		clock = time.Now
	}
	return &Service{repo: repo, clock: clock}
}

func (s *Service) ListJobs(ctx context.Context, tenantID string) ([]domain.ImportJob, error) {
	return s.repo.ListImportJobs(ctx, tenantID, 50)
}

func (s *Service) GetJob(ctx context.Context, tenantID, jobID string) (domain.ImportJob, error) {
	job, ok, err := s.repo.GetImportJob(ctx, tenantID, jobID)
	if err != nil {
		return domain.ImportJob{}, err
	}
	if !ok {
		return domain.ImportJob{}, ErrNotFound
	}
	return job, nil
}

func (s *Service) CreateJob(ctx context.Context, tenantID, userID string, input domain.CreateJobInput) (domain.ImportJob, error) {
	if len(input.Rows) == 0 {
		return domain.ImportJob{}, ErrInvalidInput
	}
	rows := make([]domain.ImportRow, 0, len(input.Rows))
	for index, raw := range input.Rows {
		normalized := NormalizeRawRow(raw)
		rows = append(rows, domain.ImportRow{
			RowNumber:      index + 1,
			RawData:        raw,
			NormalizedData: normalized,
			Status:         domain.RowStatusValid,
		})
	}
	job, err := s.repo.CreateImportJob(ctx, tenantID, userID, input, rows)
	if err != nil {
		return domain.ImportJob{}, err
	}
	s.repo.RecordOperationalAudit(ctx, tenantID, userID, "student_import.create", "student_import_job", job.ID, `{}`)
	validated, err := s.ValidateJob(ctx, tenantID, job.ID)
	if err != nil {
		return domain.ImportJob{}, err
	}
	return validated, nil
}

func (s *Service) ValidateJob(ctx context.Context, tenantID, jobID string) (domain.ImportJob, error) {
	job, ok, err := s.repo.GetImportJob(ctx, tenantID, jobID)
	if err != nil {
		return domain.ImportJob{}, err
	}
	if !ok {
		return domain.ImportJob{}, ErrNotFound
	}
	if job.Status == domain.JobStatusCancelled || job.Status == domain.JobStatusCompleted {
		return domain.ImportJob{}, ErrInvalidState
	}

	classes, err := s.repo.ListClassRefs(ctx, tenantID)
	if err != nil {
		return domain.ImportJob{}, err
	}
	existing, err := s.repo.ListExistingSchoolNumbers(ctx, tenantID)
	if err != nil {
		return domain.ImportJob{}, err
	}
	rows, err := s.repo.ListImportRows(ctx, tenantID, jobID)
	if err != nil {
		return domain.ImportJob{}, err
	}

	ctxData := ValidationContext{
		ExistingNumbers: existing,
		SeenNumbers:     map[string]int{},
		Classes:         classes,
		CreateMissing:   job.Options.CreateMissingClasses,
	}
	validCount, warningCount, errorCount := 0, 0, 0
	for i := range rows {
		normalized, status, messages := ValidateRow(rows[i].RowNumber, rows[i].NormalizedData, ctxData)
		rows[i].NormalizedData = normalized
		rows[i].Status = status
		rows[i].ErrorMessages = messages
		switch status {
		case domain.RowStatusValid:
			validCount++
		case domain.RowStatusWarning:
			warningCount++
		case domain.RowStatusError:
			errorCount++
		}
	}
	if err := s.repo.ReplaceImportRows(ctx, tenantID, jobID, rows); err != nil {
		return domain.ImportJob{}, err
	}
	nextStatus := domain.JobStatusReady
	if validCount+warningCount == 0 {
		nextStatus = domain.JobStatusFailed
	}
	job.Status = nextStatus
	job.TotalRows = len(rows)
	job.ValidRows = validCount
	job.WarningRows = warningCount
	job.ErrorRows = errorCount
	if err := s.repo.UpdateImportJobStats(ctx, tenantID, jobID, nextStatus, job, nil); err != nil {
		return domain.ImportJob{}, err
	}
	return job, nil
}

func (s *Service) ListRows(ctx context.Context, tenantID, jobID string) ([]domain.ImportRow, error) {
	if _, err := s.GetJob(ctx, tenantID, jobID); err != nil {
		return nil, err
	}
	return s.repo.ListImportRows(ctx, tenantID, jobID)
}

func (s *Service) UpdateRow(ctx context.Context, tenantID, jobID, rowID string, input domain.UpdateRowInput) (domain.ImportRow, error) {
	row, ok, err := s.repo.GetImportRow(ctx, tenantID, jobID, rowID)
	if err != nil {
		return domain.ImportRow{}, err
	}
	if !ok {
		return domain.ImportRow{}, ErrNotFound
	}
	if input.NormalizedData != nil {
		row.NormalizedData = *input.NormalizedData
	}
	if err := s.repo.UpdateImportRow(ctx, tenantID, jobID, rowID, row); err != nil {
		return domain.ImportRow{}, err
	}
	if _, err := s.ValidateJob(ctx, tenantID, jobID); err != nil {
		return domain.ImportRow{}, err
	}
	updated, ok, err := s.repo.GetImportRow(ctx, tenantID, jobID, rowID)
	if err != nil || !ok {
		return domain.ImportRow{}, ErrNotFound
	}
	return updated, nil
}

func (s *Service) CommitPreview(ctx context.Context, tenantID, jobID string) (domain.CommitPreview, error) {
	rows, err := s.ListRows(ctx, tenantID, jobID)
	if err != nil {
		return domain.CommitPreview{}, err
	}
	preview := domain.CommitPreview{}
	for _, row := range rows {
		switch row.Status {
		case domain.RowStatusValid, domain.RowStatusWarning:
			preview.StudentsToCreate++
			if strings.TrimSpace(row.NormalizedData.GuardianEmail) != "" {
				preview.GuardiansToInvite++
			}
		default:
			preview.SkippedRows++
		}
	}
	return preview, nil
}

func (s *Service) Commit(ctx context.Context, tenantID, userID, jobID string) (domain.CommitResult, error) {
	job, err := s.GetJob(ctx, tenantID, jobID)
	if err != nil {
		return domain.CommitResult{}, err
	}
	if job.Status != domain.JobStatusReady {
		return domain.CommitResult{}, ErrInvalidState
	}
	if err := s.repo.SetImportJobStatus(ctx, tenantID, jobID, domain.JobStatusImporting); err != nil {
		return domain.CommitResult{}, err
	}

	rows, err := s.repo.ListImportRows(ctx, tenantID, jobID)
	if err != nil {
		return domain.CommitResult{}, err
	}
	result := domain.CommitResult{Job: job}
	for i := range rows {
		row := rows[i]
		if row.Status != domain.RowStatusValid && row.Status != domain.RowStatusWarning {
			result.SkippedRows++
			continue
		}
		classID := row.NormalizedData.ClassID
		if classID == "" && job.Options.CreateMissingClasses && strings.TrimSpace(row.NormalizedData.ClassName) != "" {
			classLabel := strings.TrimSpace(row.NormalizedData.ClassName)
			if section := strings.TrimSpace(row.NormalizedData.SectionName); section != "" && !strings.Contains(strings.ToLower(classLabel), strings.ToLower(section)) {
				classLabel = strings.TrimSpace(classLabel + " " + section)
			}
			createdClass, createErr := s.repo.CreateClassRef(ctx, tenantID, classLabel)
			if createErr != nil {
				row.Status = domain.RowStatusError
				row.ErrorMessages = append(row.ErrorMessages, createErr.Error())
				result.FailedRows++
				_ = s.repo.UpdateImportRow(ctx, tenantID, jobID, row.ID, row)
				continue
			}
			classID = createdClass.ID
		}
		if classID == "" {
			result.SkippedRows++
			continue
		}
		studentID, createErr := s.repo.CreateImportedStudent(ctx, tenantID, schooldomain.CreateStudentInput{
			FirstName:     row.NormalizedData.FirstName,
			LastName:      row.NormalizedData.LastName,
			SchoolNumber:  row.NormalizedData.SchoolNumber,
			ClassID:       classID,
			BirthDate:     row.NormalizedData.BirthDate,
			Gender:        row.NormalizedData.Gender,
			Status:        row.NormalizedData.StudentStatus,
			GuardianName:  row.NormalizedData.GuardianName,
			GuardianPhone: row.NormalizedData.GuardianPhone,
		})
		if createErr != nil {
			row.Status = domain.RowStatusError
			row.ErrorMessages = append(row.ErrorMessages, createErr.Error())
			result.FailedRows++
			_ = s.repo.UpdateImportRow(ctx, tenantID, jobID, row.ID, row)
			continue
		}
		row.Status = domain.RowStatusImported
		row.CreatedStudentID = studentID
		result.CreatedStudents++

		if job.Options.InviteGuardians && strings.TrimSpace(row.NormalizedData.GuardianEmail) != "" {
			firstName, lastName := SplitGuardianName(row.NormalizedData.GuardianName)
			if firstName == "" {
				firstName = "Veli"
			}
			if lastName == "" {
				lastName = row.NormalizedData.LastName
			}
			relation := strings.TrimSpace(row.NormalizedData.GuardianRelation)
			if relation == "" {
				relation = "Veli"
			}
			guardianResult, provisionErr := s.repo.ProvisionImportedGuardian(ctx, tenantID, schooldomain.ProvisionGuardianInput{
				Email:      row.NormalizedData.GuardianEmail,
				FirstName:  firstName,
				LastName:   lastName,
				StudentIDs: []string{studentID},
				Relation:   relation,
			})
			if provisionErr == nil {
				result.CreatedGuardians++
				row.CreatedGuardianUserID = guardianResult.UserID
			}
		}
		_ = s.repo.UpdateImportRow(ctx, tenantID, jobID, row.ID, row)
	}

	now := s.clock()
	job.Status = domain.JobStatusCompleted
	job.ImportedRows = result.CreatedStudents
	job.CompletedAt = &now
	if err := s.repo.UpdateImportJobStats(ctx, tenantID, jobID, domain.JobStatusCompleted, job, &now); err != nil {
		return domain.CommitResult{}, err
	}
	result.Job = job
	s.repo.RecordOperationalAudit(ctx, tenantID, userID, "student_import.commit", "student_import_job", jobID, `{}`)
	return result, nil
}

func (s *Service) Cancel(ctx context.Context, tenantID, userID, jobID string) (domain.ImportJob, error) {
	job, err := s.GetJob(ctx, tenantID, jobID)
	if err != nil {
		return domain.ImportJob{}, err
	}
	if job.Status == domain.JobStatusCompleted || job.Status == domain.JobStatusImporting {
		return domain.ImportJob{}, ErrInvalidState
	}
	if err := s.repo.SetImportJobStatus(ctx, tenantID, jobID, domain.JobStatusCancelled); err != nil {
		return domain.ImportJob{}, err
	}
	job.Status = domain.JobStatusCancelled
	s.repo.RecordOperationalAudit(ctx, tenantID, userID, "student_import.cancel", "student_import_job", jobID, `{}`)
	return job, nil
}

func (s *Service) Rollback(ctx context.Context, tenantID, userID, jobID string) (domain.ImportJob, error) {
	job, err := s.GetJob(ctx, tenantID, jobID)
	if err != nil {
		return domain.ImportJob{}, err
	}
	if job.Status != domain.JobStatusCompleted {
		return domain.ImportJob{}, ErrInvalidState
	}
	rows, err := s.repo.ListImportRows(ctx, tenantID, jobID)
	if err != nil {
		return domain.ImportJob{}, err
	}
	studentIDs := make([]string, 0, len(rows))
	for _, row := range rows {
		if row.CreatedStudentID != "" {
			studentIDs = append(studentIDs, row.CreatedStudentID)
		}
	}
	if len(studentIDs) > 0 {
		if err := s.repo.DeactivateImportedStudents(ctx, tenantID, studentIDs); err != nil {
			return domain.ImportJob{}, err
		}
	}
	s.repo.RecordOperationalAudit(ctx, tenantID, userID, "student_import.rollback", "student_import_job", jobID, `{}`)
	return job, nil
}
