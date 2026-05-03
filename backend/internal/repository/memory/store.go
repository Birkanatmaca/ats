package memory

import (
	"context"
	"fmt"
	"sort"
	"sync"
	"time"

	"ots/backend/internal/domain/attendance"
	"ots/backend/internal/domain/dashboard"
	"ots/backend/internal/domain/observation"
	"ots/backend/internal/domain/scheduling"
	"ots/backend/internal/domain/school"
)

type Store struct {
	mu            sync.RWMutex
	clock         func() time.Time
	tenant        school.Tenant
	classes       []school.Class
	students      []school.Student
	teachers      []school.Teacher
	subjects      []school.Subject
	schedule      scheduling.Schedule
	sessions      map[string]attendance.Session
	observations  []observation.Observation
	announcements []school.Announcement
}

func NewStore(clock func() time.Time) *Store {
	if clock == nil {
		clock = time.Now
	}

	now := clock()
	today := normalizeSchoolDay(now)

	tenant := school.Tenant{
		ID:       "tenant-demo",
		Name:     "Özel Atlas Koleji",
		Plan:     "MVP Pilot",
		Timezone: "Europe/Istanbul",
	}

	classes := []school.Class{
		{ID: "class-5a", TenantID: tenant.ID, Name: "5/A", Level: "Ortaokul", Branch: "A"},
		{ID: "class-6b", TenantID: tenant.ID, Name: "6/B", Level: "Ortaokul", Branch: "B"},
		{ID: "class-ana", TenantID: tenant.ID, Name: "Ana Sınıfı", Level: "Okul Öncesi", Branch: "A"},
	}

	students := []school.Student{
		{ID: "student-1", TenantID: tenant.ID, ClassID: "class-5a", FullName: "Defne Yılmaz", Number: "501"},
		{ID: "student-2", TenantID: tenant.ID, ClassID: "class-5a", FullName: "Efe Demir", Number: "502"},
		{ID: "student-3", TenantID: tenant.ID, ClassID: "class-5a", FullName: "Mina Kaya", Number: "503"},
		{ID: "student-4", TenantID: tenant.ID, ClassID: "class-6b", FullName: "Aras Çelik", Number: "601"},
		{ID: "student-5", TenantID: tenant.ID, ClassID: "class-6b", FullName: "Elif Aydın", Number: "602"},
		{ID: "student-6", TenantID: tenant.ID, ClassID: "class-ana", FullName: "Can Koç", Number: "A01"},
	}

	teachers := []school.Teacher{
		{ID: "teacher-profile-1", UserID: "teacher-1", TenantID: tenant.ID, FullName: "Ayşe Kara", Title: "Matematik Öğretmeni"},
		{ID: "teacher-profile-2", UserID: "teacher-2", TenantID: tenant.ID, FullName: "Murat Aksoy", Title: "Türkçe Öğretmeni"},
		{ID: "teacher-profile-3", UserID: "teacher-3", TenantID: tenant.ID, FullName: "Selin Ergin", Title: "Rehber Öğretmen"},
	}

	subjects := []school.Subject{
		{ID: "subject-math", TenantID: tenant.ID, Name: "Matematik", Code: "MAT"},
		{ID: "subject-tr", TenantID: tenant.ID, Name: "Türkçe", Code: "TUR"},
		{ID: "subject-life", TenantID: tenant.ID, Name: "Yaşam Becerileri", Code: "YAS"},
	}

	lessons := []scheduling.Lesson{
		newLesson(tenant.ID, "lesson-1", "schedule-published", classes[0], teachers[0], subjects[0], today, "09:00", "09:40", "Derslik 5A"),
		newLesson(tenant.ID, "lesson-2", "schedule-published", classes[0], teachers[1], subjects[1], today, "10:00", "10:40", "Derslik 5A"),
		newLesson(tenant.ID, "lesson-3", "schedule-published", classes[1], teachers[0], subjects[0], today, "11:00", "11:40", "Derslik 6B"),
		newLesson(tenant.ID, "lesson-4", "schedule-published", classes[2], teachers[2], subjects[2], today, "13:00", "13:40", "Etkinlik Alanı"),
	}

	schedule := scheduling.Schedule{
		ID:        "schedule-published",
		TenantID:  tenant.ID,
		Name:      "2026 Bahar Haftalık Program",
		Status:    scheduling.SchedulePublished,
		Version:   3,
		Score:     91,
		Lessons:   lessons,
		UpdatedAt: now.Add(-2 * time.Hour),
	}

	observations := []observation.Observation{
		{
			ID:          "observation-1",
			TenantID:    tenant.ID,
			StudentID:   "student-2",
			StudentName: "Efe Demir",
			ClassID:     "class-5a",
			ClassName:   "5/A",
			AuthorID:    "teacher-1",
			AuthorName:  "Ayşe Kara",
			Category:    observation.CategoryAttention,
			Note:        "Son iki matematik dersinde dikkat süresi belirgin şekilde kısaldı.",
			Sensitivity: "sensitive_student",
			CreatedAt:   now.Add(-26 * time.Hour),
		},
	}

	return &Store{
		clock:        clock,
		tenant:       tenant,
		classes:      classes,
		students:     students,
		teachers:     teachers,
		subjects:     subjects,
		schedule:     schedule,
		sessions:     map[string]attendance.Session{},
		observations: observations,
		announcements: []school.Announcement{
			{
				ID:          "announcement-1",
				TenantID:    tenant.ID,
				Title:       "Haftalık bülten yayınlandı",
				Body:        "Bu hafta veli bilgilendirme toplantıları sınıf bazlı takvim üzerinden paylaşılacaktır.",
				Audience:    "guardians",
				PublishedAt: now.Add(-3 * time.Hour),
			},
			{
				ID:          "announcement-2",
				TenantID:    tenant.ID,
				Title:       "Program değişikliği",
				Body:        "Perşembe günü 5/A Matematik dersi ikinci saate alınmıştır.",
				Audience:    "teachers",
				PublishedAt: now.Add(-90 * time.Minute),
			},
		},
	}
}

