package ai

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"

	aidomain "ots/backend/internal/domain/ai"
	"ots/backend/internal/domain/identity"
	"ots/backend/internal/platform/openai"
)

type llmTokenUsage struct {
	Input  int
	Output int
}

type toolExecutionOutcome struct {
	ToolContent string
	ShortResult *aidomain.SendMessageResult
}

func (s *Service) useLLM(ctx context.Context) bool {
	if !s.cfg.UseLLM {
		return false
	}
	return s.ResolveOpenAIClient(ctx).Available()
}

func (s *Service) tryLLMOrchestration(
	ctx context.Context,
	principal identity.Principal,
	conversation aidomain.Conversation,
	content string,
) (aidomain.SendMessageResult, llmTokenUsage, bool, error) {
	if !s.useLLM(ctx) {
		return aidomain.SendMessageResult{}, llmTokenUsage{}, false, nil
	}
	tools := toolsForRole(principal.Role)
	if len(tools) == 0 {
		return aidomain.SendMessageResult{}, llmTokenUsage{}, false, nil
	}

	client := s.ResolveOpenAIClient(ctx)
	messages := []openai.ChatMessage{{Role: "system", Content: systemPromptForRole(principal.Role)}}
	history, err := s.repo.ListMessages(ctx, principal.TenantID, conversation.ID)
	if err != nil {
		return aidomain.SendMessageResult{}, llmTokenUsage{}, false, err
	}
	start := 0
	if len(history) > 12 {
		start = len(history) - 12
	}
	for _, item := range history[start:] {
		if item.Role != "user" && item.Role != "assistant" {
			continue
		}
		messages = append(messages, openai.ChatMessage{Role: item.Role, Content: item.Content})
	}
	if len(messages) == 1 {
		messages = append(messages, openai.ChatMessage{Role: "user", Content: content})
	}

	usage := llmTokenUsage{}
	for step := 0; step < 6; step++ {
		completion, err := client.CompleteChat(ctx, messages, tools)
		if err != nil {
			return aidomain.SendMessageResult{}, usage, false, nil
		}
		usage.Input += completion.Usage.PromptTokens
		usage.Output += completion.Usage.CompletionTokens

		if len(completion.ToolCalls) == 0 {
			if completion.Content == "" {
				return aidomain.SendMessageResult{}, usage, false, nil
			}
			return aidomain.SendMessageResult{
				Message: aidomain.Message{
					ConversationID: conversation.ID,
					Role:           "assistant",
					Content:        completion.Content,
				},
			}, usage, true, nil
		}

		messages = append(messages, openai.ChatMessage{
			Role:      "assistant",
			Content:   completion.Content,
			ToolCalls: completion.ToolCalls,
		})

		for _, call := range completion.ToolCalls {
			outcome, execErr := s.executeToolCall(ctx, principal, conversation, content, call)
			if execErr != nil {
				return aidomain.SendMessageResult{}, usage, false, execErr
			}
			if outcome.ShortResult != nil {
				if completion.Content != "" && outcome.ShortResult.Message.Content == "" {
					outcome.ShortResult.Message.Content = completion.Content
				}
				return *outcome.ShortResult, usage, true, nil
			}
			messages = append(messages, openai.ChatMessage{
				Role:       "tool",
				ToolCallID: call.ID,
				Content:    outcome.ToolContent,
			})
		}
	}
	return aidomain.SendMessageResult{}, usage, false, nil
}

func (s *Service) executeToolCall(
	ctx context.Context,
	principal identity.Principal,
	conversation aidomain.Conversation,
	rawUserContent string,
	call openai.ToolCall,
) (toolExecutionOutcome, error) {
	switch call.Name {
	case "search_students":
		return s.toolSearchStudents(ctx, principal, conversation, call.Arguments)
	case "draft_observation":
		return s.toolDraftObservation(ctx, principal, conversation, rawUserContent, call.Arguments)
	case "draft_guidance_note":
		return s.toolDraftGuidanceNote(ctx, principal, conversation, call.Arguments)
	case "draft_support_plan":
		return s.toolDraftSupportPlan(ctx, principal, conversation, call.Arguments)
	case "summarize_risk_signals":
		return toolExecutionOutcome{ToolContent: s.buildRiskSignalSummary(ctx, principal.TenantID)}, nil
	case "dashboard_summary":
		return toolExecutionOutcome{ToolContent: s.buildDashboardSummary(ctx, principal.TenantID)}, nil
	case "attendance_today":
		return toolExecutionOutcome{ToolContent: s.buildMissingAttendanceSummary(ctx, principal.TenantID)}, nil
	case "draft_announcement":
		return s.toolDraftAnnouncement(ctx, principal, conversation, call.Arguments)
	case "child_schedule":
		return s.toolChildSchedule(ctx, principal, call.Arguments)
	case "child_attendance":
		return s.toolChildAttendance(ctx, principal, call.Arguments)
	case "recent_announcements":
		return toolExecutionOutcome{ToolContent: s.buildGuardianAnnouncementsSummary(ctx, principal.TenantID)}, nil
	case "draft_support_ticket":
		return s.toolDraftSupportTicket(ctx, principal, conversation, call.Arguments)
	default:
		return toolExecutionOutcome{ToolContent: `{"error":"unknown_tool"}`}, nil
	}
}

