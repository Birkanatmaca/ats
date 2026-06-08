package memory

import (
	"context"
	"errors"
	"fmt"
	"sort"
	"strings"
	"time"

	transportdomain "ots/backend/internal/domain/transport"
)

func (s *Store) ListServiceVehicles(_ context.Context, tenantID string) ([]transportdomain.Vehicle, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	if tenantID != s.tenant.ID {
		return []transportdomain.Vehicle{}, nil
	}
	out := make([]transportdomain.Vehicle, 0, len(s.serviceVehicles))
	for _, item := range s.serviceVehicles {
		out = append(out, s.serviceVehicleSnapshotLocked(item))
	}
	sort.Slice(out, func(i, j int) bool { return out[i].Plate < out[j].Plate })
	return out, nil
}

func (s *Store) CreateServiceVehicle(_ context.Context, tenantID string, input transportdomain.CreateVehicleInput) (transportdomain.Vehicle, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if tenantID != s.tenant.ID {
		return transportdomain.Vehicle{}, errors.New("tenant not found")
	}
	now := s.clock()
	item := transportdomain.Vehicle{
		ID:        fmt.Sprintf("service-vehicle-%d", len(s.serviceVehicles)+1),
		TenantID:  tenantID,
		Plate:     strings.ToUpper(strings.TrimSpace(input.Plate)),
		Capacity:  input.Capacity,
		Brand:     strings.TrimSpace(input.Brand),
		Model:     strings.TrimSpace(input.Model),
		Status:    input.Status,
		CreatedAt: now,
		UpdatedAt: now,
	}
	s.serviceVehicles = append(s.serviceVehicles, item)
	return s.serviceVehicleSnapshotLocked(item), nil
}

func (s *Store) UpdateServiceVehicle(_ context.Context, tenantID, vehicleID string, input transportdomain.UpdateVehicleInput) (transportdomain.Vehicle, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if tenantID != s.tenant.ID {
		return transportdomain.Vehicle{}, errors.New("tenant not found")
	}
	for index := range s.serviceVehicles {
		if s.serviceVehicles[index].ID != vehicleID {
			continue
		}
		if input.Plate != nil {
			s.serviceVehicles[index].Plate = *input.Plate
		}
		if input.Capacity != nil {
			s.serviceVehicles[index].Capacity = *input.Capacity
		}
		if input.Brand != nil {
			s.serviceVehicles[index].Brand = *input.Brand
		}
		if input.Model != nil {
			s.serviceVehicles[index].Model = *input.Model
		}
		if input.Status != nil {
			s.serviceVehicles[index].Status = *input.Status
		}
		s.serviceVehicles[index].UpdatedAt = s.clock()
		return s.serviceVehicleSnapshotLocked(s.serviceVehicles[index]), nil
	}
	return transportdomain.Vehicle{}, errors.New("vehicle not found")
}

func (s *Store) ListServiceStaff(_ context.Context, tenantID string) ([]transportdomain.Staff, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	if tenantID != s.tenant.ID {
		return []transportdomain.Staff{}, nil
	}
	out := append([]transportdomain.Staff(nil), s.serviceStaff...)
	sort.Slice(out, func(i, j int) bool {
		if out[i].Role == out[j].Role {
			return out[i].FullName < out[j].FullName
		}
		return out[i].Role < out[j].Role
	})
	return out, nil
}

func (s *Store) SetDriverSharing(_ context.Context, tenantID, userID string, active bool, seenAt time.Time) (transportdomain.Staff, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if tenantID != s.tenant.ID {
		return transportdomain.Staff{}, errors.New("tenant not found")
	}
	for index := range s.serviceStaff {
		if s.serviceStaff[index].UserID != userID || s.serviceStaff[index].Role != transportdomain.StaffDriver {
			continue
		}
		if active {
			s.serviceStaff[index].SharingStatus = "active"
			s.serviceStaff[index].LastSeenAt = &seenAt
		} else {
			s.serviceStaff[index].SharingStatus = "passive"
			s.serviceStaff[index].LastSeenAt = &seenAt
		}
		s.serviceStaff[index].UpdatedAt = s.clock()
		return s.serviceStaff[index], nil
	}
	return transportdomain.Staff{}, errors.New("staff not found")
}

