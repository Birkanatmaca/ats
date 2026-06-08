package life

import "time"

type MealType string

const (
	MealBreakfast MealType = "breakfast"
	MealLunch     MealType = "lunch"
	MealSnack     MealType = "snack"
)

type Status string

const (
	StatusActive   Status = "active"
	StatusPassive  Status = "passive"
	StatusArchived Status = "archived"
)

type StudyAttendanceStatus string

const (
	StudyAttended StudyAttendanceStatus = "attended"
	StudyAbsent   StudyAttendanceStatus = "absent"
	StudyExcused  StudyAttendanceStatus = "excused"
)

type ClubMembershipStatus string

const (
	ClubMembershipActive     ClubMembershipStatus = "active"
	ClubMembershipWaitlisted ClubMembershipStatus = "waitlisted"
	ClubMembershipLeft       ClubMembershipStatus = "left"
)

type MealMenu struct {
	ID          string    `json:"id"`
	TenantID    string    `json:"tenantId"`
	Date        string    `json:"date"`
	MealType    MealType  `json:"mealType"`
	Title       string    `json:"title"`
	Description string    `json:"description,omitempty"`
	Allergens   []string  `json:"allergens"`
	CreatedBy   string    `json:"createdBy,omitempty"`
	CreatedAt   time.Time `json:"createdAt"`
	UpdatedAt   time.Time `json:"updatedAt"`
}

type StudySession struct {
	ID              string            `json:"id"`
	TenantID        string            `json:"tenantId"`
	SubjectID       string            `json:"subjectId,omitempty"`
	SubjectName     string            `json:"subjectName,omitempty"`
	TeacherUserID   string            `json:"teacherUserId,omitempty"`
	TeacherName     string            `json:"teacherName,omitempty"`
	ClassID         string            `json:"classId,omitempty"`
	ClassName       string            `json:"className,omitempty"`
	Title           string            `json:"title"`
	StartsAt        time.Time         `json:"startsAt"`
	EndsAt          time.Time         `json:"endsAt"`
	Capacity        int               `json:"capacity"`
	Status          Status            `json:"status"`
	Attendance      []StudyAttendance `json:"attendance"`
	CapacityWarning string            `json:"capacityWarning,omitempty"`
	CreatedAt       time.Time         `json:"createdAt"`
	UpdatedAt       time.Time         `json:"updatedAt"`
}

type StudyAttendance struct {
	ID           string                `json:"id"`
	TenantID     string                `json:"tenantId"`
	SessionID    string                `json:"sessionId"`
	StudentID    string                `json:"studentId"`
	StudentName  string                `json:"studentName,omitempty"`
	SchoolNumber string                `json:"schoolNumber,omitempty"`
	ClassID      string                `json:"classId,omitempty"`
	ClassName    string                `json:"className,omitempty"`
	Status       StudyAttendanceStatus `json:"status"`
	CreatedAt    time.Time             `json:"createdAt"`
	UpdatedAt    time.Time             `json:"updatedAt"`
}

type Club struct {
	ID              string           `json:"id"`
	TenantID        string           `json:"tenantId"`
	Name            string           `json:"name"`
	Description     string           `json:"description,omitempty"`
	AdvisorUserID   string           `json:"advisorUserId,omitempty"`
	AdvisorName     string           `json:"advisorName,omitempty"`
	Capacity        int              `json:"capacity"`
	Status          Status           `json:"status"`
	Memberships     []ClubMembership `json:"memberships"`
	CapacityWarning string           `json:"capacityWarning,omitempty"`
	CreatedAt       time.Time        `json:"createdAt"`
	UpdatedAt       time.Time        `json:"updatedAt"`
}

type ClubMembership struct {
	ID           string               `json:"id"`
	TenantID     string               `json:"tenantId"`
	ClubID       string               `json:"clubId"`
	ClubName     string               `json:"clubName,omitempty"`
	StudentID    string               `json:"studentId"`
	StudentName  string               `json:"studentName,omitempty"`
	SchoolNumber string               `json:"schoolNumber,omitempty"`
	ClassID      string               `json:"classId,omitempty"`
	ClassName    string               `json:"className,omitempty"`
	Status       ClubMembershipStatus `json:"status"`
	CreatedAt    time.Time            `json:"createdAt"`
	UpdatedAt    time.Time            `json:"updatedAt"`
}

type GuardianLifeSummary struct {
	StudentID       string           `json:"studentId"`
	StudentName     string           `json:"studentName"`
	SchoolNumber    string           `json:"schoolNumber"`
	ClassName       string           `json:"className,omitempty"`
	Meals           []MealMenu       `json:"meals"`
	StudySessions   []StudySession   `json:"studySessions"`
	ClubMemberships []ClubMembership `json:"clubMemberships"`
	Clubs           []Club           `json:"clubs"`
	UpdatedAt       time.Time        `json:"updatedAt"`
}

type MealFilter struct {
	FromDate string
	ToDate   string
}

type CreateMealInput struct {
	Date        string   `json:"date"`
	MealType    MealType `json:"mealType"`
	Title       string   `json:"title"`
	Description string   `json:"description,omitempty"`
	Allergens   []string `json:"allergens,omitempty"`
}

type UpdateMealInput struct {
	Date        *string   `json:"date,omitempty"`
	MealType    *MealType `json:"mealType,omitempty"`
	Title       *string   `json:"title,omitempty"`
	Description *string   `json:"description,omitempty"`
	Allergens   *[]string `json:"allergens,omitempty"`
}

type CreateStudySessionInput struct {
	SubjectID     string `json:"subjectId,omitempty"`
	TeacherUserID string `json:"teacherUserId,omitempty"`
	ClassID       string `json:"classId,omitempty"`
	Title         string `json:"title"`
	StartsAt      string `json:"startsAt"`
	EndsAt        string `json:"endsAt"`
	Capacity      int    `json:"capacity"`
	Status        Status `json:"status,omitempty"`
}

type UpdateStudySessionInput struct {
	SubjectID     *string `json:"subjectId,omitempty"`
	TeacherUserID *string `json:"teacherUserId,omitempty"`
	ClassID       *string `json:"classId,omitempty"`
	Title         *string `json:"title,omitempty"`
	StartsAt      *string `json:"startsAt,omitempty"`
	EndsAt        *string `json:"endsAt,omitempty"`
	Capacity      *int    `json:"capacity,omitempty"`
	Status        *Status `json:"status,omitempty"`
}

type StudyAttendanceInput struct {
	StudentID string                `json:"studentId"`
	Status    StudyAttendanceStatus `json:"status"`
}

type RecordStudyAttendanceInput struct {
	Records []StudyAttendanceInput `json:"records"`
}

type CreateClubInput struct {
	Name          string `json:"name"`
	Description   string `json:"description,omitempty"`
	AdvisorUserID string `json:"advisorUserId,omitempty"`
	Capacity      int    `json:"capacity"`
	Status        Status `json:"status,omitempty"`
}

type UpdateClubInput struct {
	Name          *string `json:"name,omitempty"`
	Description   *string `json:"description,omitempty"`
	AdvisorUserID *string `json:"advisorUserId,omitempty"`
	Capacity      *int    `json:"capacity,omitempty"`
	Status        *Status `json:"status,omitempty"`
}

type ClubMembershipInput struct {
	StudentID string               `json:"studentId"`
	Status    ClubMembershipStatus `json:"status,omitempty"`
}
