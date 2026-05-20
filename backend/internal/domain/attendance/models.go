package attendance

import (
	"time"

	"ots/backend/internal/domain/scheduling"
)

type Status string

const (
	StatusPresent Status = "present"
	StatusAbsent  Status = "absent"
	StatusLate    Status = "late"
	StatusExcused Status = "excused"
	StatusUnknown Status = "unknown"
)

type CurrentLesson struct {
	Found  bool              `json:"found"`
	Reason string            `json:"reason,omitempty"`
	Lesson scheduling.Lesson `json:"lesson,omitempty"`
}

type Session struct {
	ID          string     `json:"id"`
	TenantID    string     `json:"tenantId"`
	LessonID    string     `json:"lessonId"`
	ClassID     string     `json:"classId"`
	ClassName   string     `json:"className"`
	SubjectName string     `json:"subjectName"`
	TeacherID   string     `json:"teacherId"`
	StartedAt   time.Time  `json:"startedAt"`
	FinalizedAt *time.Time `json:"finalizedAt,omitempty"`
	Records     []Record   `json:"records"`
}

type Record struct {
	StudentID   string `json:"studentId"`
	StudentName string `json:"studentName"`
	Number      string `json:"number"`
	Status      Status `json:"status"`
	Note        string `json:"note,omitempty"`
}

type RecordUpdate struct {
	StudentID string `json:"studentId"`
	Status    Status `json:"status"`
	Note      string `json:"note,omitempty"`
}

type DayReport struct {
	Date    string       `json:"date"`
	Records []DayRecord  `json:"records"`
}

type DayRecord struct {
	StudentID string `json:"studentId"`
	ClassID   string `json:"classId"`
	Status    Status `json:"status"`
}

type StudentSummary struct {
	StudentID string         `json:"studentId"`
	Records   []SummaryEntry `json:"records"`
	Present   int            `json:"present"`
	Absent    int            `json:"absent"`
	Late      int            `json:"late"`
	Excused   int            `json:"excused"`
}

type SummaryEntry struct {
	Date        string `json:"date"`
	SubjectName string `json:"subjectName"`
	ClassName   string `json:"className"`
	Status      Status `json:"status"`
}
