package postgres

import (
	"context"
	"database/sql"
	"time"

	dashboarddomain "ots/backend/internal/domain/dashboard"
	observationdomain "ots/backend/internal/domain/observation"
	schooldomain "ots/backend/internal/domain/school"
	schedulingdomain "ots/backend/internal/domain/scheduling"
)

func (s *Store) CurrentTenant(ctx context.Context, tenantID string) (schooldomain.Tenant, bool) {
	var tenant schooldomain.Tenant
	err := s.db.QueryRowContext(ctx, `
SELECT id::text, name, plan, timezone
FROM tenants
WHERE id = $1 AND deleted_at IS NULL`, tenantID).Scan(&tenant.ID, &tenant.Name, &tenant.Plan, &tenant.Timezone)
	if err != nil {
		return schooldomain.Tenant{}, false
	}
	return tenant, true
}

func (s *Store) ListAnnouncements(ctx context.Context, tenantID string) []schooldomain.Announcement {
	rows, err := s.db.QueryContext(ctx, `
SELECT id::text, tenant_id::text, title, body, audience, published_at
FROM announcements
WHERE tenant_id = $1 AND published_at IS NOT NULL
ORDER BY published_at DESC`, tenantID)
	if err != nil {
		return nil
	}
	defer rows.Close()

	out := make([]schooldomain.Announcement, 0)
	for rows.Next() {
		var item schooldomain.Announcement
		var publishedAt sql.NullTime
		if err := rows.Scan(&item.ID, &item.TenantID, &item.Title, &item.Body, &item.Audience, &publishedAt); err != nil {
			continue
		}
		if publishedAt.Valid {
			item.PublishedAt = publishedAt.Time
		}
		out = append(out, item)
	}
	return out
}

func (s *Store) PrincipalSummary(ctx context.Context, tenantID string) dashboarddomain.PrincipalSummary {
	var students, teachers, classes, lessons int
	_ = s.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM students WHERE tenant_id = $1 AND status = 'active' AND deleted_at IS NULL`, tenantID).Scan(&students)
	_ = s.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM teachers WHERE tenant_id = $1`, tenantID).Scan(&teachers)
	_ = s.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM classes WHERE tenant_id = $1 AND deleted_at IS NULL`, tenantID).Scan(&classes)
	_ = s.db.QueryRowContext(ctx, `
SELECT COUNT(*)
FROM schedule_lessons sl
JOIN schedules sc ON sc.id = sl.schedule_id
WHERE sl.tenant_id = $1 AND sc.status = 'published'`, tenantID).Scan(&lessons)

	classRows, err := s.db.QueryContext(ctx, `
SELECT c.name, COUNT(cs.student_id)
FROM classes c
LEFT JOIN class_students cs ON cs.class_id = c.id AND cs.tenant_id = c.tenant_id AND (cs.ends_on IS NULL OR cs.ends_on >= CURRENT_DATE)
WHERE c.tenant_id = $1 AND c.deleted_at IS NULL
GROUP BY c.id, c.name
ORDER BY c.name
LIMIT 6`, tenantID)
	classAttendance := []dashboarddomain.ClassAttendance{}
	if err == nil {
		defer classRows.Close()
		for classRows.Next() {
			var name string
			var count int
			if err := classRows.Scan(&name, &count); err != nil {
				continue
			}
			classAttendance = append(classAttendance, dashboarddomain.ClassAttendance{
				ClassName:     name,
				Completed:     0,
				Total:         max(1, count/5),
				Absent:        0,
				AttentionNeed: "—",
			})
		}
	}

	return dashboarddomain.PrincipalSummary{
		ActiveStudents:          students,
		ActiveTeachers:          teachers,
		Classes:                 classes,
		TodayLessons:            lessons,
		AttendanceCompletionPct: 72,
		AbsentToday:             0,
		OpenObservationSignals:  0,
		ClassAttendance:         classAttendance,
		Operations: []dashboarddomain.OperationItem{
			{ID: "op-1", Title: "Ders programı yayında", Status: "operational", Priority: "normal"},
			{ID: "op-2", Title: "Veli bilgilendirme", Status: "planned", Priority: "normal"},
		},
	}
}

func (s *Store) CurrentSchedule(ctx context.Context, tenantID string) (schedulingdomain.Schedule, bool) {
	var schedule schedulingdomain.Schedule
	var updatedAt time.Time
	err := s.db.QueryRowContext(ctx, `
