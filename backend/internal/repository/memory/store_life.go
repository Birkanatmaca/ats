package memory

import (
	"context"
	"errors"
	"fmt"
	"sort"
	"strings"
	"time"

	lifedomain "ots/backend/internal/domain/life"
)

func (s *Store) ListLifeMeals(_ context.Context, tenantID string, filter lifedomain.MealFilter) ([]lifedomain.MealMenu, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	if tenantID != s.tenant.ID {
		return []lifedomain.MealMenu{}, nil
	}
	out := []lifedomain.MealMenu{}
	for _, item := range s.lifeMeals {
		if !dateInLifeRange(item.Date, filter) {
			continue
		}
		out = append(out, item)
	}
	sortLifeMeals(out)
	return out, nil
}

func (s *Store) CreateLifeMeal(_ context.Context, tenantID, actorUserID string, input lifedomain.CreateMealInput) (lifedomain.MealMenu, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if tenantID != s.tenant.ID {
		return lifedomain.MealMenu{}, errors.New("tenant not found")
	}
	for index := range s.lifeMeals {
		if s.lifeMeals[index].Date == input.Date && s.lifeMeals[index].MealType == input.MealType {
			s.lifeMeals[index].Title = strings.TrimSpace(input.Title)
			s.lifeMeals[index].Description = strings.TrimSpace(input.Description)
			s.lifeMeals[index].Allergens = append([]string(nil), input.Allergens...)
			s.lifeMeals[index].UpdatedAt = s.clock()
			return s.lifeMeals[index], nil
		}
	}
	now := s.clock()
	item := lifedomain.MealMenu{
		ID:          fmt.Sprintf("meal-menu-%d", len(s.lifeMeals)+1),
		TenantID:    tenantID,
		Date:        input.Date,
		MealType:    input.MealType,
		Title:       strings.TrimSpace(input.Title),
		Description: strings.TrimSpace(input.Description),
		Allergens:   append([]string(nil), input.Allergens...),
		CreatedBy:   actorUserID,
		CreatedAt:   now,
		UpdatedAt:   now,
	}
	s.lifeMeals = append(s.lifeMeals, item)
	return item, nil
}

func (s *Store) UpdateLifeMeal(_ context.Context, tenantID, mealID string, input lifedomain.UpdateMealInput) (lifedomain.MealMenu, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if tenantID != s.tenant.ID {
		return lifedomain.MealMenu{}, errors.New("tenant not found")
	}
	for index := range s.lifeMeals {
		if s.lifeMeals[index].ID != mealID {
			continue
		}
		if input.Date != nil {
			s.lifeMeals[index].Date = *input.Date
		}
		if input.MealType != nil {
			s.lifeMeals[index].MealType = *input.MealType
		}
		if input.Title != nil {
			s.lifeMeals[index].Title = *input.Title
		}
		if input.Description != nil {
			s.lifeMeals[index].Description = *input.Description
		}
		if input.Allergens != nil {
			s.lifeMeals[index].Allergens = append([]string(nil), (*input.Allergens)...)
		}
		s.lifeMeals[index].UpdatedAt = s.clock()
		return s.lifeMeals[index], nil
	}
	return lifedomain.MealMenu{}, errors.New("meal not found")
}

func (s *Store) DeleteLifeMeal(_ context.Context, tenantID, mealID string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	if tenantID != s.tenant.ID {
		return errors.New("tenant not found")
	}
	next := make([]lifedomain.MealMenu, 0, len(s.lifeMeals))
	removed := false
	for _, item := range s.lifeMeals {
		if item.ID == mealID {
			removed = true
			continue
		}
		next = append(next, item)
	}
	if !removed {
		return errors.New("meal not found")
	}
	s.lifeMeals = next
	return nil
}

func (s *Store) ListStudySessions(_ context.Context, tenantID string) ([]lifedomain.StudySession, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	if tenantID != s.tenant.ID {
		return []lifedomain.StudySession{}, nil
	}
	out := make([]lifedomain.StudySession, 0, len(s.studySessions))
	for _, item := range s.studySessions {
		if item.Status == lifedomain.StatusArchived {
			continue
		}
		out = append(out, s.studySessionSnapshotLocked(item))
	}
	sort.Slice(out, func(i, j int) bool { return out[i].StartsAt.Before(out[j].StartsAt) })
	return out, nil
}