func (s *Store) CreateServiceStaff(_ context.Context, tenantID string, input transportdomain.CreateStaffInput) (transportdomain.Staff, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if tenantID != s.tenant.ID {
		return transportdomain.Staff{}, errors.New("tenant not found")
	}
	now := s.clock()
	item := transportdomain.Staff{
		ID:            fmt.Sprintf("service-staff-%d", len(s.serviceStaff)+1),
		TenantID:      tenantID,
		FullName:      strings.TrimSpace(input.FullName),
		Phone:         strings.TrimSpace(input.Phone),
		Role:          input.Role,
		Status:        input.Status,
		SharingStatus: "passive",
		CreatedAt:     now,
		UpdatedAt:     now,
	}
	s.serviceStaff = append(s.serviceStaff, item)
	return item, nil
}

func (s *Store) UpdateServiceStaff(_ context.Context, tenantID, staffID string, input transportdomain.UpdateStaffInput) (transportdomain.Staff, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if tenantID != s.tenant.ID {
		return transportdomain.Staff{}, errors.New("tenant not found")
	}
	for index := range s.serviceStaff {
		if s.serviceStaff[index].ID != staffID {
			continue
		}
		if input.FullName != nil {
			s.serviceStaff[index].FullName = *input.FullName
		}
		if input.Phone != nil {
			s.serviceStaff[index].Phone = *input.Phone
		}
		if input.Role != nil {
			s.serviceStaff[index].Role = *input.Role
		}
		if input.Status != nil {
			s.serviceStaff[index].Status = *input.Status
		}
		s.serviceStaff[index].UpdatedAt = s.clock()
		return s.serviceStaff[index], nil
	}
	return transportdomain.Staff{}, errors.New("staff not found")
}

func (s *Store) ListServiceRoutes(_ context.Context, tenantID string) ([]transportdomain.Route, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	if tenantID != s.tenant.ID {
		return []transportdomain.Route{}, nil
	}
	out := make([]transportdomain.Route, 0, len(s.serviceRoutes))
	for _, item := range s.serviceRoutes {
		if item.Status == transportdomain.StatusArchived {
			continue
		}
		out = append(out, s.serviceRouteSnapshotLocked(item))
	}
	sort.Slice(out, func(i, j int) bool { return out[i].Name < out[j].Name })
	return out, nil
}

func (s *Store) DriverServiceSummary(_ context.Context, tenantID, userID string) (transportdomain.DriverServiceSummary, bool, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	if tenantID != s.tenant.ID {
		return transportdomain.DriverServiceSummary{}, false, nil
	}
	staff, ok := s.serviceStaffByUserIDLocked(userID, transportdomain.StaffDriver)
	if !ok {
		return transportdomain.DriverServiceSummary{}, false, nil
	}
	summary := transportdomain.DriverServiceSummary{
		UserID:     userID,
		Staff:      staff,
		IsSharing:  staff.SharingStatus == "active",
		LastSeenAt: staff.LastSeenAt,
		Routes:     []transportdomain.Route{},
		UpdatedAt:  s.clock(),
	}
	for _, route := range s.serviceRoutes {
		if route.DriverID != staff.ID {
			continue
		}
		summary.Routes = append(summary.Routes, s.serviceRouteSnapshotLocked(route))
	}
	return summary, true, nil
}

func (s *Store) StartServiceTrip(_ context.Context, tenantID, driverUserID, routeID string, direction transportdomain.Direction, startedAt time.Time) (transportdomain.Trip, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if tenantID != s.tenant.ID {
		return transportdomain.Trip{}, errors.New("tenant not found")
	}
	route, ok := s.serviceRouteByIDLocked(routeID)
	if !ok || route.Status == transportdomain.StatusArchived {
		return transportdomain.Trip{}, errors.New("route not found")
	}
	driver, ok := s.serviceStaffByIDLocked(route.DriverID)
	if !ok || driver.UserID != driverUserID || driver.Role != transportdomain.StaffDriver {
		return transportdomain.Trip{}, errors.New("driver not found")
	}
	for _, trip := range s.serviceTrips {
		if trip.TenantID == tenantID && trip.DriverUserID == driverUserID && trip.Status == transportdomain.TripActive {
			return s.serviceTripSnapshotLocked(trip), nil
		}
	}
	if direction == "" {
		direction = route.Direction
	}
	if startedAt.IsZero() {
		startedAt = s.clock()
	}
	trip := transportdomain.Trip{
		ID:           fmt.Sprintf("service-trip-%d", len(s.serviceTrips)+1),
		TenantID:     tenantID,
		RouteID:      route.ID,
		DriverUserID: driverUserID,
		DriverID:     driver.ID,
		Direction:    direction,
		Status:       transportdomain.TripActive,
		StartedAt:    startedAt,
		CreatedAt:    startedAt,
		UpdatedAt:    startedAt,
	}
	s.serviceTrips = append(s.serviceTrips, trip)
	return s.serviceTripSnapshotLocked(trip), nil
}

