package ai

import (
	"context"
	"encoding/json"
	"fmt"
	"sort"
	"strings"

	aidomain "ots/backend/internal/domain/ai"
	guidancedomain "ots/backend/internal/domain/guidance"
	"ots/backend/internal/domain/identity"
	observationdomain "ots/backend/internal/domain/observation"
)

func (s *Service) orchestrateGuidanceMessage(
	ctx context.Context,
	principal identity.Principal,
	conversation aidomain.Conversation,
	input aidomain.SendMessageInput,
) (aidomain.SendMessageResult, error) {
	content := s.resolveContent(conversation.ID, principal.TenantID, input.Content, ctx)
	selectedID := strings.TrimSpace(input.SelectedCandidateID)

	if selectedID != "" {
		return s.handleGuidanceCandidateSelection(ctx, principal, conversation, selectedID, content)
	}
	if isAffirmative(content) {
		return s.handleAffirmation(ctx, principal, conversation)
	}
	if riskSummaryPattern.MatchString(content) {
		return s.assistantReply(conversation, s.buildRiskSignalSummary(ctx, principal.TenantID)), nil
	}
	if observationSummaryPattern.MatchString(content) {
		query := extractStudentQuery(content)
		if query == "" {
			return s.assistantReply(conversation, "Hangi öğrencinin gözlem özetini istediğinizi belirtir misiniz?"), nil
		}
		return s.replyObservationSummary(ctx, principal, conversation, query)
	}
	if supportPlanPattern.MatchString(content) {
		return s.startGuidanceStudentDraft(ctx, principal, conversation, content, aidomain.ActionCreateSupportPlan)
	}
	if guidanceNotePattern.MatchString(content) || observationIntentPattern.MatchString(content) {
		return s.startGuidanceStudentDraft(ctx, principal, conversation, content, aidomain.ActionCreateGuidanceNote)
	}

	return s.assistantReply(conversation, "Rehberlik panelinde öğrenci arama, rehberlik notu, destek planı, risk sinyali ve gözlem özeti isteklerini destekliyorum."), nil
}

func (s *Service) startGuidanceStudentDraft(
	ctx context.Context,
	principal identity.Principal,
	conversation aidomain.Conversation,
	content string,
	actionType aidomain.ActionType,
) (aidomain.SendMessageResult, error) {
	query := extractStudentQuery(content)
	if query == "" {
		return s.assistantReply(conversation, "Hangi öğrenci için işlem yapmak istediğinizi belirtir misiniz?"), nil
	}
	candidates, err := s.searchGuidanceStudents(ctx, principal, query)
	if err != nil {
		return aidomain.SendMessageResult{}, err
	}
	return s.pickCandidatesOrReply(conversation, candidates, query, func(candidate aidomain.Candidate) (aidomain.SendMessageResult, error) {
		switch actionType {
		case aidomain.ActionCreateSupportPlan:
			return s.prepareGuidanceSupportPlanDraft(ctx, principal, conversation, candidate, content)
		default:
			return s.prepareGuidanceNoteDraft(ctx, principal, conversation, candidate, content)
		}
	})
}

func (s *Service) handleGuidanceCandidateSelection(
	ctx context.Context,
	principal identity.Principal,
	conversation aidomain.Conversation,
	studentID string,
	content string,
) (aidomain.SendMessageResult, error) {
	if s.guidance == nil || !s.guidance.CanAccessStudent(ctx, principal.TenantID, principal.UserID, studentID) {
		return aidomain.SendMessageResult{}, ErrForbidden
	}
	students, err := s.guidance.ListStudents(ctx, principal.TenantID, principal.UserID)
	if err != nil {
		return aidomain.SendMessageResult{}, err
	}
	var selected *guidancedomain.Student
	for i := range students {
		if students[i].ID == studentID {
			selected = &students[i]
			break
		}
	}
	if selected == nil {
		return aidomain.SendMessageResult{}, ErrForbidden
	}
	candidate := s.studentCandidateFromGuidance(*selected)
	source := s.resolveContent(conversation.ID, principal.TenantID, content, ctx)
	switch {
	case supportPlanPattern.MatchString(source):
		return s.prepareGuidanceSupportPlanDraft(ctx, principal, conversation, candidate, source)
	default:
		return s.prepareGuidanceNoteDraft(ctx, principal, conversation, candidate, source)
	}
}