func (s *Store) GetStudySession(_ context.Context, tenantID, sessionID string) (lifedomain.StudySession, bool, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	if tenantID != s.tenant.ID {
		return lifedomain.StudySession{}, false, nil
	}
	for _, item := range s.studySessions {
		if item.ID == sessionID && item.Status != lifedomain.StatusArchived {
			return s.studySessionSnapshotLocked(item), true, nil
		}
	}
	return lifedomain.StudySession{}, false, nil
}

func (s *Store) CreateStudySession(_ context.Context, tenantID, _ string, input lifedomain.CreateStudySessionInput) (lifedomain.StudySession, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if tenantID != s.tenant.ID {
		return lifedomain.StudySession{}, errors.New("tenant not found")
	}
	startsAt, endsAt, err := parseLifeSessionTimes(input.StartsAt, input.EndsAt)
	if err != nil {
		return lifedomain.StudySession{}, err
	}
	if input.ClassID != "" {
		if _, ok := s.classByIDLocked(input.ClassID); !ok {
			return lifedomain.StudySession{}, errors.New("class not found")
		}
	}
	now := s.clock()
	item := lifedomain.StudySession{
		ID:            fmt.Sprintf("study-session-%d", len(s.studySessions)+1),
		TenantID:      tenantID,
		SubjectID:     strings.TrimSpace(input.SubjectID),
		TeacherUserID: strings.TrimSpace(input.TeacherUserID),
		ClassID:       strings.TrimSpace(input.ClassID),
		Title:         strings.TrimSpace(input.Title),
		StartsAt:      startsAt,
		EndsAt:        endsAt,
		Capacity:      input.Capacity,
		Status:        input.Status,
		CreatedAt:     now,
		UpdatedAt:     now,
	}
	s.studySessions = append(s.studySessions, item)
	return s.studySessionSnapshotLocked(item), nil
}

func (s *Store) UpdateStudySession(_ context.Context, tenantID, sessionID string, input lifedomain.UpdateStudySessionInput) (lifedomain.StudySession, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if tenantID != s.tenant.ID {
		return lifedomain.StudySession{}, errors.New("tenant not found")
	}
	for index := range s.studySessions {
		if s.studySessions[index].ID != sessionID || s.studySessions[index].Status == lifedomain.StatusArchived {
			continue
		}
		if input.SubjectID != nil {
			s.studySessions[index].SubjectID = *input.SubjectID
		}
		if input.TeacherUserID != nil {
			s.studySessions[index].TeacherUserID = *input.TeacherUserID
		}
		if input.ClassID != nil {
			if *input.ClassID != "" {
				if _, ok := s.classByIDLocked(*input.ClassID); !ok {
					return lifedomain.StudySession{}, errors.New("class not found")
				}
			}
			s.studySessions[index].ClassID = *input.ClassID
		}
		if input.Title != nil {
			s.studySessions[index].Title = *input.Title
		}
		if input.StartsAt != nil {
			value, err := time.Parse(time.RFC3339, *input.StartsAt)
			if err != nil {
				return lifedomain.StudySession{}, err
			}
			s.studySessions[index].StartsAt = value
		}
		if input.EndsAt != nil {
			value, err := time.Parse(time.RFC3339, *input.EndsAt)
			if err != nil {
				return lifedomain.StudySession{}, err
			}
			s.studySessions[index].EndsAt = value
		}
		if input.Capacity != nil {
			s.studySessions[index].Capacity = *input.Capacity
		}
		if input.Status != nil {
			s.studySessions[index].Status = *input.Status
		}
		s.studySessions[index].UpdatedAt = s.clock()
		return s.studySessionSnapshotLocked(s.studySessions[index]), nil
	}
	return lifedomain.StudySession{}, errors.New("study session not found")
}

