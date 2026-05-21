package postgres

import (
	"context"
	"errors"
	"fmt"
	"sort"
	"strings"
	"time"

	schedulingdomain "ots/backend/internal/domain/scheduling"
)

type timeSlot struct {
	dayOfWeek int
	start     string
	end       string
}

type requirementNeed struct {
	requirement schedulingdomain.ClassSubjectRequirement
	teacherIDs  []string
}

func (s *Store) ListRequirements(ctx context.Context, tenantID string) []schedulingdomain.ClassSubjectRequirement {
	rows, err := s.db.QueryContext(ctx, `
SELECT csr.id::text, csr.tenant_id::text, csr.class_id::text, c.name,
       csr.subject_id::text, sub.name, csr.weekly_hours
FROM class_subject_requirements csr
JOIN classes c ON c.id = csr.class_id
JOIN subjects sub ON sub.id = csr.subject_id
WHERE csr.tenant_id = $1
ORDER BY c.name, sub.name`, tenantID)
	if err != nil {
		return nil
	}
	defer rows.Close()

	out := make([]schedulingdomain.ClassSubjectRequirement, 0)
	for rows.Next() {
		var item schedulingdomain.ClassSubjectRequirement
		if err := rows.Scan(
			&item.ID, &item.TenantID, &item.ClassID, &item.ClassName,
			&item.SubjectID, &item.SubjectName, &item.WeeklyHours,
		); err != nil {
			continue
		}
		out = append(out, item)
	}
	return out
}

func (s *Store) SaveRequirements(ctx context.Context, tenantID string, items []schedulingdomain.RequirementInput) ([]schedulingdomain.ClassSubjectRequirement, error) {
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer func() { _ = tx.Rollback() }()

	if _, err := tx.ExecContext(ctx, `DELETE FROM class_subject_requirements WHERE tenant_id = $1`, tenantID); err != nil {
		return nil, err
	}

	for _, item := range items {
		if item.ClassID == "" || item.SubjectID == "" || item.WeeklyHours <= 0 {
			continue
		}
		_, err := tx.ExecContext(ctx, `
INSERT INTO class_subject_requirements (tenant_id, class_id, subject_id, weekly_hours)
VALUES ($1, $2, $3, $4)
ON CONFLICT (tenant_id, class_id, subject_id)
DO UPDATE SET weekly_hours = EXCLUDED.weekly_hours`,
			tenantID, item.ClassID, item.SubjectID, item.WeeklyHours)
		if err != nil {
			return nil, err
		}
	}

	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return s.ListRequirements(ctx, tenantID), nil
}

func (s *Store) ListTeacherAvailabilities(ctx context.Context, tenantID string) []schedulingdomain.TeacherAvailability {
	rows, err := s.db.QueryContext(ctx, `
SELECT ta.id::text, ta.tenant_id::text, ta.teacher_id::text, t.user_id::text, u.full_name,
       ta.day_of_week, ta.starts_at::text, ta.ends_at::text, ta.availability_type
FROM teacher_availabilities ta
JOIN teachers t ON t.id = ta.teacher_id
JOIN users u ON u.id = t.user_id
WHERE ta.tenant_id = $1
ORDER BY u.full_name, ta.day_of_week, ta.starts_at`, tenantID)
	if err != nil {
		return nil
	}
	defer rows.Close()

	out := make([]schedulingdomain.TeacherAvailability, 0)
	for rows.Next() {
		var item schedulingdomain.TeacherAvailability
		var startText, endText string
		if err := rows.Scan(
			&item.ID, &item.TenantID, &item.TeacherID, &item.TeacherUserID, &item.TeacherName,
			&item.DayOfWeek, &startText, &endText, &item.AvailabilityType,
		); err != nil {
			continue
		}
		item.StartTime = normalizeTimeText(startText)
		item.EndTime = normalizeTimeText(endText)
		out = append(out, item)
	}
	return out
}

