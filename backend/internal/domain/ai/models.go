package ai

import (
	"encoding/json"
	"time"
)

type ActionType string

const (
	ActionCreateObservation   ActionType = "create_observation"
	ActionCreateGuidanceNote  ActionType = "create_guidance_note"
	ActionCreateSupportPlan   ActionType = "create_support_plan"
	ActionCreateAnnouncement  ActionType = "create_announcement"
	ActionCreateSupportTicket ActionType = "create_support_ticket"
)

type RiskLevel string

const (
	RiskLow     RiskLevel = "low"
	RiskMedium  RiskLevel = "medium"
	RiskHigh    RiskLevel = "high"
	RiskBlocked RiskLevel = "blocked"
)

type PendingActionStatus string

const (
	PendingActionPending   PendingActionStatus = "pending"
	PendingActionConfirmed PendingActionStatus = "confirmed"
	PendingActionCancelled PendingActionStatus = "cancelled"
	PendingActionExpired   PendingActionStatus = "expired"
)

type Conversation struct {
	ID        string    `json:"id"`
	TenantID  string    `json:"tenantId"`
	UserID    string    `json:"userId"`
	Role      string    `json:"role"`
	Title     string    `json:"title"`
	Status    string    `json:"status"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

type Message struct {
	ID        string    `json:"id"`
	TenantID  string    `json:"tenantId"`
	ConversationID string `json:"conversationId"`
	UserID    string    `json:"userId,omitempty"`
	Role      string    `json:"role"`
	Content   string    `json:"content"`
	Model     string    `json:"model,omitempty"`
	CreatedAt time.Time `json:"createdAt"`
}

type PendingAction struct {
	ID               string              `json:"id"`
	TenantID         string              `json:"tenantId"`
	ConversationID   string              `json:"conversationId"`
	RequestedBy      string              `json:"requestedBy"`
	ActionType       ActionType          `json:"actionType"`
	RiskLevel        RiskLevel           `json:"riskLevel"`
	Payload          json.RawMessage     `json:"payload"`
	PayloadHash      string              `json:"payloadHash"`
	Status           PendingActionStatus `json:"status"`
	ConfirmationText string              `json:"confirmationText"`
	ExpiresAt        time.Time           `json:"expiresAt"`
	CreatedAt        time.Time           `json:"createdAt"`
}

type Candidate struct {
	Kind  string `json:"kind"`
	ID    string `json:"id"`
	Label string `json:"label"`
	Meta  string `json:"meta"`
}

type PendingActionSummary struct {
	ID           string     `json:"id"`
	ActionType   ActionType `json:"actionType"`
	RiskLevel    RiskLevel  `json:"riskLevel"`
	Summary      string     `json:"summary"`
	ConfirmLabel string     `json:"confirmLabel"`
	CancelLabel  string     `json:"cancelLabel"`
}

type SendMessageInput struct {
	Content             string `json:"content"`
	SelectedCandidateID string `json:"selectedCandidateId,omitempty"`
}

type SendMessageResult struct {
	Message       Message               `json:"message"`
	Candidates    []Candidate           `json:"candidates,omitempty"`
	PendingAction *PendingActionSummary `json:"pendingAction,omitempty"`
}

type CreateObservationPayload struct {
	StudentID   string `json:"studentId"`
	StudentName string `json:"studentName"`
	ClassName   string `json:"className"`
	Category    string `json:"category"`
	Note        string `json:"note"`
	Sensitivity string `json:"sensitivity"`
}

type CreateGuidanceNotePayload struct {
	StudentID   string `json:"studentId"`
	StudentName string `json:"studentName"`
	ClassName   string `json:"className"`
	NoteType    string `json:"noteType"`
	Title       string `json:"title"`
	Body        string `json:"body"`
}

type CreateSupportPlanPayload struct {
	StudentID   string `json:"studentId"`
	StudentName string `json:"studentName"`
	ClassName   string `json:"className"`
	Title       string `json:"title"`
	Description string `json:"description"`
	Status      string `json:"status"`
	DueDate     string `json:"dueDate"`
}

type CreateAnnouncementPayload struct {
	Title    string `json:"title"`
	Body     string `json:"body"`
	Audience string `json:"audience"`
}

type CreateSupportTicketPayload struct {
	Type    string `json:"type"`
	Subject string `json:"subject"`
	Message string `json:"message"`
}

type Capability struct {
	Key         string `json:"key"`
	Label       string `json:"label"`
	Description string `json:"description"`
}

type CapabilitiesResult struct {
	Role         string       `json:"role"`
	Capabilities []Capability `json:"capabilities"`
	Suggestions  []string     `json:"suggestions"`
}

type RetentionResult struct {
	ConversationsArchived int `json:"conversationsArchived"`
	MessagesDeleted       int `json:"messagesDeleted"`
	PendingActionsExpired int `json:"pendingActionsExpired"`
}

type UsageSummary struct {
	MessagesLast24h        int `json:"messagesLast24h"`
	MessagesToday          int `json:"messagesToday"`
	DailyLimit             int `json:"dailyLimit"`
	RemainingToday         int `json:"remainingToday"`
	TenantMessagesToday    int `json:"tenantMessagesToday"`
	TenantDailyLimit       int `json:"tenantDailyLimit"`
	TenantRemainingToday   int `json:"tenantRemainingToday"`
	TenantTokensThisMonth  int `json:"tenantTokensThisMonth"`
	TenantMonthlyTokenLimit int `json:"tenantMonthlyTokenLimit"`
}

type TenantQuota struct {
	DailyMessageLimit  *int `json:"dailyMessageLimit,omitempty"`
	MonthlyTokenLimit  *int `json:"monthlyTokenLimit,omitempty"`
}

type StreamEvent struct {
	Type          string                 `json:"type"`
	Delta         string                 `json:"delta,omitempty"`
	Message       *Message               `json:"message,omitempty"`
	Candidates    []Candidate            `json:"candidates,omitempty"`
	PendingAction *PendingActionSummary  `json:"pendingAction,omitempty"`
	Error         string                 `json:"error,omitempty"`
}
