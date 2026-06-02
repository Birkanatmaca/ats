package memory

import (
	"context"
	"fmt"
	"sort"
	"strings"
	"time"

	"ots/backend/internal/domain/identity"
	"ots/backend/internal/domain/school"
	superadmindomain "ots/backend/internal/domain/superadmin"
)

func (s *Store) ListClasses(_ context.Context, tenantID string) ([]school.PrincipalRosterClass, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	if tenantID != s.tenant.ID {
		return []school.PrincipalRosterClass{}, nil
	}
	now := s.clock()
	out := make([]school.PrincipalRosterClass, 0, len(s.classes))
	for _, class := range s.classes {
		out = append(out, school.PrincipalRosterClass{ID: class.ID, Name: class.Name, CreatedAt: now})
	}
	sort.Slice(out, func(i, j int) bool { return out[i].Name < out[j].Name })
	return out, nil
}

func (s *Store) CreateClass(_ context.Context, tenantID string, input school.CreateClassInput) (school.PrincipalRosterClass, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if tenantID != s.tenant.ID {
		return school.PrincipalRosterClass{}, school.ErrClassNotFound
	}
	now := s.clock()
	class := school.Class{
		ID:       fmt.Sprintf("class-%d", len(s.classes)+1),
		TenantID: tenantID,
		Name:     strings.TrimSpace(input.Name),
		Level:    strings.TrimSpace(input.Level),
		Branch:   strings.TrimSpace(input.Branch),
	}
	if class.Level == "" {
		class.Level = "Genel"
	}
	s.classes = append(s.classes, class)
	return school.PrincipalRosterClass{ID: class.ID, Name: class.Name, CreatedAt: now}, nil
}

func (s *Store) UpdateClass(_ context.Context, tenantID string, classID string, input school.UpdateClassInput) (school.PrincipalRosterClass, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if tenantID != s.tenant.ID {
		return school.PrincipalRosterClass{}, school.ErrClassNotFound
	}
	for i := range s.classes {
		if s.classes[i].ID != classID {
			continue
		}
		if input.Name != nil {
			s.classes[i].Name = strings.TrimSpace(*input.Name)
		}
		if input.Level != nil {
			s.classes[i].Level = strings.TrimSpace(*input.Level)
		}
		if input.Branch != nil {
			s.classes[i].Branch = strings.TrimSpace(*input.Branch)
		}
		return school.PrincipalRosterClass{ID: s.classes[i].ID, Name: s.classes[i].Name, CreatedAt: s.clock()}, nil
	}
	return school.PrincipalRosterClass{}, school.ErrClassNotFound
}

func (s *Store) ListStudentsPage(_ context.Context, tenantID, query string, offset, limit int) ([]school.PrincipalRosterStudent, int, error) {
	all, err := s.ListStudents(context.Background(), tenantID)
	if err != nil {
		return nil, 0, err
	}
	q := strings.ToLower(strings.TrimSpace(query))
	filtered := all
	if q != "" {
		filtered = make([]school.PrincipalRosterStudent, 0)
		for _, item := range all {
			name := strings.ToLower(strings.TrimSpace(item.FirstName + " " + item.LastName))
			if strings.Contains(name, q) || strings.Contains(strings.ToLower(item.SchoolNumber), q) {
				filtered = append(filtered, item)
			}
		}
	}
	total := len(filtered)
	if offset >= total {
		return []school.PrincipalRosterStudent{}, total, nil
	}
	end := offset + limit
	if end > total {
		end = total
	}
	return filtered[offset:end], total, nil
}

func (s *Store) ListStudents(_ context.Context, tenantID string) ([]school.PrincipalRosterStudent, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	if tenantID != s.tenant.ID {
		return []school.PrincipalRosterStudent{}, nil
	}
	now := s.clock()
	out := make([]school.PrincipalRosterStudent, 0, len(s.students))
	for _, student := range s.students {
		out = append(out, memoryStudentToRoster(student, s.studentMeta[student.ID], now))
	}
	sort.Slice(out, func(i, j int) bool { return out[i].SchoolNumber < out[j].SchoolNumber })
	return out, nil
}

