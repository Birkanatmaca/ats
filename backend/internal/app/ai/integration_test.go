package ai_test

import (
	"context"
	"strings"
	"testing"
	"time"

	aiapp "ots/backend/internal/app/ai"
	attendanceapp "ots/backend/internal/app/attendance"
	dashboardapp "ots/backend/internal/app/dashboard"
	guardianapp "ots/backend/internal/app/guardian"
	guidanceapp "ots/backend/internal/app/guidance"
	aidomain "ots/backend/internal/domain/ai"
	"ots/backend/internal/domain/identity"
	observationapp "ots/backend/internal/app/observation"
	schedulingapp "ots/backend/internal/app/scheduling"
	schoolapp "ots/backend/internal/app/school"
	superadminapp "ots/backend/internal/app/superadmin"
	"ots/backend/internal/platform/openai"
	"ots/backend/internal/repository/memory"
)

const demoTenantID = "00000000-0000-0000-0000-000000010001"
const demoTeacherUserID = "00000000-0000-0000-0000-000000010112"
const demoGuidanceUserID = "00000000-0000-0000-0000-000000010111"
const demoPrincipalUserID = "00000000-0000-0000-0000-000000010110"
const demoGuardianUserID = "00000000-0000-0000-0000-000000010113"

func newTestService(t *testing.T) (*aiapp.Service, *memory.Store) {
	t.Helper()
	fixed := time.Date(2026, time.May, 25, 10, 0, 0, 0, time.UTC)
	store := memory.NewStore(func() time.Time { return fixed })
	service := aiapp.NewService(aiapp.Dependencies{
		Repo:        store,
		School:      schoolapp.NewService(store),
		Observation: observationapp.NewService(store),
		Guidance:    guidanceapp.NewService(store),
		Dashboard:   dashboardapp.NewService(store),
		Guardian:    guardianapp.NewService(store),
		SuperAdmin:  superadminapp.NewService(store),
		Attendance:  attendanceapp.NewService(store),
		Scheduling:  schedulingapp.NewService(store),
		OpenAI:      openai.NoopClient{},
		Clock:       func() time.Time { return fixed },
		Config:      aiapp.Config{Model: "rule-engine", UseLLM: true, DailyMessageLimit: 200},
	})
	return service, store
}

func TestTeacherObservationFlowWithConfirmation(t *testing.T) {
	service, store := newTestService(t)
	ctx := context.Background()
	principal := identity.Principal{UserID: demoTeacherUserID, TenantID: demoTenantID, Role: identity.RoleTeacher, Name: "Ayşe Kara"}

	conversation, err := service.CreateConversation(ctx, principal, "Test")
	if err != nil {
		t.Fatalf("create conversation: %v", err)
	}

	result, err := service.SendMessage(ctx, principal, conversation.ID, aidomain.SendMessageInput{
		Content: "Defne Yılmaz adlı öğrenciye analiz raporu girmeni istiyorum. Dikkat dağınıklığı var, derste başka şeylerle oynuyor.",
	})
	if err != nil {
		t.Fatalf("send message: %v", err)
	}
	if result.PendingAction == nil {
		t.Fatal("expected pending action")
	}

	message, err := service.ConfirmAction(ctx, principal, result.PendingAction.ID)
	if err != nil {
		t.Fatalf("confirm action: %v", err)
	}
	if !strings.Contains(message.Content, "Gözlem kaydı oluşturuldu") {
		t.Fatalf("unexpected confirm message: %q", message.Content)
	}

	observations := store.ListObservations(ctx, demoTenantID)
	if len(observations) == 0 {
		t.Fatal("expected observation to be created")
	}
}

func TestTeacherObservationRejectsOutOfScopeStudent(t *testing.T) {
	service, _ := newTestService(t)
	ctx := context.Background()
	principal := identity.Principal{UserID: demoTeacherUserID, TenantID: demoTenantID, Role: identity.RoleTeacher, Name: "Ayşe Kara"}
	conversation, err := service.CreateConversation(ctx, principal, "Test")
	if err != nil {
		t.Fatalf("create conversation: %v", err)
	}

	_, err = service.SendMessage(ctx, principal, conversation.ID, aidomain.SendMessageInput{
		Content:             "Can Koç adlı öğrenciye gözlem ekle",
		SelectedCandidateID: "student-6",
	})
	if err != aiapp.ErrForbidden {
		t.Fatalf("expected forbidden, got %v", err)
	}
}

