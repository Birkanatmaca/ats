package scheduling

import (
	"fmt"

	domain "ots/backend/internal/domain/scheduling"
)

func BuildConflictsResult(lessons []domain.Lesson, requirements []domain.ClassSubjectRequirement) domain.ConflictsResult {
	return BuildConflictsResultWithAvailabilities(lessons, requirements, nil)
}

func BuildConflictsResultWithAvailabilities(lessons []domain.Lesson, requirements []domain.ClassSubjectRequirement, availabilities []domain.TeacherAvailability) domain.ConflictsResult {
	validation := ValidateLessonsWithAvailabilities(lessons, requirements, availabilities)
	conflicts := make([]domain.ScheduleConflict, 0, len(validation.HardConflicts)+len(validation.SoftWarnings))

	classSlot := map[string]map[int]map[string][]string{}
	teacherSlot := map[string]map[int]map[string][]string{}
	roomSlot := map[string]map[int]map[string][]string{}
	availabilityConflicts := teacherAvailabilityConflicts(lessons, availabilities)

	for _, lesson := range lessons {
		start := lesson.StartTime
		if len(start) > 5 {
			start = start[:5]
		}
		if ids := classSlot[lesson.ClassID][lesson.DayOfWeek][start]; len(ids) > 0 {
			all := append(ids, lesson.ID)
			conflicts = append(conflicts, domain.ScheduleConflict{
				Severity:  domain.ConflictHard,
				Type:      "class",
				Message:   fmt.Sprintf("%s sınıfında %d. gün %s çakışması var.", lesson.ClassName, lesson.DayOfWeek, start),
				LessonIDs: all,
			})
		}
		if ids := teacherSlot[lesson.TeacherID][lesson.DayOfWeek][start]; len(ids) > 0 {
			all := append(ids, lesson.ID)
			conflicts = append(conflicts, domain.ScheduleConflict{
				Severity:  domain.ConflictHard,
				Type:      "teacher",
				Message:   fmt.Sprintf("%s öğretmeninde %d. gün %s çakışması var.", lesson.TeacherName, lesson.DayOfWeek, start),
				LessonIDs: all,
			})
		}
		room := lesson.Room
		if room != "" {
			if ids := roomSlot[room][lesson.DayOfWeek][start]; len(ids) > 0 {
				all := append(ids, lesson.ID)
				conflicts = append(conflicts, domain.ScheduleConflict{
					Severity:  domain.ConflictHard,
					Type:      "room",
					Message:   fmt.Sprintf("%s dersliğinde %d. gün %s çakışması var.", room, lesson.DayOfWeek, start),
					LessonIDs: all,
				})
			}
		}
		markConflictSlot(classSlot, lesson.ClassID, lesson.DayOfWeek, start, lesson.ID)
		markConflictSlot(teacherSlot, lesson.TeacherID, lesson.DayOfWeek, start, lesson.ID)
		if room != "" {
			markConflictSlot(roomSlot, room, lesson.DayOfWeek, start, lesson.ID)
		}
	}

	for _, warning := range validation.SoftWarnings {
		conflicts = append(conflicts, domain.ScheduleConflict{
			Severity: domain.ConflictSoft,
			Type:     "requirement",
			Message:  warning,
		})
	}
	for _, item := range availabilityConflicts {
		conflicts = append(conflicts, domain.ScheduleConflict{
			Severity:  domain.ConflictHard,
			Type:      "teacher_availability",
			Message:   item.message,
			LessonIDs: []string{item.lessonID},
		})
	}

	return domain.ConflictsResult{
		Valid:         validation.Valid,
		Conflicts:     conflicts,
		HardConflicts: validation.HardConflicts,
		SoftWarnings:  validation.SoftWarnings,
	}
}

func ValidateLessonsWithAvailabilities(lessons []domain.Lesson, requirements []domain.ClassSubjectRequirement, availabilities []domain.TeacherAvailability) domain.ValidationResult {
	validation := ValidateLessons(lessons, requirements)
	for _, conflict := range teacherAvailabilityConflicts(lessons, availabilities) {
		validation.HardConflicts = append(validation.HardConflicts, conflict.message)
	}
	validation.Valid = len(validation.HardConflicts) == 0
	return validation
}

