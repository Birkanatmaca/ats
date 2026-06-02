package handlers

import (
	"errors"
	"net/http"

	studentimportapp "ots/backend/internal/app/studentimport"
	studentimportdomain "ots/backend/internal/domain/studentimport"
	"ots/backend/internal/domain/identity"
	"ots/backend/internal/platform/httpx"
)

func (h *Handler) registerStudentImportRoutes(mux *http.ServeMux) {
	mux.HandleFunc("GET /api/v1/imports/students", h.listStudentImportJobs)
	mux.HandleFunc("POST /api/v1/imports/students", h.createStudentImportJob)
	mux.HandleFunc("GET /api/v1/imports/students/{jobId}", h.getStudentImportJob)
	mux.HandleFunc("GET /api/v1/imports/students/{jobId}/rows", h.listStudentImportRows)
	mux.HandleFunc("PATCH /api/v1/imports/students/{jobId}/rows/{rowId}", h.updateStudentImportRow)
	mux.HandleFunc("POST /api/v1/imports/students/{jobId}/validate", h.validateStudentImportJob)
	mux.HandleFunc("POST /api/v1/imports/students/{jobId}/commit", h.commitStudentImportJob)
	mux.HandleFunc("POST /api/v1/imports/students/{jobId}/cancel", h.cancelStudentImportJob)
	mux.HandleFunc("POST /api/v1/imports/students/{jobId}/rollback", h.rollbackStudentImportJob)
	mux.HandleFunc("GET /api/v1/imports/students/{jobId}/preview", h.previewStudentImportJob)
}

func (h *Handler) listStudentImportJobs(w http.ResponseWriter, r *http.Request) {
	principal, ok := requirePrincipalRole(w, r, identity.RolePrincipal, identity.RoleSystemAdmin, identity.RoleSuperAdmin)
	if !ok {
		return
	}
	items, err := h.studentImport.ListJobs(r.Context(), principal.TenantID)
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "STUDENT_IMPORT_LIST_FAILED", "Import geçmişi okunamadı.", nil)
		return
	}
	httpx.WriteJSON(w, http.StatusOK, items, nil)
}

func (h *Handler) createStudentImportJob(w http.ResponseWriter, r *http.Request) {
	principal, ok := requirePrincipalRole(w, r, identity.RolePrincipal, identity.RoleSystemAdmin, identity.RoleSuperAdmin)
	if !ok {
		return
	}
	var input studentimportdomain.CreateJobInput
	if err := httpx.DecodeJSON(r, &input); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Import verisi okunamadı.", nil)
		return
	}
	created, err := h.studentImport.CreateJob(r.Context(), principal.TenantID, principal.UserID, input)
	if errors.Is(err, studentimportapp.ErrInvalidInput) {
		httpx.WriteError(w, http.StatusBadRequest, "VALIDATION_ERROR", "En az bir satır içeren import dosyası gerekir.", nil)
		return
	}
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "STUDENT_IMPORT_CREATE_FAILED", "Import işi oluşturulamadı.", nil)
		return
	}
	httpx.WriteJSON(w, http.StatusCreated, created, nil)
}

func (h *Handler) getStudentImportJob(w http.ResponseWriter, r *http.Request) {
	principal, ok := requirePrincipalRole(w, r, identity.RolePrincipal, identity.RoleSystemAdmin, identity.RoleSuperAdmin)
	if !ok {
		return
	}
	item, err := h.studentImport.GetJob(r.Context(), principal.TenantID, r.PathValue("jobId"))
	if errors.Is(err, studentimportapp.ErrNotFound) {
		httpx.WriteError(w, http.StatusNotFound, "STUDENT_IMPORT_NOT_FOUND", "Import işi bulunamadı.", nil)
		return
	}
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "STUDENT_IMPORT_LOOKUP_FAILED", "Import işi okunamadı.", nil)
		return
	}
	httpx.WriteJSON(w, http.StatusOK, item, nil)
}

func (h *Handler) listStudentImportRows(w http.ResponseWriter, r *http.Request) {
	principal, ok := requirePrincipalRole(w, r, identity.RolePrincipal, identity.RoleSystemAdmin, identity.RoleSuperAdmin)
	if !ok {
		return
	}
	items, err := h.studentImport.ListRows(r.Context(), principal.TenantID, r.PathValue("jobId"))
	if errors.Is(err, studentimportapp.ErrNotFound) {
		httpx.WriteError(w, http.StatusNotFound, "STUDENT_IMPORT_NOT_FOUND", "Import işi bulunamadı.", nil)
		return
	}
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "STUDENT_IMPORT_ROWS_FAILED", "Import satırları okunamadı.", nil)
		return
	}
	httpx.WriteJSON(w, http.StatusOK, items, nil)
}

func (h *Handler) updateStudentImportRow(w http.ResponseWriter, r *http.Request) {
	principal, ok := requirePrincipalRole(w, r, identity.RolePrincipal, identity.RoleSystemAdmin, identity.RoleSuperAdmin)
	if !ok {
		return
	}
	var input studentimportdomain.UpdateRowInput
	if err := httpx.DecodeJSON(r, &input); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Satır güncellemesi okunamadı.", nil)
		return
	}
	updated, err := h.studentImport.UpdateRow(r.Context(), principal.TenantID, r.PathValue("jobId"), r.PathValue("rowId"), input)
	if errors.Is(err, studentimportapp.ErrNotFound) {
		httpx.WriteError(w, http.StatusNotFound, "STUDENT_IMPORT_ROW_NOT_FOUND", "Import satırı bulunamadı.", nil)
		return
	}
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "STUDENT_IMPORT_ROW_UPDATE_FAILED", "Import satırı güncellenemedi.", nil)
		return
	}
	httpx.WriteJSON(w, http.StatusOK, updated, nil)
}