func (s *Store) ListStudentsForTeacher(ctx context.Context, tenantID, teacherUserID string) ([]school.PrincipalRosterStudent, error) {
	all, err := s.ListStudents(ctx, tenantID)
	if err != nil {
		return nil, err
	}
	out := make([]school.PrincipalRosterStudent, 0, len(all))
	for _, student := range all {
		if s.TeacherCanObserveStudent(ctx, tenantID, teacherUserID, student.ID) {
			out = append(out, student)
		}
	}
	return out, nil
}

func (s *Store) CreateStudent(_ context.Context, tenantID string, input school.CreateStudentInput) (school.PrincipalRosterStudent, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if tenantID != s.tenant.ID {
		return school.PrincipalRosterStudent{}, school.ErrStudentNotFound
	}
	number := strings.TrimSpace(input.SchoolNumber)
	if memoryStudentNumberExists(s.students, "", number) {
		return school.PrincipalRosterStudent{}, school.ErrDuplicateNumber
	}
	if input.ClassID != "" && !memoryClassExists(s.classes, input.ClassID) {
		return school.PrincipalRosterStudent{}, school.ErrClassNotFound
	}
	now := s.clock()
	student := school.Student{
		ID:        fmt.Sprintf("student-%d", len(s.students)+1),
		TenantID:  tenantID,
		ClassID:   strings.TrimSpace(input.ClassID),
		FullName:  school.JoinFullName(input.FirstName, input.LastName),
		Number:    number,
		Status:    school.StudentStatusDB(input.Status),
		BirthDate: strings.TrimSpace(input.BirthDate),
	}
	s.students = append(s.students, student)
	s.studentMeta[student.ID] = memoryStudentMeta{
		Gender:        strings.TrimSpace(input.Gender),
		GuardianName:  strings.TrimSpace(input.GuardianName),
		GuardianPhone: strings.TrimSpace(input.GuardianPhone),
	}
	return memoryStudentToRoster(student, s.studentMeta[student.ID], now), nil
}

func (s *Store) UpdateStudent(_ context.Context, tenantID string, studentID string, input school.UpdateStudentInput) (school.PrincipalRosterStudent, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if tenantID != s.tenant.ID {
		return school.PrincipalRosterStudent{}, school.ErrStudentNotFound
	}
	for i := range s.students {
		if s.students[i].ID != studentID {
			continue
		}
		current := memoryStudentToRoster(s.students[i], s.studentMeta[studentID], s.clock())
		firstName := current.FirstName
		lastName := current.LastName
		number := current.SchoolNumber
		status := current.Status
		birthDate := current.BirthDate
		classID := current.ClassID
		meta := s.studentMeta[studentID]

		if input.FirstName != nil {
			firstName = strings.TrimSpace(*input.FirstName)
		}
		if input.LastName != nil {
			lastName = strings.TrimSpace(*input.LastName)
		}
		if input.SchoolNumber != nil {
			number = strings.TrimSpace(*input.SchoolNumber)
		}
		if input.Status != nil {
			status = school.NormalizeStudentStatus(*input.Status)
		}
		if input.BirthDate != nil {
			birthDate = strings.TrimSpace(*input.BirthDate)
		}
		if input.ClassID != nil {
			classID = strings.TrimSpace(*input.ClassID)
		}
		if input.Gender != nil {
			meta.Gender = strings.TrimSpace(*input.Gender)
		}
		if input.GuardianName != nil {
			meta.GuardianName = strings.TrimSpace(*input.GuardianName)
		}
		if input.GuardianPhone != nil {
			meta.GuardianPhone = strings.TrimSpace(*input.GuardianPhone)
		}

		if number == "" || school.JoinFullName(firstName, lastName) == "" {
			return school.PrincipalRosterStudent{}, school.ErrInvalidInput
		}
		if memoryStudentNumberExists(s.students, studentID, number) {
			return school.PrincipalRosterStudent{}, school.ErrDuplicateNumber
		}
		if classID != "" && !memoryClassExists(s.classes, classID) {
			return school.PrincipalRosterStudent{}, school.ErrClassNotFound
		}

		s.students[i].FullName = school.JoinFullName(firstName, lastName)
		s.students[i].Number = number
		s.students[i].Status = school.StudentStatusDB(status)
		s.students[i].BirthDate = birthDate
		s.students[i].ClassID = classID
		s.studentMeta[studentID] = meta
		return memoryStudentToRoster(s.students[i], meta, s.clock()), nil
	}
	return school.PrincipalRosterStudent{}, school.ErrStudentNotFound
}