func (s *Store) StopActiveServiceTrip(_ context.Context, tenantID, driverUserID string, stoppedAt time.Time) (transportdomain.Trip, bool, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if tenantID != s.tenant.ID {
		return transportdomain.Trip{}, false, nil
	}
	if stoppedAt.IsZero() {
		stoppedAt = s.clock()
	}
	for index := range s.serviceTrips {
		if s.serviceTrips[index].TenantID != tenantID || s.serviceTrips[index].DriverUserID != driverUserID || s.serviceTrips[index].Status != transportdomain.TripActive {
			continue
		}
		s.serviceTrips[index].Status = transportdomain.TripCompleted
		s.serviceTrips[index].EndedAt = &stoppedAt
		s.serviceTrips[index].UpdatedAt = stoppedAt
		return s.serviceTripSnapshotLocked(s.serviceTrips[index]), true, nil
	}
	return transportdomain.Trip{}, false, nil
}

func (s *Store) RecordServiceTripLocation(_ context.Context, tenantID, driverUserID, tripID string, input transportdomain.TripLocationInput, capturedAt time.Time) (transportdomain.TripLocation, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if tenantID != s.tenant.ID {
		return transportdomain.TripLocation{}, errors.New("tenant not found")
	}
	tripIndex := -1
	for index := range s.serviceTrips {
		if s.serviceTrips[index].ID == tripID && s.serviceTrips[index].TenantID == tenantID && s.serviceTrips[index].DriverUserID == driverUserID && s.serviceTrips[index].Status == transportdomain.TripActive {
			tripIndex = index
			break
		}
	}
	if tripIndex == -1 {
		return transportdomain.TripLocation{}, errors.New("trip not found")
	}
	if capturedAt.IsZero() {
		capturedAt = s.clock()
	}
	location := transportdomain.TripLocation{
		ID:             fmt.Sprintf("service-trip-location-%d", len(s.serviceTripLocations)+1),
		TenantID:       tenantID,
		TripID:         tripID,
		Latitude:       input.Latitude,
		Longitude:      input.Longitude,
		AccuracyMeters: input.AccuracyMeters,
		SpeedKPH:       input.SpeedKPH,
		HeadingDegrees: input.HeadingDegrees,
		CapturedAt:     capturedAt,
		CreatedAt:      s.clock(),
	}
	s.serviceTripLocations = append(s.serviceTripLocations, location)
	s.serviceTrips[tripIndex].UpdatedAt = location.CreatedAt
	return location, nil
}

func (s *Store) ListActiveServiceTrips(_ context.Context, tenantID string) ([]transportdomain.Trip, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	if tenantID != s.tenant.ID {
		return []transportdomain.Trip{}, nil
	}
	out := []transportdomain.Trip{}
	for _, trip := range s.serviceTrips {
		if trip.Status == transportdomain.TripActive {
			out = append(out, s.serviceTripSnapshotLocked(trip))
		}
	}
	sort.Slice(out, func(i, j int) bool { return out[i].StartedAt.Before(out[j].StartedAt) })
	return out, nil
}

func (s *Store) ActiveServiceTripForDriver(_ context.Context, tenantID, driverUserID string) (transportdomain.Trip, bool, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	if tenantID != s.tenant.ID {
		return transportdomain.Trip{}, false, nil
	}
	for _, trip := range s.serviceTrips {
		if trip.DriverUserID == driverUserID && trip.Status == transportdomain.TripActive {
			return s.serviceTripSnapshotLocked(trip), true, nil
		}
	}
	return transportdomain.Trip{}, false, nil
}

