package ai

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"

	aidomain "ots/backend/internal/domain/ai"
	"ots/backend/internal/domain/identity"
	schooldomain "ots/backend/internal/domain/school"
)

func (s *Service) orchestratePrincipalMessage(
	ctx context.Context,
	principal identity.Principal,
	conversation aidomain.Conversation,
	input aidomain.SendMessageInput,
) (aidomain.SendMessageResult, error) {
	content := s.resolveContent(conversation.ID, principal.TenantID, input.Content, ctx)
	selectedID := strings.TrimSpace(input.SelectedCandidateID)

	if selectedID != "" {
		return s.handlePrincipalStudentSelection(ctx, principal, conversation, selectedID, content)
	}
	if isAffirmative(content) {
		return s.handleAffirmation(ctx, principal, conversation)
	}
	if missingAttendancePattern.MatchString(content) {
		return s.assistantReply(conversation, s.buildMissingAttendanceSummary(ctx, principal.TenantID)), nil
	}
	if schedulingCheckPattern.MatchString(content) {
		return s.assistantReply(conversation, s.buildSchedulingCheckSummary(ctx, principal.TenantID)), nil
	}
	if dashboardSummaryPattern.MatchString(content) {
		return s.assistantReply(conversation, s.buildDashboardSummary(ctx, principal.TenantID)), nil
	}
	if announcementDraftPattern.MatchString(content) {
		return s.prepareAnnouncementDraft(ctx, principal, conversation, content)
	}
	if query := extractStudentQuery(content); query != "" && strings.Contains(strings.ToLower(content), "öğrenci") {
		return s.replyPrincipalStudentSearch(ctx, principal, conversation, query)
	}

	return s.assistantReply(conversation, "Müdür panelinde dashboard özeti, yoklama durumu, duyuru taslağı, program kontrolü ve öğrenci arama isteklerini destekliyorum."), nil
}

func (s *Service) buildDashboardSummary(ctx context.Context, tenantID string) string {
	if s.dashboard == nil {
		return "Dashboard özeti alınamadı."
	}
	summary := s.dashboard.PrincipalSummary(ctx, tenantID)
	lines := []string{
		fmt.Sprintf("Aktif öğrenci: %d", summary.ActiveStudents),
		fmt.Sprintf("Aktif öğretmen: %d", summary.ActiveTeachers),
		fmt.Sprintf("Sınıf sayısı: %d", summary.Classes),
		fmt.Sprintf("Bugünkü ders: %d", summary.TodayLessons),
		fmt.Sprintf("Yoklama tamamlanma: %%%d", summary.AttendanceCompletionPct),
		fmt.Sprintf("Bugün devamsız: %d", summary.AbsentToday),
		fmt.Sprintf("Açık gözlem sinyali: %d", summary.OpenObservationSignals),
	}
	if len(summary.Operations) > 0 {
		lines = append(lines, "Operasyon kalemleri:")
		for _, item := range summary.Operations {
			if len(lines) > 12 {
				break
			}
			lines = append(lines, fmt.Sprintf("- %s (%s)", item.Title, item.Status))
		}
	}
	return "Okul operasyon özeti:\n" + strings.Join(lines, "\n")
}

func (s *Service) buildMissingAttendanceSummary(ctx context.Context, tenantID string) string {
	if s.attendance == nil {
		return "Yoklama durumu alınamadı."
	}
	report := s.attendance.DayReport(ctx, tenantID, s.clock())
	pending := 0
	absent := 0
	for _, record := range report.Records {
		switch record.Status {
		case "unknown":
			pending++
		case "absent":
			absent++
		}
	}
	return fmt.Sprintf("%s tarihli yoklama durumu: %d kayıt incelendi, %d alınmamış oturum, %d devamsızlık kaydı var.", report.Date, len(report.Records), pending, absent)
}

