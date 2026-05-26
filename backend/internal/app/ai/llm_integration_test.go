package ai_test

import (
	"context"
	"testing"

	aiapp "ots/backend/internal/app/ai"
	aidomain "ots/backend/internal/domain/ai"
	"ots/backend/internal/domain/identity"
	"ots/backend/internal/platform/openai"
)

func TestLLMOrchestrationUsesOpenAIWhenConfigured(t *testing.T) {
	service, _ := newTestService(t)
	service.SetOpenAIClientForTest(&mockLLMClient{
		replies: []openai.CompletionResult{{
			Content: "Merhaba, size nasıl yardımcı olabilirim?",
			Usage:   openai.Usage{PromptTokens: 20, CompletionTokens: 10},
		}},
	})

	principal := identity.Principal{
		UserID:   demoTeacherUserID,
		TenantID: demoTenantID,
		Role:     identity.RoleTeacher,
		Name:     "Ayşe Kara",
	}
	conv, err := service.CreateConversation(context.Background(), principal, "llm-test")
	if err != nil {
		t.Fatalf("create conversation: %v", err)
	}
	result, err := service.SendMessage(context.Background(), principal, conv.ID, aidomain.SendMessageInput{
		Content: "Merhaba ogta.ai",
	})
	if err != nil {
		t.Fatalf("send message: %v", err)
	}
	if result.Message.Content == "" {
		t.Fatal("expected assistant content")
	}
}

func TestTenantDailyQuotaBlocksMessages(t *testing.T) {
	service, store := newTestService(t)
	ctx := context.Background()
	limit := 1
	_, err := store.UpdateTenantAIQuota(ctx, demoTenantID, aidomain.TenantQuota{DailyMessageLimit: &limit})
	if err != nil {
		t.Fatalf("update quota: %v", err)
	}

	principal := identity.Principal{UserID: demoTeacherUserID, TenantID: demoTenantID, Role: identity.RoleTeacher, Name: "Ayşe Kara"}
	conv, err := service.CreateConversation(ctx, principal, "quota")
	if err != nil {
		t.Fatalf("create conversation: %v", err)
	}
	if _, err := service.SendMessage(ctx, principal, conv.ID, aidomain.SendMessageInput{Content: "ilk mesaj"}); err != nil {
		t.Fatalf("first message: %v", err)
	}
	if _, err := service.SendMessage(ctx, principal, conv.ID, aidomain.SendMessageInput{Content: "ikinci mesaj"}); err != aiapp.ErrTenantDailyLimitExceeded {
		t.Fatalf("expected tenant daily limit error, got %v", err)
	}
}

type mockLLMClient struct {
	replies []openai.CompletionResult
	step    int
}

func (m *mockLLMClient) Available() bool { return true }

func (m *mockLLMClient) Complete(_ context.Context, _ string, _ string) (string, error) {
	return "ok", nil
}

func (m *mockLLMClient) CompleteChat(_ context.Context, _ []openai.ChatMessage, _ []openai.ToolDefinition) (openai.CompletionResult, error) {
	if len(m.replies) == 0 {
		return openai.CompletionResult{Content: "ok"}, nil
	}
	if m.step >= len(m.replies) {
		return m.replies[len(m.replies)-1], nil
	}
	reply := m.replies[m.step]
	m.step++
	return reply, nil
}

func (m *mockLLMClient) StreamCompleteChat(ctx context.Context, messages []openai.ChatMessage, tools []openai.ToolDefinition, onDelta func(delta string) error) (openai.CompletionResult, error) {
	return m.CompleteChat(ctx, messages, tools)
}
