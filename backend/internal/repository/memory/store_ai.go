package memory

import (
	"context"
	"encoding/json"
	"fmt"
	"sort"
	"strings"
	"time"

	aidomain "ots/backend/internal/domain/ai"
)

type memoryAIConversation struct {
	ID        string
	TenantID  string
	UserID    string
	Role      string
	Title     string
	Status    string
	CreatedAt time.Time
	UpdatedAt time.Time
}

type memoryAIMessage struct {
	ID             string
	TenantID       string
	ConversationID string
	UserID         string
	Role           string
	Content        string
	Model          string
	TokenInput     int
	TokenOutput    int
	CreatedAt      time.Time
}

type memoryAIPendingAction struct {
	ID               string
	TenantID         string
	ConversationID   string
	RequestedBy      string
	ActionType       aidomain.ActionType
	RiskLevel        aidomain.RiskLevel
	Payload          json.RawMessage
	PayloadHash      string
	Status           aidomain.PendingActionStatus
	ConfirmationText string
	ExpiresAt        time.Time
	CreatedAt        time.Time
	ConfirmedAt      *time.Time
	CancelledAt      *time.Time
}

type memoryAIToolCall struct {
	ID             string
	TenantID       string
	ConversationID string
	MessageID      string
	ToolName       string
	Arguments      json.RawMessage
	ResultSummary  json.RawMessage
	Status         string
	CreatedAt      time.Time
}

func (s *Store) nextAIID(prefix string) string {
	s.aiSeq++
	return fmt.Sprintf("%s-%d", prefix, s.aiSeq)
}

func (s *Store) CreateConversation(_ context.Context, tenantID, userID, role, title string) (aidomain.Conversation, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	now := s.clock()
	item := memoryAIConversation{
		ID:        s.nextAIID("ai-conv"),
		TenantID:  tenantID,
		UserID:    userID,
		Role:      role,
		Title:     title,
		Status:    "active",
		CreatedAt: now,
		UpdatedAt: now,
	}
	s.aiConversations = append(s.aiConversations, item)
	return toAIConversation(item), nil
}

func (s *Store) ListConversations(_ context.Context, tenantID, userID string) ([]aidomain.Conversation, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := make([]aidomain.Conversation, 0)
	for _, item := range s.aiConversations {
		if item.TenantID == tenantID && item.UserID == userID {
			out = append(out, toAIConversation(item))
		}
	}
	sort.Slice(out, func(i, j int) bool { return out[i].UpdatedAt.After(out[j].UpdatedAt) })
	return out, nil
}

func (s *Store) GetConversation(_ context.Context, tenantID, userID, conversationID string) (aidomain.Conversation, bool, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	for _, item := range s.aiConversations {
		if item.ID == conversationID && item.TenantID == tenantID && item.UserID == userID {
			return toAIConversation(item), true, nil
		}
	}
	return aidomain.Conversation{}, false, nil
}

func (s *Store) TouchConversation(_ context.Context, tenantID, conversationID string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	for i := range s.aiConversations {
		if s.aiConversations[i].ID == conversationID && s.aiConversations[i].TenantID == tenantID {
			s.aiConversations[i].UpdatedAt = s.clock()
			return nil
		}
	}
	return nil
}

func (s *Store) CreateMessage(_ context.Context, tenantID, conversationID, userID, role, content, model string, tokenInput, tokenOutput int) (aidomain.Message, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	item := memoryAIMessage{
		ID:             s.nextAIID("ai-msg"),
		TenantID:       tenantID,
		ConversationID: conversationID,
		UserID:         userID,
		Role:           role,
		Content:        content,
		Model:          model,
		TokenInput:     tokenInput,
		TokenOutput:    tokenOutput,
		CreatedAt:      s.clock(),
	}
	s.aiMessages = append(s.aiMessages, item)
	return toAIMessage(item), nil
}

func (s *Store) ListMessages(_ context.Context, tenantID, conversationID string) ([]aidomain.Message, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := make([]aidomain.Message, 0)
	for _, item := range s.aiMessages {
		if item.TenantID == tenantID && item.ConversationID == conversationID {
			out = append(out, toAIMessage(item))
		}
	}
	sort.Slice(out, func(i, j int) bool { return out[i].CreatedAt.Before(out[j].CreatedAt) })
	return out, nil
}

func (s *Store) CreatePendingAction(_ context.Context, tenantID, userID, conversationID string, actionType aidomain.ActionType, risk aidomain.RiskLevel, payload []byte, payloadHash, confirmationText string, expiresAt time.Time) (aidomain.PendingAction, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	item := memoryAIPendingAction{
		ID:               s.nextAIID("ai-action"),
		TenantID:         tenantID,
		ConversationID:   conversationID,
		RequestedBy:      userID,
		ActionType:       actionType,
		RiskLevel:        risk,
		Payload:          append(json.RawMessage(nil), payload...),
		PayloadHash:      payloadHash,
		Status:           aidomain.PendingActionPending,
		ConfirmationText: confirmationText,
		ExpiresAt:        expiresAt,
		CreatedAt:        s.clock(),
	}
	s.aiPendingActions = append(s.aiPendingActions, item)
	return toAIPendingAction(item), nil
}

