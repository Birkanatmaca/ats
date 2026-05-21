package school

import (
	"context"
	"errors"
	"strings"

	domain "ots/backend/internal/domain/school"
)

type Repository interface {
	CurrentTenant(ctx context.Context, tenantID string) (domain.Tenant, bool)
	ListAnnouncements(ctx context.Context, tenantID string) []domain.Announcement
	CreateAnnouncement(ctx context.Context, tenantID string, createdBy string, input domain.CreateAnnouncementInput) (domain.Announcement, bool)
	UpdateAnnouncement(ctx context.Context, tenantID string, announcementID string, input domain.UpdateAnnouncementInput) (domain.Announcement, bool)
	PrincipalRoster(ctx context.Context, tenantID string) (domain.PrincipalRoster, error)

	ListClasses(ctx context.Context, tenantID string) ([]domain.PrincipalRosterClass, error)
	CreateClass(ctx context.Context, tenantID string, input domain.CreateClassInput) (domain.PrincipalRosterClass, error)
	UpdateClass(ctx context.Context, tenantID string, classID string, input domain.UpdateClassInput) (domain.PrincipalRosterClass, error)

	ListStudents(ctx context.Context, tenantID string) ([]domain.PrincipalRosterStudent, error)
	CreateStudent(ctx context.Context, tenantID string, input domain.CreateStudentInput) (domain.PrincipalRosterStudent, error)
	UpdateStudent(ctx context.Context, tenantID string, studentID string, input domain.UpdateStudentInput) (domain.PrincipalRosterStudent, error)

	ListSubjects(ctx context.Context, tenantID string) ([]domain.Subject, error)
	CreateSubject(ctx context.Context, tenantID string, input domain.CreateSubjectInput) (domain.Subject, error)

	ListTeachers(ctx context.Context, tenantID string) ([]domain.Teacher, error)
	CreateTeacher(ctx context.Context, tenantID string, input domain.CreateTeacherInput) (domain.Teacher, error)
	ProvisionTeacher(ctx context.Context, tenantID string, input domain.ProvisionTeacherInput) (domain.ProvisionTeacherResult, error)
	ProvisionGuardian(ctx context.Context, tenantID string, input domain.ProvisionGuardianInput) (domain.ProvisionGuardianResult, error)
	ResetTeacherPassword(ctx context.Context, tenantID string, teacherID string) (string, error)
	UpdateTeacher(ctx context.Context, tenantID string, teacherID string, input domain.UpdateTeacherInput) (domain.Teacher, error)

	ImportStudents(ctx context.Context, tenantID string, input domain.ImportStudentsInput) (domain.ImportStudentsResult, error)

	AssignClassStudent(ctx context.Context, tenantID string, classID string, input domain.AssignClassStudentInput) (domain.ClassStudentAssignment, error)

	ListAcademicYears(ctx context.Context, tenantID string) ([]domain.AcademicYear, error)
	CreateAcademicYear(ctx context.Context, tenantID string, input domain.CreateAcademicYearInput) (domain.AcademicYear, error)
	ListTerms(ctx context.Context, tenantID string) ([]domain.Term, error)
	CreateTerm(ctx context.Context, tenantID string, input domain.CreateTermInput) (domain.Term, error)
}

var (
	ErrClassNotFound        = domain.ErrClassNotFound
	ErrStudentNotFound      = domain.ErrStudentNotFound
	ErrTeacherNotFound      = domain.ErrTeacherNotFound
	ErrSubjectNotFound      = domain.ErrSubjectNotFound
	ErrAcademicYearNotFound = domain.ErrAcademicYearNotFound
	ErrTermNotFound         = domain.ErrTermNotFound
	ErrDuplicateCode        = domain.ErrDuplicateCode
	ErrDuplicateNumber      = domain.ErrDuplicateNumber
	ErrDuplicateTeacher     = domain.ErrDuplicateTeacher
	ErrDuplicateEmail       = domain.ErrDuplicateEmail
	ErrUserNotInTenant      = domain.ErrUserNotInTenant
	ErrInvalidInput         = domain.ErrInvalidInput
	ErrInvalidAnnouncement  = domain.ErrInvalidAnnouncement
	ErrAnnouncementNotFound = domain.ErrAnnouncementNotFound
)

