package postgres

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"

	lifedomain "ots/backend/internal/domain/life"
)

func (s *Store) ListLifeMeals(ctx context.Context, tenantID string, filter lifedomain.MealFilter) ([]lifedomain.MealMenu, error) {
	rows, err := s.db.QueryContext(ctx, `
SELECT id::text, tenant_id::text, to_char(date, 'YYYY-MM-DD'), meal_type, title, description,
       allergens::text, COALESCE(created_by::text, ''), created_at, updated_at
FROM meal_menus
WHERE tenant_id = $1
  AND date >= $2::date
  AND date <= $3::date
ORDER BY date, CASE meal_type WHEN 'breakfast' THEN 1 WHEN 'lunch' THEN 2 WHEN 'snack' THEN 3 ELSE 9 END`, tenantID, filter.FromDate, filter.ToDate)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []lifedomain.MealMenu{}
	for rows.Next() {
		item, ok := scanLifeMeal(rows)
		if ok {
			out = append(out, item)
		}
	}
	return out, rows.Err()
}

func (s *Store) CreateLifeMeal(ctx context.Context, tenantID, actorUserID string, input lifedomain.CreateMealInput) (lifedomain.MealMenu, error) {
	allergens, err := json.Marshal(input.Allergens)
	if err != nil {
		return lifedomain.MealMenu{}, err
	}
	var id string
	err = s.db.QueryRowContext(ctx, `
INSERT INTO meal_menus (tenant_id, date, meal_type, title, description, allergens, created_by)
VALUES ($1::uuid, $2::date, $3, $4, $5, $6::jsonb, NULLIF($7, '')::uuid)
ON CONFLICT (tenant_id, date, meal_type)
DO UPDATE SET title = EXCLUDED.title,
              description = EXCLUDED.description,
              allergens = EXCLUDED.allergens,
              updated_at = now()
RETURNING id::text`, tenantID, input.Date, string(input.MealType), input.Title, input.Description, string(allergens), actorUserID).Scan(&id)
	if err != nil {
		return lifedomain.MealMenu{}, err
	}
	return s.getLifeMeal(ctx, tenantID, id)
}

func (s *Store) UpdateLifeMeal(ctx context.Context, tenantID, mealID string, input lifedomain.UpdateMealInput) (lifedomain.MealMenu, error) {
	current, err := s.getLifeMeal(ctx, tenantID, mealID)
	if err != nil {
		return lifedomain.MealMenu{}, err
	}
	date := current.Date
	mealType := current.MealType
	title := current.Title
	description := current.Description
	allergensValue := current.Allergens
	if input.Date != nil {
		date = *input.Date
	}
	if input.MealType != nil {
		mealType = *input.MealType
	}
	if input.Title != nil {
		title = *input.Title
	}
	if input.Description != nil {
		description = *input.Description
	}
	if input.Allergens != nil {
		allergensValue = *input.Allergens
	}
	allergens, err := json.Marshal(allergensValue)
	if err != nil {
		return lifedomain.MealMenu{}, err
	}
	result, err := s.db.ExecContext(ctx, `
UPDATE meal_menus
SET date = $3::date, meal_type = $4, title = $5, description = $6, allergens = $7::jsonb, updated_at = now()
WHERE tenant_id = $1 AND id = $2::uuid`, tenantID, mealID, date, string(mealType), title, description, string(allergens))
	if err != nil {
		return lifedomain.MealMenu{}, err
	}
	if affected, _ := result.RowsAffected(); affected == 0 {
		return lifedomain.MealMenu{}, errors.New("meal not found")
	}
	return s.getLifeMeal(ctx, tenantID, mealID)
}

func (s *Store) DeleteLifeMeal(ctx context.Context, tenantID, mealID string) error {
	result, err := s.db.ExecContext(ctx, `
DELETE FROM meal_menus
WHERE tenant_id = $1 AND id = $2::uuid`, tenantID, mealID)
	if err != nil {
		return err
	}
	if affected, _ := result.RowsAffected(); affected == 0 {
		return errors.New("meal not found")
	}
	return nil
}

