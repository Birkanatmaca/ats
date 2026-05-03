package identity

import "context"

type Role string

const (
	RoleSystemAdmin Role = "system_admin"
	RolePrincipal   Role = "principal"
	RoleGuidance    Role = "guidance"
	RoleTeacher     Role = "teacher"
	RoleGuardian    Role = "guardian"
)

type Principal struct {
	UserID   string `json:"userId"`
	TenantID string `json:"tenantId"`
	Role     Role   `json:"role"`
	Name     string `json:"name"`
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