func (s *Service) prepareGuidanceNoteDraft(
	ctx context.Context,
	principal identity.Principal,
	conversation aidomain.Conversation,
	candidate aidomain.Candidate,
	rawContent string,
) (aidomain.SendMessageResult, error) {
	if s.guidance == nil || !s.guidance.CanAccessStudent(ctx, principal.TenantID, principal.UserID, candidate.ID) {
		return aidomain.SendMessageResult{}, ErrForbidden
	}
	className := strings.TrimSpace(strings.Split(candidate.Meta, " / No:")[0])
	body := sanitizeGuidanceBody(rawContent)
	title := extractTitle(rawContent, candidate.Label+" görüşme notu")
	payload := aidomain.CreateGuidanceNotePayload{
		StudentID:   candidate.ID,
		StudentName: candidate.Label,
		ClassName:   className,
		NoteType:    string(guidancedomain.NoteTypeMeeting),
		Title:       title,
		Body:        body,
	}
	payloadBytes, err := json.Marshal(payload)
	if err != nil {
		return aidomain.SendMessageResult{}, err
	}
	action, err := s.createPendingAction(ctx, principal, conversation.ID, aidomain.ActionCreateGuidanceNote, aidomain.RiskHigh, payloadBytes, fmt.Sprintf(
		"Öğrenci: %s - %s\nİşlem: Rehberlik notu oluşturma\nBaşlık: %s\nNot: %s",
		candidate.Label, className, title, body,
	))
	if err != nil {
		return aidomain.SendMessageResult{}, err
	}
	return aidomain.SendMessageResult{
		Message: aidomain.Message{
			ConversationID: conversation.ID,
			Role:           "assistant",
			Content:        fmt.Sprintf("%s için rehberlik notu taslağını hazırladım. Onaylıyor musunuz?", candidate.Label),
		},
		PendingAction: summarizePendingAction(action),
	}, nil
}

func (s *Service) prepareGuidanceSupportPlanDraft(
	ctx context.Context,
	principal identity.Principal,
	conversation aidomain.Conversation,
	candidate aidomain.Candidate,
	rawContent string,
) (aidomain.SendMessageResult, error) {
	if s.guidance == nil || !s.guidance.CanAccessStudent(ctx, principal.TenantID, principal.UserID, candidate.ID) {
		return aidomain.SendMessageResult{}, ErrForbidden
	}
	className := strings.TrimSpace(strings.Split(candidate.Meta, " / No:")[0])
	title := extractTitle(rawContent, candidate.Label+" destek planı")
	description := sanitizeGuidanceBody(rawContent)
	payload := aidomain.CreateSupportPlanPayload{
		StudentID:   candidate.ID,
		StudentName: candidate.Label,
		ClassName:   className,
		Title:       title,
		Description: description,
		Status:      string(guidancedomain.PlanStatusOpen),
	}
	payloadBytes, err := json.Marshal(payload)
	if err != nil {
		return aidomain.SendMessageResult{}, err
	}
	action, err := s.createPendingAction(ctx, principal, conversation.ID, aidomain.ActionCreateSupportPlan, aidomain.RiskHigh, payloadBytes, fmt.Sprintf(
		"Öğrenci: %s - %s\nİşlem: Destek planı oluşturma\nBaşlık: %s\nAçıklama: %s",
		candidate.Label, className, title, description,
	))
	if err != nil {
		return aidomain.SendMessageResult{}, err
	}
	return aidomain.SendMessageResult{
		Message: aidomain.Message{
			ConversationID: conversation.ID,
			Role:           "assistant",
			Content:        fmt.Sprintf("%s için destek planı taslağını hazırladım. Onaylıyor musunuz?", candidate.Label),
		},
		PendingAction: summarizePendingAction(action),
	}, nil
}

