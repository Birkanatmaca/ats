package superadmin

import (
	"context"
	"fmt"
	"net"
	"regexp"
	"strconv"
	"strings"
	"time"

	identitydomain "ots/backend/internal/domain/identity"
	domain "ots/backend/internal/domain/superadmin"
)

var accentPattern = regexp.MustCompile(`^#[0-9A-Fa-f]{6}$`)

var ErrInvalidInstitution = domain.ErrInvalidInstitution
var ErrInstitutionNotFound = domain.ErrInstitutionNotFound
var ErrInvalidUser = domain.ErrInvalidUser
var ErrUserAlreadyExists = domain.ErrUserAlreadyExists
var ErrProtectedUser = domain.ErrProtectedUser
var ErrInvalidSettings = domain.ErrInvalidSettings
var ErrInvalidSupportTicket = domain.ErrInvalidSupportTicket
var ErrSupportTicketNotFound = domain.ErrSupportTicketNotFound

type Repository interface {
	SystemStatus(ctx context.Context) (domain.SystemStatus, error)
	SystemMetrics(ctx context.Context) (domain.SystemMetrics, error)
	PlatformSettings(ctx context.Context) (domain.PlatformSettings, error)
	UpdatePlatformSettings(ctx context.Context, actor identitydomain.Principal, input domain.UpdatePlatformSettingsInput) (domain.PlatformSettings, error)
	CreateSupportTicket(ctx context.Context, principal identitydomain.Principal, input domain.CreateSupportTicketInput) (domain.SupportTicket, error)
	ListSupportTickets(ctx context.Context) ([]domain.SupportTicket, error)
	ListSupportTicketsByReporter(ctx context.Context, principal identitydomain.Principal) ([]domain.SupportTicket, error)
	UpdateSupportTicket(ctx context.Context, actor identitydomain.Principal, ticketID string, input domain.UpdateSupportTicketInput) (domain.SupportTicket, bool, error)
	SuperAdminOverview(ctx context.Context) (domain.Overview, error)
	ListInstitutions(ctx context.Context) ([]domain.Institution, error)
	GetInstitution(ctx context.Context, tenantID string) (domain.InstitutionDetail, bool, error)
	CreateInstitution(ctx context.Context, actor identitydomain.Principal, input domain.CreateInstitutionInput) (domain.InstitutionDetail, error)
	UpdateInstitutionModules(ctx context.Context, actor identitydomain.Principal, tenantID string, modules []string) (domain.InstitutionDetail, bool, error)
	ListUserAccounts(ctx context.Context) ([]domain.UserAccount, error)
	CreateUser(ctx context.Context, actor identitydomain.Principal, input domain.CreateUserInput) (domain.CreatedUserCredential, error)
	UpdateUser(ctx context.Context, actor identitydomain.Principal, userID string, input domain.UpdateUserInput) (domain.UserAccount, bool, error)
	DeleteUser(ctx context.Context, actor identitydomain.Principal, userID string, tenantID string) (domain.UserAccount, bool, error)
	ListInstitutionUsers(ctx context.Context, tenantID string) ([]domain.UserAccount, error)
	GetUserProfile(ctx context.Context, tenantID string, userID string) (identitydomain.UserProfile, bool, error)
	UpdateSelfProfile(ctx context.Context, principal identitydomain.Principal, input domain.UpdateSelfProfileInput) (identitydomain.UserProfile, error)
	CreateInstitutionUser(ctx context.Context, actor identitydomain.Principal, tenantID string, input domain.CreateInstitutionUserInput) (domain.CreatedUserCredential, error)
	ListAuditEntries(ctx context.Context, query domain.AuditLogQuery) ([]domain.AuditEntry, error)
	PurgeAuditEntries(ctx context.Context, before time.Time, tenantID string) (int, error)
	RecordOperationalAudit(ctx context.Context, tenantID, actorUserID, action, resourceType, resourceID, metadata string)
}

type Service struct {
	repo Repository
}

func NewService(repo Repository) *Service {
	return &Service{repo: repo}
}

func (s *Service) SystemStatus(ctx context.Context) (domain.SystemStatus, error) {
	return s.repo.SystemStatus(ctx)
}

func (s *Service) SystemMetrics(ctx context.Context) (domain.SystemMetrics, error) {
	return s.repo.SystemMetrics(ctx)
}

func (s *Service) Settings(ctx context.Context) (domain.PlatformSettings, error) {
	return s.repo.PlatformSettings(ctx)
}