func (s *Store) ListSubjects(_ context.Context, tenantID string) ([]school.Subject, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	if tenantID != s.tenant.ID {
		return []school.Subject{}, nil
	}
	out := append([]school.Subject(nil), s.subjects...)
	sort.Slice(out, func(i, j int) bool { return out[i].Name < out[j].Name })
	return out, nil
}

func (s *Store) CreateSubject(_ context.Context, tenantID string, input school.CreateSubjectInput) (school.Subject, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if tenantID != s.tenant.ID {
		return school.Subject{}, school.ErrSubjectNotFound
	}
	code := strings.ToUpper(strings.TrimSpace(input.Code))
	for _, subject := range s.subjects {
		if subject.Code == code {
			return school.Subject{}, school.ErrDuplicateCode
		}
	}
	item := school.Subject{
		ID:       fmt.Sprintf("subject-%d", len(s.subjects)+1),
		TenantID: tenantID,
		Name:     strings.TrimSpace(input.Name),
		Code:     code,
	}
	s.subjects = append(s.subjects, item)
	return item, nil
}

func (s *Store) ListTeachers(_ context.Context, tenantID string) ([]school.Teacher, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	if tenantID != s.tenant.ID {
		return []school.Teacher{}, nil
	}
	out := append([]school.Teacher(nil), s.teachers...)
	sort.Slice(out, func(i, j int) bool { return out[i].FullName < out[j].FullName })
	return out, nil
}

func (s *Store) CreateTeacher(_ context.Context, tenantID string, input school.CreateTeacherInput) (school.Teacher, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if tenantID != s.tenant.ID {
		return school.Teacher{}, school.ErrTeacherNotFound
	}
	userID := strings.TrimSpace(input.UserID)
	if !memoryTenantUserExists(s.users, tenantID, userID) {
		return school.Teacher{}, school.ErrUserNotInTenant
	}
	for _, teacher := range s.teachers {
		if teacher.UserID == userID {
			return school.Teacher{}, school.ErrDuplicateTeacher
		}
	}
	fullName := memoryUserFullName(s.users, userID)
	item := school.Teacher{
		ID:       fmt.Sprintf("teacher-profile-%d", len(s.teachers)+1),
		UserID:   userID,
		TenantID: tenantID,
		FullName: fullName,
		Title:    strings.TrimSpace(input.Title),
	}
	s.teachers = append(s.teachers, item)
	return item, nil
}

func (s *Store) UpdateTeacher(_ context.Context, tenantID string, teacherID string, input school.UpdateTeacherInput) (school.Teacher, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if tenantID != s.tenant.ID {
		return school.Teacher{}, school.ErrTeacherNotFound
	}
	for i := range s.teachers {
		if s.teachers[i].ID != teacherID {
			continue
		}
		if input.Title != nil {
			s.teachers[i].Title = strings.TrimSpace(*input.Title)
		}
		return s.teachers[i], nil
	}
	return school.Teacher{}, school.ErrTeacherNotFound
}

func (s *Store) AssignClassStudent(_ context.Context, tenantID string, classID string, input school.AssignClassStudentInput) (school.ClassStudentAssignment, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if tenantID != s.tenant.ID {
		return school.ClassStudentAssignment{}, school.ErrClassNotFound
	}
	if !memoryClassExists(s.classes, classID) {
		return school.ClassStudentAssignment{}, school.ErrClassNotFound
	}
	studentID := strings.TrimSpace(input.StudentID)
	found := false
	for i := range s.students {
		if s.students[i].ID == studentID {
			s.students[i].ClassID = classID
			found = true
			break
		}
	}
	if !found {
		return school.ClassStudentAssignment{}, school.ErrStudentNotFound
	}
	startsOn := strings.TrimSpace(input.StartsOn)
	if startsOn == "" {
		startsOn = s.clock().UTC().Format("2006-01-02")
	}
	return school.ClassStudentAssignment{
		TenantID:  tenantID,
		ClassID:   classID,
		StudentID: studentID,
		StartsOn:  startsOn,
	}, nil
}