func (s *Store) SaveTeacherAvailabilities(ctx context.Context, tenantID string, items []schedulingdomain.AvailabilityInput) ([]schedulingdomain.TeacherAvailability, error) {
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer func() { _ = tx.Rollback() }()

	if _, err := tx.ExecContext(ctx, `DELETE FROM teacher_availabilities WHERE tenant_id = $1`, tenantID); err != nil {
		return nil, err
	}

	for _, item := range items {
		if item.TeacherID == "" || item.DayOfWeek < 1 || item.DayOfWeek > 7 {
			continue
		}
		availabilityType := strings.TrimSpace(item.AvailabilityType)
		if availabilityType == "" {
			availabilityType = "available"
		}
		startTime := normalizeTimeText(item.StartTime)
		endTime := normalizeTimeText(item.EndTime)
		if startTime == "" || endTime == "" {
			continue
		}
		_, err := tx.ExecContext(ctx, `
INSERT INTO teacher_availabilities (tenant_id, teacher_id, day_of_week, starts_at, ends_at, availability_type)
VALUES ($1, $2, $3, $4::time, $5::time, $6)`,
			tenantID, item.TeacherID, item.DayOfWeek, startTime, endTime, availabilityType)
		if err != nil {
			return nil, err
		}
	}

	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return s.ListTeacherAvailabilities(ctx, tenantID), nil
}

func (s *Store) CurrentSchedule(ctx context.Context, tenantID string) (schedulingdomain.Schedule, bool) {
	var schedule schedulingdomain.Schedule
	var updatedAt time.Time
	err := s.db.QueryRowContext(ctx, `
SELECT id::text, tenant_id::text, name, status, version, COALESCE(score, 0), updated_at
FROM schedules
WHERE tenant_id = $1 AND status = 'published'
ORDER BY published_at DESC NULLS LAST, updated_at DESC
LIMIT 1`, tenantID).Scan(&schedule.ID, &schedule.TenantID, &schedule.Name, &schedule.Status, &schedule.Version, &schedule.Score, &updatedAt)
	if err != nil {
		return schedulingdomain.Schedule{}, false
	}
	schedule.UpdatedAt = updatedAt
	schedule.Lessons = s.listScheduleLessons(ctx, tenantID, schedule.ID)
	return schedule, true
}

func (s *Store) GetSchedule(ctx context.Context, tenantID string, scheduleID string) (schedulingdomain.Schedule, bool) {
	var schedule schedulingdomain.Schedule
	var updatedAt time.Time
	err := s.db.QueryRowContext(ctx, `
SELECT id::text, tenant_id::text, name, status, version, COALESCE(score, 0), updated_at
FROM schedules
WHERE tenant_id = $1 AND id = $2`, tenantID, scheduleID).Scan(
		&schedule.ID, &schedule.TenantID, &schedule.Name, &schedule.Status, &schedule.Version, &schedule.Score, &updatedAt,
	)
	if err != nil {
		return schedulingdomain.Schedule{}, false
	}
	schedule.UpdatedAt = updatedAt
	schedule.Lessons = s.listScheduleLessons(ctx, tenantID, schedule.ID)
	return schedule, true
}

