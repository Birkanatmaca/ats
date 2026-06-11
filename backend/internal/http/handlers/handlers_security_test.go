package handlers

import (
	"bytes"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestAuthPasswordResetRoutesArePublicAndSingleUse(t *testing.T) {
	server := newHandlerTestServer()

	forgotRec := server.request(http.MethodPost, "/api/v1/auth/password/forgot", "", map[string]string{
		"email": "veli@atlas.k12.tr",
	})
	if forgotRec.Code != http.StatusOK {
		t.Fatalf("forgot status = %d, body = %s", forgotRec.Code, forgotRec.Body.String())
	}
	forgot := decodeData[struct {
		Message    string `json:"message"`
		ResetToken string `json:"resetToken"`
	}](t, forgotRec)
	if forgot.Message == "" || forgot.ResetToken == "" {
		t.Fatalf("forgot response did not include reset preview token: %+v", forgot)
	}

	weakRec := server.request(http.MethodPost, "/api/v1/auth/password/reset", "", map[string]string{
		"token":       forgot.ResetToken,
		"newPassword": "short",
	})
	if weakRec.Code != http.StatusBadRequest {
		t.Fatalf("weak reset status = %d, body = %s", weakRec.Code, weakRec.Body.String())
	}
	if code := decodeErrorCode(t, weakRec); code != "WEAK_PASSWORD" {
		t.Fatalf("weak reset error code = %q, want WEAK_PASSWORD", code)
	}

	const newPassword = "OtsYeniVeli!2026"
	resetRec := server.request(http.MethodPost, "/api/v1/auth/password/reset", "", map[string]string{
		"token":       forgot.ResetToken,
		"newPassword": newPassword,
	})
	if resetRec.Code != http.StatusOK {
		t.Fatalf("reset status = %d, body = %s", resetRec.Code, resetRec.Body.String())
	}

	reuseRec := server.request(http.MethodPost, "/api/v1/auth/password/reset", "", map[string]string{
		"token":       forgot.ResetToken,
		"newPassword": "OtsBaskaVeli!2026",
	})
	if reuseRec.Code != http.StatusBadRequest {
		t.Fatalf("reuse reset status = %d, body = %s", reuseRec.Code, reuseRec.Body.String())
	}
	if code := decodeErrorCode(t, reuseRec); code != "INVALID_RESET_TOKEN" {
		t.Fatalf("reuse reset error code = %q, want INVALID_RESET_TOKEN", code)
	}

	oldLoginRec := server.request(http.MethodPost, "/api/v1/auth/login", "", map[string]string{
		"email":    "veli@atlas.k12.tr",
		"password": "OtsVeli!2026",
	})
	if oldLoginRec.Code != http.StatusUnauthorized {
		t.Fatalf("old password login status = %d, want %d", oldLoginRec.Code, http.StatusUnauthorized)
	}

	newLoginRec := server.request(http.MethodPost, "/api/v1/auth/login", "", map[string]string{
		"email":    "veli@atlas.k12.tr",
		"password": newPassword,
	})
	if newLoginRec.Code != http.StatusOK {
		t.Fatalf("new password login status = %d, body = %s", newLoginRec.Code, newLoginRec.Body.String())
	}
}

func TestObservationHandlersEnforceRolePolicies(t *testing.T) {
	server := newHandlerTestServer()
	teacherToken := server.login(t, "ogretmen@atlas.k12.tr", "OtsOgretmen!2026")
	guidanceToken := server.login(t, "rehberlik@atlas.k12.tr", "OtsRehberlik!2026")
	guardianToken := server.login(t, "veli@atlas.k12.tr", "OtsVeli!2026")
	principalToken := server.login(t, "mudur@atlas.k12.tr", "OtsMudur!2026")

	guardianListRec := server.request(http.MethodGet, "/api/v1/observations", guardianToken, nil)
	if guardianListRec.Code != http.StatusForbidden {
		t.Fatalf("guardian list observations status = %d, body = %s", guardianListRec.Code, guardianListRec.Body.String())
	}

	guardianGetRec := server.request(http.MethodGet, "/api/v1/observations/observation-1", guardianToken, nil)
	if guardianGetRec.Code != http.StatusForbidden {
		t.Fatalf("guardian get observation status = %d, body = %s", guardianGetRec.Code, guardianGetRec.Body.String())
	}

	teacherCreateRec := server.request(http.MethodPost, "/api/v1/observations", teacherToken, map[string]string{
		"studentId": "student-1",
		"category":  "teacher_note",
		"note":      "Derse hazirlik duzeyi iyi.",
	})
	if teacherCreateRec.Code != http.StatusCreated {
		t.Fatalf("teacher create observation status = %d, body = %s", teacherCreateRec.Code, teacherCreateRec.Body.String())
	}
	created := decodeData[struct {
		ID       string `json:"id"`
		AuthorID string `json:"authorId"`
	}](t, teacherCreateRec)
	if created.ID == "" || created.AuthorID == "" {
		t.Fatalf("incomplete observation response: %+v", created)
	}

	outOfScopeRec := server.request(http.MethodPost, "/api/v1/observations", teacherToken, map[string]string{
		"studentId": "student-missing",
		"category":  "teacher_note",
		"note":      "Bu kayit olusmamali.",
	})
	if outOfScopeRec.Code != http.StatusForbidden {
		t.Fatalf("out-of-scope create status = %d, body = %s", outOfScopeRec.Code, outOfScopeRec.Body.String())
	}
	if code := decodeErrorCode(t, outOfScopeRec); code != "STUDENT_OUT_OF_SCOPE" {
		t.Fatalf("out-of-scope error code = %q, want STUDENT_OUT_OF_SCOPE", code)
	}

	guidancePatchRec := server.request(http.MethodPatch, "/api/v1/observations/observation-1", guidanceToken, map[string]string{
		"note": "Rehberlik bu kaydi dogrudan degistirememeli.",
	})
	if guidancePatchRec.Code != http.StatusForbidden {
		t.Fatalf("guidance patch observation status = %d, body = %s", guidancePatchRec.Code, guidancePatchRec.Body.String())
	}

	principalPatchRec := server.request(http.MethodPatch, "/api/v1/observations/observation-1", principalToken, map[string]string{
		"note": "Mudur tarafindan guncellendi.",
	})
	if principalPatchRec.Code != http.StatusOK {
		t.Fatalf("principal patch observation status = %d, body = %s", principalPatchRec.Code, principalPatchRec.Body.String())
	}
	updated := decodeData[struct {
		Note string `json:"note"`
	}](t, principalPatchRec)
	if updated.Note != "Mudur tarafindan guncellendi." {
		t.Fatalf("updated note = %q", updated.Note)
	}
}

func TestGuidanceHandlersRejectUnauthorizedRolesAndCreateNotes(t *testing.T) {
	server := newHandlerTestServer()
	teacherToken := server.login(t, "ogretmen@atlas.k12.tr", "OtsOgretmen!2026")
	guidanceToken := server.login(t, "rehberlik@atlas.k12.tr", "OtsRehberlik!2026")

	teacherListRec := server.request(http.MethodGet, "/api/v1/guidance/notes", teacherToken, nil)
	if teacherListRec.Code != http.StatusForbidden {
		t.Fatalf("teacher guidance notes status = %d, body = %s", teacherListRec.Code, teacherListRec.Body.String())
	}
	if code := decodeErrorCode(t, teacherListRec); code != "FORBIDDEN" {
		t.Fatalf("teacher guidance error code = %q, want FORBIDDEN", code)
	}

	createRec := server.request(http.MethodPost, "/api/v1/guidance/notes", guidanceToken, map[string]string{
		"studentId": "student-2",
		"noteType":  "meeting",
		"title":     "Veli gorusmesi",
		"body":      "Takip gorusmesi planlandi.",
	})
	if createRec.Code != http.StatusCreated {
		t.Fatalf("create guidance note status = %d, body = %s", createRec.Code, createRec.Body.String())
	}
	created := decodeData[struct {
		ID        string `json:"id"`
		StudentID string `json:"studentId"`
		AuthorID  string `json:"authorId"`
	}](t, createRec)
	if created.ID == "" || created.StudentID != "student-2" || created.AuthorID == "" {
		t.Fatalf("unexpected created guidance note: %+v", created)
	}

	listRec := server.request(http.MethodGet, "/api/v1/guidance/notes?studentId=student-2", guidanceToken, nil)
	if listRec.Code != http.StatusOK {
		t.Fatalf("list guidance notes status = %d, body = %s", listRec.Code, listRec.Body.String())
	}
	notes := decodeData[[]struct {
		ID string `json:"id"`
	}](t, listRec)
	if len(notes) != 1 || notes[0].ID != created.ID {
		t.Fatalf("unexpected guidance notes: %+v", notes)
	}
}

func TestPushHandlersRequireAuthAndDoNotLeakDeviceTokens(t *testing.T) {
	server := newHandlerTestServer()

	unauthRec := server.request(http.MethodGet, "/api/v1/me/device-tokens", "", nil)
	if unauthRec.Code != http.StatusUnauthorized {
		t.Fatalf("unauth device token status = %d, body = %s", unauthRec.Code, unauthRec.Body.String())
	}

	guardianToken := server.login(t, "veli@atlas.k12.tr", "OtsVeli!2026")
	invalidRec := server.request(http.MethodPost, "/api/v1/me/device-tokens", guardianToken, map[string]string{
		"token":    "",
		"platform": "ios",
	})
	if invalidRec.Code != http.StatusBadRequest {
		t.Fatalf("invalid device token status = %d, body = %s", invalidRec.Code, invalidRec.Body.String())
	}

	const rawToken = "ExponentPushToken[abcdefghijklmnopqrstuvwxyz]"
	registerRec := server.request(http.MethodPost, "/api/v1/me/device-tokens", guardianToken, map[string]string{
		"token":    rawToken,
		"platform": "ios",
	})
	if registerRec.Code != http.StatusCreated {
		t.Fatalf("register device token status = %d, body = %s", registerRec.Code, registerRec.Body.String())
	}
	registered := decodeData[struct {
		ID           string `json:"id"`
		Token        string `json:"token"`
		TokenPreview string `json:"tokenPreview"`
		Platform     string `json:"platform"`
	}](t, registerRec)
	if registered.ID == "" || registered.Platform != "ios" {
		t.Fatalf("unexpected registered token payload: %+v", registered)
	}
	if registered.Token != "" || registered.TokenPreview == "" || registered.TokenPreview == rawToken {
		t.Fatalf("device token was not sanitized: %+v", registered)
	}
	if strings.Contains(registerRec.Body.String(), rawToken) {
		t.Fatalf("raw device token leaked in register response: %s", registerRec.Body.String())
	}

	listRec := server.request(http.MethodGet, "/api/v1/me/device-tokens", guardianToken, nil)
	if listRec.Code != http.StatusOK {
		t.Fatalf("list device tokens status = %d, body = %s", listRec.Code, listRec.Body.String())
	}
	if strings.Contains(listRec.Body.String(), rawToken) {
		t.Fatalf("raw device token leaked in list response: %s", listRec.Body.String())
	}

	teacherToken := server.login(t, "ogretmen@atlas.k12.tr", "OtsOgretmen!2026")
	pushTestRec := server.request(http.MethodPost, "/api/v1/push/test", teacherToken, map[string]string{})
	if pushTestRec.Code != http.StatusForbidden {
		t.Fatalf("teacher push test status = %d, body = %s", pushTestRec.Code, pushTestRec.Body.String())
	}
}

func TestGuardianGuidanceUpdatesEnforceStudentScopeAndVisibility(t *testing.T) {
	server := newHandlerTestServer()
	guidanceToken := server.login(t, "rehberlik@atlas.k12.tr", "OtsRehberlik!2026")
	guardianToken := server.login(t, "veli@atlas.k12.tr", "OtsVeli!2026")
	teacherToken := server.login(t, "ogretmen@atlas.k12.tr", "OtsOgretmen!2026")

	createCaseRec := server.request(http.MethodPost, "/api/v1/guidance/cases", guidanceToken, map[string]string{
		"studentId": "student-2",
		"title":     "Veli takip vakasi",
		"summary":   "Veli ile paylasilacak takip sureci.",
		"priority":  "medium",
	})
	if createCaseRec.Code != http.StatusCreated {
		t.Fatalf("create guidance case status = %d, body = %s", createCaseRec.Code, createCaseRec.Body.String())
	}
	createdCase := decodeData[struct {
		ID string `json:"id"`
	}](t, createCaseRec)
	if createdCase.ID == "" {
		t.Fatalf("missing created case id: %+v", createdCase)
	}

	privateEventRec := server.request(http.MethodPost, "/api/v1/guidance/cases/"+createdCase.ID+"/events", guidanceToken, map[string]string{
		"eventType":  "note",
		"title":      "Ic not",
		"body":       "Veli gormemeli.",
		"visibility": "guidance_only",
	})
	if privateEventRec.Code != http.StatusCreated {
		t.Fatalf("create private event status = %d, body = %s", privateEventRec.Code, privateEventRec.Body.String())
	}

	sharedEventRec := server.request(http.MethodPost, "/api/v1/guidance/cases/"+createdCase.ID+"/events", guidanceToken, map[string]string{
		"eventType":  "meeting",
		"title":      "Veli gorusmesi planlandi",
		"body":       "15 Haziran saat 14:00 veli gorusmesi.",
		"visibility": "shared_with_guardian",
	})
	if sharedEventRec.Code != http.StatusCreated {
		t.Fatalf("create shared event status = %d, body = %s", sharedEventRec.Code, sharedEventRec.Body.String())
	}

	teacherRec := server.request(http.MethodGet, "/api/v1/guardian/students/student-2/guidance-updates", teacherToken, nil)
	if teacherRec.Code != http.StatusForbidden {
		t.Fatalf("teacher guidance updates status = %d, body = %s", teacherRec.Code, teacherRec.Body.String())
	}

	forbiddenRec := server.request(http.MethodGet, "/api/v1/guardian/students/student-1/guidance-updates", guardianToken, nil)
	if forbiddenRec.Code != http.StatusForbidden {
		t.Fatalf("guardian out-of-scope updates status = %d, body = %s", forbiddenRec.Code, forbiddenRec.Body.String())
	}

	allowedRec := server.request(http.MethodGet, "/api/v1/guardian/students/student-2/guidance-updates", guardianToken, nil)
	if allowedRec.Code != http.StatusOK {
		t.Fatalf("guardian guidance updates status = %d, body = %s", allowedRec.Code, allowedRec.Body.String())
	}
	updates := decodeData[[]struct {
		Title      string `json:"title"`
		Visibility string `json:"visibility"`
	}](t, allowedRec)
	if len(updates) != 1 {
		t.Fatalf("guardian updates count = %d, want 1: %+v", len(updates), updates)
	}
	if updates[0].Title != "Veli gorusmesi planlandi" {
		t.Fatalf("unexpected shared update title = %q", updates[0].Title)
	}
	if strings.Contains(allowedRec.Body.String(), "Ic not") {
		t.Fatalf("private guidance note leaked to guardian response: %s", allowedRec.Body.String())
	}
}

func TestHandlerJSONDecoderRejectsUnknownFieldsOnObservation(t *testing.T) {
	server := newHandlerTestServer()
	teacherToken := server.login(t, "ogretmen@atlas.k12.tr", "OtsOgretmen!2026")
	body := []byte(`{"studentId":"student-1","category":"teacher_note","note":"ok","unexpected":true}`)
	req := httptest.NewRequest(http.MethodPost, "/api/v1/observations", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+teacherToken)
	rec := httptest.NewRecorder()

	server.handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("unknown field observation status = %d, want %d, body = %s", rec.Code, http.StatusBadRequest, rec.Body.String())
	}
	if code := decodeErrorCode(t, rec); code != "VALIDATION_ERROR" {
		t.Fatalf("unknown field error code = %q, want VALIDATION_ERROR", code)
	}
}
