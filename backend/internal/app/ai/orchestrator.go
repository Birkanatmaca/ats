package ai

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"regexp"
	"strings"
	"time"
	"unicode"

	aidomain "ots/backend/internal/domain/ai"
	"ots/backend/internal/domain/identity"
	observationdomain "ots/backend/internal/domain/observation"
	schooldomain "ots/backend/internal/domain/school"
)

var (
	observationIntentPattern = regexp.MustCompile(`(?i)(gözlem|analiz raporu|rapor gir|kaydet|not ekle|not oluştur)`)
	clinicalTerms            = []string{"dehb", "dikkat eksikliği", "hiperaktivite", "otizm", "depresyon", "anksiyete"}
)

func (s *Service) orchestrateTeacherMessage(
	ctx context.Context,
	principal identity.Principal,
	conversation aidomain.Conversation,
	input aidomain.SendMessageInput,
) (aidomain.SendMessageResult, error) {
	content := strings.TrimSpace(input.Content)
	selectedID := strings.TrimSpace(input.SelectedCandidateID)

	if selectedID != "" {
		return s.handleTeacherCandidateSelection(ctx, principal, conversation, selectedID, content)
	}

	if isAffirmative(content) {
		return s.handleAffirmation(ctx, principal, conversation)
	}

	if !observationIntentPattern.MatchString(content) {
		return s.assistantReply(conversation, "Öğretmen panelinde şu an gözlem kaydı oluşturma, öğrenci arama ve ders özeti isteklerini destekliyorum. Örneğin: \"Defne Yılmaz adlı öğrenciye dikkat gözlemi eklemeni istiyorum.\""), nil
	}

	query := extractStudentQuery(content)
	if query == "" {
		return s.assistantReply(conversation, "Hangi öğrenci için gözlem kaydı oluşturmak istediğinizi belirtir misiniz?"), nil
	}

	candidates, err := s.searchTeacherStudents(ctx, principal, query)
	if err != nil {
		return aidomain.SendMessageResult{}, err
	}
	if len(candidates) == 0 {
		return s.assistantReply(conversation, fmt.Sprintf("\"%s\" adına uygun yetkili öğrenci bulamadım. Lütfen adı kontrol edin.", query)), nil
	}
	if len(candidates) > 1 {
		return aidomain.SendMessageResult{
			Message: aidomain.Message{
				ConversationID: conversation.ID,
				Role:           "assistant",
				Content:        fmt.Sprintf("%d öğrenci adayı buldum. Lütfen doğru öğrenciyi seçin.", len(candidates)),
			},
			Candidates: candidates,
		}, nil
	}

	return s.prepareTeacherObservationDraft(ctx, principal, conversation, candidates[0], content)
}

func (s *Service) handleTeacherCandidateSelection(
	ctx context.Context,
	principal identity.Principal,
	conversation aidomain.Conversation,
	studentID string,
	content string,
) (aidomain.SendMessageResult, error) {
	if !s.observation.TeacherCanObserveStudent(ctx, principal.TenantID, principal.UserID, studentID) {
		return aidomain.SendMessageResult{}, ErrForbidden
	}

	students, err := s.school.ListStudentsForTeacher(ctx, principal.TenantID, principal.UserID)
	if err != nil {
		return aidomain.SendMessageResult{}, err
	}

	var selected *schooldomain.PrincipalRosterStudent
	for i := range students {
		if students[i].ID == studentID {
			selected = &students[i]
			break
		}
	}
	if selected == nil {
		return aidomain.SendMessageResult{}, ErrForbidden
	}

	className := s.classNameForStudent(ctx, principal.TenantID, selected.ClassID)
	candidate := aidomain.Candidate{
		Kind:  "student",
		ID:    selected.ID,
		Label: schooldomain.JoinFullName(selected.FirstName, selected.LastName),
		Meta:  fmt.Sprintf("%s / No: %s", className, selected.SchoolNumber),
	}
	return s.prepareTeacherObservationDraft(ctx, principal, conversation, candidate, content)
}

