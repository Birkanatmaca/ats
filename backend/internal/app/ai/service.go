package ai

import (
	"context"
	"encoding/json"
	"strings"
	"time"

	aidomain "ots/backend/internal/domain/ai"
	"ots/backend/internal/domain/identity"
	observationdomain "ots/backend/internal/domain/observation"
	observationapp "ots/backend/internal/app/observation"
	attendanceapp "ots/backend/internal/app/attendance"
	dashboardapp "ots/backend/internal/app/dashboard"
	guardianapp "ots/backend/internal/app/guardian"
	guidanceapp "ots/backend/internal/app/guidance"
	guidancedomain "ots/backend/internal/domain/guidance"
	schedulingapp "ots/backend/internal/app/scheduling"
	schoolapp "ots/backend/internal/app/school"
	schooldomain "ots/backend/internal/domain/school"
	superadminapp "ots/backend/internal/app/superadmin"
	superadmindomain "ots/backend/internal/domain/superadmin"
	"ots/backend/internal/platform/openai"
)

type Repository interface {
	CreateConversation(ctx context.Context, tenantID, userID, role, title string) (aidomain.Conversation, error)
	ListConversations(ctx context.Context, tenantID, userID string) ([]aidomain.Conversation, error)
	GetConversation(ctx context.Context, tenantID, userID, conversationID string) (aidomain.Conversation, bool, error)
	TouchConversation(ctx context.Context, tenantID, conversationID string) error

	CreateMessage(ctx context.Context, tenantID, conversationID, userID, role, content, model string, tokenInput, tokenOutput int) (aidomain.Message, error)
	ListMessages(ctx context.Context, tenantID, conversationID string) ([]aidomain.Message, error)

	CreatePendingAction(ctx context.Context, tenantID, userID, conversationID string, actionType aidomain.ActionType, risk aidomain.RiskLevel, payload []byte, payloadHash, confirmationText string, expiresAt time.Time) (aidomain.PendingAction, error)
	GetPendingAction(ctx context.Context, tenantID, userID, actionID string) (aidomain.PendingAction, bool, error)
	GetLatestPendingAction(ctx context.Context, tenantID, userID, conversationID string) (aidomain.PendingAction, bool, error)
	UpdatePendingActionStatus(ctx context.Context, tenantID, userID, actionID string, status aidomain.PendingActionStatus, at time.Time) (aidomain.PendingAction, bool, error)

	RecordToolCall(ctx context.Context, tenantID, conversationID, messageID, toolName string, arguments, resultSummary json.RawMessage) error
	RecordAudit(ctx context.Context, tenantID, actorUserID, action, resourceType, resourceID string, metadata json.RawMessage) error
	GetAIProviderKey(ctx context.Context) (string, error)
	UpdateAIProviderKey(ctx context.Context, key string) error
	ListAIProviderKeys(ctx context.Context) ([]aidomain.ProviderKey, error)
	SaveAIProviderKeys(ctx context.Context, keys []aidomain.ProviderKey) error
	GetAIProviderSettings(ctx context.Context) (aidomain.ProviderSettings, error)
	UpdateAIProviderSettings(ctx context.Context, input aidomain.ProviderSettings) (aidomain.ProviderSettings, error)
	CountUserMessagesSince(ctx context.Context, tenantID, userID string, since time.Time) (int, error)
	PurgeExpiredAIRecords(ctx context.Context, tenantID string, before, now time.Time) (aidomain.RetentionResult, error)
	ListAITenantIDs(ctx context.Context) ([]string, error)
	GetAICostSettings(ctx context.Context) (aidomain.CostSettings, error)
	UpdateAICostSettings(ctx context.Context, input aidomain.CostSettings) (aidomain.CostSettings, error)
	GetAIPlatformAnalytics(ctx context.Context, since time.Time) (aidomain.PlatformAnalytics, error)
	GetTenantAIQuota(ctx context.Context, tenantID string) (aidomain.TenantQuota, error)
	UpdateTenantAIQuota(ctx context.Context, tenantID string, quota aidomain.TenantQuota) (aidomain.TenantQuota, error)
	CountTenantUserMessagesSince(ctx context.Context, tenantID string, since time.Time) (int, error)
	SumTenantTokensSince(ctx context.Context, tenantID string, since time.Time) (int, int, error)
}

type Config struct {
	Model              string
	StoreResponse      bool
	DailyMessageLimit  int
	RetentionDays      int
	UseLLM             bool
}

