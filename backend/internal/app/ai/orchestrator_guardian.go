package ai

import (
	"context"
	"encoding/json"
	"fmt"
	"sort"
	"strings"

	aidomain "ots/backend/internal/domain/ai"
	guardiandomain "ots/backend/internal/domain/guardian"
	"ots/backend/internal/domain/identity"
)

func (s *Service) orchestrateGuardianMessage(
	ctx context.Context,
	principal identity.Principal,
	conversation aidomain.Conversation,
	input aidomain.SendMessageInput,
) (aidomain.SendMessageResult, error) {
	content := s.resolveContent(conversation.ID, principal.TenantID, input.Content, ctx)
	selectedID := strings.TrimSpace(input.SelectedCandidateID)

	if selectedID != "" {
		return s.handleGuardianCandidateSelection(ctx, principal, conversation, selectedID, content)
	}
	if isAffirmative(content) {
		return s.handleAffirmation(ctx, principal, conversation)
	}
	if supportTicketPattern.MatchString(content) {
		return s.prepareSupportTicketDraft(ctx, principal, conversation, content)
	}
	if scheduleQueryPattern.MatchString(content) {
		return s.replyGuardianSchedule(ctx, principal, conversation, content)
	}
	if attendanceQueryPattern.MatchString(content) {
		return s.replyGuardianAttendance(ctx, principal, conversation, content)
	}
	if announcementQueryPattern.MatchString(content) {
		return s.assistantReply(conversation, s.buildGuardianAnnouncementsSummary(ctx, principal.TenantID)), nil
	}

	return s.assistantReply(conversation, "Veli panelinde çocuğunuzun programı, devamsızlık özeti, duyurular ve destek talebi oluşturma isteklerini destekliyorum."), nil
}

func (s *Service) replyGuardianSchedule(
	ctx context.Context,
	principal identity.Principal,
	conversation aidomain.Conversation,
	content string,
) (aidomain.SendMessageResult, error) {
	students := s.guardianStudents(ctx, principal)
	if len(students) == 0 {
		return s.assistantReply(conversation, "Bağlı öğrenci bulunamadı."), nil
	}
	if len(students) == 1 {
		return s.assistantReply(conversation, s.buildGuardianScheduleSummary(ctx, principal, students[0].ID)), nil
	}
	if query := extractStudentQuery(content); query != "" {
		candidates := s.filterGuardianCandidates(students, query)
		return s.pickCandidatesOrReply(conversation, candidates, query, func(candidate aidomain.Candidate) (aidomain.SendMessageResult, error) {
			return s.assistantReply(conversation, s.buildGuardianScheduleSummary(ctx, principal, candidate.ID)), nil
		})
	}
	return aidomain.SendMessageResult{
		Message: aidomain.Message{
			ConversationID: conversation.ID,
			Role:           "assistant",
			Content:        "Hangi çocuğunuzun programını görmek istediğinizi seçin.",
		},
		Candidates: s.guardianCandidates(students),
	}, nil
}

func (s *Service) replyGuardianAttendance(
	ctx context.Context,
	principal identity.Principal,
	conversation aidomain.Conversation,
	content string,
) (aidomain.SendMessageResult, error) {
	students := s.guardianStudents(ctx, principal)
	if len(students) == 0 {
		return s.assistantReply(conversation, "Bağlı öğrenci bulunamadı."), nil
	}
	if len(students) == 1 {
		return s.assistantReply(conversation, s.buildGuardianAttendanceSummary(ctx, principal, students[0].ID)), nil
	}
	if query := extractStudentQuery(content); query != "" {
		candidates := s.filterGuardianCandidates(students, query)
		return s.pickCandidatesOrReply(conversation, candidates, query, func(candidate aidomain.Candidate) (aidomain.SendMessageResult, error) {
			return s.assistantReply(conversation, s.buildGuardianAttendanceSummary(ctx, principal, candidate.ID)), nil
		})
	}
	return aidomain.SendMessageResult{
		Message: aidomain.Message{
			ConversationID: conversation.ID,
			Role:           "assistant",
			Content:        "Hangi çocuğunuzun devamsızlık özetini görmek istediğinizi seçin.",
		},
		Candidates: s.guardianCandidates(students),
	}, nil
}

func (s *Service) handleGuardianCandidateSelection(
	ctx context.Context,
	principal identity.Principal,
	conversation aidomain.Conversation,
	studentID string,
	content string,
) (aidomain.SendMessageResult, error) {
	if s.guardian == nil {
		return aidomain.SendMessageResult{}, ErrForbidden
	}
	students := s.guardian.ListStudents(ctx, principal.TenantID, principal.UserID)
	var selected *guardiandomain.Student
	for i := range students {
		if students[i].ID == studentID {
			selected = &students[i]
			break
		}
	}
	if selected == nil {
		return aidomain.SendMessageResult{}, ErrForbidden
	}
	source := s.resolveContent(conversation.ID, principal.TenantID, content, ctx)
	switch {
	case attendanceQueryPattern.MatchString(source):
		return s.assistantReply(conversation, s.buildGuardianAttendanceSummary(ctx, principal, selected.ID)), nil
	default:
		return s.assistantReply(conversation, s.buildGuardianScheduleSummary(ctx, principal, selected.ID)), nil
	}
}

