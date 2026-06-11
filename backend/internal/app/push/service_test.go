package push

import (
	"context"
	"testing"
	"time"

	attendancedomain "ots/backend/internal/domain/attendance"
	pushdomain "ots/backend/internal/domain/push"
	platformpush "ots/backend/internal/platform/push"
)

type pushTestRepo struct {
	tokens      map[string][]pushdomain.DeviceToken
	prefs       pushdomain.Preferences
	guardianIDs []string
	audienceIDs []string
	logs        int
}

func (r *pushTestRepo) UpsertDeviceToken(_ context.Context, tenantID, userID, token, platform string) (pushdomain.DeviceToken, error) {
	item := pushdomain.DeviceToken{ID: "token-1", TenantID: tenantID, UserID: userID, Token: token, Platform: platform}
	r.tokens[userID] = append(r.tokens[userID], item)
	return item, nil
}
func (r *pushTestRepo) DeleteDeviceToken(context.Context, string, string, string) bool { return true }
func (r *pushTestRepo) RevokeDeviceToken(context.Context, string, string, string) bool  { return true }
func (r *pushTestRepo) ListDeviceTokensForUser(_ context.Context, _, userID string) ([]pushdomain.DeviceToken, error) {
	return r.tokens[userID], nil
}
func (r *pushTestRepo) ListMyDeviceTokens(_ context.Context, _, userID string) ([]pushdomain.DeviceToken, error) {
	return r.tokens[userID], nil
}
func (r *pushTestRepo) MarkDeviceTokenFailure(context.Context, string, string, string) error { return nil }
func (r *pushTestRepo) UpdateNotificationPreferences(_ context.Context, _, _ string, prefs pushdomain.Preferences) (pushdomain.Preferences, error) {
	r.prefs = prefs
	return prefs, nil
}
func (r *pushTestRepo) GetNotificationPreferences(context.Context, string, string) (pushdomain.Preferences, error) {
	return r.prefs, nil
}
func (r *pushTestRepo) ListGuardianUserIDsForStudent(context.Context, string, string) ([]string, error) {
	return r.guardianIDs, nil
}
func (r *pushTestRepo) ListUserIDsByAudience(context.Context, string, string) ([]string, error) {
	return r.audienceIDs, nil
}
func (r *pushTestRepo) ListUserIDsForScheduleNotify(context.Context, string) ([]string, error) { return nil, nil }
func (r *pushTestRepo) ListGuidancePlanReminders(context.Context, string, int) ([]pushdomain.GuidancePlanReminder, error) {
	return nil, nil
}
func (r *pushTestRepo) EnsureUserNotification(context.Context, string, string, string, string, string) (string, error) {
	return "notification-1", nil
}
func (r *pushTestRepo) RecordDeliveryLog(context.Context, pushdomain.DeliveryLog) (string, error) {
	r.logs++
	return "log-1", nil
}
func (r *pushTestRepo) UpdateDeliveryLog(context.Context, string, string, string, string, string, *time.Time) error {
	return nil
}
func (r *pushTestRepo) PushHealth(context.Context, string) (pushdomain.PushHealth, error) {
	return pushdomain.PushHealth{}, nil
}
func (r *pushTestRepo) ListDeliveryLogs(context.Context, string, int) ([]pushdomain.DeliveryLog, error) {
	return nil, nil
}
func (r *pushTestRepo) ListActiveTenantIDs(context.Context) ([]string, error) { return []string{"tenant-1"}, nil }
func (r *pushTestRepo) ListServiceRouteGuardianTargets(context.Context, string, string) ([]pushdomain.TransportRecipient, error) {
	return []pushdomain.TransportRecipient{{UserID: "guardian-1", StudentID: "student-1"}}, nil
}
func (r *pushTestRepo) GetPrincipalAttendancePendingSummary(context.Context, string) (pushdomain.PrincipalAttendancePending, error) {
	return pushdomain.PrincipalAttendancePending{
		TodayLessons:   5,
		FinalizedToday: 2,
		PendingClasses: []string{"5-A", "6-B"},
		DateKey:        "2026-06-08",
	}, nil
}
func (r *pushTestRepo) ListPrincipalNotifyUserIDs(context.Context, string) ([]string, error) {
	return []string{"principal-1"}, nil
}
func (r *pushTestRepo) TenantHasModule(context.Context, string, string) bool { return true }
func (r *pushTestRepo) ListBillingUpcomingReminders(context.Context, string, int) ([]pushdomain.BillingInstallmentReminder, error) {
	return nil, nil
}
func (r *pushTestRepo) ListBillingOverdueReminders(context.Context, string) ([]pushdomain.BillingInstallmentReminder, error) {
	return nil, nil
}
func (r *pushTestRepo) GetBillingOverdueSummary(context.Context, string) (pushdomain.BillingOverdueSummary, error) {
	return pushdomain.BillingOverdueSummary{}, nil
}

