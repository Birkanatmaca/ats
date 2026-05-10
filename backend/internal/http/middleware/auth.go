package middleware

import (
	"net/http"
	"net/url"
	"strings"

	"ots/backend/internal/domain/identity"
	"ots/backend/internal/platform/httpx"
)

func DemoAuth() Middleware {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if isPublicPath(r.URL.Path) {
				next.ServeHTTP(w, r)
				return
			}

			userID := strings.TrimSpace(r.Header.Get("X-User-Id"))
			token := strings.TrimSpace(strings.TrimPrefix(r.Header.Get("Authorization"), "Bearer "))
			if userID == "" || token == "" || token != "dev-session-"+userID {
				httpx.WriteError(w, http.StatusUnauthorized, "UNAUTHENTICATED", "Geçerli oturum tokenı bulunamadı.", nil)
				return
			}

			tenantID := headerOrDefault(r, "X-Tenant-Id", "")
			role := identity.Role(headerOrDefault(r, "X-Role", string(identity.RolePrincipal)))
			name := headerOrDefault(r, "X-User-Name", "Kullanıcı")
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

func isPublicPath(path string) bool {
	return path == "/healthz" || path == "/api/v1/system/status" || path == "/api/v1/auth/login"
}

func headerOrDefault(r *http.Request, key string, fallback string) string {
	value := r.Header.Get(key)
	if value == "" {
		return fallback
	}
	decoded, err := url.QueryUnescape(value)
	if err != nil {
		return value
	}
	return decoded
}
