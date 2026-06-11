package handlers

import (
	"net/http"
	"strings"
	"testing"
)

func TestAttendanceSummaryEnforcesRoleScope(t *testing.T) {
	server := newHandlerTestServer()
	teacherToken := server.login(t, "ogretmen@atlas.k12.tr", "OtsOgretmen!2026")
	guardianToken := server.login(t, "veli@atlas.k12.tr", "OtsVeli!2026")
	principalToken := server.login(t, "mudur@atlas.k12.tr", "OtsMudur!2026")

	teacherAllowedRec := server.request(http.MethodGet, "/api/v1/students/student-1/attendance-summary", teacherToken, nil)
	if teacherAllowedRec.Code != http.StatusOK {
		t.Fatalf("teacher in-scope attendance summary status = %d, body = %s", teacherAllowedRec.Code, teacherAllowedRec.Body.String())
	}

	teacherDeniedRec := server.request(http.MethodGet, "/api/v1/students/student-6/attendance-summary", teacherToken, nil)
	if teacherDeniedRec.Code != http.StatusForbidden {
		t.Fatalf("teacher out-of-scope attendance summary status = %d, body = %s", teacherDeniedRec.Code, teacherDeniedRec.Body.String())
	}

	guardianAllowedRec := server.request(http.MethodGet, "/api/v1/students/student-2/attendance-summary", guardianToken, nil)
	if guardianAllowedRec.Code != http.StatusOK {
		t.Fatalf("guardian linked child attendance summary status = %d, body = %s", guardianAllowedRec.Code, guardianAllowedRec.Body.String())
	}

	guardianDeniedRec := server.request(http.MethodGet, "/api/v1/students/student-1/attendance-summary", guardianToken, nil)
	if guardianDeniedRec.Code != http.StatusForbidden {
		t.Fatalf("guardian unlinked child attendance summary status = %d, body = %s", guardianDeniedRec.Code, guardianDeniedRec.Body.String())
	}

	principalRec := server.request(http.MethodGet, "/api/v1/students/student-6/attendance-summary", principalToken, nil)
	if principalRec.Code != http.StatusOK {
		t.Fatalf("principal attendance summary status = %d, body = %s", principalRec.Code, principalRec.Body.String())
	}
}

func TestAttendanceTodayReportIsPrincipalOnly(t *testing.T) {
	server := newHandlerTestServer()
	teacherToken := server.login(t, "ogretmen@atlas.k12.tr", "OtsOgretmen!2026")
	principalToken := server.login(t, "mudur@atlas.k12.tr", "OtsMudur!2026")

	teacherRec := server.request(http.MethodGet, "/api/v1/dashboard/attendance/today", teacherToken, nil)
	if teacherRec.Code != http.StatusForbidden {
		t.Fatalf("teacher attendance today status = %d, body = %s", teacherRec.Code, teacherRec.Body.String())
	}

	principalRec := server.request(http.MethodGet, "/api/v1/dashboard/attendance/today", principalToken, nil)
	if principalRec.Code != http.StatusOK {
		t.Fatalf("principal attendance today status = %d, body = %s", principalRec.Code, principalRec.Body.String())
	}
}

func TestObservationDeleteEnforcesModifyPolicy(t *testing.T) {
	server := newHandlerTestServer()
	teacherToken := server.login(t, "ogretmen@atlas.k12.tr", "OtsOgretmen!2026")
	guidanceToken := server.login(t, "rehberlik@atlas.k12.tr", "OtsRehberlik!2026")

	guidanceDeleteRec := server.request(http.MethodDelete, "/api/v1/observations/observation-1", guidanceToken, nil)
	if guidanceDeleteRec.Code != http.StatusForbidden {
		t.Fatalf("guidance delete observation status = %d, body = %s", guidanceDeleteRec.Code, guidanceDeleteRec.Body.String())
	}

	teacherDeleteRec := server.request(http.MethodDelete, "/api/v1/observations/observation-1", teacherToken, nil)
	if teacherDeleteRec.Code != http.StatusNoContent {
		t.Fatalf("teacher delete own observation status = %d, body = %s", teacherDeleteRec.Code, teacherDeleteRec.Body.String())
	}

	missingRec := server.request(http.MethodGet, "/api/v1/observations/observation-1", teacherToken, nil)
	if missingRec.Code != http.StatusNotFound {
		t.Fatalf("deleted observation lookup status = %d, body = %s", missingRec.Code, missingRec.Body.String())
	}
}

