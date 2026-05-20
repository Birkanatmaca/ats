package school

import "time"

type Tenant struct {
	ID       string `json:"id"`
	Name     string `json:"name"`
	Plan     string `json:"plan"`
	Timezone string `json:"timezone"`
}

type Class struct {
	ID       string `json:"id"`
	TenantID string `json:"tenantId"`
	Name     string `json:"name"`
	Level    string `json:"level"`
	Branch   string `json:"branch"`
}

type Student struct {
	ID        string `json:"id"`
	TenantID  string `json:"tenantId"`
	ClassID   string `json:"classId"`
	FullName  string `json:"fullName"`
	Number    string `json:"number"`
	Status    string `json:"status,omitempty"`
	BirthDate string `json:"birthDate,omitempty"`
}

type Teacher struct {
	ID       string `json:"id"`
	UserID   string `json:"userId"`
	TenantID string `json:"tenantId"`
	FullName string `json:"fullName"`
	Title    string `json:"title"`
}

type Subject struct {
	ID       string `json:"id"`
	TenantID string `json:"tenantId"`
	Name     string `json:"name"`
	Code     string `json:"code"`
}

type Announcement struct {
	ID          string    `json:"id"`
	TenantID    string    `json:"tenantId"`
	Title       string    `json:"title"`
	Body        string    `json:"body"`
	Audience    string    `json:"audience"`
	PublishedAt time.Time `json:"publishedAt"`
}

type CreateAnnouncementInput struct {
	Title    string `json:"title"`
	Body     string `json:"body"`
	Audience string `json:"audience"`
}

type UpdateAnnouncementInput struct {
	Title    *string `json:"title,omitempty"`
	Body     *string `json:"body,omitempty"`
	Audience *string `json:"audience,omitempty"`
}