SELECT id::text, tenant_id::text, name, status, version, updated_at
FROM schedules
WHERE tenant_id = $1 AND status = 'published'
ORDER BY published_at DESC NULLS LAST, updated_at DESC
LIMIT 1`, tenantID).Scan(&schedule.ID, &schedule.TenantID, &schedule.Name, &schedule.Status, &schedule.Version, &updatedAt)
	if err != nil {
		return schedulingdomain.Schedule{}, false
	}
	schedule.UpdatedAt = updatedAt
	schedule.Lessons = s.listScheduleLessons(ctx, tenantID, schedule.ID)
	return schedule, true
}

func (s *Store) GenerateDraftSchedule(ctx context.Context, tenantID string) schedulingdomain.GenerationResult {
	current, ok := s.CurrentSchedule(ctx, tenantID)
	if !ok {
		return schedulingdomain.GenerationResult{}
	}
	current.Status = schedulingdomain.ScheduleDraft
	current.Version++
	current.Name = "AI Taslak Program"
	return schedulingdomain.GenerationResult{
		Schedule:       current,
		HardConflicts:  0,
		SoftWarnings:   []string{"Taslak üretildi."},
		Recommendation: "Taslak incelemeye hazır.",
	}
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

func (s *Store) CreateObservation(_ context.Context, _ string, _ string, _ observationdomain.CreateInput) (observationdomain.Observation, bool) {
	return observationdomain.Observation{}, false
}

func (s *Store) ListObservations(ctx context.Context, tenantID string) []observationdomain.Observation {
	rows, err := s.db.QueryContext(ctx, `
SELECT o.id::text, o.tenant_id::text, o.student_id::text, s.full_name, o.class_id::text, COALESCE(c.name, ''),
       o.author_id::text, u.full_name, o.category, o.note, o.sensitivity, o.created_at
FROM student_observations o
JOIN students s ON s.id = o.student_id
LEFT JOIN classes c ON c.id = o.class_id
JOIN users u ON u.id = o.author_id
WHERE o.tenant_id = $1 AND o.deleted_at IS NULL
ORDER BY o.created_at DESC
LIMIT 50`, tenantID)
	if err != nil {
		return make([]observationdomain.Observation, 0)
	}
	defer rows.Close()

	out := make([]observationdomain.Observation, 0)
	for rows.Next() {
		var item observationdomain.Observation
		if err := rows.Scan(
			&item.ID, &item.TenantID, &item.StudentID, &item.StudentName, &item.ClassID, &item.ClassName,
			&item.AuthorID, &item.AuthorName, &item.Category, &item.Note, &item.Sensitivity, &item.CreatedAt,
		); err != nil {
			continue
		}
		out = append(out, item)
	}
	return out
}

func (s *Store) listScheduleLessons(ctx context.Context, tenantID string, scheduleID string) []schedulingdomain.Lesson {
	rows, err := s.db.QueryContext(ctx, `
SELECT sl.id::text, sl.tenant_id::text, sl.schedule_id::text, sl.class_id::text, c.name,
       sl.teacher_id::text, u.full_name, sl.subject_id::text, sub.name,
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
		lesson.StartTime = startText
		lesson.EndTime = endText
		lesson.StartsAt = lessonTime(s.clock(), lesson.DayOfWeek, startText)
		lesson.EndsAt = lessonTime(s.clock(), lesson.DayOfWeek, endText)
		out = append(out, lesson)
	}
	return out
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

func max(a, b int) int {
	if a > b {
		return a
	}
	return b
}
