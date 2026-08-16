package postgres

import (
	"context"
	"time"

	attendancedomain "ots/backend/internal/domain/attendance"
)

func (s *Store) ClassAttendanceSheet(ctx context.Context, tenantID string, classID string, date time.Time) (attendancedomain.ClassAttendanceSheet, bool) {
	return s.buildClassAttendanceSheet(ctx, tenantID, classID, date, "", false, nil)
}

func (s *Store) SaveClassAttendance(ctx context.Context, tenantID string, classID string, date time.Time, actorUserID string, updates []attendancedomain.RecordUpdate) (attendancedomain.ClassAttendanceSheet, bool) {
	return s.buildClassAttendanceSheet(ctx, tenantID, classID, date, actorUserID, true, updates)
}

func (s *Store) buildClassAttendanceSheet(
	ctx context.Context,
	tenantID string,
	classID string,
	date time.Time,
	actorUserID string,
	save bool,
	updates []attendancedomain.RecordUpdate,
) (attendancedomain.ClassAttendanceSheet, bool) {
	className, ok := s.classNameByID(ctx, tenantID, classID)
	if !ok {
		return attendancedomain.ClassAttendanceSheet{}, false
	}

	rosterStudents, ok := s.listClassStudents(ctx, tenantID, classID)
	if !ok {
		return attendancedomain.ClassAttendanceSheet{}, false
	}

	dayStart := time.Date(date.Year(), date.Month(), date.Day(), 0, 0, 0, 0, date.Location())
	sheet := attendancedomain.ClassAttendanceSheet{
		Date:      dayStart.Format("2006-01-02"),
		ClassID:   classID,
		ClassName: className,
		SectionID: defaultSectionID(classID),
		CanEdit:   false,
	}

	lessonID, lessonFound := s.findPublishedLessonForClass(ctx, tenantID, classID, date)
	if !lessonFound {
		sheet.Message = "Bu sınıf için yayınlanmış ders programı bulunamadı."
		sheet.Students = s.mergeClassAttendanceStudents(rosterStudents, nil, s.dayStatusByStudent(ctx, tenantID, dayStart))
		return sheet, true
	}

	sheet.LessonID = lessonID
	session, sessionOK := s.loadAttendanceSessionByLesson(ctx, tenantID, lessonID)
	if !sessionOK {
		if !save {
			sheet.Students = s.mergeClassAttendanceStudents(rosterStudents, nil, s.dayStatusByStudent(ctx, tenantID, dayStart))
			sheet.CanEdit = true
			sheet.Message = "Yoklama henüz alınmadı. Kaydet ile oluşturabilirsiniz."
			return sheet, true
		}
		created, createdOK := s.createAttendanceSessionForDate(ctx, tenantID, lessonID, actorUserID, dayStart)
		if !createdOK {
			return attendancedomain.ClassAttendanceSheet{}, false
		}
		session = created
	}

	if save {
		if session.FinalizedAt != nil {
			reopened, reopenedOK := s.ReopenAttendanceSession(ctx, tenantID, session.ID, actorUserID)
			if !reopenedOK {
				return attendancedomain.ClassAttendanceSheet{}, false
			}
			session = reopened
		}
		updated, updatedOK := s.UpdateAttendanceRecords(ctx, tenantID, session.ID, actorUserID, updates)
		if !updatedOK {
			return attendancedomain.ClassAttendanceSheet{}, false
		}
		session = updated
		finalized, finalizedOK := s.FinalizeAttendanceSession(ctx, tenantID, session.ID, s.clock(), actorUserID)
		if !finalizedOK {
			return attendancedomain.ClassAttendanceSheet{}, false
		}
		session = finalized
	}

	statusByStudent := map[string]attendancedomain.Status{}
	for _, record := range session.Records {
		statusByStudent[record.StudentID] = record.Status
	}

	sheet.SessionID = session.ID
	sheet.Finalized = session.FinalizedAt != nil
	sheet.CanEdit = true
	sheet.Students = s.mergeClassAttendanceStudents(rosterStudents, statusByStudent, nil)
	return sheet, true
}