func TestGuidanceSupportPlansRejectTeacherAndScopeOutOfTenantStudent(t *testing.T) {
	server := newHandlerTestServer()
	teacherToken := server.login(t, "ogretmen@atlas.k12.tr", "OtsOgretmen!2026")
	guidanceToken := server.login(t, "rehberlik@atlas.k12.tr", "OtsRehberlik!2026")

	teacherListRec := server.request(http.MethodGet, "/api/v1/guidance/support-plans", teacherToken, nil)
	if teacherListRec.Code != http.StatusForbidden {
		t.Fatalf("teacher support plans status = %d, body = %s", teacherListRec.Code, teacherListRec.Body.String())
	}

	createRec := server.request(http.MethodPost, "/api/v1/guidance/support-plans", guidanceToken, map[string]string{
		"studentId":   "student-2",
		"title":       "Matematik destek plani",
		"description": "Haftalik tekrar ve veli takibi.",
		"status":      "open",
		"dueDate":     "2026-06-30",
	})
	if createRec.Code != http.StatusCreated {
		t.Fatalf("create support plan status = %d, body = %s", createRec.Code, createRec.Body.String())
	}
	created := decodeData[struct {
		ID string `json:"id"`
	}](t, createRec)
	if created.ID == "" {
		t.Fatalf("missing created support plan id: %+v", created)
	}

	teacherPatchRec := server.request(http.MethodPatch, "/api/v1/guidance/support-plans/"+created.ID, teacherToken, map[string]string{
		"title": "Ogrenci plani degistirilmemeli.",
	})
	if teacherPatchRec.Code != http.StatusForbidden {
		t.Fatalf("teacher patch support plan status = %d, body = %s", teacherPatchRec.Code, teacherPatchRec.Body.String())
	}
}

func TestGuidanceCasesRejectTeacherAndAllowPrincipalSummary(t *testing.T) {
	server := newHandlerTestServer()
	teacherToken := server.login(t, "ogretmen@atlas.k12.tr", "OtsOgretmen!2026")
	guidanceToken := server.login(t, "rehberlik@atlas.k12.tr", "OtsRehberlik!2026")
	principalToken := server.login(t, "mudur@atlas.k12.tr", "OtsMudur!2026")

	teacherListRec := server.request(http.MethodGet, "/api/v1/guidance/cases", teacherToken, nil)
	if teacherListRec.Code != http.StatusForbidden {
		t.Fatalf("teacher guidance cases status = %d, body = %s", teacherListRec.Code, teacherListRec.Body.String())
	}

	createRec := server.request(http.MethodPost, "/api/v1/guidance/cases", guidanceToken, map[string]string{
		"studentId": "student-2",
		"title":     "Davranis takip vakasi",
		"summary":   "Sinif ici dikkat takibi.",
		"priority":  "high",
	})
	if createRec.Code != http.StatusCreated {
		t.Fatalf("create guidance case status = %d, body = %s", createRec.Code, createRec.Body.String())
	}
	created := decodeData[struct {
		ID string `json:"id"`
	}](t, createRec)

	privateEventRec := server.request(http.MethodPost, "/api/v1/guidance/cases/"+created.ID+"/events", guidanceToken, map[string]string{
		"eventType":  "note",
		"title":      "Hassas rehberlik notu",
		"body":       "Bu not mudur ozetinde maskelenmeli.",
		"visibility": "guidance_only",
	})
	if privateEventRec.Code != http.StatusCreated {
		t.Fatalf("create private case event status = %d, body = %s", privateEventRec.Code, privateEventRec.Body.String())
	}

	principalGetRec := server.request(http.MethodGet, "/api/v1/guidance/cases/"+created.ID, principalToken, nil)
	if principalGetRec.Code != http.StatusOK {
		t.Fatalf("principal get guidance case status = %d, body = %s", principalGetRec.Code, principalGetRec.Body.String())
	}

	principalTimelineRec := server.request(http.MethodGet, "/api/v1/guidance/cases/"+created.ID+"/timeline", principalToken, nil)
	if principalTimelineRec.Code != http.StatusOK {
		t.Fatalf("principal guidance timeline status = %d, body = %s", principalTimelineRec.Code, principalTimelineRec.Body.String())
	}
	if strings.Contains(principalTimelineRec.Body.String(), "Hassas rehberlik notu") {
		t.Fatalf("principal timeline leaked sensitive event title: %s", principalTimelineRec.Body.String())
	}
	if !strings.Contains(principalTimelineRec.Body.String(), "[Gizli kayıt]") {
		t.Fatalf("principal timeline did not mask guidance-only event: %s", principalTimelineRec.Body.String())
	}
}