func (s *Service) toolSearchStudents(
	ctx context.Context,
	principal identity.Principal,
	conversation aidomain.Conversation,
	rawArgs string,
) (toolExecutionOutcome, error) {
	var args struct {
		Query string `json:"query"`
	}
	_ = json.Unmarshal([]byte(rawArgs), &args)
	query := strings.TrimSpace(args.Query)
	if query == "" {
		return toolExecutionOutcome{ToolContent: `{"students":[]}`}, nil
	}

	var candidates []aidomain.Candidate
	var err error
	switch principal.Role {
	case identity.RoleTeacher:
		candidates, err = s.searchTeacherStudents(ctx, principal, query)
	case identity.RoleGuidance:
		candidates, err = s.searchGuidanceStudents(ctx, principal, query)
	case identity.RolePrincipal, identity.RoleSystemAdmin:
		candidates, err = s.searchPrincipalStudents(ctx, principal.TenantID, query)
	default:
		return toolExecutionOutcome{ToolContent: `{"students":[]}`}, nil
	}
	if err != nil {
		return toolExecutionOutcome{}, err
	}
	if len(candidates) == 1 {
		payload, _ := json.Marshal(map[string]any{"students": candidates, "selected": candidates[0].ID})
		return toolExecutionOutcome{ToolContent: string(payload)}, nil
	}
	if len(candidates) > 1 {
		return toolExecutionOutcome{
			ShortResult: &aidomain.SendMessageResult{
				Message: aidomain.Message{
					ConversationID: conversation.ID,
					Role:           "assistant",
					Content:        fmt.Sprintf("%d öğrenci adayı buldum. Lütfen doğru öğrenciyi seçin.", len(candidates)),
				},
				Candidates: candidates,
			},
		}, nil
	}
	return toolExecutionOutcome{ToolContent: `{"students":[]}`}, nil
}

func (s *Service) toolDraftObservation(
	ctx context.Context,
	principal identity.Principal,
	conversation aidomain.Conversation,
	rawUserContent string,
	rawArgs string,
) (toolExecutionOutcome, error) {
	var args struct {
		StudentID string `json:"student_id"`
		Category  string `json:"category"`
		Note      string `json:"note"`
	}
	if err := json.Unmarshal([]byte(rawArgs), &args); err != nil {
		return toolExecutionOutcome{}, ErrInvalidMessage
	}
	students, err := s.school.ListStudentsForTeacher(ctx, principal.TenantID, principal.UserID)
	if err != nil {
		return toolExecutionOutcome{}, err
	}
	var candidate aidomain.Candidate
	for _, student := range students {
		if student.ID == args.StudentID {
			className := s.classNameForStudent(ctx, principal.TenantID, student.ClassID)
			candidate = aidomain.Candidate{
				Kind:  "student",
				ID:    student.ID,
				Label: strings.TrimSpace(student.FirstName + " " + student.LastName),
				Meta:  fmt.Sprintf("%s / No: %s", className, student.SchoolNumber),
			}
			break
		}
	}
	if candidate.ID == "" {
		return toolExecutionOutcome{ToolContent: `{"error":"student_not_found"}`}, nil
	}
	note := strings.TrimSpace(args.Note)
	if note == "" {
		note = sanitizeObservationNote(rawUserContent)
	}
	content := rawUserContent
	if note != "" {
		content = note
	}
	_ = args.Category
	result, err := s.prepareTeacherObservationDraft(ctx, principal, conversation, candidate, content)
	if err != nil {
		return toolExecutionOutcome{}, err
	}
	return toolExecutionOutcome{ShortResult: &result}, nil
}

func (s *Service) toolDraftGuidanceNote(
	ctx context.Context,
	principal identity.Principal,
	conversation aidomain.Conversation,
	rawArgs string,
) (toolExecutionOutcome, error) {
	var args struct {
		StudentID string `json:"student_id"`
		Title     string `json:"title"`
		Body      string `json:"body"`
		NoteType  string `json:"note_type"`
	}
	if err := json.Unmarshal([]byte(rawArgs), &args); err != nil {
		return toolExecutionOutcome{}, ErrInvalidMessage
	}
	candidate, ok, err := s.guidanceCandidateByID(ctx, principal, args.StudentID)
	if err != nil {
		return toolExecutionOutcome{}, err
	}
	if !ok {
		return toolExecutionOutcome{ToolContent: `{"error":"student_not_found"}`}, nil
	}
	result, err := s.prepareGuidanceNoteDraft(ctx, principal, conversation, candidate, strings.TrimSpace(args.Title+"\n"+args.Body))
	if err != nil {
		return toolExecutionOutcome{}, err
	}
	return toolExecutionOutcome{ShortResult: &result}, nil
}