type Dependencies struct {
	Repo        Repository
	School      *schoolapp.Service
	Observation *observationapp.Service
	Guidance    *guidanceapp.Service
	Dashboard   *dashboardapp.Service
	Guardian    *guardianapp.Service
	SuperAdmin  *superadminapp.Service
	Attendance  *attendanceapp.Service
	Scheduling  *schedulingapp.Service
	OpenAI      openai.Client
	EnvOpenAIKey string
	Clock       func() time.Time
	Config      Config
}

type Service struct {
	repo         Repository
	school       *schoolapp.Service
	observation  *observationapp.Service
	guidance     *guidanceapp.Service
	dashboard    *dashboardapp.Service
	guardian     *guardianapp.Service
	superAdmin   *superadminapp.Service
	attendance   *attendanceapp.Service
	scheduling   *schedulingapp.Service
	openai       openai.Client
	envOpenAIKey string
	clock        func() time.Time
	cfg          Config
}

func NewService(deps Dependencies) *Service {
	clock := deps.Clock
	if clock == nil {
		clock = time.Now
	}
	client := deps.OpenAI
	if client == nil {
		client = openai.NoopClient{}
	}
	return &Service{
		repo:         deps.Repo,
		school:       deps.School,
		observation:  deps.Observation,
		guidance:     deps.Guidance,
		dashboard:    deps.Dashboard,
		guardian:     deps.Guardian,
		superAdmin:   deps.SuperAdmin,
		attendance:   deps.Attendance,
		scheduling:   deps.Scheduling,
		openai:       client,
		envOpenAIKey: strings.TrimSpace(deps.EnvOpenAIKey),
		clock:        clock,
		cfg:          deps.Config,
	}
}

func (s *Service) Capabilities(role identity.Role) aidomain.CapabilitiesResult {
	result := aidomain.CapabilitiesResult{Role: string(role)}
	switch role {
	case identity.RoleTeacher:
		result.Capabilities = []aidomain.Capability{
			{Key: "search_students", Label: "Öğrenci arama", Description: "Yetkili öğrencilerinizi arayın."},
			{Key: "create_observation", Label: "Gözlem kaydı", Description: "Onaylı gözlem kaydı oluşturun."},
		}
		result.Suggestions = []string{
			"Bugünkü derslerimi özetle",
			"Yoklama için aktif dersimi bul",
			"Öğrenci gözlemi ekle",
		}
	case identity.RoleGuidance:
		result.Capabilities = []aidomain.Capability{
			{Key: "search_students", Label: "Öğrenci arama", Description: "Yetkili öğrencileri arayın."},
			{Key: "create_guidance_note", Label: "Rehberlik notu", Description: "Onaylı rehberlik notu oluşturun."},
			{Key: "create_support_plan", Label: "Destek planı", Description: "Onaylı destek planı oluşturun."},
		}
		result.Suggestions = []string{
			"Bugünkü risk sinyallerini özetle",
			"Bir öğrenci için rehberlik notu oluştur",
			"Destek planı taslağı hazırla",
		}
	case identity.RolePrincipal, identity.RoleSystemAdmin:
		result.Capabilities = []aidomain.Capability{
			{Key: "dashboard_summary", Label: "Dashboard özeti", Description: "Okul operasyon özetlerini sorun."},
			{Key: "draft_announcement", Label: "Duyuru taslağı", Description: "Onaylı duyuru oluşturun."},
		}
		result.Suggestions = []string{
			"Bugünkü alınmamış yoklamaları göster",
			"Duyuru taslağı hazırla",
			"Program üretimi için eksikleri kontrol et",
		}
	case identity.RoleGuardian:
		result.Capabilities = []aidomain.Capability{
			{Key: "child_schedule", Label: "Ders programı", Description: "Çocuğunuzun programını sorun."},
			{Key: "child_attendance", Label: "Devamsızlık", Description: "Devamsızlık özetini alın."},
			{Key: "create_support_ticket", Label: "Destek talebi", Description: "Onaylı destek talebi oluşturun."},
		}
		result.Suggestions = []string{
			"Çocuğumun bu haftaki programını göster",
			"Devamsızlık özetini açıkla",
			"Destek talebi oluştur",
		}
	default:
		result.Capabilities = []aidomain.Capability{}
	}
	return result
}

func (s *Service) CreateConversation(ctx context.Context, principal identity.Principal, title string) (aidomain.Conversation, error) {
	title = strings.TrimSpace(title)
	if title == "" {
		title = "ogta.ai"
	}
	return s.repo.CreateConversation(ctx, principal.TenantID, principal.UserID, string(principal.Role), title)
}

