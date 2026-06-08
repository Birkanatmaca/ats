package audit

import (
	"context"
	"encoding/json"
	"strings"
)

type requestDetailsKey struct{}

type RequestDetails struct {
	Method    string `json:"method,omitempty"`
	Path      string `json:"path,omitempty"`
	RequestID string `json:"requestId,omitempty"`
	IP        string `json:"ip,omitempty"`
	UserAgent string `json:"userAgent,omitempty"`
	Status    int    `json:"status,omitempty"`
}

func WithRequestDetails(ctx context.Context, details RequestDetails) context.Context {
	return context.WithValue(ctx, requestDetailsKey{}, details)
}

func RequestDetailsFromContext(ctx context.Context) (RequestDetails, bool) {
	details, ok := ctx.Value(requestDetailsKey{}).(RequestDetails)
	return details, ok
}

func MergeRequestDetails(ctx context.Context, metadata string) string {
	details, ok := RequestDetailsFromContext(ctx)
	if !ok {
		if strings.TrimSpace(metadata) == "" {
			return "{}"
		}
		return metadata
	}
	return MergeMetadata(metadata, details)
}

func MergeMetadata(metadata string, details RequestDetails) string {
	payload := map[string]any{}
	trimmed := strings.TrimSpace(metadata)
	if trimmed != "" && trimmed != "{}" {
		if err := json.Unmarshal([]byte(trimmed), &payload); err != nil {
			payload["raw"] = trimmed
		}
	}

	request := map[string]any{}
	if existing, ok := payload["request"].(map[string]any); ok {
		request = existing
	}
	if details.Method != "" {
		request["method"] = details.Method
	}
	if details.Path != "" {
		request["path"] = details.Path
	}
	if details.RequestID != "" {
		request["requestId"] = details.RequestID
	}
	if details.IP != "" {
		request["ip"] = details.IP
	}
	if details.UserAgent != "" {
		request["userAgent"] = details.UserAgent
	}
	if details.Status > 0 {
		request["status"] = details.Status
	}
	if len(request) > 0 {
		payload["request"] = request
	}
	if len(payload) == 0 {
		return "{}"
	}
	encoded, err := json.Marshal(payload)
	if err != nil {
		return "{}"
	}
	return string(encoded)
}