func (s *Service) UpdateSettings(ctx context.Context, actor identitydomain.Principal, input domain.UpdatePlatformSettingsInput) (domain.PlatformSettings, error) {
	if input.Maintenance != nil && len(input.Maintenance.Message) > 500 {
		return domain.PlatformSettings{}, ErrInvalidSettings
	}
	if input.Mail != nil {
		if input.Mail.Port < 0 || input.Mail.Port > 65535 {
			return domain.PlatformSettings{}, ErrInvalidSettings
		}
		if input.Mail.Enabled && strings.EqualFold(strings.TrimSpace(input.Mail.Provider), "smtp") && strings.TrimSpace(input.Mail.Host) == "" {
			return domain.PlatformSettings{}, ErrInvalidSettings
		}
	}
	if input.SMS != nil && input.SMS.Enabled && strings.TrimSpace(input.SMS.Sender) == "" && strings.TrimSpace(input.SMS.Username) == "" {
		return domain.PlatformSettings{}, ErrInvalidSettings
	}
	return s.repo.UpdatePlatformSettings(ctx, actor, input)
}

func (s *Service) TestMailConnection(ctx context.Context) (domain.ConnectionTestResult, error) {
	settings, err := s.repo.PlatformSettings(ctx)
	if err != nil {
		return domain.ConnectionTestResult{}, err
	}
	mail := settings.Mail
	if !mail.Enabled {
		return domain.ConnectionTestResult{Message: "E-posta bağlantısı kapalı. Önce kaydedip etkinleştirin."}, nil
	}
	started := time.Now()
	switch strings.ToLower(strings.TrimSpace(mail.Provider)) {
	case "smtp", "":
		if strings.TrimSpace(mail.Host) == "" {
			return domain.ConnectionTestResult{Message: "SMTP sunucu adresi eksik."}, nil
		}
		port := mail.Port
		if port <= 0 {
			port = 587
		}
		address := net.JoinHostPort(mail.Host, strconv.Itoa(port))
		conn, dialErr := net.DialTimeout("tcp", address, 5*time.Second)
		latency := time.Since(started).Milliseconds()
		if dialErr != nil {
			return domain.ConnectionTestResult{Message: "SMTP sunucusuna bağlanılamadı: " + dialErr.Error(), LatencyMs: latency}, nil
		}
		_ = conn.Close()
		if !mail.PasswordSet {
			return domain.ConnectionTestResult{OK: true, Message: "Sunucuya ulaşıldı. Şifre henüz kayıtlı değil.", LatencyMs: latency}, nil
		}
		return domain.ConnectionTestResult{OK: true, Message: "SMTP sunucusuna bağlanıldı.", LatencyMs: latency}, nil
	default:
		if !mail.PasswordSet || strings.TrimSpace(mail.FromEmail) == "" {
			return domain.ConnectionTestResult{Message: "API anahtarı ve gönderen e-posta gerekli."}, nil
		}
		return domain.ConnectionTestResult{OK: true, Message: "E-posta API bilgileri hazır.", LatencyMs: time.Since(started).Milliseconds()}, nil
	}
}

func (s *Service) TestSMSConnection(ctx context.Context) (domain.ConnectionTestResult, error) {
	settings, err := s.repo.PlatformSettings(ctx)
	if err != nil {
		return domain.ConnectionTestResult{}, err
	}
	sms := settings.SMS
	if !sms.Enabled {
		return domain.ConnectionTestResult{Message: "SMS bağlantısı kapalı. Önce kaydedip etkinleştirin."}, nil
	}
	if strings.TrimSpace(sms.Username) == "" || !sms.APIKeySet {
		return domain.ConnectionTestResult{Message: "SMS kullanıcı adı ve API anahtarı gerekli."}, nil
	}
	if strings.TrimSpace(sms.Sender) == "" {
		return domain.ConnectionTestResult{Message: "SMS başlığı (gönderici) gerekli."}, nil
	}
	return domain.ConnectionTestResult{OK: true, Message: "SMS bilgileri hazır. Gerçek SMS gönderilmedi."}, nil
}

