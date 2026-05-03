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
