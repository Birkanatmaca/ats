package push

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	attendancedomain "ots/backend/internal/domain/attendance"
	pushdomain "ots/backend/internal/domain/push"
	schooldomain "ots/backend/internal/domain/school"
	superadmindomain "ots/backend/internal/domain/superadmin"
	platformpush "ots/backend/internal/platform/push"
)

var ErrInvalidDeviceToken = errors.New("invalid device token")
var ErrDeviceTokenNotFound = errors.New("device token not found")

type Repository interface {
	UpsertDeviceToken(ctx context.Context, tenantID, userID, token, platform string) (pushdomain.DeviceToken, error)
	DeleteDeviceToken(ctx context.Context, tenantID, userID, token string) bool
	RevokeDeviceToken(ctx context.Context, tenantID, userID, tokenID string) bool
	ListDeviceTokensForUser(ctx context.Context, tenantID, userID string) ([]pushdomain.DeviceToken, error)
	ListMyDeviceTokens(ctx context.Context, tenantID, userID string) ([]pushdomain.DeviceToken, error)
	MarkDeviceTokenFailure(ctx context.Context, tenantID, tokenID, errorMessage string) error
	UpdateNotificationPreferences(ctx context.Context, tenantID, userID string, prefs pushdomain.Preferences) (pushdomain.Preferences, error)
	GetNotificationPreferences(ctx context.Context, tenantID, userID string) (pushdomain.Preferences, error)
	ListGuardianUserIDsForStudent(ctx context.Context, tenantID, studentID string) ([]string, error)
	ListUserIDsByAudience(ctx context.Context, tenantID, audience string) ([]string, error)
	ListUserIDsForScheduleNotify(ctx context.Context, tenantID string) ([]string, error)
	ListGuidancePlanReminders(ctx context.Context, tenantID string, withinDays int) ([]pushdomain.GuidancePlanReminder, error)
	EnsureUserNotification(ctx context.Context, tenantID, userID, title, body, kind string) (string, error)
	RecordDeliveryLog(ctx context.Context, entry pushdomain.DeliveryLog) (string, error)
	UpdateDeliveryLog(ctx context.Context, logID, status, receiptID, errorCode, errorMessage string, sentAt *time.Time) error
	PushHealth(ctx context.Context, tenantID string) (pushdomain.PushHealth, error)
	ListDeliveryLogs(ctx context.Context, tenantID string, limit int) ([]pushdomain.DeliveryLog, error)
	ListActiveTenantIDs(ctx context.Context) ([]string, error)
}

type Service struct {
	repo   Repository
	sender platformpush.Sender
}

func NewService(repo Repository, sender platformpush.Sender) *Service {
	if sender == nil {
		sender = platformpush.NewNoopSender(nil)
	}
	return &Service{repo: repo, sender: sender}
}

func (s *Service) RegisterDeviceToken(ctx context.Context, tenantID, userID string, input pushdomain.RegisterDeviceTokenInput) (pushdomain.DeviceToken, error) {
	token := strings.TrimSpace(input.Token)
	if token == "" {
		return pushdomain.DeviceToken{}, ErrInvalidDeviceToken
	}
	platform := strings.TrimSpace(input.Platform)
	if platform == "" {
		platform = "expo"
	}
	item, err := s.repo.UpsertDeviceToken(ctx, tenantID, userID, token, platform)
	if err != nil {
		return pushdomain.DeviceToken{}, err
	}
	return sanitizeDeviceToken(item), nil
}

func (s *Service) UnregisterDeviceToken(ctx context.Context, tenantID, userID, token string) bool {
	return s.repo.DeleteDeviceToken(ctx, tenantID, userID, strings.TrimSpace(token))
}

func (s *Service) RevokeDeviceToken(ctx context.Context, tenantID, userID, tokenID string) error {
	if !s.repo.RevokeDeviceToken(ctx, tenantID, userID, strings.TrimSpace(tokenID)) {
		return ErrDeviceTokenNotFound
	}
	return nil
}

func (s *Service) MyDeviceTokens(ctx context.Context, tenantID, userID string) ([]pushdomain.DeviceToken, error) {
	items, err := s.repo.ListMyDeviceTokens(ctx, tenantID, userID)
	if err != nil {
		return nil, err
	}
	out := make([]pushdomain.DeviceToken, 0, len(items))
	for _, item := range items {
		out = append(out, sanitizeDeviceToken(item))
	}
	return out, nil
}

