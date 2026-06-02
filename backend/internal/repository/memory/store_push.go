package memory

import (
	"context"
	"fmt"
	"strings"
	"time"

	guidancedomain "ots/backend/internal/domain/guidance"
	"ots/backend/internal/domain/identity"
	pushdomain "ots/backend/internal/domain/push"
)

type memoryDeviceToken struct {
	pushdomain.DeviceToken
}

type memoryDeliveryLog struct {
	pushdomain.DeliveryLog
}

func prefsKey(tenantID, userID string) string {
	return tenantID + ":" + userID
}

func (s *Store) ensureDeviceTokens() []memoryDeviceToken {
	if s.deviceTokens == nil {
		s.deviceTokens = make([]memoryDeviceToken, 0)
	}
	return s.deviceTokens
}

func (s *Store) ensureNotificationPrefs() map[string]pushdomain.Preferences {
	if s.notificationPrefs == nil {
		s.notificationPrefs = map[string]pushdomain.Preferences{}
	}
	return s.notificationPrefs
}

func (s *Store) ensureDeliveryLogs() []memoryDeliveryLog {
	if s.pushDeliveryLogs == nil {
		s.pushDeliveryLogs = make([]memoryDeliveryLog, 0)
	}
	return s.pushDeliveryLogs
}

func (s *Store) UpsertDeviceToken(_ context.Context, tenantID, userID, token, platform string) (pushdomain.DeviceToken, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	now := s.clock().UTC().Format(time.RFC3339)
	for index := range s.ensureDeviceTokens() {
		if s.deviceTokens[index].UserID == userID && s.deviceTokens[index].Token == token {
			s.deviceTokens[index].Platform = platform
			s.deviceTokens[index].LastSeenAt = now
			s.deviceTokens[index].RevokedAt = ""
			s.deviceTokens[index].FailureCount = 0
			s.deviceTokens[index].LastError = ""
			return s.deviceTokens[index].DeviceToken, nil
		}
	}
	item := pushdomain.DeviceToken{
		ID:         fmt.Sprintf("device-token-%d", len(s.deviceTokens)+1),
		TenantID:   tenantID,
		UserID:     userID,
		Token:      token,
		Platform:   platform,
		LastSeenAt: now,
	}
	s.deviceTokens = append(s.deviceTokens, memoryDeviceToken{DeviceToken: item})
	key := prefsKey(tenantID, userID)
	if _, ok := s.ensureNotificationPrefs()[key]; !ok {
		s.notificationPrefs[key] = pushdomain.DefaultPreferences()
	}
	return item, nil
}

func (s *Store) DeleteDeviceToken(_ context.Context, tenantID, userID, token string) bool {
	s.mu.Lock()
	defer s.mu.Unlock()
	for index := range s.ensureDeviceTokens() {
		if s.deviceTokens[index].TenantID != tenantID || s.deviceTokens[index].UserID != userID || s.deviceTokens[index].Token != token {
			continue
		}
		s.deviceTokens = append(s.deviceTokens[:index], s.deviceTokens[index+1:]...)
		return true
	}
	return false
}

func (s *Store) RevokeDeviceToken(_ context.Context, tenantID, userID, tokenID string) bool {
	s.mu.Lock()
	defer s.mu.Unlock()
	for index := range s.ensureDeviceTokens() {
		if s.deviceTokens[index].TenantID != tenantID || s.deviceTokens[index].UserID != userID || s.deviceTokens[index].ID != tokenID {
			continue
		}
		s.deviceTokens[index].RevokedAt = s.clock().UTC().Format(time.RFC3339)
		return true
	}
	return false
}

func (s *Store) MarkDeviceTokenFailure(_ context.Context, tenantID, tokenID, errorMessage string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	for index := range s.ensureDeviceTokens() {
		if s.deviceTokens[index].TenantID != tenantID || s.deviceTokens[index].ID != tokenID {
			continue
		}
		s.deviceTokens[index].FailureCount++
		s.deviceTokens[index].LastError = errorMessage
		return nil
	}
	return nil
}

