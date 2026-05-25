package ai

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"regexp"
	"strings"

	aidomain "ots/backend/internal/domain/ai"
	guidancedomain "ots/backend/internal/domain/guidance"
	guardiandomain "ots/backend/internal/domain/guardian"
	"ots/backend/internal/domain/identity"
	observationdomain "ots/backend/internal/domain/observation"
	schooldomain "ots/backend/internal/domain/school"
)

var (
	guidanceNotePattern        = regexp.MustCompile(`(?i)(rehberlik notu|görüşme notu|not oluştur|not ekle|not kaydet)`)
	supportPlanPattern         = regexp.MustCompile(`(?i)(destek planı|takip planı|plan oluştur|plan hazırla|plan taslağı)`)
	riskSummaryPattern         = regexp.MustCompile(`(?i)(risk sinyal|riskleri özetle|bugünkü risk|risk durumu)`)
	observationSummaryPattern  = regexp.MustCompile(`(?i)(gözlem özet|öğretmen gözlem|gözlemleri özetle|gözlem kayıtları)`)
	dashboardSummaryPattern    = regexp.MustCompile(`(?i)(dashboard|genel durum|okul durumu|operasyon özeti|özetle)`)
	missingAttendancePattern   = regexp.MustCompile(`(?i)(alınmamış yoklama|yoklama durumu|bugünkü yoklama|eksik yoklama)`)
	announcementDraftPattern   = regexp.MustCompile(`(?i)(duyuru taslağı|duyuru oluştur|duyuru hazırla|duyuru yayınla)`)
	schedulingCheckPattern     = regexp.MustCompile(`(?i)(program üret|eksik veri|program eksik|program kontrol)`)
	scheduleQueryPattern       = regexp.MustCompile(`(?i)(program|ders programı|haftalık program|bugünkü ders)`)
	attendanceQueryPattern     = regexp.MustCompile(`(?i)(devamsızlık|devam durumu|gelmedi|yoklama özeti)`)
	announcementQueryPattern   = regexp.MustCompile(`(?i)(duyuru|bildirim)`)
	supportTicketPattern       = regexp.MustCompile(`(?i)(destek talebi|destek oluştur|yardım talebi|talep oluştur)`)

	riskCategories = []observationdomain.Category{
		observationdomain.CategoryAttention,
		observationdomain.CategoryBehavior,
		observationdomain.CategorySocial,
		observationdomain.CategoryAbsenceRisk,
		observationdomain.CategoryAcademicDrop,
	}
)

func (s *Service) lastUserMessage(ctx context.Context, tenantID, conversationID string) string {
	messages, err := s.repo.ListMessages(ctx, tenantID, conversationID)
	if err != nil {
		return ""
	}
	for i := len(messages) - 1; i >= 0; i-- {
		if messages[i].Role == "user" {
			return strings.TrimSpace(messages[i].Content)
		}
	}
	return ""
}

func (s *Service) resolveContent(conversationID, tenantID, current string, ctx context.Context) string {
	if strings.TrimSpace(current) != "" {
		return strings.TrimSpace(current)
	}
	return s.lastUserMessage(ctx, tenantID, conversationID)
}

func (s *Service) handleAffirmation(ctx context.Context, principal identity.Principal, conversation aidomain.Conversation) (aidomain.SendMessageResult, error) {
	action, ok, err := s.repo.GetLatestPendingAction(ctx, principal.TenantID, principal.UserID, conversation.ID)
	if err != nil {
		return aidomain.SendMessageResult{}, err
	}
	if !ok {
		return s.assistantReply(conversation, "Onaylanacak bir işlem taslağı bulamadım."), nil
	}
	return s.pendingActionReply(conversation, action), nil
}

func (s *Service) studentCandidateFromGuidance(student guidancedomain.Student) aidomain.Candidate {
	return aidomain.Candidate{
		Kind:  "student",
		ID:    student.ID,
		Label: student.FullName,
		Meta:  fmtCandidateMeta(student.ClassName, student.SchoolNumber),
	}
}