func (s *Service) prepareTeacherObservationDraft(
	ctx context.Context,
	principal identity.Principal,
	conversation aidomain.Conversation,
	candidate aidomain.Candidate,
	rawContent string,
) (aidomain.SendMessageResult, error) {
	if !s.observation.TeacherCanObserveStudent(ctx, principal.TenantID, principal.UserID, candidate.ID) {
		return aidomain.SendMessageResult{}, ErrForbidden
	}

	note := sanitizeObservationNote(rawContent)
	category := inferObservationCategory(rawContent)
	className := strings.TrimSpace(strings.Split(candidate.Meta, " / No:")[0])

	payload := aidomain.CreateObservationPayload{
		StudentID:   candidate.ID,
		StudentName: candidate.Label,
		ClassName:   className,
		Category:    string(category),
		Note:        note,
		Sensitivity: "sensitive_student",
	}
	payloadBytes, err := json.Marshal(payload)
	if err != nil {
		return aidomain.SendMessageResult{}, err
	}

	action, err := s.createPendingAction(ctx, principal, conversation.ID, aidomain.ActionCreateObservation, aidomain.RiskMedium, payloadBytes, fmt.Sprintf(
		"Öğrenci: %s - %s\nİşlem: Öğretmen gözlem kaydı oluşturma\nKategori: %s\nNot: %s",
		candidate.Label,
		className,
		categoryLabel(category),
		note,
	))
	if err != nil {
		return aidomain.SendMessageResult{}, err
	}

	return aidomain.SendMessageResult{
		Message: aidomain.Message{
			ConversationID: conversation.ID,
			Role:           "assistant",
			Content:        fmt.Sprintf("%s adlı öğrenci için gözlem taslağını hazırladım. Onaylıyor musunuz?", candidate.Label),
		},
		PendingAction: summarizePendingAction(action),
	}, nil
}

func (s *Service) searchTeacherStudents(ctx context.Context, principal identity.Principal, query string) ([]aidomain.Candidate, error) {
	students, err := s.school.ListStudentsForTeacher(ctx, principal.TenantID, principal.UserID)
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
		className := s.classNameForStudent(ctx, principal.TenantID, student.ClassID)
		out = append(out, aidomain.Candidate{
			Kind:  "student",
			ID:    student.ID,
			Label: fullName,
			Meta:  fmt.Sprintf("%s / No: %s", className, student.SchoolNumber),
		})
		if len(out) >= 5 {
			break
		}
	}
	return out, nil
}

func (s *Service) classNameForStudent(ctx context.Context, tenantID, classID string) string {
	classes, err := s.school.ListClasses(ctx, tenantID)
	if err != nil {
		return classID
	}
	for _, class := range classes {
		if class.ID == classID {
			return class.Name
		}
	}
	return classID
}

func (s *Service) createPendingAction(
	ctx context.Context,
	principal identity.Principal,
	conversationID string,
	actionType aidomain.ActionType,
	risk aidomain.RiskLevel,
	payload []byte,
	confirmationText string,
) (aidomain.PendingAction, error) {
	hash := sha256.Sum256(payload)
	return s.repo.CreatePendingAction(ctx, principal.TenantID, principal.UserID, conversationID, actionType, risk, payload, hex.EncodeToString(hash[:]), confirmationText, s.clock().Add(15*time.Minute))
}

func summarizePendingAction(action aidomain.PendingAction) *aidomain.PendingActionSummary {
	summary := action.ConfirmationText
	if idx := strings.Index(summary, "\nNot:"); idx >= 0 {
		summary = strings.TrimSpace(summary[:idx])
	}
	if idx := strings.Index(summary, "\nAçıklama:"); idx >= 0 {
		summary = strings.TrimSpace(summary[:idx])
	}
	confirmLabel, cancelLabel := "Onayla", "Vazgeç"
	switch action.ActionType {
	case aidomain.ActionCreateObservation:
		confirmLabel = "Kaydı oluştur"
	case aidomain.ActionCreateGuidanceNote:
		confirmLabel = "Notu oluştur"
	case aidomain.ActionCreateSupportPlan:
		confirmLabel = "Planı oluştur"
	case aidomain.ActionCreateAnnouncement:
		confirmLabel = "Duyuruyu yayınla"
	case aidomain.ActionCreateSupportTicket:
		confirmLabel = "Talebi gönder"
	}
	return &aidomain.PendingActionSummary{
		ID:           action.ID,
		ActionType:   action.ActionType,
		RiskLevel:    action.RiskLevel,
		Summary:      summary,
		ConfirmLabel: confirmLabel,
		CancelLabel:  cancelLabel,
	}
}

func (s *Service) assistantReply(conversation aidomain.Conversation, content string) aidomain.SendMessageResult {
	return aidomain.SendMessageResult{
		Message: aidomain.Message{
			ConversationID: conversation.ID,
			Role:           "assistant",
			Content:        content,
		},
	}
}

