package memory

import (
	"context"
	"errors"
	"fmt"
	"sort"
	"strings"
	"time"

	schedulingapp "ots/backend/internal/app/scheduling"
	"ots/backend/internal/domain/dashboard"
	"ots/backend/internal/domain/scheduling"
	"ots/backend/internal/domain/school"
)

func (s *Store) ListRequirements(_ context.Context, tenantID string) []scheduling.ClassSubjectRequirement {
	s.mu.RLock()
	defer s.mu.RUnlock()
	if tenantID != s.tenant.ID {
		return nil
	}
	out := make([]scheduling.ClassSubjectRequirement, len(s.requirements))
	copy(out, s.requirements)
	return out
}

func (s *Store) SaveRequirements(_ context.Context, tenantID string, items []scheduling.RequirementInput) ([]scheduling.ClassSubjectRequirement, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if tenantID != s.tenant.ID {
		return nil, errors.New("tenant not found")
	}
	s.requirements = s.requirements[:0]
	for _, item := range items {
		if item.ClassID == "" || item.SubjectID == "" || item.WeeklyHours <= 0 {
			continue
		}
		className, subjectName := s.lookupClassSubjectNames(item.ClassID, item.SubjectID)
		s.requirements = append(s.requirements, scheduling.ClassSubjectRequirement{
			ID:          fmt.Sprintf("req-%s-%s", item.ClassID, item.SubjectID),
			TenantID:    tenantID,
			ClassID:     item.ClassID,
			ClassName:   className,
			SubjectID:   item.SubjectID,
			SubjectName: subjectName,
			WeeklyHours: item.WeeklyHours,
		})
	}
	out := make([]scheduling.ClassSubjectRequirement, len(s.requirements))
	copy(out, s.requirements)
	return out, nil
}

func (s *Store) ListTeacherAvailabilities(_ context.Context, tenantID string) []scheduling.TeacherAvailability {
	s.mu.RLock()
	defer s.mu.RUnlock()
	if tenantID != s.tenant.ID {
		return nil
	}
	out := make([]scheduling.TeacherAvailability, len(s.availabilities))
	copy(out, s.availabilities)
	return out
}

func (s *Store) SaveTeacherAvailabilities(_ context.Context, tenantID string, items []scheduling.AvailabilityInput) ([]scheduling.TeacherAvailability, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if tenantID != s.tenant.ID {
		return nil, errors.New("tenant not found")
	}
	s.availabilities = s.availabilities[:0]
	for _, item := range items {
		if item.TeacherID == "" {
			continue
		}
		teacher := s.teacherByProfileID(item.TeacherID)
		if teacher.ID == "" {
			teacher, _ = s.teacherByUserID(item.TeacherID)
		}
		s.availabilities = append(s.availabilities, scheduling.TeacherAvailability{
			ID:               fmt.Sprintf("avail-%s-%d", item.TeacherID, item.DayOfWeek),
			TenantID:         tenantID,
			TeacherID:        teacher.ID,
			TeacherUserID:    teacher.UserID,
			TeacherName:      teacher.FullName,
			DayOfWeek:        item.DayOfWeek,
			StartTime:        item.StartTime,
			EndTime:          item.EndTime,
			AvailabilityType: defaultAvailabilityType(item.AvailabilityType),
		})
	}
	out := make([]scheduling.TeacherAvailability, len(s.availabilities))
	copy(out, s.availabilities)
	return out, nil
}

func (s *Store) GetSchedule(_ context.Context, tenantID string, scheduleID string) (scheduling.Schedule, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	if tenantID != s.tenant.ID {
		return scheduling.Schedule{}, false
	}
	schedule, ok := s.schedules[scheduleID]
	return schedule, ok
}

