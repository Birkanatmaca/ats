package life

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"ots/backend/internal/domain/identity"
	lifedomain "ots/backend/internal/domain/life"
)

var (
	ErrInvalidInput = errors.New("invalid life input")
	ErrNotFound     = errors.New("life record not found")
	ErrForbidden    = errors.New("life access forbidden")
)

type Repository interface {
	ListLifeMeals(ctx context.Context, tenantID string, filter lifedomain.MealFilter) ([]lifedomain.MealMenu, error)
	CreateLifeMeal(ctx context.Context, tenantID, actorUserID string, input lifedomain.CreateMealInput) (lifedomain.MealMenu, error)
	UpdateLifeMeal(ctx context.Context, tenantID, mealID string, input lifedomain.UpdateMealInput) (lifedomain.MealMenu, error)
	DeleteLifeMeal(ctx context.Context, tenantID, mealID string) error
	ListStudySessions(ctx context.Context, tenantID string) ([]lifedomain.StudySession, error)
	GetStudySession(ctx context.Context, tenantID, sessionID string) (lifedomain.StudySession, bool, error)
	CreateStudySession(ctx context.Context, tenantID, actorUserID string, input lifedomain.CreateStudySessionInput) (lifedomain.StudySession, error)
	UpdateStudySession(ctx context.Context, tenantID, sessionID string, input lifedomain.UpdateStudySessionInput) (lifedomain.StudySession, error)
	UpsertStudySessionAttendance(ctx context.Context, tenantID, sessionID string, input lifedomain.StudyAttendanceInput) (lifedomain.StudyAttendance, error)
	ListClubs(ctx context.Context, tenantID string) ([]lifedomain.Club, error)
	GetClub(ctx context.Context, tenantID, clubID string) (lifedomain.Club, bool, error)
	CreateClub(ctx context.Context, tenantID, actorUserID string, input lifedomain.CreateClubInput) (lifedomain.Club, error)
	UpdateClub(ctx context.Context, tenantID, clubID string, input lifedomain.UpdateClubInput) (lifedomain.Club, error)
	UpsertClubMembership(ctx context.Context, tenantID, clubID string, input lifedomain.ClubMembershipInput) (lifedomain.ClubMembership, error)
	GuardianHasStudent(ctx context.Context, tenantID, guardianUserID, studentID string) bool
	GuardianLifeSummary(ctx context.Context, tenantID, studentID string, filter lifedomain.MealFilter) (lifedomain.GuardianLifeSummary, bool, error)
	NotifyLifeGuardians(ctx context.Context, tenantID, title, body, kind string) (int, error)
	NotifyLifeStudentGuardians(ctx context.Context, tenantID, studentID, title, body, kind string) (int, error)
	RecordOperationalAudit(ctx context.Context, tenantID, actorUserID, action, resourceType, resourceID, metadata string)
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

func (s *Service) Meals(ctx context.Context, tenantID string, filter lifedomain.MealFilter) ([]lifedomain.MealMenu, error) {
	filter = normalizeMealFilter(filter, s.clock)
	return s.repo.ListLifeMeals(ctx, tenantID, filter)
}

func (s *Service) CreateMeal(ctx context.Context, tenantID, actorUserID string, input lifedomain.CreateMealInput) (lifedomain.MealMenu, error) {
	input.Date = normalizeDate(input.Date)
	input.MealType = normalizeMealType(input.MealType)
	input.Title = strings.TrimSpace(input.Title)
	input.Description = strings.TrimSpace(input.Description)
	input.Allergens = normalizeAllergens(input.Allergens)
	if input.Date == "" || input.Title == "" {
		return lifedomain.MealMenu{}, ErrInvalidInput
	}
	meal, err := s.repo.CreateLifeMeal(ctx, tenantID, actorUserID, input)
	if err != nil {
		return lifedomain.MealMenu{}, err
	}
	s.repo.RecordOperationalAudit(ctx, tenantID, actorUserID, "life.meal.create", "meal_menu", meal.ID, fmt.Sprintf(`{"date":"%s","mealType":"%s"}`, meal.Date, meal.MealType))
	_, _ = s.repo.NotifyLifeGuardians(
		ctx,
		tenantID,
		"Yemek menüsü güncellendi",
		fmt.Sprintf("%s için %s menüsü yayınlandı.", meal.Date, meal.Title),
		fmt.Sprintf("life_meal:%s:%s:%d", meal.Date, meal.MealType, s.clock().Unix()),
	)
	return meal, nil
}

func (s *Service) UpdateMeal(ctx context.Context, tenantID, mealID, actorUserID string, input lifedomain.UpdateMealInput) (lifedomain.MealMenu, error) {
	if input.Date != nil {
		value := normalizeDate(*input.Date)
		if value == "" {
			return lifedomain.MealMenu{}, ErrInvalidInput
		}
		input.Date = &value
	}
	if input.MealType != nil {
		value := normalizeMealType(*input.MealType)
		input.MealType = &value
	}
	if input.Title != nil {
		value := strings.TrimSpace(*input.Title)
		if value == "" {
			return lifedomain.MealMenu{}, ErrInvalidInput
		}
		input.Title = &value
	}
	if input.Description != nil {
		value := strings.TrimSpace(*input.Description)
		input.Description = &value
	}
	if input.Allergens != nil {
		value := normalizeAllergens(*input.Allergens)
		input.Allergens = &value
	}
	meal, err := s.repo.UpdateLifeMeal(ctx, tenantID, strings.TrimSpace(mealID), input)
	if err != nil {
		return lifedomain.MealMenu{}, mapNotFound(err)
	}
	s.repo.RecordOperationalAudit(ctx, tenantID, actorUserID, "life.meal.update", "meal_menu", meal.ID, `{}`)
	_, _ = s.repo.NotifyLifeGuardians(
		ctx,
		tenantID,
		"Yemek menüsü güncellendi",
		"Haftalık yemek menüsünde değişiklik var. Detayları uygulamadan kontrol edin.",
		fmt.Sprintf("life_meal_update:%s:%d", meal.ID, s.clock().Unix()),
	)
	return meal, nil
}

func (s *Service) DeleteMeal(ctx context.Context, tenantID, mealID, actorUserID string) error {
	mealID = strings.TrimSpace(mealID)
	if mealID == "" {
		return ErrInvalidInput
	}
	if err := s.repo.DeleteLifeMeal(ctx, tenantID, mealID); err != nil {
		return mapNotFound(err)
	}
	s.repo.RecordOperationalAudit(ctx, tenantID, actorUserID, "life.meal.delete", "meal_menu", mealID, `{}`)
	return nil
}

func (s *Service) StudySessions(ctx context.Context, principal identity.Principal) ([]lifedomain.StudySession, error) {
	items, err := s.repo.ListStudySessions(ctx, principal.TenantID)
	if err != nil {
		return nil, err
	}
	if principal.Role != identity.RoleTeacher {
		return items, nil
	}
	filtered := []lifedomain.StudySession{}
	for _, item := range items {
		if item.TeacherUserID == principal.UserID {
			filtered = append(filtered, item)
		}
	}
	return filtered, nil
}

func (s *Service) CreateStudySession(ctx context.Context, principal identity.Principal, input lifedomain.CreateStudySessionInput) (lifedomain.StudySession, error) {
	if principal.Role != identity.RolePrincipal && principal.Role != identity.RoleSystemAdmin {
		return lifedomain.StudySession{}, ErrForbidden
	}
	input = normalizeStudySessionInput(input)
	if err := validateStudyTime(input.StartsAt, input.EndsAt); err != nil {
		return lifedomain.StudySession{}, err
	}
	if input.Title == "" {
		return lifedomain.StudySession{}, ErrInvalidInput
	}
	session, err := s.repo.CreateStudySession(ctx, principal.TenantID, principal.UserID, input)
	if err != nil {
		return lifedomain.StudySession{}, mapNotFound(err)
	}
	s.repo.RecordOperationalAudit(ctx, principal.TenantID, principal.UserID, "life.study.create", "study_session", session.ID, `{}`)
	return session, nil
}

func (s *Service) UpdateStudySession(ctx context.Context, principal identity.Principal, sessionID string, input lifedomain.UpdateStudySessionInput) (lifedomain.StudySession, error) {
	current, err := s.requireStudySessionWrite(ctx, principal, sessionID)
	if err != nil {
		return lifedomain.StudySession{}, err
	}
	if input.Title != nil && strings.TrimSpace(*input.Title) == "" {
		return lifedomain.StudySession{}, ErrInvalidInput
	}
	if input.Capacity != nil && *input.Capacity <= 0 {
		return lifedomain.StudySession{}, ErrInvalidInput
	}
	input = normalizeStudySessionUpdateInput(input)
	startsAt := current.StartsAt.Format(time.RFC3339)
	endsAt := current.EndsAt.Format(time.RFC3339)
	if input.StartsAt != nil {
		startsAt = *input.StartsAt
	}
	if input.EndsAt != nil {
		endsAt = *input.EndsAt
	}
	if err := validateStudyTime(startsAt, endsAt); err != nil {
		return lifedomain.StudySession{}, err
	}
	session, err := s.repo.UpdateStudySession(ctx, principal.TenantID, strings.TrimSpace(sessionID), input)
	if err != nil {
		return lifedomain.StudySession{}, mapNotFound(err)
	}
	s.repo.RecordOperationalAudit(ctx, principal.TenantID, principal.UserID, "life.study.update", "study_session", session.ID, `{}`)
	return session, nil
}

func (s *Service) RecordStudyAttendance(ctx context.Context, principal identity.Principal, sessionID string, input lifedomain.RecordStudyAttendanceInput) ([]lifedomain.StudyAttendance, error) {
	session, err := s.requireStudySessionWrite(ctx, principal, sessionID)
	if err != nil {
		return nil, err
	}
	if len(input.Records) == 0 {
		return nil, ErrInvalidInput
	}
	out := make([]lifedomain.StudyAttendance, 0, len(input.Records))
	for _, record := range input.Records {
		record.StudentID = strings.TrimSpace(record.StudentID)
		record.Status = normalizeStudyAttendanceStatus(record.Status)
		if record.StudentID == "" {
			return nil, ErrInvalidInput
		}
		created, err := s.repo.UpsertStudySessionAttendance(ctx, principal.TenantID, session.ID, record)
		if err != nil {
			return nil, mapNotFound(err)
		}
		out = append(out, created)
		if created.Status == lifedomain.StudyAbsent {
			_, _ = s.repo.NotifyLifeStudentGuardians(
				ctx,
				principal.TenantID,
				created.StudentID,
				"Etüt devamsızlığı",
				fmt.Sprintf("%s etüdü için devamsızlık kaydı işlendi.", session.Title),
				fmt.Sprintf("life_study_absent:%s:%s:%d", session.ID, created.StudentID, s.clock().Unix()),
			)
		}
	}
	s.repo.RecordOperationalAudit(ctx, principal.TenantID, principal.UserID, "life.study.attendance", "study_session", session.ID, fmt.Sprintf(`{"count":%d}`, len(out)))
	return out, nil
}

func (s *Service) Clubs(ctx context.Context, principal identity.Principal) ([]lifedomain.Club, error) {
	items, err := s.repo.ListClubs(ctx, principal.TenantID)
	if err != nil {
		return nil, err
	}
	if principal.Role != identity.RoleTeacher {
		return items, nil
	}
	filtered := []lifedomain.Club{}
	for _, item := range items {
		if item.AdvisorUserID == principal.UserID {
			filtered = append(filtered, item)
		}
	}
	return filtered, nil
}

func (s *Service) CreateClub(ctx context.Context, principal identity.Principal, input lifedomain.CreateClubInput) (lifedomain.Club, error) {
	if principal.Role != identity.RolePrincipal && principal.Role != identity.RoleSystemAdmin {
		return lifedomain.Club{}, ErrForbidden
	}
	input.Name = strings.TrimSpace(input.Name)
	input.Description = strings.TrimSpace(input.Description)
	input.AdvisorUserID = strings.TrimSpace(input.AdvisorUserID)
	input.Status = normalizeStatus(input.Status)
	if input.Name == "" || input.Capacity <= 0 {
		return lifedomain.Club{}, ErrInvalidInput
	}
	club, err := s.repo.CreateClub(ctx, principal.TenantID, principal.UserID, input)
	if err != nil {
		return lifedomain.Club{}, mapNotFound(err)
	}
	s.repo.RecordOperationalAudit(ctx, principal.TenantID, principal.UserID, "life.club.create", "club", club.ID, `{}`)
	return club, nil
}

func (s *Service) UpdateClub(ctx context.Context, principal identity.Principal, clubID string, input lifedomain.UpdateClubInput) (lifedomain.Club, error) {
	if _, err := s.requireClubWrite(ctx, principal, clubID); err != nil {
		return lifedomain.Club{}, err
	}
	if input.Name != nil {
		value := strings.TrimSpace(*input.Name)
		if value == "" {
			return lifedomain.Club{}, ErrInvalidInput
		}
		input.Name = &value
	}
	if input.Description != nil {
		value := strings.TrimSpace(*input.Description)
		input.Description = &value
	}
	if input.AdvisorUserID != nil {
		value := strings.TrimSpace(*input.AdvisorUserID)
		input.AdvisorUserID = &value
	}
	if input.Capacity != nil && *input.Capacity <= 0 {
		return lifedomain.Club{}, ErrInvalidInput
	}
	if input.Status != nil {
		value := normalizeStatus(*input.Status)
		input.Status = &value
	}
	club, err := s.repo.UpdateClub(ctx, principal.TenantID, strings.TrimSpace(clubID), input)
	if err != nil {
		return lifedomain.Club{}, mapNotFound(err)
	}
	s.repo.RecordOperationalAudit(ctx, principal.TenantID, principal.UserID, "life.club.update", "club", club.ID, `{}`)
	return club, nil
}

func (s *Service) AddClubMembership(ctx context.Context, principal identity.Principal, clubID string, input lifedomain.ClubMembershipInput) (lifedomain.ClubMembership, error) {
	if _, err := s.requireClubWrite(ctx, principal, clubID); err != nil {
		return lifedomain.ClubMembership{}, err
	}
	input.StudentID = strings.TrimSpace(input.StudentID)
	input.Status = normalizeClubMembershipStatus(input.Status)
	if input.StudentID == "" {
		return lifedomain.ClubMembership{}, ErrInvalidInput
	}
	membership, err := s.repo.UpsertClubMembership(ctx, principal.TenantID, strings.TrimSpace(clubID), input)
	if err != nil {
		return lifedomain.ClubMembership{}, mapNotFound(err)
	}
	s.repo.RecordOperationalAudit(ctx, principal.TenantID, principal.UserID, "life.club.membership.upsert", "club_membership", membership.ID, fmt.Sprintf(`{"studentId":"%s","clubId":"%s"}`, membership.StudentID, membership.ClubID))
	_, _ = s.repo.NotifyLifeStudentGuardians(
		ctx,
		principal.TenantID,
		membership.StudentID,
		"Kulüp üyeliği güncellendi",
		fmt.Sprintf("%s için kulüp durumu: %s.", membership.ClubName, membership.Status),
		fmt.Sprintf("life_club_membership:%s:%s:%d", membership.ClubID, membership.StudentID, s.clock().Unix()),
	)
	return membership, nil
}

func (s *Service) GuardianSummary(ctx context.Context, tenantID, guardianUserID, studentID string) (lifedomain.GuardianLifeSummary, error) {
	studentID = strings.TrimSpace(studentID)
	if studentID == "" || !s.repo.GuardianHasStudent(ctx, tenantID, guardianUserID, studentID) {
		return lifedomain.GuardianLifeSummary{}, ErrForbidden
	}
	today := s.clock()
	filter := lifedomain.MealFilter{
		FromDate: today.Format("2006-01-02"),
		ToDate:   today.AddDate(0, 0, 6).Format("2006-01-02"),
	}
	summary, ok, err := s.repo.GuardianLifeSummary(ctx, tenantID, studentID, filter)
	if err != nil {
		return lifedomain.GuardianLifeSummary{}, err
	}
	if !ok {
		return lifedomain.GuardianLifeSummary{}, ErrNotFound
	}
	summary.UpdatedAt = s.clock()
	return summary, nil
}

func (s *Service) requireStudySessionWrite(ctx context.Context, principal identity.Principal, sessionID string) (lifedomain.StudySession, error) {
	session, ok, err := s.repo.GetStudySession(ctx, principal.TenantID, strings.TrimSpace(sessionID))
	if err != nil {
		return lifedomain.StudySession{}, err
	}
	if !ok {
		return lifedomain.StudySession{}, ErrNotFound
	}
	if principal.Role == identity.RoleTeacher && session.TeacherUserID != principal.UserID {
		return lifedomain.StudySession{}, ErrForbidden
	}
	if principal.Role != identity.RolePrincipal && principal.Role != identity.RoleSystemAdmin && principal.Role != identity.RoleTeacher {
		return lifedomain.StudySession{}, ErrForbidden
	}
	return session, nil
}

func (s *Service) requireClubWrite(ctx context.Context, principal identity.Principal, clubID string) (lifedomain.Club, error) {
	club, ok, err := s.repo.GetClub(ctx, principal.TenantID, strings.TrimSpace(clubID))
	if err != nil {
		return lifedomain.Club{}, err
	}
	if !ok {
		return lifedomain.Club{}, ErrNotFound
	}
	if principal.Role == identity.RoleTeacher && club.AdvisorUserID != principal.UserID {
		return lifedomain.Club{}, ErrForbidden
	}
	if principal.Role != identity.RolePrincipal && principal.Role != identity.RoleSystemAdmin && principal.Role != identity.RoleTeacher {
		return lifedomain.Club{}, ErrForbidden
	}
	return club, nil
}

func normalizeMealFilter(filter lifedomain.MealFilter, clock func() time.Time) lifedomain.MealFilter {
	filter.FromDate = normalizeDate(filter.FromDate)
	filter.ToDate = normalizeDate(filter.ToDate)
	if filter.FromDate == "" {
		filter.FromDate = clock().Format("2006-01-02")
	}
	if filter.ToDate == "" {
		filter.ToDate = parseDateOrDefault(filter.FromDate, clock).AddDate(0, 0, 6).Format("2006-01-02")
	}
	return filter
}

func normalizeMealType(value lifedomain.MealType) lifedomain.MealType {
	switch value {
	case lifedomain.MealBreakfast, lifedomain.MealSnack:
		return value
	default:
		return lifedomain.MealLunch
	}
}

func normalizeStatus(value lifedomain.Status) lifedomain.Status {
	switch value {
	case lifedomain.StatusPassive, lifedomain.StatusArchived:
		return value
	default:
		return lifedomain.StatusActive
	}
}

func normalizeStudyAttendanceStatus(value lifedomain.StudyAttendanceStatus) lifedomain.StudyAttendanceStatus {
	switch value {
	case lifedomain.StudyAbsent, lifedomain.StudyExcused:
		return value
	default:
		return lifedomain.StudyAttended
	}
}

func normalizeClubMembershipStatus(value lifedomain.ClubMembershipStatus) lifedomain.ClubMembershipStatus {
	switch value {
	case lifedomain.ClubMembershipWaitlisted, lifedomain.ClubMembershipLeft:
		return value
	default:
		return lifedomain.ClubMembershipActive
	}
}

func normalizeAllergens(input []string) []string {
	out := []string{}
	seen := map[string]struct{}{}
	for _, item := range input {
		value := strings.TrimSpace(item)
		if value == "" {
			continue
		}
		key := strings.ToLower(value)
		if _, exists := seen[key]; exists {
			continue
		}
		seen[key] = struct{}{}
		out = append(out, value)
	}
	return out
}

func normalizeStudySessionInput(input lifedomain.CreateStudySessionInput) lifedomain.CreateStudySessionInput {
	input.SubjectID = strings.TrimSpace(input.SubjectID)
	input.TeacherUserID = strings.TrimSpace(input.TeacherUserID)
	input.ClassID = strings.TrimSpace(input.ClassID)
	input.Title = strings.TrimSpace(input.Title)
	input.StartsAt = strings.TrimSpace(input.StartsAt)
	input.EndsAt = strings.TrimSpace(input.EndsAt)
	input.Status = normalizeStatus(input.Status)
	if input.Capacity <= 0 {
		input.Capacity = 1
	}
	return input
}

func normalizeStudySessionUpdateInput(input lifedomain.UpdateStudySessionInput) lifedomain.UpdateStudySessionInput {
	if input.SubjectID != nil {
		value := strings.TrimSpace(*input.SubjectID)
		input.SubjectID = &value
	}
	if input.TeacherUserID != nil {
		value := strings.TrimSpace(*input.TeacherUserID)
		input.TeacherUserID = &value
	}
	if input.ClassID != nil {
		value := strings.TrimSpace(*input.ClassID)
		input.ClassID = &value
	}
	if input.Title != nil {
		value := strings.TrimSpace(*input.Title)
		input.Title = &value
	}
	if input.StartsAt != nil {
		value := strings.TrimSpace(*input.StartsAt)
		input.StartsAt = &value
	}
	if input.EndsAt != nil {
		value := strings.TrimSpace(*input.EndsAt)
		input.EndsAt = &value
	}
	if input.Status != nil {
		value := normalizeStatus(*input.Status)
		input.Status = &value
	}
	return input
}

func validateStudyTime(startsAt, endsAt string) error {
	start, err := time.Parse(time.RFC3339, startsAt)
	if err != nil {
		return ErrInvalidInput
	}
	end, err := time.Parse(time.RFC3339, endsAt)
	if err != nil {
		return ErrInvalidInput
	}
	if !end.After(start) {
		return ErrInvalidInput
	}
	return nil
}

func normalizeDate(value string) string {
	value = strings.TrimSpace(value)
	if value == "" {
		return ""
	}
	parsed, err := time.Parse("2006-01-02", value)
	if err != nil {
		return ""
	}
	return parsed.Format("2006-01-02")
}

func parseDateOrDefault(value string, clock func() time.Time) time.Time {
	parsed, err := time.Parse("2006-01-02", value)
	if err != nil {
		return clock()
	}
	return parsed
}

func mapNotFound(err error) error {
	if err == nil {
		return nil
	}
	text := strings.ToLower(err.Error())
	if strings.Contains(text, "not found") || strings.Contains(text, "no rows") {
		return ErrNotFound
	}
	return err
}
