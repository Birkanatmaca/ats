package memory

import (
	"context"
	"fmt"
	"strings"
	"time"

	billingdomain "ots/backend/internal/domain/billing"
	guidancedomain "ots/backend/internal/domain/guidance"
	"ots/backend/internal/domain/identity"
	pushdomain "ots/backend/internal/domain/push"
	transportdomain "ots/backend/internal/domain/transport"
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
		SourceKind:    entry.SourceKind,
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

func (s *Store) ListServiceRouteGuardianTargets(_ context.Context, tenantID, routeID string) ([]pushdomain.TransportRecipient, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	if tenantID != s.tenant.ID {
		return nil, nil
	}
	seen := map[string]struct{}{}
	out := make([]pushdomain.TransportRecipient, 0)
	for _, assignment := range s.serviceAssignments {
		if assignment.RouteID != routeID || assignment.Status != transportdomain.StatusActive {
			continue
		}
		for _, link := range s.studentGuardians {
			if link.StudentID != assignment.StudentID {
				continue
			}
			key := link.GuardianUserID + ":" + assignment.StudentID
			if _, ok := seen[key]; ok {
				continue
			}
			seen[key] = struct{}{}
			out = append(out, pushdomain.TransportRecipient{
				UserID:    link.GuardianUserID,
				StudentID: assignment.StudentID,
			})
		}
	}
	return out, nil
}

func (s *Store) GetPrincipalAttendancePendingSummary(_ context.Context, tenantID string) (pushdomain.PrincipalAttendancePending, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	if tenantID != s.tenant.ID {
		return pushdomain.PrincipalAttendancePending{}, nil
	}
	now := s.clock()
	todayWeekday := isoWeekdayMemory(now)
	dayStart := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())
	dayEnd := dayStart.Add(24 * time.Hour)

	todayLessons := 0
	if string(s.schedule.Status) == "published" {
		for _, lesson := range s.schedule.Lessons {
			if lesson.DayOfWeek == todayWeekday {
				todayLessons++
			}
		}
	}
	finalizedLessonIDs := map[string]struct{}{}
	for _, session := range s.sessions {
		if session.FinalizedAt == nil || session.StartedAt.Before(dayStart) || !session.StartedAt.Before(dayEnd) {
			continue
		}
		if session.LessonID != "" {
			finalizedLessonIDs[session.LessonID] = struct{}{}
		}
	}
	pendingClasses := make([]string, 0)
	for _, class := range s.classes {
		total := 0
		completed := 0
		for _, lesson := range s.schedule.Lessons {
			if lesson.ClassID != class.ID || lesson.DayOfWeek != todayWeekday {
				continue
			}
			total++
			if _, ok := finalizedLessonIDs[lesson.ID]; ok {
				completed++
			}
		}
		if total > 0 && completed < total {
			pendingClasses = append(pendingClasses, class.Name)
		}
	}
	return pushdomain.PrincipalAttendancePending{
		TodayLessons:   todayLessons,
		FinalizedToday: len(finalizedLessonIDs),
		PendingClasses: pendingClasses,
		DateKey:        now.Format("2006-01-02"),
	}, nil
}

func (s *Store) ListBillingUpcomingReminders(_ context.Context, tenantID string, withinDays int) ([]pushdomain.BillingInstallmentReminder, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	if withinDays <= 0 {
		withinDays = 3
	}
	now := s.clock()
	limit := now.AddDate(0, 0, withinDays)
	out := make([]pushdomain.BillingInstallmentReminder, 0)
	for _, item := range s.paymentInstallments {
		if item.TenantID != tenantID || item.RemainingAmount <= 0 || item.Status == billingdomain.InstallmentCancelled || item.Status == billingdomain.InstallmentPaid {
			continue
		}
		due, err := time.Parse("2006-01-02", item.DueDate)
		if err != nil || due.Before(now) || due.After(limit) {
			continue
		}
		userID := s.billingGuardianUserIDLocked(item.BillingAccountID)
		if userID == "" {
			continue
		}
		out = append(out, pushdomain.BillingInstallmentReminder{
			InstallmentID: item.ID,
			StudentID:     item.StudentID,
			StudentName:   item.StudentName,
			PlanName:      item.PlanName,
			DueDate:       item.DueDate,
			UserID:        userID,
		})
	}
	return out, nil
}

func (s *Store) ListBillingOverdueReminders(_ context.Context, tenantID string) ([]pushdomain.BillingInstallmentReminder, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	now := s.clock()
	out := make([]pushdomain.BillingInstallmentReminder, 0)
	for _, item := range s.paymentInstallments {
		if item.TenantID != tenantID || item.RemainingAmount <= 0 || item.Status == billingdomain.InstallmentCancelled || item.Status == billingdomain.InstallmentPaid {
			continue
		}
		if !memoryDueBeforeToday(item.DueDate, now) {
			continue
		}
		userID := s.billingGuardianUserIDLocked(item.BillingAccountID)
		if userID == "" {
			continue
		}
		out = append(out, pushdomain.BillingInstallmentReminder{
			InstallmentID: item.ID,
			StudentID:     item.StudentID,
			StudentName:   item.StudentName,
			PlanName:      item.PlanName,
			DueDate:       item.DueDate,
			UserID:        userID,
		})
	}
	return out, nil
}

func (s *Store) GetBillingOverdueSummary(_ context.Context, tenantID string) (pushdomain.BillingOverdueSummary, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	summary := pushdomain.BillingOverdueSummary{DateKey: s.clock().Format("2006-01-02")}
	now := s.clock()
	for _, item := range s.paymentInstallments {
		if item.TenantID != tenantID || item.RemainingAmount <= 0 || !memoryDueBeforeToday(item.DueDate, now) {
			continue
		}
		summary.Count++
		summary.Amount += item.RemainingAmount
	}
	return summary, nil
}

func (s *Store) billingGuardianUserIDLocked(accountID string) string {
	account, ok := s.billingAccountByIDLocked(accountID)
	if !ok {
		return ""
	}
	return strings.TrimSpace(account.GuardianUserID)
}

func (s *Store) ListPrincipalNotifyUserIDs(_ context.Context, tenantID string) ([]string, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := make([]string, 0)
	seen := map[string]struct{}{}
	for _, user := range s.users {
		if user.TenantID != tenantID || user.Status != "active" {
			continue
		}
		if user.Role != identity.RolePrincipal && user.Role != identity.RoleSystemAdmin {
			continue
		}
		if _, ok := seen[user.ID]; ok {
			continue
		}
		seen[user.ID] = struct{}{}
		out = append(out, user.ID)
	}
	return out, nil
}
