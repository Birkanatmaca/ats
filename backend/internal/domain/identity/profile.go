package identity

import "time"

type UserProfile struct {
	ID                 string `json:"id"`
	TenantID           string `json:"tenantId"`
	Tenant             string `json:"tenant,omitempty"`
	FullName           string `json:"fullName"`
	Email              string `json:"email"`
	Phone              string `json:"phone,omitempty"`
	Role               Role   `json:"role"`
	Status             string `json:"status"`
	AvatarURL          string `json:"avatarUrl,omitempty"`
	ProfileAccent      string `json:"profileAccent,omitempty"`
	MustChangePassword bool   `json:"mustChangePassword"`
	CreatedAt          time.Time `json:"createdAt"`
}
