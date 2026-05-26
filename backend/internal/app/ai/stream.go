package ai

import (
	"context"
	"strings"

	aidomain "ots/backend/internal/domain/ai"
	"ots/backend/internal/domain/identity"
	"ots/backend/internal/platform/openai"
)

type StreamEmitter func(event aidomain.StreamEvent) error

func (s *Service) SendMessageStream(
	ctx context.Context,
	principal identity.Principal,
	conversationID string,
	input aidomain.SendMessageInput,
	emit StreamEmitter,
) error {
	content := strings.TrimSpace(input.Content)
	if content == "" && strings.TrimSpace(input.SelectedCandidateID) == "" {
		return ErrInvalidMessage
	}

	conversation, err := s.GetConversation(ctx, principal, conversationID)
	if err != nil {
		return err
	}

	if content != "" {
		if blocked, reason := detectPromptInjection(content); blocked {
			if _, err := s.saveMessage(ctx, principal.TenantID, conversationID, principal.UserID, "user", sanitizeUserFacingContent(content), ""); err != nil {
				return err
			}
			reply, err := s.saveMessage(ctx, principal.TenantID, conversationID, "", "assistant", reason, "security")
			if err != nil {
				return err
			}
			return emit(aidomain.StreamEvent{Type: "done", Message: &reply})
		}
		if err := s.CheckDailyLimit(ctx, principal.TenantID, principal.UserID); err != nil {
			return err
		}
		if _, err := s.saveMessage(ctx, principal.TenantID, conversationID, principal.UserID, "user", content, ""); err != nil {
			return err
		}
	}

	if s.useLLM(ctx) && strings.TrimSpace(input.SelectedCandidateID) == "" && content != "" {
		if err := s.streamLLMResponse(ctx, principal, conversation, content, emit); err == nil {
			_ = s.repo.TouchConversation(ctx, principal.TenantID, conversationID)
			return nil
		}
	}

	result, model, tokenInput, tokenOutput, err := s.orchestrateMessage(ctx, principal, conversation, input)
	if err != nil {
		return err
	}
	if err := emitStreamingText(result.Message.Content, emit); err != nil {
		return err
	}
	saved, err := s.saveMessageWithUsage(ctx, principal.TenantID, conversationID, "", result.Message.Role, result.Message.Content, model, tokenInput, tokenOutput)
	if err != nil {
		return err
	}
	result.Message = saved
	_ = s.repo.TouchConversation(ctx, principal.TenantID, conversationID)
	return emit(aidomain.StreamEvent{
		Type:          "done",
		Message:       &result.Message,
		Candidates:    result.Candidates,
		PendingAction: result.PendingAction,
	})
}

func (s *Service) orchestrateMessage(
	ctx context.Context,
	principal identity.Principal,
	conversation aidomain.Conversation,
	input aidomain.SendMessageInput,
) (aidomain.SendMessageResult, string, int, int, error) {
	content := strings.TrimSpace(input.Content)
	var result aidomain.SendMessageResult
	model := "rule-engine"
	tokenInput, tokenOutput := 0, 0
	var err error

	if strings.TrimSpace(input.SelectedCandidateID) == "" && content != "" {
		if llmResult, llmUsage, used, llmErr := s.tryLLMOrchestration(ctx, principal, conversation, content); llmErr != nil {
			return aidomain.SendMessageResult{}, "", 0, 0, llmErr
		} else if used {
			return llmResult, s.cfg.Model, llmUsage.Input, llmUsage.Output, nil
		}
	}

	switch principal.Role {
	case identity.RoleTeacher:
		result, err = s.orchestrateTeacherMessage(ctx, principal, conversation, input)
	case identity.RoleGuidance:
		result, err = s.orchestrateGuidanceMessage(ctx, principal, conversation, input)
	case identity.RolePrincipal, identity.RoleSystemAdmin:
		result, err = s.orchestratePrincipalMessage(ctx, principal, conversation, input)
	case identity.RoleGuardian:
		result, err = s.orchestrateGuardianMessage(ctx, principal, conversation, input)
	default:
		result = s.assistantReply(conversation, "Bu rol için ogta.ai henüz etkin değil.")
	}
	if err != nil {
		return aidomain.SendMessageResult{}, "", 0, 0, err
	}
	if s.openai.Available() {
		model = s.cfg.Model + "+rules"
	}
	return result, model, tokenInput, tokenOutput, nil
}

