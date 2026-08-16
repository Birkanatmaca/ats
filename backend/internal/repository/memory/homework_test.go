package memory

import (
	"context"
	"testing"
	"time"

	domain "ots/backend/internal/domain/homework"
)

func TestNewSeededHomeworkStoreCopiesSchoolRelations(t *testing.T) {
	clock := func() time.Time { return time.Date(2026, 6, 20, 10, 0, 0, 0, time.UTC) }
	source := NewStore(clock)
	store := NewSeededHomeworkStore(source, clock)
	ctx := context.Background()
	tenantID := "00000000-0000-0000-0000-000000010001"
	teacherID := "00000000-0000-0000-0000-000000010112"

	if !store.TeacherCanManageClass(ctx, tenantID, teacherID, "class-5a") {
		t.Fatal("seeded homework store should bind teacher to class-5a")
	}
	if store.TeacherCanManageClass(ctx, tenantID, teacherID, "class-ana") {
		t.Fatal("seeded homework store should not bind teacher to unrelated class")
	}

	classID, found := store.StudentCurrentClassID(ctx, tenantID, "student-2")
	if !found || classID != "class-5a" {
		t.Fatalf("student-2 class = %q, found=%v; want class-5a true", classID, found)
	}

	assignment, err := store.CreateAssignment(ctx, domain.Assignment{TenantID: tenantID, ClassID: "class-5a"})
	if err != nil {
		t.Fatalf("CreateAssignment() error = %v", err)
	}
	if !store.StudentCanAccessAssignment(ctx, tenantID, "student-2", assignment.ID) {
		t.Fatal("student-2 should access class-5a homework")
	}
	if store.StudentCanAccessAssignment(ctx, tenantID, "student-6", assignment.ID) {
		t.Fatal("student-6 should not access class-5a homework")
	}
}
