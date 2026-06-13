package handlers

import (
	"net/http"
	"testing"
)

func TestHomeworkHandlersTeacherOwnershipRules(t *testing.T) {
	server := newHandlerTestServer()
	teacherToken := server.login(t, "ogretmen@atlas.k12.tr", "OtsOgretmen!2026")

	allowedRec := server.request(http.MethodPost, "/api/v1/homework/assignments", teacherToken, map[string]any{
		"classId": "class-5a",
		"course":  "Matematik",
		"title":   "Kesirler çalışma kağıdı",
		"dueDate": "2026-06-20",
	})
	if allowedRec.Code != http.StatusCreated {
		t.Fatalf("teacher own class create status = %d, body = %s", allowedRec.Code, allowedRec.Body.String())
	}
	allowed := decodeData[struct {
		ID      string `json:"id"`
		ClassID string `json:"classId"`
	}](t, allowedRec)
	if allowed.ID == "" || allowed.ClassID != "class-5a" {
		t.Fatalf("unexpected created homework: %+v", allowed)
	}

	forbiddenRec := server.request(http.MethodPost, "/api/v1/homework/assignments", teacherToken, map[string]any{
		"classId": "class-ana",
		"course":  "Matematik",
		"title":   "Kapsam dışı ödev",
		"dueDate": "2026-06-20",
	})
	if forbiddenRec.Code != http.StatusForbidden {
		t.Fatalf("teacher foreign class create status = %d, want %d, body = %s", forbiddenRec.Code, http.StatusForbidden, forbiddenRec.Body.String())
	}
	if code := decodeErrorCode(t, forbiddenRec); code != "FORBIDDEN" {
		t.Fatalf("error code = %q, want FORBIDDEN", code)
	}
}

func TestHomeworkHandlersGuardianOwnershipRules(t *testing.T) {
	server := newHandlerTestServer()
	teacherToken := server.login(t, "ogretmen@atlas.k12.tr", "OtsOgretmen!2026")
	guardianToken := server.login(t, "veli@atlas.k12.tr", "OtsVeli!2026")

	class5Rec := server.request(http.MethodPost, "/api/v1/homework/assignments", teacherToken, map[string]any{
		"classId": "class-5a",
		"course":  "Matematik",
		"title":   "5A ödevi",
		"dueDate": "2026-06-20",
	})
	if class5Rec.Code != http.StatusCreated {
		t.Fatalf("create class-5a homework status = %d, body = %s", class5Rec.Code, class5Rec.Body.String())
	}
	class5 := decodeData[struct {
		ID string `json:"id"`
	}](t, class5Rec)

	class6Rec := server.request(http.MethodPost, "/api/v1/homework/assignments", teacherToken, map[string]any{
		"classId": "class-6b",
		"course":  "Matematik",
		"title":   "6B ödevi",
		"dueDate": "2026-06-20",
	})
	if class6Rec.Code != http.StatusCreated {
		t.Fatalf("create class-6b homework status = %d, body = %s", class6Rec.Code, class6Rec.Body.String())
	}
	class6 := decodeData[struct {
		ID string `json:"id"`
	}](t, class6Rec)

	listRec := server.request(http.MethodGet, "/api/v1/homework/assignments?studentId=student-2", guardianToken, nil)
	if listRec.Code != http.StatusOK {
		t.Fatalf("guardian own student list status = %d, body = %s", listRec.Code, listRec.Body.String())
	}
	items := decodeData[[]struct {
		ID      string `json:"id"`
		ClassID string `json:"classId"`
	}](t, listRec)
	if len(items) != 1 || items[0].ID != class5.ID || items[0].ClassID != "class-5a" {
		t.Fatalf("guardian list should include only linked student's class homework, got %+v", items)
	}

	getOwnRec := server.request(http.MethodGet, "/api/v1/homework/assignments/"+class5.ID+"?studentId=student-2", guardianToken, nil)
	if getOwnRec.Code != http.StatusOK {
		t.Fatalf("guardian own student get status = %d, body = %s", getOwnRec.Code, getOwnRec.Body.String())
	}

	submitOwnRec := server.request(http.MethodPost, "/api/v1/homework/assignments/"+class5.ID+"/submit", guardianToken, map[string]any{
		"studentId": "student-2",
		"content":   "Tamamlandı",
	})
	if submitOwnRec.Code != http.StatusCreated {
		t.Fatalf("guardian own student submit status = %d, body = %s", submitOwnRec.Code, submitOwnRec.Body.String())
	}

	foreignListRec := server.request(http.MethodGet, "/api/v1/homework/assignments?studentId=student-1", guardianToken, nil)
	if foreignListRec.Code != http.StatusForbidden {
		t.Fatalf("guardian foreign student list status = %d, want %d, body = %s", foreignListRec.Code, http.StatusForbidden, foreignListRec.Body.String())
	}

	getWrongClassRec := server.request(http.MethodGet, "/api/v1/homework/assignments/"+class6.ID+"?studentId=student-2", guardianToken, nil)
	if getWrongClassRec.Code != http.StatusForbidden {
		t.Fatalf("guardian wrong class get status = %d, want %d, body = %s", getWrongClassRec.Code, http.StatusForbidden, getWrongClassRec.Body.String())
	}

	submitWrongClassRec := server.request(http.MethodPost, "/api/v1/homework/assignments/"+class6.ID+"/submit", guardianToken, map[string]any{
		"studentId": "student-2",
		"content":   "Yanlış sınıf",
	})
	if submitWrongClassRec.Code != http.StatusForbidden {
		t.Fatalf("guardian wrong class submit status = %d, want %d, body = %s", submitWrongClassRec.Code, http.StatusForbidden, submitWrongClassRec.Body.String())
	}

	submitForeignStudentRec := server.request(http.MethodPost, "/api/v1/homework/assignments/"+class5.ID+"/submit", guardianToken, map[string]any{
		"studentId": "student-1",
		"content":   "Başkasının ödevi",
	})
	if submitForeignStudentRec.Code != http.StatusForbidden {
		t.Fatalf("guardian foreign student submit status = %d, want %d, body = %s", submitForeignStudentRec.Code, http.StatusForbidden, submitForeignStudentRec.Body.String())
	}
}
