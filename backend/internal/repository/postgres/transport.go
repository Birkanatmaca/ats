package postgres

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"sort"
	"time"

	transportdomain "ots/backend/internal/domain/transport"
)

func (s *Store) ListServiceVehicles(ctx context.Context, tenantID string) ([]transportdomain.Vehicle, error) {
	rows, err := s.db.QueryContext(ctx, `
SELECT v.id::text, v.tenant_id::text, v.plate, v.capacity, v.brand, v.model, v.status,
       COALESCE(assignments.assigned_count, 0)::int, v.created_at, v.updated_at
FROM service_vehicles v
LEFT JOIN LATERAL (
	SELECT COUNT(*) AS assigned_count
	FROM service_routes sr
	JOIN student_service_assignments ssa ON ssa.route_id = sr.id AND ssa.tenant_id = sr.tenant_id
	WHERE sr.tenant_id = v.tenant_id AND sr.vehicle_id = v.id
	  AND sr.status <> 'archived'
	  AND ssa.status = 'active'
) assignments ON true
WHERE v.tenant_id = $1 AND v.status <> 'archived'
ORDER BY v.plate`, tenantID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []transportdomain.Vehicle{}
	for rows.Next() {
		item, ok := scanServiceVehicle(rows)
		if ok {
			out = append(out, item)
		}
	}
	return out, rows.Err()
}

func (s *Store) CreateServiceVehicle(ctx context.Context, tenantID string, input transportdomain.CreateVehicleInput) (transportdomain.Vehicle, error) {
	var id string
	err := s.db.QueryRowContext(ctx, `
INSERT INTO service_vehicles (tenant_id, plate, capacity, brand, model, status)
VALUES ($1::uuid, $2, $3, $4, $5, $6)
RETURNING id::text`, tenantID, input.Plate, input.Capacity, input.Brand, input.Model, string(input.Status)).Scan(&id)
	if err != nil {
		return transportdomain.Vehicle{}, err
	}
	return s.getServiceVehicle(ctx, tenantID, id)
}

func (s *Store) UpdateServiceVehicle(ctx context.Context, tenantID, vehicleID string, input transportdomain.UpdateVehicleInput) (transportdomain.Vehicle, error) {
	current, err := s.getServiceVehicle(ctx, tenantID, vehicleID)
	if err != nil {
		return transportdomain.Vehicle{}, err
	}
	plate := current.Plate
	capacity := current.Capacity
	brand := current.Brand
	model := current.Model
	status := current.Status
	if input.Plate != nil {
		plate = *input.Plate
	}
	if input.Capacity != nil {
		capacity = *input.Capacity
	}
	if input.Brand != nil {
		brand = *input.Brand
	}
	if input.Model != nil {
		model = *input.Model
	}
	if input.Status != nil {
		status = *input.Status
	}
	result, err := s.db.ExecContext(ctx, `
UPDATE service_vehicles
SET plate = $3, capacity = $4, brand = $5, model = $6, status = $7, updated_at = now()
WHERE tenant_id = $1 AND id = $2::uuid`, tenantID, vehicleID, plate, capacity, brand, model, string(status))
	if err != nil {
		return transportdomain.Vehicle{}, err
	}
	if affected, _ := result.RowsAffected(); affected == 0 {
		return transportdomain.Vehicle{}, errors.New("vehicle not found")
	}
	return s.getServiceVehicle(ctx, tenantID, vehicleID)
}

func (s *Store) ListServiceStaff(ctx context.Context, tenantID string) ([]transportdomain.Staff, error) {
	rows, err := s.db.QueryContext(ctx, `
SELECT id::text, tenant_id::text, COALESCE(user_id::text, ''), full_name, phone, role, status, sharing_status, last_seen_at, created_at, updated_at
FROM service_staff
WHERE tenant_id = $1 AND status <> 'archived'
ORDER BY role, full_name`, tenantID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []transportdomain.Staff{}
	for rows.Next() {
		item, ok := scanServiceStaff(rows)
		if ok {
			out = append(out, item)
		}
	}
	return out, rows.Err()
}

func (s *Store) CreateServiceStaff(ctx context.Context, tenantID string, input transportdomain.CreateStaffInput) (transportdomain.Staff, error) {
	var id string
	err := s.db.QueryRowContext(ctx, `
INSERT INTO service_staff (tenant_id, full_name, phone, role, status)
VALUES ($1::uuid, $2, $3, $4, $5)
RETURNING id::text`, tenantID, input.FullName, input.Phone, string(input.Role), string(input.Status)).Scan(&id)
	if err != nil {
		return transportdomain.Staff{}, err
	}
	return s.getServiceStaff(ctx, tenantID, id)
}

func (s *Store) SetDriverSharing(ctx context.Context, tenantID, userID string, active bool, seenAt time.Time) (transportdomain.Staff, error) {
	sharingStatus := "passive"
	if active {
		sharingStatus = "active"
	}
	var id string
	err := s.db.QueryRowContext(ctx, `
UPDATE service_staff
SET sharing_status = $3, last_seen_at = $4, updated_at = now()
WHERE tenant_id = $1::uuid AND user_id = $2::uuid AND role = 'driver' AND status <> 'archived'
RETURNING id::text`, tenantID, userID, sharingStatus, seenAt).Scan(&id)
	if errors.Is(err, sql.ErrNoRows) {
		return transportdomain.Staff{}, errors.New("staff not found")
	}
	if err != nil {
		return transportdomain.Staff{}, err
	}
	return s.getServiceStaff(ctx, tenantID, id)
}

func (s *Store) UpdateServiceStaff(ctx context.Context, tenantID, staffID string, input transportdomain.UpdateStaffInput) (transportdomain.Staff, error) {
	current, err := s.getServiceStaff(ctx, tenantID, staffID)
	if err != nil {
		return transportdomain.Staff{}, err
	}
	fullName := current.FullName
	phone := current.Phone
	role := current.Role
	status := current.Status
	if input.FullName != nil {
		fullName = *input.FullName
	}
	if input.Phone != nil {
		phone = *input.Phone
	}
	if input.Role != nil {
		role = *input.Role
	}
	if input.Status != nil {
		status = *input.Status
	}
	result, err := s.db.ExecContext(ctx, `
UPDATE service_staff
SET full_name = $3, phone = $4, role = $5, status = $6, updated_at = now()
WHERE tenant_id = $1 AND id = $2::uuid`, tenantID, staffID, fullName, phone, string(role), string(status))
	if err != nil {
		return transportdomain.Staff{}, err
	}
	if affected, _ := result.RowsAffected(); affected == 0 {
		return transportdomain.Staff{}, errors.New("staff not found")
	}
	return s.getServiceStaff(ctx, tenantID, staffID)
}

func (s *Store) ListServiceRoutes(ctx context.Context, tenantID string) ([]transportdomain.Route, error) {
	rows, err := s.db.QueryContext(ctx, `
SELECT id::text
FROM service_routes
WHERE tenant_id = $1 AND status <> 'archived'
ORDER BY name`, tenantID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []transportdomain.Route{}
	for rows.Next() {
		var id string
		if err := rows.Scan(&id); err != nil {
			return nil, err
		}
		route, ok, err := s.GetServiceRoute(ctx, tenantID, id)
		if err != nil {
			return nil, err
		}
		if ok {
			out = append(out, route)
		}
	}
	return out, rows.Err()
}

func (s *Store) GetServiceRoute(ctx context.Context, tenantID, routeID string) (transportdomain.Route, bool, error) {
	row := s.db.QueryRowContext(ctx, serviceRouteSelect(`
WHERE sr.tenant_id = $1 AND sr.id = $2::uuid AND sr.status <> 'archived'`), tenantID, routeID)
	route, ok := scanServiceRoute(row)
	if !ok {
		return transportdomain.Route{}, false, nil
	}
	if err := s.hydrateServiceRoute(ctx, tenantID, &route); err != nil {
		return transportdomain.Route{}, false, err
	}
	return route, true, nil
}

func (s *Store) CreateServiceRoute(ctx context.Context, tenantID string, input transportdomain.CreateRouteInput) (transportdomain.Route, error) {
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return transportdomain.Route{}, err
	}
	defer rollback(tx)
	var id string
	err = tx.QueryRowContext(ctx, `
INSERT INTO service_routes (tenant_id, name, direction, vehicle_id, driver_id, attendant_id, status)
VALUES ($1::uuid, $2, $3, NULLIF($4, '')::uuid, NULLIF($5, '')::uuid, NULLIF($6, '')::uuid, $7)
RETURNING id::text`,
		tenantID, input.Name, string(input.Direction), input.VehicleID, input.DriverID, input.AttendantID, string(input.Status),
	).Scan(&id)
	if err != nil {
		return transportdomain.Route{}, err
	}
	if err := replaceServiceStopsTx(ctx, tx, tenantID, id, input.Stops); err != nil {
		return transportdomain.Route{}, err
	}
	if err := tx.Commit(); err != nil {
		return transportdomain.Route{}, err
	}
	route, ok, err := s.GetServiceRoute(ctx, tenantID, id)
	if err != nil || !ok {
		return transportdomain.Route{}, err
	}
	return route, nil
}

func (s *Store) UpdateServiceRoute(ctx context.Context, tenantID, routeID string, input transportdomain.UpdateRouteInput) (transportdomain.Route, error) {
	current, ok, err := s.GetServiceRoute(ctx, tenantID, routeID)
	if err != nil {
		return transportdomain.Route{}, err
	}
	if !ok {
		return transportdomain.Route{}, errors.New("route not found")
	}
	name := current.Name
	direction := current.Direction
	vehicleID := current.VehicleID
	driverID := current.DriverID
	attendantID := current.AttendantID
	status := current.Status
	if input.Name != nil {
		name = *input.Name
	}
	if input.Direction != nil {
		direction = *input.Direction
	}
	if input.VehicleID != nil {
		vehicleID = *input.VehicleID
	}
	if input.DriverID != nil {
		driverID = *input.DriverID
	}
	if input.AttendantID != nil {
		attendantID = *input.AttendantID
	}
	if input.Status != nil {
		status = *input.Status
	}

	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return transportdomain.Route{}, err
	}
	defer rollback(tx)
	result, err := tx.ExecContext(ctx, `
UPDATE service_routes
SET name = $3, direction = $4, vehicle_id = NULLIF($5, '')::uuid,
    driver_id = NULLIF($6, '')::uuid, attendant_id = NULLIF($7, '')::uuid,
    status = $8, updated_at = now()
WHERE tenant_id = $1 AND id = $2::uuid AND status <> 'archived'`,
		tenantID, routeID, name, string(direction), vehicleID, driverID, attendantID, string(status))
	if err != nil {
		return transportdomain.Route{}, err
	}
	if affected, _ := result.RowsAffected(); affected == 0 {
		return transportdomain.Route{}, errors.New("route not found")
	}
	if input.Stops != nil {
		if err := replaceServiceStopsTx(ctx, tx, tenantID, routeID, *input.Stops); err != nil {
			return transportdomain.Route{}, err
		}
	}
	if err := tx.Commit(); err != nil {
		return transportdomain.Route{}, err
	}
	route, ok, err := s.GetServiceRoute(ctx, tenantID, routeID)
	if err != nil || !ok {
		return transportdomain.Route{}, err
	}
	return route, nil
}

func (s *Store) DeleteServiceRoute(ctx context.Context, tenantID, routeID string) error {
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer rollback(tx)
	result, err := tx.ExecContext(ctx, `
UPDATE service_routes
SET status = 'archived', updated_at = now()
WHERE tenant_id = $1 AND id = $2::uuid`, tenantID, routeID)
	if err != nil {
		return err
	}
	if affected, _ := result.RowsAffected(); affected == 0 {
		return errors.New("route not found")
	}
	if _, err := tx.ExecContext(ctx, `
UPDATE student_service_assignments
SET status = 'archived', updated_at = now()
WHERE tenant_id = $1 AND route_id = $2::uuid`, tenantID, routeID); err != nil {
		return err
	}
	return tx.Commit()
}

func (s *Store) UpsertStudentServiceAssignment(ctx context.Context, tenantID string, input transportdomain.AssignmentInput) (transportdomain.Assignment, error) {
	var id string
	err := s.db.QueryRowContext(ctx, `
INSERT INTO student_service_assignments (tenant_id, student_id, route_id, stop_id, direction, status)
VALUES ($1::uuid, $2::uuid, $3::uuid, NULLIF($4, '')::uuid, $5, $6)
ON CONFLICT (tenant_id, student_id, direction)
DO UPDATE SET route_id = EXCLUDED.route_id,
              stop_id = EXCLUDED.stop_id,
              status = EXCLUDED.status,
              updated_at = now()
RETURNING id::text`,
		tenantID, input.StudentID, input.RouteID, input.StopID, string(input.Direction), string(input.Status),
	).Scan(&id)
	if err != nil {
		return transportdomain.Assignment{}, err
	}
	return s.getServiceAssignment(ctx, tenantID, id)
}

func (s *Store) UpdateStudentServiceAssignment(ctx context.Context, tenantID, assignmentID string, input transportdomain.UpdateAssignmentInput) (transportdomain.Assignment, error) {
	current, err := s.getServiceAssignment(ctx, tenantID, assignmentID)
	if err != nil {
		return transportdomain.Assignment{}, err
	}
	routeID := current.RouteID
	stopID := current.StopID
	direction := current.Direction
	status := current.Status
	if input.RouteID != nil {
		routeID = *input.RouteID
	}
	if input.StopID != nil {
		stopID = *input.StopID
	}
	if input.Direction != nil {
		direction = *input.Direction
	}
	if input.Status != nil {
		status = *input.Status
	}
	result, err := s.db.ExecContext(ctx, `
UPDATE student_service_assignments
SET route_id = $3::uuid, stop_id = NULLIF($4, '')::uuid, direction = $5, status = $6, updated_at = now()
WHERE tenant_id = $1 AND id = $2::uuid`, tenantID, assignmentID, routeID, stopID, string(direction), string(status))
	if err != nil {
		return transportdomain.Assignment{}, err
	}
	if affected, _ := result.RowsAffected(); affected == 0 {
		return transportdomain.Assignment{}, errors.New("assignment not found")
	}
	return s.getServiceAssignment(ctx, tenantID, assignmentID)
}

func (s *Store) GuardianServiceSummary(ctx context.Context, tenantID, studentID string) (transportdomain.GuardianServiceSummary, bool, error) {
	var summary transportdomain.GuardianServiceSummary
	err := s.db.QueryRowContext(ctx, `
SELECT st.id::text, st.full_name, st.student_number, COALESCE(c.name, '')
FROM students st
LEFT JOIN LATERAL (
	SELECT class_id FROM class_students
	WHERE tenant_id = st.tenant_id AND student_id = st.id
	  AND (ends_on IS NULL OR ends_on >= CURRENT_DATE)
	ORDER BY starts_on DESC NULLS LAST
	LIMIT 1
) active_class ON true
LEFT JOIN classes c ON c.id = active_class.class_id AND c.tenant_id = st.tenant_id
WHERE st.tenant_id = $1 AND st.id = $2::uuid AND st.deleted_at IS NULL`, tenantID, studentID).Scan(
		&summary.StudentID, &summary.StudentName, &summary.SchoolNumber, &summary.ClassName,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return transportdomain.GuardianServiceSummary{}, false, nil
	}
	if err != nil {
		return transportdomain.GuardianServiceSummary{}, false, err
	}
	assignments, err := s.listServiceAssignments(ctx, tenantID, "student", studentID)
	if err != nil {
		return transportdomain.GuardianServiceSummary{}, false, err
	}
	summary.Assignments = assignments
	summary.Routes = []transportdomain.Route{}
	seen := map[string]struct{}{}
	for _, assignment := range assignments {
		if assignment.Status != transportdomain.StatusActive {
			continue
		}
		if _, ok := seen[assignment.RouteID]; ok {
			continue
		}
		route, ok, err := s.GetServiceRoute(ctx, tenantID, assignment.RouteID)
		if err != nil {
			return transportdomain.GuardianServiceSummary{}, false, err
		}
		if ok {
			summary.Routes = append(summary.Routes, route)
			seen[assignment.RouteID] = struct{}{}
		}
	}
	summary.HasAssignment = len(summary.Assignments) > 0
	summary.UpdatedAt = s.clock()
	return summary, true, nil
}

func (s *Store) DriverServiceSummary(ctx context.Context, tenantID, userID string) (transportdomain.DriverServiceSummary, bool, error) {
	var summary transportdomain.DriverServiceSummary
	row := s.db.QueryRowContext(ctx, `
SELECT id::text, COALESCE(user_id::text, ''), full_name, phone, role, status, sharing_status, last_seen_at, created_at, updated_at
FROM service_staff
WHERE tenant_id = $1 AND user_id = $2::uuid AND role = 'driver' AND status <> 'archived'`, tenantID, userID)
	staff, ok := scanServiceStaff(row)
	if !ok {
		return transportdomain.DriverServiceSummary{}, false, nil
	}
	summary.UserID = staff.UserID
	summary.Staff = staff
	summary.IsSharing = staff.SharingStatus == "active"
	summary.LastSeenAt = staff.LastSeenAt
	rows, err := s.db.QueryContext(ctx, `
SELECT id::text
FROM service_routes
WHERE tenant_id = $1 AND driver_id = $2::uuid AND status <> 'archived'
ORDER BY name`, tenantID, staff.ID)
	if err != nil {
		return transportdomain.DriverServiceSummary{}, false, err
	}
	defer rows.Close()
	summary.Routes = []transportdomain.Route{}
	for rows.Next() {
		var routeID string
		if err := rows.Scan(&routeID); err != nil {
			return transportdomain.DriverServiceSummary{}, false, err
		}
		route, ok, err := s.GetServiceRoute(ctx, tenantID, routeID)
		if err != nil {
			return transportdomain.DriverServiceSummary{}, false, err
		}
		if ok {
			summary.Routes = append(summary.Routes, route)
		}
	}
	summary.UpdatedAt = s.clock()
	return summary, true, rows.Err()
}

func (s *Store) StartServiceTrip(ctx context.Context, tenantID, driverUserID, routeID string, direction transportdomain.Direction, startedAt time.Time) (transportdomain.Trip, error) {
	if startedAt.IsZero() {
		startedAt = s.clock()
	}
	var activeID string
	err := s.db.QueryRowContext(ctx, `
SELECT id::text
FROM service_trips
WHERE tenant_id = $1::uuid AND driver_user_id = $2::uuid AND status = 'active'
ORDER BY started_at DESC
LIMIT 1`, tenantID, driverUserID).Scan(&activeID)
	if err == nil {
		return s.getServiceTrip(ctx, tenantID, activeID)
	}
	if err != nil && !errors.Is(err, sql.ErrNoRows) {
		return transportdomain.Trip{}, err
	}

	var driverStaffID string
	err = s.db.QueryRowContext(ctx, `
SELECT driver.id::text
FROM service_routes sr
JOIN service_staff driver ON driver.id = sr.driver_id AND driver.tenant_id = sr.tenant_id
WHERE sr.tenant_id = $1::uuid
  AND sr.id = $2::uuid
  AND sr.status <> 'archived'
  AND driver.user_id = $3::uuid
  AND driver.role = 'driver'
  AND driver.status <> 'archived'`, tenantID, routeID, driverUserID).Scan(&driverStaffID)
	if errors.Is(err, sql.ErrNoRows) {
		return transportdomain.Trip{}, errors.New("route not found")
	}
	if err != nil {
		return transportdomain.Trip{}, err
	}
	if direction == "" {
		route, ok, err := s.GetServiceRoute(ctx, tenantID, routeID)
		if err != nil {
			return transportdomain.Trip{}, err
		}
		if !ok {
			return transportdomain.Trip{}, errors.New("route not found")
		}
		direction = route.Direction
	}

	var id string
	err = s.db.QueryRowContext(ctx, `
INSERT INTO service_trips (tenant_id, route_id, driver_user_id, driver_staff_id, direction, status, started_at)
VALUES ($1::uuid, $2::uuid, $3::uuid, $4::uuid, $5, 'active', $6)
RETURNING id::text`, tenantID, routeID, driverUserID, driverStaffID, string(direction), startedAt).Scan(&id)
	if err != nil {
		return transportdomain.Trip{}, err
	}
	trip, err := s.getServiceTrip(ctx, tenantID, id)
	if err != nil {
		return transportdomain.Trip{}, err
	}
	_ = s.RecordServiceTripEvent(ctx, tenantID, trip.ID, "trip_started", map[string]any{"routeId": routeID})
	return trip, nil
}

func (s *Store) StopActiveServiceTrip(ctx context.Context, tenantID, driverUserID string, stoppedAt time.Time) (transportdomain.Trip, bool, error) {
	if stoppedAt.IsZero() {
		stoppedAt = s.clock()
	}
	var id string
	err := s.db.QueryRowContext(ctx, `
UPDATE service_trips
SET status = 'completed', ended_at = $3, updated_at = now()
WHERE id = (
	SELECT id
	FROM service_trips
	WHERE tenant_id = $1::uuid AND driver_user_id = $2::uuid AND status = 'active'
	ORDER BY started_at DESC
	LIMIT 1
)
RETURNING id::text`, tenantID, driverUserID, stoppedAt).Scan(&id)
	if errors.Is(err, sql.ErrNoRows) {
		return transportdomain.Trip{}, false, nil
	}
	if err != nil {
		return transportdomain.Trip{}, false, err
	}
	trip, err := s.getServiceTrip(ctx, tenantID, id)
	if err != nil {
		return transportdomain.Trip{}, false, err
	}
	_ = s.RecordServiceTripEvent(ctx, tenantID, trip.ID, "trip_completed", nil)
	return trip, true, nil
}

func (s *Store) RecordServiceTripLocation(ctx context.Context, tenantID, driverUserID, tripID string, input transportdomain.TripLocationInput, capturedAt time.Time) (transportdomain.TripLocation, error) {
	if capturedAt.IsZero() {
		capturedAt = s.clock()
	}
	var exists bool
	err := s.db.QueryRowContext(ctx, `
SELECT EXISTS(
	SELECT 1 FROM service_trips
	WHERE tenant_id = $1::uuid AND id = $2::uuid AND driver_user_id = $3::uuid AND status = 'active'
)`, tenantID, tripID, driverUserID).Scan(&exists)
	if err != nil {
		return transportdomain.TripLocation{}, err
	}
	if !exists {
		return transportdomain.TripLocation{}, errors.New("trip not found")
	}
	var id string
	err = s.db.QueryRowContext(ctx, `
INSERT INTO service_trip_locations (
	tenant_id, trip_id, latitude, longitude, accuracy_meters, speed_kph, heading_degrees, captured_at
) VALUES ($1::uuid, $2::uuid, $3, $4, $5, $6, $7, $8)
RETURNING id::text`, tenantID, tripID, input.Latitude, input.Longitude, input.AccuracyMeters, input.SpeedKPH, input.HeadingDegrees, capturedAt).Scan(&id)
	if err != nil {
		return transportdomain.TripLocation{}, err
	}
	if _, err := s.db.ExecContext(ctx, `
UPDATE service_trips SET updated_at = now()
WHERE tenant_id = $1::uuid AND id = $2::uuid`, tenantID, tripID); err != nil {
		return transportdomain.TripLocation{}, err
	}
	return s.getServiceTripLocation(ctx, tenantID, id)
}

func (s *Store) ListActiveServiceTrips(ctx context.Context, tenantID string) ([]transportdomain.Trip, error) {
	rows, err := s.db.QueryContext(ctx, `
SELECT id::text
FROM service_trips
WHERE tenant_id = $1::uuid AND status = 'active'
ORDER BY started_at`, tenantID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []transportdomain.Trip{}
	for rows.Next() {
		var id string
		if err := rows.Scan(&id); err != nil {
			return nil, err
		}
		trip, err := s.getServiceTrip(ctx, tenantID, id)
		if err != nil {
			return nil, err
		}
		out = append(out, trip)
	}
	return out, rows.Err()
}

func (s *Store) ActiveServiceTripForDriver(ctx context.Context, tenantID, driverUserID string) (transportdomain.Trip, bool, error) {
	var id string
	err := s.db.QueryRowContext(ctx, `
SELECT id::text
FROM service_trips
WHERE tenant_id = $1::uuid AND driver_user_id = $2::uuid AND status = 'active'
ORDER BY started_at DESC
LIMIT 1`, tenantID, driverUserID).Scan(&id)
	if errors.Is(err, sql.ErrNoRows) {
		return transportdomain.Trip{}, false, nil
	}
	if err != nil {
		return transportdomain.Trip{}, false, err
	}
	trip, err := s.getServiceTrip(ctx, tenantID, id)
	return trip, err == nil, err
}

func (s *Store) ActiveServiceTripForStudent(ctx context.Context, tenantID, studentID string) (transportdomain.Trip, bool, error) {
	var id string
	err := s.db.QueryRowContext(ctx, `
SELECT trip.id::text
FROM service_trips trip
JOIN student_service_assignments ssa
  ON ssa.tenant_id = trip.tenant_id
 AND ssa.route_id = trip.route_id
 AND ssa.status = 'active'
WHERE trip.tenant_id = $1::uuid
  AND ssa.student_id = $2::uuid
  AND trip.status = 'active'
ORDER BY trip.started_at DESC
LIMIT 1`, tenantID, studentID).Scan(&id)
	if errors.Is(err, sql.ErrNoRows) {
		return transportdomain.Trip{}, false, nil
	}
	if err != nil {
		return transportdomain.Trip{}, false, err
	}
	trip, err := s.getServiceTrip(ctx, tenantID, id)
	return trip, err == nil, err
}

func (s *Store) NotifyServiceRouteGuardians(ctx context.Context, tenantID, routeID, title, body, kind string) (int, error) {
	rows, err := s.db.QueryContext(ctx, `
SELECT DISTINCT g.user_id::text
FROM student_service_assignments ssa
JOIN student_guardians sg ON sg.student_id = ssa.student_id AND sg.tenant_id = ssa.tenant_id
JOIN guardians g ON g.id = sg.guardian_id AND g.tenant_id = sg.tenant_id
WHERE ssa.tenant_id = $1
  AND ssa.route_id = $2::uuid
  AND ssa.status = 'active'
  AND g.user_id IS NOT NULL`, tenantID, routeID)
	if err != nil {
		return 0, err
	}
	defer rows.Close()
	created := 0
	for rows.Next() {
		var userID string
		if err := rows.Scan(&userID); err != nil {
			return created, err
		}
		inserted, err := s.ensureTransportNotification(ctx, tenantID, userID, title, body, kind)
		if err != nil {
			return created, err
		}
		if inserted {
			created++
		}
	}
	return created, rows.Err()
}

func (s *Store) getServiceVehicle(ctx context.Context, tenantID, vehicleID string) (transportdomain.Vehicle, error) {
	row := s.db.QueryRowContext(ctx, `
SELECT v.id::text, v.tenant_id::text, v.plate, v.capacity, v.brand, v.model, v.status,
       COALESCE(assignments.assigned_count, 0)::int, v.created_at, v.updated_at
FROM service_vehicles v
LEFT JOIN LATERAL (
	SELECT COUNT(*) AS assigned_count
	FROM service_routes sr
	JOIN student_service_assignments ssa ON ssa.route_id = sr.id AND ssa.tenant_id = sr.tenant_id
	WHERE sr.tenant_id = v.tenant_id AND sr.vehicle_id = v.id
	  AND sr.status <> 'archived'
	  AND ssa.status = 'active'
) assignments ON true
WHERE v.tenant_id = $1 AND v.id = $2::uuid AND v.status <> 'archived'`, tenantID, vehicleID)
	item, ok := scanServiceVehicle(row)
	if !ok {
		return transportdomain.Vehicle{}, errors.New("vehicle not found")
	}
	return item, nil
}

func (s *Store) getServiceStaff(ctx context.Context, tenantID, staffID string) (transportdomain.Staff, error) {
	row := s.db.QueryRowContext(ctx, `
SELECT id::text, tenant_id::text, COALESCE(user_id::text, ''), full_name, phone, role, status, sharing_status, last_seen_at, created_at, updated_at
FROM service_staff
WHERE tenant_id = $1 AND id = $2::uuid AND status <> 'archived'`, tenantID, staffID)
	item, ok := scanServiceStaff(row)
	if !ok {
		return transportdomain.Staff{}, errors.New("staff not found")
	}
	return item, nil
}

func (s *Store) getServiceAssignment(ctx context.Context, tenantID, assignmentID string) (transportdomain.Assignment, error) {
	row := s.db.QueryRowContext(ctx, serviceAssignmentSelect(`
WHERE ssa.tenant_id = $1 AND ssa.id = $2::uuid`), tenantID, assignmentID)
	item, ok := scanServiceAssignment(row)
	if !ok {
		return transportdomain.Assignment{}, errors.New("assignment not found")
	}
	return item, nil
}

func (s *Store) hydrateServiceRoute(ctx context.Context, tenantID string, route *transportdomain.Route) error {
	stops, err := s.listServiceStops(ctx, tenantID, route.ID)
	if err != nil {
		return err
	}
	assignments, err := s.listServiceAssignments(ctx, tenantID, "route", route.ID)
	if err != nil {
		return err
	}
	route.Stops = stops
	route.Assignments = assignments
	if route.VehicleCapacity > 0 && len(assignments) > route.VehicleCapacity {
		route.CapacityWarning = fmt.Sprintf("%d/%d kapasite aşıldı", len(assignments), route.VehicleCapacity)
	}
	return nil
}

func (s *Store) listServiceStops(ctx context.Context, tenantID, routeID string) ([]transportdomain.RouteStop, error) {
	rows, err := s.db.QueryContext(ctx, `
SELECT id::text, tenant_id::text, route_id::text, name, to_char(planned_time, 'HH24:MI'), sort_order, latitude, longitude
FROM service_route_stops
WHERE tenant_id = $1 AND route_id = $2::uuid
ORDER BY sort_order`, tenantID, routeID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []transportdomain.RouteStop{}
	for rows.Next() {
		var item transportdomain.RouteStop
		var lat, lng sql.NullFloat64
		if err := rows.Scan(&item.ID, &item.TenantID, &item.RouteID, &item.Name, &item.PlannedTime, &item.SortOrder, &lat, &lng); err != nil {
			return nil, err
		}
		if lat.Valid {
			value := lat.Float64
			item.Latitude = &value
		}
		if lng.Valid {
			value := lng.Float64
			item.Longitude = &value
		}
		out = append(out, item)
	}
	return out, rows.Err()
}

func (s *Store) listServiceAssignments(ctx context.Context, tenantID, lookupType, lookupID string) ([]transportdomain.Assignment, error) {
	where := "ssa.route_id = $2::uuid AND ssa.status = 'active'"
	if lookupType == "student" {
		where = "ssa.student_id = $2::uuid AND ssa.status = 'active'"
	}
	rows, err := s.db.QueryContext(ctx, serviceAssignmentSelect("WHERE ssa.tenant_id = $1 AND "+where+`
ORDER BY st.full_name, ssa.direction`), tenantID, lookupID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []transportdomain.Assignment{}
	for rows.Next() {
		item, ok := scanServiceAssignment(rows)
		if ok {
			out = append(out, item)
		}
	}
	return out, rows.Err()
}

func replaceServiceStopsTx(ctx context.Context, tx *sql.Tx, tenantID, routeID string, stops []transportdomain.RouteStopInput) error {
	if _, err := tx.ExecContext(ctx, `
DELETE FROM service_route_stops
WHERE tenant_id = $1 AND route_id = $2::uuid`, tenantID, routeID); err != nil {
		return err
	}
	for index, stop := range stops {
		sortOrder := stop.SortOrder
		if sortOrder <= 0 {
			sortOrder = index + 1
		}
		if _, err := tx.ExecContext(ctx, `
INSERT INTO service_route_stops (tenant_id, route_id, name, planned_time, sort_order, latitude, longitude)
VALUES ($1::uuid, $2::uuid, $3, $4::time, $5, $6, $7)`, tenantID, routeID, stop.Name, stop.PlannedTime, sortOrder, stop.Latitude, stop.Longitude); err != nil {
			return err
		}
	}
	return nil
}

func (s *Store) ensureTransportNotification(ctx context.Context, tenantID, userID, title, body, kind string) (bool, error) {
	var exists bool
	if err := s.db.QueryRowContext(ctx, `
SELECT EXISTS(
	SELECT 1 FROM notifications WHERE tenant_id = $1 AND user_id = $2::uuid AND kind = $3
)`, tenantID, userID, kind).Scan(&exists); err != nil {
		return false, err
	}
	if exists {
		return false, nil
	}
	_, err := s.db.ExecContext(ctx, `
INSERT INTO notifications (tenant_id, user_id, title, body, kind)
VALUES ($1::uuid, $2::uuid, $3, $4, $5)`, tenantID, userID, title, body, kind)
	return err == nil, err
}

func (s *Store) getServiceTrip(ctx context.Context, tenantID, tripID string) (transportdomain.Trip, error) {
	row := s.db.QueryRowContext(ctx, `
SELECT trip.id::text, trip.tenant_id::text, trip.route_id::text, sr.name,
       trip.driver_user_id::text, trip.driver_staff_id::text, driver.full_name,
       trip.direction, trip.status, trip.started_at, trip.ended_at, trip.created_at, trip.updated_at
FROM service_trips trip
JOIN service_routes sr ON sr.id = trip.route_id AND sr.tenant_id = trip.tenant_id
JOIN service_staff driver ON driver.id = trip.driver_staff_id AND driver.tenant_id = trip.tenant_id
WHERE trip.tenant_id = $1::uuid AND trip.id = $2::uuid`, tenantID, tripID)
	trip, ok := scanServiceTrip(row)
	if !ok {
		return transportdomain.Trip{}, errors.New("trip not found")
	}
	if location, ok, err := s.latestServiceTripLocation(ctx, tenantID, trip.ID); err != nil {
		return transportdomain.Trip{}, err
	} else if ok {
		trip.LastLocation = &location
	}
	return trip, nil
}

func (s *Store) getServiceTripLocation(ctx context.Context, tenantID, locationID string) (transportdomain.TripLocation, error) {
	row := s.db.QueryRowContext(ctx, `
SELECT id::text, tenant_id::text, trip_id::text, latitude, longitude,
       accuracy_meters, speed_kph, heading_degrees, captured_at, created_at
FROM service_trip_locations
WHERE tenant_id = $1::uuid AND id = $2::uuid`, tenantID, locationID)
	location, ok := scanServiceTripLocation(row)
	if !ok {
		return transportdomain.TripLocation{}, errors.New("trip location not found")
	}
	return location, nil
}

func (s *Store) latestServiceTripLocation(ctx context.Context, tenantID, tripID string) (transportdomain.TripLocation, bool, error) {
	row := s.db.QueryRowContext(ctx, `
SELECT id::text, tenant_id::text, trip_id::text, latitude, longitude,
       accuracy_meters, speed_kph, heading_degrees, captured_at, created_at
FROM service_trip_locations
WHERE tenant_id = $1::uuid AND trip_id = $2::uuid
ORDER BY captured_at DESC, created_at DESC
LIMIT 1`, tenantID, tripID)
	location, ok := scanServiceTripLocation(row)
	return location, ok, nil
}

func serviceRouteSelect(where string) string {
	return `
SELECT sr.id::text, sr.tenant_id::text, sr.name, sr.direction,
       COALESCE(sr.vehicle_id::text, ''), COALESCE(v.plate, ''), COALESCE(v.capacity, 0),
	COALESCE(sr.driver_id::text, ''), COALESCE(driver.full_name, ''), COALESCE(driver.phone, ''), COALESCE(driver.sharing_status, ''), driver.last_seen_at,
       COALESCE(sr.attendant_id::text, ''), COALESCE(attendant.full_name, ''), COALESCE(attendant.phone, ''),
       sr.status, sr.created_at, sr.updated_at
FROM service_routes sr
LEFT JOIN service_vehicles v ON v.id = sr.vehicle_id AND v.tenant_id = sr.tenant_id
LEFT JOIN service_staff driver ON driver.id = sr.driver_id AND driver.tenant_id = sr.tenant_id
LEFT JOIN service_staff attendant ON attendant.id = sr.attendant_id AND attendant.tenant_id = sr.tenant_id
` + where
}

func serviceAssignmentSelect(where string) string {
	return `
SELECT ssa.id::text, ssa.tenant_id::text, ssa.student_id::text,
       st.full_name, st.student_number,
       COALESCE(active_class.class_id::text, ''), COALESCE(c.name, ''),
       ssa.route_id::text, sr.name, COALESCE(ssa.stop_id::text, ''), COALESCE(stop.name, ''),
       ssa.direction, ssa.status, ssa.created_at, ssa.updated_at
FROM student_service_assignments ssa
JOIN students st ON st.id = ssa.student_id AND st.tenant_id = ssa.tenant_id
JOIN service_routes sr ON sr.id = ssa.route_id AND sr.tenant_id = ssa.tenant_id
LEFT JOIN service_route_stops stop ON stop.id = ssa.stop_id AND stop.tenant_id = ssa.tenant_id
LEFT JOIN LATERAL (
	SELECT class_id FROM class_students
	WHERE tenant_id = st.tenant_id AND student_id = st.id
	  AND (ends_on IS NULL OR ends_on >= CURRENT_DATE)
	ORDER BY starts_on DESC NULLS LAST
	LIMIT 1
) active_class ON true
LEFT JOIN classes c ON c.id = active_class.class_id AND c.tenant_id = st.tenant_id
` + where
}

func scanServiceVehicle(row scanner) (transportdomain.Vehicle, bool) {
	var item transportdomain.Vehicle
	var status string
	err := row.Scan(&item.ID, &item.TenantID, &item.Plate, &item.Capacity, &item.Brand, &item.Model, &status, &item.AssignedCount, &item.CreatedAt, &item.UpdatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return transportdomain.Vehicle{}, false
	}
	if err != nil {
		return transportdomain.Vehicle{}, false
	}
	item.Status = transportdomain.Status(status)
	return item, true
}

func scanServiceStaff(row scanner) (transportdomain.Staff, bool) {
	var item transportdomain.Staff
	var role, status string
	var lastSeenAt sql.NullTime
	err := row.Scan(&item.ID, &item.TenantID, &item.UserID, &item.FullName, &item.Phone, &role, &status, &item.SharingStatus, &lastSeenAt, &item.CreatedAt, &item.UpdatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return transportdomain.Staff{}, false
	}
	if err != nil {
		return transportdomain.Staff{}, false
	}
	if lastSeenAt.Valid {
		item.LastSeenAt = &lastSeenAt.Time
	}
	item.Role = transportdomain.StaffRole(role)
	item.Status = transportdomain.Status(status)
	return item, true
}

func scanServiceRoute(row scanner) (transportdomain.Route, bool) {
	var item transportdomain.Route
	var direction, status string
	var driverLastSeenAt sql.NullTime
	err := row.Scan(
		&item.ID, &item.TenantID, &item.Name, &direction,
		&item.VehicleID, &item.VehiclePlate, &item.VehicleCapacity,
		&item.DriverID, &item.DriverName, &item.DriverPhone, &item.DriverSharingStatus, &driverLastSeenAt,
		&item.AttendantID, &item.AttendantName, &item.AttendantPhone,
		&status, &item.CreatedAt, &item.UpdatedAt,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return transportdomain.Route{}, false
	}
	if err != nil {
		return transportdomain.Route{}, false
	}
	item.Direction = transportdomain.Direction(direction)
	item.Status = transportdomain.Status(status)
	if driverLastSeenAt.Valid {
		item.DriverLastSeenAt = &driverLastSeenAt.Time
	}
	item.Stops = []transportdomain.RouteStop{}
	item.Assignments = []transportdomain.Assignment{}
	return item, true
}

func scanServiceAssignment(row scanner) (transportdomain.Assignment, bool) {
	var item transportdomain.Assignment
	var direction, status string
	err := row.Scan(
		&item.ID, &item.TenantID, &item.StudentID,
		&item.StudentName, &item.SchoolNumber,
		&item.ClassID, &item.ClassName,
		&item.RouteID, &item.RouteName, &item.StopID, &item.StopName,
		&direction, &status, &item.CreatedAt, &item.UpdatedAt,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return transportdomain.Assignment{}, false
	}
	if err != nil {
		return transportdomain.Assignment{}, false
	}
	item.Direction = transportdomain.Direction(direction)
	item.Status = transportdomain.Status(status)
	return item, true
}

func scanServiceTrip(row scanner) (transportdomain.Trip, bool) {
	var item transportdomain.Trip
	var direction, status string
	var endedAt sql.NullTime
	err := row.Scan(
		&item.ID, &item.TenantID, &item.RouteID, &item.RouteName,
		&item.DriverUserID, &item.DriverID, &item.DriverName,
		&direction, &status, &item.StartedAt, &endedAt, &item.CreatedAt, &item.UpdatedAt,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return transportdomain.Trip{}, false
	}
	if err != nil {
		return transportdomain.Trip{}, false
	}
	item.Direction = transportdomain.Direction(direction)
	item.Status = transportdomain.TripStatus(status)
	if endedAt.Valid {
		item.EndedAt = &endedAt.Time
	}
	return item, true
}

func scanServiceTripLocation(row scanner) (transportdomain.TripLocation, bool) {
	var item transportdomain.TripLocation
	err := row.Scan(
		&item.ID, &item.TenantID, &item.TripID, &item.Latitude, &item.Longitude,
		&item.AccuracyMeters, &item.SpeedKPH, &item.HeadingDegrees, &item.CapturedAt, &item.CreatedAt,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return transportdomain.TripLocation{}, false
	}
	if err != nil {
		return transportdomain.TripLocation{}, false
	}
	return item, true
}

func sortServiceStops(stops []transportdomain.RouteStop) {
	sort.Slice(stops, func(i, j int) bool {
		return stops[i].SortOrder < stops[j].SortOrder
	})
}

func (s *Store) GetServiceTrip(ctx context.Context, tenantID, tripID string) (transportdomain.Trip, bool, error) {
	trip, err := s.getServiceTrip(ctx, tenantID, tripID)
	if err != nil {
		return transportdomain.Trip{}, false, err
	}
	return trip, true, nil
}

func (s *Store) ListStopsForRoute(ctx context.Context, tenantID, routeID string) ([]transportdomain.RouteStop, error) {
	return s.listServiceStops(ctx, tenantID, routeID)
}

func (s *Store) ListAssignmentsForRoute(ctx context.Context, tenantID, routeID string) ([]transportdomain.Assignment, error) {
	return s.listServiceAssignments(ctx, tenantID, "route", routeID)
}

func (s *Store) HasTripStopAlert(ctx context.Context, tenantID, tripID, stopID string) (bool, error) {
	var exists bool
	err := s.db.QueryRowContext(ctx, `
SELECT EXISTS(
  SELECT 1 FROM service_trip_events
  WHERE tenant_id = $1::uuid
    AND trip_id = $2::uuid
    AND event_type = 'approaching_notified'
    AND payload->>'stopId' = $3
)`, tenantID, tripID, stopID).Scan(&exists)
	return exists, err
}

func (s *Store) MarkTripStopAlert(ctx context.Context, tenantID, tripID, stopID string) error {
	return s.RecordServiceTripEvent(ctx, tenantID, tripID, "approaching_notified", map[string]any{"stopId": stopID})
}

func (s *Store) ListServiceTripLocations(ctx context.Context, tenantID, tripID string, limit int) ([]transportdomain.TripLocation, error) {
	rows, err := s.db.QueryContext(ctx, `
SELECT id::text, tenant_id::text, trip_id::text, latitude, longitude,
       accuracy_meters, speed_kph, heading_degrees, captured_at, created_at
FROM service_trip_locations
WHERE tenant_id = $1::uuid AND trip_id = $2::uuid
ORDER BY captured_at DESC, created_at DESC
LIMIT $3`, tenantID, tripID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []transportdomain.TripLocation{}
	for rows.Next() {
		item, ok := scanServiceTripLocation(rows)
		if ok {
			out = append(out, item)
		}
	}
	return out, rows.Err()
}

func (s *Store) ListServiceTripEvents(ctx context.Context, tenantID, tripID string, limit int) ([]transportdomain.TripEvent, error) {
	rows, err := s.db.QueryContext(ctx, `
SELECT id::text, tenant_id::text, trip_id::text, event_type, payload, created_at
FROM service_trip_events
WHERE tenant_id = $1::uuid AND trip_id = $2::uuid
ORDER BY created_at DESC
LIMIT $3`, tenantID, tripID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []transportdomain.TripEvent{}
	for rows.Next() {
		var item transportdomain.TripEvent
		var payload []byte
		if err := rows.Scan(&item.ID, &item.TenantID, &item.TripID, &item.EventType, &payload, &item.CreatedAt); err != nil {
			return nil, err
		}
		if len(payload) > 0 {
			_ = json.Unmarshal(payload, &item.Payload)
		}
		out = append(out, item)
	}
	return out, rows.Err()
}

func (s *Store) RecordServiceTripEvent(ctx context.Context, tenantID, tripID, eventType string, payload map[string]any) error {
	if payload == nil {
		payload = map[string]any{}
	}
	raw, err := json.Marshal(payload)
	if err != nil {
		return err
	}
	_, err = s.db.ExecContext(ctx, `
INSERT INTO service_trip_events (tenant_id, trip_id, event_type, payload)
VALUES ($1::uuid, $2::uuid, $3, $4::jsonb)`, tenantID, tripID, eventType, raw)
	return err
}
