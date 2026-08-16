package openai

import (
	"context"
	"fmt"
)

type KeySlot struct {
	ID  string
	Key string
}

type FailoverClient struct {
	Model         string
	StoreResponse bool
	Keys          []KeySlot
	OnFailure     func(id, status, message string)
	OnSuccess     func(id string)
}

func (c *FailoverClient) Available() bool {
	return c != nil && len(c.Keys) > 0
}

func (c *FailoverClient) Complete(ctx context.Context, systemPrompt string, userMessage string) (string, error) {
	result, err := c.CompleteChat(ctx, []ChatMessage{
		{Role: "system", Content: systemPrompt},
		{Role: "user", Content: userMessage},
	}, nil)
	if err != nil {
		return "", err
	}
	return result.Content, nil
}

func (c *FailoverClient) CompleteChat(ctx context.Context, messages []ChatMessage, tools []ToolDefinition) (CompletionResult, error) {
	if !c.Available() {
		return CompletionResult{}, fmt.Errorf("openai client not configured")
	}
	var lastErr error
	for _, slot := range c.Keys {
		client := NewHTTPClient(Config{
			APIKey:        slot.Key,
			Model:         c.Model,
			StoreResponse: c.StoreResponse,
		})
		result, err := client.CompleteChat(ctx, messages, tools)
		if err == nil {
			c.reportSuccess(slot.ID)
			return result, nil
		}
		lastErr = err
		status, retry := ClassifyFailover(err)
		c.reportFailure(slot.ID, status, err.Error())
		if !retry {
			return result, err
		}
	}
	if lastErr == nil {
		lastErr = fmt.Errorf("openai client not configured")
	}
	return CompletionResult{}, lastErr
}

func (c *FailoverClient) StreamCompleteChat(ctx context.Context, messages []ChatMessage, tools []ToolDefinition, onDelta func(delta string) error) (CompletionResult, error) {
	if !c.Available() {
		return CompletionResult{}, fmt.Errorf("openai client not configured")
	}
	var lastErr error
	for _, slot := range c.Keys {
		client := NewHTTPClient(Config{
			APIKey:        slot.Key,
			Model:         c.Model,
			StoreResponse: c.StoreResponse,
		})
		emitted := false
		result, err := client.StreamCompleteChat(ctx, messages, tools, func(delta string) error {
			emitted = true
			if onDelta == nil {
				return nil
			}
			return onDelta(delta)
		})
		if err == nil {
			c.reportSuccess(slot.ID)
			return result, nil
		}
		lastErr = err
		if emitted {
			return result, err
		}
		status, retry := ClassifyFailover(err)
		c.reportFailure(slot.ID, status, err.Error())
		if !retry {
			return result, err
		}
	}
	if lastErr == nil {
		lastErr = fmt.Errorf("openai client not configured")
	}
	return CompletionResult{}, lastErr
}

func (c *FailoverClient) reportSuccess(id string) {
	if c != nil && c.OnSuccess != nil && id != "" {
		c.OnSuccess(id)
	}
}

func (c *FailoverClient) reportFailure(id, status, message string) {
	if c != nil && c.OnFailure != nil && id != "" {
		c.OnFailure(id, status, message)
	}
}