func TestPendingActionRequiresConfirmation(t *testing.T) {
	service, store := newTestService(t)
	ctx := context.Background()
	principal := identity.Principal{UserID: demoTeacherUserID, TenantID: demoTenantID, Role: identity.RoleTeacher, Name: "Ayşe Kara"}
	before := len(store.ListObservations(ctx, demoTenantID))

	conversation, err := service.CreateConversation(ctx, principal, "Test")
	if err != nil {
		t.Fatalf("create conversation: %v", err)
	}

	result, err := service.SendMessage(ctx, principal, conversation.ID, aidomain.SendMessageInput{
		Content: "Defne Yılmaz adlı öğrenciye dikkat gözlemi ekle",
	})
	if err != nil {
		t.Fatalf("send message: %v", err)
	}
	if result.PendingAction == nil {
		t.Fatal("expected pending action")
	}

	after := len(store.ListObservations(ctx, demoTenantID))
	if after != before {
		t.Fatalf("expected observation count unchanged before confirm, before=%d after=%d", before, after)
	}
}

func TestGuidanceNoteFlowWithConfirmation(t *testing.T) {
	service, _ := newTestService(t)
	ctx := context.Background()
	principal := identity.Principal{UserID: demoGuidanceUserID, TenantID: demoTenantID, Role: identity.RoleGuidance, Name: "Selin Ergin"}
	conversation, err := service.CreateConversation(ctx, principal, "Test")
	if err != nil {
		t.Fatalf("create conversation: %v", err)
	}

	result, err := service.SendMessage(ctx, principal, conversation.ID, aidomain.SendMessageInput{
		Content: "Efe Demir adlı öğrenci için rehberlik notu oluştur. Veli görüşmesi yapıldı, takip devam edecek.",
	})
	if err != nil {
		t.Fatalf("send message: %v", err)
	}
	if result.PendingAction == nil {
		t.Fatal("expected pending action")
	}

	message, err := service.ConfirmAction(ctx, principal, result.PendingAction.ID)
	if err != nil {
		t.Fatalf("confirm action: %v", err)
	}
	if !strings.Contains(message.Content, "Rehberlik notu oluşturuldu") {
		t.Fatalf("unexpected confirm message: %q", message.Content)
	}
}

func TestPrincipalDashboardSummary(t *testing.T) {
	service, _ := newTestService(t)
	ctx := context.Background()
	principal := identity.Principal{UserID: demoPrincipalUserID, TenantID: demoTenantID, Role: identity.RolePrincipal, Name: "Cem Arslan"}
	conversation, err := service.CreateConversation(ctx, principal, "Test")
	if err != nil {
		t.Fatalf("create conversation: %v", err)
	}

	result, err := service.SendMessage(ctx, principal, conversation.ID, aidomain.SendMessageInput{
		Content: "Bugünkü okul durumunu özetle",
	})
	if err != nil {
		t.Fatalf("send message: %v", err)
	}
	if !strings.Contains(result.Message.Content, "Okul operasyon özeti") {
		t.Fatalf("expected dashboard summary, got %q", result.Message.Content)
	}
}

func TestGuardianScheduleSummary(t *testing.T) {
	service, _ := newTestService(t)
	ctx := context.Background()
	principal := identity.Principal{UserID: demoGuardianUserID, TenantID: demoTenantID, Role: identity.RoleGuardian, Name: "Merve Demir"}
	conversation, err := service.CreateConversation(ctx, principal, "Test")
	if err != nil {
		t.Fatalf("create conversation: %v", err)
	}

	result, err := service.SendMessage(ctx, principal, conversation.ID, aidomain.SendMessageInput{
		Content: "Çocuğumun bu haftaki programını göster",
	})
	if err != nil {
		t.Fatalf("send message: %v", err)
	}
	if !strings.Contains(result.Message.Content, "Haftalık ders programı") && !strings.Contains(result.Message.Content, "program") {
		t.Fatalf("expected schedule summary, got %q", result.Message.Content)
	}
}

func TestGuardianSupportTicketRequiresConfirmation(t *testing.T) {
	service, _ := newTestService(t)
	ctx := context.Background()
	principal := identity.Principal{UserID: demoGuardianUserID, TenantID: demoTenantID, Role: identity.RoleGuardian, Name: "Merve Demir"}
	conversation, err := service.CreateConversation(ctx, principal, "Test")
	if err != nil {
		t.Fatalf("create conversation: %v", err)
	}

	result, err := service.SendMessage(ctx, principal, conversation.ID, aidomain.SendMessageInput{
		Content: "Devamsızlık kaydı hatalı görünüyor, destek talebi oluştur.",
	})
	if err != nil {
		t.Fatalf("send message: %v", err)
	}
	if result.PendingAction == nil {
		t.Fatal("expected pending action")
	}
}
