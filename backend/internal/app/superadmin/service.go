package superadmin

import (
	"context"
	"strings"

	identitydomain "ots/backend/internal/domain/identity"
	domain "ots/backend/internal/domain/superadmin"
)

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
	UpdateSupportTicket(ctx context.Context, actor identitydomain.Principal, ticketID string, input domain.UpdateSupportTicketInput) (domain.SupportTicket, bool, error)
	SuperAdminOverview(ctx context.Context) (domain.Overview, error)
	ListInstitutions(ctx context.Context) ([]domain.Institution, error)
	GetInstitution(ctx context.Context, tenantID string) (domain.InstitutionDetail, bool, error)
	CreateInstitution(ctx context.Context, actor identitydomain.Principal, input domain.CreateInstitutionInput) (domain.InstitutionDetail, error)
	ListUserAccounts(ctx context.Context) ([]domain.UserAccount, error)
	CreateUser(ctx context.Context, actor identitydomain.Principal, input domain.CreateUserInput) (domain.CreatedUserCredential, error)
	UpdateUser(ctx context.Context, actor identitydomain.Principal, userID string, input domain.UpdateUserInput) (domain.UserAccount, bool, error)
	DeleteUser(ctx context.Context, actor identitydomain.Principal, userID string, tenantID string) (domain.UserAccount, bool, error)
	ListInstitutionUsers(ctx context.Context, tenantID string) ([]domain.UserAccount, error)
	CreateInstitutionUser(ctx context.Context, actor identitydomain.Principal, tenantID string, input domain.CreateInstitutionUserInput) (domain.CreatedUserCredential, error)
	ListAuditEntries(ctx context.Context) ([]domain.AuditEntry, error)
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
	if len(input.Maintenance.Message) > 500 {
		return domain.PlatformSettings{}, ErrInvalidSettings
	}
	return s.repo.UpdatePlatformSettings(ctx, actor, input)
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

func (s *Service) CreateInstitutionUser(ctx context.Context, actor identitydomain.Principal, tenantID string, input domain.CreateInstitutionUserInput) (domain.CreatedUserCredential, error) {
	if strings.TrimSpace(tenantID) == "" || strings.TrimSpace(input.Email) == "" {
		return domain.CreatedUserCredential{}, ErrInvalidUser
	}
	return s.repo.CreateInstitutionUser(ctx, actor, tenantID, input)
}

func (s *Service) AuditLogs(ctx context.Context) ([]domain.AuditEntry, error) {
	return s.repo.ListAuditEntries(ctx)
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
