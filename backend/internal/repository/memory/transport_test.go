package memory

import (
	"context"
	"errors"
	"testing"
	"time"

	transportapp "ots/backend/internal/app/transport"
	transportdomain "ots/backend/internal/domain/transport"
)

func TestTransportRouteCrudAndCapacityWarning(t *testing.T) {
	fixed := time.Date(2026, time.April, 30, 9, 5, 0, 0, time.Local)
	store := NewStore(func() time.Time { return fixed })
	service := transportapp.NewService(store, func() time.Time { return fixed })
	ctx := context.Background()

	route, err := service.CreateRoute(ctx, demoTenantID, demoPrincipalUserID, transportdomain.CreateRouteInput{
		Name:      "Yeni Sabah Rotası",
		Direction: transportdomain.DirectionMorning,
		VehicleID: "service-vehicle-1",
		DriverID:  "service-staff-driver-1",
		Stops: []transportdomain.RouteStopInput{
			{Name: "Birinci Durak", PlannedTime: "07:30"},
			{Name: "Okul", PlannedTime: "08:05"},
		},
	})
	if err != nil {
		t.Fatalf("expected route create, got %v", err)
	}
	if len(route.Stops) != 2 {
		t.Fatalf("expected two stops, got %d", len(route.Stops))
	}

	if _, err := service.AssignStudent(ctx, demoTenantID, demoPrincipalUserID, transportdomain.AssignmentInput{
		StudentID: "student-1",
		RouteID:   route.ID,
		StopID:    route.Stops[0].ID,
		Direction: transportdomain.DirectionMorning,
	}); err != nil {
		t.Fatalf("expected first assignment, got %v", err)
	}
	if _, err := service.AssignStudent(ctx, demoTenantID, demoPrincipalUserID, transportdomain.AssignmentInput{
		StudentID: "student-3",
		RouteID:   route.ID,
		StopID:    route.Stops[0].ID,
		Direction: transportdomain.DirectionMorning,
	}); err != nil {
		t.Fatalf("expected second assignment, got %v", err)
	}
	updated, err := service.Route(ctx, demoTenantID, route.ID)
	if err != nil {
		t.Fatalf("expected route lookup, got %v", err)
	}
	if updated.CapacityWarning == "" {
		t.Fatal("expected capacity warning after over assignment")
	}
}

func TestTransportGuardianSummaryScope(t *testing.T) {
	fixed := time.Date(2026, time.April, 30, 9, 5, 0, 0, time.Local)
	store := NewStore(func() time.Time { return fixed })
	service := transportapp.NewService(store, func() time.Time { return fixed })
	ctx := context.Background()

	summary, err := service.GuardianSummary(ctx, demoTenantID, demoGuardianUserID, "student-2")
	if err != nil {
		t.Fatalf("expected guardian summary, got %v", err)
	}
	if !summary.HasAssignment || len(summary.Routes) == 0 {
		t.Fatalf("expected route assignment, got %#v", summary)
	}
	if summary.Routes[0].DriverPhone == "" {
		t.Fatal("expected driver contact for guardian service details")
	}

	if _, err := service.GuardianSummary(ctx, demoTenantID, demoGuardianUserID, "student-1"); !errors.Is(err, transportapp.ErrForbidden) {
		t.Fatalf("expected forbidden for unlinked student, got %v", err)
	}
}

func TestTransportRouteUpdateDoesNotAutoNotifyGuardians(t *testing.T) {
	fixed := time.Date(2026, time.April, 30, 9, 5, 0, 0, time.Local)
	store := NewStore(func() time.Time { return fixed })
	service := transportapp.NewService(store, func() time.Time { return fixed })
	ctx := context.Background()

	before := len(store.notifications)
	name := "5/A Sabah Servisi Güncel"
	if _, err := service.UpdateRoute(ctx, demoTenantID, "service-route-5a-morning", demoPrincipalUserID, transportdomain.UpdateRouteInput{Name: &name}); err != nil {
		t.Fatalf("expected route update, got %v", err)
	}
	if len(store.notifications) != before {
		t.Fatalf("route update should not auto-notify guardians, before=%d after=%d", before, len(store.notifications))
	}
}
