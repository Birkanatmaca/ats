package guidance

import (
	"context"
	"errors"
	"strings"
	"time"

	domain "ots/backend/internal/domain/guidance"
)

var (
	ErrInvalidInput       = errors.New("invalid guidance input")
	ErrNoteNotFound       = errors.New("guidance note not found")
	ErrPlanNotFound       = errors.New("support plan not found")
	ErrTrackingNotFound   = errors.New("risk tracking not found")
	ErrStudentOutScope    = errors.New("student out of guidance scope")
	ErrCaseNotFound       = errors.New("guidance case not found")
	ErrCaseEventNotFound  = errors.New("guidance case event not found")
	ErrCaseClosed         = errors.New("guidance case closed")
	ErrGuidanceForbidden  = errors.New("guidance action forbidden for role")
)

type Repository interface {
	ListGuidanceStudents(ctx context.Context, tenantID, userID string) ([]domain.Student, error)
	GuidanceCanAccessStudent(ctx context.Context, tenantID, userID, studentID string) bool
	ListGuidanceNotes(ctx context.Context, tenantID, studentID string) ([]domain.Note, error)
	GetGuidanceNote(ctx context.Context, tenantID, noteID string) (domain.Note, bool)
	CreateGuidanceNote(ctx context.Context, tenantID, authorID string, input domain.CreateNoteInput) (domain.Note, bool)
	UpdateGuidanceNote(ctx context.Context, tenantID, noteID string, input domain.UpdateNoteInput) (domain.Note, bool)
	DeleteGuidanceNote(ctx context.Context, tenantID, noteID string) bool
	ListSupportPlans(ctx context.Context, tenantID, studentID string) ([]domain.SupportPlan, error)
	GetSupportPlan(ctx context.Context, tenantID, planID string) (domain.SupportPlan, bool)
	CreateSupportPlan(ctx context.Context, tenantID, ownerID string, input domain.CreatePlanInput) (domain.SupportPlan, bool)
	UpdateSupportPlan(ctx context.Context, tenantID, planID string, input domain.UpdatePlanInput) (domain.SupportPlan, bool)
	DeleteSupportPlan(ctx context.Context, tenantID, planID string) bool
	ListRiskTrackings(ctx context.Context, tenantID, studentID string) ([]domain.RiskTracking, error)
	GetRiskTracking(ctx context.Context, tenantID, trackingID string) (domain.RiskTracking, bool)
	GetRiskTrackingByStudent(ctx context.Context, tenantID, studentID string) (domain.RiskTracking, bool)
	CreateRiskTracking(ctx context.Context, tenantID, counselorID string, input domain.CreateRiskTrackingInput) (domain.RiskTracking, bool)
	DeleteRiskTracking(ctx context.Context, tenantID, trackingID string) bool
	RecordOperationalAudit(ctx context.Context, tenantID, actorUserID, action, resourceType, resourceID, metadata string)
	ListGuidanceCases(ctx context.Context, tenantID, studentID, status string) ([]domain.Case, error)
	GetGuidanceCase(ctx context.Context, tenantID, caseID string) (domain.Case, bool)
	CreateGuidanceCase(ctx context.Context, tenantID, ownerUserID string, input domain.CreateCaseInput) (domain.Case, bool)
	UpdateGuidanceCase(ctx context.Context, tenantID, caseID, actorUserID string, input domain.UpdateCaseInput) (domain.Case, bool)
	CloseGuidanceCase(ctx context.Context, tenantID, caseID, actorUserID string, closedAt time.Time) (domain.Case, bool)
	ReopenGuidanceCase(ctx context.Context, tenantID, caseID, actorUserID string) (domain.Case, bool)
	ListGuidanceCaseEvents(ctx context.Context, tenantID, caseID string) ([]domain.CaseEvent, error)
	GetGuidanceCaseEvent(ctx context.Context, tenantID, caseID, eventID string) (domain.CaseEvent, bool)
	CreateGuidanceCaseEvent(ctx context.Context, tenantID, caseID, actorUserID string, input domain.CreateCaseEventInput) (domain.CaseEvent, bool)
	UpdateGuidanceCaseEvent(ctx context.Context, tenantID, caseID, eventID string, input domain.UpdateCaseEventInput) (domain.CaseEvent, bool)
	DeleteGuidanceCaseEvent(ctx context.Context, tenantID, caseID, eventID string) bool
}

type Service struct {
	repo Repository
}

func NewService(repo Repository) *Service {
	return &Service{repo: repo}
}

func (s *Service) ListStudents(ctx context.Context, tenantID, userID string) ([]domain.Student, error) {
	return s.repo.ListGuidanceStudents(ctx, tenantID, userID)
}