func ValidateLessons(lessons []domain.Lesson, requirements []domain.ClassSubjectRequirement) domain.ValidationResult {
	hard := []string{}
	soft := []string{}

	classSlot := map[string]map[int]map[string]bool{}
	teacherSlot := map[string]map[int]map[string]bool{}
	roomSlot := map[string]map[int]map[string]bool{}
	for _, lesson := range lessons {
		start := lesson.StartTime
		if len(start) > 5 {
			start = start[:5]
		}
		if isConflictBusy(classSlot, lesson.ClassID, lesson.DayOfWeek, start) {
			hard = append(hard, fmt.Sprintf("%s sınıfında %d. gün %s çakışması var.", lesson.ClassName, lesson.DayOfWeek, start))
		}
		if isConflictBusy(teacherSlot, lesson.TeacherID, lesson.DayOfWeek, start) {
			hard = append(hard, fmt.Sprintf("%s öğretmeninde %d. gün %s çakışması var.", lesson.TeacherName, lesson.DayOfWeek, start))
		}
		if lesson.Room != "" && isConflictBusy(roomSlot, lesson.Room, lesson.DayOfWeek, start) {
			hard = append(hard, fmt.Sprintf("%s dersliğinde %d. gün %s çakışması var.", lesson.Room, lesson.DayOfWeek, start))
		}
		markConflictBusy(classSlot, lesson.ClassID, lesson.DayOfWeek, start)
		markConflictBusy(teacherSlot, lesson.TeacherID, lesson.DayOfWeek, start)
		if lesson.Room != "" {
			markConflictBusy(roomSlot, lesson.Room, lesson.DayOfWeek, start)
		}
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

	return domain.ValidationResult{
		Valid:         len(hard) == 0,
		HardConflicts: hard,
		SoftWarnings:  soft,
	}
}

type availabilityConflict struct {
	lessonID string
	message  string
}

type availabilityRange struct {
	dayOfWeek int
	start     string
	end       string
}

func teacherAvailabilityConflicts(lessons []domain.Lesson, availabilities []domain.TeacherAvailability) []availabilityConflict {
	if len(availabilities) == 0 {
		return nil
	}
	index := map[string][]availabilityRange{}
	for _, item := range availabilities {
		if item.AvailabilityType != "" && item.AvailabilityType != "available" {
			continue
		}
		window := availabilityRange{
			dayOfWeek: item.DayOfWeek,
			start:     normalizeScheduleTime(item.StartTime),
			end:       normalizeScheduleTime(item.EndTime),
		}
		if item.TeacherID != "" {
			index[item.TeacherID] = append(index[item.TeacherID], window)
		}
		if item.TeacherUserID != "" {
			index[item.TeacherUserID] = append(index[item.TeacherUserID], window)
		}
	}
	if len(index) == 0 {
		return nil
	}

	out := make([]availabilityConflict, 0)
	for _, lesson := range lessons {
		windows := index[lesson.TeacherID]
		if len(windows) == 0 {
			continue
		}
		if lessonWithinAvailability(lesson, windows) {
			continue
		}
		out = append(out, availabilityConflict{
			lessonID: lesson.ID,
			message:  fmt.Sprintf("%s öğretmeni %d. gün %s-%s aralığında müsait değil.", lesson.TeacherName, lesson.DayOfWeek, normalizeScheduleTime(lesson.StartTime), normalizeScheduleTime(lesson.EndTime)),
		})
	}
	return out
}

func lessonWithinAvailability(lesson domain.Lesson, windows []availabilityRange) bool {
	start := scheduleTimeToMinutes(lesson.StartTime)
	end := scheduleTimeToMinutes(lesson.EndTime)
	if start < 0 || end < 0 {
		return true
	}
	for _, window := range windows {
		if window.dayOfWeek != lesson.DayOfWeek {
			continue
		}
		windowStart := scheduleTimeToMinutes(window.start)
		windowEnd := scheduleTimeToMinutes(window.end)
		if windowStart < 0 || windowEnd < 0 {
			continue
		}
		if start >= windowStart && end <= windowEnd {
			return true
		}
	}
	return false
}

func normalizeScheduleTime(value string) string {
	if len(value) >= 5 {
		return value[:5]
	}
	return value
}

func scheduleTimeToMinutes(value string) int {
	value = normalizeScheduleTime(value)
	if len(value) != 5 || value[2] != ':' {
		return -1
	}
	for _, index := range []int{0, 1, 3, 4} {
		if value[index] < '0' || value[index] > '9' {
			return -1
		}
	}
	hour := int(value[0]-'0')*10 + int(value[1]-'0')
	minute := int(value[3]-'0')*10 + int(value[4]-'0')
	if hour < 0 || hour > 23 || minute < 0 || minute > 59 {
		return -1
	}
	return hour*60 + minute
}

func markConflictSlot(index map[string]map[int]map[string][]string, key string, day int, start string, lessonID string) {
	if index[key] == nil {
		index[key] = map[int]map[string][]string{}
	}
	if index[key][day] == nil {
		index[key][day] = map[string][]string{}
	}
	index[key][day][start] = append(index[key][day][start], lessonID)
}

func isConflictBusy(index map[string]map[int]map[string]bool, key string, day int, start string) bool {
	if index[key] == nil || index[key][day] == nil {
		return false
	}
	return index[key][day][start]
}

func markConflictBusy(index map[string]map[int]map[string]bool, key string, day int, start string) {
	if index[key] == nil {
		index[key] = map[int]map[string]bool{}
	}
	if index[key][day] == nil {
		index[key][day] = map[string]bool{}
	}
	index[key][day][start] = true
}