func (s *Service) pendingActionReply(conversation aidomain.Conversation, action aidomain.PendingAction) aidomain.SendMessageResult {
	message := "İşlem taslağını hazırladım. Onaylıyor musunuz?"
	switch action.ActionType {
	case aidomain.ActionCreateObservation:
		message = "Gözlem kaydı taslağını hazırladım. Onaylıyor musunuz?"
	case aidomain.ActionCreateGuidanceNote:
		message = "Rehberlik notu taslağını hazırladım. Onaylıyor musunuz?"
	case aidomain.ActionCreateSupportPlan:
		message = "Destek planı taslağını hazırladım. Onaylıyor musunuz?"
	case aidomain.ActionCreateAnnouncement:
		message = "Duyuru taslağını hazırladım. Onaylıyor musunuz?"
	case aidomain.ActionCreateSupportTicket:
		message = "Destek talebi taslağını hazırladım. Onaylıyor musunuz?"
	}
	return aidomain.SendMessageResult{
		Message: aidomain.Message{
			ConversationID: conversation.ID,
			Role:           "assistant",
			Content:        message,
		},
		PendingAction: summarizePendingAction(action),
	}
}

func extractStudentQuery(content string) string {
	lower := strings.ToLower(content)
	for _, marker := range []string{" adlı ", " adi ", " isimli ", " ismindeki "} {
		if idx := strings.Index(lower, marker); idx > 0 {
			before := strings.TrimSpace(content[:idx])
			words := strings.Fields(before)
			if len(words) >= 2 {
				return strings.Join(words[len(words)-2:], " ")
			}
			if len(words) == 1 {
				return words[0]
			}
		}
	}

	words := strings.Fields(content)
	for i, word := range words {
		if strings.EqualFold(word, "öğrenci") && i > 0 {
			candidate := strings.Join(words[max(0, i-2):i], " ")
			if candidate != "" {
				return candidate
			}
		}
	}
	return ""
}

func inferObservationCategory(content string) observationdomain.Category {
	lower := strings.ToLower(content)
	switch {
	case strings.Contains(lower, "dikkat"), strings.Contains(lower, "odak"):
		return observationdomain.CategoryAttention
	case strings.Contains(lower, "davran"):
		return observationdomain.CategoryBehavior
	case strings.Contains(lower, "katılım"), strings.Contains(lower, "katilim"):
		return observationdomain.CategoryParticipation
	case strings.Contains(lower, "sosyal"):
		return observationdomain.CategorySocial
	case strings.Contains(lower, "devams"), strings.Contains(lower, "yok"):
		return observationdomain.CategoryAbsenceRisk
	case strings.Contains(lower, "akadem"), strings.Contains(lower, "not"):
		return observationdomain.CategoryAcademicDrop
	default:
		return observationdomain.CategoryTeacherNote
	}
}

func sanitizeObservationNote(content string) string {
	note := content
	for _, term := range clinicalTerms {
		note = strings.ReplaceAll(note, term, "gözlemlenen davranış")
		note = strings.ReplaceAll(note, strings.ToUpper(term), "gözlemlenen davranış")
	}
	note = observationIntentPattern.ReplaceAllString(note, "")
	note = strings.TrimSpace(note)
	if note == "" {
		return "Derste dikkatini sürdürmekte zorlandığı gözlemlendi."
	}
	if !strings.HasSuffix(note, ".") {
		note += "."
	}
	return note
}

func categoryLabel(category observationdomain.Category) string {
	switch category {
	case observationdomain.CategoryAttention:
		return "Dikkat durumu"
	case observationdomain.CategoryBehavior:
		return "Davranış"
	case observationdomain.CategoryParticipation:
		return "Katılım"
	case observationdomain.CategorySocial:
		return "Sosyal uyum"
	case observationdomain.CategoryAbsenceRisk:
		return "Devamsızlık riski"
	case observationdomain.CategoryAcademicDrop:
		return "Akademik düşüş"
	default:
		return "Öğretmen notu"
	}
}

func isAffirmative(content string) bool {
	normalized := strings.ToLower(strings.TrimSpace(content))
	switch normalized {
	case "evet", "onayla", "onaylıyorum", "tamam", "kabul", "yes", "ok":
		return true
	default:
		return false
	}
}

func normalizeName(value string) string {
	var b strings.Builder
	for _, r := range strings.ToLower(value) {
		if unicode.IsLetter(r) || unicode.IsDigit(r) {
			b.WriteRune(r)
		}
	}
	return b.String()
}

func nameMatches(query, fullName string) bool {
	if query == "" {
		return false
	}
	normalizedName := normalizeName(fullName)
	if strings.Contains(normalizedName, query) {
		return true
	}
	parts := strings.Fields(strings.ToLower(fullName))
	queryParts := strings.Fields(strings.ToLower(query))
	if len(queryParts) == 0 {
		return false
	}
	matched := 0
	for _, qp := range queryParts {
		for _, part := range parts {
			if strings.HasPrefix(normalizeName(part), normalizeName(qp)) {
				matched++
				break
			}
		}
	}
	return matched == len(queryParts)
}

func max(a, b int) int {
	if a > b {
		return a
	}
	return b
}