func (s *Store) GenerateDraftSchedule(ctx context.Context, tenantID string) schedulingdomain.GenerationResult {
	if err := s.ensureSchedulingDefaults(ctx, tenantID); err != nil {
		return schedulingdomain.GenerationResult{
			SoftWarnings:   []string{"Program verileri hazırlanamadı."},
			Recommendation: "Sınıf, ders ve öğretmen kayıtlarını kontrol edin.",
		}
	}

	requirements := s.ListRequirements(ctx, tenantID)
	if len(requirements) == 0 {
		return schedulingdomain.GenerationResult{
			SoftWarnings:   []string{"Ders saat ihtiyacı tanımlanmamış."},
			Recommendation: "Önce sınıf ve ders tanımlarını oluşturun.",
		}
	}

	teacherSubjects := s.listTeacherSubjects(ctx, tenantID)
	availabilities := s.buildAvailabilityIndex(ctx, tenantID)
	slots := defaultWeekSlots()
	needs := buildRequirementNeeds(requirements, teacherSubjects)

	classBusy := map[string]map[int]map[string]bool{}
	teacherBusy := map[string]map[int]map[string]bool{}
	assignedLessons := make([]draftLessonInsert, 0)
	unassigned := 0
	warnings := []string{}

	sort.Slice(needs, func(i, j int) bool {
		if needs[i].requirement.WeeklyHours == needs[j].requirement.WeeklyHours {
			return needs[i].requirement.ClassName < needs[j].requirement.ClassName
		}
		return needs[i].requirement.WeeklyHours > needs[j].requirement.WeeklyHours
	})

	for _, need := range needs {
		if len(need.teacherIDs) == 0 {
			unassigned += need.requirement.WeeklyHours
			warnings = append(warnings, fmt.Sprintf("%s / %s için uygun öğretmen bulunamadı.",
				need.requirement.ClassName, need.requirement.SubjectName))
			continue
		}
		placed := 0
		for placed < need.requirement.WeeklyHours {
			slot, teacherID, ok := pickGreedySlot(slots, need, availabilities, classBusy, teacherBusy)
			if !ok {
				unassigned++
				warnings = append(warnings, fmt.Sprintf("%s / %s için yeterli boş slot bulunamadı.",
					need.requirement.ClassName, need.requirement.SubjectName))
				break
			}
			markBusy(classBusy, need.requirement.ClassID, slot.dayOfWeek, slot.start)
			markBusy(teacherBusy, teacherID, slot.dayOfWeek, slot.start)
			assignedLessons = append(assignedLessons, draftLessonInsert{
				classID:   need.requirement.ClassID,
				teacherID: teacherID,
				subjectID: need.requirement.SubjectID,
				dayOfWeek: slot.dayOfWeek,
				startTime: slot.start,
				endTime:   slot.end,
			})
			placed++
		}
	}

	version := 1
	_ = s.db.QueryRowContext(ctx, `
SELECT COALESCE(MAX(version), 0) + 1 FROM schedules WHERE tenant_id = $1`, tenantID).Scan(&version)

	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return schedulingdomain.GenerationResult{HardConflicts: unassigned}
	}
	defer func() { _ = tx.Rollback() }()

	var scheduleID string
	err = tx.QueryRowContext(ctx, `
INSERT INTO schedules (tenant_id, name, status, version, score, updated_at)
VALUES ($1, $2, 'draft', $3, $4, now())
RETURNING id::text`, tenantID, "AI Taslak Program", version, scoreFromAssignments(len(assignedLessons), unassigned)).Scan(&scheduleID)
	if err != nil {
		return schedulingdomain.GenerationResult{HardConflicts: unassigned}
	}

	for _, lesson := range assignedLessons {
		_, err := tx.ExecContext(ctx, `
INSERT INTO schedule_lessons (tenant_id, schedule_id, class_id, teacher_id, subject_id, day_of_week, starts_at, ends_at)
VALUES ($1, $2, $3, $4, $5, $6, $7::time, $8::time)`,
			tenantID, scheduleID, lesson.classID, lesson.teacherID, lesson.subjectID,
			lesson.dayOfWeek, lesson.startTime, lesson.endTime)
		if err != nil {
			return schedulingdomain.GenerationResult{HardConflicts: unassigned + 1}
		}
	}

	if err := tx.Commit(); err != nil {
		return schedulingdomain.GenerationResult{HardConflicts: unassigned}
	}

	schedule, ok := s.GetSchedule(ctx, tenantID, scheduleID)
	if !ok {
		return schedulingdomain.GenerationResult{HardConflicts: unassigned}
	}

	recommendation := "Taslak incelemeye hazır."
	if unassigned > 0 {
		recommendation = "Taslak oluşturuldu ancak bazı ders saatleri atanamadı."
	}
	if len(warnings) == 0 {
		warnings = []string{"Taslak üretildi."}
	}

	return schedulingdomain.GenerationResult{
		Schedule:       schedule,
		HardConflicts:  unassigned,
		SoftWarnings:   warnings,
		Recommendation: recommendation,
	}
}

