package homework

import "time"

type Assignment struct {
	ID              string    `json:"id"`
	TenantID        string    `json:"tenantId"`
	ClassID         string    `json:"classId"`
	Course          string    `json:"course"`
	Title           string    `json:"title"`
	Description     string    `json:"description"`
	DueDate         string    `json:"dueDate"`
	CreatedBy       string    `json:"createdBy"`
	CreatedAt       time.Time `json:"createdAt"`
	UpdatedAt       time.Time `json:"updatedAt"`
	AttachmentKeys  []string  `json:"attachmentKeys,omitempty"`
	SubmissionCount int       `json:"submissionCount"`
}

type Submission struct {
	ID           string    `json:"id"`
	TenantID     string    `json:"tenantId"`
	AssignmentID string    `json:"assignmentId"`
	StudentID    string    `json:"studentId"`
	Content      string    `json:"content"`
	FileKey      string    `json:"fileKey,omitempty"`
	SubmittedAt  time.Time `json:"submittedAt"`
	Feedback     string    `json:"feedback,omitempty"`
	Score        *float64  `json:"score,omitempty"`
}

type CreateAssignmentInput struct {
	ClassID        string   `json:"classId"`
	Course         string   `json:"course"`
	Title          string   `json:"title"`
	Description    string   `json:"description"`
	DueDate        string   `json:"dueDate"`
	AttachmentKeys []string `json:"attachmentKeys,omitempty"`
}

type SubmitAssignmentInput struct {
	StudentID string `json:"studentId"`
	Content string `json:"content"`
	FileKey string `json:"fileKey,omitempty"`
}
