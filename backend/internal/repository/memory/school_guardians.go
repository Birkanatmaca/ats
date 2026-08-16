package memory

import (
	"context"
	"fmt"
	"strings"

	schooldomain "ots/backend/internal/domain/school"
)

func (s *Store) ListManagedGuardians(_ context.Context, tenantID string) ([]schooldomain.ManagedGuardian, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := make([]schooldomain.ManagedGuardian, 0)
	for _, profile := range s.guardianProfiles {
		if profile.TenantID != tenantID {
			continue
		}
		out = append(out, s.buildManagedGuardianLocked(profile))
	}
	return out, nil
}

func (s *Store) GetManagedGuardian(_ context.Context, tenantID, guardianID string) (schooldomain.ManagedGuardian, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	profile, ok := s.guardianProfileByIDLocked(tenantID, guardianID)
	if !ok {
		return schooldomain.ManagedGuardian{}, false
	}
	return s.buildManagedGuardianLocked(profile), true
}

func (s *Store) UpdateManagedGuardian(_ context.Context, tenantID, guardianID string, input schooldomain.UpdateManagedGuardianInput) (schooldomain.ManagedGuardian, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	index, ok := s.guardianProfileIndexLocked(tenantID, guardianID)
	if !ok {
		return schooldomain.ManagedGuardian{}, schooldomain.ErrGuardianNotFound
	}
	profile := s.guardianProfiles[index]
	if input.FirstName != nil || input.LastName != nil {
		first, last := splitManagedGuardianName(profile.FullName)
		if input.FirstName != nil {
			first = strings.TrimSpace(*input.FirstName)
		}
		if input.LastName != nil {
			last = strings.TrimSpace(*input.LastName)
		}
		fullName := schooldomain.JoinFullName(first, last)
		if fullName == "" {
			return schooldomain.ManagedGuardian{}, schooldomain.ErrInvalidInput
		}
		profile.FullName = fullName
		for i := range s.users {
			if s.users[i].ID == profile.UserID {
				s.users[i].FullName = fullName
				break
			}
		}
	}
	if input.Phone != nil {
		profile.Phone = strings.TrimSpace(*input.Phone)
	}
	s.guardianProfiles[index] = profile
	return s.buildManagedGuardianLocked(profile), nil
}

func (s *Store) SetManagedGuardianStatus(_ context.Context, tenantID, guardianID, status string) (schooldomain.ManagedGuardian, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	index, ok := s.guardianProfileIndexLocked(tenantID, guardianID)
	if !ok {
		return schooldomain.ManagedGuardian{}, schooldomain.ErrGuardianNotFound
	}
	profile := s.guardianProfiles[index]
	for i := range s.users {
		if s.users[i].ID != profile.UserID {
			continue
		}
		if status == "active" {
			s.users[i].Status = "active"
		} else {
			s.users[i].Status = "passive"
		}
		break
	}
	return s.buildManagedGuardianLocked(profile), nil
}

func (s *Store) ResetManagedGuardianPassword(_ context.Context, tenantID, guardianID string) (string, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	profile, ok := s.guardianProfileByIDLocked(tenantID, guardianID)
	if !ok {
		return "", schooldomain.ErrGuardianNotFound
	}
	tempPassword := "OtsTemp!2026"
	for i := range s.users {
		if s.users[i].ID == profile.UserID {
			s.users[i].MustChangePassword = true
			break
		}
	}
	return tempPassword, nil
}

func (s *Store) LinkManagedGuardianStudent(_ context.Context, tenantID, guardianID string, input schooldomain.LinkManagedGuardianStudentInput) (schooldomain.ManagedGuardian, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	profile, ok := s.guardianProfileByIDLocked(tenantID, guardianID)
	if !ok {
		return schooldomain.ManagedGuardian{}, schooldomain.ErrGuardianNotFound
	}
	studentID := strings.TrimSpace(input.StudentID)
	if _, ok := s.studentByID(studentID); !ok {
		return schooldomain.ManagedGuardian{}, schooldomain.ErrStudentNotFound
	}
	for _, link := range s.studentGuardians {
		if link.GuardianUserID == profile.UserID && link.StudentID == studentID {
			return schooldomain.ManagedGuardian{}, schooldomain.ErrGuardianLinkExists
		}
	}
	relation := strings.TrimSpace(input.Relation)
	if relation == "" {
		relation = "Veli"
	}
	isPrimary := false
	if input.IsPrimary != nil {
		isPrimary = *input.IsPrimary
	}
	if isPrimary {
		for i := range s.studentGuardians {
			if s.studentGuardians[i].StudentID == studentID {
				s.studentGuardians[i].IsPrimary = false
			}
		}
	}
	s.studentGuardians = append(s.studentGuardians, memoryStudentGuardian{
		GuardianUserID: profile.UserID,
		StudentID:      studentID,
		Relation:       relation,
		IsPrimary:      isPrimary,
	})
	return s.buildManagedGuardianLocked(profile), nil
}