func (s *Store) UpdateScheduleLesson(ctx context.Context, tenantID string, scheduleID string, lessonID string, input schedulingdomain.UpdateLessonInput) (schedulingdomain.Lesson, bool, error) {
	current, ok := s.GetSchedule(ctx, tenantID, scheduleID)
	if !ok {
		return schedulingdomain.Lesson{}, false, nil
	}
	if current.Status != schedulingdomain.ScheduleDraft {
		return schedulingdomain.Lesson{}, false, errors.New("only draft schedules can be edited")
	}

	var existing schedulingdomain.Lesson
	found := false
	for _, lesson := range current.Lessons {
		if lesson.ID == lessonID {
			existing = lesson
			found = true
			break
		}
	}
	if !found {
		return schedulingdomain.Lesson{}, false, nil
	}

	teacherUserID := existing.TeacherID
	subjectID := existing.SubjectID
	dayOfWeek := existing.DayOfWeek
	startTime := existing.StartTime
	endTime := existing.EndTime
	room := existing.Room

	if input.TeacherID != nil && strings.TrimSpace(*input.TeacherID) != "" {
		teacherUserID = strings.TrimSpace(*input.TeacherID)
	}
	teacherProfileID := s.resolveTeacherProfileID(ctx, tenantID, teacherUserID)
	if teacherProfileID == "" {
		return schedulingdomain.Lesson{}, false, errors.New("teacher not found")
	}
	if input.SubjectID != nil && strings.TrimSpace(*input.SubjectID) != "" {
		subjectID = strings.TrimSpace(*input.SubjectID)
	}
	if input.DayOfWeek != nil {
		dayOfWeek = *input.DayOfWeek
	}
	if input.StartTime != nil && strings.TrimSpace(*input.StartTime) != "" {
		startTime = normalizeTimeText(*input.StartTime)
	}
	if input.EndTime != nil && strings.TrimSpace(*input.EndTime) != "" {
		endTime = normalizeTimeText(*input.EndTime)
	}
	if input.Room != nil {
		room = strings.TrimSpace(*input.Room)
	}

	_, err := s.db.ExecContext(ctx, `
UPDATE schedule_lessons
SET teacher_id = $1, subject_id = $2, day_of_week = $3, starts_at = $4::time, ends_at = $5::time, room = $6
WHERE tenant_id = $7 AND schedule_id = $8 AND id = $9`,
		teacherProfileID, subjectID, dayOfWeek, startTime, endTime, nullString(room),
		tenantID, scheduleID, lessonID)
	if err != nil {
		return schedulingdomain.Lesson{}, false, err
	}

	updated, ok := s.GetSchedule(ctx, tenantID, scheduleID)
	if !ok {
		return schedulingdomain.Lesson{}, false, nil
	}
	for _, lesson := range updated.Lessons {
		if lesson.ID == lessonID {
			return lesson, true, nil
		}
	}
	return schedulingdomain.Lesson{}, false, nil
}

func (s *Store) ValidateSchedule(ctx context.Context, tenantID string, scheduleID string) schedulingdomain.ValidationResult {
	schedule, ok := s.GetSchedule(ctx, tenantID, scheduleID)
	if !ok {
		return schedulingdomain.ValidationResult{
			Valid:         false,
			HardConflicts: []string{"Program bulunamadı."},
		}
	}
	return validateScheduleLessons(schedule.Lessons, s.ListRequirements(ctx, tenantID))
}

