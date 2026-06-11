package school

import "time"

type ManagedGuardianStudent struct {
	StudentID    string `json:"studentId"`
	StudentName  string `json:"studentName"`
	ClassName    string `json:"className"`
	SchoolNumber string `json:"schoolNumber"`
	Relation     string `json:"relation"`
	IsPrimary    bool   `json:"isPrimary"`
}

type ManagedGuardian struct {
	ID                 string                   `json:"id"`
	TenantID           string                   `json:"tenantId"`
	UserID             string                   `json:"userId"`
	Email              string                   `json:"email"`
	FirstName          string                   `json:"firstName"`
	LastName           string                   `json:"lastName"`
	FullName           string                   `json:"fullName"`
	Phone              string                   `json:"phone"`
	Status             string                   `json:"status"`
	MustChangePassword bool                     `json:"mustChangePassword"`
	Students           []ManagedGuardianStudent `json:"students"`
	CreatedAt          time.Time                `json:"createdAt"`
}

type UpdateManagedGuardianInput struct {
	FirstName *string `json:"firstName,omitempty"`
	LastName  *string `json:"lastName,omitempty"`
	Phone     *string `json:"phone,omitempty"`
}

type SetManagedGuardianStatusInput struct {
	Status string `json:"status"`
}

type LinkManagedGuardianStudentInput struct {
	StudentID string `json:"studentId"`
	Relation  string `json:"relation"`
	IsPrimary *bool  `json:"isPrimary,omitempty"`
}