func (s *Store) UnlinkManagedGuardianStudent(_ context.Context, tenantID, guardianID, studentID string) (schooldomain.ManagedGuardian, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	profile, ok := s.guardianProfileByIDLocked(tenantID, guardianID)
	if !ok {
		return schooldomain.ManagedGuardian{}, schooldomain.ErrGuardianNotFound
	}
	filtered := make([]memoryStudentGuardian, 0, len(s.studentGuardians))
	for _, link := range s.studentGuardians {
		if link.GuardianUserID == profile.UserID && link.StudentID == studentID {
			continue
		}
		filtered = append(filtered, link)
	}
	s.studentGuardians = filtered
	return s.buildManagedGuardianLocked(profile), nil
}

func (s *Store) guardianProfileByIDLocked(tenantID, guardianID string) (memoryGuardianProfile, bool) {
	index, ok := s.guardianProfileIndexLocked(tenantID, guardianID)
	if !ok {
		return memoryGuardianProfile{}, false
	}
	return s.guardianProfiles[index], true
}

func (s *Store) guardianProfileIndexLocked(tenantID, guardianID string) (int, bool) {
	for index, profile := range s.guardianProfiles {
		if profile.TenantID == tenantID && profile.ID == guardianID {
			return index, true
		}
	}
	return -1, false
}

func (s *Store) guardianProfileByUserIDLocked(tenantID, userID string) (memoryGuardianProfile, bool) {
	for _, profile := range s.guardianProfiles {
		if profile.TenantID == tenantID && profile.UserID == userID {
			return profile, true
		}
	}
	return memoryGuardianProfile{}, false
}

func (s *Store) buildManagedGuardianLocked(profile memoryGuardianProfile) schooldomain.ManagedGuardian {
	firstName, lastName := splitManagedGuardianName(profile.FullName)
	status := "active"
	mustChangePassword := false
	for _, user := range s.users {
		if user.ID != profile.UserID {
			continue
		}
		if user.Status == "passive" {
			status = "passive"
		}
		mustChangePassword = user.MustChangePassword
		break
	}
	students := make([]schooldomain.ManagedGuardianStudent, 0)
	for _, link := range s.studentGuardians {
		if link.GuardianUserID != profile.UserID {
			continue
		}
		student, ok := s.studentByIDLocked(link.StudentID)
		if !ok {
			continue
		}
		className := ""
		if class, ok := s.classByIDLocked(student.ClassID); ok {
			className = class.Name
		}
		students = append(students, schooldomain.ManagedGuardianStudent{
			StudentID:    student.ID,
			StudentName:  student.FullName,
			ClassName:    className,
			SchoolNumber: student.Number,
			Relation:     link.Relation,
			IsPrimary:    link.IsPrimary,
		})
	}
	return schooldomain.ManagedGuardian{
		ID:                 profile.ID,
		TenantID:           profile.TenantID,
		UserID:             profile.UserID,
		Email:              profile.Email,
		FirstName:          firstName,
		LastName:           lastName,
		FullName:           profile.FullName,
		Phone:              profile.Phone,
		Status:             status,
		MustChangePassword: mustChangePassword,
		Students:           students,
		CreatedAt:          profile.CreatedAt,
	}
}

func splitManagedGuardianName(fullName string) (string, string) {
	tokens := strings.Fields(strings.TrimSpace(fullName))
	if len(tokens) == 0 {
		return "", ""
	}
	if len(tokens) == 1 {
		return tokens[0], ""
	}
	return tokens[0], strings.Join(tokens[1:], " ")
}

func (s *Store) ensureGuardianProfileLocked(tenantID, userID, fullName, email string) memoryGuardianProfile {
	if profile, ok := s.guardianProfileByUserIDLocked(tenantID, userID); ok {
		return profile
	}
	profile := memoryGuardianProfile{
		ID:        fmt.Sprintf("guardian-%d", len(s.guardianProfiles)+1),
		TenantID:  tenantID,
		UserID:    userID,
		FullName:  fullName,
		Email:     email,
		CreatedAt: s.clock(),
	}
	s.guardianProfiles = append(s.guardianProfiles, profile)
	return profile
}
