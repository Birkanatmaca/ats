package middleware

import (
	"context"
	"net"
	"net/http"
	"strings"

	"ots/backend/internal/domain/identity"
	platformaudit "ots/backend/internal/platform/audit"
)

type AuditWriter func(ctx context.Context, tenantID, actorUserID, action, resourceType, resourceID, metadata string)

var auditSkipPrefixes = []string{
	"/api/v1/auth/",
	"/healthz",
}

// OperationalAudit logs successful mutating API calls (POST/PATCH/PUT/DELETE).
func OperationalAudit(write AuditWriter) Middleware {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			details := requestDetails(r)
			r = r.WithContext(platformaudit.WithRequestDetails(r.Context(), details))
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
			details.Status = rec.status
			write(r.Context(), principal.TenantID, principal.UserID, action, resourceType, resourceID, platformaudit.MergeMetadata("{}", details))
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

func (r *auditStatusRecorder) Flush() {
	if flusher, ok := r.ResponseWriter.(http.Flusher); ok {
		flusher.Flush()
	}
}

func (r *auditStatusRecorder) Unwrap() http.ResponseWriter {
	return r.ResponseWriter
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
	if strings.HasPrefix(path, "/api/v1/super-admin/") && !isSuperAdminOperationalAuditPath(method, path) {
		return true
	}
	return false
}

func isSuperAdminOperationalAuditPath(method, path string) bool {
	switch {
	case method == http.MethodPatch && path == "/api/v1/super-admin/ai/provider":
		return true
	case method == http.MethodPost && path == "/api/v1/super-admin/ai/provider/test":
		return true
	case strings.HasPrefix(path, "/api/v1/super-admin/ai/provider/keys"):
		return true
	case method == http.MethodPatch && path == "/api/v1/super-admin/ai/cost-settings":
		return true
	case method == http.MethodPatch && strings.HasPrefix(path, "/api/v1/super-admin/institutions/") && strings.HasSuffix(path, "/ai-quota"):
		return true
	case method == http.MethodPost && path == "/api/v1/super-admin/ai/retention/run":
		return true
	case method == http.MethodPatch && path == "/api/v1/super-admin/billing/settings":
		return true
	case method == http.MethodPost && (path == "/api/v1/super-admin/settings/mail/test" || path == "/api/v1/super-admin/settings/sms/test"):
		return true
	default:
		return false
	}
}

func requestDetails(r *http.Request) platformaudit.RequestDetails {
	return platformaudit.RequestDetails{
		Method:    r.Method,
		Path:      r.URL.Path,
		RequestID: RequestIDFromContext(r.Context()),
		IP:        clientIP(r),
		UserAgent: r.UserAgent(),
	}
}

func clientIP(r *http.Request) string {
	forwarded := strings.TrimSpace(r.Header.Get("X-Forwarded-For"))
	if forwarded != "" {
		parts := strings.Split(forwarded, ",")
		if first := strings.TrimSpace(parts[0]); first != "" {
			return first
		}
	}
	if realIP := strings.TrimSpace(r.Header.Get("X-Real-Ip")); realIP != "" {
		return realIP
	}
	host, _, err := net.SplitHostPort(strings.TrimSpace(r.RemoteAddr))
	if err == nil {
		return host
	}
	return strings.TrimSpace(r.RemoteAddr)
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
	case path == "/api/v1/super-admin/ai/provider":
		return "ai.provider.update", "ai_provider_settings", ""
	case path == "/api/v1/super-admin/ai/provider/test":
		return "ai.provider.test", "ai_provider_settings", ""
	case strings.HasPrefix(path, "/api/v1/super-admin/ai/provider/keys"):
		return "ai.provider.keys." + verb, "ai_provider_key", lastUUIDSegment(path)
	case path == "/api/v1/super-admin/ai/cost-settings":
		return "ai.cost_settings.update", "ai_cost_settings", ""
	case strings.HasPrefix(path, "/api/v1/super-admin/institutions/") && strings.HasSuffix(path, "/ai-quota"):
		return "ai.tenant_quota.update", "ai_tenant_quota", parts[len(parts)-2]
	case path == "/api/v1/super-admin/ai/retention/run":
		return "ai.retention.run", "ai_retention", ""
	case path == "/api/v1/super-admin/billing/settings":
		return "billing.settings.update", "billing_settings", ""
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
