package academic

import "time"

type AssessmentType string

const (
	AssessmentExam     AssessmentType = "exam"
	AssessmentQuiz     AssessmentType = "quiz"
	AssessmentHomework AssessmentType = "homework"
	AssessmentProject  AssessmentType = "project"
)

type OutcomeStatus string

const (
	OutcomeNotStarted   OutcomeStatus = "not_started"
	OutcomeDeveloping   OutcomeStatus = "developing"
	OutcomeMastered     OutcomeStatus = "mastered"
	OutcomeNeedsSupport OutcomeStatus = "needs_support"
)

type Assessment struct {
	ID             string         `json:"id"`
	TenantID       string         `json:"tenantId"`
	Name           string         `json:"name"`
	SubjectID      string         `json:"subjectId"`
	SubjectName    string         `json:"subjectName"`
	ClassID        string         `json:"classId,omitempty"`
	ClassName      string         `json:"className,omitempty"`
	AssessmentType AssessmentType `json:"assessmentType"`
	MaxScore       float64        `json:"maxScore"`
	AssessmentDate string         `json:"assessmentDate"`
	CreatedBy      string         `json:"createdBy,omitempty"`
	CreatedAt      time.Time      `json:"createdAt"`
	UpdatedAt      time.Time      `json:"updatedAt"`
}

type Result struct {
	ID           string    `json:"id"`
	TenantID     string    `json:"tenantId"`
	AssessmentID string    `json:"assessmentId"`
	StudentID    string    `json:"studentId"`
	StudentName  string    `json:"studentName"`
	ClassID      string    `json:"classId,omitempty"`
	ClassName    string    `json:"className,omitempty"`
	Score        float64   `json:"score"`
	Percentile   *float64  `json:"percentile,omitempty"`
	Note         string    `json:"note,omitempty"`
	CreatedAt    time.Time `json:"createdAt"`
	UpdatedAt    time.Time `json:"updatedAt"`
}

type LearningOutcome struct {
	ID          string `json:"id"`
	TenantID    string `json:"tenantId"`
	SubjectID   string `json:"subjectId"`
	SubjectName string `json:"subjectName"`
	Code        string `json:"code"`
	Title       string `json:"title"`
	GradeLevel  string `json:"gradeLevel"`
}

type StudentOutcomeProgress struct {
	ID           string        `json:"id"`
	TenantID     string        `json:"tenantId"`
	StudentID    string        `json:"studentId"`
	OutcomeID    string        `json:"outcomeId"`
	OutcomeCode  string        `json:"outcomeCode"`
	OutcomeTitle string        `json:"outcomeTitle"`
	SubjectName  string        `json:"subjectName"`
	Status       OutcomeStatus `json:"status"`
	Evidence     string        `json:"evidence,omitempty"`
	UpdatedBy    string        `json:"updatedBy,omitempty"`
	UpdatedAt    time.Time     `json:"updatedAt"`
}

type CreateAssessmentInput struct {
	Name           string         `json:"name"`
	SubjectID      string         `json:"subjectId"`
	ClassID        string         `json:"classId,omitempty"`
	AssessmentType AssessmentType `json:"assessmentType"`
	MaxScore       float64        `json:"maxScore"`
	AssessmentDate string         `json:"assessmentDate"`
}

type UpdateAssessmentInput struct {
	Name           *string         `json:"name,omitempty"`
	SubjectID      *string         `json:"subjectId,omitempty"`
	ClassID        *string         `json:"classId,omitempty"`
	AssessmentType *AssessmentType `json:"assessmentType,omitempty"`
	MaxScore       *float64        `json:"maxScore,omitempty"`
	AssessmentDate *string         `json:"assessmentDate,omitempty"`
}

type ResultInput struct {
	StudentID    string   `json:"studentId,omitempty"`
	SchoolNumber string   `json:"schoolNumber,omitempty"`
	FullName     string   `json:"fullName,omitempty"`
	Score        float64  `json:"score"`
	Percentile   *float64 `json:"percentile,omitempty"`
	Note         string   `json:"note,omitempty"`
}

