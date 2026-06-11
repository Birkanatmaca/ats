package identity

import (
	"context"
	"errors"
)

type Role string

const (
	RoleSuperAdmin  Role = "super_admin"
	RoleSystemAdmin Role = "system_admin"
	RolePrincipal   Role = "principal"
	RoleGuidance    Role = "guidance"
	RoleTeacher     Role = "teacher"
	RoleDriver      Role = "driver"
	RoleGuardian    Role = "guardian"
)

type Principal struct {
	UserID             string `json:"userId"`
	TenantID           string `json:"tenantId"`
	Role               Role   `json:"role"`
	Name               string `json:"name"`
	Email              string `json:"email,omitempty"`
	MustChangePassword bool   `json:"mustChangePassword"`
}

type LoginInput struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type PasswordChangeInput struct {
	NewPassword string `json:"newPassword"`
}

type PasswordForgotInput struct {
	Email string `json:"email"`
}

type PasswordResetInput struct {
	Token       string `json:"token"`
	NewPassword string `json:"newPassword"`
}

type PasswordForgotResult struct {
	Message string `json:"message"`
	// Dev/demo ortamında sıfırlama bağlantısı önizlemesi (production'da e-posta ile gider).
	ResetToken string `json:"resetToken,omitempty"`
}

var ErrInvalidResetToken = errors.New("invalid reset token")
var ErrWeakPassword = errors.New("weak password")
var ErrUserNotFound = errors.New("user not found")

type AuthSession struct {
	AccessToken      string    `json:"accessToken"`
	RefreshToken     string    `json:"refreshToken"`
	Principal        Principal `json:"principal"`
	ExpiresAt        string    `json:"expiresAt"`
	RefreshExpiresAt string    `json:"refreshExpiresAt,omitempty"`
}

type RefreshInput struct {
	RefreshToken string `json:"refreshToken"`
}

type contextKey string

const principalContextKey contextKey = "principal"

func WithPrincipal(ctx context.Context, principal Principal) context.Context {
	return context.WithValue(ctx, principalContextKey, principal)
}

func PrincipalFromContext(ctx context.Context) (Principal, bool) {
	principal, ok := ctx.Value(principalContextKey).(Principal)
	return principal, ok
}
