package openai

import (
	"bufio"
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

type Usage struct {
	PromptTokens     int `json:"promptTokens"`
	CompletionTokens int `json:"completionTokens"`
	TotalTokens      int `json:"totalTokens"`
}

type ToolCall struct {
	ID        string `json:"id"`
	Name      string `json:"name"`
	Arguments string `json:"arguments"`
}

type ChatMessage struct {
	Role       string     `json:"role"`
	Content    string     `json:"content,omitempty"`
	ToolCallID string     `json:"toolCallId,omitempty"`
	ToolCalls  []ToolCall `json:"toolCalls,omitempty"`
}

type ToolDefinition struct {
	Name        string         `json:"name"`
	Description string         `json:"description"`
	Parameters  map[string]any `json:"parameters"`
}

type CompletionResult struct {
	Content      string
	ToolCalls    []ToolCall
	Usage        Usage
	FinishReason string
}

type Client interface {
	Available() bool
	Complete(ctx context.Context, systemPrompt string, userMessage string) (string, error)
	CompleteChat(ctx context.Context, messages []ChatMessage, tools []ToolDefinition) (CompletionResult, error)
	StreamCompleteChat(ctx context.Context, messages []ChatMessage, tools []ToolDefinition, onDelta func(delta string) error) (CompletionResult, error)
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

func (c *HTTPClient) APIKey() string {
	if c == nil {
		return ""
	}
	return strings.TrimSpace(c.cfg.APIKey)
}

func (c *HTTPClient) Complete(ctx context.Context, systemPrompt string, userMessage string) (string, error) {
	result, err := c.CompleteChat(ctx, []ChatMessage{
		{Role: "system", Content: systemPrompt},
		{Role: "user", Content: userMessage},
	}, nil)
	if err != nil {
		return "", err
	}
	return strings.TrimSpace(result.Content), nil
}

func (c *HTTPClient) CompleteChat(ctx context.Context, messages []ChatMessage, tools []ToolDefinition) (CompletionResult, error) {
	if !c.Available() {
		return CompletionResult{}, fmt.Errorf("openai client not configured")
	}
	body := c.buildRequestBody(messages, tools, false)
	return c.doCompletion(ctx, body)
}

func (c *HTTPClient) StreamCompleteChat(ctx context.Context, messages []ChatMessage, tools []ToolDefinition, onDelta func(delta string) error) (CompletionResult, error) {
	if !c.Available() {
		return CompletionResult{}, fmt.Errorf("openai client not configured")
	}
	body := c.buildRequestBody(messages, tools, true)
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, "https://api.openai.com/v1/chat/completions", bytes.NewReader(body))
	if err != nil {
		return CompletionResult{}, err
	}
	req.Header.Set("Authorization", "Bearer "+c.cfg.APIKey)
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.client.Do(req)
	if err != nil {
		return CompletionResult{}, err
	}
	defer resp.Body.Close()
	if resp.StatusCode >= 400 {
		raw, _ := io.ReadAll(resp.Body)
		return CompletionResult{}, &RequestError{StatusCode: resp.StatusCode, Body: strings.TrimSpace(string(raw))}
	}

	result := CompletionResult{}
	scanner := bufio.NewScanner(resp.Body)
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" || !strings.HasPrefix(line, "data:") {
			continue
		}
		payload := strings.TrimSpace(strings.TrimPrefix(line, "data:"))
		if payload == "[DONE]" {
			break
		}
		var chunk struct {
			Choices []struct {
				Delta struct {
					Content   string `json:"content"`
					ToolCalls []struct {
						Index    int    `json:"index"`
						ID       string `json:"id"`
						Type     string `json:"type"`
						Function struct {
							Name      string `json:"name"`
							Arguments string `json:"arguments"`
						} `json:"function"`
					} `json:"tool_calls"`
				} `json:"delta"`
				FinishReason string `json:"finish_reason"`
			} `json:"choices"`
			Usage Usage `json:"usage"`
		}
		if err := json.Unmarshal([]byte(payload), &chunk); err != nil {
			continue
		}
		if len(chunk.Choices) == 0 {
			continue
		}
		choice := chunk.Choices[0]
		if choice.FinishReason != "" {
			result.FinishReason = choice.FinishReason
		}
		if choice.Delta.Content != "" {
			result.Content += choice.Delta.Content
			if onDelta != nil {
				if err := onDelta(choice.Delta.Content); err != nil {
					return result, err
				}
			}
		}
		for _, call := range choice.Delta.ToolCalls {
			for len(result.ToolCalls) <= call.Index {
				result.ToolCalls = append(result.ToolCalls, ToolCall{})
			}
			current := &result.ToolCalls[call.Index]
			if call.ID != "" {
				current.ID = call.ID
			}
			if call.Function.Name != "" {
				current.Name = call.Function.Name
			}
			current.Arguments += call.Function.Arguments
		}
		if chunk.Usage.TotalTokens > 0 {
			result.Usage = chunk.Usage
		}
	}
	if err := scanner.Err(); err != nil {
		return result, err
	}
	result.Content = strings.TrimSpace(result.Content)
	return result, nil
}