func (h *Handler) validateStudentImportJob(w http.ResponseWriter, r *http.Request) {
	principal, ok := requirePrincipalRole(w, r, identity.RolePrincipal, identity.RoleSystemAdmin, identity.RoleSuperAdmin)
	if !ok {
		return
	}
	job, err := h.studentImport.ValidateJob(r.Context(), principal.TenantID, r.PathValue("jobId"))
	if errors.Is(err, studentimportapp.ErrNotFound) {
		httpx.WriteError(w, http.StatusNotFound, "STUDENT_IMPORT_NOT_FOUND", "Import işi bulunamadı.", nil)
		return
	}
	if errors.Is(err, studentimportapp.ErrInvalidState) {
		httpx.WriteError(w, http.StatusConflict, "STUDENT_IMPORT_INVALID_STATE", "Import işi doğrulanamaz.", nil)
		return
	}
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "STUDENT_IMPORT_VALIDATE_FAILED", "Import doğrulaması başarısız.", nil)
		return
	}
	httpx.WriteJSON(w, http.StatusOK, job, nil)
}

func (h *Handler) previewStudentImportJob(w http.ResponseWriter, r *http.Request) {
	principal, ok := requirePrincipalRole(w, r, identity.RolePrincipal, identity.RoleSystemAdmin, identity.RoleSuperAdmin)
	if !ok {
		return
	}
	preview, err := h.studentImport.CommitPreview(r.Context(), principal.TenantID, r.PathValue("jobId"))
	if errors.Is(err, studentimportapp.ErrNotFound) {
		httpx.WriteError(w, http.StatusNotFound, "STUDENT_IMPORT_NOT_FOUND", "Import işi bulunamadı.", nil)
		return
	}
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "STUDENT_IMPORT_PREVIEW_FAILED", "Import özeti okunamadı.", nil)
		return
	}
	httpx.WriteJSON(w, http.StatusOK, preview, nil)
}

func (h *Handler) commitStudentImportJob(w http.ResponseWriter, r *http.Request) {
	principal, ok := requirePrincipalRole(w, r, identity.RolePrincipal, identity.RoleSystemAdmin, identity.RoleSuperAdmin)
	if !ok {
		return
	}
	result, err := h.studentImport.Commit(r.Context(), principal.TenantID, principal.UserID, r.PathValue("jobId"))
	if errors.Is(err, studentimportapp.ErrNotFound) {
		httpx.WriteError(w, http.StatusNotFound, "STUDENT_IMPORT_NOT_FOUND", "Import işi bulunamadı.", nil)
		return
	}
	if errors.Is(err, studentimportapp.ErrInvalidState) {
		httpx.WriteError(w, http.StatusConflict, "STUDENT_IMPORT_INVALID_STATE", "Import işi commit edilemez.", nil)
		return
	}
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "STUDENT_IMPORT_COMMIT_FAILED", "Import commit başarısız.", nil)
		return
	}
	httpx.WriteJSON(w, http.StatusOK, result, nil)
}

func (h *Handler) cancelStudentImportJob(w http.ResponseWriter, r *http.Request) {
	principal, ok := requirePrincipalRole(w, r, identity.RolePrincipal, identity.RoleSystemAdmin, identity.RoleSuperAdmin)
	if !ok {
		return
	}
	job, err := h.studentImport.Cancel(r.Context(), principal.TenantID, principal.UserID, r.PathValue("jobId"))
	if errors.Is(err, studentimportapp.ErrNotFound) {
		httpx.WriteError(w, http.StatusNotFound, "STUDENT_IMPORT_NOT_FOUND", "Import işi bulunamadı.", nil)
		return
	}
	if errors.Is(err, studentimportapp.ErrInvalidState) {
		httpx.WriteError(w, http.StatusConflict, "STUDENT_IMPORT_INVALID_STATE", "Import işi iptal edilemez.", nil)
		return
	}
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "STUDENT_IMPORT_CANCEL_FAILED", "Import iptali başarısız.", nil)
		return
	}
	httpx.WriteJSON(w, http.StatusOK, job, nil)
}

func (h *Handler) rollbackStudentImportJob(w http.ResponseWriter, r *http.Request) {
	principal, ok := requirePrincipalRole(w, r, identity.RolePrincipal, identity.RoleSystemAdmin, identity.RoleSuperAdmin)
	if !ok {
		return
	}
	job, err := h.studentImport.Rollback(r.Context(), principal.TenantID, principal.UserID, r.PathValue("jobId"))
	if errors.Is(err, studentimportapp.ErrNotFound) {
		httpx.WriteError(w, http.StatusNotFound, "STUDENT_IMPORT_NOT_FOUND", "Import işi bulunamadı.", nil)
		return
	}
	if errors.Is(err, studentimportapp.ErrInvalidState) {
		httpx.WriteError(w, http.StatusConflict, "STUDENT_IMPORT_INVALID_STATE", "Import geri alınamaz.", nil)
		return
	}
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "STUDENT_IMPORT_ROLLBACK_FAILED", "Import geri alma başarısız.", nil)
		return
	}
	httpx.WriteJSON(w, http.StatusOK, job, nil)
}
