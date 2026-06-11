package transport

import (
	"context"
	"fmt"
	"strings"
	"time"

	transportdomain "ots/backend/internal/domain/transport"
)

const approachingLeadMinutes = 15

type StudentTransportAlert struct {
	StudentID string
	RouteID   string
	TripID    string
	Title     string
	Body      string
	Kind      string
}

func (s *Service) EvaluateApproachingAlerts(ctx context.Context, tenantID, tripID string, at time.Time) ([]StudentTransportAlert, error) {
	trip, ok, err := s.repo.GetServiceTrip(ctx, tenantID, strings.TrimSpace(tripID))
	if err != nil {
		return nil, err
	}
	if !ok || trip.Status != transportdomain.TripActive {
		return nil, nil
	}
	stops, err := s.repo.ListStopsForRoute(ctx, tenantID, trip.RouteID)
	if err != nil {
		return nil, err
	}
	assignments, err := s.repo.ListAssignmentsForRoute(ctx, tenantID, trip.RouteID)
	if err != nil {
		return nil, err
	}
	stopByID := map[string]transportdomain.RouteStop{}
	for _, stop := range stops {
		stopByID[stop.ID] = stop
	}
	byStop := map[string][]transportdomain.Assignment{}
	for _, assignment := range assignments {
		if assignment.StopID == "" || assignment.Status != transportdomain.StatusActive {
			continue
		}
		byStop[assignment.StopID] = append(byStop[assignment.StopID], assignment)
	}

	out := make([]StudentTransportAlert, 0)
	for stopID, stop := range stopByID {
		if !shouldNotifyApproaching(trip, stop, at) {
			continue
		}
		notified, err := s.repo.HasTripStopAlert(ctx, tenantID, trip.ID, stopID)
		if err != nil || notified {
			continue
		}
		students := byStop[stopID]
		if len(students) == 0 {
			continue
		}
		if err := s.repo.MarkTripStopAlert(ctx, tenantID, trip.ID, stopID); err != nil {
			continue
		}
		etaLabel := formatPlannedTime(stop.PlannedTime)
		for _, assignment := range students {
			name := strings.TrimSpace(assignment.StudentName)
			if name == "" {
				name = "Öğrenciniz"
			}
			out = append(out, StudentTransportAlert{
				StudentID: assignment.StudentID,
				RouteID:   trip.RouteID,
				TripID:    trip.ID,
				Title:     "Servis yaklaşıyor",
				Body:      fmt.Sprintf("%s servisi %s durağına yaklaşıyor. Tahmini varış: %s.", trip.RouteName, stop.Name, etaLabel),
				Kind:      fmt.Sprintf("transport:approaching:%s:%s", trip.ID, stopID),
			})
		}
	}
	return out, nil
}

func shouldNotifyApproaching(trip transportdomain.Trip, stop transportdomain.RouteStop, at time.Time) bool {
	if stop.Latitude != nil && stop.Longitude != nil && trip.LastLocation != nil {
		if withinProximityKm(trip.LastLocation.Latitude, trip.LastLocation.Longitude, *stop.Latitude, *stop.Longitude, 0.5) {
			return true
		}
	}
	return plannedStopWindow(stop.PlannedTime, at)
}

func plannedStopWindow(plannedTime string, at time.Time) bool {
	planned, ok := parsePlannedClock(plannedTime, at)
	if !ok {
		return false
	}
	diff := planned.Sub(at)
	return diff <= approachingLeadMinutes*time.Minute && diff >= -5*time.Minute
}

func parsePlannedClock(plannedTime string, at time.Time) (time.Time, bool) {
	plannedTime = strings.TrimSpace(plannedTime)
	if plannedTime == "" {
		return time.Time{}, false
	}
	layout := "15:04"
	if strings.Count(plannedTime, ":") == 2 {
		layout = "15:04:05"
	}
	parsed, err := time.Parse(layout, plannedTime)
	if err != nil {
		return time.Time{}, false
	}
	loc := at.Location()
	return time.Date(at.Year(), at.Month(), at.Day(), parsed.Hour(), parsed.Minute(), parsed.Second(), 0, loc), true
}

func formatPlannedTime(plannedTime string) string {
	parsed, err := time.Parse("15:04:05", plannedTime)
	if err != nil {
		parsed, err = time.Parse("15:04", plannedTime)
		if err != nil {
			return plannedTime
		}
	}
	return parsed.Format("15:04")
}
