package postgres

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	attendancedomain "ots/backend/internal/domain/attendance"
)

func (s *Store) GetAttendanceSession(ctx context.Context, tenantID string, sessionID string) (attendancedomain.Session, bool) {
	return s.loadAttendanceSessionByID(ctx, tenantID, sessionID)
}

func (s *Store) GetAttendanceSessionByLesson(ctx context.Context, tenantID string, lessonID string) (attendancedomain.Session, bool) {
	return s.loadAttendanceSessionByLesson(ctx, tenantID, lessonID)
}

func (s *Store) GetOrCreateAttendanceSession(ctx context.Context, tenantID string, lessonID string, takenByUserID string) (attendancedomain.Session, bool) {
	if session, ok := s.loadAttendanceSessionByLesson(ctx, tenantID, lessonID); ok {
		return session, true
	}
	return s.createAttendanceSession(ctx, tenantID, lessonID, takenByUserID)
}

func (s *Store) UpdateAttendanceRecords(ctx context.Context, tenantID string, sessionID string, actorUserID string, updates []attendancedomain.RecordUpdate) (attendancedomain.Session, bool) {
	if session, ok := s.loadAttendanceSessionByID(ctx, tenantID, sessionID); ok && session.FinalizedAt != nil {
		return attendancedomain.Session{}, false
	}

	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return attendancedomain.Session{}, false
	}
	defer func() { _ = tx.Rollback() }()

	var exists bool
	err = tx.QueryRowContext(ctx, `
SELECT EXISTS(
	SELECT 1 FROM attendance_sessions WHERE tenant_id = $1 AND id = $2
)`, tenantID, sessionID).Scan(&exists)
	if err != nil || !exists {
		return attendancedomain.Session{}, false
	}

	for _, update := range updates {
		_, err := tx.ExecContext(ctx, `
UPDATE attendance_records
SET status = $1, note = $2, updated_at = now()
WHERE tenant_id = $3 AND attendance_session_id = $4 AND student_id = $5`,
			string(update.Status), nullString(update.Note), tenantID, sessionID, update.StudentID)
		if err != nil {
			return attendancedomain.Session{}, false
		}
	}

	if err := tx.Commit(); err != nil {
		return attendancedomain.Session{}, false
	}

	s.writeOperationalAudit(ctx, tenantID, actorUserID, "attendance.update", "attendance_session", sessionID, `{"recordsUpdated":`+fmt.Sprint(len(updates))+`}`)

	return s.loadAttendanceSessionByID(ctx, tenantID, sessionID)
}

func (s *Store) FinalizeAttendanceSession(ctx context.Context, tenantID string, sessionID string, finalizedAt time.Time, actorUserID string) (attendancedomain.Session, bool) {
	result, err := s.db.ExecContext(ctx, `
UPDATE attendance_sessions
SET finalized_at = $1
WHERE tenant_id = $2 AND id = $3 AND finalized_at IS NULL`,
		finalizedAt, tenantID, sessionID)
	if err != nil {
		return attendancedomain.Session{}, false
	}
	rows, _ := result.RowsAffected()
	if rows == 0 {
		session, ok := s.loadAttendanceSessionByID(ctx, tenantID, sessionID)
		if !ok || session.FinalizedAt == nil {
			return attendancedomain.Session{}, false
		}
		return session, true
	}
	session, ok := s.loadAttendanceSessionByID(ctx, tenantID, sessionID)
	if !ok {
		return attendancedomain.Session{}, false
	}
	s.emitAttendanceAbsenceNotifications(ctx, tenantID, sessionID, session)
	s.writeOperationalAudit(ctx, tenantID, actorUserID, "attendance.finalize", "attendance_session", sessionID, `{}`)
	return session, true
}

func (s *Store) ReopenAttendanceSession(ctx context.Context, tenantID string, sessionID string, actorUserID string) (attendancedomain.Session, bool) {
	result, err := s.db.ExecContext(ctx, `
UPDATE attendance_sessions
SET finalized_at = NULL
WHERE tenant_id = $1 AND id = $2 AND finalized_at IS NOT NULL`,
		tenantID, sessionID)
	if err != nil {
		return attendancedomain.Session{}, false
	}
	rows, _ := result.RowsAffected()
	if rows == 0 {
		session, ok := s.loadAttendanceSessionByID(ctx, tenantID, sessionID)
		if !ok || session.FinalizedAt != nil {
			return attendancedomain.Session{}, false
		}
		return session, true
	}
	session, ok := s.loadAttendanceSessionByID(ctx, tenantID, sessionID)
	if !ok {
		return attendancedomain.Session{}, false
	}
	s.writeOperationalAudit(ctx, tenantID, actorUserID, "attendance.reopen", "attendance_session", sessionID, `{}`)
	return session, true
}