func (s *Store) PublishSchedule(ctx context.Context, tenantID string, scheduleID string, actorUserID string) (schedulingdomain.Schedule, bool, error) {
	validation := s.ValidateSchedule(ctx, tenantID, scheduleID)
	if !validation.Valid {
		return schedulingdomain.Schedule{}, false, errors.New("schedule has hard conflicts")
	}

	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return schedulingdomain.Schedule{}, false, err
	}
	defer func() { _ = tx.Rollback() }()

	var status string
	err = tx.QueryRowContext(ctx, `
SELECT status FROM schedules WHERE tenant_id = $1 AND id = $2`, tenantID, scheduleID).Scan(&status)
	if err != nil {
		return schedulingdomain.Schedule{}, false, nil
	}
	if status != string(schedulingdomain.ScheduleDraft) {
		return schedulingdomain.Schedule{}, false, errors.New("only draft schedules can be published")
	}

	_, err = tx.ExecContext(ctx, `
UPDATE schedules SET status = 'published', published_at = now(), updated_at = now()
WHERE tenant_id = $1 AND id = $2`, tenantID, scheduleID)
	if err != nil {
		return schedulingdomain.Schedule{}, false, err
	}

	_, err = tx.ExecContext(ctx, `
UPDATE schedules SET status = 'archived', updated_at = now()
WHERE tenant_id = $1 AND status = 'published' AND id <> $2`, tenantID, scheduleID)
	if err != nil {
		return schedulingdomain.Schedule{}, false, err
	}

	if err := tx.Commit(); err != nil {
		return schedulingdomain.Schedule{}, false, err
	}

	s.writeOperationalAudit(ctx, tenantID, actorUserID, "schedule.publish", "schedule", scheduleID, `{}`)

	schedule, ok := s.GetSchedule(ctx, tenantID, scheduleID)
	return schedule, ok, nil
}

func (s *Store) TeacherCalendar(ctx context.Context, tenantID string, teacherID string) []schedulingdomain.Lesson {
	schedule, ok := s.CurrentSchedule(ctx, tenantID)
	if !ok {
		return nil
	}
	out := []schedulingdomain.Lesson{}
	for _, lesson := range schedule.Lessons {
		if lesson.TeacherID == teacherID {
			out = append(out, lesson)
		}
	}
	sort.Slice(out, func(i, j int) bool {
		if out[i].DayOfWeek == out[j].DayOfWeek {
			return out[i].StartTime < out[j].StartTime
		}
		return out[i].DayOfWeek < out[j].DayOfWeek
	})
	return out
}

func (s *Store) ActiveLessonForTeacher(ctx context.Context, tenantID string, teacherID string, now time.Time) (schedulingdomain.Lesson, bool) {
	for _, lesson := range s.TeacherCalendar(ctx, tenantID, teacherID) {
		startWindow := lesson.StartsAt.Add(-10 * time.Minute)
		endWindow := lesson.EndsAt.Add(10 * time.Minute)
		if !now.Before(startWindow) && !now.After(endWindow) {
			return lesson, true
		}
	}
	return schedulingdomain.Lesson{}, false
}

func (s *Store) listScheduleLessons(ctx context.Context, tenantID string, scheduleID string) []schedulingdomain.Lesson {
	rows, err := s.db.QueryContext(ctx, `
SELECT sl.id::text, sl.tenant_id::text, sl.schedule_id::text, sl.class_id::text, c.name,
       t.user_id::text, u.full_name, sl.subject_id::text, sub.name,
       sl.day_of_week, sl.starts_at::text, sl.ends_at::text, COALESCE(sl.room, '')
FROM schedule_lessons sl
JOIN classes c ON c.id = sl.class_id
JOIN teachers t ON t.id = sl.teacher_id
JOIN users u ON u.id = t.user_id
JOIN subjects sub ON sub.id = sl.subject_id
WHERE sl.tenant_id = $1 AND sl.schedule_id = $2
ORDER BY sl.day_of_week, sl.starts_at`, tenantID, scheduleID)
	if err != nil {
		return nil
	}
	defer rows.Close()

	out := []schedulingdomain.Lesson{}
	for rows.Next() {
		var lesson schedulingdomain.Lesson
		var startText, endText string
		if err := rows.Scan(
			&lesson.ID, &lesson.TenantID, &lesson.ScheduleID, &lesson.ClassID, &lesson.ClassName,
			&lesson.TeacherID, &lesson.TeacherName, &lesson.SubjectID, &lesson.SubjectName,
			&lesson.DayOfWeek, &startText, &endText, &lesson.Room,
		); err != nil {
			continue
		}
		lesson.StartTime = normalizeTimeText(startText)
		lesson.EndTime = normalizeTimeText(endText)
		lesson.StartsAt = lessonTime(s.clock(), lesson.DayOfWeek, lesson.StartTime)
		lesson.EndsAt = lessonTime(s.clock(), lesson.DayOfWeek, lesson.EndTime)
		out = append(out, lesson)
	}
	return out
}

