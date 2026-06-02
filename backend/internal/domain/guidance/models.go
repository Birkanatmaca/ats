package guidance

import "time"

type NoteType string

const (
	NoteTypeMeeting       NoteType = "meeting"
	NoteTypeParentContact NoteType = "parent_contact"
	NoteTypeFollowUp      NoteType = "follow_up"
	NoteTypeObservation   NoteType = "observation"
	NoteTypeReport        NoteType = "report"
)

type PlanStatus string

const (
	PlanStatusOpen       PlanStatus = "open"
	PlanStatusMonitoring PlanStatus = "monitoring"
	PlanStatusClosed     PlanStatus = "closed"
)

type Student struct {
	ID            string `json:"id"`
	SchoolNumber  string `json:"schoolNumber"`
	FirstName     string `json:"firstName"`
	LastName      string `json:"lastName"`
	FullName      string `json:"fullName"`
	ClassID       string `json:"classId"`
	ClassName     string `json:"className"`
	Status        string `json:"status"`
}

type Note struct {
	ID          string    `json:"id"`
	TenantID    string    `json:"tenantId"`
	StudentID   string    `json:"studentId"`
	StudentName string    `json:"studentName"`
	ClassName   string    `json:"className"`
	AuthorID    string    `json:"authorId"`
	AuthorName  string    `json:"authorName"`
	NoteType    NoteType  `json:"noteType"`
	Title       string    `json:"title"`
	Body        string    `json:"body"`
	Sensitivity string    `json:"sensitivity"`
	CreatedAt   time.Time `json:"createdAt"`
	UpdatedAt   time.Time `json:"updatedAt"`
}

type CreateNoteInput struct {
	StudentID string   `json:"studentId"`
	NoteType  NoteType `json:"noteType"`
	Title     string   `json:"title"`
	Body      string   `json:"body"`
}

type UpdateNoteInput struct {
	NoteType *NoteType `json:"noteType,omitempty"`
	Title    *string   `json:"title,omitempty"`
	Body     *string   `json:"body,omitempty"`
}

type SupportPlan struct {
	ID          string     `json:"id"`
	TenantID    string     `json:"tenantId"`
	StudentID   string     `json:"studentId"`
	StudentName string     `json:"studentName"`
	ClassName   string     `json:"className"`
	OwnerID     string     `json:"ownerId"`
	OwnerName   string     `json:"ownerName"`
	Title       string     `json:"title"`
	Description string     `json:"description"`
	Status      PlanStatus `json:"status"`
	DueDate     string     `json:"dueDate,omitempty"`
	CreatedAt   time.Time  `json:"createdAt"`
	UpdatedAt   time.Time  `json:"updatedAt"`
}

type CreatePlanInput struct {
	StudentID   string     `json:"studentId"`
	Title       string     `json:"title"`
	Description string     `json:"description"`
	Status      PlanStatus `json:"status"`
	DueDate     string     `json:"dueDate"`
}

type UpdatePlanInput struct {
	Title       *string     `json:"title,omitempty"`
	Description *string     `json:"description,omitempty"`
	Status      *PlanStatus `json:"status,omitempty"`
	DueDate     *string     `json:"dueDate,omitempty"`
}

type RiskTracking struct {
	ID            string    `json:"id"`
	TenantID      string    `json:"tenantId"`
	StudentID     string    `json:"studentId"`
	StudentName   string    `json:"studentName"`
	ClassName     string    `json:"className"`
	CounselorID   string    `json:"counselorId"`
	CounselorName string    `json:"counselorName"`
	Reason        string    `json:"reason"`
	CreatedAt     time.Time `json:"createdAt"`
	UpdatedAt     time.Time `json:"updatedAt"`
}

type CreateRiskTrackingInput struct {
	StudentID string `json:"studentId"`
	Reason    string `json:"reason"`
}
