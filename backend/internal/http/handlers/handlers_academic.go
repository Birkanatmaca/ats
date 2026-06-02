package handlers

import (
	"errors"
	"net/http"

	academicapp "ots/backend/internal/app/academic"
	academicdomain "ots/backend/internal/domain/academic"
	"ots/backend/internal/domain/identity"
	"ots/backend/internal/platform/httpx"
)

func (h *Handler) registerAcademicRoutes(mux *http.ServeMux) {
	mux.HandleFunc("GET /api/v1/academic/assessments", h.listAcademicAssessments)
	mux.HandleFunc("POST /api/v1/academic/assessments", h.createAcademicAssessment)
	mux.HandleFunc("GET /api/v1/academic/assessments/{id}", h.getAcademicAssessment)
	mux.HandleFunc("PATCH /api/v1/academic/assessments/{id}", h.updateAcademicAssessment)
	mux.HandleFunc("DELETE /api/v1/academic/assessments/{id}", h.deleteAcademicAssessment)
	mux.HandleFunc("GET /api/v1/academic/assessments/{id}/results", h.listAcademicResults)
	mux.HandleFunc("POST /api/v1/academic/assessments/{id}/results", h.saveAcademicResults)
	mux.HandleFunc("POST /api/v1/academic/results/import", h.importAcademicResults)
	mux.HandleFunc("GET /api/v1/students/{id}/academic-summary", h.studentAcademicSummary)
	mux.HandleFunc("GET /api/v1/classes/{id}/academic-summary", h.classAcademicSummary)
	mux.HandleFunc("GET /api/v1/guardian/students/{id}/academic-report", h.guardianAcademicReport)
}

func (h *Handler) listAcademicAssessments(w http.ResponseWriter, r *http.Request) {
	principal, ok := requirePrincipalRole(w, r, identity.RoleTeacher, identity.RolePrincipal, identity.RoleGuidance, identity.RoleSystemAdmin)
	if !ok {
		return
	}
	items, err := h.academic.ListAssessments(r.Context(), principal)
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "ACADEMIC_ASSESSMENT_LIST_FAILED", "Akademik ölçme listesi okunamadı.", nil)
		return
	}
	httpx.WriteJSON(w, http.StatusOK, items, nil)
}

func (h *Handler) createAcademicAssessment(w http.ResponseWriter, r *http.Request) {
	principal, ok := requirePrincipalRole(w, r, identity.RoleTeacher, identity.RolePrincipal, identity.RoleSystemAdmin)
	if !ok {
		return
	}
	var input academicdomain.CreateAssessmentInput
	if err := httpx.DecodeJSON(r, &input); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Ölçme bilgisi okunamadı.", nil)
		return
	}
	created, err := h.academic.CreateAssessment(r.Context(), principal, input)
	writeAcademicMutation(w, created, err, http.StatusCreated)
}

func (h *Handler) getAcademicAssessment(w http.ResponseWriter, r *http.Request) {
	principal, ok := requirePrincipalRole(w, r, identity.RoleTeacher, identity.RolePrincipal, identity.RoleGuidance, identity.RoleSystemAdmin)
	if !ok {
		return
	}
	item, err := h.academic.GetAssessment(r.Context(), principal, r.PathValue("id"))
	writeAcademicLookup(w, item, err)
}

func (h *Handler) updateAcademicAssessment(w http.ResponseWriter, r *http.Request) {
	principal, ok := requirePrincipalRole(w, r, identity.RoleTeacher, identity.RolePrincipal, identity.RoleSystemAdmin)
	if !ok {
		return
	}
	var input academicdomain.UpdateAssessmentInput
	if err := httpx.DecodeJSON(r, &input); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Ölçme güncellemesi okunamadı.", nil)
		return
	}
	updated, err := h.academic.UpdateAssessment(r.Context(), principal, r.PathValue("id"), input)
	writeAcademicMutation(w, updated, err, http.StatusOK)
}

