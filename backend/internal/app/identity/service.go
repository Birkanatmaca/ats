package identity

import (
	"context"
	"errors"
	"strings"
	"time"

	domain "ots/backend/internal/domain/identity"
)

var ErrInvalidCredentials = errors.New("invalid credentials")
var ErrWeakPassword = errors.New("weak password")
var ErrUserNotFound = errors.New("user not found")

type Repository interface {
	Authenticate(ctx context.Context, email string, password string) (domain.Principal, bool, error)
	SetPassword(ctx context.Context, userID string, newPassword string) (domain.Principal, bool, error)
}

type Service struct {
	repo  Repository
	clock func() time.Time
}

func NewService(repo Repository, clock func() time.Time) *Service {
	if clock == nil {
		clock = time.Now
	}
	return &Service{repo: repo, clock: clock}
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

	return s.newSession(principal), nil
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

	return s.newSession(updated), nil
}

func (s *Service) newSession(principal domain.Principal) domain.AuthSession {
	expiresAt := s.clock().Add(8 * time.Hour).UTC()
	return domain.AuthSession{
		AccessToken: "dev-session-" + principal.UserID,
		Principal:   principal,
		ExpiresAt:   expiresAt.Format(time.RFC3339),
	}
}