func (s *Service) CanAccessStudent(ctx context.Context, tenantID, userID, studentID string) bool {
	return s.repo.GuidanceCanAccessStudent(ctx, tenantID, userID, studentID)
}

func (s *Service) ListNotes(ctx context.Context, tenantID, userID, studentID string) []domain.Note {
	if studentID != "" && !s.repo.GuidanceCanAccessStudent(ctx, tenantID, userID, studentID) {
		return nil
	}
	items, _ := s.repo.ListGuidanceNotes(ctx, tenantID, studentID)
	out := make([]domain.Note, 0, len(items))
	for _, item := range items {
		if s.repo.GuidanceCanAccessStudent(ctx, tenantID, userID, item.StudentID) {
			out = append(out, item)
		}
	}
	return out
}

func (s *Service) CreateNote(ctx context.Context, tenantID, authorID string, input domain.CreateNoteInput) (domain.Note, error) {
	studentID := strings.TrimSpace(input.StudentID)
	body := strings.TrimSpace(input.Body)
	if studentID == "" || body == "" {
		return domain.Note{}, ErrInvalidInput
	}
	if !s.repo.GuidanceCanAccessStudent(ctx, tenantID, authorID, studentID) {
		return domain.Note{}, ErrStudentOutScope
	}
	noteType := input.NoteType
	if noteType == "" {
		noteType = domain.NoteTypeMeeting
	}
	created, ok := s.repo.CreateGuidanceNote(ctx, tenantID, authorID, domain.CreateNoteInput{
		StudentID: studentID,
		NoteType:  noteType,
		Title:     strings.TrimSpace(input.Title),
		Body:      body,
	})
	if !ok {
		return domain.Note{}, ErrInvalidInput
	}
	s.repo.RecordOperationalAudit(ctx, tenantID, authorID, "guidance.note.create", "guidance_note", created.ID, `{}`)
	return created, nil
}

func (s *Service) UpdateNote(ctx context.Context, tenantID, userID, noteID string, input domain.UpdateNoteInput) (domain.Note, error) {
	noteID = strings.TrimSpace(noteID)
	if noteID == "" {
		return domain.Note{}, ErrNoteNotFound
	}
	note, ok := s.repo.GetGuidanceNote(ctx, tenantID, noteID)
	if !ok {
		return domain.Note{}, ErrNoteNotFound
	}
	if !s.repo.GuidanceCanAccessStudent(ctx, tenantID, userID, note.StudentID) {
		return domain.Note{}, ErrStudentOutScope
	}
	updated, ok := s.repo.UpdateGuidanceNote(ctx, tenantID, noteID, input)
	if !ok {
		return domain.Note{}, ErrNoteNotFound
	}
	s.repo.RecordOperationalAudit(ctx, tenantID, userID, "guidance.note.update", "guidance_note", updated.ID, `{}`)
	return updated, nil
}

func (s *Service) DeleteNote(ctx context.Context, tenantID, userID, noteID string) error {
	note, ok := s.repo.GetGuidanceNote(ctx, tenantID, strings.TrimSpace(noteID))
	if !ok {
		return ErrNoteNotFound
	}
	if !s.repo.GuidanceCanAccessStudent(ctx, tenantID, userID, note.StudentID) {
		return ErrStudentOutScope
	}
	if !s.repo.DeleteGuidanceNote(ctx, tenantID, strings.TrimSpace(noteID)) {
		return ErrNoteNotFound
	}
	s.repo.RecordOperationalAudit(ctx, tenantID, userID, "guidance.note.delete", "guidance_note", strings.TrimSpace(noteID), `{}`)
	return nil
}

func (s *Service) ListPlans(ctx context.Context, tenantID, userID, studentID string) []domain.SupportPlan {
	if studentID != "" && !s.repo.GuidanceCanAccessStudent(ctx, tenantID, userID, studentID) {
		return nil
	}
	items, _ := s.repo.ListSupportPlans(ctx, tenantID, studentID)
	out := make([]domain.SupportPlan, 0, len(items))
	for _, item := range items {
		if s.repo.GuidanceCanAccessStudent(ctx, tenantID, userID, item.StudentID) {
			out = append(out, item)
		}
	}
	return out
}

func (s *Service) CreatePlan(ctx context.Context, tenantID, ownerID string, input domain.CreatePlanInput) (domain.SupportPlan, error) {
	studentID := strings.TrimSpace(input.StudentID)
	title := strings.TrimSpace(input.Title)
	if studentID == "" || title == "" {
		return domain.SupportPlan{}, ErrInvalidInput
	}
	if !s.repo.GuidanceCanAccessStudent(ctx, tenantID, ownerID, studentID) {
		return domain.SupportPlan{}, ErrStudentOutScope
	}
	status := input.Status
	if status == "" {
		status = domain.PlanStatusOpen
	}
	created, ok := s.repo.CreateSupportPlan(ctx, tenantID, ownerID, domain.CreatePlanInput{
		StudentID:   studentID,
		Title:       title,
		Description: strings.TrimSpace(input.Description),
		Status:      status,
		DueDate:     strings.TrimSpace(input.DueDate),
	})
	if !ok {
		return domain.SupportPlan{}, ErrInvalidInput
	}
	s.repo.RecordOperationalAudit(ctx, tenantID, ownerID, "support_plan.create", "support_plan", created.ID, `{}`)
	return created, nil
}