func (s *Service) studentCandidateFromGuardian(student guardiandomain.Student) aidomain.Candidate {
	return aidomain.Candidate{
		Kind:  "student",
		ID:    student.ID,
		Label: student.FullName,
		Meta:  fmtCandidateMeta(student.ClassName, student.SchoolNumber),
	}
}

func (s *Service) studentCandidateFromSchool(ctx context.Context, tenantID string, student schooldomain.PrincipalRosterStudent) aidomain.Candidate {
	className := s.classNameForStudent(ctx, tenantID, student.ClassID)
	return aidomain.Candidate{
		Kind:  "student",
		ID:    student.ID,
		Label: schooldomain.JoinFullName(student.FirstName, student.LastName),
		Meta:  fmtCandidateMeta(className, student.SchoolNumber),
	}
}

func fmtCandidateMeta(className, schoolNumber string) string {
	if className == "" {
		className = "Sınıf"
	}
	return className + " / No: " + schoolNumber
}

func (s *Service) pickCandidatesOrReply(
	conversation aidomain.Conversation,
	candidates []aidomain.Candidate,
	query string,
	onSingle func(candidate aidomain.Candidate) (aidomain.SendMessageResult, error),
) (aidomain.SendMessageResult, error) {
	if len(candidates) == 0 {
		return s.assistantReply(conversation, "Bu arama için yetkili öğrenci bulamadım. Lütfen adı kontrol edin."), nil
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
	_ = query
	return onSingle(candidates[0])
}

func sanitizeGuidanceBody(content string) string {
	body := content
	for _, term := range clinicalTerms {
		body = strings.ReplaceAll(body, term, "gözlemlenen davranış")
	}
	body = guidanceNotePattern.ReplaceAllString(body, "")
	body = supportPlanPattern.ReplaceAllString(body, "")
	body = observationIntentPattern.ReplaceAllString(body, "")
	body = strings.TrimSpace(body)
	if body == "" {
		return "Öğrenci ile kısa görüşme yapıldı; takip notu eklendi."
	}
	if !strings.HasSuffix(body, ".") {
		body += "."
	}
	return body
}

func extractTitle(content, fallback string) string {
	lines := strings.Split(strings.TrimSpace(content), "\n")
	for _, line := range lines {
		trimmed := strings.TrimSpace(line)
		if len(trimmed) >= 8 {
			if len(trimmed) > 80 {
				return trimmed[:80]
			}
			return trimmed
		}
	}
	return fallback
}

func extractAnnouncementFields(content string) (title, body, audience string) {
	audience = "all"
	title = extractTitle(content, "Kurum duyurusu")
	body = strings.TrimSpace(content)
	if body == "" {
		body = "Kurum duyurusu metni."
	}
	lower := strings.ToLower(content)
	switch {
	case strings.Contains(lower, "veli"):
		audience = "guardians"
	case strings.Contains(lower, "öğretmen"):
		audience = "teachers"
	}
	return title, body, audience
}

func extractSupportTicketFields(content string) (ticketType, subject, message string) {
	ticketType = "general"
	subject = extractTitle(content, "Destek talebi")
	message = strings.TrimSpace(content)
	if message == "" {
		message = "Kullanıcı destek talebi oluşturdu."
	}
	lower := strings.ToLower(content)
	switch {
	case strings.Contains(lower, "teknik"):
		ticketType = "technical"
	case strings.Contains(lower, "hesap"):
		ticketType = "account"
	}
	return ticketType, subject, message
}

func isRiskCategory(category observationdomain.Category) bool {
	for _, item := range riskCategories {
		if item == category {
			return true
		}
	}
	return false
}

func validatePayloadHash(payload []byte, expected string) error {
	hash := sha256.Sum256(payload)
	if hex.EncodeToString(hash[:]) != expected {
		return ErrInvalidMessage
	}
	return nil
}
