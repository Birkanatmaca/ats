package middleware

import (
	"context"
	"net/http"
	"strings"

	"ots/backend/internal/domain/identity"
)

type AuditWriter func(ctx context.Context, tenantID, actorUserID, action, resourceType, resourceID, metadata string)

var auditSkipPrefixes = []string{
	"/api/v1/auth/",
	"/api/v1/super-admin/",
	"/healthz",
}

// OperationalAudit logs successful mutating API calls (POST/PATCH/PUT/DELETE).
func OperationalAudit(write AuditWriter) Middleware {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if write == nil || isAuditSkipped(r.Method, r.URL.Path) {
				next.ServeHTTP(w, r)
				return
			}
			rec := &auditStatusRecorder{ResponseWriter: w, status: http.StatusOK}
			next.ServeHTTP(rec, r)
			if rec.status < 200 || rec.status >= 300 {
				return
			}
			principal, ok := identity.PrincipalFromContext(r.Context())
			if !ok {
				return
			}
			action, resourceType, resourceID := auditMeta(r.Method, r.URL.Path)
			if action == "" {
				return
			}
			write(r.Context(), principal.TenantID, principal.UserID, action, resourceType, resourceID, "{}")
		})
	}
}

type auditStatusRecorder struct {
	http.ResponseWriter
	status int
}

func (r *auditStatusRecorder) WriteHeader(code int) {
	r.status = code
	r.ResponseWriter.WriteHeader(code)
}

func isAuditSkipped(method, path string) bool {
	if method == http.MethodGet || method == http.MethodHead || method == http.MethodOptions {
		return true
	}
	for _, prefix := range auditSkipPrefixes {
		if strings.HasPrefix(path, prefix) {
			return true
		}
	}
	return false
}

func auditMeta(method, path string) (action, resourceType, resourceID string) {
	parts := strings.Split(strings.Trim(path, "/"), "/")
	if len(parts) < 3 || parts[0] != "api" || parts[1] != "v1" {
		return "", "", ""
	}
	resource := parts[2]
	resourceID = ""
	if len(parts) >= 4 && parts[3] != "" && !isActionSegment(parts[3]) {
		resourceID = parts[3]
	}
	verb := strings.ToLower(method)
	switch {
	case strings.Contains(path, "/finalize"):
		return "attendance.finalize", "attendance_session", lastUUIDSegment(path)
	case strings.Contains(path, "/publish"):
		return "schedule.publish", "schedule", lastUUIDSegment(path)
	case strings.Contains(path, "/observations"):
		resourceType = "student_observation"
		action = "observation." + verb
	case strings.Contains(path, "/announcements"):
		resourceType = "announcement"
		action = "announcement." + verb
	case strings.Contains(path, "/students"):
		resourceType = "student"
		action = "student." + verb
	case strings.Contains(path, "/classes"):
		resourceType = "class"
		action = "class." + verb
	case strings.Contains(path, "/teachers"):
		resourceType = "teacher"
		action = "teacher." + verb
	case strings.Contains(path, "/attendance"):
		resourceType = "attendance_session"
		action = "attendance." + verb
	default:
		resourceType = resource
		action = resource + "." + verb
	}
	return action, resourceType, resourceID
}

func isActionSegment(s string) bool {
	switch s {
	case "generate", "validate", "publish", "import", "finalize", "read", "me":
		return true
	default:
		return false
	}
}

func lastUUIDSegment(path string) string {
	parts := strings.Split(strings.Trim(path, "/"), "/")
	for i := len(parts) - 1; i >= 0; i-- {
		if len(parts[i]) >= 8 && strings.Contains(parts[i], "-") {
			return parts[i]
		}
	}
	return ""
}
