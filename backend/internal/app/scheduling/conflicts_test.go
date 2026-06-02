package scheduling

import (
	"testing"

	domain "ots/backend/internal/domain/scheduling"
)

func TestBuildConflictsResultRoomConflict(t *testing.T) {
	lessons := []domain.Lesson{
		{ID: "l1", ClassID: "c1", ClassName: "9-A", TeacherID: "t1", TeacherName: "Ali", DayOfWeek: 1, StartTime: "09:00", Room: "101"},
		{ID: "l2", ClassID: "c2", ClassName: "9-B", TeacherID: "t2", TeacherName: "Ayşe", DayOfWeek: 1, StartTime: "09:00", Room: "101"},
	}
	result := BuildConflictsResult(lessons, nil)
	if result.Valid {
		t.Fatal("expected invalid schedule")
	}
	foundRoom := false
	for _, item := range result.Conflicts {
		if item.Type == "room" {
			foundRoom = true
		}
	}
	if !foundRoom {
		t.Fatalf("expected room conflict, got %+v", result.Conflicts)
	}
}

func TestValidateLessonsWithAvailabilitiesRejectsUnavailableTeacher(t *testing.T) {
	lessons := []domain.Lesson{
		{
			ID:          "l1",
			ClassID:     "c1",
			ClassName:   "9-A",
			TeacherID:   "teacher-user-1",
			TeacherName: "Ali",
			SubjectID:   "math",
			DayOfWeek:   1,
			StartTime:   "09:00",
			EndTime:     "09:40",
		},
	}
	availabilities := []domain.TeacherAvailability{
		{
			TeacherID:        "teacher-profile-1",
			TeacherUserID:    "teacher-user-1",
			TeacherName:      "Ali",
			DayOfWeek:        1,
			StartTime:        "10:00",
			EndTime:          "12:00",
			AvailabilityType: "available",
		},
	}

	result := ValidateLessonsWithAvailabilities(lessons, nil, availabilities)
	if result.Valid {
		t.Fatal("expected unavailable teacher to make schedule invalid")
	}
	if len(result.HardConflicts) != 1 {
		t.Fatalf("expected one hard conflict, got %+v", result.HardConflicts)
	}
}

func TestBuildConflictsResultWithAvailabilitiesAddsStructuredConflict(t *testing.T) {
	lessons := []domain.Lesson{
		{
			ID:          "l1",
			ClassID:     "c1",
			ClassName:   "9-A",
			TeacherID:   "teacher-user-1",
			TeacherName: "Ali",
			SubjectID:   "math",
			DayOfWeek:   2,
			StartTime:   "14:00",
			EndTime:     "14:40",
		},
	}
	availabilities := []domain.TeacherAvailability{
		{
			TeacherID:        "teacher-profile-1",
			TeacherUserID:    "teacher-user-1",
			TeacherName:      "Ali",
			DayOfWeek:        2,
			StartTime:        "08:00",
			EndTime:          "12:00",
			AvailabilityType: "available",
		},
	}

	result := BuildConflictsResultWithAvailabilities(lessons, nil, availabilities)
	if result.Valid {
		t.Fatal("expected invalid schedule")
	}
	for _, item := range result.Conflicts {
		if item.Type == "teacher_availability" && len(item.LessonIDs) == 1 && item.LessonIDs[0] == "l1" {
			return
		}
	}
	t.Fatalf("expected teacher availability conflict, got %+v", result.Conflicts)
}
