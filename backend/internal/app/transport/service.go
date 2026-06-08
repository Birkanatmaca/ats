package transport

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	transportdomain "ots/backend/internal/domain/transport"
)

var (
	ErrInvalidInput = errors.New("invalid transport input")
	ErrNotFound     = errors.New("transport record not found")
	ErrForbidden    = errors.New("transport access forbidden")
)

type Repository interface {
	ListServiceVehicles(ctx context.Context, tenantID string) ([]transportdomain.Vehicle, error)
	CreateServiceVehicle(ctx context.Context, tenantID string, input transportdomain.CreateVehicleInput) (transportdomain.Vehicle, error)
	UpdateServiceVehicle(ctx context.Context, tenantID, vehicleID string, input transportdomain.UpdateVehicleInput) (transportdomain.Vehicle, error)
	ListServiceStaff(ctx context.Context, tenantID string) ([]transportdomain.Staff, error)
	CreateServiceStaff(ctx context.Context, tenantID string, input transportdomain.CreateStaffInput) (transportdomain.Staff, error)
	UpdateServiceStaff(ctx context.Context, tenantID, staffID string, input transportdomain.UpdateStaffInput) (transportdomain.Staff, error)
	SetDriverSharing(ctx context.Context, tenantID, userID string, active bool, seenAt time.Time) (transportdomain.Staff, error)
	ListServiceRoutes(ctx context.Context, tenantID string) ([]transportdomain.Route, error)
	GetServiceRoute(ctx context.Context, tenantID, routeID string) (transportdomain.Route, bool, error)
	DriverServiceSummary(ctx context.Context, tenantID, userID string) (transportdomain.DriverServiceSummary, bool, error)
	StartServiceTrip(ctx context.Context, tenantID, driverUserID, routeID string, direction transportdomain.Direction, startedAt time.Time) (transportdomain.Trip, error)
	StopActiveServiceTrip(ctx context.Context, tenantID, driverUserID string, stoppedAt time.Time) (transportdomain.Trip, bool, error)
	RecordServiceTripLocation(ctx context.Context, tenantID, driverUserID, tripID string, input transportdomain.TripLocationInput, capturedAt time.Time) (transportdomain.TripLocation, error)
	ListActiveServiceTrips(ctx context.Context, tenantID string) ([]transportdomain.Trip, error)
	ActiveServiceTripForDriver(ctx context.Context, tenantID, driverUserID string) (transportdomain.Trip, bool, error)
	ActiveServiceTripForStudent(ctx context.Context, tenantID, studentID string) (transportdomain.Trip, bool, error)
	CreateServiceRoute(ctx context.Context, tenantID string, input transportdomain.CreateRouteInput) (transportdomain.Route, error)
	UpdateServiceRoute(ctx context.Context, tenantID, routeID string, input transportdomain.UpdateRouteInput) (transportdomain.Route, error)
	DeleteServiceRoute(ctx context.Context, tenantID, routeID string) error
	UpsertStudentServiceAssignment(ctx context.Context, tenantID string, input transportdomain.AssignmentInput) (transportdomain.Assignment, error)
	UpdateStudentServiceAssignment(ctx context.Context, tenantID, assignmentID string, input transportdomain.UpdateAssignmentInput) (transportdomain.Assignment, error)
	GuardianHasStudent(ctx context.Context, tenantID, guardianUserID, studentID string) bool
	GuardianServiceSummary(ctx context.Context, tenantID, studentID string) (transportdomain.GuardianServiceSummary, bool, error)
	NotifyServiceRouteGuardians(ctx context.Context, tenantID, routeID, title, body, kind string) (int, error)
	RecordOperationalAudit(ctx context.Context, tenantID, actorUserID, action, resourceType, resourceID, metadata string)
}

type Service struct {
	repo  Repository
	clock func() time.Time
}

func NewService(repo Repository, clock func() time.Time) *Service {
	if clock == nil {
		clock = time.Now
	}
	return &Service{repo: repo, clock: clock}
}

func (s *Service) Vehicles(ctx context.Context, tenantID string) ([]transportdomain.Vehicle, error) {
	return s.repo.ListServiceVehicles(ctx, tenantID)
}

