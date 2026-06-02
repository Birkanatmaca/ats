package guidance

import "time"

type CaseStatus string

const (
	CaseStatusOpen       CaseStatus = "open"
	CaseStatusMonitoring CaseStatus = "monitoring"
	CaseStatusClosed     CaseStatus = "closed"
)

type CasePriority string

const (
	CasePriorityLow      CasePriority = "low"
	CasePriorityMedium   CasePriority = "medium"
	CasePriorityHigh     CasePriority = "high"
	CasePriorityCritical CasePriority = "critical"
)

type CaseEventType string

const (
	CaseEventTypeNote         CaseEventType = "note"
	CaseEventTypeMeeting      CaseEventType = "meeting"
	CaseEventTypePlan         CaseEventType = "plan"
	CaseEventTypeRisk         CaseEventType = "risk"
	CaseEventTypeStatusChange CaseEventType = "status_change"
	CaseEventTypeFile         CaseEventType = "file"
	CaseEventTypeFollowUp     CaseEventType = "follow_up"
)

type CaseEventVisibility string

const (
	CaseVisibilityGuidanceOnly       CaseEventVisibility = "guidance_only"
	CaseVisibilityPrincipalSummary   CaseEventVisibility = "principal_summary"
	CaseVisibilitySharedWithGuardian CaseEventVisibility = "shared_with_guardian"
)

type CaseParticipantType string

const (
	ParticipantTeacher   CaseParticipantType = "teacher"
	ParticipantGuardian  CaseParticipantType = "guardian"
	ParticipantCounselor CaseParticipantType = "counselor"
	ParticipantPrincipal CaseParticipantType = "principal"
)

type Case struct {
	ID          string     `json:"id"`
	TenantID    string     `json:"tenantId"`
	StudentID   string     `json:"studentId"`
	StudentName string     `json:"studentName"`
	ClassName   string     `json:"className"`
	OwnerUserID string     `json:"ownerUserId"`
	OwnerName   string     `json:"ownerName"`
	Status      CaseStatus `json:"status"`
	Priority    CasePriority `json:"priority"`
	Title       string     `json:"title"`
	Summary     string     `json:"summary"`
	Sensitivity string     `json:"sensitivity"`
	OpenedAt    time.Time  `json:"openedAt"`
	ClosedAt    *time.Time `json:"closedAt,omitempty"`
	CreatedBy   string     `json:"createdBy"`
	UpdatedBy   string     `json:"updatedBy"`
	CreatedAt   time.Time  `json:"createdAt"`
	UpdatedAt   time.Time  `json:"updatedAt"`
	Masked      bool       `json:"masked,omitempty"`
}

type CaseEvent struct {
	ID          string              `json:"id"`
	TenantID    string              `json:"tenantId"`
	CaseID      string              `json:"caseId"`
	EventType   CaseEventType       `json:"eventType"`
	Title       string              `json:"title"`
	Body        string              `json:"body"`
	ActorUserID string              `json:"actorUserId"`
	ActorName   string              `json:"actorName"`
	Visibility  CaseEventVisibility `json:"visibility"`
	OccurredAt  time.Time           `json:"occurredAt"`
	CreatedAt   time.Time           `json:"createdAt"`
	UpdatedAt   time.Time           `json:"updatedAt"`
	Masked      bool                `json:"masked,omitempty"`
}

type CaseParticipant struct {
	ID              string              `json:"id"`
	TenantID        string              `json:"tenantId"`
	CaseID          string              `json:"caseId"`
	ParticipantType CaseParticipantType `json:"participantType"`
	UserID          string              `json:"userId,omitempty"`
	DisplayName     string              `json:"displayName"`
	Relation        string              `json:"relation"`
	CreatedAt       time.Time           `json:"createdAt"`
}

type CreateCaseInput struct {
	StudentID   string       `json:"studentId"`
	Title       string       `json:"title"`
	Summary     string       `json:"summary"`
	Priority    CasePriority `json:"priority"`
	Sensitivity string       `json:"sensitivity"`
}

type UpdateCaseInput struct {
	Title       *string       `json:"title,omitempty"`
	Summary     *string       `json:"summary,omitempty"`
	Status      *CaseStatus   `json:"status,omitempty"`
	Priority    *CasePriority `json:"priority,omitempty"`
	OwnerUserID *string       `json:"ownerUserId,omitempty"`
	Sensitivity *string       `json:"sensitivity,omitempty"`
}

type CreateCaseEventInput struct {
	EventType  CaseEventType       `json:"eventType"`
	Title      string              `json:"title"`
	Body       string              `json:"body"`
	Visibility CaseEventVisibility `json:"visibility"`
	OccurredAt *time.Time          `json:"occurredAt,omitempty"`
}

type UpdateCaseEventInput struct {
	EventType  *CaseEventType       `json:"eventType,omitempty"`
	Title      *string              `json:"title,omitempty"`
	Body       *string              `json:"body,omitempty"`
	Visibility *CaseEventVisibility `json:"visibility,omitempty"`
	OccurredAt *time.Time           `json:"occurredAt,omitempty"`
}

type CloseCaseResult struct {
	Case     Case     `json:"case"`
	Warnings []string `json:"warnings,omitempty"`
}

type StudentCaseSummary struct {
	StudentID       string `json:"studentId"`
	StudentName     string `json:"studentName"`
	ClassName       string `json:"className"`
	ActiveCaseCount int    `json:"activeCaseCount"`
	CriticalCount   int    `json:"criticalCount"`
	OpenPlanCount   int    `json:"openPlanCount"`
	Cases           []Case `json:"cases"`
}

type GuidanceCaseInboxStats struct {
	OpenCount      int `json:"openCount"`
	MonitoringCount int `json:"monitoringCount"`
	CriticalCount  int `json:"criticalCount"`
	OverduePlanCount int `json:"overduePlanCount"`
}

type CaseTimelineItem struct {
	ID         string    `json:"id"`
	Source     string    `json:"source"`
	EventType  string    `json:"eventType"`
	Title      string    `json:"title"`
	Body       string    `json:"body"`
	ActorName  string    `json:"actorName"`
	OccurredAt time.Time `json:"occurredAt"`
	Visibility string    `json:"visibility,omitempty"`
	Masked     bool      `json:"masked,omitempty"`
}
