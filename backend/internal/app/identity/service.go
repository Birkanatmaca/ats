package identity

import (
	"context"
	"errors"
	"strings"
	"time"

	domain "ots/backend/internal/domain/identity"
	identitydomain "ots/backend/internal/domain/identity"
	platformauth "ots/backend/internal/platform/auth"
)

var ErrInvalidCredentials = errors.New("invalid credentials")
var ErrWeakPassword = identitydomain.ErrWeakPassword
var ErrUserNotFound = identitydomain.ErrUserNotFound
var ErrInvalidRefreshToken = errors.New("invalid refresh token")
var ErrInvalidResetToken = identitydomain.ErrInvalidResetToken

type Repository interface {
	Authenticate(ctx context.Context, email string, password string) (domain.Principal, bool, error)
	SetPassword(ctx context.Context, userID string, newPassword string) (domain.Principal, bool, error)
	GetUserPrincipal(ctx context.Context, userID string) (domain.Principal, bool, error)
	RequestPasswordReset(ctx context.Context, email string) (string, error)
	ResetPasswordWithToken(ctx context.Context, token string, newPassword string) error
	RecordAuthenticationAudit(ctx context.Context, principal domain.Principal, action string, metadata string)
}

type Service struct {
	repo  Repository
	jwt   *platformauth.JWT
	clock func() time.Time
}

func NewService(repo Repository, jwt *platformauth.JWT, clock func() time.Time) *Service {
	if clock == nil {
		clock = time.Now
	}
	return &Service{repo: repo, jwt: jwt, clock: clock}
}

func (s *Service) Login(ctx context.Context, input domain.LoginInput) (domain.AuthSession, error) {
	email := strings.ToLower(strings.TrimSpace(input.Email))
	if email == "" || strings.TrimSpace(input.Password) == "" {
		return domain.AuthSession{}, ErrInvalidCredentials
	}

	principal, ok, err := s.repo.Authenticate(ctx, email, input.Password)
	if err != nil {
		return domain.AuthSession{}, err
	}
	if !ok {
		return domain.AuthSession{}, ErrInvalidCredentials
	}
	s.repo.RecordAuthenticationAudit(ctx, principal, "auth.login", "{}")

	return s.newSession(principal)
}

func (s *Service) Refresh(ctx context.Context, input domain.RefreshInput) (domain.AuthSession, error) {
	token := strings.TrimSpace(input.RefreshToken)
	if token == "" {
		return domain.AuthSession{}, ErrInvalidRefreshToken
	}

	claims, err := s.jwt.ParseRefresh(token)
	if err != nil {
		return domain.AuthSession{}, ErrInvalidRefreshToken
	}

	principal, ok, err := s.repo.GetUserPrincipal(ctx, claims.Subject)
	if err != nil {
		return domain.AuthSession{}, err
	}
	if !ok {
		return domain.AuthSession{}, ErrInvalidRefreshToken
	}

	return s.newSession(principal)
}

func (s *Service) Logout(_ context.Context) error {
	return nil
}

func (s *Service) GetPrincipal(ctx context.Context, userID string) (domain.Principal, bool, error) {
	return s.repo.GetUserPrincipal(ctx, userID)
}

func (s *Service) ChangePassword(ctx context.Context, principal domain.Principal, input domain.PasswordChangeInput) (domain.AuthSession, error) {
	password := strings.TrimSpace(input.NewPassword)
	if len(password) < 8 {
		return domain.AuthSession{}, ErrWeakPassword
	}

	updated, ok, err := s.repo.SetPassword(ctx, principal.UserID, password)
	if err != nil {
		return domain.AuthSession{}, err
	}
	if !ok {
		return domain.AuthSession{}, ErrUserNotFound
	}

	return s.newSession(updated)
}

func (s *Service) ForgotPassword(ctx context.Context, input domain.PasswordForgotInput) (domain.PasswordForgotResult, error) {
	email := strings.ToLower(strings.TrimSpace(input.Email))
	if email == "" {
		return domain.PasswordForgotResult{}, ErrInvalidCredentials
	}
	token, err := s.repo.RequestPasswordReset(ctx, email)
	if err != nil {
		return domain.PasswordForgotResult{}, err
	}
	result := domain.PasswordForgotResult{
		Message: "Şifre sıfırlama talimatı gönderildi. E-posta kutunuzu kontrol edin.",
	}
	if token != "" {
		result.ResetToken = token
	}
	return result, nil
}

func (s *Service) ResetPassword(ctx context.Context, input domain.PasswordResetInput) error {
	password := strings.TrimSpace(input.NewPassword)
	if len(password) < 8 {
		return ErrWeakPassword
	}
	if err := s.repo.ResetPasswordWithToken(ctx, strings.TrimSpace(input.Token), password); err != nil {
		return err
	}
	return nil
}

func (s *Service) newSession(principal domain.Principal) (domain.AuthSession, error) {
	pair, err := s.jwt.IssuePair(principal, s.clock().UTC())
	if err != nil {
		return domain.AuthSession{}, err
	}
	return domain.AuthSession{
		AccessToken:      pair.AccessToken,
		RefreshToken:     pair.RefreshToken,
		Principal:        principal,
		ExpiresAt:        pair.AccessExpiresAt.Format(time.RFC3339),
		RefreshExpiresAt: pair.RefreshExpiresAt.Format(time.RFC3339),
	}, nil
}
