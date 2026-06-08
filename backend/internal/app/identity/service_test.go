package identity

import (
	"context"
	"testing"
	"time"

	domain "ots/backend/internal/domain/identity"
	platformauth "ots/backend/internal/platform/auth"
)

func TestLoginRecordsAuthenticationAudit(t *testing.T) {
	repo := &loginAuditRepo{
		principal: domain.Principal{
			UserID:   "user-1",
			TenantID: "tenant-1",
			Role:     domain.RoleTeacher,
			Name:     "Test Teacher",
			Email:    "teacher@example.test",
		},
	}
	service := NewService(repo, platformauth.NewJWT("test-secret", time.Hour, time.Hour), func() time.Time {
		return time.Date(2026, time.June, 5, 9, 0, 0, 0, time.UTC)
	})

	if _, err := service.Login(context.Background(), domain.LoginInput{Email: "teacher@example.test", Password: "valid-password"}); err != nil {
		t.Fatalf("unexpected login error: %v", err)
	}
	if repo.auditAction != "auth.login" {
		t.Fatalf("expected auth.login audit, got %q", repo.auditAction)
	}
	if repo.auditPrincipal.UserID != repo.principal.UserID {
		t.Fatalf("expected audit principal %q, got %q", repo.principal.UserID, repo.auditPrincipal.UserID)
	}
}

type loginAuditRepo struct {
	principal      domain.Principal
	auditPrincipal domain.Principal
	auditAction    string
}

func (r *loginAuditRepo) Authenticate(context.Context, string, string) (domain.Principal, bool, error) {
	return r.principal, true, nil
}

func (r *loginAuditRepo) SetPassword(context.Context, string, string) (domain.Principal, bool, error) {
	return domain.Principal{}, false, nil
}

func (r *loginAuditRepo) GetUserPrincipal(context.Context, string) (domain.Principal, bool, error) {
	return r.principal, true, nil
}

func (r *loginAuditRepo) RequestPasswordReset(context.Context, string) (string, error) {
	return "", nil
}

func (r *loginAuditRepo) ResetPasswordWithToken(context.Context, string, string) error {
	return nil
}

func (r *loginAuditRepo) RecordAuthenticationAudit(_ context.Context, principal domain.Principal, action string, _ string) {
	r.auditPrincipal = principal
	r.auditAction = action
}
