package postgres

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	pushdomain "ots/backend/internal/domain/push"
)

func (s *Store) UpsertDeviceToken(ctx context.Context, tenantID, userID, token, platform string) (pushdomain.DeviceToken, error) {
	prefsJSON, _ := json.Marshal(pushdomain.DefaultPreferences())
	var id string
	err := s.db.QueryRowContext(ctx, `
INSERT INTO device_tokens (tenant_id, user_id, token, platform, preferences, last_seen_at, updated_at, revoked_at, failure_count, last_error)
VALUES ($1, $2::uuid, $3, $4, $5::jsonb, now(), now(), NULL, 0, NULL)
ON CONFLICT (user_id, token) DO UPDATE
SET platform = EXCLUDED.platform,
    last_seen_at = now(),
    updated_at = now(),
    revoked_at = NULL,
    failure_count = 0,
    last_error = NULL
RETURNING id::text`, tenantID, userID, token, platform, string(prefsJSON)).Scan(&id)
	if err != nil {
		return pushdomain.DeviceToken{}, err
	}
	_, _ = s.ensureNotificationPreferences(ctx, tenantID, userID)
	return s.deviceTokenByID(ctx, tenantID, userID, id)
}

func (s *Store) DeleteDeviceToken(ctx context.Context, tenantID, userID, token string) bool {
	res, err := s.db.ExecContext(ctx, `
DELETE FROM device_tokens
WHERE tenant_id = $1 AND user_id = $2::uuid AND token = $3`, tenantID, userID, token)
	if err != nil {
		return false
	}
	n, _ := res.RowsAffected()
	return n > 0
}

func (s *Store) RevokeDeviceToken(ctx context.Context, tenantID, userID, tokenID string) bool {
	res, err := s.db.ExecContext(ctx, `
UPDATE device_tokens
SET revoked_at = now(), updated_at = now()
WHERE tenant_id = $1 AND user_id = $2::uuid AND id = $3::uuid AND revoked_at IS NULL`,
		tenantID, userID, tokenID)
	if err != nil {
		return false
	}
	n, _ := res.RowsAffected()
	return n > 0
}