func (s *Service) CreateVehicle(ctx context.Context, tenantID, actorUserID string, input transportdomain.CreateVehicleInput) (transportdomain.Vehicle, error) {
	input.Plate = strings.ToUpper(strings.TrimSpace(input.Plate))
	input.Brand = strings.TrimSpace(input.Brand)
	input.Model = strings.TrimSpace(input.Model)
	input.Status = normalizeStatus(input.Status)
	if input.Plate == "" || input.Capacity <= 0 {
		return transportdomain.Vehicle{}, ErrInvalidInput
	}
	created, err := s.repo.CreateServiceVehicle(ctx, tenantID, input)
	if err != nil {
		return transportdomain.Vehicle{}, err
	}
	s.repo.RecordOperationalAudit(ctx, tenantID, actorUserID, "service.vehicle.create", "service_vehicle", created.ID, `{}`)
	return created, nil
}

func (s *Service) UpdateVehicle(ctx context.Context, tenantID, vehicleID, actorUserID string, input transportdomain.UpdateVehicleInput) (transportdomain.Vehicle, error) {
	if input.Plate != nil {
		value := strings.ToUpper(strings.TrimSpace(*input.Plate))
		if value == "" {
			return transportdomain.Vehicle{}, ErrInvalidInput
		}
		input.Plate = &value
	}
	if input.Capacity != nil && *input.Capacity <= 0 {
		return transportdomain.Vehicle{}, ErrInvalidInput
	}
	if input.Brand != nil {
		value := strings.TrimSpace(*input.Brand)
		input.Brand = &value
	}
	if input.Model != nil {
		value := strings.TrimSpace(*input.Model)
		input.Model = &value
	}
	if input.Status != nil {
		value := normalizeStatus(*input.Status)
		input.Status = &value
	}
	item, err := s.repo.UpdateServiceVehicle(ctx, tenantID, strings.TrimSpace(vehicleID), input)
	if err != nil {
		return transportdomain.Vehicle{}, mapNotFound(err)
	}
	s.repo.RecordOperationalAudit(ctx, tenantID, actorUserID, "service.vehicle.update", "service_vehicle", item.ID, `{}`)
	return item, nil
}

func (s *Service) Staff(ctx context.Context, tenantID string) ([]transportdomain.Staff, error) {
	return s.repo.ListServiceStaff(ctx, tenantID)
}

func (s *Service) CreateStaff(ctx context.Context, tenantID, actorUserID string, input transportdomain.CreateStaffInput) (transportdomain.Staff, error) {
	input.FullName = strings.TrimSpace(input.FullName)
	input.Phone = strings.TrimSpace(input.Phone)
	input.Role = normalizeStaffRole(input.Role)
	input.Status = normalizeStatus(input.Status)
	if input.FullName == "" {
		return transportdomain.Staff{}, ErrInvalidInput
	}
	created, err := s.repo.CreateServiceStaff(ctx, tenantID, input)
	if err != nil {
		return transportdomain.Staff{}, err
	}
	s.repo.RecordOperationalAudit(ctx, tenantID, actorUserID, "service.staff.create", "service_staff", created.ID, `{}`)
	return created, nil
}

func (s *Service) StartDriverSharing(ctx context.Context, tenantID, userID, actorUserID string) (transportdomain.Staff, error) {
	staff, err := s.repo.SetDriverSharing(ctx, tenantID, strings.TrimSpace(userID), true, s.clock())
	if err != nil {
		return transportdomain.Staff{}, mapNotFound(err)
	}
	s.ensureActiveTripForDriver(ctx, tenantID, userID)
	s.repo.RecordOperationalAudit(ctx, tenantID, actorUserID, "service.driver.sharing.start", "service_staff", staff.ID, `{}`)
	return staff, nil
}

func (s *Service) StopDriverSharing(ctx context.Context, tenantID, userID, actorUserID string) (transportdomain.Staff, error) {
	staff, err := s.repo.SetDriverSharing(ctx, tenantID, strings.TrimSpace(userID), false, s.clock())
	if err != nil {
		return transportdomain.Staff{}, mapNotFound(err)
	}
	_, _, _ = s.repo.StopActiveServiceTrip(ctx, tenantID, userID, s.clock())
	s.repo.RecordOperationalAudit(ctx, tenantID, actorUserID, "service.driver.sharing.stop", "service_staff", staff.ID, `{}`)
	return staff, nil
}