func (s *Store) GenerateDraftSchedule(_ context.Context, tenantID string) scheduling.GenerationResult {
	s.mu.Lock()
	defer s.mu.Unlock()
	if tenantID != s.tenant.ID {
		return scheduling.GenerationResult{}
	}
	if len(s.requirements) == 0 {
		for _, class := range s.classes {
			for _, subject := range s.subjects {
				s.requirements = append(s.requirements, scheduling.ClassSubjectRequirement{
					ID: fmt.Sprintf("req-%s-%s", class.ID, subject.ID), TenantID: tenantID,
					ClassID: class.ID, ClassName: class.Name, SubjectID: subject.ID, SubjectName: subject.Name, WeeklyHours: 2,
				})
			}
		}
	}

	draftID := fmt.Sprintf("schedule-draft-%d", s.clock().UnixNano())
	lessons := s.greedyAssignLessons(draftID, tenantID)
	unassigned := 0
	for _, req := range s.requirements {
		assigned := 0
		for _, lesson := range lessons {
			if lesson.ClassID == req.ClassID && lesson.SubjectID == req.SubjectID {
				assigned++
			}
		}
		if assigned < req.WeeklyHours {
			unassigned += req.WeeklyHours - assigned
		}
	}

	draft := scheduling.Schedule{
		ID:        draftID,
		TenantID:  tenantID,
		Name:      "AI Taslak Program",
		Status:    scheduling.ScheduleDraft,
		Version:   s.schedule.Version + 1,
		Score:     100 - unassigned*5,
		Lessons:   lessons,
		UpdatedAt: s.clock(),
	}
	s.schedules[draftID] = draft

	warnings := []string{"Taslak üretildi."}
	if unassigned > 0 {
		warnings = append(warnings, fmt.Sprintf("%d ders saati atanamadı.", unassigned))
	}
	return scheduling.GenerationResult{
		Schedule:       draft,
		HardConflicts:  unassigned,
		SoftWarnings:   warnings,
		Recommendation: "Taslak incelemeye hazır.",
	}
}

func (s *Store) UpdateScheduleLesson(_ context.Context, tenantID string, scheduleID string, lessonID string, actorUserID string, input scheduling.UpdateLessonInput) (scheduling.Lesson, bool, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	schedule, ok := s.schedules[scheduleID]
	if !ok || tenantID != s.tenant.ID || schedule.Status != scheduling.ScheduleDraft {
		return scheduling.Lesson{}, false, nil
	}
	for index, lesson := range schedule.Lessons {
		if lesson.ID != lessonID {
			continue
		}
		before := memoryLessonSnapshot(lesson)
		if input.TeacherID != nil {
			teacher, ok := s.teacherByUserID(strings.TrimSpace(*input.TeacherID))
			if !ok {
				teacher = s.teacherByProfileID(strings.TrimSpace(*input.TeacherID))
				if teacher.ID == "" {
					return scheduling.Lesson{}, false, errors.New("teacher not found")
				}
			}
			lesson.TeacherID = teacher.UserID
			lesson.TeacherName = teacher.FullName
		}
		if input.SubjectID != nil {
			lesson.SubjectID = *input.SubjectID
			for _, subject := range s.subjects {
				if subject.ID == lesson.SubjectID {
					lesson.SubjectName = subject.Name
				}
			}
		}
		if input.DayOfWeek != nil {
			lesson.DayOfWeek = *input.DayOfWeek
		}
		if input.StartTime != nil {
			lesson.StartTime = *input.StartTime
		}
		if input.EndTime != nil {
			lesson.EndTime = *input.EndTime
		}
		if input.Room != nil {
			lesson.Room = *input.Room
		}
		lesson.StartsAt = lessonTime(s.clock(), lesson.DayOfWeek, lesson.StartTime)
		lesson.EndsAt = lessonTime(s.clock(), lesson.DayOfWeek, lesson.EndTime)
		schedule.Lessons[index] = lesson
		s.schedules[scheduleID] = schedule
		if actorUserID != "" {
			s.appendScheduleChangeLogLocked(scheduleID, actorUserID, lessonID, "lesson.update", before, memoryLessonSnapshot(lesson))
		}
		return lesson, true, nil
	}
	return scheduling.Lesson{}, false, nil
}

func (s *Store) ValidateSchedule(_ context.Context, tenantID string, scheduleID string) scheduling.ValidationResult {
	s.mu.RLock()
	defer s.mu.RUnlock()
	schedule, ok := s.schedules[scheduleID]
	if !ok || tenantID != s.tenant.ID {
		return scheduling.ValidationResult{Valid: false, HardConflicts: []string{"Program bulunamadı."}}
	}
	reqs := make([]scheduling.ClassSubjectRequirement, len(s.requirements))
	copy(reqs, s.requirements)
	availabilities := make([]scheduling.TeacherAvailability, len(s.availabilities))
	copy(availabilities, s.availabilities)
	return schedulingapp.ValidateLessonsWithAvailabilities(schedule.Lessons, reqs, availabilities)
}

