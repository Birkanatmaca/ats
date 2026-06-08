package memory

import (
	"context"
	"strings"
	"testing"
	"time"

	"ots/backend/internal/domain/attendance"
	"ots/backend/internal/domain/identity"
	superadmindomain "ots/backend/internal/domain/superadmin"
)

func TestAuthenticateDefaultSuperAdmin(t *testing.T) {
	fixed := time.Date(2026, time.April, 30, 9, 5, 0, 0, time.Local)
	store := NewStore(func() time.Time { return fixed })

	principal, ok, err := store.Authenticate(context.Background(), "superadmin@ots.local", "OtsAdmin!2026")
	if err != nil {
		t.Fatalf("unexpected auth error: %v", err)
	}
	if !ok {
		t.Fatal("expected default super admin credentials to authenticate")
	}
	if principal.Role != identity.RoleSuperAdmin {
		t.Fatalf("expected super admin role, got %s", principal.Role)
	}
}

func TestActiveLessonForTeacherUsesToleranceWindow(t *testing.T) {
	fixed := time.Date(2026, time.April, 30, 9, 5, 0, 0, time.Local)
	store := NewStore(func() time.Time { return fixed })

	lesson, found := store.ActiveLessonForTeacher(context.Background(), "00000000-0000-0000-0000-000000010001", "00000000-0000-0000-0000-000000010112", fixed)
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

	session, found := store.GetOrCreateAttendanceSession(context.Background(), "00000000-0000-0000-0000-000000010001", "lesson-1", "00000000-0000-0000-0000-000000010112")
	if !found {
		t.Fatal("expected attendance session")
	}
	if len(session.Records) != 3 {
		t.Fatalf("expected 3 students in class, got %d", len(session.Records))
	}

	updated, found := store.UpdateAttendanceRecords(context.Background(), "00000000-0000-0000-0000-000000010001", session.ID, "00000000-0000-0000-0000-000000010112", []attendance.RecordUpdate{
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

func TestFinalizeAttendanceSessionLocksUpdates(t *testing.T) {
	fixed := time.Date(2026, time.April, 30, 9, 5, 0, 0, time.Local)
	store := NewStore(func() time.Time { return fixed })

	session, found := store.GetOrCreateAttendanceSession(context.Background(), "00000000-0000-0000-0000-000000010001", "lesson-1", "00000000-0000-0000-0000-000000010112")
	if !found {
		t.Fatal("expected attendance session")
	}

	finalized, found := store.FinalizeAttendanceSession(context.Background(), "00000000-0000-0000-0000-000000010001", session.ID, fixed, "00000000-0000-0000-0000-000000010112")
	if !found || finalized.FinalizedAt == nil {
		t.Fatal("expected finalized session")
	}

	_, found = store.UpdateAttendanceRecords(context.Background(), "00000000-0000-0000-0000-000000010001", session.ID, "00000000-0000-0000-0000-000000010112", []attendance.RecordUpdate{
		{StudentID: "student-1", Status: attendance.StatusAbsent},
	})
	if found {
		t.Fatal("expected finalized session update to be rejected")
	}
}

func TestFinalizeAttendanceSessionCreatesAbsenceNotification(t *testing.T) {
	fixed := time.Date(2026, time.April, 30, 9, 5, 0, 0, time.Local)
	store := NewStore(func() time.Time { return fixed })

	session, found := store.GetOrCreateAttendanceSession(context.Background(), "00000000-0000-0000-0000-000000010001", "lesson-1", "00000000-0000-0000-0000-000000010112")
	if !found {
		t.Fatal("expected attendance session")
	}
	_, found = store.UpdateAttendanceRecords(context.Background(), "00000000-0000-0000-0000-000000010001", session.ID, "00000000-0000-0000-0000-000000010112", []attendance.RecordUpdate{
		{StudentID: "student-2", Status: attendance.StatusAbsent},
	})
	if !found {
		t.Fatal("expected session update")
	}

	before := len(store.notifications)
	_, found = store.FinalizeAttendanceSession(context.Background(), "00000000-0000-0000-0000-000000010001", session.ID, fixed, "00000000-0000-0000-0000-000000010112")
	if !found {
		t.Fatal("expected finalized session")
	}
	if len(store.notifications) <= before {
		t.Fatal("expected absence notification to be created")
	}
}

func TestAuditEntriesIncludeActorDetailsAndAllTenants(t *testing.T) {
	fixed := time.Date(2026, time.April, 30, 9, 5, 0, 0, time.UTC)
	store := NewStore(func() time.Time { return fixed })

	store.RecordOperationalAudit(context.Background(), "tenant-03", "user-super-admin", "ai.tenant_quota.update", "ai_tenant_quota", "tenant-03", `{"dailyMessageLimit":100}`)

	entries, err := store.ListAuditEntries(context.Background(), superadmindomain.AuditLogQuery{
		TenantID:  "tenant-03",
		ActorRole: string(identity.RoleSuperAdmin),
		Search:    "superadmin@ots.local",
		Limit:     10,
	})
	if err != nil {
		t.Fatalf("unexpected audit list error: %v", err)
	}
	if len(entries) == 0 {
		t.Fatal("expected tenant-03 audit entry")
	}
	found := false
	for _, entry := range entries {
		if entry.Action != "ai.tenant_quota.update" {
			continue
		}
		found = true
		if entry.Tenant != "Nova Etüt Merkezi" {
			t.Fatalf("expected tenant name, got %q", entry.Tenant)
		}
		if entry.ActorEmail != "superadmin@ots.local" || entry.ActorRole != string(identity.RoleSuperAdmin) {
			t.Fatalf("expected actor details, got email=%q role=%q", entry.ActorEmail, entry.ActorRole)
		}
		if !strings.Contains(entry.Metadata, "dailyMessageLimit") {
			t.Fatalf("expected metadata to be preserved, got %q", entry.Metadata)
		}
	}
	if !found {
		t.Fatal("expected ai.tenant_quota.update audit entry")
	}
}