func (s *Store) ActiveServiceTripForStudent(_ context.Context, tenantID, studentID string) (transportdomain.Trip, bool, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	if tenantID != s.tenant.ID {
		return transportdomain.Trip{}, false, nil
	}
	activeRoutes := map[string]struct{}{}
	for _, assignment := range s.serviceAssignments {
		if assignment.StudentID == studentID && assignment.Status == transportdomain.StatusActive {
			activeRoutes[assignment.RouteID] = struct{}{}
		}
	}
	for _, trip := range s.serviceTrips {
		if trip.Status != transportdomain.TripActive {
			continue
		}
		if _, ok := activeRoutes[trip.RouteID]; ok {
			return s.serviceTripSnapshotLocked(trip), true, nil
		}
	}
	return transportdomain.Trip{}, false, nil
}

func (s *Store) GetServiceRoute(_ context.Context, tenantID, routeID string) (transportdomain.Route, bool, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	if tenantID != s.tenant.ID {
		return transportdomain.Route{}, false, nil
	}
	for _, item := range s.serviceRoutes {
		if item.ID == routeID && item.Status != transportdomain.StatusArchived {
			return s.serviceRouteSnapshotLocked(item), true, nil
		}
	}
	return transportdomain.Route{}, false, nil
}

func (s *Store) CreateServiceRoute(_ context.Context, tenantID string, input transportdomain.CreateRouteInput) (transportdomain.Route, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if tenantID != s.tenant.ID {
		return transportdomain.Route{}, errors.New("tenant not found")
	}
	if input.VehicleID != "" {
		if _, ok := s.serviceVehicleByIDLocked(input.VehicleID); !ok {
			return transportdomain.Route{}, errors.New("vehicle not found")
		}
	}
	if input.DriverID != "" {
		if _, ok := s.serviceStaffByIDLocked(input.DriverID); !ok {
			return transportdomain.Route{}, errors.New("driver not found")
		}
	}
	if input.AttendantID != "" {
		if _, ok := s.serviceStaffByIDLocked(input.AttendantID); !ok {
			return transportdomain.Route{}, errors.New("attendant not found")
		}
	}
	now := s.clock()
	route := transportdomain.Route{
		ID:          fmt.Sprintf("service-route-%d", len(s.serviceRoutes)+1),
		TenantID:    tenantID,
		Name:        strings.TrimSpace(input.Name),
		Direction:   input.Direction,
		VehicleID:   input.VehicleID,
		DriverID:    input.DriverID,
		AttendantID: input.AttendantID,
		Status:      input.Status,
		CreatedAt:   now,
		UpdatedAt:   now,
	}
	s.serviceRoutes = append(s.serviceRoutes, route)
	s.replaceServiceRouteStopsLocked(tenantID, route.ID, input.Stops)
	return s.serviceRouteSnapshotLocked(route), nil
}

func (s *Store) UpdateServiceRoute(_ context.Context, tenantID, routeID string, input transportdomain.UpdateRouteInput) (transportdomain.Route, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if tenantID != s.tenant.ID {
		return transportdomain.Route{}, errors.New("tenant not found")
	}
	for index := range s.serviceRoutes {
		if s.serviceRoutes[index].ID != routeID || s.serviceRoutes[index].Status == transportdomain.StatusArchived {
			continue
		}
		if input.Name != nil {
			s.serviceRoutes[index].Name = *input.Name
		}
		if input.Direction != nil {
			s.serviceRoutes[index].Direction = *input.Direction
		}
		if input.VehicleID != nil {
			if *input.VehicleID != "" {
				if _, ok := s.serviceVehicleByIDLocked(*input.VehicleID); !ok {
					return transportdomain.Route{}, errors.New("vehicle not found")
				}
			}
			s.serviceRoutes[index].VehicleID = *input.VehicleID
		}
		if input.DriverID != nil {
			if *input.DriverID != "" {
				if _, ok := s.serviceStaffByIDLocked(*input.DriverID); !ok {
					return transportdomain.Route{}, errors.New("driver not found")
				}
			}
			s.serviceRoutes[index].DriverID = *input.DriverID
		}
		if input.AttendantID != nil {
			if *input.AttendantID != "" {
				if _, ok := s.serviceStaffByIDLocked(*input.AttendantID); !ok {
					return transportdomain.Route{}, errors.New("attendant not found")
				}
			}
			s.serviceRoutes[index].AttendantID = *input.AttendantID
		}
		if input.Status != nil {
			s.serviceRoutes[index].Status = *input.Status
		}
		if input.Stops != nil {
			s.replaceServiceRouteStopsLocked(tenantID, routeID, *input.Stops)
		}
		s.serviceRoutes[index].UpdatedAt = s.clock()
		return s.serviceRouteSnapshotLocked(s.serviceRoutes[index]), nil
	}
	return transportdomain.Route{}, errors.New("route not found")
}