func (s *Store) PublishSchedule(ctx context.Context, tenantID string, scheduleID string, actorUserID string) (scheduling.Schedule, bool, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	schedule, ok := s.schedules[scheduleID]
	if !ok || tenantID != s.tenant.ID || schedule.Status != scheduling.ScheduleDraft {
		return scheduling.Schedule{}, false, errors.New("draft not found")
	}
	validation := s.validateScheduleLocked(schedule)
	if !validation.Valid {
		return scheduling.Schedule{}, false, errors.New("schedule has hard conflicts")
	}
	for id, existing := range s.schedules {
		if existing.Status == scheduling.SchedulePublished {
			existing.Status = "archived"
			s.schedules[id] = existing
		}
	}
	schedule.Status = scheduling.SchedulePublished
	schedule.UpdatedAt = s.clock()
	s.schedules[scheduleID] = schedule
	s.schedule = schedule
	s.appendOperationalAuditLocked(tenantID, actorUserID, "schedule.publish", "schedule", scheduleID, `{}`)
	return schedule, true, nil
}

func (s *Store) ClassSummary(_ context.Context, tenantID string, classID string, date time.Time) (dashboard.ClassSummary, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	if tenantID != s.tenant.ID {
		return dashboard.ClassSummary{}, false
	}
	className := ""
	for _, class := range s.classes {
		if class.ID == classID {
			className = class.Name
			break
		}
	}
	if className == "" {
		return dashboard.ClassSummary{}, false
	}

	weekday := isoWeekdayMemory(date)
	lessonsTotal := 0
	for _, lesson := range s.schedule.Lessons {
		if lesson.ClassID == classID && lesson.DayOfWeek == weekday {
			lessonsTotal++
		}
	}

	dayStart := time.Date(date.Year(), date.Month(), date.Day(), 0, 0, 0, 0, date.Location())
	dayEnd := dayStart.Add(24 * time.Hour)
	lessonsCompleted := 0
	absentCount := 0
	for _, session := range s.sessions {
		if session.FinalizedAt == nil || session.StartedAt.Before(dayStart) || !session.StartedAt.Before(dayEnd) {
			continue
		}
		if session.ClassID != classID {
			continue
		}
		lessonsCompleted++
		for _, record := range session.Records {
			if record.Status == "absent" {
				absentCount++
			}
		}
	}

	studentsTotal := 0
	for _, student := range s.students {
		if student.ClassID == classID {
			studentsTotal++
		}
	}

	pct := 0
	if lessonsTotal > 0 {
		pct = lessonsCompleted * 100 / lessonsTotal
	}
	return dashboard.ClassSummary{
		ClassID: classID, ClassName: className, Date: dayStart.Format("2006-01-02"),
		LessonsTotal: lessonsTotal, LessonsCompleted: lessonsCompleted,
		AttendanceCompletionPct: pct, AbsentCount: absentCount, StudentsTotal: studentsTotal,
	}, true
}

func (s *Store) lookupClassSubjectNames(classID, subjectID string) (string, string) {
	className, subjectName := "", ""
	for _, class := range s.classes {
		if class.ID == classID {
			className = class.Name
		}
	}
	for _, subject := range s.subjects {
		if subject.ID == subjectID {
			subjectName = subject.Name
		}
	}
	return className, subjectName
}

func (s *Store) teacherByProfileID(profileID string) school.Teacher {
	for _, teacher := range s.teachers {
		if teacher.ID == profileID {
			return teacher
		}
	}
	return school.Teacher{}
}

func defaultAvailabilityType(value string) string {
	if strings.TrimSpace(value) == "" {
		return "available"
	}
	return value
}

func (s *Store) validateScheduleLocked(schedule scheduling.Schedule) scheduling.ValidationResult {
	reqs := make([]scheduling.ClassSubjectRequirement, len(s.requirements))
	copy(reqs, s.requirements)
	availabilities := make([]scheduling.TeacherAvailability, len(s.availabilities))
	copy(availabilities, s.availabilities)
	return schedulingapp.ValidateLessonsWithAvailabilities(schedule.Lessons, reqs, availabilities)
}