type recordingSender struct {
	count int
}

func (s *recordingSender) Send(_ context.Context, tokens []string, _, _ string, _ map[string]string) ([]platformpush.SendResult, error) {
	s.count += len(tokens)
	out := make([]platformpush.SendResult, 0, len(tokens))
	for _, token := range tokens {
		out = append(out, platformpush.SendResult{Token: token, Status: "ok"})
	}
	return out, nil
}

func TestNotifyAttendanceSessionRespectsPreferences(t *testing.T) {
	repo := &pushTestRepo{
		prefs: pushdomain.DefaultPreferences(),
		tokens: map[string][]pushdomain.DeviceToken{
			"guardian-1": {{ID: "token-1", Token: "ExponentPushToken[abc]"}},
		},
		guardianIDs: []string{"guardian-1"},
	}
	sender := &recordingSender{}
	svc := NewService(repo, sender)
	session := attendancedomain.Session{
		ID: "session-1", ClassName: "5-A", SubjectName: "Matematik",
		Records: []attendancedomain.Record{{
			StudentID: "student-1", StudentName: "Ali Veli", Number: "101", Status: attendancedomain.StatusAbsent,
		}},
	}
	svc.NotifyAttendanceSession(context.Background(), "tenant-1", session)
	if sender.count != 1 {
		t.Fatalf("expected one push, got %d", sender.count)
	}
	if repo.logs == 0 {
		t.Fatal("expected delivery log")
	}
}

func TestUpdatePreferences(t *testing.T) {
	repo := &pushTestRepo{prefs: pushdomain.DefaultPreferences()}
	svc := NewService(repo, platformpush.NewNoopSender(nil))
	enabled := false
	prefs, err := svc.UpdatePreferences(context.Background(), "tenant-1", "user-1", pushdomain.UpdatePreferencesInput{Attendance: &enabled})
	if err != nil {
		t.Fatal(err)
	}
	if prefs.Attendance {
		t.Fatal("expected attendance preference disabled")
	}
}

func TestCategoryEnabled(t *testing.T) {
	prefs := pushdomain.Preferences{Guidance: false}
	if CategoryEnabled(prefs, pushdomain.CategoryGuidance) {
		t.Fatal("expected guidance disabled")
	}
}

func TestNotifyPrincipalAttendanceGaps(t *testing.T) {
	repo := &pushTestRepo{
		prefs: pushdomain.DefaultPreferences(),
		tokens: map[string][]pushdomain.DeviceToken{
			"principal-1": {{ID: "token-1", Token: "ExponentPushToken[principal]"}},
		},
	}
	sender := &recordingSender{}
	svc := NewService(repo, sender)
	svc.NotifyPrincipalAttendanceGaps(context.Background(), "tenant-1")
	if sender.count != 1 {
		t.Fatalf("expected one push, got %d", sender.count)
	}
	if repo.logs == 0 {
		t.Fatal("expected delivery log")
	}
}