func (s *Store) DeleteServiceRoute(_ context.Context, tenantID, routeID string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	if tenantID != s.tenant.ID {
		return errors.New("tenant not found")
	}
	for index := range s.serviceRoutes {
		if s.serviceRoutes[index].ID != routeID {
			continue
		}
		s.serviceRoutes[index].Status = transportdomain.StatusArchived
		s.serviceRoutes[index].UpdatedAt = s.clock()
		for assignmentIndex := range s.serviceAssignments {
			if s.serviceAssignments[assignmentIndex].RouteID == routeID {
				s.serviceAssignments[assignmentIndex].Status = transportdomain.StatusArchived
				s.serviceAssignments[assignmentIndex].UpdatedAt = s.clock()
			}
		}
		return nil
	}
	return errors.New("route not found")
}

func (s *Store) UpsertStudentServiceAssignment(_ context.Context, tenantID string, input transportdomain.AssignmentInput) (transportdomain.Assignment, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if tenantID != s.tenant.ID {
		return transportdomain.Assignment{}, errors.New("tenant not found")
	}
	if _, ok := s.studentByIDLocked(input.StudentID); !ok {
		return transportdomain.Assignment{}, errors.New("student not found")
	}
	if _, ok := s.serviceRouteByIDLocked(input.RouteID); !ok {
		return transportdomain.Assignment{}, errors.New("route not found")
	}
	if input.StopID != "" {
		if _, ok := s.serviceStopByIDLocked(input.StopID); !ok {
			return transportdomain.Assignment{}, errors.New("stop not found")
		}
	}
	for index := range s.serviceAssignments {
		if s.serviceAssignments[index].StudentID == input.StudentID && s.serviceAssignments[index].Direction == input.Direction {
			s.serviceAssignments[index].RouteID = input.RouteID
			s.serviceAssignments[index].StopID = input.StopID
			s.serviceAssignments[index].Status = input.Status
			s.serviceAssignments[index].UpdatedAt = s.clock()
			return s.serviceAssignmentSnapshotLocked(s.serviceAssignments[index]), nil
		}
	}
	now := s.clock()
	item := transportdomain.Assignment{
		ID:        fmt.Sprintf("service-assignment-%d", len(s.serviceAssignments)+1),
		TenantID:  tenantID,
		StudentID: input.StudentID,
		RouteID:   input.RouteID,
		StopID:    input.StopID,
		Direction: input.Direction,
		Status:    input.Status,
		CreatedAt: now,
		UpdatedAt: now,
	}
	s.serviceAssignments = append(s.serviceAssignments, item)
	return s.serviceAssignmentSnapshotLocked(item), nil
}

func (s *Store) UpdateStudentServiceAssignment(_ context.Context, tenantID, assignmentID string, input transportdomain.UpdateAssignmentInput) (transportdomain.Assignment, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if tenantID != s.tenant.ID {
		return transportdomain.Assignment{}, errors.New("tenant not found")
	}
	for index := range s.serviceAssignments {
		if s.serviceAssignments[index].ID != assignmentID {
			continue
		}
		if input.RouteID != nil {
			if *input.RouteID != "" {
				if _, ok := s.serviceRouteByIDLocked(*input.RouteID); !ok {
					return transportdomain.Assignment{}, errors.New("route not found")
				}
			}
			s.serviceAssignments[index].RouteID = *input.RouteID
		}
		if input.StopID != nil {
			if *input.StopID != "" {
				if _, ok := s.serviceStopByIDLocked(*input.StopID); !ok {
					return transportdomain.Assignment{}, errors.New("stop not found")
				}
			}
			s.serviceAssignments[index].StopID = *input.StopID
		}
		if input.Direction != nil {
			s.serviceAssignments[index].Direction = *input.Direction
		}
		if input.Status != nil {
			s.serviceAssignments[index].Status = *input.Status
		}
		s.serviceAssignments[index].UpdatedAt = s.clock()
		return s.serviceAssignmentSnapshotLocked(s.serviceAssignments[index]), nil
	}
	return transportdomain.Assignment{}, errors.New("assignment not found")
}