func (s *Store) ListDeviceTokensForUser(ctx context.Context, tenantID, userID string) ([]pushdomain.DeviceToken, error) {
	rows, err := s.db.QueryContext(ctx, `
SELECT id::text, tenant_id::text, user_id::text, token, platform, COALESCE(last_seen_at, now()), COALESCE(failure_count, 0), COALESCE(last_error, ''), revoked_at
FROM device_tokens
WHERE tenant_id = $1 AND user_id = $2::uuid AND revoked_at IS NULL
ORDER BY last_seen_at DESC`, tenantID, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanActiveDeviceTokens(rows)
}

func (s *Store) ListMyDeviceTokens(ctx context.Context, tenantID, userID string) ([]pushdomain.DeviceToken, error) {
	rows, err := s.db.QueryContext(ctx, `
SELECT id::text, tenant_id::text, user_id::text, token, platform, COALESCE(last_seen_at, now()), COALESCE(failure_count, 0), COALESCE(last_error, ''), revoked_at
FROM device_tokens
WHERE tenant_id = $1 AND user_id = $2::uuid
ORDER BY last_seen_at DESC`, tenantID, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanActiveDeviceTokens(rows)
}

func (s *Store) MarkDeviceTokenFailure(ctx context.Context, tenantID, tokenID, errorMessage string) error {
	_, err := s.db.ExecContext(ctx, `
UPDATE device_tokens
SET failure_count = failure_count + 1,
    last_error = $3,
    updated_at = now()
WHERE tenant_id = $1 AND id = $2::uuid`, tenantID, tokenID, errorMessage)
	return err
}

func (s *Store) ensureNotificationPreferences(ctx context.Context, tenantID, userID string) (pushdomain.Preferences, error) {
	prefsJSON, _ := json.Marshal(pushdomain.DefaultPreferences())
	_, err := s.db.ExecContext(ctx, `
INSERT INTO notification_preferences (tenant_id, user_id, preferences, updated_at)
VALUES ($1, $2::uuid, $3::jsonb, now())
ON CONFLICT (tenant_id, user_id) DO NOTHING`, tenantID, userID, string(prefsJSON))
	if err != nil {
		return pushdomain.DefaultPreferences(), err
	}
	return s.GetNotificationPreferences(ctx, tenantID, userID)
}

func (s *Store) GetNotificationPreferences(ctx context.Context, tenantID, userID string) (pushdomain.Preferences, error) {
	var raw []byte
	err := s.db.QueryRowContext(ctx, `
SELECT preferences
FROM notification_preferences
WHERE tenant_id = $1 AND user_id = $2::uuid`, tenantID, userID).Scan(&raw)
	if err == sql.ErrNoRows {
		return s.ensureNotificationPreferences(ctx, tenantID, userID)
	}
	if err != nil {
		return pushdomain.DefaultPreferences(), err
	}
	return decodePreferences(raw), nil
}

func (s *Store) UpdateNotificationPreferences(ctx context.Context, tenantID, userID string, prefs pushdomain.Preferences) (pushdomain.Preferences, error) {
	raw, err := json.Marshal(prefs)
	if err != nil {
		return pushdomain.DefaultPreferences(), err
	}
	_, err = s.db.ExecContext(ctx, `
INSERT INTO notification_preferences (tenant_id, user_id, preferences, updated_at)
VALUES ($1, $2::uuid, $3::jsonb, now())
ON CONFLICT (tenant_id, user_id) DO UPDATE
SET preferences = EXCLUDED.preferences,
    updated_at = now()`, tenantID, userID, string(raw))
	if err != nil {
		return pushdomain.DefaultPreferences(), err
	}
	return prefs, nil
}

func (s *Store) ListUserIDsByAudience(ctx context.Context, tenantID, audience string) ([]string, error) {
	audience = strings.TrimSpace(strings.ToLower(audience))
	query := `
SELECT DISTINCT ur.user_id::text
FROM user_roles ur
JOIN roles r ON r.id = ur.role_id
WHERE ur.tenant_id = $1`
	args := []any{tenantID}
	switch audience {
	case "teachers":
		query += ` AND r.code = $2`
		args = append(args, "teacher")
	case "guardians":
		query += ` AND r.code = $2`
		args = append(args, "guardian")
	case "all", "":
	default:
		query += ` AND r.code = $2`
		args = append(args, audience)
	}
	rows, err := s.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanStringColumn(rows)
}

func (s *Store) ListUserIDsForScheduleNotify(ctx context.Context, tenantID string) ([]string, error) {
	rows, err := s.db.QueryContext(ctx, `
SELECT DISTINCT ur.user_id::text
FROM user_roles ur
JOIN roles r ON r.id = ur.role_id
WHERE ur.tenant_id = $1 AND r.code IN ('teacher', 'guardian')`, tenantID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanStringColumn(rows)
}

func (s *Store) ListGuidancePlanReminders(ctx context.Context, tenantID string, withinDays int) ([]pushdomain.GuidancePlanReminder, error) {
	if withinDays <= 0 {
		withinDays = 3
	}
	rows, err := s.db.QueryContext(ctx, `
SELECT sp.id::text, sp.owner_id::text, sp.student_id::text, s.full_name, sp.title, COALESCE(to_char(sp.due_date, 'YYYY-MM-DD'), '')
FROM support_plans sp
JOIN students s ON s.id = sp.student_id AND s.tenant_id = sp.tenant_id
WHERE sp.tenant_id = $1
  AND sp.deleted_at IS NULL
  AND sp.status IN ('open', 'monitoring')
  AND sp.due_date IS NOT NULL
  AND sp.due_date BETWEEN CURRENT_DATE AND CURRENT_DATE + ($2 * INTERVAL '1 day')`, tenantID, withinDays)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := make([]pushdomain.GuidancePlanReminder, 0)
	for rows.Next() {
		var item pushdomain.GuidancePlanReminder
		if err := rows.Scan(&item.PlanID, &item.OwnerID, &item.StudentID, &item.StudentName, &item.PlanTitle, &item.DueDate); err != nil {
			return nil, err
		}
		out = append(out, item)
	}
	return out, rows.Err()
}

func (s *Store) EnsureUserNotification(ctx context.Context, tenantID, userID, title, body, kind string) (string, error) {
	var exists bool
	if err := s.db.QueryRowContext(ctx, `
SELECT EXISTS(
  SELECT 1 FROM notifications WHERE tenant_id = $1 AND user_id = $2::uuid AND kind = $3
)`, tenantID, userID, kind).Scan(&exists); err != nil {
		return "", err
	}
	if exists {
		return "", nil
	}
	var id string
	err := s.db.QueryRowContext(ctx, `
INSERT INTO notifications (tenant_id, user_id, title, body, kind)
VALUES ($1, $2::uuid, $3, $4, $5)
RETURNING id::text`, tenantID, userID, title, body, kind).Scan(&id)
	return id, err
}

func (s *Store) RecordDeliveryLog(ctx context.Context, entry pushdomain.DeliveryLog) (string, error) {
	var id string
	err := s.db.QueryRowContext(ctx, `
INSERT INTO push_delivery_logs (tenant_id, user_id, device_token_id, category, title, status, provider)
VALUES ($1, $2::uuid, NULLIF($3, '')::uuid, $4, $5, $6, $7)
RETURNING id::text`,
		entry.TenantID,
		entry.UserID,
		entry.DeviceTokenID,
		entry.Category,
		entry.Title,
		defaultString(entry.Status, pushdomain.DeliveryStatusQueued),
		defaultString(entry.Provider, "expo"),
	).Scan(&id)
	return id, err
}

func (s *Store) UpdateDeliveryLog(ctx context.Context, logID, status, receiptID, errorCode, errorMessage string, sentAt *time.Time) error {
	_, err := s.db.ExecContext(ctx, `
UPDATE push_delivery_logs
SET status = $2,
    provider_receipt_id = NULLIF($3, ''),
    error_code = NULLIF($4, ''),
    error_message = NULLIF($5, ''),
    sent_at = COALESCE($6, sent_at)
WHERE id = $7::uuid`, logID, status, receiptID, errorCode, errorMessage, sentAt, logID)
	return err
}

func (s *Store) PushHealth(ctx context.Context, tenantID string) (pushdomain.PushHealth, error) {
	var health pushdomain.PushHealth
	_ = s.db.QueryRowContext(ctx, `
SELECT
  COUNT(*) FILTER (WHERE revoked_at IS NULL),
  COUNT(*) FILTER (WHERE revoked_at IS NOT NULL)
FROM device_tokens
WHERE tenant_id = $1`, tenantID).Scan(&health.ActiveTokens, &health.RevokedTokens)
	_ = s.db.QueryRowContext(ctx, `
SELECT
  COUNT(*) FILTER (WHERE status = 'sent'),
  COUNT(*) FILTER (WHERE status = 'failed')
FROM push_delivery_logs
WHERE tenant_id = $1 AND created_at >= now() - interval '24 hours'`, tenantID).Scan(&health.SentLast24h, &health.FailedLast24h)
	total := health.SentLast24h + health.FailedLast24h
	if total > 0 {
		health.FailureRate24h = float64(health.FailedLast24h) / float64(total)
	}
	return health, nil
}

func (s *Store) ListActiveTenantIDs(ctx context.Context) ([]string, error) {
	rows, err := s.db.QueryContext(ctx, `SELECT id::text FROM tenants WHERE deleted_at IS NULL`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanStringColumn(rows)
}

func (s *Store) ListDeliveryLogs(ctx context.Context, tenantID string, limit int) ([]pushdomain.DeliveryLog, error) {
	rows, err := s.db.QueryContext(ctx, `
SELECT id::text, tenant_id::text, user_id::text, COALESCE(device_token_id::text, ''), category, title, status, provider,
       COALESCE(provider_receipt_id, ''), COALESCE(error_code, ''), COALESCE(error_message, ''), sent_at, created_at
FROM push_delivery_logs
WHERE ($1 = '' OR tenant_id = $1::uuid)
ORDER BY created_at DESC
LIMIT $2`, tenantID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := make([]pushdomain.DeliveryLog, 0)
	for rows.Next() {
		var item pushdomain.DeliveryLog
		var sentAt sql.NullTime
		var createdAt time.Time
		if err := rows.Scan(
			&item.ID, &item.TenantID, &item.UserID, &item.DeviceTokenID, &item.Category, &item.Title, &item.Status, &item.Provider,
			&item.ProviderReceiptID, &item.ErrorCode, &item.ErrorMessage, &sentAt, &createdAt,
		); err != nil {
			return nil, err
		}
		if sentAt.Valid {
			item.SentAt = sentAt.Time.UTC().Format(time.RFC3339)
		}
		item.CreatedAt = createdAt.UTC().Format(time.RFC3339)
		out = append(out, item)
	}
	return out, rows.Err()
}

func (s *Store) deviceTokenByID(ctx context.Context, tenantID, userID, id string) (pushdomain.DeviceToken, error) {
	rows, err := s.db.QueryContext(ctx, `
SELECT id::text, tenant_id::text, user_id::text, token, platform, COALESCE(last_seen_at, now()), COALESCE(failure_count, 0), COALESCE(last_error, ''), revoked_at
FROM device_tokens
WHERE tenant_id = $1 AND user_id = $2::uuid AND id = $3::uuid`, tenantID, userID, id)
	if err != nil {
		return pushdomain.DeviceToken{}, err
	}
	defer rows.Close()
	items, err := scanActiveDeviceTokens(rows)
	if err != nil || len(items) == 0 {
		return pushdomain.DeviceToken{}, fmt.Errorf("device token not found")
	}
	return items[0], nil
}

func scanActiveDeviceTokens(rows *sql.Rows) ([]pushdomain.DeviceToken, error) {
	out := make([]pushdomain.DeviceToken, 0)
	for rows.Next() {
		var item pushdomain.DeviceToken
		var lastSeen time.Time
		var revokedAt sql.NullTime
		if err := rows.Scan(&item.ID, &item.TenantID, &item.UserID, &item.Token, &item.Platform, &lastSeen, &item.FailureCount, &item.LastError, &revokedAt); err != nil {
			return nil, err
		}
		item.LastSeenAt = lastSeen.UTC().Format(time.RFC3339)
		if revokedAt.Valid {
			item.RevokedAt = revokedAt.Time.UTC().Format(time.RFC3339)
		}
		out = append(out, item)
	}
	return out, rows.Err()
}

func scanStringColumn(rows *sql.Rows) ([]string, error) {
	out := make([]string, 0)
	for rows.Next() {
		var value string
		if err := rows.Scan(&value); err != nil {
			return nil, err
		}
		out = append(out, value)
	}
	return out, rows.Err()
}

func decodePreferences(raw []byte) pushdomain.Preferences {
	prefs := pushdomain.DefaultPreferences()
	if len(raw) == 0 {
		return prefs
	}
	_ = json.Unmarshal(raw, &prefs)
	return prefs
}

func defaultString(value, fallback string) string {
	if strings.TrimSpace(value) == "" {
		return fallback
	}
	return value
}

func (s *Store) ListGuardianUserIDsForStudent(ctx context.Context, tenantID, studentID string) ([]string, error) {
	return s.listGuardianUserIDsForStudent(ctx, tenantID, studentID)
}
