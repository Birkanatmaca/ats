package school

import (
	"errors"
	"strings"
)

var (
	ErrClassNotFound        = errors.New("class not found")
	ErrStudentNotFound      = errors.New("student not found")
	ErrTeacherNotFound      = errors.New("teacher not found")
	ErrSubjectNotFound      = errors.New("subject not found")
	ErrAcademicYearNotFound = errors.New("academic year not found")
	ErrTermNotFound         = errors.New("term not found")
	ErrDuplicateCode        = errors.New("duplicate subject code")
	ErrDuplicateNumber      = errors.New("duplicate student number")
	ErrDuplicateTeacher     = errors.New("teacher already linked")
	ErrDuplicateEmail       = errors.New("duplicate email")
	ErrUserNotInTenant      = errors.New("user not in tenant")
	ErrInvalidInput         = errors.New("invalid school input")
	ErrInvalidAnnouncement  = errors.New("invalid announcement")
	ErrAnnouncementNotFound = errors.New("announcement not found")
)

type AcademicYear struct {
	ID       string `json:"id"`
	TenantID string `json:"tenantId"`
	Name     string `json:"name"`
	StartsOn string `json:"startsOn"`
	EndsOn   string `json:"endsOn"`
	IsActive bool   `json:"isActive"`
}

type Term struct {
	ID             string `json:"id"`
	TenantID       string `json:"tenantId"`
	AcademicYearID string `json:"academicYearId"`
	Name           string `json:"name"`
	StartsOn       string `json:"startsOn"`
	EndsOn         string `json:"endsOn"`
	IsActive       bool   `json:"isActive"`
}

type ClassStudentAssignment struct {
	TenantID  string `json:"tenantId"`
	ClassID   string `json:"classId"`
	StudentID string `json:"studentId"`
	StartsOn  string `json:"startsOn"`
}

type CreateClassInput struct {
	Name   string `json:"name"`
	Level  string `json:"level"`
	Branch string `json:"branch"`
}

type UpdateClassInput struct {
	Name   *string `json:"name,omitempty"`
	Level  *string `json:"level,omitempty"`
	Branch *string `json:"branch,omitempty"`
}

type CreateStudentInput struct {
	FirstName     string `json:"firstName"`
	LastName      string `json:"lastName"`
	SchoolNumber  string `json:"schoolNumber"`
	ClassID       string `json:"classId,omitempty"`
	BirthDate     string `json:"birthDate,omitempty"`
	Gender        string `json:"gender,omitempty"`
	Status        string `json:"status,omitempty"`
	GuardianName  string `json:"guardianName,omitempty"`
	GuardianPhone string `json:"guardianPhone,omitempty"`
}

type UpdateStudentInput struct {
	FirstName     *string `json:"firstName,omitempty"`
	LastName      *string `json:"lastName,omitempty"`
	SchoolNumber  *string `json:"schoolNumber,omitempty"`
	ClassID       *string `json:"classId,omitempty"`
	BirthDate     *string `json:"birthDate,omitempty"`
	Gender        *string `json:"gender,omitempty"`
	Status        *string `json:"status,omitempty"`
	GuardianName  *string `json:"guardianName,omitempty"`
	GuardianPhone *string `json:"guardianPhone,omitempty"`
}

type CreateSubjectInput struct {
	Name string `json:"name"`
	Code string `json:"code"`
}

type CreateTeacherInput struct {
	UserID string `json:"userId"`
	Title  string `json:"title"`
}

type UpdateTeacherInput struct {
	Title *string `json:"title,omitempty"`
}

type ProvisionTeacherInput struct {
	Email     string `json:"email"`
	FirstName string `json:"firstName"`
	LastName  string `json:"lastName"`
	Title     string `json:"title"`
}

type ProvisionTeacherResult struct {
	Teacher           Teacher `json:"teacher"`
	Email             string  `json:"email"`
	TemporaryPassword string  `json:"temporaryPassword"`
}

type ProvisionServiceDriverInput struct {
	Email     string `json:"email"`
	FirstName string `json:"firstName"`
	LastName  string `json:"lastName"`
	Phone     string `json:"phone,omitempty"`
	Title     string `json:"title,omitempty"`
}

type ProvisionServiceDriverResult struct {
	UserID            string `json:"userId"`
	ServiceStaffID    string `json:"serviceStaffId"`
	Email             string `json:"email"`
	TemporaryPassword string `json:"temporaryPassword"`
}

type ProvisionGuardianInput struct {
	Email      string   `json:"email"`
	FirstName  string   `json:"firstName"`
	LastName   string   `json:"lastName"`
	StudentIDs []string `json:"studentIds"`
	Relation   string   `json:"relation"`
}

type ProvisionGuardianResult struct {
	UserID            string `json:"userId"`
	Email             string `json:"email"`
	TemporaryPassword string `json:"temporaryPassword"`
	LinkedStudents    int    `json:"linkedStudents"`
}

type ImportStudentRow struct {
	FirstName    string `json:"firstName"`
	LastName     string `json:"lastName"`
	SchoolNumber string `json:"schoolNumber"`
}

type ImportStudentsInput struct {
	ClassID  string             `json:"classId"`
	Students []ImportStudentRow `json:"students"`
}

type ImportStudentsResult struct {
	Created int      `json:"created"`
	Failed  int      `json:"failed"`
	Errors  []string `json:"errors,omitempty"`
}

type AssignClassStudentInput struct {
	StudentID string `json:"studentId"`
	StartsOn  string `json:"startsOn,omitempty"`
}

type CreateAcademicYearInput struct {
	Name     string `json:"name"`
	StartsOn string `json:"startsOn"`
	EndsOn   string `json:"endsOn"`
	IsActive bool   `json:"isActive"`
}

type CreateTermInput struct {
	AcademicYearID string `json:"academicYearId"`
	Name           string `json:"name"`
	StartsOn       string `json:"startsOn"`
	EndsOn         string `json:"endsOn"`
	IsActive       bool   `json:"isActive"`
}

func JoinFullName(firstName, lastName string) string {
	first := strings.TrimSpace(firstName)
	last := strings.TrimSpace(lastName)
	switch {
	case first == "" && last == "":
		return ""
	case first == "":
		return last
	case last == "":
		return first
	default:
		return first + " " + last
	}
}

func NormalizeStudentStatus(status string) string {
	switch strings.ToLower(strings.TrimSpace(status)) {
	case "passive", "inactive", "archived":
		return "passive"
	default:
		return "active"
	}
}

func StudentStatusDB(status string) string {
	if NormalizeStudentStatus(status) == "passive" {
		return "passive"
	}
	return "active"
}