func (s *Service) UpdatePlan(ctx context.Context, tenantID, userID, planID string, input domain.UpdatePlanInput) (domain.SupportPlan, error) {
	plan, ok := s.repo.GetSupportPlan(ctx, tenantID, strings.TrimSpace(planID))
	if !ok {
		return domain.SupportPlan{}, ErrPlanNotFound
	}
	if !s.repo.GuidanceCanAccessStudent(ctx, tenantID, userID, plan.StudentID) {
		return domain.SupportPlan{}, ErrStudentOutScope
	}
	updated, ok := s.repo.UpdateSupportPlan(ctx, tenantID, strings.TrimSpace(planID), input)
	if !ok {
		return domain.SupportPlan{}, ErrPlanNotFound
	}
	s.repo.RecordOperationalAudit(ctx, tenantID, userID, "support_plan.update", "support_plan", updated.ID, `{}`)
	return updated, nil
}

func (s *Service) DeletePlan(ctx context.Context, tenantID, userID, planID string) error {
	plan, ok := s.repo.GetSupportPlan(ctx, tenantID, strings.TrimSpace(planID))
	if !ok {
		return ErrPlanNotFound
	}
	if !s.repo.GuidanceCanAccessStudent(ctx, tenantID, userID, plan.StudentID) {
		return ErrStudentOutScope
	}
	if !s.repo.DeleteSupportPlan(ctx, tenantID, strings.TrimSpace(planID)) {
		return ErrPlanNotFound
	}
	s.repo.RecordOperationalAudit(ctx, tenantID, userID, "support_plan.delete", "support_plan", strings.TrimSpace(planID), `{}`)
	return nil
}

func (s *Service) ListRiskTrackings(ctx context.Context, tenantID, userID, studentID string) []domain.RiskTracking {
	if studentID != "" && !s.repo.GuidanceCanAccessStudent(ctx, tenantID, userID, studentID) {
		return nil
	}
	items, _ := s.repo.ListRiskTrackings(ctx, tenantID, studentID)
	out := make([]domain.RiskTracking, 0, len(items))
	for _, item := range items {
		if s.repo.GuidanceCanAccessStudent(ctx, tenantID, userID, item.StudentID) {
			out = append(out, item)
		}
	}
	return out
}

func (s *Service) CreateRiskTracking(ctx context.Context, tenantID, counselorID string, input domain.CreateRiskTrackingInput) (domain.RiskTracking, error) {
	studentID := strings.TrimSpace(input.StudentID)
	if studentID == "" {
		return domain.RiskTracking{}, ErrInvalidInput
	}
	if !s.repo.GuidanceCanAccessStudent(ctx, tenantID, counselorID, studentID) {
		return domain.RiskTracking{}, ErrStudentOutScope
	}
	if existing, ok := s.repo.GetRiskTrackingByStudent(ctx, tenantID, studentID); ok {
		return existing, nil
	}
	created, ok := s.repo.CreateRiskTracking(ctx, tenantID, counselorID, domain.CreateRiskTrackingInput{
		StudentID: studentID,
		Reason:    strings.TrimSpace(input.Reason),
	})
	if !ok {
		return domain.RiskTracking{}, ErrInvalidInput
	}
	s.repo.RecordOperationalAudit(ctx, tenantID, counselorID, "guidance.risk_tracking.create", "guidance_risk_tracking", created.ID, `{}`)
	return created, nil
}

func (s *Service) DeleteRiskTracking(ctx context.Context, tenantID, userID, trackingID string) error {
	tracking, ok := s.repo.GetRiskTracking(ctx, tenantID, strings.TrimSpace(trackingID))
	if !ok {
		return ErrTrackingNotFound
	}
	if !s.repo.GuidanceCanAccessStudent(ctx, tenantID, userID, tracking.StudentID) {
		return ErrStudentOutScope
	}
	if !s.repo.DeleteRiskTracking(ctx, tenantID, strings.TrimSpace(trackingID)) {
		return ErrTrackingNotFound
	}
	s.repo.RecordOperationalAudit(ctx, tenantID, userID, "guidance.risk_tracking.delete", "guidance_risk_tracking", strings.TrimSpace(trackingID), `{}`)
	return nil
}
