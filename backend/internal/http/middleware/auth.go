package middleware

import (
	"net/http"
	"strings"

	"ots/backend/internal/domain/identity"
	platformauth "ots/backend/internal/platform/auth"
	"ots/backend/internal/platform/httpx"
)

func JWTAuth(jwtIssuer *platformauth.JWT) Middleware {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if isPublicPath(r.URL.Path) {
				next.ServeHTTP(w, r)
				return
			}

			token := bearerToken(r.Header.Get("Authorization"))
			if token == "" {
				httpx.WriteError(w, http.StatusUnauthorized, "UNAUTHENTICATED", "Geçerli oturum tokenı bulunamadı.", nil)
				return
			}

			claims, err := jwtIssuer.ParseAccess(token)
			if err != nil {
				httpx.WriteError(w, http.StatusUnauthorized, "UNAUTHENTICATED", "Geçerli oturum tokenı bulunamadı.", nil)
				return
			}

			principal := platformauth.PrincipalFromClaims(claims)
			if principal.UserID == "" || principal.TenantID == "" || principal.Role == "" {
				httpx.WriteError(w, http.StatusUnauthorized, "UNAUTHENTICATED", "Token içinde geçersiz kullanıcı bilgisi.", nil)
				return
			}

			next.ServeHTTP(w, r.WithContext(identity.WithPrincipal(r.Context(), principal)))
		})
	}
}

func isPublicPath(path string) bool {
	switch path {
	case "/healthz", "/api/v1/system/status", "/api/v1/auth/login", "/api/v1/auth/refresh",
		"/api/v1/auth/password/forgot", "/api/v1/auth/password/reset":
		return true
	default:
		return strings.HasPrefix(path, "/api/v1/files/public/")
	}
}

func bearerToken(value string) string {
	value = strings.TrimSpace(value)
	if value == "" {
		return ""
	}
	const prefix = "Bearer "
	if len(value) > len(prefix) && strings.EqualFold(value[:len(prefix)], prefix) {
		return strings.TrimSpace(value[len(prefix):])
	}
	return value
}
