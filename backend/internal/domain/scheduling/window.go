package scheduling

import "time"

const AttendanceWindowMinutes = 10

func LessonAttendanceWindowOpen(lesson Lesson, now time.Time) bool {
	start := lesson.StartsAt.Add(-AttendanceWindowMinutes * time.Minute)
	end := lesson.EndsAt.Add(AttendanceWindowMinutes * time.Minute)
	return !now.Before(start) && !now.After(end)
}
