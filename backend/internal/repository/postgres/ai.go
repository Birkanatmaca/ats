package postgres

import (
	"context"
	"database/sql"
	"encoding/json"
	"strconv"
	"strings"
	"time"

	aidomain "ots/backend/internal/domain/ai"
)

func (s *Store) CreateConversation(ctx context.Context, tenantID, userID, role, title string) (aidomain.Conversation, error) {
	const query = `
INSERT INTO ai_conversations (tenant_id, user_id, role, title)
VALUES ($1::uuid, $2::uuid, $3, $4)
RETURNING id::text, tenant_id::text, user_id::text, role, title, status, created_at, updated_at`
	var item aidomain.Conversation
	err := s.db.QueryRowContext(ctx, query, tenantID, userID, role, title).Scan(
		&item.ID, &item.TenantID, &item.UserID, &item.Role, &item.Title, &item.Status, &item.CreatedAt, &item.UpdatedAt,
	)
	return item, err
}

func (s *Store) ListConversations(ctx context.Context, tenantID, userID string) ([]aidomain.Conversation, error) {
	rows, err := s.db.QueryContext(ctx, `
SELECT id::text, tenant_id::text, user_id::text, role, title, status, created_at, updated_at
FROM ai_conversations
WHERE tenant_id = $1::uuid AND user_id = $2::uuid AND deleted_at IS NULL
ORDER BY updated_at DESC`, tenantID, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := make([]aidomain.Conversation, 0)
	for rows.Next() {
		var item aidomain.Conversation
		if err := rows.Scan(&item.ID, &item.TenantID, &item.UserID, &item.Role, &item.Title, &item.Status, &item.CreatedAt, &item.UpdatedAt); err != nil {
			return nil, err
		}
		out = append(out, item)
	}
	return out, rows.Err()
}

func (s *Store) GetConversation(ctx context.Context, tenantID, userID, conversationID string) (aidomain.Conversation, bool, error) {
	const query = `
SELECT id::text, tenant_id::text, user_id::text, role, title, status, created_at, updated_at
FROM ai_conversations
WHERE id = $1::uuid AND tenant_id = $2::uuid AND user_id = $3::uuid AND deleted_at IS NULL`
	var item aidomain.Conversation
	err := s.db.QueryRowContext(ctx, query, conversationID, tenantID, userID).Scan(
		&item.ID, &item.TenantID, &item.UserID, &item.Role, &item.Title, &item.Status, &item.CreatedAt, &item.UpdatedAt,
	)
	if err == sql.ErrNoRows {
		return aidomain.Conversation{}, false, nil
	}
	if err != nil {
		return aidomain.Conversation{}, false, err
	}
	return item, true, nil
}

func (s *Store) TouchConversation(ctx context.Context, tenantID, conversationID string) error {
	_, err := s.db.ExecContext(ctx, `
UPDATE ai_conversations SET updated_at = now()
WHERE id = $1::uuid AND tenant_id = $2::uuid AND deleted_at IS NULL`, conversationID, tenantID)
	return err
}

func (s *Store) CreateMessage(ctx context.Context, tenantID, conversationID, userID, role, content, model string, tokenInput, tokenOutput int) (aidomain.Message, error) {
	const query = `
INSERT INTO ai_messages (tenant_id, conversation_id, user_id, role, content, model, token_input, token_output)
VALUES ($1::uuid, $2::uuid, NULLIF($3, '')::uuid, $4, $5, $6, $7, $8)
RETURNING id::text, tenant_id::text, conversation_id::text, COALESCE(user_id::text, ''), role, content, model, created_at`
	var item aidomain.Message
	err := s.db.QueryRowContext(ctx, query, tenantID, conversationID, userID, role, content, model, tokenInput, tokenOutput).Scan(
		&item.ID, &item.TenantID, &item.ConversationID, &item.UserID, &item.Role, &item.Content, &item.Model, &item.CreatedAt,
	)
	return item, err
}

func (s *Store) ListMessages(ctx context.Context, tenantID, conversationID string) ([]aidomain.Message, error) {
	rows, err := s.db.QueryContext(ctx, `
SELECT id::text, tenant_id::text, conversation_id::text, COALESCE(user_id::text, ''), role, content, model, created_at
FROM ai_messages
WHERE tenant_id = $1::uuid AND conversation_id = $2::uuid
ORDER BY created_at ASC`, tenantID, conversationID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := make([]aidomain.Message, 0)
	for rows.Next() {
		var item aidomain.Message
		if err := rows.Scan(&item.ID, &item.TenantID, &item.ConversationID, &item.UserID, &item.Role, &item.Content, &item.Model, &item.CreatedAt); err != nil {
			return nil, err
		}
		out = append(out, item)
	}
	return out, rows.Err()
}

func (s *Store) CreatePendingAction(ctx context.Context, tenantID, userID, conversationID string, actionType aidomain.ActionType, risk aidomain.RiskLevel, payload []byte, payloadHash, confirmationText string, expiresAt time.Time) (aidomain.PendingAction, error) {
	const query = `
INSERT INTO ai_pending_actions (tenant_id, conversation_id, requested_by, action_type, risk_level, payload, payload_hash, confirmation_text, expires_at)
VALUES ($1::uuid, $2::uuid, $3::uuid, $4, $5, $6::jsonb, $7, $8, $9)
RETURNING id::text, tenant_id::text, conversation_id::text, requested_by::text, action_type, risk_level, payload, payload_hash, status, confirmation_text, expires_at, created_at`
	var item aidomain.PendingAction
	err := s.db.QueryRowContext(ctx, query, tenantID, conversationID, userID, actionType, risk, payload, payloadHash, confirmationText, expiresAt).Scan(
		&item.ID, &item.TenantID, &item.ConversationID, &item.RequestedBy, &item.ActionType, &item.RiskLevel, &item.Payload, &item.PayloadHash, &item.Status, &item.ConfirmationText, &item.ExpiresAt, &item.CreatedAt,
	)
	return item, err
}

func (s *Store) GetPendingAction(ctx context.Context, tenantID, userID, actionID string) (aidomain.PendingAction, bool, error) {
	const query = `
SELECT id::text, tenant_id::text, conversation_id::text, requested_by::text, action_type, risk_level, payload, payload_hash, status, confirmation_text, expires_at, created_at
FROM ai_pending_actions
WHERE id = $1::uuid AND tenant_id = $2::uuid AND requested_by = $3::uuid`
	var item aidomain.PendingAction
	err := s.db.QueryRowContext(ctx, query, actionID, tenantID, userID).Scan(
		&item.ID, &item.TenantID, &item.ConversationID, &item.RequestedBy, &item.ActionType, &item.RiskLevel, &item.Payload, &item.PayloadHash, &item.Status, &item.ConfirmationText, &item.ExpiresAt, &item.CreatedAt,
	)
	if err == sql.ErrNoRows {
		return aidomain.PendingAction{}, false, nil
	}
	if err != nil {
		return aidomain.PendingAction{}, false, err
	}
	return item, true, nil
}

func (s *Store) GetLatestPendingAction(ctx context.Context, tenantID, userID, conversationID string) (aidomain.PendingAction, bool, error) {
	const query = `
SELECT id::text, tenant_id::text, conversation_id::text, requested_by::text, action_type, risk_level, payload, payload_hash, status, confirmation_text, expires_at, created_at
FROM ai_pending_actions
WHERE tenant_id = $1::uuid AND requested_by = $2::uuid AND conversation_id = $3::uuid AND status = 'pending'
ORDER BY created_at DESC
LIMIT 1`
	var item aidomain.PendingAction
	err := s.db.QueryRowContext(ctx, query, tenantID, userID, conversationID).Scan(
		&item.ID, &item.TenantID, &item.ConversationID, &item.RequestedBy, &item.ActionType, &item.RiskLevel, &item.Payload, &item.PayloadHash, &item.Status, &item.ConfirmationText, &item.ExpiresAt, &item.CreatedAt,
	)
	if err == sql.ErrNoRows {
		return aidomain.PendingAction{}, false, nil
	}
	if err != nil {
		return aidomain.PendingAction{}, false, err
	}
	return item, true, nil
}

func (s *Store) UpdatePendingActionStatus(ctx context.Context, tenantID, userID, actionID string, status aidomain.PendingActionStatus, at time.Time) (aidomain.PendingAction, bool, error) {
	var confirmedAt sql.NullTime
	var cancelledAt sql.NullTime
	switch status {
	case aidomain.PendingActionConfirmed:
		confirmedAt = sql.NullTime{Time: at, Valid: true}
	case aidomain.PendingActionCancelled:
		cancelledAt = sql.NullTime{Time: at, Valid: true}
	}

	const query = `
UPDATE ai_pending_actions
SET status = $4, confirmed_at = COALESCE($5, confirmed_at), cancelled_at = COALESCE($6, cancelled_at)
WHERE id = $1::uuid AND tenant_id = $2::uuid AND requested_by = $3::uuid
RETURNING id::text, tenant_id::text, conversation_id::text, requested_by::text, action_type, risk_level, payload, payload_hash, status, confirmation_text, expires_at, created_at`
	var item aidomain.PendingAction
	err := s.db.QueryRowContext(ctx, query, actionID, tenantID, userID, status, confirmedAt, cancelledAt).Scan(
		&item.ID, &item.TenantID, &item.ConversationID, &item.RequestedBy, &item.ActionType, &item.RiskLevel, &item.Payload, &item.PayloadHash, &item.Status, &item.ConfirmationText, &item.ExpiresAt, &item.CreatedAt,
	)
	if err == sql.ErrNoRows {
		return aidomain.PendingAction{}, false, nil
	}
	if err != nil {
		return aidomain.PendingAction{}, false, err
	}
	return item, true, nil
}

func (s *Store) RecordToolCall(ctx context.Context, tenantID, conversationID, messageID, toolName string, arguments, resultSummary json.RawMessage) error {
	_, err := s.db.ExecContext(ctx, `
INSERT INTO ai_tool_calls (tenant_id, conversation_id, message_id, tool_name, arguments, result_summary)
VALUES ($1::uuid, $2::uuid, NULLIF($3, '')::uuid, $4, $5::jsonb, $6::jsonb)`,
		tenantID, conversationID, messageID, toolName, arguments, resultSummary)
	return err
}

func (s *Store) RecordAudit(ctx context.Context, tenantID, actorUserID, action, resourceType, resourceID string, metadata json.RawMessage) error {
	s.RecordOperationalAudit(ctx, tenantID, actorUserID, action, resourceType, resourceID, string(metadata))
	return nil
}

func (s *Store) GetAIProviderSettings(ctx context.Context) (aidomain.ProviderSettings, error) {
	rows, err := s.db.QueryContext(ctx, `
SELECT key, value FROM platform_settings
WHERE key IN ('ai_model', 'ai_use_llm')`)
	if err != nil {
		return aidomain.ProviderSettings{}, err
	}
	defer rows.Close()

	settings := aidomain.ProviderSettings{
		Model:  "gpt-4o-mini",
		UseLLM: true,
	}
	for rows.Next() {
		var key, value string
		if err := rows.Scan(&key, &value); err != nil {
			return aidomain.ProviderSettings{}, err
		}
		switch key {
		case "ai_model":
			if trimmed := strings.TrimSpace(value); trimmed != "" {
				settings.Model = trimmed
			}
		case "ai_use_llm":
			settings.UseLLM = strings.EqualFold(strings.TrimSpace(value), "true")
			settings.UseLLMSet = true
		}
	}
	return settings, rows.Err()
}

func (s *Store) UpdateAIProviderSettings(ctx context.Context, input aidomain.ProviderSettings) (aidomain.ProviderSettings, error) {
	model := strings.TrimSpace(input.Model)
	if model == "" {
		model = "gpt-4o-mini"
	}
	updates := map[string]string{
		"ai_model":   model,
		"ai_use_llm": strconv.FormatBool(input.UseLLM),
	}
	for key, value := range updates {
		if _, err := s.db.ExecContext(ctx, `
INSERT INTO platform_settings (key, value, is_secret, updated_at)
VALUES ($1, $2, false, now())
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`, key, value); err != nil {
			return aidomain.ProviderSettings{}, err
		}
	}
	return s.GetAIProviderSettings(ctx)
}

func (s *Store) GetAIProviderKey(ctx context.Context) (string, error) {
	var value string
	err := s.db.QueryRowContext(ctx, `SELECT value FROM platform_settings WHERE key = 'ai_provider_key'`).Scan(&value)
	if err == sql.ErrNoRows {
		return "", nil
	}
	if err != nil {
		return "", err
	}
	return strings.TrimSpace(value), nil
}

func (s *Store) UpdateAIProviderKey(ctx context.Context, key string) error {
	_, err := s.db.ExecContext(ctx, `
INSERT INTO platform_settings (key, value, is_secret, updated_at)
VALUES ('ai_provider_key', $1, true, now())
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, is_secret = true, updated_at = now()`, strings.TrimSpace(key))
	return err
}

func (s *Store) ListAIProviderKeys(ctx context.Context) ([]aidomain.ProviderKey, error) {
	var value string
	err := s.db.QueryRowContext(ctx, `SELECT value FROM platform_settings WHERE key = 'ai_provider_keys'`).Scan(&value)
	if err != nil && err != sql.ErrNoRows {
		return nil, err
	}
	keys, err := decodeProviderKeys(value)
	if err != nil {
		return nil, err
	}
	if len(keys) > 0 {
		return keys, nil
	}
	legacy, err := s.GetAIProviderKey(ctx)
	if err != nil || strings.TrimSpace(legacy) == "" {
		return keys, err
	}
	return []aidomain.ProviderKey{{
		ID:       "legacy",
		Label:    "Varsayılan",
		Key:      strings.TrimSpace(legacy),
		Enabled:  true,
		Priority: 1,
		Status:   aidomain.ProviderKeyStatusActive,
		Source:   aidomain.ProviderKeySourcePlatform,
	}}, nil
}

func (s *Store) SaveAIProviderKeys(ctx context.Context, keys []aidomain.ProviderKey) error {
	payload, err := json.Marshal(keys)
	if err != nil {
		return err
	}
	if _, err := s.db.ExecContext(ctx, `
INSERT INTO platform_settings (key, value, is_secret, updated_at)
VALUES ('ai_provider_keys', $1, true, now())
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, is_secret = true, updated_at = now()`, string(payload)); err != nil {
		return err
	}
	legacy := ""
	for _, key := range keys {
		if key.Enabled && strings.TrimSpace(key.Key) != "" {
			legacy = strings.TrimSpace(key.Key)
			break
		}
	}
	return s.UpdateAIProviderKey(ctx, legacy)
}

func decodeProviderKeys(raw string) ([]aidomain.ProviderKey, error) {
	raw = strings.TrimSpace(raw)
	if raw == "" || raw == "[]" {
		return []aidomain.ProviderKey{}, nil
	}
	var keys []aidomain.ProviderKey
	if err := json.Unmarshal([]byte(raw), &keys); err != nil {
		return nil, err
	}
	if keys == nil {
		return []aidomain.ProviderKey{}, nil
	}
	return keys, nil
}

func (s *Store) CountUserMessagesSince(ctx context.Context, tenantID, userID string, since time.Time) (int, error) {
	var count int
	err := s.db.QueryRowContext(ctx, `
SELECT COUNT(*)
FROM ai_messages
WHERE tenant_id = $1::uuid AND user_id = $2::uuid AND role = 'user' AND created_at >= $3`,
		tenantID, userID, since).Scan(&count)
	return count, err
}

func (s *Store) PurgeExpiredAIRecords(ctx context.Context, tenantID string, before, now time.Time) (aidomain.RetentionResult, error) {
	result := aidomain.RetentionResult{}
	res, err := s.db.ExecContext(ctx, `
DELETE FROM ai_messages
WHERE tenant_id = $1::uuid AND created_at < $2`, tenantID, before)
	if err != nil {
		return result, err
	}
	if rows, err := res.RowsAffected(); err == nil {
		result.MessagesDeleted = int(rows)
	}
	res, err = s.db.ExecContext(ctx, `
UPDATE ai_pending_actions
SET status = 'expired'
WHERE tenant_id = $1::uuid AND status = 'pending' AND expires_at < $2`, tenantID, now)
	if err != nil {
		return result, err
	}
	if rows, err := res.RowsAffected(); err == nil {
		result.PendingActionsExpired = int(rows)
	}
	res, err = s.db.ExecContext(ctx, `
UPDATE ai_conversations
SET status = 'archived', deleted_at = now(), updated_at = now()
WHERE tenant_id = $1::uuid AND updated_at < $2 AND deleted_at IS NULL`, tenantID, before)
	if err != nil {
		return result, err
	}
	if rows, err := res.RowsAffected(); err == nil {
		result.ConversationsArchived = int(rows)
	}
	return result, nil
}

func (s *Store) ListAITenantIDs(ctx context.Context) ([]string, error) {
	rows, err := s.db.QueryContext(ctx, `SELECT DISTINCT tenant_id::text FROM ai_conversations`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := make([]string, 0)
	for rows.Next() {
		var tenantID string
		if err := rows.Scan(&tenantID); err != nil {
			return nil, err
		}
		out = append(out, tenantID)
	}
	return out, rows.Err()
}

func (s *Store) GetAICostSettings(ctx context.Context) (aidomain.CostSettings, error) {
	rows, err := s.db.QueryContext(ctx, `
SELECT key, value FROM platform_settings
WHERE key IN ('ai_input_cost_per_1m_usd', 'ai_output_cost_per_1m_usd', 'ai_usd_try_rate')`)
	if err != nil {
		return aidomain.CostSettings{}, err
	}
	defer rows.Close()

	settings := aidomain.CostSettings{
		InputCostPer1MUSD:  0.15,
		OutputCostPer1MUSD: 0.60,
		UsdTryRate:         34.50,
	}
	for rows.Next() {
		var key, value string
		if err := rows.Scan(&key, &value); err != nil {
			return aidomain.CostSettings{}, err
		}
		switch key {
		case "ai_input_cost_per_1m_usd":
			settings.InputCostPer1MUSD = parseSettingFloat(value, settings.InputCostPer1MUSD)
		case "ai_output_cost_per_1m_usd":
			settings.OutputCostPer1MUSD = parseSettingFloat(value, settings.OutputCostPer1MUSD)
		case "ai_usd_try_rate":
			settings.UsdTryRate = parseSettingFloat(value, settings.UsdTryRate)
		}
	}
	return settings, rows.Err()
}

func (s *Store) UpdateAICostSettings(ctx context.Context, input aidomain.CostSettings) (aidomain.CostSettings, error) {
	updates := map[string]string{
		"ai_input_cost_per_1m_usd":  formatSettingFloat(input.InputCostPer1MUSD),
		"ai_output_cost_per_1m_usd": formatSettingFloat(input.OutputCostPer1MUSD),
		"ai_usd_try_rate":           formatSettingFloat(input.UsdTryRate),
	}
	for key, value := range updates {
		if _, err := s.db.ExecContext(ctx, `
INSERT INTO platform_settings (key, value, is_secret, updated_at)
VALUES ($1, $2, false, now())
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`, key, value); err != nil {
			return aidomain.CostSettings{}, err
		}
	}
	return s.GetAICostSettings(ctx)
}

func (s *Store) GetAIPlatformAnalytics(ctx context.Context, since time.Time) (aidomain.PlatformAnalytics, error) {
	out := aidomain.PlatformAnalytics{
		DailyUsage: make([]aidomain.UsagePoint, 0),
		ByTenant:   make([]aidomain.TenantUsageRow, 0),
		ByModel:    make([]aidomain.ModelUsageRow, 0),
		ByRole:     make([]aidomain.RoleUsageRow, 0),
	}
	err := s.db.QueryRowContext(ctx, `
SELECT
  (SELECT COUNT(*) FROM ai_conversations WHERE created_at >= $1 AND deleted_at IS NULL),
  COUNT(*) FILTER (WHERE role = 'user'),
  COUNT(*) FILTER (WHERE role = 'assistant'),
  COUNT(DISTINCT user_id) FILTER (WHERE role = 'user'),
  COALESCE(SUM(token_input), 0),
  COALESCE(SUM(token_output), 0)
FROM ai_messages
WHERE created_at >= $1`, since).Scan(
		&out.TotalConversations,
		&out.TotalUserMessages,
		&out.TotalAssistantMessages,
		&out.ActiveUsers,
		&out.TokenInput,
		&out.TokenOutput,
	)
	if err != nil {
		return aidomain.PlatformAnalytics{}, err
	}

	dayRows, err := s.db.QueryContext(ctx, `
SELECT to_char(date_trunc('day', created_at AT TIME ZONE 'UTC'), 'YYYY-MM-DD'),
  COUNT(*) FILTER (WHERE role = 'user'),
  COALESCE(SUM(token_input), 0),
  COALESCE(SUM(token_output), 0)
FROM ai_messages
WHERE created_at >= $1
GROUP BY 1
ORDER BY 1`, since)
	if err != nil {
		return aidomain.PlatformAnalytics{}, err
	}
	defer dayRows.Close()
	for dayRows.Next() {
		var point aidomain.UsagePoint
		if err := dayRows.Scan(&point.Label, &point.UserMessages, &point.TokenInput, &point.TokenOutput); err != nil {
			return aidomain.PlatformAnalytics{}, err
		}
		out.DailyUsage = append(out.DailyUsage, point)
	}
	if err := dayRows.Err(); err != nil {
		return aidomain.PlatformAnalytics{}, err
	}

	tenantRows, err := s.db.QueryContext(ctx, `
SELECT t.id::text,
  COALESCE(t.name, 'Kurum'),
  COALESCE(COUNT(m.id) FILTER (WHERE m.role = 'user'), 0),
  COALESCE(SUM(m.token_input), 0),
  COALESCE(SUM(m.token_output), 0),
  t.ai_daily_message_limit,
  t.ai_monthly_token_limit
FROM tenants t
LEFT JOIN ai_messages m ON m.tenant_id = t.id AND m.created_at >= $1
GROUP BY t.id, t.name, t.ai_daily_message_limit, t.ai_monthly_token_limit
ORDER BY COALESCE(COUNT(m.id) FILTER (WHERE m.role = 'user'), 0) DESC, t.name`, since)
	if err != nil {
		return aidomain.PlatformAnalytics{}, err
	}
	defer tenantRows.Close()
	for tenantRows.Next() {
		var row aidomain.TenantUsageRow
		var daily, monthly sql.NullInt64
		if err := tenantRows.Scan(&row.TenantID, &row.TenantName, &row.UserMessages, &row.TokenInput, &row.TokenOutput, &daily, &monthly); err != nil {
			return aidomain.PlatformAnalytics{}, err
		}
		if daily.Valid {
			value := int(daily.Int64)
			row.DailyMessageLimit = &value
		}
		if monthly.Valid {
			value := int(monthly.Int64)
			row.MonthlyTokenLimit = &value
		}
		out.ByTenant = append(out.ByTenant, row)
	}
	if err := tenantRows.Err(); err != nil {
		return aidomain.PlatformAnalytics{}, err
	}

	modelRows, err := s.db.QueryContext(ctx, `
SELECT COALESCE(NULLIF(model, ''), 'unknown'),
  COUNT(*),
  COALESCE(SUM(token_input), 0),
  COALESCE(SUM(token_output), 0)
FROM ai_messages
WHERE created_at >= $1 AND role = 'assistant'
GROUP BY 1
ORDER BY COUNT(*) DESC`, since)
	if err != nil {
		return aidomain.PlatformAnalytics{}, err
	}
	defer modelRows.Close()
	for modelRows.Next() {
		var row aidomain.ModelUsageRow
		if err := modelRows.Scan(&row.Model, &row.Messages, &row.TokenInput, &row.TokenOutput); err != nil {
			return aidomain.PlatformAnalytics{}, err
		}
		out.ByModel = append(out.ByModel, row)
	}
	if err := modelRows.Err(); err != nil {
		return aidomain.PlatformAnalytics{}, err
	}

	roleRows, err := s.db.QueryContext(ctx, `
SELECT COALESCE(NULLIF(c.role, ''), 'unknown'),
  COUNT(*) FILTER (WHERE m.role = 'user'),
  COALESCE(SUM(m.token_input), 0),
  COALESCE(SUM(m.token_output), 0)
FROM ai_messages m
JOIN ai_conversations c ON c.id = m.conversation_id
WHERE m.created_at >= $1
GROUP BY 1
ORDER BY COUNT(*) FILTER (WHERE m.role = 'user') DESC`, since)
	if err != nil {
		return aidomain.PlatformAnalytics{}, err
	}
	defer roleRows.Close()
	for roleRows.Next() {
		var row aidomain.RoleUsageRow
		if err := roleRows.Scan(&row.Role, &row.UserMessages, &row.TokenInput, &row.TokenOutput); err != nil {
			return aidomain.PlatformAnalytics{}, err
		}
		out.ByRole = append(out.ByRole, row)
	}
	return out, roleRows.Err()
}

func parseSettingFloat(raw string, fallback float64) float64 {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return fallback
	}
	value, err := strconv.ParseFloat(raw, 64)
	if err != nil || value < 0 {
		return fallback
	}
	return value
}

func formatSettingFloat(value float64) string {
	return strconv.FormatFloat(value, 'f', -1, 64)
}

func (s *Store) GetTenantAIQuota(ctx context.Context, tenantID string) (aidomain.TenantQuota, error) {
	const query = `
SELECT ai_daily_message_limit, ai_monthly_token_limit
FROM tenants
WHERE id = $1::uuid`
	var daily, monthly sql.NullInt64
	err := s.db.QueryRowContext(ctx, query, tenantID).Scan(&daily, &monthly)
	if err == sql.ErrNoRows {
		return aidomain.TenantQuota{}, nil
	}
	if err != nil {
		return aidomain.TenantQuota{}, err
	}
	out := aidomain.TenantQuota{}
	if daily.Valid {
		value := int(daily.Int64)
		out.DailyMessageLimit = &value
	}
	if monthly.Valid {
		value := int(monthly.Int64)
		out.MonthlyTokenLimit = &value
	}
	return out, nil
}

func (s *Store) UpdateTenantAIQuota(ctx context.Context, tenantID string, quota aidomain.TenantQuota) (aidomain.TenantQuota, error) {
	_, err := s.db.ExecContext(ctx, `
UPDATE tenants
SET ai_daily_message_limit = $2, ai_monthly_token_limit = $3, updated_at = now()
WHERE id = $1::uuid`, tenantID, nullableInt(quota.DailyMessageLimit), nullableInt(quota.MonthlyTokenLimit))
	if err != nil {
		return aidomain.TenantQuota{}, err
	}
	return s.GetTenantAIQuota(ctx, tenantID)
}

func (s *Store) CountTenantUserMessagesSince(ctx context.Context, tenantID string, since time.Time) (int, error) {
	var count int
	err := s.db.QueryRowContext(ctx, `
SELECT COUNT(*)
FROM ai_messages
WHERE tenant_id = $1::uuid AND role = 'user' AND created_at >= $2`, tenantID, since).Scan(&count)
	return count, err
}

func (s *Store) SumTenantTokensSince(ctx context.Context, tenantID string, since time.Time) (int, int, error) {
	var input, output int
	err := s.db.QueryRowContext(ctx, `
SELECT COALESCE(SUM(token_input), 0), COALESCE(SUM(token_output), 0)
FROM ai_messages
WHERE tenant_id = $1::uuid AND created_at >= $2`, tenantID, since).Scan(&input, &output)
	return input, output, err
}

func nullableInt(value *int) any {
	if value == nil {
		return nil
	}
	return *value
}
