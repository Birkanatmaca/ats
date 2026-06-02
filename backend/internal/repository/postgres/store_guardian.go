package postgres

import (
	"context"
	"database/sql"

	guardiandomain "ots/backend/internal/domain/guardian"
	schooldomain "ots/backend/internal/domain/school"
	schedulingdomain "ots/backend/internal/domain/scheduling"
)

func (s *Store) guardianIDForUser(ctx context.Context, tenantID string, guardianUserID string) (string, bool) {
	var guardianID string
	err := s.db.QueryRowContext(ctx, `
SELECT id::text
FROM guardians
WHERE tenant_id = $1 AND user_id = $2`, tenantID, guardianUserID).Scan(&guardianID)
	return guardianID, err == nil
}

func (s *Store) GuardianHasStudent(ctx context.Context, tenantID string, guardianUserID string, studentID string) bool {
	guardianID, ok := s.guardianIDForUser(ctx, tenantID, guardianUserID)
	if !ok {
		return false
	}
	var exists bool
	err := s.db.QueryRowContext(ctx, `
SELECT EXISTS(
	SELECT 1 FROM student_guardians
	WHERE tenant_id = $1 AND guardian_id = $2 AND student_id = $3
)`, tenantID, guardianID, studentID).Scan(&exists)
	return err == nil && exists
}

func (s *Store) ListGuardianStudents(ctx context.Context, tenantID string, guardianUserID string) []guardiandomain.Student {
	guardianID, ok := s.guardianIDForUser(ctx, tenantID, guardianUserID)
	if !ok {
		return []guardiandomain.Student{}
	}

	rows, err := s.db.QueryContext(ctx, `
SELECT
	s.id::text,
	s.full_name,
	COALESCE(c.name, ''),
	s.student_number,
	sg.relation
FROM student_guardians sg
JOIN students s ON s.id = sg.student_id AND s.tenant_id = sg.tenant_id
LEFT JOIN LATERAL (
	SELECT cs.class_id
	FROM class_students cs
	WHERE cs.tenant_id = s.tenant_id
	  AND cs.student_id = s.id
	  AND (cs.ends_on IS NULL OR cs.ends_on >= CURRENT_DATE)
	ORDER BY cs.starts_on DESC NULLS LAST
	LIMIT 1
) active_class ON true
LEFT JOIN classes c ON c.id = active_class.class_id AND c.tenant_id = s.tenant_id
WHERE sg.tenant_id = $1
  AND sg.guardian_id = $2
  AND s.status = 'active'
  AND s.deleted_at IS NULL
ORDER BY s.full_name`, tenantID, guardianID)
	if err != nil {
		return []guardiandomain.Student{}
	}
	defer rows.Close()

	out := make([]guardiandomain.Student, 0)
	for rows.Next() {
		var item guardiandomain.Student
		if err := rows.Scan(&item.ID, &item.FullName, &item.ClassName, &item.SchoolNumber, &item.Relation); err != nil {
			continue
		}
		out = append(out, item)
	}
	return out
}

func (s *Store) StudentScheduleForGuardian(ctx context.Context, tenantID string, guardianUserID string, studentID string) (guardiandomain.StudentSchedule, bool) {
	if !s.GuardianHasStudent(ctx, tenantID, guardianUserID, studentID) {
		return guardiandomain.StudentSchedule{}, false
	}

	var classID string
	err := s.db.QueryRowContext(ctx, `
SELECT cs.class_id::text
FROM class_students cs
WHERE cs.tenant_id = $1
  AND cs.student_id = $2
  AND (cs.ends_on IS NULL OR cs.ends_on >= CURRENT_DATE)
ORDER BY cs.starts_on DESC NULLS LAST
LIMIT 1`, tenantID, studentID).Scan(&classID)
	if err != nil {
		return guardiandomain.StudentSchedule{}, false
	}

	schedule, ok := s.CurrentSchedule(ctx, tenantID)
	if !ok {
		return guardiandomain.StudentSchedule{StudentID: studentID, Lessons: []schedulingdomain.Lesson{}}, true
	}

	lessons := make([]schedulingdomain.Lesson, 0)
	for _, lesson := range schedule.Lessons {
		if lesson.ClassID == classID {
			lessons = append(lessons, lesson)
		}
	}
	return guardiandomain.StudentSchedule{StudentID: studentID, Lessons: lessons}, true
}

