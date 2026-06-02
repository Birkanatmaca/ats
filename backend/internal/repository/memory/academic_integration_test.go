package memory

import (
	"context"
	"errors"
	"testing"
	"time"

	academicapp "ots/backend/internal/app/academic"
	academicdomain "ots/backend/internal/domain/academic"
	"ots/backend/internal/domain/identity"
)

func TestAcademicGuardianReportScope(t *testing.T) {
	fixed := time.Date(2026, time.April, 30, 9, 5, 0, 0, time.Local)
	store := NewStore(func() time.Time { return fixed })
	service := academicapp.NewService(store, func() time.Time { return fixed })
	ctx := context.Background()
	guardian := identity.Principal{TenantID: demoTenantID, UserID: demoGuardianUserID, Role: identity.RoleGuardian}

	report, err := service.GuardianReport(ctx, guardian, "student-2")
	if err != nil {
		t.Fatalf("expected linked student report, got %v", err)
	}
	if report.Student.ID != "student-2" || report.AssessmentCount == 0 {
		t.Fatalf("unexpected report: %+v", report)
	}
	if _, err := service.GuardianReport(ctx, guardian, "student-1"); !errors.Is(err, academicapp.ErrForbidden) {
		t.Fatalf("expected forbidden for unlinked student, got %v", err)
	}
}

func TestAcademicImportSeparatesDuplicateRows(t *testing.T) {
	fixed := time.Date(2026, time.April, 30, 9, 5, 0, 0, time.Local)
	store := NewStore(func() time.Time { return fixed })
	service := academicapp.NewService(store, func() time.Time { return fixed })
	ctx := context.Background()
	teacher := identity.Principal{TenantID: demoTenantID, UserID: demoTeacherUserID, Role: identity.RoleTeacher}

	result, err := service.ImportResults(ctx, teacher, academicdomain.ImportResultsInput{
		AssessmentID: "assessment-math-1",
		Rows: []academicdomain.ResultInput{
			{StudentID: "student-1", Score: 90},
			{StudentID: "student-1", Score: 91},
			{SchoolNumber: "999", Score: 40},
		},
	})
	if err != nil {
		t.Fatalf("expected import result, got %v", err)
	}
	if result.Imported != 1 || result.Failed != 2 {
		t.Fatalf("expected 1 imported and 2 failed, got %+v", result)
	}
}

func TestAcademicClassSummaryFlagsSupportStudents(t *testing.T) {
	fixed := time.Date(2026, time.April, 30, 9, 5, 0, 0, time.Local)
	store := NewStore(func() time.Time { return fixed })
	service := academicapp.NewService(store, func() time.Time { return fixed })
	ctx := context.Background()
	principal := identity.Principal{TenantID: demoTenantID, UserID: demoPrincipalUserID, Role: identity.RolePrincipal}

	summary, err := service.ClassSummary(ctx, principal, "class-5a")
	if err != nil {
		t.Fatalf("expected class summary, got %v", err)
	}
	if summary.AveragePercent == 0 || len(summary.SubjectSummaries) == 0 {
		t.Fatalf("expected academic summary data, got %+v", summary)
	}
	found := false
	for _, student := range summary.SupportStudents {
		if student.StudentID == "student-2" {
			found = true
		}
	}
	if !found {
		t.Fatalf("expected student-2 in support list, got %+v", summary.SupportStudents)
	}
}