func (s *Store) CurrentTenant(_ context.Context, tenantID string) (school.Tenant, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	if tenantID != s.tenant.ID {
		return school.Tenant{}, false
	}
	return s.tenant, true
}

func (s *Store) ListAnnouncements(_ context.Context, tenantID string) []school.Announcement {
	s.mu.RLock()
	defer s.mu.RUnlock()
	if tenantID != s.tenant.ID {
		return nil
	}
	out := append([]school.Announcement(nil), s.announcements...)
	sort.Slice(out, func(i, j int) bool { return out[i].PublishedAt.After(out[j].PublishedAt) })
	return out
}

func (s *Store) PrincipalSummary(_ context.Context, tenantID string) dashboard.PrincipalSummary {
	s.mu.RLock()
	defer s.mu.RUnlock()
	if tenantID != s.tenant.ID {
		return dashboard.PrincipalSummary{}
	}
	return dashboard.PrincipalSummary{
		ActiveStudents:          len(s.students),
		ActiveTeachers:          len(s.teachers),
		Classes:                 len(s.classes),
		TodayLessons:            len(s.schedule.Lessons),
		AttendanceCompletionPct: 67,
		AbsentToday:             3,
		OpenObservationSignals:  len(s.observations),
		ClassAttendance: []dashboard.ClassAttendance{
			{ClassName: "5/A", Completed: 2, Total: 3, Absent: 1, AttentionNeed: "Dikkat takibi"},
			{ClassName: "6/B", Completed: 1, Total: 2, Absent: 2, AttentionNeed: "Devamsızlık"},
			{ClassName: "Ana Sınıfı", Completed: 1, Total: 1, Absent: 0, AttentionNeed: "Normal"},
		},
		Operations: []dashboard.OperationItem{
			{ID: "op-1", Title: "5/A ikinci saat yoklaması bekliyor", Status: "pending", Priority: "high"},
			{ID: "op-2", Title: "Yeni program taslağı yayın onayı bekliyor", Status: "review", Priority: "medium"},
			{ID: "op-3", Title: "Rehberlik biriminde 1 yeni gözlem kaydı var", Status: "new", Priority: "medium"},
		},
	}
}

func (s *Store) CurrentSchedule(_ context.Context, tenantID string) (scheduling.Schedule, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	if tenantID != s.tenant.ID {
		return scheduling.Schedule{}, false
	}
	return s.schedule, true
}

func (s *Store) GenerateDraftSchedule(_ context.Context, tenantID string) scheduling.GenerationResult {
	s.mu.Lock()
	defer s.mu.Unlock()
	if tenantID != s.tenant.ID {
		return scheduling.GenerationResult{}
	}

	draft := s.schedule
	draft.ID = "schedule-draft"
	draft.Name = "AI Taslak Program"
	draft.Status = scheduling.ScheduleDraft
	draft.Version = s.schedule.Version + 1
	draft.Score = 88
	draft.UpdatedAt = s.clock()
	for i := range draft.Lessons {
		draft.Lessons[i].ScheduleID = draft.ID
	}

	return scheduling.GenerationResult{
		Schedule:      draft,
		HardConflicts: 0,
		SoftWarnings: []string{
			"5/A Matematik dersi haftanın ilk günlerinde yoğunlaşıyor.",
			"Ayşe Kara için çarşamba günü boşluk azaltılabilir.",
		},
		Recommendation: "Taslak yayınlanabilir durumda. Soft uyarılar manuel düzenleme ekranında iyileştirilebilir.",
	}
}

func (s *Store) TeacherCalendar(_ context.Context, tenantID string, teacherID string) []scheduling.Lesson {
	s.mu.RLock()
	defer s.mu.RUnlock()
	if tenantID != s.tenant.ID {
		return nil
	}
	out := []scheduling.Lesson{}
	for _, lesson := range s.schedule.Lessons {
		if lesson.TeacherID == teacherID {
			out = append(out, lesson)
		}
	}
	sort.Slice(out, func(i, j int) bool { return out[i].StartsAt.Before(out[j].StartsAt) })
	return out
}

