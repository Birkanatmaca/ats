package handlers

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	attendanceapp "ots/backend/internal/app/attendance"
	guardianapp "ots/backend/internal/app/guardian"
	guidanceapp "ots/backend/internal/app/guidance"
	identityapp "ots/backend/internal/app/identity"
	observationapp "ots/backend/internal/app/observation"
	pushapp "ots/backend/internal/app/push"
	schedulingapp "ots/backend/internal/app/scheduling"
	schoolapp "ots/backend/internal/app/school"
	transportapp "ots/backend/internal/app/transport"
	"ots/backend/internal/http/middleware"
	platformauth "ots/backend/internal/platform/auth"
	platformpush "ots/backend/internal/platform/push"
	"ots/backend/internal/repository/memory"
)

type handlerTestServer struct {
	handler http.Handler
}

func newHandlerTestServer() handlerTestServer {
	now := time.Now().UTC().Truncate(time.Second)
	clock := func() time.Time {
		return now
	}
	store := memory.NewStore(clock)
	jwtIssuer := platformauth.NewJWT("handler-test-secret", time.Hour, 24*time.Hour)

	h := New(Dependencies{
		Identity:    identityapp.NewService(store, jwtIssuer, clock),
		School:      schoolapp.NewService(store),
		Scheduling:  schedulingapp.NewService(store),
		Attendance:  attendanceapp.NewService(store),
		Observation: observationapp.NewService(store),
		Guardian:    guardianapp.NewService(store),
		Guidance:    guidanceapp.NewService(store),
		Push:        pushapp.NewService(store, platformpush.NewNoopSender(nil)),
		Transport:   transportapp.NewService(store, clock),
		Clock:       clock,
	})
	mux := http.NewServeMux()
	h.Register(mux)

	return handlerTestServer{
		handler: middleware.Chain(middleware.JWTAuth(jwtIssuer))(mux),
	}
}

func (s handlerTestServer) request(method, path, token string, body any) *httptest.ResponseRecorder {
	var payload *bytes.Reader
	if body == nil {
		payload = bytes.NewReader(nil)
	} else {
		raw, err := json.Marshal(body)
		if err != nil {
			panic(err)
		}
		payload = bytes.NewReader(raw)
	}
	req := httptest.NewRequest(method, path, payload)
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}
	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}
	rec := httptest.NewRecorder()
	s.handler.ServeHTTP(rec, req)
	return rec
}

func (s handlerTestServer) login(t *testing.T, email, password string) string {
	t.Helper()
	rec := s.request(http.MethodPost, "/api/v1/auth/login", "", map[string]string{
		"email":    email,
		"password": password,
	})
	if rec.Code != http.StatusOK {
		t.Fatalf("login status = %d, body = %s", rec.Code, rec.Body.String())
	}
	var envelope struct {
		Data struct {
			AccessToken string `json:"accessToken"`
			Principal   struct {
				Role string `json:"role"`
			} `json:"principal"`
		} `json:"data"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &envelope); err != nil {
		t.Fatalf("decode login response: %v", err)
	}
	if envelope.Data.AccessToken == "" {
		t.Fatal("login response did not include access token")
	}
	return envelope.Data.AccessToken
}

func decodeData[T any](t *testing.T, rec *httptest.ResponseRecorder) T {
	t.Helper()
	var envelope struct {
		Data T `json:"data"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &envelope); err != nil {
		t.Fatalf("decode response: %v\nbody=%s", err, rec.Body.String())
	}
	return envelope.Data
}