func (s *Store) loadAttendanceSessionByLesson(ctx context.Context, tenantID string, lessonID string) (attendancedomain.Session, bool) {
	var session attendancedomain.Session
	var finalizedAt sql.NullTime

	err := s.db.QueryRowContext(ctx, `
SELECT
	sess.id::text,
	sess.tenant_id::text,
	sess.schedule_lesson_id::text,
	sess.started_at,
	sess.finalized_at,
	sl.class_id::text,
	c.name,
	sub.name,
	t.user_id::text
FROM attendance_sessions sess
JOIN schedule_lessons sl ON sl.id = sess.schedule_lesson_id
JOIN classes c ON c.id = sl.class_id
JOIN subjects sub ON sub.id = sl.subject_id
JOIN teachers t ON t.id = sl.teacher_id
WHERE sess.tenant_id = $1 AND sess.schedule_lesson_id = $2`,
		tenantID, lessonID).Scan(
		&session.ID,
		&session.TenantID,
		&session.LessonID,
		&session.StartedAt,
		&finalizedAt,
		&session.ClassID,
		&session.ClassName,
		&session.SubjectName,
		&session.TeacherID,
	)
	if err != nil {
		return attendancedomain.Session{}, false
	}
	if finalizedAt.Valid {
		session.FinalizedAt = &finalizedAt.Time
	}

	records, ok := s.loadAttendanceRecords(ctx, tenantID, session.ID)
	if !ok {
		return attendancedomain.Session{}, false
	}
	session.Records = records
	return session, true
}

func (s *Store) loadAttendanceSessionByID(ctx context.Context, tenantID string, sessionID string) (attendancedomain.Session, bool) {
	var session attendancedomain.Session
	var finalizedAt sql.NullTime

	err := s.db.QueryRowContext(ctx, `
SELECT
	sess.id::text,
	sess.tenant_id::text,
	sess.schedule_lesson_id::text,
	sess.started_at,
	sess.finalized_at,
	sl.class_id::text,
	c.name,
	sub.name,
	t.user_id::text
FROM attendance_sessions sess
JOIN schedule_lessons sl ON sl.id = sess.schedule_lesson_id
JOIN classes c ON c.id = sl.class_id
JOIN subjects sub ON sub.id = sl.subject_id
JOIN teachers t ON t.id = sl.teacher_id
WHERE sess.tenant_id = $1 AND sess.id = $2`,
		tenantID, sessionID).Scan(
		&session.ID,
		&session.TenantID,
		&session.LessonID,
		&session.StartedAt,
		&finalizedAt,
		&session.ClassID,
		&session.ClassName,
		&session.SubjectName,
		&session.TeacherID,
	)
	if err != nil {
		return attendancedomain.Session{}, false
	}
	if finalizedAt.Valid {
		session.FinalizedAt = &finalizedAt.Time
	}

	records, ok := s.loadAttendanceRecords(ctx, tenantID, session.ID)
	if !ok {
		return attendancedomain.Session{}, false
	}
	session.Records = records
	return session, true
}

func (s *Store) loadAttendanceRecords(ctx context.Context, tenantID string, sessionID string) ([]attendancedomain.Record, bool) {
	rows, err := s.db.QueryContext(ctx, `
SELECT
	ar.student_id::text,
	s.full_name,
	s.student_number,
	ar.status,
	COALESCE(ar.note, '')
FROM attendance_records ar
JOIN students s ON s.id = ar.student_id
WHERE ar.tenant_id = $1 AND ar.attendance_session_id = $2
ORDER BY s.full_name`, tenantID, sessionID)
	if err != nil {
		return nil, false
	}
	defer rows.Close()

	out := make([]attendancedomain.Record, 0)
	for rows.Next() {
		var record attendancedomain.Record
		if err := rows.Scan(&record.StudentID, &record.StudentName, &record.Number, &record.Status, &record.Note); err != nil {
			continue
		}
		out = append(out, record)
	}
	return out, true
}

