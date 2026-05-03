package memory

import (
	"context"
	"testing"
	"time"

	"ots/backend/internal/domain/attendance"
)

func TestActiveLessonForTeacherUsesToleranceWindow(t *testing.T) {
	fixed := time.Date(2026, time.April, 30, 9, 5, 0, 0, time.Local)
	store := NewStore(func() time.Time { return fixed })

	lesson, found := store.ActiveLessonForTeacher(context.Background(), "tenant-demo", "teacher-1", fixed)
	if !found {
		t.Fatal("expected active lesson for teacher")
	}
	if lesson.ID != "lesson-1" {
		t.Fatalf("expected lesson-1, got %s", lesson.ID)
	}
}

func TestAttendanceSessionCreatesClassRecords(t *testing.T) {
	fixed := time.Date(2026, time.April, 30, 9, 5, 0, 0, time.Local)
	store := NewStore(func() time.Time { return fixed })

	session, found := store.GetOrCreateAttendanceSession(context.Background(), "tenant-demo", "lesson-1")
	if !found {
		t.Fatal("expected attendance session")
	}
	if len(session.Records) != 3 {
		t.Fatalf("expected 3 students in class, got %d", len(session.Records))
	}

	updated, found := store.UpdateAttendanceRecords(context.Background(), "tenant-demo", session.ID, []attendance.RecordUpdate{
		{StudentID: "student-1", Status: attendance.StatusPresent},
		{StudentID: "student-2", Status: attendance.StatusAbsent},
	})
	if !found {
		t.Fatal("expected session update")
	}

	statuses := map[string]attendance.Status{}
	for _, record := range updated.Records {
		statuses[record.StudentID] = record.Status
	}
	if statuses["student-1"] != attendance.StatusPresent {
		t.Fatalf("expected student-1 present, got %s", statuses["student-1"])
	}
	if statuses["student-2"] != attendance.StatusAbsent {
		t.Fatalf("expected student-2 absent, got %s", statuses["student-2"])
	}
}