func (s *Service) toolDraftSupportPlan(
	ctx context.Context,
	principal identity.Principal,
	conversation aidomain.Conversation,
	rawArgs string,
) (toolExecutionOutcome, error) {
	var args struct {
		StudentID   string `json:"student_id"`
		Title       string `json:"title"`
		Description string `json:"description"`
	}
	if err := json.Unmarshal([]byte(rawArgs), &args); err != nil {
		return toolExecutionOutcome{}, ErrInvalidMessage
	}
	candidate, ok, err := s.guidanceCandidateByID(ctx, principal, args.StudentID)
	if err != nil {
		return toolExecutionOutcome{}, err
	}
	if !ok {
		return toolExecutionOutcome{ToolContent: `{"error":"student_not_found"}`}, nil
	}
	result, err := s.prepareGuidanceSupportPlanDraft(ctx, principal, conversation, candidate, strings.TrimSpace(args.Title+"\n"+args.Description))
	if err != nil {
		return toolExecutionOutcome{}, err
	}
	return toolExecutionOutcome{ShortResult: &result}, nil
}

func (s *Service) toolDraftAnnouncement(
	ctx context.Context,
	principal identity.Principal,
	conversation aidomain.Conversation,
	rawArgs string,
) (toolExecutionOutcome, error) {
	var args struct {
		Title    string `json:"title"`
		Body     string `json:"body"`
		Audience string `json:"audience"`
	}
	if err := json.Unmarshal([]byte(rawArgs), &args); err != nil {
		return toolExecutionOutcome{}, ErrInvalidMessage
	}
	content := strings.TrimSpace(args.Title + "\n" + args.Body)
	if strings.TrimSpace(args.Audience) != "" {
		content += "\nhedef:" + strings.TrimSpace(args.Audience)
	}
	result, err := s.prepareAnnouncementDraft(ctx, principal, conversation, content)
	if err != nil {
		return toolExecutionOutcome{}, err
	}
	return toolExecutionOutcome{ShortResult: &result}, nil
}

func (s *Service) toolDraftSupportTicket(
	ctx context.Context,
	principal identity.Principal,
	conversation aidomain.Conversation,
	rawArgs string,
) (toolExecutionOutcome, error) {
	var args struct {
		Type    string `json:"type"`
		Subject string `json:"subject"`
		Message string `json:"message"`
	}
	if err := json.Unmarshal([]byte(rawArgs), &args); err != nil {
		return toolExecutionOutcome{}, ErrInvalidMessage
	}
	content := strings.TrimSpace(args.Subject + "\n" + args.Message)
	result, err := s.prepareSupportTicketDraft(ctx, principal, conversation, content)
	if err != nil {
		return toolExecutionOutcome{}, err
	}
	return toolExecutionOutcome{ShortResult: &result}, nil
}

func (s *Service) toolChildSchedule(ctx context.Context, principal identity.Principal, rawArgs string) (toolExecutionOutcome, error) {
	studentID, err := s.resolveGuardianStudentID(ctx, principal, rawArgs)
	if err != nil {
		return toolExecutionOutcome{}, err
	}
	if studentID == "" {
		return toolExecutionOutcome{ToolContent: `{"error":"student_not_found"}`}, nil
	}
	return toolExecutionOutcome{ToolContent: s.buildGuardianScheduleSummary(ctx, principal, studentID)}, nil
}

func (s *Service) toolChildAttendance(ctx context.Context, principal identity.Principal, rawArgs string) (toolExecutionOutcome, error) {
	studentID, err := s.resolveGuardianStudentID(ctx, principal, rawArgs)
	if err != nil {
		return toolExecutionOutcome{}, err
	}
	if studentID == "" {
		return toolExecutionOutcome{ToolContent: `{"error":"student_not_found"}`}, nil
	}
	return toolExecutionOutcome{ToolContent: s.buildGuardianAttendanceSummary(ctx, principal, studentID)}, nil
}

func (s *Service) guidanceCandidateByID(ctx context.Context, principal identity.Principal, studentID string) (aidomain.Candidate, bool, error) {
	candidates, err := s.searchGuidanceStudents(ctx, principal, studentID)
	if err != nil {
		return aidomain.Candidate{}, false, err
	}
	for _, candidate := range candidates {
		if candidate.ID == studentID {
			return candidate, true, nil
		}
	}
	return aidomain.Candidate{}, false, nil
}

func (s *Service) resolveGuardianStudentID(ctx context.Context, principal identity.Principal, rawArgs string) (string, error) {
	var args struct {
		StudentID string `json:"student_id"`
	}
	_ = json.Unmarshal([]byte(rawArgs), &args)
	if strings.TrimSpace(args.StudentID) != "" {
		if s.guardian.HasStudent(ctx, principal.TenantID, principal.UserID, args.StudentID) {
			return args.StudentID, nil
		}
		return "", nil
	}
	students := s.guardian.ListStudents(ctx, principal.TenantID, principal.UserID)
	if len(students) == 0 {
		return "", nil
	}
	return students[0].ID, nil
}
