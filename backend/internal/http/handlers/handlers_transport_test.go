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
	homeworkapp "ots/backend/internal/app/homework"
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
	homeworkStore := memory.NewHomeworkStore(clock)
	homeworkStore.BindTeacherToClass("00000000-0000-0000-0000-000000010112", "class-5a")
	homeworkStore.BindTeacherToClass("00000000-0000-0000-0000-000000010112", "class-6b")
	homeworkStore.BindStudentToClass("student-1", "class-5a")
	homeworkStore.BindStudentToClass("student-2", "class-5a")
	homeworkStore.BindStudentToClass("student-3", "class-5a")
	homeworkStore.BindStudentToClass("student-4", "class-6b")
	homeworkStore.BindStudentToClass("student-5", "class-6b")
	homeworkStore.BindStudentToClass("student-6", "class-ana")
	jwtIssuer := platformauth.NewJWT("handler-test-secret", time.Hour, 24*time.Hour)

	h := New(Dependencies{
		Identity:    identityapp.NewService(store, jwtIssuer, clock),
		School:      schoolapp.NewService(store),
		Scheduling:  schedulingapp.NewService(store),
		Attendance:  attendanceapp.NewService(store),
		Observation: observationapp.NewService(store),
		Guardian:    guardianapp.NewService(store),
		Guidance:    guidanceapp.NewService(store),
		Homework:    homeworkapp.NewService(homeworkStore, clock),
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

func TestTransportHandlersPrincipalCanStartAndCompleteTrip(t *testing.T) {
	server := newHandlerTestServer()
	principalToken := server.login(t, "mudur@atlas.k12.tr", "OtsMudur!2026")

	startRec := server.request(http.MethodPost, "/api/v1/services/routes/service-route-5a-morning/start", principalToken, map[string]any{})
	if startRec.Code != http.StatusCreated {
		t.Fatalf("manual start status = %d, body = %s", startRec.Code, startRec.Body.String())
	}
	started := decodeData[struct {
		ID      string `json:"id"`
		RouteID string `json:"routeId"`
		Status  string `json:"status"`
	}](t, startRec)
	if started.ID == "" || started.RouteID != "service-route-5a-morning" || started.Status != "active" {
		t.Fatalf("unexpected started trip: %+v", started)
	}

	activeRec := server.request(http.MethodGet, "/api/v1/services/trips/active", principalToken, nil)
	if activeRec.Code != http.StatusOK {
		t.Fatalf("active trips status = %d, body = %s", activeRec.Code, activeRec.Body.String())
	}
	active := decodeData[[]struct {
		ID string `json:"id"`
	}](t, activeRec)
	if len(active) != 1 || active[0].ID != started.ID {
		t.Fatalf("unexpected active trips after manual start: %+v", active)
	}

	completeRec := server.request(http.MethodPost, "/api/v1/services/trips/"+started.ID+"/complete", principalToken, nil)
	if completeRec.Code != http.StatusOK {
		t.Fatalf("manual complete status = %d, body = %s", completeRec.Code, completeRec.Body.String())
	}
	completed := decodeData[struct {
		ID      string `json:"id"`
		Status  string `json:"status"`
		EndedAt string `json:"endedAt"`
	}](t, completeRec)
	if completed.ID != started.ID || completed.Status != "completed" || completed.EndedAt == "" {
		t.Fatalf("unexpected completed trip: %+v", completed)
	}

	eventsRec := server.request(http.MethodGet, "/api/v1/services/trips/"+started.ID+"/events?limit=5", principalToken, nil)
	if eventsRec.Code != http.StatusOK {
		t.Fatalf("trip events status = %d, body = %s", eventsRec.Code, eventsRec.Body.String())
	}
	events := decodeData[[]struct {
		EventType string `json:"eventType"`
	}](t, eventsRec)
	if len(events) < 2 || events[0].EventType != "trip_completed" {
		t.Fatalf("unexpected manual trip events: %+v", events)
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

	eventRec := server.request(http.MethodPost, "/api/v1/driver/trips/"+summary.ActiveTrip.ID+"/events", driverToken, map[string]any{
		"eventType": "student_boarded",
		"studentId": "student-2",
		"note":      "Duraktan alindi.",
	})
	if eventRec.Code != http.StatusCreated {
		t.Fatalf("driver event status = %d, body = %s", eventRec.Code, eventRec.Body.String())
	}
	event := decodeData[struct {
		TripID    string         `json:"tripId"`
		EventType string         `json:"eventType"`
		Payload   map[string]any `json:"payload"`
	}](t, eventRec)
	if event.TripID != summary.ActiveTrip.ID || event.EventType != "student_boarded" || event.Payload["studentId"] != "student-2" {
		t.Fatalf("unexpected driver event payload: %+v", event)
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

	eventsRec := server.request(http.MethodGet, "/api/v1/services/trips/"+summary.ActiveTrip.ID+"/events?limit=5", principalToken, nil)
	if eventsRec.Code != http.StatusOK {
		t.Fatalf("principal trip events status = %d, body = %s", eventsRec.Code, eventsRec.Body.String())
	}
	events := decodeData[[]struct {
		EventType string `json:"eventType"`
	}](t, eventsRec)
	foundBoarded := false
	for _, item := range events {
		if item.EventType == "student_boarded" {
			foundBoarded = true
			break
		}
	}
	if !foundBoarded {
		t.Fatalf("principal events did not include student_boarded: %+v", events)
	}

	liveRec := server.request(http.MethodGet, "/api/v1/services/trips/"+summary.ActiveTrip.ID+"/live?limit=5&eventLimit=5", principalToken, nil)
	if liveRec.Code != http.StatusOK {
		t.Fatalf("principal trip live status = %d, body = %s", liveRec.Code, liveRec.Body.String())
	}
	live := decodeData[struct {
		Trip struct {
			ID string `json:"id"`
		} `json:"trip"`
		LiveStatus *struct {
			Active         bool   `json:"active"`
			LastLocationAt string `json:"lastLocationAt"`
		} `json:"liveStatus"`
		Locations []struct {
			TripID string `json:"tripId"`
		} `json:"locations"`
		Events []struct {
			EventType string `json:"eventType"`
		} `json:"events"`
	}](t, liveRec)
	if live.Trip.ID != summary.ActiveTrip.ID || live.LiveStatus == nil || !live.LiveStatus.Active || live.LiveStatus.LastLocationAt == "" {
		t.Fatalf("unexpected principal live payload: %+v", live)
	}
	if len(live.Locations) != 1 || len(live.Events) == 0 {
		t.Fatalf("principal live missing locations/events: %+v", live)
	}

	timelineRec := server.request(http.MethodGet, "/api/v1/services/trips/"+summary.ActiveTrip.ID+"/timeline?limit=10", principalToken, nil)
	if timelineRec.Code != http.StatusOK {
		t.Fatalf("principal trip timeline status = %d, body = %s", timelineRec.Code, timelineRec.Body.String())
	}
	timeline := decodeData[[]struct {
		Type       string `json:"type"`
		EventType  string `json:"eventType"`
		OccurredAt string `json:"occurredAt"`
	}](t, timelineRec)
	hasLocation := false
	hasEvent := false
	for _, item := range timeline {
		if item.OccurredAt == "" {
			t.Fatalf("timeline item missing occurredAt: %+v", item)
		}
		if item.Type == "location" {
			hasLocation = true
		}
		if item.Type == "event" && item.EventType == "student_boarded" {
			hasEvent = true
		}
	}
	if !hasLocation || !hasEvent {
		t.Fatalf("timeline missing location or student event: %+v", timeline)
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

	guardianLiveRec := server.request(http.MethodGet, "/api/v1/guardian/students/student-2/service/live?limit=5&eventLimit=5", guardianToken, nil)
	if guardianLiveRec.Code != http.StatusOK {
		t.Fatalf("guardian live status = %d, body = %s", guardianLiveRec.Code, guardianLiveRec.Body.String())
	}
	guardianLive := decodeData[struct {
		StudentID  string `json:"studentId"`
		Active     bool   `json:"active"`
		ActiveTrip *struct {
			ID string `json:"id"`
		} `json:"activeTrip"`
		LiveStatus *struct {
			Active         bool     `json:"active"`
			EtaMinutes     *int     `json:"etaMinutes"`
			DistanceKm     *float64 `json:"distanceKm"`
			LastLocationAt string   `json:"lastLocationAt"`
			LocationStale  bool     `json:"locationStale"`
			StopLatitude   *float64 `json:"stopLatitude"`
			StopLongitude  *float64 `json:"stopLongitude"`
		} `json:"liveStatus"`
		Locations []struct {
			TripID string `json:"tripId"`
		} `json:"locations"`
		Events []struct {
			EventType string `json:"eventType"`
		} `json:"events"`
	}](t, guardianLiveRec)
	if guardianLive.StudentID != "student-2" || !guardianLive.Active || guardianLive.ActiveTrip == nil || guardianLive.ActiveTrip.ID != summary.ActiveTrip.ID {
		t.Fatalf("unexpected guardian live payload: %+v", guardianLive)
	}
	if guardianLive.LiveStatus == nil || !guardianLive.LiveStatus.Active || guardianLive.LiveStatus.LastLocationAt == "" {
		t.Fatalf("guardian live status missing active location data: %+v", guardianLive.LiveStatus)
	}
	if len(guardianLive.Locations) != 1 || guardianLive.Locations[0].TripID != summary.ActiveTrip.ID {
		t.Fatalf("unexpected guardian live locations: %+v", guardianLive.Locations)
	}
	if len(guardianLive.Events) == 0 {
		t.Fatalf("expected guardian live events, got none")
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

	liveRec := server.request(http.MethodGet, "/api/v1/guardian/students/student-2/service/live", guardianToken, nil)
	if liveRec.Code != http.StatusOK {
		t.Fatalf("guardian own student live status = %d, body = %s", liveRec.Code, liveRec.Body.String())
	}
	live := decodeData[struct {
		StudentID  string `json:"studentId"`
		Active     bool   `json:"active"`
		LiveStatus struct {
			Active        bool `json:"active"`
			LocationStale bool `json:"locationStale"`
		} `json:"liveStatus"`
		Locations []struct{} `json:"locations"`
		Events    []struct{} `json:"events"`
	}](t, liveRec)
	if live.StudentID != "student-2" || live.Active || live.LiveStatus.Active || !live.LiveStatus.LocationStale || len(live.Locations) != 0 || len(live.Events) != 0 {
		t.Fatalf("unexpected inactive guardian live payload: %+v", live)
	}

	forbiddenRec := server.request(http.MethodGet, "/api/v1/guardian/students/student-1/service", guardianToken, nil)
	if forbiddenRec.Code != http.StatusForbidden {
		t.Fatalf("guardian foreign student status = %d, want %d, body = %s", forbiddenRec.Code, http.StatusForbidden, forbiddenRec.Body.String())
	}
	if code := decodeErrorCode(t, forbiddenRec); code != "FORBIDDEN" {
		t.Fatalf("error code = %q, want FORBIDDEN", code)
	}

	forbiddenLiveRec := server.request(http.MethodGet, "/api/v1/guardian/students/student-1/service/live", guardianToken, nil)
	if forbiddenLiveRec.Code != http.StatusForbidden {
		t.Fatalf("guardian foreign student live status = %d, want %d, body = %s", forbiddenLiveRec.Code, http.StatusForbidden, forbiddenLiveRec.Body.String())
	}
	if code := decodeErrorCode(t, forbiddenLiveRec); code != "FORBIDDEN" {
		t.Fatalf("live error code = %q, want FORBIDDEN", code)
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