func (s *Store) GuardianServiceSummary(_ context.Context, tenantID, studentID string) (transportdomain.GuardianServiceSummary, bool, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	if tenantID != s.tenant.ID {
		return transportdomain.GuardianServiceSummary{}, false, nil
	}
	student, ok := s.studentByIDLocked(studentID)
	if !ok {
		return transportdomain.GuardianServiceSummary{}, false, nil
	}
	summary := transportdomain.GuardianServiceSummary{
		StudentID:     student.ID,
		StudentName:   student.FullName,
		SchoolNumber:  student.Number,
		Assignments:   []transportdomain.Assignment{},
		Routes:        []transportdomain.Route{},
		UpdatedAt:     s.clock(),
		HasAssignment: false,
	}
	if class, ok := s.classByIDLocked(student.ClassID); ok {
		summary.ClassName = class.Name
	}
	seenRoutes := map[string]struct{}{}
	for _, assignment := range s.serviceAssignments {
		if assignment.StudentID != studentID || assignment.Status != transportdomain.StatusActive {
			continue
		}
		full := s.serviceAssignmentSnapshotLocked(assignment)
		summary.Assignments = append(summary.Assignments, full)
		summary.HasAssignment = true
		if _, seen := seenRoutes[assignment.RouteID]; !seen {
			if route, ok := s.serviceRouteByIDLocked(assignment.RouteID); ok {
				summary.Routes = append(summary.Routes, s.serviceRouteSnapshotLocked(route))
				seenRoutes[assignment.RouteID] = struct{}{}
			}
		}
	}
	return summary, true, nil
}

func (s *Store) NotifyServiceRouteGuardians(_ context.Context, tenantID, routeID, title, body, kind string) (int, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if tenantID != s.tenant.ID {
		return 0, errors.New("tenant not found")
	}
	userIDs := map[string]struct{}{}
	for _, assignment := range s.serviceAssignments {
		if assignment.RouteID != routeID || assignment.Status != transportdomain.StatusActive {
			continue
		}
		for _, link := range s.studentGuardians {
			if link.StudentID == assignment.StudentID {
				userIDs[link.GuardianUserID] = struct{}{}
			}
		}
	}
	created := 0
	for userID := range userIDs {
		exists := false
		for _, notification := range s.notifications {
			if notification.TenantID == tenantID && notification.UserID == userID && notification.Kind == kind {
				exists = true
				break
			}
		}
		if exists {
			continue
		}
		s.notifications = append(s.notifications, memoryNotification{
			ID:        fmt.Sprintf("notification-%d", len(s.notifications)+1),
			TenantID:  tenantID,
			UserID:    userID,
			Title:     title,
			Body:      body,
			Kind:      kind,
			CreatedAt: s.clock(),
		})
		created++
	}
	return created, nil
}

func (s *Store) serviceVehicleSnapshotLocked(item transportdomain.Vehicle) transportdomain.Vehicle {
	count := 0
	for _, route := range s.serviceRoutes {
		if route.VehicleID != item.ID || route.Status == transportdomain.StatusArchived {
			continue
		}
		for _, assignment := range s.serviceAssignments {
			if assignment.RouteID == route.ID && assignment.Status == transportdomain.StatusActive {
				count++
			}
		}
	}
	item.AssignedCount = count
	return item
}

func (s *Store) serviceRouteSnapshotLocked(route transportdomain.Route) transportdomain.Route {
	route.Stops = []transportdomain.RouteStop{}
	route.Assignments = []transportdomain.Assignment{}
	route.VehiclePlate = ""
	route.VehicleCapacity = 0
	route.DriverName = ""
	route.DriverPhone = ""
	route.AttendantName = ""
	route.AttendantPhone = ""
	if vehicle, ok := s.serviceVehicleByIDLocked(route.VehicleID); ok {
		route.VehiclePlate = vehicle.Plate
		route.VehicleCapacity = vehicle.Capacity
	}
	if driver, ok := s.serviceStaffByIDLocked(route.DriverID); ok {
		route.DriverName = driver.FullName
		route.DriverPhone = driver.Phone
		route.DriverSharingStatus = driver.SharingStatus
		route.DriverLastSeenAt = driver.LastSeenAt
	}
	if attendant, ok := s.serviceStaffByIDLocked(route.AttendantID); ok {
		route.AttendantName = attendant.FullName
		route.AttendantPhone = attendant.Phone
	}
	for _, stop := range s.serviceRouteStops {
		if stop.RouteID == route.ID {
			route.Stops = append(route.Stops, stop)
		}
	}
	for _, assignment := range s.serviceAssignments {
		if assignment.RouteID == route.ID && assignment.Status == transportdomain.StatusActive {
			route.Assignments = append(route.Assignments, s.serviceAssignmentSnapshotLocked(assignment))
		}
	}
	sort.Slice(route.Stops, func(i, j int) bool { return route.Stops[i].SortOrder < route.Stops[j].SortOrder })
	sort.Slice(route.Assignments, func(i, j int) bool { return route.Assignments[i].StudentName < route.Assignments[j].StudentName })
	if route.VehicleCapacity > 0 && len(route.Assignments) > route.VehicleCapacity {
		route.CapacityWarning = fmt.Sprintf("%d/%d kapasite aşıldı", len(route.Assignments), route.VehicleCapacity)
	}
	return route
}