type Service struct {
	repo Repository
}

func NewService(repo Repository) *Service {
	return &Service{repo: repo}
}

func (s *Service) CurrentTenant(ctx context.Context, tenantID string) (domain.Tenant, bool) {
	return s.repo.CurrentTenant(ctx, tenantID)
}

func (s *Service) ListAnnouncements(ctx context.Context, tenantID string) []domain.Announcement {
	return s.repo.ListAnnouncements(ctx, tenantID)
}

func (s *Service) CreateAnnouncement(ctx context.Context, tenantID string, createdBy string, input domain.CreateAnnouncementInput) (domain.Announcement, error) {
	if strings.TrimSpace(input.Title) == "" || strings.TrimSpace(input.Body) == "" || strings.TrimSpace(input.Audience) == "" {
		return domain.Announcement{}, ErrInvalidAnnouncement
	}
	item, ok := s.repo.CreateAnnouncement(ctx, tenantID, createdBy, input)
	if !ok {
		return domain.Announcement{}, errors.New("announcement create failed")
	}
	return item, nil
}

func (s *Service) UpdateAnnouncement(ctx context.Context, tenantID string, announcementID string, input domain.UpdateAnnouncementInput) (domain.Announcement, error) {
	if input.Title == nil && input.Body == nil && input.Audience == nil {
		return domain.Announcement{}, ErrInvalidAnnouncement
	}
	if input.Title != nil && strings.TrimSpace(*input.Title) == "" {
		return domain.Announcement{}, ErrInvalidAnnouncement
	}
	if input.Body != nil && strings.TrimSpace(*input.Body) == "" {
		return domain.Announcement{}, ErrInvalidAnnouncement
	}
	if input.Audience != nil && strings.TrimSpace(*input.Audience) == "" {
		return domain.Announcement{}, ErrInvalidAnnouncement
	}
	item, ok := s.repo.UpdateAnnouncement(ctx, tenantID, announcementID, input)
	if !ok {
		return domain.Announcement{}, ErrAnnouncementNotFound
	}
	return item, nil
}

func (s *Service) PrincipalRoster(ctx context.Context, tenantID string) (domain.PrincipalRoster, error) {
	return s.repo.PrincipalRoster(ctx, tenantID)
}

func (s *Service) ListClasses(ctx context.Context, tenantID string) ([]domain.PrincipalRosterClass, error) {
	return s.repo.ListClasses(ctx, tenantID)
}

func (s *Service) CreateClass(ctx context.Context, tenantID string, input domain.CreateClassInput) (domain.PrincipalRosterClass, error) {
	if strings.TrimSpace(input.Name) == "" {
		return domain.PrincipalRosterClass{}, ErrInvalidInput
	}
	if strings.TrimSpace(input.Level) == "" {
		input.Level = "Genel"
	}
	return s.repo.CreateClass(ctx, tenantID, input)
}

func (s *Service) UpdateClass(ctx context.Context, tenantID string, classID string, input domain.UpdateClassInput) (domain.PrincipalRosterClass, error) {
	if strings.TrimSpace(classID) == "" {
		return domain.PrincipalRosterClass{}, ErrInvalidInput
	}
	if input.Name != nil && strings.TrimSpace(*input.Name) == "" {
		return domain.PrincipalRosterClass{}, ErrInvalidInput
	}
	item, err := s.repo.UpdateClass(ctx, tenantID, classID, input)
	if errors.Is(err, domain.ErrClassNotFound) {
		return domain.PrincipalRosterClass{}, ErrClassNotFound
	}
	return item, err
}

func (s *Service) ListStudents(ctx context.Context, tenantID string) ([]domain.PrincipalRosterStudent, error) {
	return s.repo.ListStudents(ctx, tenantID)
}