func (s *Service) searchGuidanceStudents(ctx context.Context, principal identity.Principal, query string) ([]aidomain.Candidate, error) {
	if s.guidance == nil {
		return nil, ErrForbidden
	}
	students, err := s.guidance.ListStudents(ctx, principal.TenantID, principal.UserID)
	if err != nil {
		return nil, err
	}
	normalizedQuery := normalizeName(query)
	out := make([]aidomain.Candidate, 0, 5)
	for _, student := range students {
		if !nameMatches(normalizedQuery, student.FullName) {
			continue
		}
		out = append(out, s.studentCandidateFromGuidance(student))
		if len(out) >= 5 {
			break
		}
	}
	return out, nil
}

func (s *Service) replyObservationSummary(
	ctx context.Context,
	principal identity.Principal,
	conversation aidomain.Conversation,
	query string,
) (aidomain.SendMessageResult, error) {
	candidates, err := s.searchGuidanceStudents(ctx, principal, query)
	if err != nil {
		return aidomain.SendMessageResult{}, err
	}
	if len(candidates) == 0 {
		return s.assistantReply(conversation, "Bu öğrenci için gözlem özeti bulamadım."), nil
	}
	if len(candidates) > 1 {
		return aidomain.SendMessageResult{
			Message: aidomain.Message{
				ConversationID: conversation.ID,
				Role:           "assistant",
				Content:        "Birden fazla öğrenci adayı buldum. Lütfen doğru öğrenciyi seçin.",
			},
			Candidates: candidates,
		}, nil
	}
	return s.assistantReply(conversation, s.buildStudentObservationSummary(ctx, principal.TenantID, candidates[0])), nil
}

func (s *Service) buildRiskSignalSummary(ctx context.Context, tenantID string) string {
	if s.observation == nil {
		return "Risk sinyalleri şu an alınamadı."
	}
	items := s.observation.List(ctx, tenantID)
	type signal struct {
		student string
		class   string
		category observationdomain.Category
		count   int
	}
	grouped := map[string]*signal{}
	for _, item := range items {
		if !isRiskCategory(item.Category) {
			continue
		}
		key := item.StudentID + ":" + string(item.Category)
		current, ok := grouped[key]
		if !ok {
			grouped[key] = &signal{student: item.StudentName, class: item.ClassName, category: item.Category, count: 1}
			continue
		}
		current.count++
	}
	if len(grouped) == 0 {
		return "Bugün için kayıtlı risk sinyali bulunmuyor."
	}
	lines := make([]string, 0, len(grouped))
	for _, item := range grouped {
		lines = append(lines, fmt.Sprintf("- %s (%s): %s sinyali, %d kayıt", item.student, item.class, categoryLabel(item.category), item.count))
	}
	sort.Strings(lines)
	return "Bugünkü risk sinyalleri:\n" + strings.Join(lines, "\n")
}

func (s *Service) buildStudentObservationSummary(ctx context.Context, tenantID string, candidate aidomain.Candidate) string {
	if s.observation == nil {
		return "Gözlem özeti alınamadı."
	}
	items := s.observation.List(ctx, tenantID)
	counts := map[observationdomain.Category]int{}
	total := 0
	for _, item := range items {
		if item.StudentID != candidate.ID {
			continue
		}
		counts[item.Category]++
		total++
	}
	if total == 0 {
		return candidate.Label + " için kayıtlı öğretmen gözlemi bulunmuyor."
	}
	parts := make([]string, 0, len(counts))
	for category, count := range counts {
		parts = append(parts, fmt.Sprintf("%s: %d", categoryLabel(category), count))
	}
	sort.Strings(parts)
	return fmt.Sprintf("%s için toplam %d gözlem kaydı var. Kategori dağılımı: %s.", candidate.Label, total, strings.Join(parts, ", "))
}