func (s *Store) UpsertStudySessionAttendance(_ context.Context, tenantID, sessionID string, input lifedomain.StudyAttendanceInput) (lifedomain.StudyAttendance, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if tenantID != s.tenant.ID {
		return lifedomain.StudyAttendance{}, errors.New("tenant not found")
	}
	session, ok := s.studySessionByIDLocked(sessionID)
	if !ok {
		return lifedomain.StudyAttendance{}, errors.New("study session not found")
	}
	student, ok := s.studentByIDLocked(input.StudentID)
	if !ok {
		return lifedomain.StudyAttendance{}, errors.New("student not found")
	}
	if session.ClassID != "" && student.ClassID != session.ClassID {
		return lifedomain.StudyAttendance{}, errors.New("student not in session class")
	}
	for index := range s.studyAttendance {
		if s.studyAttendance[index].SessionID == sessionID && s.studyAttendance[index].StudentID == input.StudentID {
			s.studyAttendance[index].Status = input.Status
			s.studyAttendance[index].UpdatedAt = s.clock()
			return s.studyAttendanceSnapshotLocked(s.studyAttendance[index]), nil
		}
	}
	now := s.clock()
	item := lifedomain.StudyAttendance{
		ID:        fmt.Sprintf("study-attendance-%d", len(s.studyAttendance)+1),
		TenantID:  tenantID,
		SessionID: sessionID,
		StudentID: input.StudentID,
		Status:    input.Status,
		CreatedAt: now,
		UpdatedAt: now,
	}
	s.studyAttendance = append(s.studyAttendance, item)
	return s.studyAttendanceSnapshotLocked(item), nil
}

func (s *Store) ListClubs(_ context.Context, tenantID string) ([]lifedomain.Club, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	if tenantID != s.tenant.ID {
		return []lifedomain.Club{}, nil
	}
	out := make([]lifedomain.Club, 0, len(s.clubs))
	for _, item := range s.clubs {
		if item.Status == lifedomain.StatusArchived {
			continue
		}
		out = append(out, s.clubSnapshotLocked(item))
	}
	sort.Slice(out, func(i, j int) bool { return out[i].Name < out[j].Name })
	return out, nil
}

func (s *Store) GetClub(_ context.Context, tenantID, clubID string) (lifedomain.Club, bool, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	if tenantID != s.tenant.ID {
		return lifedomain.Club{}, false, nil
	}
	for _, item := range s.clubs {
		if item.ID == clubID && item.Status != lifedomain.StatusArchived {
			return s.clubSnapshotLocked(item), true, nil
		}
	}
	return lifedomain.Club{}, false, nil
}

func (s *Store) CreateClub(_ context.Context, tenantID, _ string, input lifedomain.CreateClubInput) (lifedomain.Club, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if tenantID != s.tenant.ID {
		return lifedomain.Club{}, errors.New("tenant not found")
	}
	now := s.clock()
	item := lifedomain.Club{
		ID:            fmt.Sprintf("club-%d", len(s.clubs)+1),
		TenantID:      tenantID,
		Name:          strings.TrimSpace(input.Name),
		Description:   strings.TrimSpace(input.Description),
		AdvisorUserID: strings.TrimSpace(input.AdvisorUserID),
		Capacity:      input.Capacity,
		Status:        input.Status,
		CreatedAt:     now,
		UpdatedAt:     now,
	}
	s.clubs = append(s.clubs, item)
	return s.clubSnapshotLocked(item), nil
}

func (s *Store) UpdateClub(_ context.Context, tenantID, clubID string, input lifedomain.UpdateClubInput) (lifedomain.Club, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if tenantID != s.tenant.ID {
		return lifedomain.Club{}, errors.New("tenant not found")
	}
	for index := range s.clubs {
		if s.clubs[index].ID != clubID || s.clubs[index].Status == lifedomain.StatusArchived {
			continue
		}
		if input.Name != nil {
			s.clubs[index].Name = *input.Name
		}
		if input.Description != nil {
			s.clubs[index].Description = *input.Description
		}
		if input.AdvisorUserID != nil {
			s.clubs[index].AdvisorUserID = *input.AdvisorUserID
		}
		if input.Capacity != nil {
			s.clubs[index].Capacity = *input.Capacity
		}
		if input.Status != nil {
			s.clubs[index].Status = *input.Status
		}
		s.clubs[index].UpdatedAt = s.clock()
		return s.clubSnapshotLocked(s.clubs[index]), nil
	}
	return lifedomain.Club{}, errors.New("club not found")
}

