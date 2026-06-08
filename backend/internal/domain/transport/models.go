package transport

import "time"

type Direction string

const (
	DirectionMorning Direction = "morning"
	DirectionEvening Direction = "evening"
	DirectionBoth    Direction = "both"
)

type Status string

const (
	StatusActive   Status = "active"
	StatusPassive  Status = "passive"
	StatusArchived Status = "archived"
)

type TripStatus string

const (
	TripActive    TripStatus = "active"
	TripCompleted TripStatus = "completed"
	TripCanceled  TripStatus = "canceled"
)

type StaffRole string

const (
	StaffDriver    StaffRole = "driver"
	StaffAttendant StaffRole = "attendant"
)

type Vehicle struct {
	ID            string    `json:"id"`
	TenantID      string    `json:"tenantId"`
	Plate         string    `json:"plate"`
	Capacity      int       `json:"capacity"`
	Brand         string    `json:"brand,omitempty"`
	Model         string    `json:"model,omitempty"`
	Status        Status    `json:"status"`
	AssignedCount int       `json:"assignedCount"`
	CreatedAt     time.Time `json:"createdAt"`
	UpdatedAt     time.Time `json:"updatedAt"`
}

type Staff struct {
	ID            string     `json:"id"`
	TenantID      string     `json:"tenantId"`
	UserID        string     `json:"userId,omitempty"`
	FullName      string     `json:"fullName"`
	Phone         string     `json:"phone,omitempty"`
	Role          StaffRole  `json:"role"`
	Status        Status     `json:"status"`
	SharingStatus string     `json:"sharingStatus,omitempty"`
	LastSeenAt    *time.Time `json:"lastSeenAt,omitempty"`
	CreatedAt     time.Time  `json:"createdAt"`
	UpdatedAt     time.Time  `json:"updatedAt"`
}

type RouteStop struct {
	ID          string `json:"id"`
	TenantID    string `json:"tenantId"`
	RouteID     string `json:"routeId"`
	Name        string `json:"name"`
	PlannedTime string `json:"plannedTime"`
	SortOrder   int    `json:"sortOrder"`
}

type Route struct {
	ID                  string       `json:"id"`
	TenantID            string       `json:"tenantId"`
	Name                string       `json:"name"`
	Direction           Direction    `json:"direction"`
	VehicleID           string       `json:"vehicleId,omitempty"`
	VehiclePlate        string       `json:"vehiclePlate,omitempty"`
	VehicleCapacity     int          `json:"vehicleCapacity,omitempty"`
	DriverID            string       `json:"driverId,omitempty"`
	DriverName          string       `json:"driverName,omitempty"`
	DriverPhone         string       `json:"driverPhone,omitempty"`
	DriverSharingStatus string       `json:"driverSharingStatus,omitempty"`
	DriverLastSeenAt    *time.Time   `json:"driverLastSeenAt,omitempty"`
	AttendantID         string       `json:"attendantId,omitempty"`
	AttendantName       string       `json:"attendantName,omitempty"`
	AttendantPhone      string       `json:"attendantPhone,omitempty"`
	Status              Status       `json:"status"`
	Stops               []RouteStop  `json:"stops"`
	Assignments         []Assignment `json:"assignments"`
	CapacityWarning     string       `json:"capacityWarning,omitempty"`
	CreatedAt           time.Time    `json:"createdAt"`
	UpdatedAt           time.Time    `json:"updatedAt"`
}

type Assignment struct {
	ID           string    `json:"id"`
	TenantID     string    `json:"tenantId"`
	StudentID    string    `json:"studentId"`
	StudentName  string    `json:"studentName,omitempty"`
	SchoolNumber string    `json:"schoolNumber,omitempty"`
	ClassID      string    `json:"classId,omitempty"`
	ClassName    string    `json:"className,omitempty"`
	RouteID      string    `json:"routeId"`
	RouteName    string    `json:"routeName,omitempty"`
	StopID       string    `json:"stopId,omitempty"`
	StopName     string    `json:"stopName,omitempty"`
	Direction    Direction `json:"direction"`
	Status       Status    `json:"status"`
	CreatedAt    time.Time `json:"createdAt"`
	UpdatedAt    time.Time `json:"updatedAt"`
}

type GuardianServiceSummary struct {
	StudentID     string       `json:"studentId"`
	StudentName   string       `json:"studentName"`
	SchoolNumber  string       `json:"schoolNumber"`
	ClassName     string       `json:"className,omitempty"`
	Assignments   []Assignment `json:"assignments"`
	Routes        []Route      `json:"routes"`
	ActiveTrip    *Trip        `json:"activeTrip,omitempty"`
	UpdatedAt     time.Time    `json:"updatedAt"`
	HasAssignment bool         `json:"hasAssignment"`
}

type DriverServiceSummary struct {
	UserID     string     `json:"userId"`
	Staff      Staff      `json:"staff"`
	Routes     []Route    `json:"routes"`
	ActiveTrip *Trip      `json:"activeTrip,omitempty"`
	UpdatedAt  time.Time  `json:"updatedAt"`
	IsSharing  bool       `json:"isSharing"`
	LastSeenAt *time.Time `json:"lastSeenAt,omitempty"`
}