func (s *Service) UpdateStaff(ctx context.Context, tenantID, staffID, actorUserID string, input transportdomain.UpdateStaffInput) (transportdomain.Staff, error) {
	if input.FullName != nil {
		value := strings.TrimSpace(*input.FullName)
		if value == "" {
			return transportdomain.Staff{}, ErrInvalidInput
		}
		input.FullName = &value
	}
	if input.Phone != nil {
		value := strings.TrimSpace(*input.Phone)
		input.Phone = &value
	}
	if input.Role != nil {
		value := normalizeStaffRole(*input.Role)
		input.Role = &value
	}
	if input.Status != nil {
		value := normalizeStatus(*input.Status)
		input.Status = &value
	}
	item, err := s.repo.UpdateServiceStaff(ctx, tenantID, strings.TrimSpace(staffID), input)
	if err != nil {
		return transportdomain.Staff{}, mapNotFound(err)
	}
	s.repo.RecordOperationalAudit(ctx, tenantID, actorUserID, "service.staff.update", "service_staff", item.ID, `{}`)
	return item, nil
}

func (s *Service) Routes(ctx context.Context, tenantID string) ([]transportdomain.Route, error) {
	return s.repo.ListServiceRoutes(ctx, tenantID)
}

func (s *Service) Route(ctx context.Context, tenantID, routeID string) (transportdomain.Route, error) {
	route, ok, err := s.repo.GetServiceRoute(ctx, tenantID, strings.TrimSpace(routeID))
	if err != nil {
		return transportdomain.Route{}, err
	}
	if !ok {
		return transportdomain.Route{}, ErrNotFound
	}
	return route, nil
}

func (s *Service) CreateRoute(ctx context.Context, tenantID, actorUserID string, input transportdomain.CreateRouteInput) (transportdomain.Route, error) {
	input.Name = strings.TrimSpace(input.Name)
	input.Direction = normalizeDirection(input.Direction)
	input.VehicleID = strings.TrimSpace(input.VehicleID)
	input.DriverID = strings.TrimSpace(input.DriverID)
	input.AttendantID = strings.TrimSpace(input.AttendantID)
	input.Status = normalizeStatus(input.Status)
	input.Stops = normalizeStops(input.Stops)
	if input.Name == "" {
		return transportdomain.Route{}, ErrInvalidInput
	}
	route, err := s.repo.CreateServiceRoute(ctx, tenantID, input)
	if err != nil {
		return transportdomain.Route{}, mapNotFound(err)
	}
	s.repo.RecordOperationalAudit(ctx, tenantID, actorUserID, "service.route.create", "service_route", route.ID, `{}`)
	return route, nil
}

func (s *Service) UpdateRoute(ctx context.Context, tenantID, routeID, actorUserID string, input transportdomain.UpdateRouteInput) (transportdomain.Route, error) {
	if input.Name != nil {
		value := strings.TrimSpace(*input.Name)
		if value == "" {
			return transportdomain.Route{}, ErrInvalidInput
		}
		input.Name = &value
	}
	if input.Direction != nil {
		value := normalizeDirection(*input.Direction)
		input.Direction = &value
	}
	if input.Status != nil {
		value := normalizeStatus(*input.Status)
		input.Status = &value
	}
	if input.VehicleID != nil {
		value := strings.TrimSpace(*input.VehicleID)
		input.VehicleID = &value
	}
	if input.DriverID != nil {
		value := strings.TrimSpace(*input.DriverID)
		input.DriverID = &value
	}
	if input.AttendantID != nil {
		value := strings.TrimSpace(*input.AttendantID)
		input.AttendantID = &value
	}
	if input.Stops != nil {
		stops := normalizeStops(*input.Stops)
		input.Stops = &stops
	}
	route, err := s.repo.UpdateServiceRoute(ctx, tenantID, strings.TrimSpace(routeID), input)
	if err != nil {
		return transportdomain.Route{}, mapNotFound(err)
	}
	s.repo.RecordOperationalAudit(ctx, tenantID, actorUserID, "service.route.update", "service_route", route.ID, `{}`)
	_, _ = s.repo.NotifyServiceRouteGuardians(
		ctx,
		tenantID,
		route.ID,
		"Servis rotası güncellendi",
		"Servis rota bilgilerinde değişiklik var. Detayları uygulamadan kontrol edin.",
		fmt.Sprintf("service_route_change:%s:%d", route.ID, s.clock().Unix()),
	)
	return route, nil
}