func (s *Service) ListConversations(ctx context.Context, principal identity.Principal) ([]aidomain.Conversation, error) {
	return s.repo.ListConversations(ctx, principal.TenantID, principal.UserID)
}

func (s *Service) GetConversation(ctx context.Context, principal identity.Principal, conversationID string) (aidomain.Conversation, error) {
	conversation, ok, err := s.repo.GetConversation(ctx, principal.TenantID, principal.UserID, conversationID)
	if err != nil {
		return aidomain.Conversation{}, err
	}
	if !ok {
		return aidomain.Conversation{}, ErrConversationNotFound
	}
	return conversation, nil
}

func (s *Service) SendMessage(ctx context.Context, principal identity.Principal, conversationID string, input aidomain.SendMessageInput) (aidomain.SendMessageResult, error) {
	content := strings.TrimSpace(input.Content)
	if content == "" && strings.TrimSpace(input.SelectedCandidateID) == "" {
		return aidomain.SendMessageResult{}, ErrInvalidMessage
	}

	conversation, err := s.GetConversation(ctx, principal, conversationID)
	if err != nil {
		return aidomain.SendMessageResult{}, err
	}

	if content != "" {
		if blocked, reason := detectPromptInjection(content); blocked {
			saved, saveErr := s.saveMessage(ctx, principal.TenantID, conversationID, principal.UserID, "user", sanitizeUserFacingContent(content), "")
			if saveErr != nil {
				return aidomain.SendMessageResult{}, saveErr
			}
			_ = saved
			reply, saveErr := s.saveMessage(ctx, principal.TenantID, conversationID, "", "assistant", reason, "security")
			if saveErr != nil {
				return aidomain.SendMessageResult{}, saveErr
			}
			_ = s.repo.RecordAudit(ctx, principal.TenantID, principal.UserID, "ai.prompt.blocked", "ai_message", reply.ID, mustJSON(map[string]string{"reason": "prompt_injection"}))
			return aidomain.SendMessageResult{Message: reply}, nil
		}
		if err := s.CheckDailyLimit(ctx, principal.TenantID, principal.UserID); err != nil {
			return aidomain.SendMessageResult{}, err
		}
		if _, err := s.saveMessage(ctx, principal.TenantID, conversationID, principal.UserID, "user", content, ""); err != nil {
			return aidomain.SendMessageResult{}, err
		}
	}

	result, model, tokenInput, tokenOutput, err := s.orchestrateMessage(ctx, principal, conversation, input)
	if err != nil {
		return aidomain.SendMessageResult{}, err
	}

	saved, err := s.saveMessageWithUsage(ctx, principal.TenantID, conversationID, "", result.Message.Role, result.Message.Content, model, tokenInput, tokenOutput)
	if err != nil {
		return aidomain.SendMessageResult{}, err
	}
	result.Message = saved
	_ = s.repo.TouchConversation(ctx, principal.TenantID, conversationID)
	return result, nil
}

func (s *Service) saveMessageWithUsage(ctx context.Context, tenantID, conversationID, userID, role, content, model string, tokenInput, tokenOutput int) (aidomain.Message, error) {
	if tokenInput == 0 && tokenOutput == 0 {
		tokenInput, tokenOutput = messageTokenUsage(role, content)
	}
	return s.repo.CreateMessage(ctx, tenantID, conversationID, userID, role, content, model, tokenInput, tokenOutput)
}

func (s *Service) saveMessage(ctx context.Context, tenantID, conversationID, userID, role, content, model string) (aidomain.Message, error) {
	return s.saveMessageWithUsage(ctx, tenantID, conversationID, userID, role, content, model, 0, 0)
}

func (s *Service) GetPendingAction(ctx context.Context, principal identity.Principal, actionID string) (aidomain.PendingAction, error) {
	action, ok, err := s.repo.GetPendingAction(ctx, principal.TenantID, principal.UserID, actionID)
	if err != nil {
		return aidomain.PendingAction{}, err
	}
	if !ok {
		return aidomain.PendingAction{}, ErrActionNotFound
	}
	return action, nil
}