func (s *Store) createAttendanceSession(ctx context.Context, tenantID string, lessonID string, takenByUserID string) (attendancedomain.Session, bool) {
	var classID, className, subjectName, teacherUserID string
	err := s.db.QueryRowContext(ctx, `
SELECT
	sl.class_id::text,
	c.name,
	sub.name,
	t.user_id::text
FROM schedule_lessons sl
JOIN classes c ON c.id = sl.class_id
JOIN subjects sub ON sub.id = sl.subject_id
JOIN teachers t ON t.id = sl.teacher_id
WHERE sl.tenant_id = $1 AND sl.id = $2`, tenantID, lessonID).Scan(&classID, &className, &subjectName, &teacherUserID)
	if err != nil {
		return attendancedomain.Session{}, false
	}

	if takenByUserID == "" {
		takenByUserID = teacherUserID
	}

	students, ok := s.listClassStudents(ctx, tenantID, classID)
	if !ok {
		return attendancedomain.Session{}, false
	}

	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return attendancedomain.Session{}, false
	}
	defer func() { _ = tx.Rollback() }()

	startedAt := s.clock()
	var sessionID string
	err = tx.QueryRowContext(ctx, `
INSERT INTO attendance_sessions (tenant_id, schedule_lesson_id, taken_by, started_at)
VALUES ($1, $2, $3, $4)
RETURNING id::text`, tenantID, lessonID, takenByUserID, startedAt).Scan(&sessionID)
	if err != nil {
		return attendancedomain.Session{}, false
	}

	for _, student := range students {
		_, err := tx.ExecContext(ctx, `
INSERT INTO attendance_records (tenant_id, attendance_session_id, student_id, status)
VALUES ($1, $2, $3, $4)`,
			tenantID, sessionID, student.ID, string(attendancedomain.StatusUnknown))
		if err != nil {
			return attendancedomain.Session{}, false
		}
	}

	if err := tx.Commit(); err != nil {
		return attendancedomain.Session{}, false
	}

	return s.loadAttendanceSessionByLesson(ctx, tenantID, lessonID)
}

type classStudent struct {
	ID       string
	FullName string
	Number   string
}

func (s *Store) listClassStudents(ctx context.Context, tenantID string, classID string) ([]classStudent, bool) {
	rows, err := s.db.QueryContext(ctx, `
SELECT s.id::text, s.full_name, s.student_number
FROM class_students cs
JOIN students s ON s.id = cs.student_id
WHERE cs.tenant_id = $1
  AND cs.class_id = $2
  AND (cs.ends_on IS NULL OR cs.ends_on >= CURRENT_DATE)
  AND s.status = 'active'
  AND s.deleted_at IS NULL
ORDER BY s.full_name`, tenantID, classID)
	if err != nil {
		return nil, false
	}
	defer rows.Close()

	out := make([]classStudent, 0)
	for rows.Next() {
		var student classStudent
		if err := rows.Scan(&student.ID, &student.FullName, &student.Number); err != nil {
			continue
		}
		out = append(out, student)
	}
	return out, true
}

func nullString(value string) sql.NullString {
	if value == "" {
		return sql.NullString{}
	}
	return sql.NullString{String: value, Valid: true}
}

func (s *Store) AttendanceDayReport(ctx context.Context, tenantID string, date time.Time) attendancedomain.DayReport {
	dayStart := time.Date(date.Year(), date.Month(), date.Day(), 0, 0, 0, 0, date.Location())
	dayEnd := dayStart.Add(24 * time.Hour)

	rows, err := s.db.QueryContext(ctx, `
SELECT
	ar.student_id::text,
	sl.class_id::text,
	ar.status
FROM attendance_records ar
JOIN attendance_sessions sess ON sess.id = ar.attendance_session_id AND sess.tenant_id = ar.tenant_id
JOIN schedule_lessons sl ON sl.id = sess.schedule_lesson_id AND sl.tenant_id = ar.tenant_id
WHERE ar.tenant_id = $1
  AND sess.started_at >= $2
  AND sess.started_at < $3
  AND sess.finalized_at IS NOT NULL`,
		tenantID, dayStart, dayEnd)
	if err != nil {
		return attendancedomain.DayReport{Date: dayStart.Format("2006-01-02")}
	}
	defer rows.Close()

	byStudent := map[string]attendancedomain.DayRecord{}
	for rows.Next() {
		var studentID, classID, status string
		if err := rows.Scan(&studentID, &classID, &status); err != nil {
			continue
		}
		current, exists := byStudent[studentID]
		if !exists || statusPriority(attendancedomain.Status(status)) > statusPriority(current.Status) {
			byStudent[studentID] = attendancedomain.DayRecord{
				StudentID: studentID,
				ClassID:   classID,
				Status:    attendancedomain.Status(status),
			}
		}
	}

	out := make([]attendancedomain.DayRecord, 0, len(byStudent))
	for _, record := range byStudent {
		out = append(out, record)
	}
	return attendancedomain.DayReport{
		Date:    dayStart.Format("2006-01-02"),
		Records: out,
	}
}

func statusPriority(status attendancedomain.Status) int {
	switch status {
	case attendancedomain.StatusAbsent:
		return 5
	case attendancedomain.StatusLate:
		return 4
	case attendancedomain.StatusUnknown:
		return 3
	case attendancedomain.StatusExcused:
		return 2
	case attendancedomain.StatusPresent:
		return 1
	default:
		return 0
	}
}