type draftLessonInsert struct {
	classID   string
	teacherID string
	subjectID string
	dayOfWeek int
	startTime string
	endTime   string
}

func (s *Store) ensureSchedulingDefaults(ctx context.Context, tenantID string) error {
	var requirementCount int
	if err := s.db.QueryRowContext(ctx, `
SELECT COUNT(*) FROM class_subject_requirements WHERE tenant_id = $1`, tenantID).Scan(&requirementCount); err != nil {
		return err
	}
	if requirementCount == 0 {
		_, err := s.db.ExecContext(ctx, `
INSERT INTO class_subject_requirements (tenant_id, class_id, subject_id, weekly_hours)
SELECT c.tenant_id, c.id, sub.id, 2
FROM classes c
JOIN subjects sub ON sub.tenant_id = c.tenant_id
WHERE c.tenant_id = $1
ON CONFLICT (tenant_id, class_id, subject_id) DO NOTHING`, tenantID)
		if err != nil {
			return err
		}
	}

	var teacherSubjectCount int
	if err := s.db.QueryRowContext(ctx, `
SELECT COUNT(*) FROM teacher_subjects WHERE tenant_id = $1`, tenantID).Scan(&teacherSubjectCount); err != nil {
		return err
	}
	if teacherSubjectCount == 0 {
		_, err := s.db.ExecContext(ctx, `
INSERT INTO teacher_subjects (tenant_id, teacher_id, subject_id)
SELECT t.tenant_id, t.id, s.id
FROM teachers t
JOIN subjects s ON s.tenant_id = t.tenant_id
WHERE t.tenant_id = $1
AND (
  (s.code = 'MAT' AND lower(t.title) LIKE '%matemat%')
  OR (s.code = 'TRK' AND lower(t.title) LIKE '%türk%')
  OR (s.code = 'FEN' AND lower(t.title) LIKE '%fen%')
  OR (s.code = 'SOS' AND lower(t.title) LIKE '%sosyal%')
  OR (s.code = 'ING' AND lower(t.title) LIKE '%ingiliz%')
  OR (s.code = 'BED' AND lower(t.title) LIKE '%beden%')
  OR (s.code = 'MUZ' AND lower(t.title) LIKE '%müzik%')
  OR (s.code = 'GOR' AND (lower(t.title) LIKE '%görsel%' OR lower(t.title) LIKE '%sanat%'))
)
ON CONFLICT DO NOTHING`, tenantID)
		if err != nil {
			return err
		}

		_, err = s.db.ExecContext(ctx, `
INSERT INTO teacher_subjects (tenant_id, teacher_id, subject_id)
SELECT $1, fallback.teacher_id, s.id
FROM subjects s
JOIN LATERAL (
  SELECT id AS teacher_id
  FROM teachers
  WHERE tenant_id = $1
  ORDER BY id
  LIMIT 1
) fallback ON true
WHERE s.tenant_id = $1
AND NOT EXISTS (
  SELECT 1 FROM teacher_subjects ts
  WHERE ts.tenant_id = $1 AND ts.subject_id = s.id
)
ON CONFLICT DO NOTHING`, tenantID)
		if err != nil {
			return err
		}
	}
	return nil
}

func (s *Store) listTeacherSubjects(ctx context.Context, tenantID string) map[string][]string {
	rows, err := s.db.QueryContext(ctx, `
SELECT subject_id::text, teacher_id::text
FROM teacher_subjects
WHERE tenant_id = $1`, tenantID)
	if err != nil {
		return map[string][]string{}
	}
	defer rows.Close()

	out := map[string][]string{}
	for rows.Next() {
		var subjectID, teacherID string
		if err := rows.Scan(&subjectID, &teacherID); err != nil {
			continue
		}
		out[subjectID] = append(out[subjectID], teacherID)
	}
	return out
}

type availabilityWindow struct {
	dayOfWeek int
	start     string
	end       string
}