func (s *Service) CreateSupportTicket(ctx context.Context, principal identitydomain.Principal, input domain.CreateSupportTicketInput) (domain.SupportTicket, error) {
	if strings.TrimSpace(principal.TenantID) == "" || !validTicketType(input.Type) || strings.TrimSpace(input.Subject) == "" || strings.TrimSpace(input.Message) == "" {
		return domain.SupportTicket{}, ErrInvalidSupportTicket
	}
	if len(strings.TrimSpace(input.Subject)) > 180 || len(strings.TrimSpace(input.Message)) > 2500 {
		return domain.SupportTicket{}, ErrInvalidSupportTicket
	}
	return s.repo.CreateSupportTicket(ctx, principal, input)
}

func (s *Service) SupportTickets(ctx context.Context) ([]domain.SupportTicket, error) {
	return s.repo.ListSupportTickets(ctx)
}

func (s *Service) MySupportTickets(ctx context.Context, principal identitydomain.Principal) ([]domain.SupportTicket, error) {
	if strings.TrimSpace(principal.UserID) == "" {
		return nil, ErrInvalidSupportTicket
	}
	return s.repo.ListSupportTicketsByReporter(ctx, principal)
}

func (s *Service) UpdateSupportTicket(ctx context.Context, actor identitydomain.Principal, ticketID string, input domain.UpdateSupportTicketInput) (domain.SupportTicket, bool, error) {
	if strings.TrimSpace(ticketID) == "" || !validTicketStatus(input.Status) || !validTicketPriority(input.Priority) {
		return domain.SupportTicket{}, false, ErrInvalidSupportTicket
	}
	if len(strings.TrimSpace(input.InternalNote)) > 2000 {
		return domain.SupportTicket{}, false, ErrInvalidSupportTicket
	}
	return s.repo.UpdateSupportTicket(ctx, actor, ticketID, input)
}

func (s *Service) Overview(ctx context.Context) (domain.Overview, error) {
	return s.repo.SuperAdminOverview(ctx)
}

func (s *Service) Institutions(ctx context.Context) ([]domain.Institution, error) {
	return s.repo.ListInstitutions(ctx)
}

func (s *Service) Institution(ctx context.Context, tenantID string) (domain.InstitutionDetail, bool, error) {
	if strings.TrimSpace(tenantID) == "" {
		return domain.InstitutionDetail{}, false, nil
	}
	return s.repo.GetInstitution(ctx, tenantID)
}

func (s *Service) CreateInstitution(ctx context.Context, actor identitydomain.Principal, input domain.CreateInstitutionInput) (domain.InstitutionDetail, error) {
	if strings.TrimSpace(input.Name) == "" {
		return domain.InstitutionDetail{}, ErrInvalidInstitution
	}
	return s.repo.CreateInstitution(ctx, actor, input)
}

func (s *Service) UpdateInstitutionModules(ctx context.Context, actor identitydomain.Principal, tenantID string, input domain.UpdateInstitutionModulesInput) (domain.InstitutionDetail, bool, error) {
	if strings.TrimSpace(tenantID) == "" || len(input.EnabledModules) == 0 {
		return domain.InstitutionDetail{}, false, ErrInvalidInstitution
	}
	return s.repo.UpdateInstitutionModules(ctx, actor, tenantID, input.EnabledModules)
}

func (s *Service) Users(ctx context.Context) ([]domain.UserAccount, error) {
	return s.repo.ListUserAccounts(ctx)
}

func (s *Service) CreateUser(ctx context.Context, actor identitydomain.Principal, input domain.CreateUserInput) (domain.CreatedUserCredential, error) {
	if strings.TrimSpace(input.TenantID) == "" || strings.TrimSpace(input.Email) == "" {
		return domain.CreatedUserCredential{}, ErrInvalidUser
	}
	return s.repo.CreateUser(ctx, actor, input)
}

func (s *Service) UpdateUser(ctx context.Context, actor identitydomain.Principal, userID string, input domain.UpdateUserInput) (domain.UserAccount, bool, error) {
	if strings.TrimSpace(userID) == "" || strings.TrimSpace(input.TenantID) == "" || strings.TrimSpace(input.Email) == "" {
		return domain.UserAccount{}, false, ErrInvalidUser
	}
	if input.ProfileAccent != "" && !accentPattern.MatchString(strings.TrimSpace(input.ProfileAccent)) {
		return domain.UserAccount{}, false, ErrInvalidUser
	}
	if len(input.AvatarURL) > 300000 {
		return domain.UserAccount{}, false, ErrInvalidUser
	}
	return s.repo.UpdateUser(ctx, actor, userID, input)
}