func (s *Store) greedyAssignLessons(scheduleID, tenantID string) []scheduling.Lesson {
	lessons := []scheduling.Lesson{}
	classBusy := map[string]map[int]map[string]bool{}
	teacherBusy := map[string]map[int]map[string]bool{}
	slotIndex := 0
	slots := memoryWeekSlots()

	for _, requirement := range s.requirements {
		teacher := s.teachers[0]
		for _, candidate := range s.teachers {
			teacher = candidate
			break
		}
		for placed := 0; placed < requirement.WeeklyHours; placed++ {
			assigned := false
			for try := 0; try < len(slots); try++ {
				slot := slots[(slotIndex+try)%len(slots)]
				if memoryIsBusy(classBusy, requirement.ClassID, slot.day, slot.start) {
					continue
				}
				if memoryIsBusy(teacherBusy, teacher.UserID, slot.day, slot.start) {
					continue
				}
				class := s.classes[0]
				for _, item := range s.classes {
					if item.ID == requirement.ClassID {
						class = item
						break
					}
				}
				lesson := newLesson(tenantID, fmt.Sprintf("lesson-%s-%d", scheduleID, slotIndex), scheduleID, class, teacher, school.Subject{ID: requirement.SubjectID, Name: requirement.SubjectName}, s.clock(), slot.start, slot.end, "")
				lesson.DayOfWeek = slot.day
				lessons = append(lessons, lesson)
				memoryMarkBusy(classBusy, requirement.ClassID, slot.day, slot.start)
				memoryMarkBusy(teacherBusy, teacher.UserID, slot.day, slot.start)
				slotIndex++
				assigned = true
				break
			}
			if !assigned {
				break
			}
		}
	}
	sort.Slice(lessons, func(i, j int) bool {
		if lessons[i].DayOfWeek == lessons[j].DayOfWeek {
			return lessons[i].StartTime < lessons[j].StartTime
		}
		return lessons[i].DayOfWeek < lessons[j].DayOfWeek
	})
	return lessons
}

type memorySlot struct {
	day   int
	start string
	end   string
}

func memoryWeekSlots() []memorySlot {
	days := []int{1, 2, 3, 4, 5}
	starts := []string{"08:00", "08:40", "09:20", "10:00", "10:40", "11:20", "12:00", "12:40", "13:20", "14:00", "14:20"}
	slots := make([]memorySlot, 0, len(days)*len(starts))
	for _, day := range days {
		for _, start := range starts {
			endMin := timeToMinutesMemory(start) + 40
			if endMin > 15*60 {
				continue
			}
			slots = append(slots, memorySlot{day: day, start: start, end: minutesToTimeMemory(endMin)})
		}
	}
	return slots
}

func memoryIsBusy(index map[string]map[int]map[string]bool, key string, day int, start string) bool {
	return index[key] != nil && index[key][day] != nil && index[key][day][start]
}

func memoryMarkBusy(index map[string]map[int]map[string]bool, key string, day int, start string) {
	if index[key] == nil {
		index[key] = map[int]map[string]bool{}
	}
	if index[key][day] == nil {
		index[key][day] = map[string]bool{}
	}
	index[key][day][start] = true
}

func isoWeekdayMemory(value time.Time) int {
	weekday := int(value.Weekday())
	if weekday == 0 {
		return 7
	}
	return weekday
}

func timeToMinutesMemory(value string) int {
	parsed, _ := time.Parse("15:04", value)
	return parsed.Hour()*60 + parsed.Minute()
}

func minutesToTimeMemory(total int) string {
	return fmt.Sprintf("%02d:%02d", total/60, total%60)
}

func lessonTime(ref time.Time, dayOfWeek int, value string) time.Time {
	parsed, err := time.Parse("15:04", value)
	if err != nil {
		parsed, _ = time.Parse("15:04:05", value)
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
	return time.Date(base.Year(), base.Month(), base.Day(), parsed.Hour(), parsed.Minute(), 0, 0, base.Location())
}