func (s *Store) buildAvailabilityIndex(ctx context.Context, tenantID string) map[string][]availabilityWindow {
	items := s.ListTeacherAvailabilities(ctx, tenantID)
	out := map[string][]availabilityWindow{}
	for _, item := range items {
		if item.AvailabilityType != "" && item.AvailabilityType != "available" {
			continue
		}
		out[item.TeacherID] = append(out[item.TeacherID], availabilityWindow{
			dayOfWeek: item.DayOfWeek,
			start:     item.StartTime,
			end:       item.EndTime,
		})
	}
	if len(out) > 0 {
		return out
	}

	teacherRows, err := s.db.QueryContext(ctx, `SELECT id::text FROM teachers WHERE tenant_id = $1`, tenantID)
	if err != nil {
		return out
	}
	defer teacherRows.Close()
	for teacherRows.Next() {
		var teacherID string
		if err := teacherRows.Scan(&teacherID); err != nil {
			continue
		}
		for day := 1; day <= 5; day++ {
			out[teacherID] = append(out[teacherID], availabilityWindow{
				dayOfWeek: day,
				start:     "08:00",
				end:       "15:00",
			})
		}
	}
	return out
}

func buildRequirementNeeds(requirements []schedulingdomain.ClassSubjectRequirement, teacherSubjects map[string][]string) []requirementNeed {
	out := make([]requirementNeed, 0, len(requirements))
	for _, requirement := range requirements {
		out = append(out, requirementNeed{
			requirement: requirement,
			teacherIDs:  teacherSubjects[requirement.SubjectID],
		})
	}
	return out
}

func defaultWeekSlots() []timeSlot {
	days := []int{1, 2, 3, 4, 5}
	startMinutes := []int{8 * 60, 8*60 + 40, 9*60 + 20, 10 * 60, 10*60 + 40, 11*60 + 20, 12 * 60, 12*60 + 40, 13*60 + 20, 14 * 60, 14*60 + 20}
	slots := make([]timeSlot, 0, len(days)*len(startMinutes))
	for _, day := range days {
		for _, startMin := range startMinutes {
			endMin := startMin + 40
			if endMin > 15*60 {
				continue
			}
			slots = append(slots, timeSlot{
				dayOfWeek: day,
				start:     minutesToTime(startMin),
				end:       minutesToTime(endMin),
			})
		}
	}
	return slots
}

func pickGreedySlot(
	slots []timeSlot,
	need requirementNeed,
	availabilities map[string][]availabilityWindow,
	classBusy map[string]map[int]map[string]bool,
	teacherBusy map[string]map[int]map[string]bool,
) (timeSlot, string, bool) {
	for _, slot := range slots {
		if isBusy(classBusy, need.requirement.ClassID, slot.dayOfWeek, slot.start) {
			continue
		}
		for _, teacherID := range need.teacherIDs {
			if isBusy(teacherBusy, teacherID, slot.dayOfWeek, slot.start) {
				continue
			}
			if !teacherAvailable(availabilities[teacherID], slot) {
				continue
			}
			return slot, teacherID, true
		}
	}
	return timeSlot{}, "", false
}

func teacherAvailable(windows []availabilityWindow, slot timeSlot) bool {
	if len(windows) == 0 {
		return true
	}
	slotStart := timeToMinutes(slot.start)
	slotEnd := timeToMinutes(slot.end)
	for _, window := range windows {
		if window.dayOfWeek != slot.dayOfWeek {
			continue
		}
		if slotStart >= timeToMinutes(window.start) && slotEnd <= timeToMinutes(window.end) {
			return true
		}
	}
	return false
}

func isBusy(index map[string]map[int]map[string]bool, key string, day int, start string) bool {
	if index[key] == nil {
		return false
	}
	if index[key][day] == nil {
		return false
	}
	return index[key][day][start]
}

func markBusy(index map[string]map[int]map[string]bool, key string, day int, start string) {
	if index[key] == nil {
		index[key] = map[int]map[string]bool{}
	}
	if index[key][day] == nil {
		index[key][day] = map[string]bool{}
	}
	index[key][day][start] = true
}