func (h *Handler) deleteAcademicAssessment(w http.ResponseWriter, r *http.Request) {
	principal, ok := requirePrincipalRole(w, r, identity.RoleTeacher, identity.RolePrincipal, identity.RoleSystemAdmin)
	if !ok {
		return
	}
	err := h.academic.DeleteAssessment(r.Context(), principal, r.PathValue("id"))
	if errors.Is(err, academicapp.ErrAssessmentNotFound) {
		httpx.WriteError(w, http.StatusNotFound, "ACADEMIC_ASSESSMENT_NOT_FOUND", "Ölçme bulunamadı.", nil)
		return
	}
	if errors.Is(err, academicapp.ErrForbidden) {
		httpx.WriteError(w, http.StatusForbidden, "FORBIDDEN", "Bu ölçmeyi silme yetkiniz yok.", nil)
		return
	}
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "ACADEMIC_ASSESSMENT_DELETE_FAILED", "Ölçme silinemedi.", nil)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *Handler) listAcademicResults(w http.ResponseWriter, r *http.Request) {
	principal, ok := requirePrincipalRole(w, r, identity.RoleTeacher, identity.RolePrincipal, identity.RoleGuidance, identity.RoleSystemAdmin)
	if !ok {
		return
	}
	items, err := h.academic.ListResults(r.Context(), principal, r.PathValue("id"))
	if errors.Is(err, academicapp.ErrAssessmentNotFound) {
		httpx.WriteError(w, http.StatusNotFound, "ACADEMIC_ASSESSMENT_NOT_FOUND", "Ölçme bulunamadı.", nil)
		return
	}
	if errors.Is(err, academicapp.ErrForbidden) {
		httpx.WriteError(w, http.StatusForbidden, "FORBIDDEN", "Bu ölçme sonuçlarını görme yetkiniz yok.", nil)
		return
	}
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "ACADEMIC_RESULT_LIST_FAILED", "Sonuçlar okunamadı.", nil)
		return
	}
	httpx.WriteJSON(w, http.StatusOK, items, nil)
}

func (h *Handler) saveAcademicResults(w http.ResponseWriter, r *http.Request) {
	principal, ok := requirePrincipalRole(w, r, identity.RoleTeacher, identity.RolePrincipal, identity.RoleSystemAdmin)
	if !ok {
		return
	}
	var input academicdomain.SaveResultsInput
	if err := httpx.DecodeJSON(r, &input); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Sonuç verisi okunamadı.", nil)
		return
	}
	items, err := h.academic.SaveResults(r.Context(), principal, r.PathValue("id"), input)
	writeAcademicResults(w, items, err)
}

func (h *Handler) importAcademicResults(w http.ResponseWriter, r *http.Request) {
	principal, ok := requirePrincipalRole(w, r, identity.RoleTeacher, identity.RolePrincipal, identity.RoleSystemAdmin)
	if !ok {
		return
	}
	var input academicdomain.ImportResultsInput
	if err := httpx.DecodeJSON(r, &input); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Import verisi okunamadı.", nil)
		return
	}
	result, err := h.academic.ImportResults(r.Context(), principal, input)
	if errors.Is(err, academicapp.ErrAssessmentNotFound) {
		httpx.WriteError(w, http.StatusNotFound, "ACADEMIC_ASSESSMENT_NOT_FOUND", "Ölçme bulunamadı.", nil)
		return
	}
	if errors.Is(err, academicapp.ErrForbidden) {
		httpx.WriteError(w, http.StatusForbidden, "FORBIDDEN", "Bu ölçmeye sonuç girme yetkiniz yok.", nil)
		return
	}
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "ACADEMIC_IMPORT_FAILED", "Akademik sonuç import edilemedi.", nil)
		return
	}
	httpx.WriteJSON(w, http.StatusOK, result, nil)
}

func (h *Handler) studentAcademicSummary(w http.ResponseWriter, r *http.Request) {
	principal, ok := requirePrincipalRole(w, r, identity.RoleTeacher, identity.RolePrincipal, identity.RoleGuidance, identity.RoleSystemAdmin)
	if !ok {
		return
	}
	summary, err := h.academic.StudentSummary(r.Context(), principal, r.PathValue("id"))
	writeAcademicStudentSummary(w, summary, err)
}

func (h *Handler) classAcademicSummary(w http.ResponseWriter, r *http.Request) {
	principal, ok := requirePrincipalRole(w, r, identity.RoleTeacher, identity.RolePrincipal, identity.RoleGuidance, identity.RoleSystemAdmin)
	if !ok {
		return
	}
	summary, err := h.academic.ClassSummary(r.Context(), principal, r.PathValue("id"))
	if errors.Is(err, academicapp.ErrClassNotFound) {
		httpx.WriteError(w, http.StatusNotFound, "CLASS_NOT_FOUND", "Sınıf bulunamadı.", nil)
		return
	}
	if errors.Is(err, academicapp.ErrForbidden) {
		httpx.WriteError(w, http.StatusForbidden, "FORBIDDEN", "Bu sınıf özetini görme yetkiniz yok.", nil)
		return
	}
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "ACADEMIC_CLASS_SUMMARY_FAILED", "Sınıf akademik özeti okunamadı.", nil)
		return
	}
	httpx.WriteJSON(w, http.StatusOK, summary, nil)
}