func (s *Service) CreateStudent(ctx context.Context, tenantID string, input domain.CreateStudentInput) (domain.PrincipalRosterStudent, error) {
	if strings.TrimSpace(input.SchoolNumber) == "" {
		return domain.PrincipalRosterStudent{}, ErrInvalidInput
	}
	if domain.JoinFullName(input.FirstName, input.LastName) == "" {
		return domain.PrincipalRosterStudent{}, ErrInvalidInput
	}
	item, err := s.repo.CreateStudent(ctx, tenantID, input)
	if errors.Is(err, domain.ErrDuplicateNumber) {
		return domain.PrincipalRosterStudent{}, ErrDuplicateNumber
	}
	if errors.Is(err, domain.ErrClassNotFound) {
		return domain.PrincipalRosterStudent{}, ErrClassNotFound
	}
	return item, err
}

func (s *Service) UpdateStudent(ctx context.Context, tenantID string, studentID string, input domain.UpdateStudentInput) (domain.PrincipalRosterStudent, error) {
	if strings.TrimSpace(studentID) == "" {
		return domain.PrincipalRosterStudent{}, ErrInvalidInput
	}
	if input.SchoolNumber != nil && strings.TrimSpace(*input.SchoolNumber) == "" {
		return domain.PrincipalRosterStudent{}, ErrInvalidInput
	}
	item, err := s.repo.UpdateStudent(ctx, tenantID, studentID, input)
	if errors.Is(err, domain.ErrStudentNotFound) {
		return domain.PrincipalRosterStudent{}, ErrStudentNotFound
	}
	if errors.Is(err, domain.ErrDuplicateNumber) {
		return domain.PrincipalRosterStudent{}, ErrDuplicateNumber
	}
	if errors.Is(err, domain.ErrClassNotFound) {
		return domain.PrincipalRosterStudent{}, ErrClassNotFound
	}
	return item, err
}

func (s *Service) ListSubjects(ctx context.Context, tenantID string) ([]domain.Subject, error) {
	return s.repo.ListSubjects(ctx, tenantID)
}

func (s *Service) CreateSubject(ctx context.Context, tenantID string, input domain.CreateSubjectInput) (domain.Subject, error) {
	if strings.TrimSpace(input.Name) == "" || strings.TrimSpace(input.Code) == "" {
		return domain.Subject{}, ErrInvalidInput
	}
	item, err := s.repo.CreateSubject(ctx, tenantID, input)
	if errors.Is(err, domain.ErrDuplicateCode) {
		return domain.Subject{}, ErrDuplicateCode
	}
	return item, err
}

func (s *Service) ListTeachers(ctx context.Context, tenantID string) ([]domain.Teacher, error) {
	return s.repo.ListTeachers(ctx, tenantID)
}

func (s *Service) CreateTeacher(ctx context.Context, tenantID string, input domain.CreateTeacherInput) (domain.Teacher, error) {
	if strings.TrimSpace(input.UserID) == "" {
		return domain.Teacher{}, ErrInvalidInput
	}
	item, err := s.repo.CreateTeacher(ctx, tenantID, input)
	if errors.Is(err, domain.ErrDuplicateTeacher) {
		return domain.Teacher{}, ErrDuplicateTeacher
	}
	if errors.Is(err, domain.ErrUserNotInTenant) {
		return domain.Teacher{}, ErrUserNotInTenant
	}
	return item, err
}

func (s *Service) ProvisionTeacher(ctx context.Context, tenantID string, input domain.ProvisionTeacherInput) (domain.ProvisionTeacherResult, error) {
	email := strings.ToLower(strings.TrimSpace(input.Email))
	if email == "" || !strings.Contains(email, "@") {
		return domain.ProvisionTeacherResult{}, ErrInvalidInput
	}
	if domain.JoinFullName(input.FirstName, input.LastName) == "" {
		return domain.ProvisionTeacherResult{}, ErrInvalidInput
	}
	result, err := s.repo.ProvisionTeacher(ctx, tenantID, input)
	if errors.Is(err, domain.ErrDuplicateEmail) {
		return domain.ProvisionTeacherResult{}, ErrDuplicateEmail
	}
	return result, err
}