func validateScheduleLessons(lessons []schedulingdomain.Lesson, requirements []schedulingdomain.ClassSubjectRequirement) schedulingdomain.ValidationResult {
	hard := []string{}
	soft := []string{}

	classSlot := map[string]map[int]map[string]bool{}
	teacherSlot := map[string]map[int]map[string]bool{}
	for _, lesson := range lessons {
		if isBusy(classSlot, lesson.ClassID, lesson.DayOfWeek, lesson.StartTime) {
			hard = append(hard, fmt.Sprintf("%s sınıfında %d. gün %s çakışması var.", lesson.ClassName, lesson.DayOfWeek, lesson.StartTime))
		}
		if isBusy(teacherSlot, lesson.TeacherID, lesson.DayOfWeek, lesson.StartTime) {
			hard = append(hard, fmt.Sprintf("%s öğretmeninde %d. gün %s çakışması var.", lesson.TeacherName, lesson.DayOfWeek, lesson.StartTime))
		}
		markBusy(classSlot, lesson.ClassID, lesson.DayOfWeek, lesson.StartTime)
		markBusy(teacherSlot, lesson.TeacherID, lesson.DayOfWeek, lesson.StartTime)
	}

	required := map[string]int{}
	for _, requirement := range requirements {
		key := requirement.ClassID + ":" + requirement.SubjectID
		required[key] = requirement.WeeklyHours
	}
	actual := map[string]int{}
	for _, lesson := range lessons {
		key := lesson.ClassID + ":" + lesson.SubjectID
		actual[key]++
	}
	for key, want := range required {
		got := actual[key]
		if got < want {
			soft = append(soft, fmt.Sprintf("%s için %d saat bekleniyordu, %d saat atandı.", key, want, got))
		}
	}

	return schedulingdomain.ValidationResult{
		Valid:         len(hard) == 0,
		HardConflicts: hard,
		SoftWarnings:  soft,
	}
}

func (s *Store) resolveTeacherProfileID(ctx context.Context, tenantID string, userOrTeacherID string) string {
	var teacherID string
	err := s.db.QueryRowContext(ctx, `
SELECT id::text FROM teachers WHERE tenant_id = $1 AND id = $2`, tenantID, userOrTeacherID).Scan(&teacherID)
	if err == nil {
		return teacherID
	}
	err = s.db.QueryRowContext(ctx, `
SELECT id::text FROM teachers WHERE tenant_id = $1 AND user_id = $2`, tenantID, userOrTeacherID).Scan(&teacherID)
	if err == nil {
		return teacherID
	}
	return ""
}

func scoreFromAssignments(assigned, unassigned int) int {
	total := assigned + unassigned
	if total == 0 {
		return 0
	}
	return int(float64(assigned) / float64(total) * 100)
}

func normalizeTimeText(value string) string {
	value = strings.TrimSpace(value)
	if value == "" {
		return ""
	}
	if len(value) >= 5 {
		return value[:5]
	}
	return value
}

func minutesToTime(totalMinutes int) string {
	hour := totalMinutes / 60
	minute := totalMinutes % 60
	return fmt.Sprintf("%02d:%02d", hour, minute)
}

func timeToMinutes(value string) int {
	value = normalizeTimeText(value)
	parsed, err := time.Parse("15:04", value)
	if err != nil {
		return 0
	}
	return parsed.Hour()*60 + parsed.Minute()
}

func lessonTime(ref time.Time, dayOfWeek int, value string) time.Time {
	parsed, err := time.Parse("15:04:05", value)
	if err != nil {
		parsed, _ = time.Parse("15:04", value)
	}
	weekday := time.Weekday(dayOfWeek % 7)
	if weekday == 0 {
		weekday = time.Sunday
	}
	delta := int(weekday - ref.Weekday())
	if delta < 0 {
		delta += 7
	}
	base := time.Date(ref.Year(), ref.Month(), ref.Day(), 0, 0, 0, 0, ref.Location()).AddDate(0, 0, delta)
	return time.Date(base.Year(), base.Month(), base.Day(), parsed.Hour(), parsed.Minute(), parsed.Second(), 0, base.Location())
}
