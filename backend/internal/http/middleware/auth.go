package middleware

import (
	"net/http"
	"strings"

	"ots/backend/internal/domain/identity"
)

func DemoAuth() Middleware {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			userID := headerOrDefault(r, "X-User-Id", "teacher-1")
			tenantID := headerOrDefault(r, "X-Tenant-Id", "tenant-demo")
			role := identity.Role(headerOrDefault(r, "X-Role", string(identity.RolePrincipal)))
			name := headerOrDefault(r, "X-User-Name", "Demo Kullanıcı")
			email := headerOrDefault(r, "X-User-Email", "")
			mustChangePassword := strings.EqualFold(r.Header.Get("X-Must-Change-Password"), "true")

			principal := identity.Principal{
				UserID:             userID,
				TenantID:           tenantID,
				Role:               role,
				Name:               name,
				Email:              email,
				MustChangePassword: mustChangePassword,
			}
			next.ServeHTTP(w, r.WithContext(identity.WithPrincipal(r.Context(), principal)))
		})
	}
}

func headerOrDefault(r *http.Request, key string, fallback string) string {
	value := r.Header.Get(key)
	if value == "" {
		return fallback
	}
	return value
}
