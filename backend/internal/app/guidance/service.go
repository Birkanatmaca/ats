package guidance

import (
	"context"
	"errors"
	"strings"

	domain "ots/backend/internal/domain/guidance"
)

var (
	ErrInvalidInput    = errors.New("invalid guidance input")
	ErrNoteNotFound    = errors.New("guidance note not found")
	ErrPlanNotFound    = errors.New("support plan not found")
	ErrStudentOutScope = errors.New("student out of guidance scope")
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
	RecordOperationalAudit(ctx context.Context, tenantID, actorUserID, action, resourceType, resourceID, metadata string)
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

func (s *Service) ListNotes(ctx context.Context, tenantID, studentID string) []domain.Note {
	items, _ := s.repo.ListGuidanceNotes(ctx, tenantID, studentID)
	return items
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

func (s *Service) UpdateNote(ctx context.Context, tenantID, noteID string, input domain.UpdateNoteInput) (domain.Note, error) {
	noteID = strings.TrimSpace(noteID)
	if noteID == "" {
		return domain.Note{}, ErrNoteNotFound
	}
	updated, ok := s.repo.UpdateGuidanceNote(ctx, tenantID, noteID, input)
	if !ok {
		return domain.Note{}, ErrNoteNotFound
	}
	return updated, nil
}

func (s *Service) DeleteNote(ctx context.Context, tenantID, noteID string) error {
	if !s.repo.DeleteGuidanceNote(ctx, tenantID, strings.TrimSpace(noteID)) {
		return ErrNoteNotFound
	}
	return nil
}

func (s *Service) ListPlans(ctx context.Context, tenantID, studentID string) []domain.SupportPlan {
	items, _ := s.repo.ListSupportPlans(ctx, tenantID, studentID)
	return items
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

func (s *Service) UpdatePlan(ctx context.Context, tenantID, planID string, input domain.UpdatePlanInput) (domain.SupportPlan, error) {
	updated, ok := s.repo.UpdateSupportPlan(ctx, tenantID, strings.TrimSpace(planID), input)
	if !ok {
		return domain.SupportPlan{}, ErrPlanNotFound
	}
	return updated, nil
}

func (s *Service) DeletePlan(ctx context.Context, tenantID, planID string) error {
	if !s.repo.DeleteSupportPlan(ctx, tenantID, strings.TrimSpace(planID)) {
		return ErrPlanNotFound
	}
	return nil
}
