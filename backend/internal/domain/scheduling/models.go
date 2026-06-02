package scheduling

import "time"

type ScheduleStatus string

const (
	ScheduleDraft     ScheduleStatus = "draft"
	SchedulePublished ScheduleStatus = "published"
	ScheduleArchived  ScheduleStatus = "archived"
)

type Schedule struct {
	ID        string         `json:"id"`
	TenantID  string         `json:"tenantId"`
	Name      string         `json:"name"`
	Status    ScheduleStatus `json:"status"`
	Version   int            `json:"version"`
	Score     int            `json:"score"`
	Lessons   []Lesson       `json:"lessons"`
	UpdatedAt time.Time      `json:"updatedAt"`
}

type Lesson struct {
	ID          string    `json:"id"`
	TenantID    string    `json:"tenantId"`
	ScheduleID  string    `json:"scheduleId"`
	ClassID     string    `json:"classId"`
	ClassName   string    `json:"className"`
	TeacherID   string    `json:"teacherId"`
	TeacherName string    `json:"teacherName"`
	SubjectID   string    `json:"subjectId"`
	SubjectName string    `json:"subjectName"`
	DayOfWeek   int       `json:"dayOfWeek"`
	StartTime   string    `json:"startTime"`
	EndTime     string    `json:"endTime"`
	StartsAt    time.Time `json:"startsAt"`
	EndsAt      time.Time `json:"endsAt"`
	Room        string    `json:"room"`
}

type GenerationResult struct {
	Schedule       Schedule `json:"schedule"`
	HardConflicts  int      `json:"hardConflicts"`
	SoftWarnings   []string `json:"softWarnings"`
	Recommendation string   `json:"recommendation"`
}

type ClassSubjectRequirement struct {
	ID          string `json:"id"`
	TenantID    string `json:"tenantId"`
	ClassID     string `json:"classId"`
	ClassName   string `json:"className"`
	SubjectID   string `json:"subjectId"`
	SubjectName string `json:"subjectName"`
	WeeklyHours int    `json:"weeklyHours"`
}

type RequirementInput struct {
	ClassID     string `json:"classId"`
	SubjectID   string `json:"subjectId"`
	WeeklyHours int    `json:"weeklyHours"`
}

type TeacherAvailability struct {
	ID               string `json:"id"`
	TenantID         string `json:"tenantId"`
	TeacherID        string `json:"teacherId"`
	TeacherUserID    string `json:"teacherUserId"`
	TeacherName      string `json:"teacherName"`
	DayOfWeek        int    `json:"dayOfWeek"`
	StartTime        string `json:"startTime"`
	EndTime          string `json:"endTime"`
	AvailabilityType string `json:"availabilityType"`
}

type AvailabilityInput struct {
	TeacherID        string `json:"teacherId"`
	DayOfWeek        int    `json:"dayOfWeek"`
	StartTime        string `json:"startTime"`
	EndTime          string `json:"endTime"`
	AvailabilityType string `json:"availabilityType"`
}

type UpdateLessonInput struct {
	TeacherID *string `json:"teacherId"`
	SubjectID *string `json:"subjectId"`
	DayOfWeek *int    `json:"dayOfWeek"`
	StartTime *string `json:"startTime"`
	EndTime   *string `json:"endTime"`
	Room      *string `json:"room"`
}

type ValidationResult struct {
	Valid         bool     `json:"valid"`
	HardConflicts []string `json:"hardConflicts"`
	SoftWarnings  []string `json:"softWarnings"`
}

type ConflictSeverity string

const (
	ConflictHard ConflictSeverity = "hard"
	ConflictSoft ConflictSeverity = "soft"
)

type ScheduleConflict struct {
	Severity  ConflictSeverity `json:"severity"`
	Type      string           `json:"type"`
	Message   string           `json:"message"`
	LessonIDs []string         `json:"lessonIds,omitempty"`
}

type ConflictsResult struct {
	Valid         bool               `json:"valid"`
	Conflicts     []ScheduleConflict `json:"conflicts"`
	HardConflicts []string           `json:"hardConflicts"`
	SoftWarnings  []string           `json:"softWarnings"`
}

type ScheduleChangeLog struct {
	ID          string         `json:"id"`
	TenantID    string         `json:"tenantId"`
	ScheduleID  string         `json:"scheduleId"`
	ActorUserID string         `json:"actorUserId,omitempty"`
	LessonID    string         `json:"lessonId,omitempty"`
	ChangeType  string         `json:"changeType"`
	Before      map[string]any `json:"before"`
	After       map[string]any `json:"after"`
	CreatedAt   time.Time      `json:"createdAt"`
}

type BulkAvailabilityInput struct {
	Items []AvailabilityInput `json:"items"`
}