func (s *Service) Preferences(ctx context.Context, tenantID, userID string) (pushdomain.Preferences, error) {
	return s.repo.GetNotificationPreferences(ctx, tenantID, userID)
}

func (s *Service) UpdatePreferences(ctx context.Context, tenantID, userID string, input pushdomain.UpdatePreferencesInput) (pushdomain.Preferences, error) {
	current, err := s.repo.GetNotificationPreferences(ctx, tenantID, userID)
	if err != nil {
		current = pushdomain.DefaultPreferences()
	}
	current = mergePreferences(current, input)
	return s.repo.UpdateNotificationPreferences(ctx, tenantID, userID, current)
}

func (s *Service) SendTest(ctx context.Context, tenantID, userID, title, body string) error {
	if strings.TrimSpace(title) == "" {
		title = "OGTAŞIS test bildirimi"
	}
	if strings.TrimSpace(body) == "" {
		body = "Push altyapısı çalışıyor."
	}
	s.sendToUser(ctx, tenantID, userID, pushdomain.CategoryAnnouncements, title, body, "push.test:"+userID, map[string]string{
		"category": pushdomain.CategoryAnnouncements,
		"test":     "true",
	})
	return nil
}

func (s *Service) Health(ctx context.Context, tenantID string) (pushdomain.PushHealth, error) {
	return s.repo.PushHealth(ctx, tenantID)
}

func (s *Service) DeliveryLogs(ctx context.Context, tenantID string, limit int) ([]pushdomain.DeliveryLog, error) {
	if limit <= 0 || limit > 200 {
		limit = 50
	}
	return s.repo.ListDeliveryLogs(ctx, tenantID, limit)
}

func (s *Service) NotifyAttendanceSession(ctx context.Context, tenantID string, session attendancedomain.Session) {
	for _, record := range session.Records {
		if record.Status != attendancedomain.StatusAbsent && record.Status != attendancedomain.StatusLate {
			continue
		}
		guardianUserIDs, err := s.repo.ListGuardianUserIDsForStudent(ctx, tenantID, record.StudentID)
		if err != nil || len(guardianUserIDs) == 0 {
			continue
		}
		statusLabel := "gelmedi"
		if record.Status == attendancedomain.StatusLate {
			statusLabel = "geç kaldı"
		}
		title := "Devamsızlık bildirimi"
		body := fmt.Sprintf(
			"%s (%s) öğrencisi %s sınıfında %s dersinde %s.",
			record.StudentName,
			record.Number,
			session.ClassName,
			session.SubjectName,
			statusLabel,
		)
		kind := fmt.Sprintf("attendance_absence:%s:%s", session.ID, record.StudentID)
		for _, userID := range guardianUserIDs {
			s.sendToUser(ctx, tenantID, userID, pushdomain.CategoryAttendance, title, body, kind, map[string]string{
				"category":  pushdomain.CategoryAttendance,
				"sessionId": session.ID,
				"studentId": record.StudentID,
			})
		}
	}
}

func (s *Service) NotifyAnnouncementToUsers(ctx context.Context, tenantID, announcementID, title, body string, userIDs []string) {
	title = strings.TrimSpace(title)
	body = strings.TrimSpace(body)
	if title == "" {
		title = "Yeni duyuru"
	}
	if len(body) > 180 {
		body = body[:177] + "..."
	}
	for _, userID := range userIDs {
		kind := fmt.Sprintf("announcement:%s:%s", announcementID, userID)
		s.sendToUser(ctx, tenantID, userID, pushdomain.CategoryAnnouncements, title, body, kind, map[string]string{
			"category":       pushdomain.CategoryAnnouncements,
			"announcementId": announcementID,
		})
	}
}

