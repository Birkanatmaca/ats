package openai

import (
	"fmt"
	"testing"
)

func TestClassifyFailover(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name   string
		err    error
		status string
		retry  bool
	}{
		{name: "nil", err: nil, status: "", retry: false},
		{
			name:   "quota",
			err:    &RequestError{StatusCode: 429, Body: `{"error":{"code":"insufficient_quota"}}`},
			status: FailoverStatusExhausted,
			retry:  true,
		},
		{
			name:   "invalid key",
			err:    &RequestError{StatusCode: 401, Body: `{"error":{"code":"invalid_api_key"}}`},
			status: FailoverStatusError,
			retry:  true,
		},
		{
			name:   "rate limit",
			err:    &RequestError{StatusCode: 429, Body: `{"error":{"code":"rate_limit_exceeded"}}`},
			status: "",
			retry:  true,
		},
		{
			name:   "server error",
			err:    &RequestError{StatusCode: 500, Body: "internal"},
			status: "",
			retry:  false,
		},
		{
			name:   "plain quota text",
			err:    fmt.Errorf("openai request failed: exceeded your current quota"),
			status: FailoverStatusExhausted,
			retry:  true,
		},
	}

	for _, test := range tests {
		test := test
		t.Run(test.name, func(t *testing.T) {
			t.Parallel()
			status, retry := ClassifyFailover(test.err)
			if status != test.status || retry != test.retry {
				t.Fatalf("ClassifyFailover() = (%q, %v), want (%q, %v)", status, retry, test.status, test.retry)
			}
		})
	}
}