func (s *Service) DeleteUser(ctx context.Context, actor identitydomain.Principal, userID string, tenantID string) (domain.UserAccount, bool, error) {
	if strings.TrimSpace(userID) == "" || strings.TrimSpace(tenantID) == "" {
		return domain.UserAccount{}, false, ErrInvalidUser
	}
	return s.repo.DeleteUser(ctx, actor, userID, tenantID)
}

func (s *Service) InstitutionUsers(ctx context.Context, tenantID string) ([]domain.UserAccount, error) {
	if strings.TrimSpace(tenantID) == "" {
		return nil, ErrInstitutionNotFound
	}
	return s.repo.ListInstitutionUsers(ctx, tenantID)
}

func (s *Service) GetUserProfile(ctx context.Context, tenantID string, userID string) (identitydomain.UserProfile, bool, error) {
	if strings.TrimSpace(userID) == "" {
		return identitydomain.UserProfile{}, false, nil
	}
	return s.repo.GetUserProfile(ctx, tenantID, userID)
}

func (s *Service) UpdateSelfProfile(ctx context.Context, principal identitydomain.Principal, input domain.UpdateSelfProfileInput) (identitydomain.UserProfile, error) {
	if strings.TrimSpace(principal.UserID) == "" {
		return identitydomain.UserProfile{}, ErrInvalidUser
	}
	if input.FullName != nil && strings.TrimSpace(*input.FullName) == "" {
		return identitydomain.UserProfile{}, ErrInvalidUser
	}
	if input.Email != nil {
		email := strings.ToLower(strings.TrimSpace(*input.Email))
		if email == "" || !strings.Contains(email, "@") {
			return identitydomain.UserProfile{}, ErrInvalidUser
		}
	}
	if input.AvatarURL != nil && len(*input.AvatarURL) > 300000 {
		return identitydomain.UserProfile{}, ErrInvalidUser
	}
	if input.ProfileAccent != nil {
		accent := strings.TrimSpace(*input.ProfileAccent)
		if accent != "" && !accentPattern.MatchString(accent) {
			return identitydomain.UserProfile{}, ErrInvalidUser
		}
	}
	profile, err := s.repo.UpdateSelfProfile(ctx, principal, input)
	if err != nil {
		return identitydomain.UserProfile{}, err
	}
	return profile, nil
}

func (s *Service) CreateInstitutionUser(ctx context.Context, actor identitydomain.Principal, tenantID string, input domain.CreateInstitutionUserInput) (domain.CreatedUserCredential, error) {
	if strings.TrimSpace(tenantID) == "" || strings.TrimSpace(input.Email) == "" {
		return domain.CreatedUserCredential{}, ErrInvalidUser
	}
	return s.repo.CreateInstitutionUser(ctx, actor, tenantID, input)
}

func (s *Service) AuditLogs(ctx context.Context, query domain.AuditLogQuery) ([]domain.AuditEntry, error) {
	if query.Limit <= 0 {
		query.Limit = 100
	}
	if query.Limit > 250 {
		query.Limit = 250
	}
	return s.repo.ListAuditEntries(ctx, query)
}

func (s *Service) PurgeAuditLogs(ctx context.Context, actor identitydomain.Principal, before time.Time, tenantID string) (domain.AuditPurgeResult, error) {
	deleted, err := s.repo.PurgeAuditEntries(ctx, before, tenantID)
	if err != nil {
		return domain.AuditPurgeResult{}, err
	}
	result := domain.AuditPurgeResult{DeletedCount: deleted, Before: before, TenantID: tenantID}
	s.repo.RecordOperationalAudit(ctx, actor.TenantID, actor.UserID, "audit_logs.purge", "audit_log", "", fmt.Sprintf(`{"deletedCount":%d,"before":"%s","tenantId":"%s"}`, deleted, before.UTC().Format(time.RFC3339), tenantID))
	return result, nil
}

func validTicketType(value string) bool {
	switch strings.TrimSpace(strings.ToLower(value)) {
	case "support", "complaint", "suggestion", "report":
		return true
	default:
		return false
	}
}

func validTicketStatus(value string) bool {
	switch strings.TrimSpace(strings.ToLower(value)) {
	case "open", "in_review", "resolved", "closed":
		return true
	default:
		return false
	}
}

func validTicketPriority(value string) bool {
	switch strings.TrimSpace(strings.ToLower(value)) {
	case "low", "normal", "high", "urgent":
		return true
	default:
		return false
	}
}