func (s *Store) serviceAssignmentSnapshotLocked(item transportdomain.Assignment) transportdomain.Assignment {
	if student, ok := s.studentByIDLocked(item.StudentID); ok {
		item.StudentName = student.FullName
		item.SchoolNumber = student.Number
		item.ClassID = student.ClassID
		if class, ok := s.classByIDLocked(student.ClassID); ok {
			item.ClassName = class.Name
		}
	}
	if route, ok := s.serviceRouteByIDLocked(item.RouteID); ok {
		item.RouteName = route.Name
	}
	if stop, ok := s.serviceStopByIDLocked(item.StopID); ok {
		item.StopName = stop.Name
	}
	return item
}

func (s *Store) serviceTripSnapshotLocked(item transportdomain.Trip) transportdomain.Trip {
	if route, ok := s.serviceRouteByIDLocked(item.RouteID); ok {
		item.RouteName = route.Name
	}
	if driver, ok := s.serviceStaffByIDLocked(item.DriverID); ok {
		item.DriverName = driver.FullName
	}
	for index := range s.serviceTripLocations {
		location := s.serviceTripLocations[index]
		if location.TripID != item.ID {
			continue
		}
		if item.LastLocation == nil || location.CapturedAt.After(item.LastLocation.CapturedAt) {
			copy := location
			item.LastLocation = &copy
		}
	}
	return item
}

func (s *Store) replaceServiceRouteStopsLocked(tenantID, routeID string, input []transportdomain.RouteStopInput) {
	next := make([]transportdomain.RouteStop, 0, len(s.serviceRouteStops)+len(input))
	for _, stop := range s.serviceRouteStops {
		if stop.RouteID != routeID {
			next = append(next, stop)
		}
	}
	for index, item := range input {
		id := item.ID
		if id == "" {
			id = fmt.Sprintf("service-stop-%d", len(next)+index+1)
		}
		sortOrder := item.SortOrder
		if sortOrder <= 0 {
			sortOrder = index + 1
		}
		next = append(next, transportdomain.RouteStop{
			ID:          id,
			TenantID:    tenantID,
			RouteID:     routeID,
			Name:        strings.TrimSpace(item.Name),
			PlannedTime: strings.TrimSpace(item.PlannedTime),
			SortOrder:   sortOrder,
		})
	}
	s.serviceRouteStops = next
}

func (s *Store) serviceVehicleByIDLocked(id string) (transportdomain.Vehicle, bool) {
	for _, item := range s.serviceVehicles {
		if item.ID == id {
			return item, true
		}
	}
	return transportdomain.Vehicle{}, false
}

func (s *Store) serviceStaffByIDLocked(id string) (transportdomain.Staff, bool) {
	for _, item := range s.serviceStaff {
		if item.ID == id {
			return item, true
		}
	}
	return transportdomain.Staff{}, false
}

func (s *Store) serviceStaffByUserIDLocked(userID string, role transportdomain.StaffRole) (transportdomain.Staff, bool) {
	for _, item := range s.serviceStaff {
		if item.UserID == userID && item.Role == role {
			return item, true
		}
	}
	return transportdomain.Staff{}, false
}

func (s *Store) serviceRouteByIDLocked(id string) (transportdomain.Route, bool) {
	for _, item := range s.serviceRoutes {
		if item.ID == id {
			return item, true
		}
	}
	return transportdomain.Route{}, false
}

func (s *Store) serviceStopByIDLocked(id string) (transportdomain.RouteStop, bool) {
	for _, item := range s.serviceRouteStops {
		if item.ID == id {
			return item, true
		}
	}
	return transportdomain.RouteStop{}, false
}