func (s *Store) UpsertClubMembership(_ context.Context, tenantID, clubID string, input lifedomain.ClubMembershipInput) (lifedomain.ClubMembership, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if tenantID != s.tenant.ID {
		return lifedomain.ClubMembership{}, errors.New("tenant not found")
	}
	club, ok := s.clubByIDLocked(clubID)
	if !ok {
		return lifedomain.ClubMembership{}, errors.New("club not found")
	}
	if _, ok := s.studentByIDLocked(input.StudentID); !ok {
		return lifedomain.ClubMembership{}, errors.New("student not found")
	}
	status := input.Status
	if status == lifedomain.ClubMembershipActive && s.clubActiveMembershipCountLocked(clubID, input.StudentID) >= club.Capacity {
		status = lifedomain.ClubMembershipWaitlisted
	}
	for index := range s.clubMemberships {
		if s.clubMemberships[index].ClubID == clubID && s.clubMemberships[index].StudentID == input.StudentID {
			s.clubMemberships[index].Status = status
			s.clubMemberships[index].UpdatedAt = s.clock()
			return s.clubMembershipSnapshotLocked(s.clubMemberships[index]), nil
		}
	}
	now := s.clock()
	item := lifedomain.ClubMembership{
		ID:        fmt.Sprintf("club-membership-%d", len(s.clubMemberships)+1),
		TenantID:  tenantID,
		ClubID:    clubID,
		StudentID: input.StudentID,
		Status:    status,
		CreatedAt: now,
		UpdatedAt: now,
	}
	s.clubMemberships = append(s.clubMemberships, item)
	return s.clubMembershipSnapshotLocked(item), nil
}

func (s *Store) GuardianLifeSummary(_ context.Context, tenantID, studentID string, filter lifedomain.MealFilter) (lifedomain.GuardianLifeSummary, bool, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	if tenantID != s.tenant.ID {
		return lifedomain.GuardianLifeSummary{}, false, nil
	}
	student, ok := s.studentByIDLocked(studentID)
	if !ok {
		return lifedomain.GuardianLifeSummary{}, false, nil
	}
	summary := lifedomain.GuardianLifeSummary{
		StudentID:       student.ID,
		StudentName:     student.FullName,
		SchoolNumber:    student.Number,
		Meals:           []lifedomain.MealMenu{},
		StudySessions:   []lifedomain.StudySession{},
		ClubMemberships: []lifedomain.ClubMembership{},
		Clubs:           []lifedomain.Club{},
		UpdatedAt:       s.clock(),
	}
	if class, ok := s.classByIDLocked(student.ClassID); ok {
		summary.ClassName = class.Name
	}
	for _, meal := range s.lifeMeals {
		if dateInLifeRange(meal.Date, filter) {
			summary.Meals = append(summary.Meals, meal)
		}
	}
	sortLifeMeals(summary.Meals)
	seenSessions := map[string]struct{}{}
	for _, attendance := range s.studyAttendance {
		if attendance.StudentID != studentID {
			continue
		}
		if session, ok := s.studySessionByIDLocked(attendance.SessionID); ok && session.Status == lifedomain.StatusActive {
			summary.StudySessions = append(summary.StudySessions, s.studySessionSnapshotLocked(session))
			seenSessions[session.ID] = struct{}{}
		}
	}
	for _, session := range s.studySessions {
		if session.Status != lifedomain.StatusActive || session.ClassID == "" || session.ClassID != student.ClassID {
			continue
		}
		if _, seen := seenSessions[session.ID]; seen {
			continue
		}
		summary.StudySessions = append(summary.StudySessions, s.studySessionSnapshotLocked(session))
	}
	sort.Slice(summary.StudySessions, func(i, j int) bool {
		return summary.StudySessions[i].StartsAt.Before(summary.StudySessions[j].StartsAt)
	})
	seenClubs := map[string]struct{}{}
	for _, membership := range s.clubMemberships {
		if membership.StudentID != studentID || membership.Status == lifedomain.ClubMembershipLeft {
			continue
		}
		full := s.clubMembershipSnapshotLocked(membership)
		summary.ClubMemberships = append(summary.ClubMemberships, full)
		if _, seen := seenClubs[membership.ClubID]; !seen {
			if club, ok := s.clubByIDLocked(membership.ClubID); ok {
				summary.Clubs = append(summary.Clubs, s.clubSnapshotLocked(club))
				seenClubs[membership.ClubID] = struct{}{}
			}
		}
	}
	return summary, true, nil
}

