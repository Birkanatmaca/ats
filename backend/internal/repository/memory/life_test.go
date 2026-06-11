package memory

import (
	"context"
	"errors"
	"testing"
	"time"

	lifeapp "ots/backend/internal/app/life"
	"ots/backend/internal/domain/identity"
	lifedomain "ots/backend/internal/domain/life"
)

func TestLifeMealCrudAndNotification(t *testing.T) {
	fixed := time.Date(2026, time.April, 30, 9, 5, 0, 0, time.Local)
	store := NewStore(func() time.Time { return fixed })
	service := lifeapp.NewService(store, func() time.Time { return fixed })
	ctx := context.Background()

	before := len(store.notifications)
	meal, err := service.CreateMeal(ctx, demoTenantID, demoPrincipalUserID, lifedomain.CreateMealInput{
		Date:      fixed.Format("2006-01-02"),
		MealType:  lifedomain.MealLunch,
		Title:     "Fırın tavuk",
		Allergens: []string{"Süt", "Süt", "Gluten"},
	})
	if err != nil {
		t.Fatalf("expected meal create, got %v", err)
	}
	if len(meal.Allergens) != 2 {
		t.Fatalf("expected deduplicated allergens, got %#v", meal.Allergens)
	}
	if len(store.notifications) <= before {
		t.Fatalf("expected guardian meal notification, before=%d after=%d", before, len(store.notifications))
	}

	title := "Sebze çorbası"
	updated, err := service.UpdateMeal(ctx, demoTenantID, meal.ID, demoPrincipalUserID, lifedomain.UpdateMealInput{Title: &title})
	if err != nil {
		t.Fatalf("expected meal update, got %v", err)
	}
	if updated.Title != title {
		t.Fatalf("expected updated meal title, got %s", updated.Title)
	}
}

func TestLifeGuardianSummaryScope(t *testing.T) {
	fixed := time.Date(2026, time.April, 30, 9, 5, 0, 0, time.Local)
	store := NewStore(func() time.Time { return fixed })
	service := lifeapp.NewService(store, func() time.Time { return fixed })
	ctx := context.Background()

	summary, err := service.GuardianSummary(ctx, demoTenantID, demoGuardianUserID, "student-2")
	if err != nil {
		t.Fatalf("expected guardian life summary, got %v", err)
	}
	if len(summary.Meals) == 0 || len(summary.StudySessions) == 0 || len(summary.ClubMemberships) == 0 {
		t.Fatalf("expected meals, study sessions and clubs, got %#v", summary)
	}
	if _, err := service.GuardianSummary(ctx, demoTenantID, demoGuardianUserID, "student-1"); !errors.Is(err, lifeapp.ErrForbidden) {
		t.Fatalf("expected forbidden for unlinked student, got %v", err)
	}
}

func TestLifeStudyAttendanceTeacherAndNotification(t *testing.T) {
	fixed := time.Date(2026, time.April, 30, 9, 5, 0, 0, time.Local)
	store := NewStore(func() time.Time { return fixed })
	service := lifeapp.NewService(store, func() time.Time { return fixed })
	ctx := context.Background()
	teacher := identity.Principal{TenantID: demoTenantID, UserID: demoTeacherUserID, Role: identity.RoleTeacher}

	before := len(store.notifications)
	records, err := service.RecordStudyAttendance(ctx, teacher, "study-session-math-5a", lifedomain.RecordStudyAttendanceInput{
		Records: []lifedomain.StudyAttendanceInput{{StudentID: "student-2", Status: lifedomain.StudyAbsent}},
	})
	if err != nil {
		t.Fatalf("expected teacher attendance write, got %v", err)
	}
	if len(records) != 1 || records[0].Status != lifedomain.StudyAbsent {
		t.Fatalf("expected absent record, got %#v", records)
	}
	if len(store.notifications) <= before {
		t.Fatalf("expected absence notification, before=%d after=%d", before, len(store.notifications))
	}

	otherTeacher := identity.Principal{TenantID: demoTenantID, UserID: "teacher-2", Role: identity.RoleTeacher}
	if _, err := service.RecordStudyAttendance(ctx, otherTeacher, "study-session-math-5a", lifedomain.RecordStudyAttendanceInput{
		Records: []lifedomain.StudyAttendanceInput{{StudentID: "student-2", Status: lifedomain.StudyAttended}},
	}); !errors.Is(err, lifeapp.ErrForbidden) {
		t.Fatalf("expected forbidden for non-assigned teacher, got %v", err)
	}
}

func TestLifeClubCapacityWaitlist(t *testing.T) {
	fixed := time.Date(2026, time.April, 30, 9, 5, 0, 0, time.Local)
	store := NewStore(func() time.Time { return fixed })
	service := lifeapp.NewService(store, func() time.Time { return fixed })
	ctx := context.Background()
	principal := identity.Principal{TenantID: demoTenantID, UserID: demoPrincipalUserID, Role: identity.RolePrincipal}

	membership, err := service.AddClubMembership(ctx, principal, "club-robotics", lifedomain.ClubMembershipInput{
		StudentID: "student-1",
		Status:    lifedomain.ClubMembershipActive,
	})
	if err != nil {
		t.Fatalf("expected club membership, got %v", err)
	}
	if membership.Status != lifedomain.ClubMembershipWaitlisted {
		t.Fatalf("expected waitlisted membership when capacity is full, got %s", membership.Status)
	}
}