func (s *Service) NotifyAnnouncement(ctx context.Context, tenantID string, announcement schooldomain.Announcement) {
	userIDs, err := s.repo.ListUserIDsByAudience(ctx, tenantID, announcement.Audience)
	if err != nil || len(userIDs) == 0 {
		return
	}
	title := strings.TrimSpace(announcement.Title)
	body := strings.TrimSpace(announcement.Body)
	if title == "" {
		title = "Yeni duyuru"
	}
	if len(body) > 180 {
		body = body[:177] + "..."
	}
	for _, userID := range userIDs {
		kind := fmt.Sprintf("announcement:%s:%s", announcement.ID, userID)
		s.sendToUser(ctx, tenantID, userID, pushdomain.CategoryAnnouncements, title, body, kind, map[string]string{
			"category":       pushdomain.CategoryAnnouncements,
			"announcementId": announcement.ID,
		})
	}
}

func (s *Service) NotifySupportTicketUpdate(ctx context.Context, ticket superadmindomain.SupportTicket) {
	if strings.TrimSpace(ticket.ReporterID) == "" {
		return
	}
	title := "Destek talebi güncellendi"
	body := fmt.Sprintf("%s — durum: %s", ticket.Subject, ticket.Status)
	kind := fmt.Sprintf("support_ticket:%s", ticket.ID)
	s.sendToUser(ctx, ticket.TenantID, ticket.ReporterID, pushdomain.CategorySupport, title, body, kind, map[string]string{
		"category": pushdomain.CategorySupport,
		"ticketId": ticket.ID,
		"status":   string(ticket.Status),
	})
}

func (s *Service) NotifySchedulePublished(ctx context.Context, tenantID string) {
	userIDs, err := s.repo.ListUserIDsForScheduleNotify(ctx, tenantID)
	if err != nil || len(userIDs) == 0 {
		return
	}
	title := "Ders programı güncellendi"
	body := "Okul ders programında yeni bir yayın var. Programınızı kontrol edin."
	kind := fmt.Sprintf("schedule_publish:%s:%d", tenantID, time.Now().Unix())
	for _, userID := range userIDs {
		s.sendToUser(ctx, tenantID, userID, pushdomain.CategorySchedule, title, body, kind+":"+userID, map[string]string{
			"category": pushdomain.CategorySchedule,
		})
	}
}

func (s *Service) NotifyGuidancePlanReminders(ctx context.Context, tenantID string) {
	reminders, err := s.repo.ListGuidancePlanReminders(ctx, tenantID, 3)
	if err != nil || len(reminders) == 0 {
		return
	}
	for _, item := range reminders {
		title := "Takip planı hatırlatması"
		body := fmt.Sprintf("%s için \"%s\" planının son tarihi %s.", item.StudentName, item.PlanTitle, item.DueDate)
		kind := fmt.Sprintf("guidance_plan:%s:%s", item.PlanID, item.OwnerID)
		s.sendToUser(ctx, tenantID, item.OwnerID, pushdomain.CategoryGuidance, title, body, kind, map[string]string{
			"category":  pushdomain.CategoryGuidance,
			"planId":    item.PlanID,
			"studentId": item.StudentID,
		})
	}
}

func (s *Service) RunGuidanceRemindersAllTenants(ctx context.Context) {
	tenantIDs, _ := s.repo.ListActiveTenantIDs(ctx)
	for _, tenantID := range tenantIDs {
		s.NotifyGuidancePlanReminders(ctx, tenantID)
	}
}

