package openai

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

type Config struct {
	APIKey        string
	Model         string
	StoreResponse bool
	Timeout       time.Duration
}

type Client interface {
	Available() bool
	Complete(ctx context.Context, systemPrompt string, userMessage string) (string, error)
}

type HTTPClient struct {
	cfg    Config
	client *http.Client
}

func NewHTTPClient(cfg Config) *HTTPClient {
	timeout := cfg.Timeout
	if timeout <= 0 {
		timeout = 30 * time.Second
	}
	model := strings.TrimSpace(cfg.Model)
	if model == "" {
		model = "gpt-4o-mini"
	}
	return &HTTPClient{
		cfg: Config{
			APIKey:        strings.TrimSpace(cfg.APIKey),
			Model:         model,
			StoreResponse: cfg.StoreResponse,
			Timeout:       timeout,
		},
		client: &http.Client{Timeout: timeout},
	}
}

func (c *HTTPClient) Available() bool {
	return c != nil && strings.TrimSpace(c.cfg.APIKey) != ""
}

func (c *HTTPClient) Complete(ctx context.Context, systemPrompt string, userMessage string) (string, error) {
	if !c.Available() {
		return "", fmt.Errorf("openai client not configured")
	}

	body := map[string]any{
		"model": c.cfg.Model,
		"messages": []map[string]string{
			{"role": "system", "content": systemPrompt},
			{"role": "user", "content": userMessage},
		},
	}
	if !c.cfg.StoreResponse {
		body["store"] = false
	}

	payload, err := json.Marshal(body)
	if err != nil {
		return "", err
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, "https://api.openai.com/v1/chat/completions", bytes.NewReader(payload))
	if err != nil {
		return "", err
	}
	req.Header.Set("Authorization", "Bearer "+c.cfg.APIKey)
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	raw, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", err
	}
	if resp.StatusCode >= 400 {
		return "", fmt.Errorf("openai request failed: %s", strings.TrimSpace(string(raw)))
	}

	var parsed struct {
		Choices []struct {
			Message struct {
				Content string `json:"content"`
			} `json:"message"`
		} `json:"choices"`
	}
	if err := json.Unmarshal(raw, &parsed); err != nil {
		return "", err
	}
	if len(parsed.Choices) == 0 {
		return "", fmt.Errorf("openai returned empty response")
	}
	return strings.TrimSpace(parsed.Choices[0].Message.Content), nil
}

type NoopClient struct{}

func (NoopClient) Available() bool { return false }

func (NoopClient) Complete(_ context.Context, _ string, _ string) (string, error) {
	return "", fmt.Errorf("openai client not configured")
}
