package memory

import (
	"context"
	"time"

	"ots/backend/internal/domain/attendance"
	"ots/backend/internal/domain/scheduling"
	"ots/backend/internal/domain/school"
)

func memoryDefaultSectionID(classID string) string {
	return classID + "-default"
}

func (s *Store) ClassAttendanceSheet(ctx context.Context, tenantID string, classID string, date time.Time) (attendance.ClassAttendanceSheet, bool) {
	return s.buildMemoryClassAttendanceSheet(ctx, tenantID, classID, date, "", false, nil)
}

func (s *Store) SaveClassAttendance(ctx context.Context, tenantID string, classID string, date time.Time, actorUserID string, updates []attendance.RecordUpdate) (attendance.ClassAttendanceSheet, bool) {
	return s.buildMemoryClassAttendanceSheet(ctx, tenantID, classID, date, actorUserID, true, updates)
}

func (s *Store) buildMemoryClassAttendanceSheet(
	_ context.Context,
	tenantID string,
	classID string,
	date time.Time,
	actorUserID string,
	save bool,
	updates []attendance.RecordUpdate,
) (attendance.ClassAttendanceSheet, bool) {
	s.mu.Lock()
	defer s.mu.Unlock()

	if tenantID != s.tenant.ID {
		return attendance.ClassAttendanceSheet{}, false
	}

	className := memoryClassName(s.classes, classID)
	if className == "" {
		return attendance.ClassAttendanceSheet{}, false
	}

	rosterStudents := memoryStudentsInClass(s.students, classID)
	dayStart := time.Date(date.Year(), date.Month(), date.Day(), 0, 0, 0, 0, date.Location())
	sheet := attendance.ClassAttendanceSheet{
		Date:      dayStart.Format("2006-01-02"),
		ClassID:   classID,
		ClassName: className,
		SectionID: memoryDefaultSectionID(classID),
		CanEdit:   false,
	}

	lessonID, lessonFound := memoryFindPublishedLessonForClass(s.schedule.Lessons, classID, date)
	if !lessonFound {
		sheet.Message = "Bu sınıf için yayınlanmış ders programı bulunamadı."
		sheet.Students = memoryMergeClassAttendanceStudents(rosterStudents, nil, memoryDayStatusByStudent(s.sessions, dayStart))
		return sheet, true
	}

	sheet.LessonID = lessonID
	session, sessionOK := s.sessions[lessonID]
	if !sessionOK {
		if !save {
			sheet.Students = memoryMergeClassAttendanceStudents(rosterStudents, nil, memoryDayStatusByStudent(s.sessions, dayStart))
			sheet.CanEdit = true
			sheet.Message = "Yoklama henüz alınmadı. Kaydet ile oluşturabilirsiniz."
			return sheet, true
		}
		created, createdOK := memoryCreateAttendanceSessionLocked(s, tenantID, lessonID, actorUserID, dayStart)
		if !createdOK {
			return attendance.ClassAttendanceSheet{}, false
		}
		session = created
	}

	if save {
		if session.FinalizedAt != nil {
			session.FinalizedAt = nil
			s.sessions[lessonID] = session
		}
		session, ok := memoryUpdateAttendanceRecordsLocked(s.sessions, session.ID, updates)
		if !ok {
			return attendance.ClassAttendanceSheet{}, false
		}
		now := s.clock()
		session.FinalizedAt = &now
		s.sessions[lessonID] = session
	}

	statusByStudent := map[string]attendance.Status{}
	for _, record := range session.Records {
		statusByStudent[record.StudentID] = record.Status
	}

	sheet.SessionID = session.ID
	sheet.Finalized = session.FinalizedAt != nil
	sheet.CanEdit = true
	sheet.Students = memoryMergeClassAttendanceStudents(rosterStudents, statusByStudent, nil)
	return sheet, true
}

func memoryFindPublishedLessonForClass(lessons []scheduling.Lesson, classID string, date time.Time) (string, bool) {
	weekday := isoWeekdayMemory(date)
	for _, lesson := range lessons {
		if lesson.ClassID == classID && lesson.DayOfWeek == weekday {
			return lesson.ID, true
		}
	}
	for _, lesson := range lessons {
		if lesson.ClassID == classID {
			return lesson.ID, true
		}
	}
	return "", false
}