func (s *Store) ListDeviceTokensForUser(_ context.Context, tenantID, userID string) ([]pushdomain.DeviceToken, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := make([]pushdomain.DeviceToken, 0)
	for _, item := range s.ensureDeviceTokens() {
		if item.TenantID == tenantID && item.UserID == userID && item.RevokedAt == "" {
			out = append(out, item.DeviceToken)
		}
	}
	return out, nil
}

func (s *Store) ListMyDeviceTokens(_ context.Context, tenantID, userID string) ([]pushdomain.DeviceToken, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := make([]pushdomain.DeviceToken, 0)
	for _, item := range s.ensureDeviceTokens() {
		if item.TenantID == tenantID && item.UserID == userID {
			out = append(out, item.DeviceToken)
		}
	}
	return out, nil
}

func (s *Store) GetNotificationPreferences(_ context.Context, tenantID, userID string) (pushdomain.Preferences, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	if prefs, ok := s.ensureNotificationPrefs()[prefsKey(tenantID, userID)]; ok {
		return prefs, nil
	}
	return pushdomain.DefaultPreferences(), nil
}

func (s *Store) UpdateNotificationPreferences(_ context.Context, tenantID, userID string, prefs pushdomain.Preferences) (pushdomain.Preferences, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.ensureNotificationPrefs()[prefsKey(tenantID, userID)] = prefs
	return prefs, nil
}

func (s *Store) ListGuardianUserIDsForStudent(_ context.Context, tenantID, studentID string) ([]string, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	if tenantID != s.tenant.ID {
		return nil, nil
	}
	out := make([]string, 0)
	seen := map[string]struct{}{}
	for _, link := range s.studentGuardians {
		if link.StudentID != studentID {
			continue
		}
		if _, ok := seen[link.GuardianUserID]; ok {
			continue
		}
		seen[link.GuardianUserID] = struct{}{}
		out = append(out, link.GuardianUserID)
	}
	return out, nil
}

func (s *Store) ListUserIDsByAudience(_ context.Context, tenantID, audience string) ([]string, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	audience = strings.TrimSpace(strings.ToLower(audience))
	out := make([]string, 0)
	for _, user := range s.users {
		if user.TenantID != tenantID || user.Status != "active" {
			continue
		}
		switch audience {
		case "all", "":
			out = append(out, user.ID)
		case "teachers":
			if user.Role == identity.RoleTeacher {
				out = append(out, user.ID)
			}
		case "guardians":
			if user.Role == identity.RoleGuardian {
				out = append(out, user.ID)
			}
		default:
			if string(user.Role) == audience {
				out = append(out, user.ID)
			}
		}
	}
	return out, nil
}

func (s *Store) ListUserIDsForScheduleNotify(_ context.Context, tenantID string) ([]string, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := make([]string, 0)
	for _, user := range s.users {
		if user.TenantID != tenantID || user.Status != "active" {
			continue
		}
		if user.Role == identity.RoleTeacher || user.Role == identity.RoleGuardian {
			out = append(out, user.ID)
		}
	}
	return out, nil
}

func (s *Store) ListGuidancePlanReminders(_ context.Context, tenantID string, withinDays int) ([]pushdomain.GuidancePlanReminder, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	if withinDays <= 0 {
		withinDays = 3
	}
	now := s.clock()
	limit := now.AddDate(0, 0, withinDays)
	out := make([]pushdomain.GuidancePlanReminder, 0)
	for _, rec := range s.ensureSupportPlans() {
		if rec.Deleted || rec.TenantID != tenantID {
			continue
		}
		if rec.Status != guidancedomain.PlanStatusOpen && rec.Status != guidancedomain.PlanStatusMonitoring {
			continue
		}
		if strings.TrimSpace(rec.DueDate) == "" {
			continue
		}
		due, err := time.Parse("2006-01-02", rec.DueDate)
		if err != nil {
			continue
		}
		if due.Before(now.Truncate(24*time.Hour)) || due.After(limit) {
			continue
		}
		out = append(out, pushdomain.GuidancePlanReminder{
			OwnerID:     rec.OwnerID,
			StudentID:   rec.StudentID,
			StudentName: rec.StudentName,
			PlanID:      rec.ID,
			PlanTitle:   rec.Title,
			DueDate:     rec.DueDate,
		})
	}
	return out, nil
}