func (h *Handler) guardianAcademicReport(w http.ResponseWriter, r *http.Request) {
	principal, ok := requireGuardian(w, r)
	if !ok {
		return
	}
	summary, err := h.academic.GuardianReport(r.Context(), principal, r.PathValue("id"))
	writeAcademicStudentSummary(w, summary, err)
}

func writeAcademicLookup(w http.ResponseWriter, item academicdomain.Assessment, err error) {
	if errors.Is(err, academicapp.ErrAssessmentNotFound) {
		httpx.WriteError(w, http.StatusNotFound, "ACADEMIC_ASSESSMENT_NOT_FOUND", "Ölçme bulunamadı.", nil)
		return
	}
	if errors.Is(err, academicapp.ErrForbidden) {
		httpx.WriteError(w, http.StatusForbidden, "FORBIDDEN", "Bu ölçmeyi görme yetkiniz yok.", nil)
		return
	}
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "ACADEMIC_ASSESSMENT_LOOKUP_FAILED", "Ölçme okunamadı.", nil)
		return
	}
	httpx.WriteJSON(w, http.StatusOK, item, nil)
}

func writeAcademicMutation(w http.ResponseWriter, item academicdomain.Assessment, err error, status int) {
	if errors.Is(err, academicapp.ErrInvalidInput) {
		httpx.WriteError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Ölçme adı, ders, tür, tarih ve maksimum puan zorunludur.", nil)
		return
	}
	if errors.Is(err, academicapp.ErrAssessmentNotFound) {
		httpx.WriteError(w, http.StatusNotFound, "ACADEMIC_ASSESSMENT_NOT_FOUND", "Ölçme bulunamadı.", nil)
		return
	}
	if errors.Is(err, academicapp.ErrForbidden) {
		httpx.WriteError(w, http.StatusForbidden, "FORBIDDEN", "Bu ölçmeyi yönetme yetkiniz yok.", nil)
		return
	}
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "ACADEMIC_ASSESSMENT_SAVE_FAILED", "Ölçme kaydedilemedi.", nil)
		return
	}
	httpx.WriteJSON(w, status, item, nil)
}

func writeAcademicResults(w http.ResponseWriter, items []academicdomain.Result, err error) {
	if errors.Is(err, academicapp.ErrInvalidInput) {
		httpx.WriteError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Sonuç satırlarında öğrenci ve geçerli puan zorunludur.", nil)
		return
	}
	if errors.Is(err, academicapp.ErrAssessmentNotFound) {
		httpx.WriteError(w, http.StatusNotFound, "ACADEMIC_ASSESSMENT_NOT_FOUND", "Ölçme bulunamadı.", nil)
		return
	}
	if errors.Is(err, academicapp.ErrForbidden) {
		httpx.WriteError(w, http.StatusForbidden, "FORBIDDEN", "Bu ölçmeye sonuç girme yetkiniz yok.", nil)
		return
	}
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "ACADEMIC_RESULT_SAVE_FAILED", "Sonuçlar kaydedilemedi.", nil)
		return
	}
	httpx.WriteJSON(w, http.StatusOK, items, nil)
}

func writeAcademicStudentSummary(w http.ResponseWriter, summary academicdomain.StudentAcademicSummary, err error) {
	if errors.Is(err, academicapp.ErrStudentNotFound) {
		httpx.WriteError(w, http.StatusNotFound, "STUDENT_NOT_FOUND", "Öğrenci bulunamadı.", nil)
		return
	}
	if errors.Is(err, academicapp.ErrForbidden) {
		httpx.WriteError(w, http.StatusForbidden, "FORBIDDEN", "Bu öğrenci raporunu görme yetkiniz yok.", nil)
		return
	}
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "ACADEMIC_STUDENT_SUMMARY_FAILED", "Öğrenci akademik özeti okunamadı.", nil)
		return
	}
	httpx.WriteJSON(w, http.StatusOK, summary, nil)
}
