package announcement

import (
	"strings"
	"time"
)

func SectionClassID(sectionID string) string {
	sectionID = strings.TrimSpace(sectionID)
	if strings.HasSuffix(sectionID, "-default") {
		return strings.TrimSuffix(sectionID, "-default")
	}
	return sectionID
}

type Status string

const (
	StatusDraft     Status = "draft"
	StatusScheduled Status = "scheduled"
	StatusPublished Status = "published"
	StatusArchived  Status = "archived"
)

type AudienceType string

const (
	AudienceAll     AudienceType = "all"
	AudienceRole    AudienceType = "role"
	AudienceClass   AudienceType = "class"
	AudienceSection AudienceType = "section"
	AudienceStudent AudienceType = "student"
	AudienceUser    AudienceType = "user"
)

type AudienceTarget struct {
	Type AudienceType `json:"type"`
	ID   string       `json:"id,omitempty"`
	Role string       `json:"role,omitempty"`
}

type Announcement struct {
	ID            string           `json:"id"`
	TenantID      string           `json:"tenantId"`
	Title         string           `json:"title"`
	Body          string           `json:"body"`
	Status        Status           `json:"status"`
	Audience      string           `json:"audience"`
	Audiences     []AudienceTarget `json:"audiences"`
	PublishedAt   *time.Time       `json:"publishedAt,omitempty"`
	ScheduledAt   *time.Time       `json:"scheduledAt,omitempty"`
	CreatedBy     string           `json:"createdBy,omitempty"`
	CreatedAt     time.Time        `json:"createdAt"`
	UpdatedAt     time.Time        `json:"updatedAt"`
	ReadAt        *time.Time       `json:"readAt,omitempty"`
	ReadCount        int `json:"readCount,omitempty"`
	TargetCount      int `json:"targetCount,omitempty"`
	DeliveryCount    int `json:"deliveryCount,omitempty"`
	PushSentCount    int `json:"pushSentCount,omitempty"`
	PushDroppedCount int `json:"pushDroppedCount,omitempty"`
	PushFailedCount  int `json:"pushFailedCount,omitempty"`
}

type PushDeliveryStats struct {
	Sent    int
	Dropped int
	Failed  int
}

type Template struct {
	ID            string    `json:"id"`
	TenantID      string    `json:"tenantId"`
	Name          string    `json:"name"`
	TitleTemplate string    `json:"titleTemplate"`
	BodyTemplate  string    `json:"bodyTemplate"`
	Category      string    `json:"category"`
	CreatedBy     string    `json:"createdBy,omitempty"`
	CreatedAt     time.Time `json:"createdAt"`
	UpdatedAt     time.Time `json:"updatedAt"`
}

type CreateInput struct {
	Title       string           `json:"title"`
	Body        string           `json:"body"`
	Audience    string           `json:"audience,omitempty"`
	Audiences   []AudienceTarget `json:"audiences,omitempty"`
	ScheduledAt *time.Time       `json:"scheduledAt,omitempty"`
	Publish     bool             `json:"publish,omitempty"`
}

type UpdateInput struct {
	Title       *string           `json:"title,omitempty"`
	Body        *string           `json:"body,omitempty"`
	Audience    *string           `json:"audience,omitempty"`
	Audiences   *[]AudienceTarget `json:"audiences,omitempty"`
	ScheduledAt *time.Time        `json:"scheduledAt,omitempty"`
}

type CreateTemplateInput struct {
	Name          string `json:"name"`
	TitleTemplate string `json:"titleTemplate"`
	BodyTemplate  string `json:"bodyTemplate"`
	Category      string `json:"category,omitempty"`
}

type UpdateTemplateInput struct {
	Name          *string `json:"name,omitempty"`
	TitleTemplate *string `json:"titleTemplate,omitempty"`
	BodyTemplate  *string `json:"bodyTemplate,omitempty"`
	Category      *string `json:"category,omitempty"`
}

type UserTargetContext struct {
	UserID              string
	RoleCodes           []string
	GuardianStudentIDs  []string
	StudentClassIDs     map[string]string
	StudentSectionIDs   map[string]string
}