type Trip struct {
	ID           string        `json:"id"`
	TenantID     string        `json:"tenantId"`
	RouteID      string        `json:"routeId"`
	RouteName    string        `json:"routeName,omitempty"`
	DriverUserID string        `json:"driverUserId"`
	DriverID     string        `json:"driverId"`
	DriverName   string        `json:"driverName,omitempty"`
	Direction    Direction     `json:"direction"`
	Status       TripStatus    `json:"status"`
	StartedAt    time.Time     `json:"startedAt"`
	EndedAt      *time.Time    `json:"endedAt,omitempty"`
	LastLocation *TripLocation `json:"lastLocation,omitempty"`
	CreatedAt    time.Time     `json:"createdAt"`
	UpdatedAt    time.Time     `json:"updatedAt"`
}

type TripLocation struct {
	ID             string    `json:"id"`
	TenantID       string    `json:"tenantId"`
	TripID         string    `json:"tripId"`
	Latitude       float64   `json:"latitude"`
	Longitude      float64   `json:"longitude"`
	AccuracyMeters float64   `json:"accuracyMeters,omitempty"`
	SpeedKPH       float64   `json:"speedKph,omitempty"`
	HeadingDegrees float64   `json:"headingDegrees,omitempty"`
	CapturedAt     time.Time `json:"capturedAt"`
	CreatedAt      time.Time `json:"createdAt"`
}

type RouteStopInput struct {
	ID          string `json:"id,omitempty"`
	Name        string `json:"name"`
	PlannedTime string `json:"plannedTime"`
	SortOrder   int    `json:"sortOrder,omitempty"`
}

type CreateVehicleInput struct {
	Plate    string `json:"plate"`
	Capacity int    `json:"capacity"`
	Brand    string `json:"brand,omitempty"`
	Model    string `json:"model,omitempty"`
	Status   Status `json:"status,omitempty"`
}

type UpdateVehicleInput struct {
	Plate    *string `json:"plate,omitempty"`
	Capacity *int    `json:"capacity,omitempty"`
	Brand    *string `json:"brand,omitempty"`
	Model    *string `json:"model,omitempty"`
	Status   *Status `json:"status,omitempty"`
}

type CreateStaffInput struct {
	FullName string    `json:"fullName"`
	Phone    string    `json:"phone,omitempty"`
	Role     StaffRole `json:"role"`
	Status   Status    `json:"status,omitempty"`
}

type UpdateStaffInput struct {
	FullName *string    `json:"fullName,omitempty"`
	Phone    *string    `json:"phone,omitempty"`
	Role     *StaffRole `json:"role,omitempty"`
	Status   *Status    `json:"status,omitempty"`
}

type CreateRouteInput struct {
	Name        string           `json:"name"`
	Direction   Direction        `json:"direction"`
	VehicleID   string           `json:"vehicleId,omitempty"`
	DriverID    string           `json:"driverId,omitempty"`
	AttendantID string           `json:"attendantId,omitempty"`
	Status      Status           `json:"status,omitempty"`
	Stops       []RouteStopInput `json:"stops,omitempty"`
}

type UpdateRouteInput struct {
	Name        *string           `json:"name,omitempty"`
	Direction   *Direction        `json:"direction,omitempty"`
	VehicleID   *string           `json:"vehicleId,omitempty"`
	DriverID    *string           `json:"driverId,omitempty"`
	AttendantID *string           `json:"attendantId,omitempty"`
	Status      *Status           `json:"status,omitempty"`
	Stops       *[]RouteStopInput `json:"stops,omitempty"`
}

type ServiceDelayInput struct {
	DelayMinutes int    `json:"delayMinutes"`
	Note         string `json:"note,omitempty"`
}

type ServiceDelayNotification struct {
	RouteID        string `json:"routeId"`
	RouteName      string `json:"routeName"`
	DelayMinutes   int    `json:"delayMinutes"`
	DeliveredCount int    `json:"deliveredCount"`
}

type AssignmentInput struct {
	StudentID string    `json:"studentId"`
	RouteID   string    `json:"routeId"`
	StopID    string    `json:"stopId,omitempty"`
	Direction Direction `json:"direction"`
	Status    Status    `json:"status,omitempty"`
}

type UpdateAssignmentInput struct {
	RouteID   *string    `json:"routeId,omitempty"`
	StopID    *string    `json:"stopId,omitempty"`
	Direction *Direction `json:"direction,omitempty"`
	Status    *Status    `json:"status,omitempty"`
}

type TripLocationInput struct {
	Latitude       float64 `json:"latitude"`
	Longitude      float64 `json:"longitude"`
	AccuracyMeters float64 `json:"accuracyMeters,omitempty"`
	SpeedKPH       float64 `json:"speedKph,omitempty"`
	HeadingDegrees float64 `json:"headingDegrees,omitempty"`
	CapturedAt     string  `json:"capturedAt,omitempty"`
}
