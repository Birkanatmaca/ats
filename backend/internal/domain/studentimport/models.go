package studentimport

import "time"

type JobStatus string

const (
	JobStatusDraft      JobStatus = "draft"
	JobStatusValidating JobStatus = "validating"
	JobStatusReady      JobStatus = "ready"
	JobStatusImporting  JobStatus = "importing"
	JobStatusCompleted  JobStatus = "completed"
	JobStatusFailed     JobStatus = "failed"
	JobStatusCancelled  JobStatus = "cancelled"
)

type RowStatus string

const (
	RowStatusValid    RowStatus = "valid"
	RowStatusWarning  RowStatus = "warning"
	RowStatusError    RowStatus = "error"
	RowStatusImported RowStatus = "imported"
)

type JobOptions struct {
	CreateMissingClasses bool `json:"createMissingClasses"`
	InviteGuardians      bool `json:"inviteGuardians"`
}

type NormalizedRow struct {
	SchoolNumber     string `json:"schoolNumber"`
	FirstName        string `json:"firstName"`
	LastName         string `json:"lastName"`
	ClassName        string `json:"className"`
	SectionName      string `json:"sectionName"`
	ClassID          string `json:"classId,omitempty"`
	GuardianName     string `json:"guardianName,omitempty"`
	GuardianPhone    string `json:"guardianPhone,omitempty"`
	GuardianEmail    string `json:"guardianEmail,omitempty"`
	GuardianRelation string `json:"guardianRelation,omitempty"`
	Gender           string `json:"gender,omitempty"`
	BirthDate        string `json:"birthDate,omitempty"`
	StudentStatus    string `json:"studentStatus,omitempty"`
}

type ImportRow struct {
	ID                     string         `json:"id"`
	JobID                  string         `json:"jobId"`
	RowNumber              int            `json:"rowNumber"`
	RawData                map[string]any `json:"rawData"`
	NormalizedData         NormalizedRow  `json:"normalizedData"`
	Status                 RowStatus      `json:"status"`
	ErrorMessages          []string       `json:"errorMessages"`
	CreatedStudentID       string         `json:"createdStudentId,omitempty"`
	CreatedGuardianUserID  string         `json:"createdGuardianUserId,omitempty"`
}

type ImportJob struct {
	ID            string     `json:"id"`
	TenantID      string     `json:"tenantId"`
	Status        JobStatus  `json:"status"`
	FileName      string     `json:"fileName"`
	UploadedBy    string     `json:"uploadedBy,omitempty"`
	TotalRows     int        `json:"totalRows"`
	ValidRows     int        `json:"validRows"`
	WarningRows   int        `json:"warningRows"`
	ErrorRows     int        `json:"errorRows"`
	ImportedRows  int        `json:"importedRows"`
	Options       JobOptions `json:"options"`
	CreatedAt     time.Time  `json:"createdAt"`
	CompletedAt   *time.Time `json:"completedAt,omitempty"`
}

type CreateJobInput struct {
	FileName string           `json:"fileName"`
	Rows     []map[string]any `json:"rows"`
	Options  JobOptions       `json:"options"`
}

type UpdateRowInput struct {
	NormalizedData *NormalizedRow `json:"normalizedData,omitempty"`
}

type CommitPreview struct {
	StudentsToCreate int `json:"studentsToCreate"`
	GuardiansToInvite int `json:"guardiansToInvite"`
	SkippedRows      int `json:"skippedRows"`
}

type CommitResult struct {
	Job               ImportJob `json:"job"`
	CreatedStudents   int       `json:"createdStudents"`
	CreatedGuardians  int       `json:"createdGuardians"`
	SkippedRows       int       `json:"skippedRows"`
	FailedRows        int       `json:"failedRows"`
}

type ClassRef struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}