func (s *Store) NotifyLifeGuardians(_ context.Context, tenantID, title, body, kind string) (int, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if tenantID != s.tenant.ID {
		return 0, errors.New("tenant not found")
	}
	userIDs := map[string]struct{}{}
	for _, link := range s.studentGuardians {
		userIDs[link.GuardianUserID] = struct{}{}
	}
	return s.insertLifeNotificationsLocked(tenantID, userIDs, title, body, kind), nil
}

func (s *Store) NotifyLifeStudentGuardians(_ context.Context, tenantID, studentID, title, body, kind string) (int, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if tenantID != s.tenant.ID {
		return 0, errors.New("tenant not found")
	}
	userIDs := map[string]struct{}{}
	for _, link := range s.studentGuardians {
		if link.StudentID == studentID {
			userIDs[link.GuardianUserID] = struct{}{}
		}
	}
	return s.insertLifeNotificationsLocked(tenantID, userIDs, title, body, kind), nil
}

func (s *Store) studySessionSnapshotLocked(item lifedomain.StudySession) lifedomain.StudySession {
	item.SubjectName = ""
	item.TeacherName = ""
	item.ClassName = ""
	item.Attendance = []lifedomain.StudyAttendance{}
	if subject, ok := s.lifeSubjectByIDLocked(item.SubjectID); ok {
		item.SubjectName = subject.Name
	}
	if teacher, ok := s.teacherByUserID(item.TeacherUserID); ok {
		item.TeacherName = teacher.FullName
	} else if user, ok := s.lifeUserByIDLocked(item.TeacherUserID); ok {
		item.TeacherName = user.FullName
	}
	if class, ok := s.classByIDLocked(item.ClassID); ok {
		item.ClassName = class.Name
	}
	for _, attendance := range s.studyAttendance {
		if attendance.SessionID == item.ID {
			item.Attendance = append(item.Attendance, s.studyAttendanceSnapshotLocked(attendance))
		}
	}
	sort.Slice(item.Attendance, func(i, j int) bool { return item.Attendance[i].StudentName < item.Attendance[j].StudentName })
	activeCount := 0
	for _, attendance := range item.Attendance {
		if attendance.Status == lifedomain.StudyAttended {
			activeCount++
		}
	}
	if item.Capacity > 0 && activeCount > item.Capacity {
		item.CapacityWarning = fmt.Sprintf("%d/%d etüt kapasitesi aşıldı", activeCount, item.Capacity)
	}
	return item
}

func (s *Store) studyAttendanceSnapshotLocked(item lifedomain.StudyAttendance) lifedomain.StudyAttendance {
	if student, ok := s.studentByIDLocked(item.StudentID); ok {
		item.StudentName = student.FullName
		item.SchoolNumber = student.Number
		item.ClassID = student.ClassID
		if class, ok := s.classByIDLocked(student.ClassID); ok {
			item.ClassName = class.Name
		}
	}
	return item
}

func (s *Store) clubSnapshotLocked(item lifedomain.Club) lifedomain.Club {
	item.AdvisorName = ""
	item.Memberships = []lifedomain.ClubMembership{}
	if user, ok := s.lifeUserByIDLocked(item.AdvisorUserID); ok {
		item.AdvisorName = user.FullName
	}
	for _, membership := range s.clubMemberships {
		if membership.ClubID == item.ID && membership.Status != lifedomain.ClubMembershipLeft {
			item.Memberships = append(item.Memberships, s.clubMembershipSnapshotLocked(membership))
		}
	}
	sort.Slice(item.Memberships, func(i, j int) bool {
		if item.Memberships[i].Status == item.Memberships[j].Status {
			return item.Memberships[i].StudentName < item.Memberships[j].StudentName
		}
		return item.Memberships[i].Status < item.Memberships[j].Status
	})
	activeCount := 0
	for _, membership := range item.Memberships {
		if membership.Status == lifedomain.ClubMembershipActive {
			activeCount++
		}
	}
	if item.Capacity > 0 && activeCount >= item.Capacity {
		item.CapacityWarning = fmt.Sprintf("%d/%d kontenjan dolu", activeCount, item.Capacity)
	}
	return item
}