func (s *Service) buildSchedulingCheckSummary(ctx context.Context, tenantID string) string {
	if s.scheduling == nil {
		return "Program kontrol verisi alınamadı."
	}
	requirements := s.scheduling.ListRequirements(ctx, tenantID)
	availabilities := s.scheduling.ListTeacherAvailabilities(ctx, tenantID)
	missing := 0
	if len(requirements) == 0 {
		missing++
	}
	if len(availabilities) == 0 {
		missing++
	}
	current, ok := s.scheduling.CurrentSchedule(ctx, tenantID)
	status := "yayınlanmış program yok"
	if ok {
		status = fmt.Sprintf("%s (%s)", current.Name, current.Status)
	}
	if missing == 0 {
		return fmt.Sprintf("Program üretimi için temel veriler mevcut görünüyor. Gereksinim: %d, öğretmen uygunluğu: %d. Güncel program: %s.", len(requirements), len(availabilities), status)
	}
	return fmt.Sprintf("Program üretimi için eksikler var. Gereksinim: %d, öğretmen uygunluğu: %d. Güncel program: %s.", len(requirements), len(availabilities), status)
}

func (s *Service) prepareAnnouncementDraft(
	ctx context.Context,
	principal identity.Principal,
	conversation aidomain.Conversation,
	content string,
) (aidomain.SendMessageResult, error) {
	title, body, audience := extractAnnouncementFields(content)
	payload := aidomain.CreateAnnouncementPayload{Title: title, Body: body, Audience: audience}
	payloadBytes, err := json.Marshal(payload)
	if err != nil {
		return aidomain.SendMessageResult{}, err
	}
	action, err := s.createPendingAction(ctx, principal, conversation.ID, aidomain.ActionCreateAnnouncement, aidomain.RiskHigh, payloadBytes, fmt.Sprintf(
		"İşlem: Duyuru yayınlama\nBaşlık: %s\nHedef kitle: %s\nMetin: %s",
		title, audience, body,
	))
	if err != nil {
		return aidomain.SendMessageResult{}, err
	}
	return aidomain.SendMessageResult{
		Message: aidomain.Message{
			ConversationID: conversation.ID,
			Role:           "assistant",
			Content:        "Duyuru taslağını hazırladım. Yayınlamak için onaylıyor musunuz?",
		},
		PendingAction: summarizePendingAction(action),
	}, nil
}

func (s *Service) replyPrincipalStudentSearch(
	ctx context.Context,
	principal identity.Principal,
	conversation aidomain.Conversation,
	query string,
) (aidomain.SendMessageResult, error) {
	candidates, err := s.searchPrincipalStudents(ctx, principal.TenantID, query)
	if err != nil {
		return aidomain.SendMessageResult{}, err
	}
	if len(candidates) == 0 {
		return s.assistantReply(conversation, "Aradığınız öğrenci bulunamadı."), nil
	}
	if len(candidates) == 1 {
		return s.assistantReply(conversation, fmt.Sprintf("%s bulundu (%s).", candidates[0].Label, candidates[0].Meta)), nil
	}
	return aidomain.SendMessageResult{
		Message: aidomain.Message{
			ConversationID: conversation.ID,
			Role:           "assistant",
			Content:        fmt.Sprintf("%d öğrenci adayı buldum.", len(candidates)),
		},
		Candidates: candidates,
	}, nil
}

func (s *Service) handlePrincipalStudentSelection(
	ctx context.Context,
	principal identity.Principal,
	conversation aidomain.Conversation,
	studentID string,
	content string,
) (aidomain.SendMessageResult, error) {
	students, err := s.school.ListStudents(ctx, principal.TenantID)
	if err != nil {
		return aidomain.SendMessageResult{}, err
	}
	for _, student := range students {
		if student.ID != studentID {
			continue
		}
		candidate := s.studentCandidateFromSchool(ctx, principal.TenantID, student)
		_ = content
		return s.assistantReply(conversation, fmt.Sprintf("%s seçildi (%s).", candidate.Label, candidate.Meta)), nil
	}
	return aidomain.SendMessageResult{}, ErrForbidden
}

func (s *Service) searchPrincipalStudents(ctx context.Context, tenantID, query string) ([]aidomain.Candidate, error) {
	students, err := s.school.ListStudents(ctx, tenantID)
	if err != nil {
		return nil, err
	}
	normalizedQuery := normalizeName(query)
	out := make([]aidomain.Candidate, 0, 5)
	for _, student := range students {
		fullName := schooldomain.JoinFullName(student.FirstName, student.LastName)
		if !nameMatches(normalizedQuery, fullName) {
			continue
		}
		out = append(out, s.studentCandidateFromSchool(ctx, tenantID, student))
		if len(out) >= 5 {
			break
		}
	}
	return out, nil
}