func memoryStudentsInClass(students []school.Student, classID string) []school.Student {
	out := make([]school.Student, 0)
	for _, student := range students {
		if student.ClassID == classID && (student.Status == "" || student.Status == "active") {
			out = append(out, student)
		}
	}
	return out
}

func memoryDayStatusByStudent(sessions map[string]attendance.Session, dayStart time.Time) map[string]attendance.Status {
	dayEnd := dayStart.Add(24 * time.Hour)
	out := map[string]attendance.Status{}
	for _, session := range sessions {
		if session.StartedAt.Before(dayStart) || !session.StartedAt.Before(dayEnd) {
			continue
		}
		if session.FinalizedAt == nil {
			continue
		}
		for _, record := range session.Records {
			out[record.StudentID] = record.Status
		}
	}
	return out
}

func memoryMergeClassAttendanceStudents(
	roster []school.Student,
	sessionStatus map[string]attendance.Status,
	dayStatus map[string]attendance.Status,
) []attendance.ClassAttendanceStudent {
	out := make([]attendance.ClassAttendanceStudent, 0, len(roster))
	for _, student := range roster {
		status := attendance.StatusUnknown
		if sessionStatus != nil {
			if value, ok := sessionStatus[student.ID]; ok {
				status = value
			}
		} else if dayStatus != nil {
			if value, ok := dayStatus[student.ID]; ok {
				status = value
			}
		}
		firstName, lastName := splitMemoryFullName(student.FullName)
		out = append(out, attendance.ClassAttendanceStudent{
			StudentID:    student.ID,
			FirstName:    firstName,
			LastName:     lastName,
			SchoolNumber: student.Number,
			Status:       status,
		})
	}
	return out
}

func memoryCreateAttendanceSessionLocked(s *Store, tenantID string, lessonID string, _ string, sessionDate time.Time) (attendance.Session, bool) {
	if session, ok := s.sessions[lessonID]; ok {
		return session, true
	}
	lesson, ok := s.lessonByID(lessonID)
	if !ok {
		return attendance.Session{}, false
	}
	records := []attendance.Record{}
	for _, student := range s.students {
		if student.ClassID == lesson.ClassID {
			records = append(records, attendance.Record{
				StudentID:   student.ID,
				StudentName: student.FullName,
				Number:      student.Number,
				Status:      attendance.StatusUnknown,
			})
		}
	}
	startedAt := time.Date(sessionDate.Year(), sessionDate.Month(), sessionDate.Day(), 12, 0, 0, 0, sessionDate.Location())
	session := attendance.Session{
		ID:          "att-" + lesson.ID,
		TenantID:    tenantID,
		LessonID:    lesson.ID,
		ClassID:     lesson.ClassID,
		ClassName:   lesson.ClassName,
		SubjectName: lesson.SubjectName,
		TeacherID:   lesson.TeacherID,
		StartedAt:   startedAt,
		Records:     records,
	}
	s.sessions[lessonID] = session
	return session, true
}

func memoryUpdateAttendanceRecordsLocked(sessions map[string]attendance.Session, sessionID string, updates []attendance.RecordUpdate) (attendance.Session, bool) {
	var sessionKey string
	var session attendance.Session
	var ok bool
	for key, candidate := range sessions {
		if candidate.ID == sessionID {
			sessionKey = key
			session = candidate
			ok = true
			break
		}
	}
	if !ok {
		return attendance.Session{}, false
	}

	updatesByStudent := map[string]attendance.RecordUpdate{}
	for _, update := range updates {
		updatesByStudent[update.StudentID] = update
	}
	for i := range session.Records {
		if update, exists := updatesByStudent[session.Records[i].StudentID]; exists {
			session.Records[i].Status = update.Status
			session.Records[i].Note = update.Note
		}
	}
	sessions[sessionKey] = session
	return session, true
}