func (s *Service) streamLLMResponse(
	ctx context.Context,
	principal identity.Principal,
	conversation aidomain.Conversation,
	content string,
	emit StreamEmitter,
) error {
	tools := toolsForRole(principal.Role)
	if len(tools) == 0 {
		return ErrInvalidMessage
	}
	client := s.ResolveOpenAIClient(ctx)
	messages := []openai.ChatMessage{{Role: "system", Content: systemPromptForRole(principal.Role)}}
	history, err := s.repo.ListMessages(ctx, principal.TenantID, conversation.ID)
	if err != nil {
		return err
	}
	start := 0
	if len(history) > 12 {
		start = len(history) - 12
	}
	for _, item := range history[start:] {
		if item.Role == "user" || item.Role == "assistant" {
			messages = append(messages, openai.ChatMessage{Role: item.Role, Content: item.Content})
		}
	}
	if len(messages) == 1 {
		messages = append(messages, openai.ChatMessage{Role: "user", Content: content})
	}

	for step := 0; step < 6; step++ {
		var builder strings.Builder
		completion, err := client.StreamCompleteChat(ctx, messages, tools, func(delta string) error {
			builder.WriteString(delta)
			return emit(aidomain.StreamEvent{Type: "token", Delta: delta})
		})
		if err != nil {
			return err
		}
		if len(completion.ToolCalls) == 0 {
			text := strings.TrimSpace(builder.String())
			if text == "" {
				text = completion.Content
			}
			if text == "" {
				return ErrInvalidMessage
			}
			saved, err := s.saveMessageWithUsage(ctx, principal.TenantID, conversation.ID, "", "assistant", text, s.cfg.Model, completion.Usage.PromptTokens, completion.Usage.CompletionTokens)
			if err != nil {
				return err
			}
			return emit(aidomain.StreamEvent{Type: "done", Message: &saved})
		}

		messages = append(messages, openai.ChatMessage{Role: "assistant", Content: completion.Content, ToolCalls: completion.ToolCalls})
		for _, call := range completion.ToolCalls {
			outcome, execErr := s.executeToolCall(ctx, principal, conversation, content, call)
			if execErr != nil {
				return execErr
			}
			if outcome.ShortResult != nil {
				result := *outcome.ShortResult
				if result.Message.Content == "" {
					result.Message.Content = strings.TrimSpace(builder.String())
				}
				saved, err := s.saveMessageWithUsage(ctx, principal.TenantID, conversation.ID, "", result.Message.Role, result.Message.Content, s.cfg.Model, completion.Usage.PromptTokens, completion.Usage.CompletionTokens)
				if err != nil {
					return err
				}
				result.Message = saved
				return emit(aidomain.StreamEvent{
					Type:          "done",
					Message:       &result.Message,
					Candidates:    result.Candidates,
					PendingAction: result.PendingAction,
				})
			}
			messages = append(messages, openai.ChatMessage{Role: "tool", ToolCallID: call.ID, Content: outcome.ToolContent})
		}
	}
	return ErrInvalidMessage
}

func emitStreamingText(text string, emit StreamEmitter) error {
	if strings.TrimSpace(text) == "" {
		return nil
	}
	parts := strings.SplitAfter(text, " ")
	for _, part := range parts {
		if part == "" {
			continue
		}
		if err := emit(aidomain.StreamEvent{Type: "token", Delta: part}); err != nil {
			return err
		}
	}
	return nil
}