func (s *Store) ListStudySessions(ctx context.Context, tenantID string) ([]lifedomain.StudySession, error) {
	rows, err := s.db.QueryContext(ctx, `
SELECT id::text
FROM study_sessions
WHERE tenant_id = $1 AND status <> 'archived'
ORDER BY starts_at`, tenantID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []lifedomain.StudySession{}
	for rows.Next() {
		var id string
		if err := rows.Scan(&id); err != nil {
			return nil, err
		}
		item, ok, err := s.GetStudySession(ctx, tenantID, id)
		if err != nil {
			return nil, err
		}
		if ok {
			out = append(out, item)
		}
	}
	return out, rows.Err()
}

func (s *Store) GetStudySession(ctx context.Context, tenantID, sessionID string) (lifedomain.StudySession, bool, error) {
	row := s.db.QueryRowContext(ctx, lifeStudySessionSelect(`
WHERE ss.tenant_id = $1 AND ss.id = $2::uuid AND ss.status <> 'archived'`), tenantID, sessionID)
	item, ok := scanLifeStudySession(row)
	if !ok {
		return lifedomain.StudySession{}, false, nil
	}
	if err := s.hydrateLifeStudySession(ctx, tenantID, &item); err != nil {
		return lifedomain.StudySession{}, false, err
	}
	return item, true, nil
}

func (s *Store) CreateStudySession(ctx context.Context, tenantID, _ string, input lifedomain.CreateStudySessionInput) (lifedomain.StudySession, error) {
	var id string
	err := s.db.QueryRowContext(ctx, `
INSERT INTO study_sessions (tenant_id, subject_id, teacher_user_id, class_id, title, starts_at, ends_at, capacity, status)
VALUES ($1::uuid, NULLIF($2, '')::uuid, NULLIF($3, '')::uuid, NULLIF($4, '')::uuid, $5, $6::timestamptz, $7::timestamptz, $8, $9)
RETURNING id::text`,
		tenantID, input.SubjectID, input.TeacherUserID, input.ClassID, input.Title, input.StartsAt, input.EndsAt, input.Capacity, string(input.Status),
	).Scan(&id)
	if err != nil {
		return lifedomain.StudySession{}, err
	}
	item, ok, err := s.GetStudySession(ctx, tenantID, id)
	if err != nil || !ok {
		return lifedomain.StudySession{}, err
	}
	return item, nil
}

func (s *Store) UpdateStudySession(ctx context.Context, tenantID, sessionID string, input lifedomain.UpdateStudySessionInput) (lifedomain.StudySession, error) {
	current, ok, err := s.GetStudySession(ctx, tenantID, sessionID)
	if err != nil {
		return lifedomain.StudySession{}, err
	}
	if !ok {
		return lifedomain.StudySession{}, errors.New("study session not found")
	}
	subjectID := current.SubjectID
	teacherUserID := current.TeacherUserID
	classID := current.ClassID
	title := current.Title
	startsAt := current.StartsAt.Format(timeRFC3339)
	endsAt := current.EndsAt.Format(timeRFC3339)
	capacity := current.Capacity
	status := current.Status
	if input.SubjectID != nil {
		subjectID = *input.SubjectID
	}
	if input.TeacherUserID != nil {
		teacherUserID = *input.TeacherUserID
	}
	if input.ClassID != nil {
		classID = *input.ClassID
	}
	if input.Title != nil {
		title = *input.Title
	}
	if input.StartsAt != nil {
		startsAt = *input.StartsAt
	}
	if input.EndsAt != nil {
		endsAt = *input.EndsAt
	}
	if input.Capacity != nil {
		capacity = *input.Capacity
	}
	if input.Status != nil {
		status = *input.Status
	}
	result, err := s.db.ExecContext(ctx, `
UPDATE study_sessions
SET subject_id = NULLIF($3, '')::uuid,
    teacher_user_id = NULLIF($4, '')::uuid,
    class_id = NULLIF($5, '')::uuid,
    title = $6,
    starts_at = $7::timestamptz,
    ends_at = $8::timestamptz,
    capacity = $9,
    status = $10,
    updated_at = now()
WHERE tenant_id = $1 AND id = $2::uuid AND status <> 'archived'`,
		tenantID, sessionID, subjectID, teacherUserID, classID, title, startsAt, endsAt, capacity, string(status))
	if err != nil {
		return lifedomain.StudySession{}, err
	}
	if affected, _ := result.RowsAffected(); affected == 0 {
		return lifedomain.StudySession{}, errors.New("study session not found")
	}
	item, ok, err := s.GetStudySession(ctx, tenantID, sessionID)
	if err != nil || !ok {
		return lifedomain.StudySession{}, err
	}
	return item, nil
}

func (s *Store) UpsertStudySessionAttendance(ctx context.Context, tenantID, sessionID string, input lifedomain.StudyAttendanceInput) (lifedomain.StudyAttendance, error) {
	session, ok, err := s.GetStudySession(ctx, tenantID, sessionID)
	if err != nil {
		return lifedomain.StudyAttendance{}, err
	}
	if !ok {
		return lifedomain.StudyAttendance{}, errors.New("study session not found")
	}
	if session.ClassID != "" {
		var studentClassID string
		err := s.db.QueryRowContext(ctx, `
SELECT COALESCE(active_class.class_id::text, '')
FROM students st
LEFT JOIN LATERAL (
	SELECT class_id FROM class_students
	WHERE tenant_id = st.tenant_id AND student_id = st.id
	  AND (ends_on IS NULL OR ends_on >= CURRENT_DATE)
	ORDER BY starts_on DESC NULLS LAST
	LIMIT 1
) active_class ON true
WHERE st.tenant_id = $1 AND st.id = $2::uuid AND st.deleted_at IS NULL`, tenantID, input.StudentID).Scan(&studentClassID)
		if errors.Is(err, sql.ErrNoRows) {
			return lifedomain.StudyAttendance{}, errors.New("student not found")
		}
		if err != nil {
			return lifedomain.StudyAttendance{}, err
		}
		if studentClassID != session.ClassID {
			return lifedomain.StudyAttendance{}, errors.New("student not in session class")
		}
	}
	var id string
	err = s.db.QueryRowContext(ctx, `
INSERT INTO study_session_attendance (tenant_id, session_id, student_id, status)
VALUES ($1::uuid, $2::uuid, $3::uuid, $4)
ON CONFLICT (tenant_id, session_id, student_id)
DO UPDATE SET status = EXCLUDED.status, updated_at = now()
RETURNING id::text`, tenantID, sessionID, input.StudentID, string(input.Status)).Scan(&id)
	if err != nil {
		return lifedomain.StudyAttendance{}, err
	}
	return s.getLifeStudyAttendance(ctx, tenantID, id)
}

func (s *Store) ListClubs(ctx context.Context, tenantID string) ([]lifedomain.Club, error) {
	rows, err := s.db.QueryContext(ctx, `
SELECT id::text
FROM clubs
WHERE tenant_id = $1 AND status <> 'archived'
ORDER BY name`, tenantID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []lifedomain.Club{}
	for rows.Next() {
		var id string
		if err := rows.Scan(&id); err != nil {
			return nil, err
		}
		item, ok, err := s.GetClub(ctx, tenantID, id)
		if err != nil {
			return nil, err
		}
		if ok {
			out = append(out, item)
		}
	}
	return out, rows.Err()
}

func (s *Store) GetClub(ctx context.Context, tenantID, clubID string) (lifedomain.Club, bool, error) {
	row := s.db.QueryRowContext(ctx, lifeClubSelect(`
WHERE c.tenant_id = $1 AND c.id = $2::uuid AND c.status <> 'archived'`), tenantID, clubID)
	item, ok := scanLifeClub(row)
	if !ok {
		return lifedomain.Club{}, false, nil
	}
	if err := s.hydrateLifeClub(ctx, tenantID, &item); err != nil {
		return lifedomain.Club{}, false, err
	}
	return item, true, nil
}

func (s *Store) CreateClub(ctx context.Context, tenantID, _ string, input lifedomain.CreateClubInput) (lifedomain.Club, error) {
	var id string
	err := s.db.QueryRowContext(ctx, `
INSERT INTO clubs (tenant_id, name, description, advisor_user_id, capacity, status)
VALUES ($1::uuid, $2, $3, NULLIF($4, '')::uuid, $5, $6)
RETURNING id::text`, tenantID, input.Name, input.Description, input.AdvisorUserID, input.Capacity, string(input.Status)).Scan(&id)
	if err != nil {
		return lifedomain.Club{}, err
	}
	item, ok, err := s.GetClub(ctx, tenantID, id)
	if err != nil || !ok {
		return lifedomain.Club{}, err
	}
	return item, nil
}

func (s *Store) UpdateClub(ctx context.Context, tenantID, clubID string, input lifedomain.UpdateClubInput) (lifedomain.Club, error) {
	current, ok, err := s.GetClub(ctx, tenantID, clubID)
	if err != nil {
		return lifedomain.Club{}, err
	}
	if !ok {
		return lifedomain.Club{}, errors.New("club not found")
	}
	name := current.Name
	description := current.Description
	advisorUserID := current.AdvisorUserID
	capacity := current.Capacity
	status := current.Status
	if input.Name != nil {
		name = *input.Name
	}
	if input.Description != nil {
		description = *input.Description
	}
	if input.AdvisorUserID != nil {
		advisorUserID = *input.AdvisorUserID
	}
	if input.Capacity != nil {
		capacity = *input.Capacity
	}
	if input.Status != nil {
		status = *input.Status
	}
	result, err := s.db.ExecContext(ctx, `
UPDATE clubs
SET name = $3, description = $4, advisor_user_id = NULLIF($5, '')::uuid,
    capacity = $6, status = $7, updated_at = now()
WHERE tenant_id = $1 AND id = $2::uuid AND status <> 'archived'`,
		tenantID, clubID, name, description, advisorUserID, capacity, string(status))
	if err != nil {
		return lifedomain.Club{}, err
	}
	if affected, _ := result.RowsAffected(); affected == 0 {
		return lifedomain.Club{}, errors.New("club not found")
	}
	item, ok, err := s.GetClub(ctx, tenantID, clubID)
	if err != nil || !ok {
		return lifedomain.Club{}, err
	}
	return item, nil
}

func (s *Store) UpsertClubMembership(ctx context.Context, tenantID, clubID string, input lifedomain.ClubMembershipInput) (lifedomain.ClubMembership, error) {
	club, ok, err := s.GetClub(ctx, tenantID, clubID)
	if err != nil {
		return lifedomain.ClubMembership{}, err
	}
	if !ok {
		return lifedomain.ClubMembership{}, errors.New("club not found")
	}
	status := input.Status
	if status == lifedomain.ClubMembershipActive {
		var activeCount int
		if err := s.db.QueryRowContext(ctx, `
SELECT COUNT(*)::int
FROM club_memberships
WHERE tenant_id = $1 AND club_id = $2::uuid AND status = 'active' AND student_id <> $3::uuid`, tenantID, clubID, input.StudentID).Scan(&activeCount); err != nil {
			return lifedomain.ClubMembership{}, err
		}
		if activeCount >= club.Capacity {
			status = lifedomain.ClubMembershipWaitlisted
		}
	}
	var id string
	err = s.db.QueryRowContext(ctx, `
INSERT INTO club_memberships (tenant_id, club_id, student_id, status)
VALUES ($1::uuid, $2::uuid, $3::uuid, $4)
ON CONFLICT (tenant_id, club_id, student_id)
DO UPDATE SET status = EXCLUDED.status, updated_at = now()
RETURNING id::text`, tenantID, clubID, input.StudentID, string(status)).Scan(&id)
	if err != nil {
		return lifedomain.ClubMembership{}, err
	}
	return s.getLifeClubMembership(ctx, tenantID, id)
}

func (s *Store) GuardianLifeSummary(ctx context.Context, tenantID, studentID string, filter lifedomain.MealFilter) (lifedomain.GuardianLifeSummary, bool, error) {
	var summary lifedomain.GuardianLifeSummary
	var classID string
	err := s.db.QueryRowContext(ctx, `
SELECT st.id::text, st.full_name, st.student_number, COALESCE(active_class.class_id::text, ''), COALESCE(c.name, '')
FROM students st
LEFT JOIN LATERAL (
	SELECT class_id FROM class_students
	WHERE tenant_id = st.tenant_id AND student_id = st.id
	  AND (ends_on IS NULL OR ends_on >= CURRENT_DATE)
	ORDER BY starts_on DESC NULLS LAST
	LIMIT 1
) active_class ON true
LEFT JOIN classes c ON c.id = active_class.class_id AND c.tenant_id = st.tenant_id
WHERE st.tenant_id = $1 AND st.id = $2::uuid AND st.deleted_at IS NULL`, tenantID, studentID).Scan(
		&summary.StudentID, &summary.StudentName, &summary.SchoolNumber, &classID, &summary.ClassName,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return lifedomain.GuardianLifeSummary{}, false, nil
	}
	if err != nil {
		return lifedomain.GuardianLifeSummary{}, false, err
	}
	meals, err := s.ListLifeMeals(ctx, tenantID, filter)
	if err != nil {
		return lifedomain.GuardianLifeSummary{}, false, err
	}
	summary.Meals = meals
	summary.StudySessions = []lifedomain.StudySession{}
	rows, err := s.db.QueryContext(ctx, `
SELECT DISTINCT ss.id::text, ss.starts_at
FROM study_sessions ss
LEFT JOIN study_session_attendance ssa ON ssa.session_id = ss.id AND ssa.tenant_id = ss.tenant_id AND ssa.student_id = $2::uuid
WHERE ss.tenant_id = $1
  AND ss.status = 'active'
  AND (ssa.id IS NOT NULL OR (NULLIF($3, '')::uuid IS NOT NULL AND ss.class_id = NULLIF($3, '')::uuid))
ORDER BY ss.starts_at`, tenantID, studentID, classID)
	if err != nil {
		return lifedomain.GuardianLifeSummary{}, false, err
	}
	defer rows.Close()
	for rows.Next() {
		var id string
		var ignored sql.NullTime
		if err := rows.Scan(&id, &ignored); err != nil {
			return lifedomain.GuardianLifeSummary{}, false, err
		}
		session, ok, err := s.GetStudySession(ctx, tenantID, id)
		if err != nil {
			return lifedomain.GuardianLifeSummary{}, false, err
		}
		if ok {
			summary.StudySessions = append(summary.StudySessions, session)
		}
	}
	if err := rows.Err(); err != nil {
		return lifedomain.GuardianLifeSummary{}, false, err
	}
	memberships, err := s.listLifeClubMemberships(ctx, tenantID, "student", studentID)
	if err != nil {
		return lifedomain.GuardianLifeSummary{}, false, err
	}
	summary.ClubMemberships = memberships
	summary.Clubs = []lifedomain.Club{}
	seenClubs := map[string]struct{}{}
	for _, membership := range memberships {
		if membership.Status == lifedomain.ClubMembershipLeft {
			continue
		}
		if _, seen := seenClubs[membership.ClubID]; seen {
			continue
		}
		club, ok, err := s.GetClub(ctx, tenantID, membership.ClubID)
		if err != nil {
			return lifedomain.GuardianLifeSummary{}, false, err
		}
		if ok {
			summary.Clubs = append(summary.Clubs, club)
			seenClubs[membership.ClubID] = struct{}{}
		}
	}
	summary.UpdatedAt = s.clock()
	return summary, true, nil
}

func (s *Store) NotifyLifeGuardians(ctx context.Context, tenantID, title, body, kind string) (int, error) {
	rows, err := s.db.QueryContext(ctx, `
SELECT DISTINCT g.user_id::text
FROM student_guardians sg
JOIN guardians g ON g.id = sg.guardian_id AND g.tenant_id = sg.tenant_id
WHERE sg.tenant_id = $1 AND g.user_id IS NOT NULL`, tenantID)
	if err != nil {
		return 0, err
	}
	defer rows.Close()
	return s.insertLifeNotificationsFromRows(ctx, rows, tenantID, title, body, kind)
}

func (s *Store) NotifyLifeStudentGuardians(ctx context.Context, tenantID, studentID, title, body, kind string) (int, error) {
	rows, err := s.db.QueryContext(ctx, `
SELECT DISTINCT g.user_id::text
FROM student_guardians sg
JOIN guardians g ON g.id = sg.guardian_id AND g.tenant_id = sg.tenant_id
WHERE sg.tenant_id = $1 AND sg.student_id = $2::uuid AND g.user_id IS NOT NULL`, tenantID, studentID)
	if err != nil {
		return 0, err
	}
	defer rows.Close()
	return s.insertLifeNotificationsFromRows(ctx, rows, tenantID, title, body, kind)
}

func (s *Store) getLifeMeal(ctx context.Context, tenantID, mealID string) (lifedomain.MealMenu, error) {
	row := s.db.QueryRowContext(ctx, `
SELECT id::text, tenant_id::text, to_char(date, 'YYYY-MM-DD'), meal_type, title, description,
       allergens::text, COALESCE(created_by::text, ''), created_at, updated_at
FROM meal_menus
WHERE tenant_id = $1 AND id = $2::uuid`, tenantID, mealID)
	item, ok := scanLifeMeal(row)
	if !ok {
		return lifedomain.MealMenu{}, errors.New("meal not found")
	}
	return item, nil
}

func (s *Store) getLifeStudyAttendance(ctx context.Context, tenantID, attendanceID string) (lifedomain.StudyAttendance, error) {
	row := s.db.QueryRowContext(ctx, lifeStudyAttendanceSelect(`
WHERE ssa.tenant_id = $1 AND ssa.id = $2::uuid`), tenantID, attendanceID)
	item, ok := scanLifeStudyAttendance(row)
	if !ok {
		return lifedomain.StudyAttendance{}, errors.New("study attendance not found")
	}
	return item, nil
}

func (s *Store) getLifeClubMembership(ctx context.Context, tenantID, membershipID string) (lifedomain.ClubMembership, error) {
	row := s.db.QueryRowContext(ctx, lifeClubMembershipSelect(`
WHERE cm.tenant_id = $1 AND cm.id = $2::uuid`), tenantID, membershipID)
	item, ok := scanLifeClubMembership(row)
	if !ok {
		return lifedomain.ClubMembership{}, errors.New("club membership not found")
	}
	return item, nil
}

func (s *Store) hydrateLifeStudySession(ctx context.Context, tenantID string, item *lifedomain.StudySession) error {
	rows, err := s.db.QueryContext(ctx, lifeStudyAttendanceSelect(`
WHERE ssa.tenant_id = $1 AND ssa.session_id = $2::uuid
ORDER BY st.full_name`), tenantID, item.ID)
	if err != nil {
		return err
	}
	defer rows.Close()
	item.Attendance = []lifedomain.StudyAttendance{}
	for rows.Next() {
		attendance, ok := scanLifeStudyAttendance(rows)
		if ok {
			item.Attendance = append(item.Attendance, attendance)
		}
	}
	if err := rows.Err(); err != nil {
		return err
	}
	attended := 0
	for _, attendance := range item.Attendance {
		if attendance.Status == lifedomain.StudyAttended {
			attended++
		}
	}
	if item.Capacity > 0 && attended > item.Capacity {
		item.CapacityWarning = fmt.Sprintf("%d/%d etüt kapasitesi aşıldı", attended, item.Capacity)
	}
	return nil
}

func (s *Store) hydrateLifeClub(ctx context.Context, tenantID string, item *lifedomain.Club) error {
	memberships, err := s.listLifeClubMemberships(ctx, tenantID, "club", item.ID)
	if err != nil {
		return err
	}
	item.Memberships = memberships
	active := 0
	for _, membership := range memberships {
		if membership.Status == lifedomain.ClubMembershipActive {
			active++
		}
	}
	if item.Capacity > 0 && active >= item.Capacity {
		item.CapacityWarning = fmt.Sprintf("%d/%d kontenjan dolu", active, item.Capacity)
	}
	return nil
}

func (s *Store) listLifeClubMemberships(ctx context.Context, tenantID, lookupType, lookupID string) ([]lifedomain.ClubMembership, error) {
	where := "cm.club_id = $2::uuid AND cm.status <> 'left'"
	if lookupType == "student" {
		where = "cm.student_id = $2::uuid AND cm.status <> 'left'"
	}
	rows, err := s.db.QueryContext(ctx, lifeClubMembershipSelect("WHERE cm.tenant_id = $1 AND "+where+`
ORDER BY cm.status, st.full_name`), tenantID, lookupID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []lifedomain.ClubMembership{}
	for rows.Next() {
		item, ok := scanLifeClubMembership(rows)
		if ok {
			out = append(out, item)
		}
	}
	return out, rows.Err()
}

func (s *Store) insertLifeNotificationsFromRows(ctx context.Context, rows *sql.Rows, tenantID, title, body, kind string) (int, error) {
	created := 0
	for rows.Next() {
		var userID string
		if err := rows.Scan(&userID); err != nil {
			return created, err
		}
		inserted, err := s.ensureLifeNotification(ctx, tenantID, userID, title, body, kind)
		if err != nil {
			return created, err
		}
		if inserted {
			created++
		}
	}
	return created, rows.Err()
}

func (s *Store) ensureLifeNotification(ctx context.Context, tenantID, userID, title, body, kind string) (bool, error) {
	var exists bool
	if err := s.db.QueryRowContext(ctx, `
SELECT EXISTS(
	SELECT 1 FROM notifications WHERE tenant_id = $1 AND user_id = $2::uuid AND kind = $3
)`, tenantID, userID, kind).Scan(&exists); err != nil {
		return false, err
	}
	if exists {
		return false, nil
	}
	_, err := s.db.ExecContext(ctx, `
INSERT INTO notifications (tenant_id, user_id, title, body, kind)
VALUES ($1::uuid, $2::uuid, $3, $4, $5)`, tenantID, userID, title, body, kind)
	return err == nil, err
}

func lifeStudySessionSelect(where string) string {
	return `
SELECT ss.id::text, ss.tenant_id::text,
       COALESCE(ss.subject_id::text, ''), COALESCE(sub.name, ''),
       COALESCE(ss.teacher_user_id::text, ''), COALESCE(u.full_name, ''),
       COALESCE(ss.class_id::text, ''), COALESCE(c.name, ''),
       ss.title, ss.starts_at, ss.ends_at, ss.capacity, ss.status, ss.created_at, ss.updated_at
FROM study_sessions ss
LEFT JOIN subjects sub ON sub.id = ss.subject_id AND sub.tenant_id = ss.tenant_id
LEFT JOIN users u ON u.id = ss.teacher_user_id
LEFT JOIN classes c ON c.id = ss.class_id AND c.tenant_id = ss.tenant_id
` + where
}

func lifeStudyAttendanceSelect(where string) string {
	return `
SELECT ssa.id::text, ssa.tenant_id::text, ssa.session_id::text, ssa.student_id::text,
       st.full_name, st.student_number,
       COALESCE(active_class.class_id::text, ''), COALESCE(c.name, ''),
       ssa.status, ssa.created_at, ssa.updated_at
FROM study_session_attendance ssa
JOIN students st ON st.id = ssa.student_id AND st.tenant_id = ssa.tenant_id
LEFT JOIN LATERAL (
	SELECT class_id FROM class_students
	WHERE tenant_id = st.tenant_id AND student_id = st.id
	  AND (ends_on IS NULL OR ends_on >= CURRENT_DATE)
	ORDER BY starts_on DESC NULLS LAST
	LIMIT 1
) active_class ON true
LEFT JOIN classes c ON c.id = active_class.class_id AND c.tenant_id = st.tenant_id
` + where
}

func lifeClubSelect(where string) string {
	return `
SELECT c.id::text, c.tenant_id::text, c.name, c.description,
       COALESCE(c.advisor_user_id::text, ''), COALESCE(u.full_name, ''),
       c.capacity, c.status, c.created_at, c.updated_at
FROM clubs c
LEFT JOIN users u ON u.id = c.advisor_user_id
` + where
}

func lifeClubMembershipSelect(where string) string {
	return `
SELECT cm.id::text, cm.tenant_id::text, cm.club_id::text, cl.name,
       cm.student_id::text, st.full_name, st.student_number,
       COALESCE(active_class.class_id::text, ''), COALESCE(c.name, ''),
       cm.status, cm.created_at, cm.updated_at
FROM club_memberships cm
JOIN clubs cl ON cl.id = cm.club_id AND cl.tenant_id = cm.tenant_id
JOIN students st ON st.id = cm.student_id AND st.tenant_id = cm.tenant_id
LEFT JOIN LATERAL (
	SELECT class_id FROM class_students
	WHERE tenant_id = st.tenant_id AND student_id = st.id
	  AND (ends_on IS NULL OR ends_on >= CURRENT_DATE)
	ORDER BY starts_on DESC NULLS LAST
	LIMIT 1
) active_class ON true
LEFT JOIN classes c ON c.id = active_class.class_id AND c.tenant_id = st.tenant_id
` + where
}

func scanLifeMeal(row scanner) (lifedomain.MealMenu, bool) {
	var item lifedomain.MealMenu
	var mealType string
	var allergens string
	err := row.Scan(&item.ID, &item.TenantID, &item.Date, &mealType, &item.Title, &item.Description, &allergens, &item.CreatedBy, &item.CreatedAt, &item.UpdatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return lifedomain.MealMenu{}, false
	}
	if err != nil {
		return lifedomain.MealMenu{}, false
	}
	item.MealType = lifedomain.MealType(mealType)
	item.Allergens = []string{}
	_ = json.Unmarshal([]byte(allergens), &item.Allergens)
	return item, true
}

func scanLifeStudySession(row scanner) (lifedomain.StudySession, bool) {
	var item lifedomain.StudySession
	var status string
	err := row.Scan(
		&item.ID, &item.TenantID,
		&item.SubjectID, &item.SubjectName,
		&item.TeacherUserID, &item.TeacherName,
		&item.ClassID, &item.ClassName,
		&item.Title, &item.StartsAt, &item.EndsAt, &item.Capacity, &status, &item.CreatedAt, &item.UpdatedAt,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return lifedomain.StudySession{}, false
	}
	if err != nil {
		return lifedomain.StudySession{}, false
	}
	item.Status = lifedomain.Status(status)
	item.Attendance = []lifedomain.StudyAttendance{}
	return item, true
}

func scanLifeStudyAttendance(row scanner) (lifedomain.StudyAttendance, bool) {
	var item lifedomain.StudyAttendance
	var status string
	err := row.Scan(
		&item.ID, &item.TenantID, &item.SessionID, &item.StudentID,
		&item.StudentName, &item.SchoolNumber, &item.ClassID, &item.ClassName,
		&status, &item.CreatedAt, &item.UpdatedAt,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return lifedomain.StudyAttendance{}, false
	}
	if err != nil {
		return lifedomain.StudyAttendance{}, false
	}
	item.Status = lifedomain.StudyAttendanceStatus(status)
	return item, true
}

func scanLifeClub(row scanner) (lifedomain.Club, bool) {
	var item lifedomain.Club
	var status string
	err := row.Scan(&item.ID, &item.TenantID, &item.Name, &item.Description, &item.AdvisorUserID, &item.AdvisorName, &item.Capacity, &status, &item.CreatedAt, &item.UpdatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return lifedomain.Club{}, false
	}
	if err != nil {
		return lifedomain.Club{}, false
	}
	item.Status = lifedomain.Status(status)
	item.Memberships = []lifedomain.ClubMembership{}
	return item, true
}

func scanLifeClubMembership(row scanner) (lifedomain.ClubMembership, bool) {
	var item lifedomain.ClubMembership
	var status string
	err := row.Scan(
		&item.ID, &item.TenantID, &item.ClubID, &item.ClubName,
		&item.StudentID, &item.StudentName, &item.SchoolNumber,
		&item.ClassID, &item.ClassName, &status, &item.CreatedAt, &item.UpdatedAt,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return lifedomain.ClubMembership{}, false
	}
	if err != nil {
		return lifedomain.ClubMembership{}, false
	}
	item.Status = lifedomain.ClubMembershipStatus(status)
	return item, true
}

const timeRFC3339 = "2006-01-02T15:04:05Z07:00"