func (s *Service) DeleteRoute(ctx context.Context, tenantID, routeID, actorUserID string) error {
	routeID = strings.TrimSpace(routeID)
	if routeID == "" {
		return ErrInvalidInput
	}
	if err := s.repo.DeleteServiceRoute(ctx, tenantID, routeID); err != nil {
		return mapNotFound(err)
	}
	s.repo.RecordOperationalAudit(ctx, tenantID, actorUserID, "service.route.delete", "service_route", routeID, `{}`)
	return nil
}

func (s *Service) AssignStudent(ctx context.Context, tenantID, actorUserID string, input transportdomain.AssignmentInput) (transportdomain.Assignment, error) {
	input.StudentID = strings.TrimSpace(input.StudentID)
	input.RouteID = strings.TrimSpace(input.RouteID)
	input.StopID = strings.TrimSpace(input.StopID)
	input.Direction = normalizeDirection(input.Direction)
	input.Status = normalizeStatus(input.Status)
	if input.StudentID == "" || input.RouteID == "" {
		return transportdomain.Assignment{}, ErrInvalidInput
	}
	assignment, err := s.repo.UpsertStudentServiceAssignment(ctx, tenantID, input)
	if err != nil {
		return transportdomain.Assignment{}, mapNotFound(err)
	}
	s.repo.RecordOperationalAudit(ctx, tenantID, actorUserID, "service.assignment.upsert", "student_service_assignment", assignment.ID, fmt.Sprintf(`{"studentId":"%s","routeId":"%s"}`, input.StudentID, input.RouteID))
	return assignment, nil
}

func (s *Service) UpdateAssignment(ctx context.Context, tenantID, assignmentID, actorUserID string, input transportdomain.UpdateAssignmentInput) (transportdomain.Assignment, error) {
	if input.RouteID != nil {
		value := strings.TrimSpace(*input.RouteID)
		input.RouteID = &value
	}
	if input.StopID != nil {
		value := strings.TrimSpace(*input.StopID)
		input.StopID = &value
	}
	if input.Direction != nil {
		value := normalizeDirection(*input.Direction)
		input.Direction = &value
	}
	if input.Status != nil {
		value := normalizeStatus(*input.Status)
		input.Status = &value
	}
	assignment, err := s.repo.UpdateStudentServiceAssignment(ctx, tenantID, strings.TrimSpace(assignmentID), input)
	if err != nil {
		return transportdomain.Assignment{}, mapNotFound(err)
	}
	s.repo.RecordOperationalAudit(ctx, tenantID, actorUserID, "service.assignment.update", "student_service_assignment", assignment.ID, `{}`)
	return assignment, nil
}

func (s *Service) GuardianSummary(ctx context.Context, tenantID, guardianUserID, studentID string) (transportdomain.GuardianServiceSummary, error) {
	studentID = strings.TrimSpace(studentID)
	if studentID == "" || !s.repo.GuardianHasStudent(ctx, tenantID, guardianUserID, studentID) {
		return transportdomain.GuardianServiceSummary{}, ErrForbidden
	}
	summary, ok, err := s.repo.GuardianServiceSummary(ctx, tenantID, studentID)
	if err != nil {
		return transportdomain.GuardianServiceSummary{}, err
	}
	if !ok {
		return transportdomain.GuardianServiceSummary{}, ErrNotFound
	}
	if trip, ok, err := s.repo.ActiveServiceTripForStudent(ctx, tenantID, studentID); err != nil {
		return transportdomain.GuardianServiceSummary{}, err
	} else if ok {
		summary.ActiveTrip = &trip
	}
	summary.UpdatedAt = s.clock()
	return summary, nil
}

func (s *Service) DriverSummary(ctx context.Context, tenantID, driverUserID string) (transportdomain.DriverServiceSummary, error) {
	summary, ok, err := s.repo.DriverServiceSummary(ctx, tenantID, driverUserID)
	if err != nil {
		return transportdomain.DriverServiceSummary{}, err
	}
	if !ok {
		return transportdomain.DriverServiceSummary{}, ErrNotFound
	}
	if trip, ok, err := s.repo.ActiveServiceTripForDriver(ctx, tenantID, driverUserID); err != nil {
		return transportdomain.DriverServiceSummary{}, err
	} else if ok {
		summary.ActiveTrip = &trip
	}
	summary.UpdatedAt = s.clock()
	return summary, nil
}