func (s *Store) ActiveLessonForTeacher(_ context.Context, tenantID string, teacherID string, now time.Time) (scheduling.Lesson, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	if tenantID != s.tenant.ID {
		return scheduling.Lesson{}, false
	}
	for _, lesson := range s.schedule.Lessons {
		startWindow := lesson.StartsAt.Add(-10 * time.Minute)
		endWindow := lesson.EndsAt.Add(10 * time.Minute)
		if lesson.TeacherID == teacherID && !now.Before(startWindow) && !now.After(endWindow) {
			return lesson, true
		}
	}
	return scheduling.Lesson{}, false
}

func (s *Store) GetOrCreateAttendanceSession(_ context.Context, tenantID string, lessonID string) (attendance.Session, bool) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if tenantID != s.tenant.ID {
		return attendance.Session{}, false
	}
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
	session := attendance.Session{
		ID:          "att-" + lesson.ID,
		TenantID:    tenantID,
		LessonID:    lesson.ID,
		ClassID:     lesson.ClassID,
		ClassName:   lesson.ClassName,
		SubjectName: lesson.SubjectName,
		TeacherID:   lesson.TeacherID,
		StartedAt:   s.clock(),
		Records:     records,
	}
	s.sessions[lessonID] = session
	return session, true
}

func (s *Store) UpdateAttendanceRecords(_ context.Context, tenantID string, sessionID string, updates []attendance.RecordUpdate) (attendance.Session, bool) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if tenantID != s.tenant.ID {
		return attendance.Session{}, false
	}
	var sessionKey string
	var session attendance.Session
	var ok bool
	for key, candidate := range s.sessions {
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
	s.sessions[sessionKey] = session
	return session, true
}

func (s *Store) ListObservations(_ context.Context, tenantID string) []observation.Observation {
	s.mu.RLock()
	defer s.mu.RUnlock()
	if tenantID != s.tenant.ID {
		return nil
	}
	out := append([]observation.Observation(nil), s.observations...)
	sort.Slice(out, func(i, j int) bool { return out[i].CreatedAt.After(out[j].CreatedAt) })
	return out
}

func (s *Store) CreateObservation(_ context.Context, tenantID string, authorID string, input observation.CreateInput) (observation.Observation, bool) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if tenantID != s.tenant.ID {
		return observation.Observation{}, false
	}
	student, ok := s.studentByID(input.StudentID)
	if !ok {
		return observation.Observation{}, false
	}
	className := ""
	if class, found := s.classByID(student.ClassID); found {
		className = class.Name
	}
	authorName := authorID
	if teacher, found := s.teacherByUserID(authorID); found {
		authorName = teacher.FullName
	}
	created := observation.Observation{
		ID:          fmt.Sprintf("observation-%d", len(s.observations)+1),
		TenantID:    tenantID,
		StudentID:   student.ID,
		StudentName: student.FullName,
		ClassID:     student.ClassID,
		ClassName:   className,
		AuthorID:    authorID,
		AuthorName:  authorName,
		Category:    input.Category,
		Note:        input.Note,
		Sensitivity: "sensitive_student",
		CreatedAt:   s.clock(),
	}
	s.observations = append(s.observations, created)
	return created, true
}

func (s *Store) lessonByID(id string) (scheduling.Lesson, bool) {
	for _, lesson := range s.schedule.Lessons {
		if lesson.ID == id {
			return lesson, true
		}
	}
	return scheduling.Lesson{}, false
}

func (s *Store) studentByID(id string) (school.Student, bool) {
	for _, student := range s.students {
		if student.ID == id {
			return student, true
		}
	}
	return school.Student{}, false
}

func (s *Store) classByID(id string) (school.Class, bool) {
	for _, class := range s.classes {
		if class.ID == id {
			return class, true
		}
	}
	return school.Class{}, false
}

func (s *Store) teacherByUserID(userID string) (school.Teacher, bool) {
	for _, teacher := range s.teachers {
		if teacher.UserID == userID {
			return teacher, true
		}
	}
	return school.Teacher{}, false
}

func normalizeSchoolDay(now time.Time) time.Time {
	return time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())
}

func newLesson(tenantID string, id string, scheduleID string, class school.Class, teacher school.Teacher, subject school.Subject, day time.Time, start string, end string, room string) scheduling.Lesson {
	startsAt := parseLessonTime(day, start)
	endsAt := parseLessonTime(day, end)
	return scheduling.Lesson{
		ID:          id,
		TenantID:    tenantID,
		ScheduleID:  scheduleID,
		ClassID:     class.ID,
		ClassName:   class.Name,
		TeacherID:   teacher.UserID,
		TeacherName: teacher.FullName,
		SubjectID:   subject.ID,
		SubjectName: subject.Name,
		DayOfWeek:   int(day.Weekday()),
		StartTime:   start,
		EndTime:     end,
		StartsAt:    startsAt,
		EndsAt:      endsAt,
		Room:        room,
	}
}

func parseLessonTime(day time.Time, value string) time.Time {
	parsed, err := time.Parse("15:04", value)
	if err != nil {
		return day
	}
	return time.Date(day.Year(), day.Month(), day.Day(), parsed.Hour(), parsed.Minute(), 0, 0, day.Location())
}