func decodeErrorCode(t *testing.T, rec *httptest.ResponseRecorder) string {
	t.Helper()
	var envelope struct {
		Error struct {
			Code string `json:"code"`
		} `json:"error"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &envelope); err != nil {
		t.Fatalf("decode error response: %v\nbody=%s", err, rec.Body.String())
	}
	return envelope.Error.Code
}

func TestTransportHandlersPrincipalCanListSeededRoutes(t *testing.T) {
	server := newHandlerTestServer()
	principalToken := server.login(t, "mudur@atlas.k12.tr", "OtsMudur!2026")

	rec := server.request(http.MethodGet, "/api/v1/services/routes", principalToken, nil)
	if rec.Code != http.StatusOK {
		t.Fatalf("routes status = %d, body = %s", rec.Code, rec.Body.String())
	}

	routes := decodeData[[]struct {
		ID           string `json:"id"`
		Name         string `json:"name"`
		VehiclePlate string `json:"vehiclePlate"`
		DriverName   string `json:"driverName"`
		Assignments  []struct {
			StudentID   string `json:"studentId"`
			StudentName string `json:"studentName"`
		} `json:"assignments"`
	}](t, rec)

	if len(routes) != 1 {
		t.Fatalf("route count = %d, want 1", len(routes))
	}
	route := routes[0]
	if route.ID != "service-route-5a-morning" || route.VehiclePlate != "34 OTS 101" || route.DriverName == "" {
		t.Fatalf("unexpected seeded route: %+v", route)
	}
	if len(route.Assignments) != 1 || route.Assignments[0].StudentID != "student-2" {
		t.Fatalf("unexpected assignments: %+v", route.Assignments)
	}
}

func TestTransportHandlersRejectTeacherManagementAccess(t *testing.T) {
	server := newHandlerTestServer()
	teacherToken := server.login(t, "ogretmen@atlas.k12.tr", "OtsOgretmen!2026")

	rec := server.request(http.MethodGet, "/api/v1/services/routes", teacherToken, nil)
	if rec.Code != http.StatusForbidden {
		t.Fatalf("routes status = %d, want %d, body = %s", rec.Code, http.StatusForbidden, rec.Body.String())
	}
	if code := decodeErrorCode(t, rec); code != "FORBIDDEN" {
		t.Fatalf("error code = %q, want FORBIDDEN", code)
	}
}

func TestTransportHandlersProvisionedDriverCanUseDriverEndpoints(t *testing.T) {
	server := newHandlerTestServer()
	principalToken := server.login(t, "mudur@atlas.k12.tr", "OtsMudur!2026")
	email := "servis.soforu@example.test"

	createRec := server.request(http.MethodPost, "/api/v1/principal/service-drivers", principalToken, map[string]string{
		"email":     email,
		"firstName": "Servis",
		"lastName":  "Soforu",
		"phone":     "+90 555 222 3344",
	})
	if createRec.Code != http.StatusCreated {
		t.Fatalf("create driver status = %d, body = %s", createRec.Code, createRec.Body.String())
	}
	credential := decodeData[struct {
		UserID            string `json:"userId"`
		ServiceStaffID    string `json:"serviceStaffId"`
		Email             string `json:"email"`
		TemporaryPassword string `json:"temporaryPassword"`
	}](t, createRec)
	if credential.UserID == "" || credential.ServiceStaffID == "" || credential.TemporaryPassword == "" {
		t.Fatalf("incomplete driver credential: %+v", credential)
	}

	driverToken := server.login(t, email, credential.TemporaryPassword)
	summaryRec := server.request(http.MethodGet, "/api/v1/driver/me", driverToken, nil)
	if summaryRec.Code != http.StatusOK {
		t.Fatalf("driver summary status = %d, body = %s", summaryRec.Code, summaryRec.Body.String())
	}
	summary := decodeData[struct {
		UserID    string `json:"userId"`
		IsSharing bool   `json:"isSharing"`
		Staff     struct {
			ID            string `json:"id"`
			UserID        string `json:"userId"`
			FullName      string `json:"fullName"`
			SharingStatus string `json:"sharingStatus"`
		} `json:"staff"`
	}](t, summaryRec)
	if summary.UserID != credential.UserID || summary.Staff.UserID != credential.UserID || summary.Staff.ID != credential.ServiceStaffID {
		t.Fatalf("driver summary is not linked to provisioned staff: %+v", summary)
	}
	if summary.IsSharing || summary.Staff.SharingStatus != "passive" {
		t.Fatalf("new driver sharing state = %+v, want passive", summary)
	}

	startRec := server.request(http.MethodPost, "/api/v1/driver/sharing/start", driverToken, map[string]any{})
	if startRec.Code != http.StatusOK {
		t.Fatalf("start sharing status = %d, body = %s", startRec.Code, startRec.Body.String())
	}
	started := decodeData[struct {
		ID            string `json:"id"`
		SharingStatus string `json:"sharingStatus"`
		LastSeenAt    string `json:"lastSeenAt"`
	}](t, startRec)
	if started.ID != credential.ServiceStaffID || started.SharingStatus != "active" || started.LastSeenAt == "" {
		t.Fatalf("unexpected started sharing payload: %+v", started)
	}
}

func TestTransportHandlersDriverSharingCreatesLiveTrip(t *testing.T) {
	server := newHandlerTestServer()
	driverToken := server.login(t, "sofor@atlas.k12.tr", "OtsSofor!2026")
	principalToken := server.login(t, "mudur@atlas.k12.tr", "OtsMudur!2026")
	guardianToken := server.login(t, "veli@atlas.k12.tr", "OtsVeli!2026")

	startRec := server.request(http.MethodPost, "/api/v1/driver/sharing/start", driverToken, map[string]any{})
	if startRec.Code != http.StatusOK {
		t.Fatalf("start sharing status = %d, body = %s", startRec.Code, startRec.Body.String())
	}

	summaryRec := server.request(http.MethodGet, "/api/v1/driver/me", driverToken, nil)
	if summaryRec.Code != http.StatusOK {
		t.Fatalf("driver summary status = %d, body = %s", summaryRec.Code, summaryRec.Body.String())
	}
	summary := decodeData[struct {
		IsSharing  bool `json:"isSharing"`
		ActiveTrip *struct {
			ID       string `json:"id"`
			RouteID  string `json:"routeId"`
			Status   string `json:"status"`
			DriverID string `json:"driverId"`
		} `json:"activeTrip"`
	}](t, summaryRec)
	if !summary.IsSharing || summary.ActiveTrip == nil || summary.ActiveTrip.Status != "active" {
		t.Fatalf("expected active trip in driver summary, got %+v", summary)
	}

	locationRec := server.request(http.MethodPost, "/api/v1/driver/trips/"+summary.ActiveTrip.ID+"/locations", driverToken, map[string]any{
		"latitude":       40.992,
		"longitude":      29.124,
		"accuracyMeters": 12,
	})
	if locationRec.Code != http.StatusCreated {
		t.Fatalf("location status = %d, body = %s", locationRec.Code, locationRec.Body.String())
	}
	location := decodeData[struct {
		TripID    string  `json:"tripId"`
		Latitude  float64 `json:"latitude"`
		Longitude float64 `json:"longitude"`
	}](t, locationRec)
	if location.TripID != summary.ActiveTrip.ID || location.Latitude == 0 || location.Longitude == 0 {
		t.Fatalf("unexpected location payload: %+v", location)
	}

	activeRec := server.request(http.MethodGet, "/api/v1/services/trips/active", principalToken, nil)
	if activeRec.Code != http.StatusOK {
		t.Fatalf("active trips status = %d, body = %s", activeRec.Code, activeRec.Body.String())
	}
	activeTrips := decodeData[[]struct {
		ID           string `json:"id"`
		LastLocation *struct {
			Latitude float64 `json:"latitude"`
		} `json:"lastLocation"`
	}](t, activeRec)
	if len(activeTrips) != 1 || activeTrips[0].ID != summary.ActiveTrip.ID || activeTrips[0].LastLocation == nil {
		t.Fatalf("unexpected active trips: %+v", activeTrips)
	}

	guardianTripRec := server.request(http.MethodGet, "/api/v1/guardian/students/student-2/service/trip", guardianToken, nil)
	if guardianTripRec.Code != http.StatusOK {
		t.Fatalf("guardian trip status = %d, body = %s", guardianTripRec.Code, guardianTripRec.Body.String())
	}
	guardianTrip := decodeData[struct {
		ID string `json:"id"`
	}](t, guardianTripRec)
	if guardianTrip.ID != summary.ActiveTrip.ID {
		t.Fatalf("guardian trip id = %q, want %q", guardianTrip.ID, summary.ActiveTrip.ID)
	}

	stopRec := server.request(http.MethodPost, "/api/v1/driver/sharing/stop", driverToken, map[string]any{})
	if stopRec.Code != http.StatusOK {
		t.Fatalf("stop sharing status = %d, body = %s", stopRec.Code, stopRec.Body.String())
	}
	activeAfterStopRec := server.request(http.MethodGet, "/api/v1/services/trips/active", principalToken, nil)
	if activeAfterStopRec.Code != http.StatusOK {
		t.Fatalf("active trips after stop status = %d, body = %s", activeAfterStopRec.Code, activeAfterStopRec.Body.String())
	}
	activeAfterStop := decodeData[[]struct {
		ID string `json:"id"`
	}](t, activeAfterStopRec)
	if len(activeAfterStop) != 0 {
		t.Fatalf("expected no active trips after stop, got %+v", activeAfterStop)
	}
}

func TestTransportHandlersGuardianScope(t *testing.T) {
	server := newHandlerTestServer()
	guardianToken := server.login(t, "veli@atlas.k12.tr", "OtsVeli!2026")

	allowedRec := server.request(http.MethodGet, "/api/v1/guardian/students/student-2/service", guardianToken, nil)
	if allowedRec.Code != http.StatusOK {
		t.Fatalf("guardian own student status = %d, body = %s", allowedRec.Code, allowedRec.Body.String())
	}
	allowed := decodeData[struct {
		StudentID     string `json:"studentId"`
		HasAssignment bool   `json:"hasAssignment"`
		Routes        []struct {
			ID string `json:"id"`
		} `json:"routes"`
	}](t, allowedRec)
	if allowed.StudentID != "student-2" || !allowed.HasAssignment || len(allowed.Routes) != 1 {
		t.Fatalf("unexpected guardian summary: %+v", allowed)
	}

	forbiddenRec := server.request(http.MethodGet, "/api/v1/guardian/students/student-1/service", guardianToken, nil)
	if forbiddenRec.Code != http.StatusForbidden {
		t.Fatalf("guardian foreign student status = %d, want %d, body = %s", forbiddenRec.Code, http.StatusForbidden, forbiddenRec.Body.String())
	}
	if code := decodeErrorCode(t, forbiddenRec); code != "FORBIDDEN" {
		t.Fatalf("error code = %q, want FORBIDDEN", code)
	}
}

func TestTransportHandlersRejectUnknownJSONFields(t *testing.T) {
	server := newHandlerTestServer()
	principalToken := server.login(t, "mudur@atlas.k12.tr", "OtsMudur!2026")
	body := []byte(`{"plate":"34 BAD 999","capacity":12,"unexpected":true}`)
	req := httptest.NewRequest(http.MethodPost, "/api/v1/services/vehicles", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", principalToken))
	rec := httptest.NewRecorder()

	server.handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("create vehicle status = %d, want %d, body = %s", rec.Code, http.StatusBadRequest, rec.Body.String())
	}
	if code := decodeErrorCode(t, rec); code != "VALIDATION_ERROR" {
		t.Fatalf("error code = %q, want VALIDATION_ERROR", code)
	}
}
