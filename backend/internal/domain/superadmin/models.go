package superadmin

import "time"

type Overview struct {
	Institutions        int            `json:"institutions"`
	ActiveUsers         int            `json:"activeUsers"`
	SystemHealth        string         `json:"systemHealth"`
	MonthlyRevenueTRY   int            `json:"monthlyRevenueTry"`
	OpenSecuritySignals int            `json:"openSecuritySignals"`
	Usage               []UsagePoint   `json:"usage"`
	Incidents           []Incident     `json:"incidents"`
	Modules             []ModuleStatus `json:"modules"`
}

type UsagePoint struct {
	Label string `json:"label"`
	Value int    `json:"value"`
}

type Incident struct {
	ID       string `json:"id"`
	Title    string `json:"title"`
	Severity string `json:"severity"`
	Status   string `json:"status"`
}

type ModuleStatus struct {
	Name        string `json:"name"`
	Status      string `json:"status"`
	Description string `json:"description"`
}

type SystemStatus struct {
	Maintenance MaintenanceMode `json:"maintenance"`
}

type SystemMetrics struct {
	UpdatedAt time.Time        `json:"updatedAt"`
	Health    string           `json:"health"`
	Resources []ResourceMetric `json:"resources"`
	Services  []ServiceMetric  `json:"services"`
}

type ResourceMetric struct {
	Key         string  `json:"key"`
	Label       string  `json:"label"`
	Value       float64 `json:"value"`
	Unit        string  `json:"unit"`
	Status      string  `json:"status"`
	Description string  `json:"description"`
}

type ServiceMetric struct {
	Key         string `json:"key"`
	Name        string `json:"name"`
	Status      string `json:"status"`
	LatencyMs   int64  `json:"latencyMs,omitempty"`
	Description string `json:"description"`
}

type PlatformSettings struct {
	Maintenance MaintenanceMode         `json:"maintenance"`
	Mail        MailSettings            `json:"mail"`
	SMS         SMSSettings             `json:"sms"`
	Credentials []IntegrationCredential `json:"credentials"`
}

type MaintenanceMode struct {
	Enabled   bool       `json:"enabled"`
	Message   string     `json:"message"`
	UpdatedAt *time.Time `json:"updatedAt,omitempty"`
}

type IntegrationCredential struct {
	Key         string     `json:"key"`
	Label       string     `json:"label"`
	Provider    string     `json:"provider"`
	Description string     `json:"description"`
	Configured  bool       `json:"configured"`
	MaskedValue string     `json:"maskedValue"`
	UpdatedAt   *time.Time `json:"updatedAt,omitempty"`
}

type MailSettings struct {
	Enabled      bool   `json:"enabled"`
	Provider     string `json:"provider"`
	Host         string `json:"host"`
	Port         int    `json:"port"`
	Username     string `json:"username"`
	FromName     string `json:"fromName"`
	FromEmail    string `json:"fromEmail"`
	UseTLS       bool   `json:"useTls"`
	PasswordSet  bool   `json:"passwordSet"`
	PasswordHint string `json:"passwordHint,omitempty"`
}

type SMSSettings struct {
	Enabled    bool   `json:"enabled"`
	Provider   string `json:"provider"`
	Username   string `json:"username"`
	Sender     string `json:"sender"`
	BaseURL    string `json:"baseUrl"`
	APIKeySet  bool   `json:"apiKeySet"`
	APIKeyHint string `json:"apiKeyHint,omitempty"`
}

type UpdatePlatformSettingsInput struct {
	Maintenance *MaintenanceModeInput `json:"maintenance,omitempty"`
	Mail        *MailSettingsInput    `json:"mail,omitempty"`
	SMS         *SMSSettingsInput     `json:"sms,omitempty"`
	Credentials []CredentialInput     `json:"credentials,omitempty"`
}

type MailSettingsInput struct {
	Enabled       bool   `json:"enabled"`
	Provider      string `json:"provider"`
	Host          string `json:"host"`
	Port          int    `json:"port"`
	Username      string `json:"username"`
	Password      string `json:"password,omitempty"`
	ClearPassword bool   `json:"clearPassword,omitempty"`
	FromName      string `json:"fromName"`
	FromEmail     string `json:"fromEmail"`
	UseTLS        bool   `json:"useTls"`
}

type SMSSettingsInput struct {
	Enabled     bool   `json:"enabled"`
	Provider    string `json:"provider"`
	Username    string `json:"username"`
	APIKey      string `json:"apiKey,omitempty"`
	ClearAPIKey bool   `json:"clearApiKey,omitempty"`
	Sender      string `json:"sender"`
	BaseURL     string `json:"baseUrl"`
}

type ConnectionTestResult struct {
	OK        bool   `json:"ok"`
	Message   string `json:"message"`
	LatencyMs int64  `json:"latencyMs"`
}