func (s *Service) prepareSupportTicketDraft(
	ctx context.Context,
	principal identity.Principal,
	conversation aidomain.Conversation,
	content string,
) (aidomain.SendMessageResult, error) {
	ticketType, subject, message := extractSupportTicketFields(content)
	payload := aidomain.CreateSupportTicketPayload{Type: ticketType, Subject: subject, Message: message}
	payloadBytes, err := json.Marshal(payload)
	if err != nil {
		return aidomain.SendMessageResult{}, err
	}
	action, err := s.createPendingAction(ctx, principal, conversation.ID, aidomain.ActionCreateSupportTicket, aidomain.RiskMedium, payloadBytes, fmt.Sprintf(
		"İşlem: Destek talebi oluşturma\nKonu: %s\nMesaj: %s",
		subject, message,
	))
	if err != nil {
		return aidomain.SendMessageResult{}, err
	}
	return aidomain.SendMessageResult{
		Message: aidomain.Message{
			ConversationID: conversation.ID,
			Role:           "assistant",
			Content:        "Destek talebi taslağını hazırladım. Göndermek için onaylıyor musunuz?",
		},
		PendingAction: summarizePendingAction(action),
	}, nil
}

func (s *Service) guardianStudents(ctx context.Context, principal identity.Principal) []guardiandomain.Student {
	if s.guardian == nil {
		return nil
	}
	return s.guardian.ListStudents(ctx, principal.TenantID, principal.UserID)
}

func (s *Service) guardianCandidates(students []guardiandomain.Student) []aidomain.Candidate {
	out := make([]aidomain.Candidate, 0, len(students))
	for _, student := range students {
		out = append(out, s.studentCandidateFromGuardian(student))
	}
	return out
}

func (s *Service) filterGuardianCandidates(students []guardiandomain.Student, query string) []aidomain.Candidate {
	normalizedQuery := normalizeName(query)
	out := make([]aidomain.Candidate, 0, len(students))
	for _, student := range students {
		if nameMatches(normalizedQuery, student.FullName) {
			out = append(out, s.studentCandidateFromGuardian(student))
		}
	}
	return out
}

func (s *Service) buildGuardianScheduleSummary(ctx context.Context, principal identity.Principal, studentID string) string {
	if s.guardian == nil {
		return "Program bilgisi alınamadı."
	}
	schedule, err := s.guardian.StudentSchedule(ctx, principal.TenantID, principal.UserID, studentID)
	if err != nil {
		return "Bu öğrenci için program bilgisine erişilemedi."
	}
	if len(schedule.Lessons) == 0 {
		return "Yayınlanmış programda ders bulunamadı."
	}
	dayLabels := []string{"Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"}
	lines := make([]string, 0, len(schedule.Lessons))
	for _, lesson := range schedule.Lessons {
		day := dayLabels[lesson.DayOfWeek]
		if lesson.DayOfWeek < 0 || lesson.DayOfWeek >= len(dayLabels) {
			day = "Gün"
		}
		lines = append(lines, fmt.Sprintf("- %s %s-%s: %s / %s", day, lesson.StartTime, lesson.EndTime, lesson.SubjectName, lesson.ClassName))
	}
	sort.Strings(lines)
	return "Haftalık ders programı:\n" + strings.Join(lines, "\n")
}

func (s *Service) buildGuardianAttendanceSummary(ctx context.Context, principal identity.Principal, studentID string) string {
	if s.guardian == nil {
		return "Devamsızlık bilgisi alınamadı."
	}
	attendance, err := s.guardian.StudentAttendance(ctx, principal.TenantID, principal.UserID, studentID)
	if err != nil {
		return "Bu öğrenci için devamsızlık bilgisine erişilemedi."
	}
	present, absent, late, excused := 0, 0, 0, 0
	for _, record := range attendance.Records {
		switch record.Status {
		case "present":
			present++
		case "absent":
			absent++
		case "late":
			late++
		case "excused":
			excused++
		}
	}
	return fmt.Sprintf("Devamsızlık özeti: %d geldi, %d gelmedi, %d geç, %d izinli kayıt.", present, absent, late, excused)
}

func (s *Service) buildGuardianAnnouncementsSummary(ctx context.Context, tenantID string) string {
	if s.guardian == nil {
		return "Duyuru bilgisi alınamadı."
	}
	items := s.guardian.ListAnnouncements(ctx, tenantID)
	if len(items) == 0 {
		return "Yayınlanmış duyuru bulunmuyor."
	}
	lines := make([]string, 0, min(len(items), 5))
	for _, item := range items {
		if len(lines) >= 5 {
			break
		}
		lines = append(lines, fmt.Sprintf("- %s (%s)", item.Title, item.PublishedAt.Format("02.01.2006")))
	}
	return "Son duyurular:\n" + strings.Join(lines, "\n")
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}
