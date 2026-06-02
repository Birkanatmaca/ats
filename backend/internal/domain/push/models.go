package push

import "strings"

const (
	CategoryAttendance    = "attendance"
	CategoryAnnouncements = "announcements"
	CategorySupport       = "support"
	CategoryGuidance      = "guidance"
	CategorySchedule      = "schedule"
)

const (
	DeliveryStatusQueued  = "queued"
	DeliveryStatusSent    = "sent"
	DeliveryStatusFailed  = "failed"
	DeliveryStatusDropped = "dropped"
)

type Preferences struct {
	Attendance    bool `json:"attendance"`
	Announcements bool `json:"announcements"`
	Support       bool `json:"support"`
	Guidance      bool `json:"guidance"`
	Schedule      bool `json:"schedule"`
}

func DefaultPreferences() Preferences {
	return Preferences{
		Attendance:    true,
		Announcements: true,
		Support:       true,
		Guidance:      true,
		Schedule:      true,
	}
}

type DeviceToken struct {
	ID           string      `json:"id"`
	TenantID     string      `json:"tenantId"`
	UserID       string      `json:"userId"`
	Token        string      `json:"token,omitempty"`
	TokenPreview string      `json:"tokenPreview,omitempty"`
	Platform     string      `json:"platform"`
	Preferences  Preferences `json:"preferences,omitempty"`
	LastSeenAt   string      `json:"lastSeenAt,omitempty"`
	RevokedAt    string      `json:"revokedAt,omitempty"`
	FailureCount int         `json:"failureCount"`
	LastError    string      `json:"lastError,omitempty"`
}

type DeliveryLog struct {
	ID                string `json:"id"`
	TenantID          string `json:"tenantId"`
	UserID            string `json:"userId"`
	DeviceTokenID     string `json:"deviceTokenId,omitempty"`
	Category          string `json:"category"`
	Title             string `json:"title"`
	Status            string `json:"status"`
	Provider          string `json:"provider"`
	ProviderReceiptID string `json:"providerReceiptId,omitempty"`
	ErrorCode         string `json:"errorCode,omitempty"`
	ErrorMessage      string `json:"errorMessage,omitempty"`
	SentAt            string `json:"sentAt,omitempty"`
	CreatedAt         string `json:"createdAt"`
}

type PushHealth struct {
	ActiveTokens   int     `json:"activeTokens"`
	RevokedTokens  int     `json:"revokedTokens"`
	SentLast24h    int     `json:"sentLast24h"`
	FailedLast24h  int     `json:"failedLast24h"`
	FailureRate24h float64 `json:"failureRate24h"`
}

type RegisterDeviceTokenInput struct {
	Token    string `json:"token"`
	Platform string `json:"platform"`
}

type UpdatePreferencesInput struct {
	Attendance    *bool `json:"attendance,omitempty"`
	Announcements *bool `json:"announcements,omitempty"`
	Support       *bool `json:"support,omitempty"`
	Guidance      *bool `json:"guidance,omitempty"`
	Schedule      *bool `json:"schedule,omitempty"`
}

type TestPushInput struct {
	Title string `json:"title"`
	Body  string `json:"body"`
}

type GuidancePlanReminder struct {
	OwnerID     string
	StudentID   string
	StudentName string
	PlanID      string
	PlanTitle   string
	DueDate     string
}

func MaskToken(token string) string {
	token = strings.TrimSpace(token)
	if len(token) <= 12 {
		return token
	}
	return token[:8] + "…" + token[len(token)-4:]
}