type MaintenanceModeInput struct {
	Enabled bool   `json:"enabled"`
	Message string `json:"message"`
}

type CredentialInput struct {
	Key   string `json:"key"`
	Value string `json:"value"`
	Clear bool   `json:"clear"`
}

type SupportTicket struct {
	ID            string    `json:"id"`
	TenantID      string    `json:"tenantId"`
	Tenant        string    `json:"tenant"`
	ReporterID    string    `json:"reporterId,omitempty"`
	ReporterName  string    `json:"reporterName"`
	ReporterEmail string    `json:"reporterEmail"`
	Type          string    `json:"type"`
	Subject       string    `json:"subject"`
	Message       string    `json:"message"`
	Status        string    `json:"status"`
	Priority      string    `json:"priority"`
	InternalNote  string    `json:"internalNote"`
	CreatedAt     time.Time `json:"createdAt"`
	UpdatedAt     time.Time `json:"updatedAt"`
}

type CreateSupportTicketInput struct {
	Type    string `json:"type"`
	Subject string `json:"subject"`
	Message string `json:"message"`
}

type UpdateSupportTicketInput struct {
	Status       string `json:"status"`
	Priority     string `json:"priority"`
	InternalNote string `json:"internalNote"`
}

type Institution struct {
	ID             string    `json:"id"`
	Name           string    `json:"name"`
	Plan           string    `json:"plan"`
	Timezone       string    `json:"timezone"`
	Students       int       `json:"students"`
	Users          int       `json:"users"`
	Status         string    `json:"status"`
	LastActivityAt time.Time `json:"lastActivityAt"`
}

type InstitutionDetail struct {
	Institution
	EnabledModules []string  `json:"enabledModules"`
	CreatedAt      time.Time `json:"createdAt"`
	UpdatedAt      time.Time `json:"updatedAt"`
}

type UpdateInstitutionModulesInput struct {
	EnabledModules []string `json:"enabledModules"`
}

type CreateInstitutionInput struct {
	Name     string `json:"name"`
	Plan     string `json:"plan"`
	Timezone string `json:"timezone"`
}

type UserAccount struct {
	ID                 string    `json:"id"`
	TenantID           string    `json:"tenantId"`
	Tenant             string    `json:"tenant"`
	FullName           string    `json:"fullName"`
	Email              string    `json:"email"`
	Phone              string    `json:"phone,omitempty"`
	Role               string    `json:"role"`
	Status             string    `json:"status"`
	AvatarURL          string    `json:"avatarUrl,omitempty"`
	ProfileAccent      string    `json:"profileAccent,omitempty"`
	MustChangePassword bool      `json:"mustChangePassword"`
	CreatedAt          time.Time `json:"createdAt"`
}

type CreateInstitutionUserInput struct {
	Email    string `json:"email"`
	FullName string `json:"fullName"`
	Role     string `json:"role"`
}

type CreateUserInput struct {
	TenantID string `json:"tenantId"`
	Email    string `json:"email"`
	FullName string `json:"fullName"`
	Role     string `json:"role"`
}

type UpdateUserInput struct {
	TenantID      string `json:"tenantId"`
	Email         string `json:"email"`
	FullName      string `json:"fullName"`
	Phone         string `json:"phone"`
	Role          string `json:"role"`
	Status        string `json:"status"`
	AvatarURL     string `json:"avatarUrl"`
	ProfileAccent string `json:"profileAccent"`
}

type UpdateSelfProfileInput struct {
	FullName      *string `json:"fullName"`
	Email         *string `json:"email"`
	Phone         *string `json:"phone"`
	AvatarURL     *string `json:"avatarUrl"`
	ProfileAccent *string `json:"profileAccent"`
}

type CreatedUserCredential struct {
	User              UserAccount `json:"user"`
	TemporaryPassword string      `json:"temporaryPassword"`
}

type AuditEntry struct {
	ID           string    `json:"id"`
	TenantID     string    `json:"tenantId,omitempty"`
	Tenant       string    `json:"tenant"`
	ActorID      string    `json:"actorId,omitempty"`
	Actor        string    `json:"actor"`
	ActorEmail   string    `json:"actorEmail,omitempty"`
	ActorRole    string    `json:"actorRole,omitempty"`
	Action       string    `json:"action"`
	ResourceType string    `json:"resourceType"`
	ResourceID   string    `json:"resourceId,omitempty"`
	Sensitivity  string    `json:"sensitivity"`
	Metadata     string    `json:"metadata,omitempty"`
	CreatedAt    time.Time `json:"createdAt"`
}

type AuditLogQuery struct {
	TenantID     string
	Action       string
	ActorID      string
	ActorRole    string
	ResourceType string
	Sensitivity  string
	Search       string
	Limit        int
}

type AuditPurgeResult struct {
	DeletedCount int       `json:"deletedCount"`
	Before       time.Time `json:"before"`
	TenantID     string    `json:"tenantId,omitempty"`
}