func TestPrincipalGuardianRoutesRejectTeacher(t *testing.T) {
	server := newHandlerTestServer()
	teacherToken := server.login(t, "ogretmen@atlas.k12.tr", "OtsOgretmen!2026")
	principalToken := server.login(t, "mudur@atlas.k12.tr", "OtsMudur!2026")

	teacherRec := server.request(http.MethodGet, "/api/v1/principal/guardians", teacherToken, nil)
	if teacherRec.Code != http.StatusForbidden {
		t.Fatalf("teacher guardian list status = %d, body = %s", teacherRec.Code, teacherRec.Body.String())
	}

	principalRec := server.request(http.MethodGet, "/api/v1/principal/guardians", principalToken, nil)
	if principalRec.Code != http.StatusOK {
		t.Fatalf("principal guardian list status = %d, body = %s", principalRec.Code, principalRec.Body.String())
	}
	guardians := decodeData[[]struct {
		Email string `json:"email"`
	}](t, principalRec)
	if len(guardians) == 0 || guardians[0].Email != "veli@atlas.k12.tr" {
		t.Fatalf("unexpected guardian list: %+v", guardians)
	}
}

func TestSchedulingMetaRoutesRejectTeacherAndAllowPrincipal(t *testing.T) {
	server := newHandlerTestServer()
	teacherToken := server.login(t, "ogretmen@atlas.k12.tr", "OtsOgretmen!2026")
	principalToken := server.login(t, "mudur@atlas.k12.tr", "OtsMudur!2026")

	teacherReqRec := server.request(http.MethodGet, "/api/v1/scheduling/requirements", teacherToken, nil)
	if teacherReqRec.Code != http.StatusForbidden {
		t.Fatalf("teacher scheduling requirements status = %d, body = %s", teacherReqRec.Code, teacherReqRec.Body.String())
	}

	principalReqRec := server.request(http.MethodGet, "/api/v1/scheduling/requirements", principalToken, nil)
	if principalReqRec.Code != http.StatusOK {
		t.Fatalf("principal scheduling requirements status = %d, body = %s", principalReqRec.Code, principalReqRec.Body.String())
	}

	teacherAvailRec := server.request(http.MethodGet, "/api/v1/scheduling/teacher-availabilities", teacherToken, nil)
	if teacherAvailRec.Code != http.StatusForbidden {
		t.Fatalf("teacher teacher-availabilities status = %d, body = %s", teacherAvailRec.Code, teacherAvailRec.Body.String())
	}

	principalValidateRec := server.request(http.MethodPost, "/api/v1/schedules/schedule-published/validate", principalToken, nil)
	if principalValidateRec.Code != http.StatusOK {
		t.Fatalf("principal validate schedule status = %d, body = %s", principalValidateRec.Code, principalValidateRec.Body.String())
	}

	teacherValidateRec := server.request(http.MethodPost, "/api/v1/schedules/schedule-published/validate", teacherToken, nil)
	if teacherValidateRec.Code != http.StatusForbidden {
		t.Fatalf("teacher validate schedule status = %d, body = %s", teacherValidateRec.Code, teacherValidateRec.Body.String())
	}
}