func (s *Service) sendToUser(ctx context.Context, tenantID, userID, category, title, body, kind string, data map[string]string) {
	prefs, err := s.repo.GetNotificationPreferences(ctx, tenantID, userID)
	if err != nil {
		prefs = pushdomain.DefaultPreferences()
	}
	if !categoryEnabled(prefs, category) {
		s.recordDropped(ctx, tenantID, userID, category, title, "preference_disabled")
		return
	}

	if kind != "" {
		_, _ = s.repo.EnsureUserNotification(ctx, tenantID, userID, title, body, kind)
	}

	tokens, err := s.repo.ListDeviceTokensForUser(ctx, tenantID, userID)
	if err != nil || len(tokens) == 0 {
		s.recordDropped(ctx, tenantID, userID, category, title, "no_active_tokens")
		return
	}

	tokenByValue := map[string]pushdomain.DeviceToken{}
	pushTokens := make([]string, 0, len(tokens))
	for _, item := range tokens {
		if item.RevokedAt != "" || strings.TrimSpace(item.Token) == "" {
			continue
		}
		tokenByValue[item.Token] = item
		pushTokens = append(pushTokens, item.Token)
	}
	if len(pushTokens) == 0 {
		s.recordDropped(ctx, tenantID, userID, category, title, "no_active_tokens")
		return
	}

	results, sendErr := s.sender.Send(ctx, pushTokens, title, body, data)
	if sendErr != nil {
		for _, token := range pushTokens {
			item := tokenByValue[token]
			logID, _ := s.repo.RecordDeliveryLog(ctx, pushdomain.DeliveryLog{
				TenantID:      tenantID,
				UserID:        userID,
				DeviceTokenID: item.ID,
				Category:      category,
				Title:         title,
				Status:        pushdomain.DeliveryStatusFailed,
				Provider:      "expo",
				ErrorCode:     "provider_error",
				ErrorMessage:  sendErr.Error(),
			})
			now := time.Now().UTC()
			_ = s.repo.UpdateDeliveryLog(ctx, logID, pushdomain.DeliveryStatusFailed, "", "provider_error", sendErr.Error(), &now)
		}
		return
	}

	now := time.Now().UTC()
	for _, result := range results {
		item := tokenByValue[result.Token]
		status := pushdomain.DeliveryStatusSent
		errorCode := ""
		errorMessage := result.Error
		if result.Status != "ok" {
			status = pushdomain.DeliveryStatusFailed
			errorCode = "expo_ticket_error"
			if platformpush.IsInvalidTokenError(result.Error) {
				errorCode = "invalid_token"
				_ = s.repo.RevokeDeviceToken(ctx, tenantID, userID, item.ID)
			} else {
				_ = s.repo.MarkDeviceTokenFailure(ctx, tenantID, item.ID, result.Error)
			}
		}
		logID, _ := s.repo.RecordDeliveryLog(ctx, pushdomain.DeliveryLog{
			TenantID:      tenantID,
			UserID:        userID,
			DeviceTokenID: item.ID,
			Category:      category,
			Title:         title,
			Status:        pushdomain.DeliveryStatusQueued,
			Provider:      "expo",
		})
		sentAt := now
		_ = s.repo.UpdateDeliveryLog(ctx, logID, status, result.TicketID, errorCode, errorMessage, &sentAt)
	}
}

func (s *Service) recordDropped(ctx context.Context, tenantID, userID, category, title, reason string) {
	logID, _ := s.repo.RecordDeliveryLog(ctx, pushdomain.DeliveryLog{
		TenantID: tenantID,
		UserID:   userID,
		Category: category,
		Title:    title,
		Status:   pushdomain.DeliveryStatusDropped,
		Provider: "expo",
	})
	now := time.Now().UTC()
	_ = s.repo.UpdateDeliveryLog(ctx, logID, pushdomain.DeliveryStatusDropped, "", reason, reason, &now)
}

func mergePreferences(current pushdomain.Preferences, input pushdomain.UpdatePreferencesInput) pushdomain.Preferences {
	if input.Attendance != nil {
		current.Attendance = *input.Attendance
	}
	if input.Announcements != nil {
		current.Announcements = *input.Announcements
	}
	if input.Support != nil {
		current.Support = *input.Support
	}
	if input.Guidance != nil {
		current.Guidance = *input.Guidance
	}
	if input.Schedule != nil {
		current.Schedule = *input.Schedule
	}
	return current
}

func categoryEnabled(prefs pushdomain.Preferences, category string) bool {
	switch category {
	case pushdomain.CategoryAttendance:
		return prefs.Attendance
	case pushdomain.CategoryAnnouncements:
		return prefs.Announcements
	case pushdomain.CategorySupport:
		return prefs.Support
	case pushdomain.CategoryGuidance:
		return prefs.Guidance
	case pushdomain.CategorySchedule:
		return prefs.Schedule
	default:
		return true
	}
}

func sanitizeDeviceToken(item pushdomain.DeviceToken) pushdomain.DeviceToken {
	item.TokenPreview = pushdomain.MaskToken(item.Token)
	item.Token = ""
	item.Preferences = pushdomain.Preferences{}
	return item
}

func MergePreferences(current pushdomain.Preferences, input pushdomain.UpdatePreferencesInput) pushdomain.Preferences {
	return mergePreferences(current, input)
}

func CategoryEnabled(prefs pushdomain.Preferences, category string) bool {
	return categoryEnabled(prefs, category)
}