func (s *Store) StudentAttendanceForGuardian(ctx context.Context, tenantID string, guardianUserID string, studentID string) (guardiandomain.StudentAttendance, bool) {
	if !s.GuardianHasStudent(ctx, tenantID, guardianUserID, studentID) {
		return guardiandomain.StudentAttendance{}, false
	}

	rows, err := s.db.QueryContext(ctx, `
SELECT
	ar.id::text,
	DATE(sess.started_at)::text,
	sub.name,
	ar.status,
	COALESCE(ar.note, ''),
	sl.starts_at::text,
	sl.ends_at::text,
	sl.day_of_week
FROM attendance_records ar
JOIN attendance_sessions sess ON sess.id = ar.attendance_session_id
JOIN schedule_lessons sl ON sl.id = sess.schedule_lesson_id
JOIN subjects sub ON sub.id = sl.subject_id
WHERE ar.tenant_id = $1
  AND ar.student_id = $2
  AND sess.finalized_at IS NOT NULL
ORDER BY sess.started_at DESC
LIMIT 100`, tenantID, studentID)
	if err != nil {
		return guardiandomain.StudentAttendance{}, false
	}
	defer rows.Close()

	records := make([]guardiandomain.AttendanceRecord, 0)
	for rows.Next() {
		var item guardiandomain.AttendanceRecord
		if err := rows.Scan(&item.ID, &item.Date, &item.Lesson, &item.Status, &item.Note, &item.StartTime, &item.EndTime, &item.DayOfWeek); err != nil {
			continue
		}
		item.StartTime = normalizeTimeText(item.StartTime)
		item.EndTime = normalizeTimeText(item.EndTime)
		records = append(records, item)
	}
	return guardiandomain.StudentAttendance{StudentID: studentID, Records: records}, true
}

func (s *Store) ListGuardianAnnouncements(ctx context.Context, tenantID string) []schooldomain.Announcement {
	rows, err := s.db.QueryContext(ctx, `
SELECT id::text, tenant_id::text, title, body, audience, published_at
FROM announcements
WHERE tenant_id = $1
  AND published_at IS NOT NULL
  AND audience IN ('guardians', 'all')
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

func (s *Store) ListGuardianNotifications(ctx context.Context, tenantID string, userID string) []guardiandomain.Notification {
	rows, err := s.db.QueryContext(ctx, `
SELECT id::text, title, body, kind, read_at, created_at
FROM notifications
WHERE tenant_id = $1 AND user_id = $2
ORDER BY created_at DESC
LIMIT 100`, tenantID, userID)
	if err != nil {
		return []guardiandomain.Notification{}
	}
	defer rows.Close()

	out := make([]guardiandomain.Notification, 0)
	for rows.Next() {
		var item guardiandomain.Notification
		var readAt sql.NullTime
		if err := rows.Scan(&item.ID, &item.Title, &item.Body, &item.Kind, &readAt, &item.CreatedAt); err != nil {
			continue
		}
		if readAt.Valid {
			item.ReadAt = &readAt.Time
		}
		out = append(out, item)
	}
	return out
}

func (s *Store) MarkGuardianNotificationRead(ctx context.Context, tenantID string, userID string, notificationID string) (guardiandomain.Notification, bool) {
	var item guardiandomain.Notification
	var readAt sql.NullTime
	err := s.db.QueryRowContext(ctx, `
UPDATE notifications
SET read_at = COALESCE(read_at, now())
WHERE tenant_id = $1 AND user_id = $2 AND id = $3
RETURNING id::text, title, body, kind, read_at, created_at`,
		tenantID, userID, notificationID).Scan(
		&item.ID, &item.Title, &item.Body, &item.Kind, &readAt, &item.CreatedAt,
	)
	if err != nil {
		return guardiandomain.Notification{}, false
	}
	if readAt.Valid {
		item.ReadAt = &readAt.Time
	}
	return item, true
}

func (s *Store) DeleteGuardianNotification(ctx context.Context, tenantID string, userID string, notificationID string) bool {
	result, err := s.db.ExecContext(ctx, `
DELETE FROM notifications
WHERE tenant_id = $1 AND user_id = $2 AND id = $3`,
		tenantID, userID, notificationID)
	if err != nil {
		return false
	}
	rows, err := result.RowsAffected()
	if err != nil {
		return false
	}
	return rows > 0
}
