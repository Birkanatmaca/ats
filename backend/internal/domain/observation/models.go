package observation

import "time"

type Category string

const (
	CategoryParticipation Category = "participation"
	CategoryAttention     Category = "attention"
	CategoryBehavior      Category = "behavior"
	CategorySocial        Category = "social"
	CategoryAbsenceRisk   Category = "absence_risk"
	CategoryAcademicDrop  Category = "academic_drop"
	CategoryTeacherNote   Category = "teacher_note"
)

type Observation struct {
	ID          string    `json:"id"`
	TenantID    string    `json:"tenantId"`
	StudentID   string    `json:"studentId"`
	StudentName string    `json:"studentName"`
	ClassID     string    `json:"classId"`
	ClassName   string    `json:"className"`
	AuthorID    string    `json:"authorId"`
	AuthorName  string    `json:"authorName"`
	Category    Category  `json:"category"`
	Note        string    `json:"note"`
	Sensitivity string    `json:"sensitivity"`
	CreatedAt   time.Time `json:"createdAt"`
}

type CreateInput struct {
	StudentID string   `json:"studentId"`
	Category  Category `json:"category"`
	Note      string   `json:"note"`
}
