package memory

import (
	"context"
	"testing"
	"time"

	"ots/backend/internal/domain/attendance"
	"ots/backend/internal/domain/observation"
	"ots/backend/internal/domain/scheduling"
	superadmindomain "ots/backend/internal/domain/superadmin"
)

const demoTenantID = "00000000-0000-0000-0000-000000010001"
const demoTeacherUserID = "00000000-0000-0000-0000-000000010112"
const demoGuardianUserID = "00000000-0000-0000-0000-000000010113"
const demoPrincipalUserID = "00000000-0000-0000-0000-000000010110"

func TestTenantIsolationReturnsEmptyData(t *testing.T) {
	fixed := time.Date(2026, time.April, 30, 9, 5, 0, 0, time.Local)
	store := NewStore(func() time.Time { return fixed })
	ctx := context.Background()

	if items := store.ListObservations(ctx, "tenant-other"); len(items) != 0 {
		t.Fatalf("expected empty observations for foreign tenant, got %d", len(items))
	}
	if store.GuardianHasStudent(ctx, "tenant-other", demoGuardianUserID, "student-2") {
		t.Fatal("expected guardian scope check to fail for foreign tenant")
	}
}

func TestSchedulePublishArchivesPreviousAndWritesAudit(t *testing.T) {
	fixed := time.Date(2026, time.April, 30, 9, 5, 0, 0, time.Local)
	store := NewStore(func() time.Time { return fixed })
	ctx := context.Background()

	before, _ := store.ListAuditEntries(ctx, superadmindomain.AuditLogQuery{})
	beforePublishAudits := 0
	for _, entry := range before {
		if entry.Action == "schedule.publish" {
			beforePublishAudits++
		}
	}

	generated := store.GenerateDraftSchedule(ctx, demoTenantID)
	if generated.Schedule.ID == "" {
		t.Fatal("expected generated draft schedule")
	}
	if !store.ValidateSchedule(ctx, demoTenantID, generated.Schedule.ID).Valid {
		t.Fatal("expected generated draft to validate")
	}

	published, ok, err := store.PublishSchedule(ctx, demoTenantID, generated.Schedule.ID, demoPrincipalUserID)
	if err != nil || !ok {
		t.Fatalf("expected publish to succeed, ok=%v err=%v", ok, err)
	}
	if published.Status != scheduling.SchedulePublished {
		t.Fatalf("expected published status, got %s", published.Status)
	}

	current, ok := store.GetSchedule(ctx, demoTenantID, "schedule-published")
	if !ok || current.Status != "archived" {
		t.Fatalf("expected previous published schedule archived, got %v status=%s", ok, current.Status)
	}

	after, _ := store.ListAuditEntries(ctx, superadmindomain.AuditLogQuery{})
	afterPublishAudits := 0
	for _, entry := range after {
		if entry.Action == "schedule.publish" {
			afterPublishAudits++
		}
	}
	if afterPublishAudits != beforePublishAudits+1 {
		t.Fatalf("expected one new schedule.publish audit, before=%d after=%d", beforePublishAudits, afterPublishAudits)
	}
}

func TestAttendanceSummaryPersistsAfterFinalize(t *testing.T) {
	fixed := time.Date(2026, time.April, 30, 9, 5, 0, 0, time.Local)
	store := NewStore(func() time.Time { return fixed })
	ctx := context.Background()

	session, found := store.GetOrCreateAttendanceSession(ctx, demoTenantID, "lesson-1", demoTeacherUserID)
	if !found {
		t.Fatal("expected attendance session")
	}
	_, found = store.UpdateAttendanceRecords(ctx, demoTenantID, session.ID, demoTeacherUserID, []attendance.RecordUpdate{
		{StudentID: "student-1", Status: attendance.StatusPresent},
		{StudentID: "student-2", Status: attendance.StatusAbsent},
	})
	if !found {
		t.Fatal("expected session update")
	}
	_, found = store.FinalizeAttendanceSession(ctx, demoTenantID, session.ID, fixed, demoTeacherUserID)
	if !found {
		t.Fatal("expected finalize")
	}

	summary, ok := store.StudentAttendanceSummary(ctx, demoTenantID, "student-2")
	if !ok {
		t.Fatal("expected attendance summary")
	}
	if summary.Absent != 1 {
		t.Fatalf("expected 1 absent record, got %d", summary.Absent)
	}
	if len(summary.Records) == 0 {
		t.Fatal("expected summary records")
	}
}

func TestGuardianScopeAllowsOnlyLinkedStudents(t *testing.T) {
	fixed := time.Date(2026, time.April, 30, 9, 5, 0, 0, time.Local)
	store := NewStore(func() time.Time { return fixed })
	ctx := context.Background()

	if !store.GuardianHasStudent(ctx, demoTenantID, demoGuardianUserID, "student-2") {
		t.Fatal("expected guardian to access linked student")
	}
	if store.GuardianHasStudent(ctx, demoTenantID, demoGuardianUserID, "student-1") {
		t.Fatal("expected guardian to be blocked from unlinked student")
	}
}

func TestTeacherObservationScope(t *testing.T) {
	fixed := time.Date(2026, time.April, 30, 9, 5, 0, 0, time.Local)
	store := NewStore(func() time.Time { return fixed })
	ctx := context.Background()

	if !store.TeacherCanObserveStudent(ctx, demoTenantID, demoTeacherUserID, "student-1") {
		t.Fatal("expected teacher to observe student in assigned class")
	}
	if store.TeacherCanObserveStudent(ctx, demoTenantID, demoTeacherUserID, "student-6") {
		t.Fatal("expected teacher to be blocked from student outside assigned classes")
	}

	created, ok := store.CreateObservation(ctx, demoTenantID, demoTeacherUserID, observation.CreateInput{
		StudentID: "student-1",
		Category:  observation.CategoryAttention,
		Note:      "Sınıf içi gözlem",
	})
	if !ok || created.ID == "" {
		t.Fatal("expected in-scope observation to be created")
	}
}

func TestGuidanceViewWritesAudit(t *testing.T) {
	fixed := time.Date(2026, time.April, 30, 9, 5, 0, 0, time.Local)
	store := NewStore(func() time.Time { return fixed })
	ctx := context.Background()

	before, _ := store.ListAuditEntries(ctx, superadmindomain.AuditLogQuery{})
	beforeGuidanceAudits := 0
	for _, entry := range before {
		if entry.Action == "guidance.view" {
			beforeGuidanceAudits++
		}
	}

	store.RecordOperationalAudit(ctx, demoTenantID, "00000000-0000-0000-0000-000000010111", "guidance.view", "student_observation", "", `{"count":2}`)

	after, _ := store.ListAuditEntries(ctx, superadmindomain.AuditLogQuery{})
	afterGuidanceAudits := 0
	for _, entry := range after {
		if entry.Action == "guidance.view" {
			afterGuidanceAudits++
		}
	}
	if afterGuidanceAudits != beforeGuidanceAudits+1 {
		t.Fatalf("expected one new guidance.view audit, before=%d after=%d", beforeGuidanceAudits, afterGuidanceAudits)
	}
}