func (s *Store) classNameByID(ctx context.Context, tenantID string, classID string) (string, bool) {
	var name string
	err := s.db.QueryRowContext(ctx, `
SELECT name FROM classes
WHERE tenant_id = $1 AND id = $2 AND deleted_at IS NULL`, tenantID, classID).Scan(&name)
	return name, err == nil
}

func (s *Store) findPublishedLessonForClass(ctx context.Context, tenantID string, classID string, date time.Time) (string, bool) {
	weekday := isoWeekday(date)
	var lessonID string
	err := s.db.QueryRowContext(ctx, `
SELECT sl.id::text
FROM schedule_lessons sl
JOIN schedules sch ON sch.id = sl.schedule_id AND sch.tenant_id = sl.tenant_id
WHERE sl.tenant_id = $1
  AND sl.class_id = $2
  AND sch.status = 'published'
  AND sl.day_of_week = $3
ORDER BY sl.starts_at
LIMIT 1`, tenantID, classID, weekday).Scan(&lessonID)
	if err == nil && lessonID != "" {
		return lessonID, true
	}

	err = s.db.QueryRowContext(ctx, `
SELECT sl.id::text
FROM schedule_lessons sl
JOIN schedules sch ON sch.id = sl.schedule_id AND sch.tenant_id = sl.tenant_id
WHERE sl.tenant_id = $1
  AND sl.class_id = $2
  AND sch.status = 'published'
ORDER BY sl.day_of_week, sl.starts_at
LIMIT 1`, tenantID, classID).Scan(&lessonID)
	return lessonID, err == nil && lessonID != ""
}

func (s *Store) createAttendanceSessionForDate(ctx context.Context, tenantID string, lessonID string, takenByUserID string, sessionDate time.Time) (attendancedomain.Session, bool) {
	if session, ok := s.loadAttendanceSessionByLesson(ctx, tenantID, lessonID); ok {
		return session, true
	}

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

	startedAt := time.Date(sessionDate.Year(), sessionDate.Month(), sessionDate.Day(), 12, 0, 0, 0, sessionDate.Location())
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

func (s *Store) dayStatusByStudent(ctx context.Context, tenantID string, dayStart time.Time) map[string]attendancedomain.Status {
	dayEnd := dayStart.Add(24 * time.Hour)
	rows, err := s.db.QueryContext(ctx, `
SELECT ar.student_id::text, ar.status
FROM attendance_records ar
JOIN attendance_sessions sess ON sess.id = ar.attendance_session_id AND sess.tenant_id = ar.tenant_id
WHERE ar.tenant_id = $1
  AND sess.started_at >= $2
  AND sess.started_at < $3
  AND sess.finalized_at IS NOT NULL`, tenantID, dayStart, dayEnd)
	if err != nil {
		return map[string]attendancedomain.Status{}
	}
	defer rows.Close()

	out := map[string]attendancedomain.Status{}
	for rows.Next() {
		var studentID, status string
		if err := rows.Scan(&studentID, &status); err != nil {
			continue
		}
		out[studentID] = attendancedomain.Status(status)
	}
	return out
}

func (s *Store) mergeClassAttendanceStudents(
	roster []classStudent,
	sessionStatus map[string]attendancedomain.Status,
	dayStatus map[string]attendancedomain.Status,
) []attendancedomain.ClassAttendanceStudent {
	out := make([]attendancedomain.ClassAttendanceStudent, 0, len(roster))
	for _, student := range roster {
		status := attendancedomain.StatusUnknown
		if sessionStatus != nil {
			if value, ok := sessionStatus[student.ID]; ok {
				status = value
			}
		} else if dayStatus != nil {
			if value, ok := dayStatus[student.ID]; ok {
				status = value
			}
		}
		firstName, lastName := splitFullName(student.FullName)
		out = append(out, attendancedomain.ClassAttendanceStudent{
			StudentID:    student.ID,
			FirstName:    firstName,
			LastName:     lastName,
			SchoolNumber: student.Number,
			Status:       status,
		})
	}
	return out
}