func (s *Store) ListAcademicYears(_ context.Context, tenantID string) ([]school.AcademicYear, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	if tenantID != s.tenant.ID {
		return []school.AcademicYear{}, nil
	}
	return append([]school.AcademicYear(nil), s.academicYears...), nil
}

func (s *Store) CreateAcademicYear(_ context.Context, tenantID string, input school.CreateAcademicYearInput) (school.AcademicYear, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if tenantID != s.tenant.ID {
		return school.AcademicYear{}, school.ErrAcademicYearNotFound
	}
	item := school.AcademicYear{
		ID:       fmt.Sprintf("ay-%d", len(s.academicYears)+1),
		TenantID: tenantID,
		Name:     strings.TrimSpace(input.Name),
		StartsOn: strings.TrimSpace(input.StartsOn),
		EndsOn:   strings.TrimSpace(input.EndsOn),
		IsActive: input.IsActive,
	}
	s.academicYears = append(s.academicYears, item)
	return item, nil
}

func (s *Store) ListTerms(_ context.Context, tenantID string) ([]school.Term, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	if tenantID != s.tenant.ID {
		return []school.Term{}, nil
	}
	return append([]school.Term(nil), s.terms...), nil
}

func (s *Store) CreateTerm(_ context.Context, tenantID string, input school.CreateTermInput) (school.Term, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if tenantID != s.tenant.ID {
		return school.Term{}, school.ErrTermNotFound
	}
	yearID := strings.TrimSpace(input.AcademicYearID)
	found := false
	for _, year := range s.academicYears {
		if year.ID == yearID {
			found = true
			break
		}
	}
	if !found {
		return school.Term{}, school.ErrAcademicYearNotFound
	}
	item := school.Term{
		ID:             fmt.Sprintf("term-%d", len(s.terms)+1),
		TenantID:       tenantID,
		AcademicYearID: yearID,
		Name:           strings.TrimSpace(input.Name),
		StartsOn:       strings.TrimSpace(input.StartsOn),
		EndsOn:         strings.TrimSpace(input.EndsOn),
		IsActive:       input.IsActive,
	}
	s.terms = append(s.terms, item)
	return item, nil
}

func memoryStudentToRoster(student school.Student, meta memoryStudentMeta, now time.Time) school.PrincipalRosterStudent {
	first, last := splitMemoryFullName(student.FullName)
	sectionID := ""
	if student.ClassID != "" {
		sectionID = student.ClassID + "-default"
	}
	status := school.NormalizeStudentStatus(student.Status)
	if status == "" {
		status = "active"
	}
	return school.PrincipalRosterStudent{
		ID:            student.ID,
		ClassID:       student.ClassID,
		SectionID:     sectionID,
		SchoolNumber:  student.Number,
		FirstName:     first,
		LastName:      last,
		Gender:        meta.Gender,
		BirthDate:     student.BirthDate,
		GuardianName:  meta.GuardianName,
		GuardianPhone: meta.GuardianPhone,
		Status:        status,
		CreatedAt:     now,
	}
}

func memoryClassExists(classes []school.Class, classID string) bool {
	for _, class := range classes {
		if class.ID == classID {
			return true
		}
	}
	return false
}

func memoryStudentNumberExists(students []school.Student, studentID, number string) bool {
	for _, student := range students {
		if student.Number == number && student.ID != studentID {
			return true
		}
	}
	return false
}

func memoryTenantUserExists(users []systemUser, tenantID, userID string) bool {
	for _, user := range users {
		if user.TenantID == tenantID && user.ID == userID {
			return true
		}
	}
	return false
}

func memoryUserFullName(users []systemUser, userID string) string {
	for _, user := range users {
		if user.ID == userID {
			return user.FullName
		}
	}
	return ""
}

