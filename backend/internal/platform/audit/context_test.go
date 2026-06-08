package audit

import (
	"encoding/json"
	"net/http"
	"testing"
)

func TestMergeMetadataPreservesExistingRequestStatus(t *testing.T) {
	merged := MergeMetadata(`{"request":{"status":201}}`, RequestDetails{
		Method:    http.MethodPost,
		Path:      "/api/v1/observations",
		RequestID: "req-1",
	})

	var payload struct {
		Request struct {
			Method    string `json:"method"`
			Path      string `json:"path"`
			RequestID string `json:"requestId"`
			Status    int    `json:"status"`
		} `json:"request"`
	}
	if err := json.Unmarshal([]byte(merged), &payload); err != nil {
		t.Fatalf("metadata is not json: %v", err)
	}
	if payload.Request.Status != http.StatusCreated {
		t.Fatalf("expected status to be preserved, got %d", payload.Request.Status)
	}
	if payload.Request.Method != http.MethodPost || payload.Request.Path != "/api/v1/observations" || payload.Request.RequestID != "req-1" {
		t.Fatalf("expected request details to be merged, got %+v", payload.Request)
	}
}