func (s *Store) GetPendingAction(_ context.Context, tenantID, userID, actionID string) (aidomain.PendingAction, bool, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	for _, item := range s.aiPendingActions {
		if item.ID == actionID && item.TenantID == tenantID && item.RequestedBy == userID {
			return toAIPendingAction(item), true, nil
		}
	}
	return aidomain.PendingAction{}, false, nil
}

func (s *Store) GetLatestPendingAction(_ context.Context, tenantID, userID, conversationID string) (aidomain.PendingAction, bool, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	var latest *memoryAIPendingAction
	for i := range s.aiPendingActions {
		item := &s.aiPendingActions[i]
		if item.TenantID != tenantID || item.RequestedBy != userID || item.ConversationID != conversationID {
			continue
		}
		if item.Status != aidomain.PendingActionPending {
			continue
		}
		if latest == nil || item.CreatedAt.After(latest.CreatedAt) {
			latest = item
		}
	}
	if latest == nil {
		return aidomain.PendingAction{}, false, nil
	}
	return toAIPendingAction(*latest), true, nil
}

func (s *Store) UpdatePendingActionStatus(_ context.Context, tenantID, userID, actionID string, status aidomain.PendingActionStatus, at time.Time) (aidomain.PendingAction, bool, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	for i := range s.aiPendingActions {
		item := &s.aiPendingActions[i]
		if item.ID != actionID || item.TenantID != tenantID || item.RequestedBy != userID {
			continue
		}
		item.Status = status
		switch status {
		case aidomain.PendingActionConfirmed:
			item.ConfirmedAt = &at
		case aidomain.PendingActionCancelled:
			item.CancelledAt = &at
		}
		return toAIPendingAction(*item), true, nil
	}
	return aidomain.PendingAction{}, false, nil
}

func (s *Store) RecordToolCall(_ context.Context, tenantID, conversationID, messageID, toolName string, arguments, resultSummary json.RawMessage) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.aiToolCalls = append(s.aiToolCalls, memoryAIToolCall{
		ID:             s.nextAIID("ai-tool"),
		TenantID:       tenantID,
		ConversationID: conversationID,
		MessageID:      messageID,
		ToolName:       toolName,
		Arguments:      append(json.RawMessage(nil), arguments...),
		ResultSummary:  append(json.RawMessage(nil), resultSummary...),
		Status:         "completed",
		CreatedAt:      s.clock(),
	})
	return nil
}

func (s *Store) RecordAudit(_ context.Context, tenantID, actorUserID, action, resourceType, resourceID string, metadata json.RawMessage) error {
	s.RecordOperationalAudit(context.Background(), tenantID, actorUserID, action, resourceType, resourceID, string(metadata))
	return nil
}

func (s *Store) GetAIProviderKey(_ context.Context) (string, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	if cred, ok := s.credentials["ai_provider_key"]; ok {
		return strings.TrimSpace(cred.Value), nil
	}
	return "", nil
}

func (s *Store) CountUserMessagesSince(_ context.Context, tenantID, userID string, since time.Time) (int, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	count := 0
	for _, item := range s.aiMessages {
		if item.TenantID != tenantID || item.UserID != userID || item.Role != "user" {
			continue
		}
		if item.CreatedAt.After(since) || item.CreatedAt.Equal(since) {
			count++
		}
	}
	return count, nil
}

func (s *Store) PurgeExpiredAIRecords(_ context.Context, tenantID string, before, now time.Time) (aidomain.RetentionResult, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	result := aidomain.RetentionResult{}
	keepMessages := make([]memoryAIMessage, 0, len(s.aiMessages))
	for _, item := range s.aiMessages {
		if item.TenantID == tenantID && item.CreatedAt.Before(before) {
			result.MessagesDeleted++
			continue
		}
		keepMessages = append(keepMessages, item)
	}
	s.aiMessages = keepMessages

	for i := range s.aiPendingActions {
		item := &s.aiPendingActions[i]
		if item.TenantID != tenantID {
			continue
		}
		if item.Status == aidomain.PendingActionPending && item.ExpiresAt.Before(now) {
			item.Status = aidomain.PendingActionExpired
			result.PendingActionsExpired++
		}
	}

	for i := range s.aiConversations {
		item := &s.aiConversations[i]
		if item.TenantID != tenantID || item.UpdatedAt.After(before) {
			continue
		}
		item.Status = "archived"
		result.ConversationsArchived++
	}
	return result, nil
}

func (s *Store) ListAITenantIDs(_ context.Context) ([]string, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	seen := map[string]struct{}{}
	for _, item := range s.aiConversations {
		seen[item.TenantID] = struct{}{}
	}
	out := make([]string, 0, len(seen))
	for tenantID := range seen {
		out = append(out, tenantID)
	}
	if len(out) == 0 && s.tenant.ID != "" {
		out = append(out, s.tenant.ID)
	}
	return out, nil
}