func (s *Service) ConfirmAction(ctx context.Context, principal identity.Principal, actionID string) (aidomain.Message, error) {
	action, err := s.GetPendingAction(ctx, principal, actionID)
	if err != nil {
		return aidomain.Message{}, err
	}
	if action.Status != aidomain.PendingActionPending {
		return aidomain.Message{}, ErrActionNotPending
	}
	if s.clock().After(action.ExpiresAt) {
		_, _, _ = s.repo.UpdatePendingActionStatus(ctx, principal.TenantID, principal.UserID, actionID, aidomain.PendingActionExpired, s.clock())
		return aidomain.Message{}, ErrActionExpired
	}

	var reply string
	switch action.ActionType {
	case aidomain.ActionCreateObservation:
		reply, err = s.confirmCreateObservation(ctx, principal, action)
	case aidomain.ActionCreateGuidanceNote:
		reply, err = s.confirmCreateGuidanceNote(ctx, principal, action)
	case aidomain.ActionCreateSupportPlan:
		reply, err = s.confirmCreateSupportPlan(ctx, principal, action)
	case aidomain.ActionCreateAnnouncement:
		reply, err = s.confirmCreateAnnouncement(ctx, principal, action)
	case aidomain.ActionCreateSupportTicket:
		reply, err = s.confirmCreateSupportTicket(ctx, principal, action)
	default:
		return aidomain.Message{}, ErrForbidden
	}
	if err != nil {
		return aidomain.Message{}, err
	}

	updated, ok, err := s.repo.UpdatePendingActionStatus(ctx, principal.TenantID, principal.UserID, actionID, aidomain.PendingActionConfirmed, s.clock())
	if err != nil {
		return aidomain.Message{}, err
	}
	if !ok {
		return aidomain.Message{}, ErrActionNotFound
	}
	_ = updated

	return s.saveMessage(ctx, principal.TenantID, action.ConversationID, "", "assistant", reply, "system")
}

func (s *Service) confirmCreateObservation(ctx context.Context, principal identity.Principal, action aidomain.PendingAction) (string, error) {
	if principal.Role != identity.RoleTeacher && principal.Role != identity.RoleGuidance {
		return "", ErrForbidden
	}

	var payload aidomain.CreateObservationPayload
	if err := json.Unmarshal(action.Payload, &payload); err != nil {
		return "", ErrInvalidMessage
	}
	if err := validatePayloadHash(action.Payload, action.PayloadHash); err != nil {
		return "", err
	}

	switch principal.Role {
	case identity.RoleTeacher:
		if !s.observation.TeacherCanObserveStudent(ctx, principal.TenantID, principal.UserID, payload.StudentID) {
			return "", ErrForbidden
		}
	case identity.RoleGuidance:
		if s.guidance == nil || !s.guidance.CanAccessStudent(ctx, principal.TenantID, principal.UserID, payload.StudentID) {
			return "", ErrForbidden
		}
	}

	created, err := s.observation.Create(ctx, principal.TenantID, principal.UserID, observationdomain.CreateInput{
		StudentID: payload.StudentID,
		Category:  observationdomain.Category(payload.Category),
		Note:      payload.Note,
	})
	if err != nil {
		return "", err
	}

	_ = s.repo.RecordToolCall(ctx, principal.TenantID, action.ConversationID, "", "create_observation", action.Payload, mustJSON(map[string]string{
		"observationId": created.ID,
		"studentId":     created.StudentID,
	}))
	_ = s.repo.RecordAudit(ctx, principal.TenantID, principal.UserID, "ai.action.confirm", "student_observation", created.ID, mustJSON(map[string]string{
		"actionType": string(action.ActionType),
		"studentId":  payload.StudentID,
	}))

	return "Gözlem kaydı oluşturuldu. Kategori: " + categoryLabel(observationdomain.Category(payload.Category)) + ". Rehberlik birimi bu kaydı kendi panelinde görebilir.", nil
}

func (s *Service) confirmCreateGuidanceNote(ctx context.Context, principal identity.Principal, action aidomain.PendingAction) (string, error) {
	if principal.Role != identity.RoleGuidance {
		return "", ErrForbidden
	}
	var payload aidomain.CreateGuidanceNotePayload
	if err := json.Unmarshal(action.Payload, &payload); err != nil {
		return "", ErrInvalidMessage
	}
	if err := validatePayloadHash(action.Payload, action.PayloadHash); err != nil {
		return "", err
	}
	created, err := s.guidance.CreateNote(ctx, principal.TenantID, principal.UserID, guidancedomain.CreateNoteInput{
		StudentID: payload.StudentID,
		NoteType:  guidancedomain.NoteType(payload.NoteType),
		Title:     payload.Title,
		Body:      payload.Body,
	})
	if err != nil {
		return "", err
	}
	_ = s.repo.RecordAudit(ctx, principal.TenantID, principal.UserID, "ai.action.confirm", "guidance_note", created.ID, mustJSON(map[string]string{
		"actionType": string(action.ActionType),
		"studentId":  payload.StudentID,
	}))
	return "Rehberlik notu oluşturuldu: " + created.Title, nil
}