func (s *Store) clubMembershipSnapshotLocked(item lifedomain.ClubMembership) lifedomain.ClubMembership {
	if club, ok := s.clubByIDLocked(item.ClubID); ok {
		item.ClubName = club.Name
	}
	if student, ok := s.studentByIDLocked(item.StudentID); ok {
		item.StudentName = student.FullName
		item.SchoolNumber = student.Number
		item.ClassID = student.ClassID
		if class, ok := s.classByIDLocked(student.ClassID); ok {
			item.ClassName = class.Name
		}
	}
	return item
}

func (s *Store) studySessionByIDLocked(id string) (lifedomain.StudySession, bool) {
	for _, item := range s.studySessions {
		if item.ID == id {
			return item, true
		}
	}
	return lifedomain.StudySession{}, false
}

func (s *Store) clubByIDLocked(id string) (lifedomain.Club, bool) {
	for _, item := range s.clubs {
		if item.ID == id {
			return item, true
		}
	}
	return lifedomain.Club{}, false
}

func (s *Store) clubActiveMembershipCountLocked(clubID, exceptStudentID string) int {
	count := 0
	for _, membership := range s.clubMemberships {
		if membership.ClubID == clubID && membership.StudentID != exceptStudentID && membership.Status == lifedomain.ClubMembershipActive {
			count++
		}
	}
	return count
}

func (s *Store) lifeSubjectByIDLocked(id string) (subjectRef, bool) {
	for _, subject := range s.subjects {
		if subject.ID == id {
			return subjectRef{Name: subject.Name}, true
		}
	}
	return subjectRef{}, false
}

func (s *Store) lifeUserByIDLocked(id string) (systemUser, bool) {
	for _, user := range s.users {
		if user.ID == id {
			return user, true
		}
	}
	return systemUser{}, false
}

func (s *Store) insertLifeNotificationsLocked(tenantID string, userIDs map[string]struct{}, title, body, kind string) int {
	created := 0
	for userID := range userIDs {
		exists := false
		for _, notification := range s.notifications {
			if notification.TenantID == tenantID && notification.UserID == userID && notification.Kind == kind {
				exists = true
				break
			}
		}
		if exists {
			continue
		}
		s.notifications = append(s.notifications, memoryNotification{
			ID:        fmt.Sprintf("notification-%d", len(s.notifications)+1),
			TenantID:  tenantID,
			UserID:    userID,
			Title:     title,
			Body:      body,
			Kind:      kind,
			CreatedAt: s.clock(),
		})
		created++
	}
	return created
}

func dateInLifeRange(date string, filter lifedomain.MealFilter) bool {
	if filter.FromDate != "" && date < filter.FromDate {
		return false
	}
	if filter.ToDate != "" && date > filter.ToDate {
		return false
	}
	return true
}

func sortLifeMeals(items []lifedomain.MealMenu) {
	sort.Slice(items, func(i, j int) bool {
		if items[i].Date == items[j].Date {
			return mealTypeRank(items[i].MealType) < mealTypeRank(items[j].MealType)
		}
		return items[i].Date < items[j].Date
	})
}

func mealTypeRank(value lifedomain.MealType) int {
	switch value {
	case lifedomain.MealBreakfast:
		return 1
	case lifedomain.MealLunch:
		return 2
	case lifedomain.MealSnack:
		return 3
	default:
		return 9
	}
}

func parseLifeSessionTimes(startsAt, endsAt string) (time.Time, time.Time, error) {
	start, err := time.Parse(time.RFC3339, startsAt)
	if err != nil {
		return time.Time{}, time.Time{}, err
	}
	end, err := time.Parse(time.RFC3339, endsAt)
	if err != nil {
		return time.Time{}, time.Time{}, err
	}
	if !end.After(start) {
		return time.Time{}, time.Time{}, errors.New("invalid session time")
	}
	return start, end, nil
}

type subjectRef struct {
	Name string
}
