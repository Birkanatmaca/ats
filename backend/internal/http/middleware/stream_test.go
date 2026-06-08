package middleware

import (
	"context"
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"testing"

	"ots/backend/internal/domain/identity"
)

func TestLoggerPreservesFlusher(t *testing.T) {
	handler := Logger(slog.New(slog.NewTextHandler(io.Discard, nil)))(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		flusher, ok := w.(http.Flusher)
		if !ok {
			t.Fatal("expected logger recorder to preserve http.Flusher")
		}
		w.WriteHeader(http.StatusNoContent)
		flusher.Flush()
	}))

	recorder := httptest.NewRecorder()
	handler.ServeHTTP(recorder, httptest.NewRequest(http.MethodGet, "/api/v1/ai/conversations/1/messages:stream", nil))

	if !recorder.Flushed {
		t.Fatal("expected wrapped flusher to flush underlying recorder")
	}
}

func TestOperationalAuditPreservesFlusher(t *testing.T) {
	auditCalled := false
	handler := OperationalAudit(func(context.Context, string, string, string, string, string, string) {
		auditCalled = true
	})(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		flusher, ok := w.(http.Flusher)
		if !ok {
			t.Fatal("expected audit recorder to preserve http.Flusher")
		}
		w.WriteHeader(http.StatusCreated)
		flusher.Flush()
	}))

	principal := identity.Principal{TenantID: "tenant-1", UserID: "teacher-1", Role: identity.RoleTeacher}
	request := httptest.NewRequest(http.MethodPost, "/api/v1/observations", nil)
	request = request.WithContext(identity.WithPrincipal(request.Context(), principal))

	recorder := httptest.NewRecorder()
	handler.ServeHTTP(recorder, request)

	if !recorder.Flushed {
		t.Fatal("expected wrapped flusher to flush underlying recorder")
	}
	if !auditCalled {
		t.Fatal("expected successful mutating request to be audited")
	}
}

func TestOperationalAuditWritesRequestMetadata(t *testing.T) {
	var gotAction string
	var gotMetadata string
	handler := Chain(
		RequestID(),
		OperationalAudit(func(_ context.Context, _, _, action, _, _, metadata string) {
			gotAction = action
			gotMetadata = metadata
		}),
	)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusCreated)
	}))

	principal := identity.Principal{
		TenantID: "tenant-1",
		UserID:   "teacher-1",
		Role:     identity.RoleTeacher,
		Email:    "teacher@example.test",
	}
	request := httptest.NewRequest(http.MethodPost, "/api/v1/observations", nil)
	request.RemoteAddr = "203.0.113.10:41230"
	request.Header.Set("User-Agent", "audit-test")
	request.Header.Set("X-Request-Id", "req-test-1")
	request = request.WithContext(identity.WithPrincipal(request.Context(), principal))

	handler.ServeHTTP(httptest.NewRecorder(), request)

	if gotAction != "observation.post" {
		t.Fatalf("expected observation.post audit action, got %q", gotAction)
	}
	var payload struct {
		Request struct {
			Method    string `json:"method"`
			Path      string `json:"path"`
			RequestID string `json:"requestId"`
			IP        string `json:"ip"`
			UserAgent string `json:"userAgent"`
			Status    int    `json:"status"`
		} `json:"request"`
	}
	if err := json.Unmarshal([]byte(gotMetadata), &payload); err != nil {
		t.Fatalf("metadata is not json: %v", err)
	}
	if payload.Request.Method != http.MethodPost || payload.Request.Path != "/api/v1/observations" || payload.Request.Status != http.StatusCreated {
		t.Fatalf("unexpected request metadata: %+v", payload.Request)
	}
	if payload.Request.RequestID != "req-test-1" || payload.Request.IP != "203.0.113.10" || payload.Request.UserAgent != "audit-test" {
		t.Fatalf("missing request identity metadata: %+v", payload.Request)
	}
}

func TestSuperAdminOperationalAuditSkipPolicy(t *testing.T) {
	if isAuditSkipped(http.MethodPatch, "/api/v1/super-admin/ai/cost-settings") {
		t.Fatal("expected AI cost settings update to be audited")
	}
	if isAuditSkipped(http.MethodPatch, "/api/v1/super-admin/billing/settings") {
		t.Fatal("expected billing settings update to be audited")
	}
	if !isAuditSkipped(http.MethodPatch, "/api/v1/super-admin/users/user-1") {
		t.Fatal("expected manually audited user update route to stay skipped by generic middleware")
	}
}
