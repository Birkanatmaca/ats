package middleware

import (
	"context"
	"net/http"

	"ots/backend/internal/domain/identity"
)

type ScopeLoader interface {
	ListUserScopes(ctx context.Context, tenantID, userID string) ([]identity.UserScope, error)
}

// UserScopes loads tenant user scopes into request context for scoped roles.
func UserScopes(loader ScopeLoader) Middleware {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if loader == nil || isPublicPath(r.URL.Path) {
				next.ServeHTTP(w, r)
				return
			}
			principal, ok := identity.PrincipalFromContext(r.Context())
			if !ok {
				next.ServeHTTP(w, r)
				return
			}
			switch principal.Role {
			case identity.RoleTeacher, identity.RoleGuidance, identity.RoleGuardian:
				scopes, err := loader.ListUserScopes(r.Context(), principal.TenantID, principal.UserID)
				if err == nil && len(scopes) > 0 {
					r = r.WithContext(identity.WithScopes(r.Context(), scopes))
				}
			}
			next.ServeHTTP(w, r)
		})
	}
}