func (s *Service) confirmCreateSupportPlan(ctx context.Context, principal identity.Principal, action aidomain.PendingAction) (string, error) {
	if principal.Role != identity.RoleGuidance {
		return "", ErrForbidden
	}
	var payload aidomain.CreateSupportPlanPayload
	if err := json.Unmarshal(action.Payload, &payload); err != nil {
		return "", ErrInvalidMessage
	}
	if err := validatePayloadHash(action.Payload, action.PayloadHash); err != nil {
		return "", err
	}
	created, err := s.guidance.CreatePlan(ctx, principal.TenantID, principal.UserID, guidancedomain.CreatePlanInput{
		StudentID:   payload.StudentID,
		Title:       payload.Title,
		Description: payload.Description,
		Status:      guidancedomain.PlanStatus(payload.Status),
		DueDate:     payload.DueDate,
	})
	if err != nil {
		return "", err
	}
	_ = s.repo.RecordAudit(ctx, principal.TenantID, principal.UserID, "ai.action.confirm", "support_plan", created.ID, mustJSON(map[string]string{
		"actionType": string(action.ActionType),
		"studentId":  payload.StudentID,
	}))
	return "Destek planı oluşturuldu: " + created.Title, nil
}

func (s *Service) confirmCreateAnnouncement(ctx context.Context, principal identity.Principal, action aidomain.PendingAction) (string, error) {
	if principal.Role != identity.RolePrincipal && principal.Role != identity.RoleSystemAdmin {
		return "", ErrForbidden
	}
	var payload aidomain.CreateAnnouncementPayload
	if err := json.Unmarshal(action.Payload, &payload); err != nil {
		return "", ErrInvalidMessage
	}
	if err := validatePayloadHash(action.Payload, action.PayloadHash); err != nil {
		return "", err
	}
	created, err := s.school.CreateAnnouncement(ctx, principal.TenantID, principal.UserID, schooldomain.CreateAnnouncementInput{
		Title:    payload.Title,
		Body:     payload.Body,
		Audience: payload.Audience,
	})
	if err != nil {
		return "", err
	}
	_ = s.repo.RecordAudit(ctx, principal.TenantID, principal.UserID, "ai.action.confirm", "announcement", created.ID, mustJSON(map[string]string{
		"actionType": string(action.ActionType),
		"audience":   payload.Audience,
	}))
	return "Duyuru yayınlandı: " + created.Title, nil
}

func (s *Service) confirmCreateSupportTicket(ctx context.Context, principal identity.Principal, action aidomain.PendingAction) (string, error) {
	var payload aidomain.CreateSupportTicketPayload
	if err := json.Unmarshal(action.Payload, &payload); err != nil {
		return "", ErrInvalidMessage
	}
	if err := validatePayloadHash(action.Payload, action.PayloadHash); err != nil {
		return "", err
	}
	if s.superAdmin == nil {
		return "", ErrForbidden
	}
	created, err := s.superAdmin.CreateSupportTicket(ctx, principal, superadmindomain.CreateSupportTicketInput{
		Type:    payload.Type,
		Subject: payload.Subject,
		Message: payload.Message,
	})
	if err != nil {
		return "", err
	}
	_ = s.repo.RecordAudit(ctx, principal.TenantID, principal.UserID, "ai.action.confirm", "support_ticket", created.ID, mustJSON(map[string]string{
		"actionType": string(action.ActionType),
	}))
	return "Destek talebi oluşturuldu: " + created.Subject, nil
}

func (s *Service) CancelAction(ctx context.Context, principal identity.Principal, actionID string) (aidomain.PendingAction, error) {
	action, ok, err := s.repo.UpdatePendingActionStatus(ctx, principal.TenantID, principal.UserID, actionID, aidomain.PendingActionCancelled, s.clock())
	if err != nil {
		return aidomain.PendingAction{}, err
	}
	if !ok {
		return aidomain.PendingAction{}, ErrActionNotFound
	}
	if action.Status != aidomain.PendingActionCancelled {
		return aidomain.PendingAction{}, ErrActionNotPending
	}
	return action, nil
}

func mustJSON(value any) json.RawMessage {
	raw, err := json.Marshal(value)
	if err != nil {
		return json.RawMessage(`{}`)
	}
	return raw
}

func (s *Service) ResolveOpenAIClient(ctx context.Context) openai.Client {
	model, _ := s.effectiveProviderSettings(ctx)
	return s.resolveOpenAIClientWithModel(ctx, model)
}

func (s *Service) SetOpenAIClientForTest(client openai.Client) {
	if client != nil {
		s.openai = client
	}
}