func (s *Store) ProvisionTeacher(ctx context.Context, tenantID string, input school.ProvisionTeacherInput) (school.ProvisionTeacherResult, error) {
	email := strings.ToLower(strings.TrimSpace(input.Email))
	for _, user := range s.users {
		if strings.ToLower(user.Email) == email {
			return school.ProvisionTeacherResult{}, school.ErrDuplicateEmail
		}
	}
	cred, err := s.CreateInstitutionUser(ctx, identity.Principal{TenantID: tenantID}, tenantID, superadmindomain.CreateInstitutionUserInput{
		Email:    email,
		FullName: school.JoinFullName(input.FirstName, input.LastName),
		Role:     string(identity.RoleTeacher),
	})
	if err != nil {
		return school.ProvisionTeacherResult{}, err
	}
	teacher, err := s.CreateTeacher(ctx, tenantID, school.CreateTeacherInput{UserID: cred.User.ID, Title: input.Title})
	if err != nil {
		return school.ProvisionTeacherResult{}, err
	}
	return school.ProvisionTeacherResult{Teacher: teacher, Email: email, TemporaryPassword: cred.TemporaryPassword}, nil
}

func (s *Store) ProvisionGuardian(ctx context.Context, tenantID string, input school.ProvisionGuardianInput) (school.ProvisionGuardianResult, error) {
	email := strings.ToLower(strings.TrimSpace(input.Email))
	relation := strings.TrimSpace(input.Relation)
	if relation == "" {
		relation = "Veli"
	}

	s.mu.Lock()
	for _, user := range s.users {
		if strings.ToLower(user.Email) == email {
			s.mu.Unlock()
			return school.ProvisionGuardianResult{}, school.ErrDuplicateEmail
		}
	}
	for _, studentID := range input.StudentIDs {
		if _, ok := s.studentByID(strings.TrimSpace(studentID)); !ok {
			s.mu.Unlock()
			return school.ProvisionGuardianResult{}, school.ErrStudentNotFound
		}
	}
	s.mu.Unlock()

	cred, err := s.CreateInstitutionUser(ctx, identity.Principal{TenantID: tenantID}, tenantID, superadmindomain.CreateInstitutionUserInput{
		Email:    email,
		FullName: school.JoinFullName(input.FirstName, input.LastName),
		Role:     string(identity.RoleGuardian),
	})
	if err != nil {
		return school.ProvisionGuardianResult{}, err
	}

	s.mu.Lock()
	defer s.mu.Unlock()
	linked := 0
	for _, studentID := range input.StudentIDs {
		studentID = strings.TrimSpace(studentID)
		if studentID == "" {
			continue
		}
		s.studentGuardians = append(s.studentGuardians, memoryStudentGuardian{
			GuardianUserID: cred.User.ID,
			StudentID:      studentID,
			Relation:       relation,
		})
		linked++
	}
	return school.ProvisionGuardianResult{
		UserID:            cred.User.ID,
		Email:             email,
		TemporaryPassword: cred.TemporaryPassword,
		LinkedStudents:    linked,
	}, nil
}

func (s *Store) ResetTeacherPassword(_ context.Context, tenantID string, teacherID string) (string, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if tenantID != s.tenant.ID {
		return "", school.ErrTeacherNotFound
	}
	var userID string
	for _, teacher := range s.teachers {
		if teacher.ID == teacherID {
			userID = teacher.UserID
			break
		}
	}
	if userID == "" {
		return "", school.ErrTeacherNotFound
	}
	tempPassword := "OtsTemp!2026"
	for index := range s.users {
		if s.users[index].ID != userID {
			continue
		}
		salt := fmt.Sprintf("memory-%d", s.clock().UnixNano())
		s.users[index].PasswordSalt = salt
		s.users[index].PasswordHash = hashPassword(salt, tempPassword)
		s.users[index].MustChangePassword = true
		return tempPassword, nil
	}
	return "", identity.ErrUserNotFound
}

func (s *Store) ImportStudents(ctx context.Context, tenantID string, input school.ImportStudentsInput) (school.ImportStudentsResult, error) {
	if !memoryClassExists(s.classes, input.ClassID) {
		return school.ImportStudentsResult{}, school.ErrClassNotFound
	}
	result := school.ImportStudentsResult{}
	for index, row := range input.Students {
		_, err := s.CreateStudent(ctx, tenantID, school.CreateStudentInput{
			FirstName: row.FirstName, LastName: row.LastName, SchoolNumber: row.SchoolNumber, ClassID: input.ClassID, Status: "active",
		})
		if err != nil {
			result.Failed++
			result.Errors = append(result.Errors, fmt.Sprintf("Satır %d: %v", index+1, err))
			continue
		}
		result.Created++
	}
	return result, nil
}