func (s *Service) ProvisionGuardian(ctx context.Context, tenantID string, input domain.ProvisionGuardianInput) (domain.ProvisionGuardianResult, error) {
	email := strings.ToLower(strings.TrimSpace(input.Email))
	if email == "" || !strings.Contains(email, "@") {
		return domain.ProvisionGuardianResult{}, ErrInvalidInput
	}
	if domain.JoinFullName(input.FirstName, input.LastName) == "" {
		return domain.ProvisionGuardianResult{}, ErrInvalidInput
	}
	if len(input.StudentIDs) == 0 {
		return domain.ProvisionGuardianResult{}, ErrInvalidInput
	}
	result, err := s.repo.ProvisionGuardian(ctx, tenantID, input)
	if errors.Is(err, domain.ErrDuplicateEmail) {
		return domain.ProvisionGuardianResult{}, ErrDuplicateEmail
	}
	if errors.Is(err, domain.ErrStudentNotFound) {
		return domain.ProvisionGuardianResult{}, ErrStudentNotFound
	}
	return result, err
}

func (s *Service) ResetTeacherPassword(ctx context.Context, tenantID string, teacherID string) (string, error) {
	if strings.TrimSpace(teacherID) == "" {
		return "", ErrInvalidInput
	}
	temp, err := s.repo.ResetTeacherPassword(ctx, tenantID, teacherID)
	if errors.Is(err, domain.ErrTeacherNotFound) {
		return "", ErrTeacherNotFound
	}
	return temp, err
}

func (s *Service) UpdateTeacher(ctx context.Context, tenantID string, teacherID string, input domain.UpdateTeacherInput) (domain.Teacher, error) {
	if strings.TrimSpace(teacherID) == "" {
		return domain.Teacher{}, ErrInvalidInput
	}
	item, err := s.repo.UpdateTeacher(ctx, tenantID, teacherID, input)
	if errors.Is(err, domain.ErrTeacherNotFound) {
		return domain.Teacher{}, ErrTeacherNotFound
	}
	return item, err
}

func (s *Service) AssignClassStudent(ctx context.Context, tenantID string, classID string, input domain.AssignClassStudentInput) (domain.ClassStudentAssignment, error) {
	if strings.TrimSpace(classID) == "" || strings.TrimSpace(input.StudentID) == "" {
		return domain.ClassStudentAssignment{}, ErrInvalidInput
	}
	item, err := s.repo.AssignClassStudent(ctx, tenantID, classID, input)
	if errors.Is(err, domain.ErrClassNotFound) {
		return domain.ClassStudentAssignment{}, ErrClassNotFound
	}
	if errors.Is(err, domain.ErrStudentNotFound) {
		return domain.ClassStudentAssignment{}, ErrStudentNotFound
	}
	return item, err
}

func (s *Service) ImportStudents(ctx context.Context, tenantID string, input domain.ImportStudentsInput) (domain.ImportStudentsResult, error) {
	if strings.TrimSpace(input.ClassID) == "" || len(input.Students) == 0 {
		return domain.ImportStudentsResult{}, ErrInvalidInput
	}
	return s.repo.ImportStudents(ctx, tenantID, input)
}

func (s *Service) ListAcademicYears(ctx context.Context, tenantID string) ([]domain.AcademicYear, error) {
	return s.repo.ListAcademicYears(ctx, tenantID)
}

func (s *Service) CreateAcademicYear(ctx context.Context, tenantID string, input domain.CreateAcademicYearInput) (domain.AcademicYear, error) {
	if strings.TrimSpace(input.Name) == "" || strings.TrimSpace(input.StartsOn) == "" || strings.TrimSpace(input.EndsOn) == "" {
		return domain.AcademicYear{}, ErrInvalidInput
	}
	return s.repo.CreateAcademicYear(ctx, tenantID, input)
}

func (s *Service) ListTerms(ctx context.Context, tenantID string) ([]domain.Term, error) {
	return s.repo.ListTerms(ctx, tenantID)
}

func (s *Service) CreateTerm(ctx context.Context, tenantID string, input domain.CreateTermInput) (domain.Term, error) {
	if strings.TrimSpace(input.Name) == "" || strings.TrimSpace(input.AcademicYearID) == "" ||
		strings.TrimSpace(input.StartsOn) == "" || strings.TrimSpace(input.EndsOn) == "" {
		return domain.Term{}, ErrInvalidInput
	}
	item, err := s.repo.CreateTerm(ctx, tenantID, input)
	if errors.Is(err, domain.ErrAcademicYearNotFound) {
		return domain.Term{}, ErrAcademicYearNotFound
	}
	return item, err
}