func (s *Service) ActiveTrips(ctx context.Context, tenantID string) ([]transportdomain.Trip, error) {
	return s.repo.ListActiveServiceTrips(ctx, tenantID)
}

func (s *Service) GuardianActiveTrip(ctx context.Context, tenantID, guardianUserID, studentID string) (transportdomain.Trip, error) {
	studentID = strings.TrimSpace(studentID)
	if studentID == "" || !s.repo.GuardianHasStudent(ctx, tenantID, guardianUserID, studentID) {
		return transportdomain.Trip{}, ErrForbidden
	}
	trip, ok, err := s.repo.ActiveServiceTripForStudent(ctx, tenantID, studentID)
	if err != nil {
		return transportdomain.Trip{}, err
	}
	if !ok {
		return transportdomain.Trip{}, ErrNotFound
	}
	return trip, nil
}

func (s *Service) RecordDriverLocation(ctx context.Context, tenantID, driverUserID, tripID string, input transportdomain.TripLocationInput) (transportdomain.TripLocation, error) {
	tripID = strings.TrimSpace(tripID)
	if tripID == "" || input.Latitude < -90 || input.Latitude > 90 || input.Longitude < -180 || input.Longitude > 180 {
		return transportdomain.TripLocation{}, ErrInvalidInput
	}
	capturedAt := s.clock()
	if raw := strings.TrimSpace(input.CapturedAt); raw != "" {
		parsed, err := time.Parse(time.RFC3339, raw)
		if err != nil {
			return transportdomain.TripLocation{}, ErrInvalidInput
		}
		capturedAt = parsed
	}
	location, err := s.repo.RecordServiceTripLocation(ctx, tenantID, driverUserID, tripID, input, capturedAt)
	if err != nil {
		return transportdomain.TripLocation{}, mapNotFound(err)
	}
	return location, nil
}

func (s *Service) ensureActiveTripForDriver(ctx context.Context, tenantID, driverUserID string) {
	summary, ok, err := s.repo.DriverServiceSummary(ctx, tenantID, driverUserID)
	if err != nil || !ok || len(summary.Routes) == 0 {
		return
	}
	if _, ok, err := s.repo.ActiveServiceTripForDriver(ctx, tenantID, driverUserID); err != nil || ok {
		return
	}
	route := summary.Routes[0]
	_, _ = s.repo.StartServiceTrip(ctx, tenantID, driverUserID, route.ID, route.Direction, s.clock())
}

func normalizeDirection(value transportdomain.Direction) transportdomain.Direction {
	switch value {
	case transportdomain.DirectionEvening, transportdomain.DirectionBoth:
		return value
	default:
		return transportdomain.DirectionMorning
	}
}

func normalizeStatus(value transportdomain.Status) transportdomain.Status {
	switch value {
	case transportdomain.StatusPassive, transportdomain.StatusArchived:
		return value
	default:
		return transportdomain.StatusActive
	}
}

func normalizeStaffRole(value transportdomain.StaffRole) transportdomain.StaffRole {
	switch value {
	case transportdomain.StaffAttendant:
		return value
	default:
		return transportdomain.StaffDriver
	}
}

func normalizeStops(input []transportdomain.RouteStopInput) []transportdomain.RouteStopInput {
	out := make([]transportdomain.RouteStopInput, 0, len(input))
	for index, item := range input {
		item.ID = strings.TrimSpace(item.ID)
		item.Name = strings.TrimSpace(item.Name)
		item.PlannedTime = strings.TrimSpace(item.PlannedTime)
		if item.Name == "" || item.PlannedTime == "" {
			continue
		}
		if item.SortOrder <= 0 {
			item.SortOrder = index + 1
		}
		out = append(out, item)
	}
	return out
}

func mapNotFound(err error) error {
	if err == nil {
		return nil
	}
	text := strings.ToLower(err.Error())
	if strings.Contains(text, "not found") || strings.Contains(text, "no rows") {
		return ErrNotFound
	}
	return err
}