type SaveResultsInput struct {
	Results []ResultInput `json:"results"`
}

type ImportResultsInput struct {
	AssessmentID string        `json:"assessmentId"`
	Rows         []ResultInput `json:"rows"`
}

type ImportRowResult struct {
	RowNumber int      `json:"rowNumber"`
	Status    string   `json:"status"`
	StudentID string   `json:"studentId,omitempty"`
	Errors    []string `json:"errors,omitempty"`
}

type ImportResultsResult struct {
	Imported int               `json:"imported"`
	Failed   int               `json:"failed"`
	Rows     []ImportRowResult `json:"rows"`
	Results  []Result          `json:"results"`
}

type StudentRef struct {
	ID           string `json:"id"`
	FullName     string `json:"fullName"`
	SchoolNumber string `json:"schoolNumber"`
	ClassID      string `json:"classId"`
	ClassName    string `json:"className"`
}

type ClassRef struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}

type StudentAcademicDataset struct {
	Student     StudentRef
	Assessments []Assessment
	Results     []Result
	Outcomes    []StudentOutcomeProgress
}

type ClassAcademicDataset struct {
	Class       ClassRef
	Students    []StudentRef
	Assessments []Assessment
	Results     []Result
}

type ResultSummary struct {
	StudentID      string  `json:"studentId,omitempty"`
	AssessmentID   string  `json:"assessmentId"`
	AssessmentName string  `json:"assessmentName"`
	SubjectID      string  `json:"subjectId"`
	SubjectName    string  `json:"subjectName"`
	AssessmentDate string  `json:"assessmentDate"`
	Score          float64 `json:"score"`
	MaxScore       float64 `json:"maxScore"`
	Percent        float64 `json:"percent"`
	Note           string  `json:"note,omitempty"`
}

type SubjectAcademicSummary struct {
	SubjectID       string  `json:"subjectId"`
	SubjectName     string  `json:"subjectName"`
	AveragePercent  float64 `json:"averagePercent"`
	AssessmentCount int     `json:"assessmentCount"`
	LatestScore     float64 `json:"latestScore"`
	LatestMaxScore  float64 `json:"latestMaxScore"`
	Trend           string  `json:"trend"`
	NeedsSupport    bool    `json:"needsSupport"`
}

type StudentAcademicSummary struct {
	Student          StudentRef               `json:"student"`
	AveragePercent   float64                  `json:"averagePercent"`
	AssessmentCount  int                      `json:"assessmentCount"`
	SubjectSummaries []SubjectAcademicSummary `json:"subjectSummaries"`
	RecentResults    []ResultSummary          `json:"recentResults"`
	Outcomes         []StudentOutcomeProgress `json:"outcomes"`
	SupportSignals   []string                 `json:"supportSignals"`
	AIWeeklySummary  string                   `json:"aiWeeklySummary"`
}

type ClassSubjectSummary struct {
	SubjectID         string  `json:"subjectId"`
	SubjectName       string  `json:"subjectName"`
	AveragePercent    float64 `json:"averagePercent"`
	AssessmentCount   int     `json:"assessmentCount"`
	Trend             string  `json:"trend"`
	NeedsSupportCount int     `json:"needsSupportCount"`
}

type StudentSupportSummary struct {
	StudentID      string  `json:"studentId"`
	StudentName    string  `json:"studentName"`
	SchoolNumber   string  `json:"schoolNumber"`
	AveragePercent float64 `json:"averagePercent"`
	Signal         string  `json:"signal"`
}

type ClassAcademicSummary struct {
	Class            ClassRef                `json:"class"`
	AveragePercent   float64                 `json:"averagePercent"`
	AssessmentCount  int                     `json:"assessmentCount"`
	StudentCount     int                     `json:"studentCount"`
	SubjectSummaries []ClassSubjectSummary   `json:"subjectSummaries"`
	SupportStudents  []StudentSupportSummary `json:"supportStudents"`
	AIWeeklySummary  string                  `json:"aiWeeklySummary"`
}
