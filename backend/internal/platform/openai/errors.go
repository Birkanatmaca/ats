package openai

import (
	"errors"
	"fmt"
	"strings"
)

const (
	FailoverStatusExhausted = "exhausted"
	FailoverStatusError     = "error"
)

type RequestError struct {
	StatusCode int
	Body       string
}

func (e *RequestError) Error() string {
	if e == nil {
		return "openai request failed"
	}
	body := strings.TrimSpace(e.Body)
	if body == "" {
		return fmt.Sprintf("openai request failed (%d)", e.StatusCode)
	}
	return fmt.Sprintf("openai request failed (%d): %s", e.StatusCode, body)
}

func ClassifyFailover(err error) (status string, retry bool) {
	if err == nil {
		return "", false
	}
	var reqErr *RequestError
	code := 0
	body := strings.ToLower(err.Error())
	if errors.As(err, &reqErr) && reqErr != nil {
		code = reqErr.StatusCode
		body = strings.ToLower(reqErr.Body + " " + reqErr.Error())
	}

	quota := strings.Contains(body, "insufficient_quota") ||
		strings.Contains(body, "billing") ||
		strings.Contains(body, "exceeded your current quota") ||
		strings.Contains(body, "quota_exceeded")
	invalid := strings.Contains(body, "invalid_api_key") ||
		strings.Contains(body, "incorrect api key") ||
		strings.Contains(body, "invalid api key") ||
		code == 401
	rateLimited := code == 429 || strings.Contains(body, "rate_limit")

	switch {
	case quota:
		return FailoverStatusExhausted, true
	case invalid || code == 403:
		return FailoverStatusError, true
	case rateLimited:
		return "", true
	default:
		return "", false
	}
}