func toAIConversation(item memoryAIConversation) aidomain.Conversation {
	return aidomain.Conversation{
		ID:        item.ID,
		TenantID:  item.TenantID,
		UserID:    item.UserID,
		Role:      item.Role,
		Title:     item.Title,
		Status:    item.Status,
		CreatedAt: item.CreatedAt,
		UpdatedAt: item.UpdatedAt,
	}
}

func toAIMessage(item memoryAIMessage) aidomain.Message {
	return aidomain.Message{
		ID:             item.ID,
		TenantID:       item.TenantID,
		ConversationID: item.ConversationID,
		UserID:         item.UserID,
		Role:           item.Role,
		Content:        item.Content,
		Model:          item.Model,
		CreatedAt:      item.CreatedAt,
	}
}

func toAIPendingAction(item memoryAIPendingAction) aidomain.PendingAction {
	return aidomain.PendingAction{
		ID:               item.ID,
		TenantID:         item.TenantID,
		ConversationID:   item.ConversationID,
		RequestedBy:      item.RequestedBy,
		ActionType:       item.ActionType,
		RiskLevel:        item.RiskLevel,
		Payload:          append(json.RawMessage(nil), item.Payload...),
		PayloadHash:      item.PayloadHash,
		Status:           item.Status,
		ConfirmationText: item.ConfirmationText,
		ExpiresAt:        item.ExpiresAt,
		CreatedAt:        item.CreatedAt,
	}
}

func (s *Store) GetAICostSettings(_ context.Context) (aidomain.CostSettings, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.aiCostSettings, nil
}

func (s *Store) UpdateAICostSettings(_ context.Context, input aidomain.CostSettings) (aidomain.CostSettings, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.aiCostSettings = input
	return s.aiCostSettings, nil
}

func (s *Store) GetAIPlatformAnalytics(_ context.Context, since time.Time) (aidomain.PlatformAnalytics, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	out := aidomain.PlatformAnalytics{
		DailyUsage: make([]aidomain.UsagePoint, 0),
		ByTenant:   make([]aidomain.TenantUsageRow, 0),
		ByModel:    make([]aidomain.ModelUsageRow, 0),
	}
	tenantNames := map[string]string{s.tenant.ID: s.tenant.Name}
	for _, institution := range s.institutions {
		tenantNames[institution.ID] = institution.Name
	}
	activeUsers := map[string]struct{}{}
	daily := map[string]*aidomain.UsagePoint{}
	tenantUsage := map[string]*aidomain.TenantUsageRow{}
	modelUsage := map[string]*aidomain.ModelUsageRow{}

	for _, conv := range s.aiConversations {
		if conv.Status == "archived" || conv.CreatedAt.Before(since) {
			continue
		}
		out.TotalConversations++
	}

	for _, msg := range s.aiMessages {
		if msg.CreatedAt.Before(since) {
			continue
		}
		day := msg.CreatedAt.UTC().Format("2006-01-02")
		if daily[day] == nil {
			daily[day] = &aidomain.UsagePoint{Label: day}
		}
		daily[day].TokenInput += msg.TokenInput
		daily[day].TokenOutput += msg.TokenOutput

		if msg.Role == "user" {
			out.TotalUserMessages++
			daily[day].UserMessages++
			if msg.UserID != "" {
				activeUsers[msg.UserID] = struct{}{}
			}
		}
		if msg.Role == "assistant" {
			out.TotalAssistantMessages++
		}
		out.TokenInput += msg.TokenInput
		out.TokenOutput += msg.TokenOutput

		if tenantUsage[msg.TenantID] == nil {
			tenantUsage[msg.TenantID] = &aidomain.TenantUsageRow{
				TenantID:   msg.TenantID,
				TenantName: tenantNames[msg.TenantID],
			}
		}
		row := tenantUsage[msg.TenantID]
		row.TokenInput += msg.TokenInput
		row.TokenOutput += msg.TokenOutput
		if msg.Role == "user" {
			row.UserMessages++
		}

		if msg.Role == "assistant" {
			model := strings.TrimSpace(msg.Model)
			if model == "" {
				model = "unknown"
			}
			if modelUsage[model] == nil {
				modelUsage[model] = &aidomain.ModelUsageRow{Model: model}
			}
			modelUsage[model].Messages++
			modelUsage[model].TokenInput += msg.TokenInput
			modelUsage[model].TokenOutput += msg.TokenOutput
		}
	}

	out.ActiveUsers = len(activeUsers)
	dayKeys := make([]string, 0, len(daily))
	for key := range daily {
		dayKeys = append(dayKeys, key)
	}
	sort.Strings(dayKeys)
	for _, key := range dayKeys {
		out.DailyUsage = append(out.DailyUsage, *daily[key])
	}
	for _, row := range tenantUsage {
		out.ByTenant = append(out.ByTenant, *row)
	}
	sort.Slice(out.ByTenant, func(i, j int) bool { return out.ByTenant[i].UserMessages > out.ByTenant[j].UserMessages })
	for _, row := range modelUsage {
		out.ByModel = append(out.ByModel, *row)
	}
	sort.Slice(out.ByModel, func(i, j int) bool { return out.ByModel[i].Messages > out.ByModel[j].Messages })
	return out, nil
}
