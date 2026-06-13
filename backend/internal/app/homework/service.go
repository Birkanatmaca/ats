package homework

import (
	"context"
	"errors"
	"strings"
	"time"

	domain "ots/backend/internal/domain/homework"
)

var (
	ErrInvalidInput = errors.New("invalid homework input")
	ErrNotFound     = errors.New("homework not found")
	ErrForbidden    = errors.New("homework forbidden")
)

// Repository defines all persistence operations for the homework module.
type Repository interface {
	CreateAssignment(ctx context.Context, item domain.Assignment) (domain.Assignment, error)
	ListAssignments(ctx context.Context, tenantID, classID string) ([]domain.Assignment, error)
	GetAssignment(ctx context.Context, tenantID, assignmentID string) (domain.Assignment, bool, error)
	SubmitAssignment(ctx context.Context, submission domain.Submission) (domain.Submission, error)
	CountSubmissions(ctx context.Context, tenantID, assignmentID string) (int, error)
	TeacherCanManageClass(ctx context.Context, tenantID, teacherUserID, classID string) bool
	StudentCurrentClassID(ctx context.Context, tenantID, studentID string) (string, bool)
	StudentCanAccessAssignment(ctx context.Context, tenantID, studentID, assignmentID string) bool
	RecordHomeworkAudit(ctx context.Context, tenantID, actorID, action, resourceType, resourceID string)
}

type Service struct {
	repo  Repository
	clock func() time.Time
}

func NewService(repo Repository, clock func() time.Time) *Service {
	if clock == nil {
		clock = time.Now
	}
	return &Service{repo: repo, clock: clock}
}

func (s *Service) CreateAssignment(ctx context.Context, tenantID, teacherID string, input domain.CreateAssignmentInput) (domain.Assignment, error) {
	tenantID = strings.TrimSpace(tenantID)
	teacherID = strings.TrimSpace(teacherID)
	input.ClassID = strings.TrimSpace(input.ClassID)
	input.Course = strings.TrimSpace(input.Course)
	input.Title = strings.TrimSpace(input.Title)
	input.Description = strings.TrimSpace(input.Description)
	input.DueDate = strings.TrimSpace(input.DueDate)
	if tenantID == "" || teacherID == "" || input.ClassID == "" || input.Title == "" || input.DueDate == "" {
		return domain.Assignment{}, ErrInvalidInput
	}
	if !s.repo.TeacherCanManageClass(ctx, tenantID, teacherID, input.ClassID) {
		return domain.Assignment{}, ErrForbidden
	}
	if _, err := time.Parse("2006-01-02", input.DueDate); err != nil {
		return domain.Assignment{}, ErrInvalidInput
	}
	now := s.clock()
	item := domain.Assignment{
		TenantID:       tenantID,
		ClassID:        input.ClassID,
		Course:         input.Course,
		Title:          input.Title,
		Description:    input.Description,
		DueDate:        input.DueDate,
		CreatedBy:      teacherID,
		CreatedAt:      now,
		UpdatedAt:      now,
		AttachmentKeys: append([]string(nil), input.AttachmentKeys...),
	}
	saved, err := s.repo.CreateAssignment(ctx, item)
	if err != nil {
		return domain.Assignment{}, err
	}
	s.repo.RecordHomeworkAudit(ctx, tenantID, teacherID, "homework.assignment.create", "assignment", saved.ID)
	return saved, nil
}

func (s *Service) ListAssignments(ctx context.Context, tenantID, classID string) ([]domain.Assignment, error) {
	tenantID = strings.TrimSpace(tenantID)
	classID = strings.TrimSpace(classID)
	if tenantID == "" {
		return []domain.Assignment{}, nil
	}
	return s.repo.ListAssignments(ctx, tenantID, classID)
}

func (s *Service) GetAssignment(ctx context.Context, tenantID, assignmentID string) (domain.Assignment, error) {
	tenantID = strings.TrimSpace(tenantID)
	assignmentID = strings.TrimSpace(assignmentID)
	if tenantID == "" || assignmentID == "" {
		return domain.Assignment{}, ErrNotFound
	}
	item, found, err := s.repo.GetAssignment(ctx, tenantID, assignmentID)
	if err != nil {
		return domain.Assignment{}, err
	}
	if !found {
		return domain.Assignment{}, ErrNotFound
	}
	return item, nil
}

func (s *Service) SubmitAssignment(ctx context.Context, tenantID, assignmentID, studentID string, input domain.SubmitAssignmentInput) (domain.Submission, error) {
	tenantID = strings.TrimSpace(tenantID)
	assignmentID = strings.TrimSpace(assignmentID)
	studentID = strings.TrimSpace(studentID)
	input.Content = strings.TrimSpace(input.Content)
	input.FileKey = strings.TrimSpace(input.FileKey)
	if tenantID == "" || assignmentID == "" || studentID == "" {
		return domain.Submission{}, ErrInvalidInput
	}
	if input.Content == "" && input.FileKey == "" {
		return domain.Submission{}, ErrInvalidInput
	}
	_, found, err := s.repo.GetAssignment(ctx, tenantID, assignmentID)
	if err != nil {
		return domain.Submission{}, err
	}
	if !found {
		return domain.Submission{}, ErrNotFound
	}
	if !s.repo.StudentCanAccessAssignment(ctx, tenantID, studentID, assignmentID) {
		return domain.Submission{}, ErrForbidden
	}
	now := s.clock()
	submission := domain.Submission{
		TenantID:     tenantID,
		AssignmentID: assignmentID,
		StudentID:    studentID,
		Content:      input.Content,
		FileKey:      input.FileKey,
		SubmittedAt:  now,
	}
	saved, err := s.repo.SubmitAssignment(ctx, submission)
	if err != nil {
		return domain.Submission{}, err
	}
	s.repo.RecordHomeworkAudit(ctx, tenantID, studentID, "homework.submission.create", "submission", saved.ID)
	return saved, nil
}

func (s *Service) StudentCurrentClassID(ctx context.Context, tenantID, studentID string) (string, bool) {
	tenantID = strings.TrimSpace(tenantID)
	studentID = strings.TrimSpace(studentID)
	if tenantID == "" || studentID == "" {
		return "", false
	}
	return s.repo.StudentCurrentClassID(ctx, tenantID, studentID)
}

func (s *Service) StudentCanAccessAssignment(ctx context.Context, tenantID, studentID, assignmentID string) bool {
	tenantID = strings.TrimSpace(tenantID)
	studentID = strings.TrimSpace(studentID)
	assignmentID = strings.TrimSpace(assignmentID)
	if tenantID == "" || studentID == "" || assignmentID == "" {
		return false
	}
	return s.repo.StudentCanAccessAssignment(ctx, tenantID, studentID, assignmentID)
}