func (s *Store) EnsureUserNotification(_ context.Context, tenantID, userID, title, body, kind string) (string, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	for _, item := range s.notifications {
		if item.TenantID == tenantID && item.UserID == userID && item.Kind == kind {
			return "", nil
		}
	}
	id := fmt.Sprintf("notification-%d", len(s.notifications)+1)
	s.notifications = append(s.notifications, memoryNotification{
		ID:        id,
		TenantID:  tenantID,
		UserID:    userID,
		Title:     title,
		Body:      body,
		Kind:      kind,
		CreatedAt: s.clock(),
	})
	return id, nil
}

func (s *Store) RecordDeliveryLog(_ context.Context, entry pushdomain.DeliveryLog) (string, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	id := fmt.Sprintf("push-log-%d", len(s.ensureDeliveryLogs())+1)
	now := s.clock().UTC().Format(time.RFC3339)
	item := pushdomain.DeliveryLog{
		ID:            id,
		TenantID:      entry.TenantID,
		UserID:        entry.UserID,
		DeviceTokenID: entry.DeviceTokenID,
		Category:      entry.Category,
		Title:         entry.Title,
		Status:        entry.Status,
		Provider:      entry.Provider,
		CreatedAt:     now,
	}
	if item.Status == "" {
		item.Status = pushdomain.DeliveryStatusQueued
	}
	if item.Provider == "" {
		item.Provider = "expo"
	}
	s.pushDeliveryLogs = append(s.pushDeliveryLogs, memoryDeliveryLog{DeliveryLog: item})
	return id, nil
}

func (s *Store) UpdateDeliveryLog(_ context.Context, logID, status, receiptID, errorCode, errorMessage string, sentAt *time.Time) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	for index := range s.ensureDeliveryLogs() {
		if s.pushDeliveryLogs[index].ID != logID {
			continue
		}
		s.pushDeliveryLogs[index].Status = status
		s.pushDeliveryLogs[index].ProviderReceiptID = receiptID
		s.pushDeliveryLogs[index].ErrorCode = errorCode
		s.pushDeliveryLogs[index].ErrorMessage = errorMessage
		if sentAt != nil {
			s.pushDeliveryLogs[index].SentAt = sentAt.UTC().Format(time.RFC3339)
		}
		return nil
	}
	return nil
}

func (s *Store) PushHealth(_ context.Context, tenantID string) (pushdomain.PushHealth, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	var health pushdomain.PushHealth
	cutoff := s.clock().Add(-24 * time.Hour)
	for _, item := range s.ensureDeviceTokens() {
		if item.TenantID != tenantID {
			continue
		}
		if item.RevokedAt == "" {
			health.ActiveTokens++
		} else {
			health.RevokedTokens++
		}
	}
	for _, item := range s.ensureDeliveryLogs() {
		if item.TenantID != tenantID {
			continue
		}
		createdAt, err := time.Parse(time.RFC3339, item.CreatedAt)
		if err != nil || createdAt.Before(cutoff) {
			continue
		}
		if item.Status == pushdomain.DeliveryStatusSent {
			health.SentLast24h++
		}
		if item.Status == pushdomain.DeliveryStatusFailed {
			health.FailedLast24h++
		}
	}
	total := health.SentLast24h + health.FailedLast24h
	if total > 0 {
		health.FailureRate24h = float64(health.FailedLast24h) / float64(total)
	}
	return health, nil
}

func (s *Store) ListActiveTenantIDs(_ context.Context) ([]string, error) {
	return []string{s.tenant.ID}, nil
}

func (s *Store) ListDeliveryLogs(_ context.Context, tenantID string, limit int) ([]pushdomain.DeliveryLog, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := make([]pushdomain.DeliveryLog, 0)
	for i := len(s.ensureDeliveryLogs()) - 1; i >= 0; i-- {
		item := s.pushDeliveryLogs[i]
		if tenantID != "" && item.TenantID != tenantID {
			continue
		}
		out = append(out, item.DeliveryLog)
		if limit > 0 && len(out) >= limit {
			break
		}
	}
	return out, nil
}
