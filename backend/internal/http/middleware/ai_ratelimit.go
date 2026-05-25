package middleware

import (
	"net/http"
	"strings"
	"sync"
	"time"

	"ots/backend/internal/domain/identity"
	"ots/backend/internal/platform/httpx"
)

type AIRateLimiter struct {
	mu          sync.Mutex
	perMinute   map[string][]time.Time
	limitPerMin int
}

func AIRateLimit(limitPerMinute int) Middleware {
	if limitPerMinute <= 0 {
		limitPerMinute = 20
	}
	limiter := &AIRateLimiter{
		perMinute:   map[string][]time.Time{},
		limitPerMin: limitPerMinute,
	}
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if !strings.HasPrefix(r.URL.Path, "/api/v1/ai/") {
				next.ServeHTTP(w, r)
				return
			}
			if r.Method != http.MethodPost {
				next.ServeHTTP(w, r)
				return
			}
			userID := aiRateLimitKey(r)
			if userID == "" {
				next.ServeHTTP(w, r)
				return
			}
			if !limiter.allow(userID) {
				httpx.WriteError(w, http.StatusTooManyRequests, "AI_RATE_LIMIT", "ogta.ai istek limitine ulaşıldı. Lütfen kısa süre sonra tekrar deneyin.", nil)
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}

func aiRateLimitKey(r *http.Request) string {
	if principal, ok := identity.PrincipalFromContext(r.Context()); ok {
		return principal.UserID
	}
	return ""
}

func (l *AIRateLimiter) allow(userID string) bool {
	l.mu.Lock()
	defer l.mu.Unlock()
	now := time.Now()
	windowStart := now.Add(-time.Minute)
	times := l.perMinute[userID]
	filtered := times[:0]
	for _, ts := range times {
		if ts.After(windowStart) {
			filtered = append(filtered, ts)
		}
	}
	if len(filtered) >= l.limitPerMin {
		l.perMinute[userID] = filtered
		return false
	}
	filtered = append(filtered, now)
	l.perMinute[userID] = filtered
	return true
}