func (c *HTTPClient) buildRequestBody(messages []ChatMessage, tools []ToolDefinition, stream bool) []byte {
	apiMessages := make([]map[string]any, 0, len(messages))
	for _, message := range messages {
		item := map[string]any{"role": message.Role}
		if message.Content != "" {
			item["content"] = message.Content
		}
		if message.ToolCallID != "" {
			item["tool_call_id"] = message.ToolCallID
		}
		if len(message.ToolCalls) > 0 {
			calls := make([]map[string]any, 0, len(message.ToolCalls))
			for _, call := range message.ToolCalls {
				calls = append(calls, map[string]any{
					"id":   call.ID,
					"type": "function",
					"function": map[string]any{
						"name":      call.Name,
						"arguments": call.Arguments,
					},
				})
			}
			item["tool_calls"] = calls
		}
		apiMessages = append(apiMessages, item)
	}

	body := map[string]any{
		"model":    c.cfg.Model,
		"messages": apiMessages,
	}
	if stream {
		body["stream"] = true
		body["stream_options"] = map[string]any{"include_usage": true}
	}
	if !c.cfg.StoreResponse {
		body["store"] = false
	}
	if len(tools) > 0 {
		toolPayload := make([]map[string]any, 0, len(tools))
		for _, tool := range tools {
			toolPayload = append(toolPayload, map[string]any{
				"type": "function",
				"function": map[string]any{
					"name":        tool.Name,
					"description": tool.Description,
					"parameters":  tool.Parameters,
				},
			})
		}
		body["tools"] = toolPayload
		body["tool_choice"] = "auto"
	}

	payload, _ := json.Marshal(body)
	return payload
}

func (c *HTTPClient) doCompletion(ctx context.Context, body []byte) (CompletionResult, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, "https://api.openai.com/v1/chat/completions", bytes.NewReader(body))
	if err != nil {
		return CompletionResult{}, err
	}
	req.Header.Set("Authorization", "Bearer "+c.cfg.APIKey)
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.client.Do(req)
	if err != nil {
		return CompletionResult{}, err
	}
	defer resp.Body.Close()

	raw, err := io.ReadAll(resp.Body)
	if err != nil {
		return CompletionResult{}, err
	}
	if resp.StatusCode >= 400 {
		return CompletionResult{}, &RequestError{StatusCode: resp.StatusCode, Body: strings.TrimSpace(string(raw))}
	}

	var parsed struct {
		Choices []struct {
			Message struct {
				Content   string `json:"content"`
				ToolCalls []struct {
					ID       string `json:"id"`
					Type     string `json:"type"`
					Function struct {
						Name      string `json:"name"`
						Arguments string `json:"arguments"`
					} `json:"function"`
				} `json:"tool_calls"`
			} `json:"message"`
			FinishReason string `json:"finish_reason"`
		} `json:"choices"`
		Usage Usage `json:"usage"`
	}
	if err := json.Unmarshal(raw, &parsed); err != nil {
		return CompletionResult{}, err
	}
	if len(parsed.Choices) == 0 {
		return CompletionResult{}, fmt.Errorf("openai returned empty response")
	}
	choice := parsed.Choices[0]
	result := CompletionResult{
		Content:      strings.TrimSpace(choice.Message.Content),
		Usage:        parsed.Usage,
		FinishReason: choice.FinishReason,
	}
	for _, call := range choice.Message.ToolCalls {
		result.ToolCalls = append(result.ToolCalls, ToolCall{
			ID:        call.ID,
			Name:      call.Function.Name,
			Arguments: call.Function.Arguments,
		})
	}
	return result, nil
}

type NoopClient struct{}

func (NoopClient) Available() bool { return false }

func (NoopClient) Complete(_ context.Context, _ string, _ string) (string, error) {
	return "", fmt.Errorf("openai client not configured")
}

func (NoopClient) CompleteChat(_ context.Context, _ []ChatMessage, _ []ToolDefinition) (CompletionResult, error) {
	return CompletionResult{}, fmt.Errorf("openai client not configured")
}

func (NoopClient) StreamCompleteChat(_ context.Context, _ []ChatMessage, _ []ToolDefinition, _ func(delta string) error) (CompletionResult, error) {
	return CompletionResult{}, fmt.Errorf("openai client not configured")
}
