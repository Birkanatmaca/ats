package guardian

import (
	"time"

	"ots/backend/internal/domain/attendance"
	"ots/backend/internal/domain/scheduling"
)

type Student struct {
	ID           string `json:"id"`
	FullName     string `json:"fullName"`
	ClassName    string `json:"className"`
	SchoolNumber string `json:"schoolNumber"`
	Relation     string `json:"relation,omitempty"`
}

type AttendanceRecord struct {
	ID     string            `json:"id"`
	Date   string            `json:"date"`
	Lesson string            `json:"lesson"`
	Status attendance.Status `json:"status"`
	Note   string            `json:"note,omitempty"`
}

type Notification struct {
	ID        string     `json:"id"`
	Title     string     `json:"title"`
	Body      string     `json:"body"`
	Kind      string     `json:"kind"`
	ReadAt    *time.Time `json:"readAt,omitempty"`
	CreatedAt time.Time  `json:"createdAt"`
}

type StudentSchedule struct {
	StudentID string              `json:"studentId"`
	Lessons   []scheduling.Lesson `json:"lessons"`
}

type StudentAttendance struct {
	StudentID string             `json:"studentId"`
	Records   []AttendanceRecord `json:"records"`
}