func (s *Store) emitAttendanceAbsenceNotifications(ctx context.Context, tenantID string, sessionID string, session attendancedomain.Session) {
	for _, record := range session.Records {
		if record.Status != attendancedomain.StatusAbsent && record.Status != attendancedomain.StatusLate {
			continue
		}
		guardianUserIDs, err := s.listGuardianUserIDsForStudent(ctx, tenantID, record.StudentID)
		if err != nil || len(guardianUserIDs) == 0 {
			continue
		}
		statusLabel := "gelmedi"
		if record.Status == attendancedomain.StatusLate {
			statusLabel = "geç kaldı"
		}
		title := "Devamsızlık bildirimi"
		body := fmt.Sprintf(
			"%s (%s) öğrencisi %s sınıfında %s dersinde %s. Oturum: %s",
			record.StudentName,
			record.Number,
			session.ClassName,
			session.SubjectName,
			statusLabel,
			sessionID,
		)
		for _, userID := range guardianUserIDs {
			kind := fmt.Sprintf("attendance_absence:%s:%s:%s", sessionID, record.StudentID, userID)
			var exists bool
			if err := s.db.QueryRowContext(ctx, `
SELECT EXISTS(
	SELECT 1 FROM notifications WHERE tenant_id = $1 AND user_id = $2 AND kind = $3
)`, tenantID, userID, kind).Scan(&exists); err != nil || exists {
				continue
			}
			_, _ = s.db.ExecContext(ctx, `
INSERT INTO notifications (tenant_id, user_id, title, body, kind)
VALUES ($1, $2, $3, $4, $5)`,
				tenantID, userID, title, body, kind)
		}
	}
}

func (s *Store) listGuardianUserIDsForStudent(ctx context.Context, tenantID string, studentID string) ([]string, error) {
	rows, err := s.db.QueryContext(ctx, `
SELECT DISTINCT g.user_id::text
FROM student_guardians sg
JOIN guardians g ON g.id = sg.guardian_id AND g.tenant_id = sg.tenant_id
WHERE sg.tenant_id = $1
  AND sg.student_id = $2
  AND g.user_id IS NOT NULL`, tenantID, studentID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := make([]string, 0)
	for rows.Next() {
		var userID string
		if err := rows.Scan(&userID); err != nil {
			continue
		}
		out = append(out, userID)
	}
	return out, rows.Err()
}

func (s *Store) StudentAttendanceSummary(ctx context.Context, tenantID string, studentID string) (attendancedomain.StudentSummary, bool) {
	rows, err := s.db.QueryContext(ctx, `
SELECT
	sess.started_at,
	sub.name,
	c.name,
	ar.status
FROM attendance_records ar
JOIN attendance_sessions sess ON sess.id = ar.attendance_session_id AND sess.tenant_id = ar.tenant_id
JOIN schedule_lessons sl ON sl.id = sess.schedule_lesson_id
JOIN subjects sub ON sub.id = sl.subject_id
JOIN classes c ON c.id = sl.class_id
WHERE ar.tenant_id = $1
  AND ar.student_id = $2
  AND sess.finalized_at IS NOT NULL
ORDER BY sess.started_at DESC
LIMIT 100`, tenantID, studentID)
	if err != nil {
		return attendancedomain.StudentSummary{}, false
	}
	defer rows.Close()

	summary := attendancedomain.StudentSummary{StudentID: studentID, Records: []attendancedomain.SummaryEntry{}}
	for rows.Next() {
		var startedAt time.Time
		var subjectName, className, status string
		if err := rows.Scan(&startedAt, &subjectName, &className, &status); err != nil {
			continue
		}
		st := attendancedomain.Status(status)
		summary.Records = append(summary.Records, attendancedomain.SummaryEntry{
			Date:        startedAt.Format("2006-01-02"),
			SubjectName: subjectName,
			ClassName:   className,
			Status:      st,
		})
		switch st {
		case attendancedomain.StatusPresent:
			summary.Present++
		case attendancedomain.StatusAbsent:
			summary.Absent++
		case attendancedomain.StatusLate:
			summary.Late++
		case attendancedomain.StatusExcused:
			summary.Excused++
		}
	}
	if len(summary.Records) == 0 {
		var exists bool
		_ = s.db.QueryRowContext(ctx, `SELECT EXISTS(SELECT 1 FROM students WHERE tenant_id = $1 AND id = $2 AND deleted_at IS NULL)`, tenantID, studentID).Scan(&exists)
		if !exists {
			return attendancedomain.StudentSummary{}, false
		}
	}
	return summary, true
}

func (s *Store) writeOperationalAudit(ctx context.Context, tenantID, actorUserID, action, resourceType, resourceID, metadata string) {
	_, _ = s.db.ExecContext(ctx, `
INSERT INTO audit_logs (tenant_id, actor_user_id, action, resource_type, resource_id, sensitivity, metadata)
VALUES ($1, NULLIF($2, '')::uuid, $3, $4, NULLIF($5, '')::uuid, 'operational', $6::jsonb)`,
		tenantID, actorUserID, action, resourceType, resourceID, metadata)
}
