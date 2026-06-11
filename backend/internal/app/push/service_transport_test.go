package push

import (
	"context"
	"testing"

	pushdomain "ots/backend/internal/domain/push"
)

func TestNotifyTransportRouteGuardiansRespectsPreferences(t *testing.T) {
	repo := &pushTestRepo{
		prefs: pushdomain.Preferences{Transport: true},
		tokens: map[string][]pushdomain.DeviceToken{
			"guardian-1": {{ID: "token-1", Token: "ExponentPushToken[abc]"}},
		},
	}
	sender := &recordingSender{}
	svc := NewService(repo, sender)
	delivered := svc.NotifyTransportRouteGuardians(
		context.Background(),
		"tenant-1",
		"route-1",
		"Servis başladı",
		"5/A servisi yola çıktı.",
		"transport:trip_started:trip-1",
		"trip-1",
	)
	if delivered != 1 {
		t.Fatalf("expected one delivery, got %d", delivered)
	}
	if sender.count != 1 {
		t.Fatalf("expected one push, got %d", sender.count)
	}
}
