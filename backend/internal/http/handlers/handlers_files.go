package handlers

import (
	"context"
	"errors"
	"io"
	"net/http"
	"os"
	"strconv"
	"strings"

	"ots/backend/internal/domain/identity"
	"ots/backend/internal/platform/httpx"
	"ots/backend/internal/platform/pdf"
	"ots/backend/internal/platform/storage"
)

var allowedUploadCategories = map[string]struct{}{
	"profile":       {},
	"guidance":      {},
	"announcement":  {},
	"support":       {},
	"studentimport": {},
	"homework":      {},
	"student":       {},
	"report":        {},
}

var allowedResourceTypes = map[string]struct{}{
	"profile":             {},
	"guidance_case":       {},
	"announcement":        {},
	"support_ticket":      {},
	"student_import_job":  {},
	"homework_assignment": {},
	"homework_submission": {},
	"student":             {},
	"student_report":      {},
	"billing_account":     {},
	"service_trip":        {},
}

func (h *Handler) registerFileRoutes(mux *http.ServeMux) {
	mux.HandleFunc("GET /api/v1/files", h.listFiles)
	mux.HandleFunc("POST /api/v1/files/upload", h.uploadFile)
	mux.HandleFunc("GET /api/v1/files/public/{key...}", h.getPublicFile)
	mux.HandleFunc("GET /api/v1/files/meta/{key...}", h.getFileMeta)
	mux.HandleFunc("GET /api/v1/files/{key...}", h.getFile)
	mux.HandleFunc("POST /api/v1/reports/guidance-note-pdf", h.generateGuidanceNotePDF)
	mux.HandleFunc("POST /api/v1/reports/progress-report-pdf", h.generateProgressReportPDF)
	mux.HandleFunc("POST /api/v1/reports/attendance", h.generateAttendanceReportPDF)
	mux.HandleFunc("POST /api/v1/reports/billing-receipt", h.generateBillingReceiptPDF)
	mux.HandleFunc("POST /api/v1/reports/guidance-case-summary", h.generateGuidanceCaseSummaryPDF)
	mux.HandleFunc("POST /api/v1/reports/student-development", h.generateStudentDevelopmentReportPDF)
	mux.HandleFunc("POST /api/v1/reports/service-trip", h.generateServiceTripReportPDF)
}

func (h *Handler) uploadFile(w http.ResponseWriter, r *http.Request) {
	if h.fileStorage == nil {
		httpx.WriteError(w, http.StatusServiceUnavailable, "FILE_STORAGE_DISABLED", "Dosya servisi aktif değil.", nil)
		return
	}

	principal, ok := requirePrincipal(w, r)
	if !ok {
		return
	}

	maxBytes := h.fileStorage.MaxUploadBytes()
	if err := r.ParseMultipartForm(maxBytes); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "INVALID_MULTIPART", "Dosya yükleme verisi okunamadı.", nil)
		return
	}
	category := normalizeUploadCategory(r.FormValue("category"))
	if !isAllowedUploadCategory(category) {
		httpx.WriteError(w, http.StatusBadRequest, "INVALID_UPLOAD_CATEGORY", "Dosya kategorisi geçersiz.", nil)
		return
	}
	resourceType := normalizeResourceType(r.FormValue("resourceType"))
	if !isAllowedResourceType(resourceType) {
		httpx.WriteError(w, http.StatusBadRequest, "INVALID_RESOURCE_TYPE", "resourceType geçersiz.", nil)
		return
	}
	resourceID := strings.TrimSpace(r.FormValue("resourceId"))
	if resourceID == "" {
		httpx.WriteError(w, http.StatusBadRequest, "VALIDATION_ERROR", "resourceId zorunludur.", nil)
		return
	}
	if resourceType == "profile" && resourceID != principal.UserID && principal.Role != identity.RolePrincipal && principal.Role != identity.RoleSystemAdmin {
		httpx.WriteError(w, http.StatusForbidden, "FORBIDDEN", "Profil görseli için yetkiniz yok.", nil)
		return
	}
	if !h.canUploadFileResource(r.Context(), principal, resourceType, resourceID) {
		httpx.WriteError(w, http.StatusForbidden, "FORBIDDEN", "Bu kaynak için dosya yükleme yetkiniz yok.", nil)
		return
	}

	uploaded, header, err := r.FormFile("file")
	if err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "FILE_REQUIRED", "`file` alanı zorunludur.", nil)
		return
	}
	defer uploaded.Close()

	content, err := io.ReadAll(io.LimitReader(uploaded, maxBytes+1))
	if err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "FILE_READ_FAILED", "Dosya okunamadı.", nil)
		return
	}
	if int64(len(content)) > maxBytes {
		httpx.WriteError(w, http.StatusRequestEntityTooLarge, "FILE_TOO_LARGE", "Dosya boyutu sınırı aşıldı.", nil)
		return
	}

	meta, err := h.fileStorage.Save(r.Context(), storage.SaveInput{
		TenantID:     principal.TenantID,
		Category:     category,
		FileName:     header.Filename,
		ContentType:  header.Header.Get("Content-Type"),
		ResourceType: resourceType,
		ResourceID:   resourceID,
		UploadedBy:   principal.UserID,
		Content:      content,
	})
	if err != nil {
		if errors.Is(err, storage.ErrUnsupportedContentType) {
			httpx.WriteError(w, http.StatusBadRequest, "UNSUPPORTED_FILE_TYPE", "Desteklenmeyen dosya tipi.", nil)
			return
		}
		if errors.Is(err, storage.ErrExtensionMismatch) {
			httpx.WriteError(w, http.StatusBadRequest, "EXTENSION_MISMATCH", "Dosya uzantısı içerikle eşleşmiyor.", nil)
			return
		}
		if errors.Is(err, storage.ErrFileTooLarge) {
			httpx.WriteError(w, http.StatusRequestEntityTooLarge, "FILE_TOO_LARGE", "Dosya boyutu sınırı aşıldı.", nil)
			return
		}
		httpx.WriteError(w, http.StatusBadRequest, "FILE_SAVE_FAILED", "Dosya kaydedilemedi.", nil)
		return
	}

	httpx.WriteJSON(w, http.StatusCreated, meta, nil)
}

func (h *Handler) getFile(w http.ResponseWriter, r *http.Request) {
	if h.fileStorage == nil {
		httpx.WriteError(w, http.StatusServiceUnavailable, "FILE_STORAGE_DISABLED", "Dosya servisi aktif değil.", nil)
		return
	}

	key := strings.TrimSpace(r.PathValue("key"))
	if key == "" {
		httpx.WriteError(w, http.StatusNotFound, "FILE_NOT_FOUND", "Dosya bulunamadı.", nil)
		return
	}
	principal, ok := requirePrincipal(w, r)
	if !ok {
		return
	}
	if h.fileStorage.KeyTenantID(key) != principal.TenantID {
		httpx.WriteError(w, http.StatusForbidden, "FORBIDDEN", "Dosyaya erişim yetkiniz yok.", nil)
		return
	}
	meta, found, err := h.fileStorage.Metadata(r.Context(), key)
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "FILE_METADATA_FAILED", "Dosya metadata alınamadı.", nil)
		return
	}
	if !found {
		httpx.WriteError(w, http.StatusNotFound, "FILE_NOT_FOUND", "Dosya bulunamadı.", nil)
		return
	}
	if !h.canReadFileResource(r.Context(), principal, meta) {
		httpx.WriteError(w, http.StatusForbidden, "FORBIDDEN", "Bu dosyayı görüntüleme yetkiniz yok.", nil)
		return
	}

	filePath, err := h.fileStorage.ResolvePath(key)
	if err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "INVALID_FILE_KEY", "Dosya anahtarı geçersiz.", nil)
		return
	}

	if _, statErr := os.Stat(filePath); statErr != nil {
		if errors.Is(statErr, os.ErrNotExist) {
			httpx.WriteError(w, http.StatusNotFound, "FILE_NOT_FOUND", "Dosya bulunamadı.", nil)
			return
		}
		httpx.WriteError(w, http.StatusInternalServerError, "FILE_READ_FAILED", "Dosya okunamadı.", nil)
		return
	}

	http.ServeFile(w, r, filePath)
}

func (h *Handler) getPublicFile(w http.ResponseWriter, r *http.Request) {
	if h.fileStorage == nil {
		httpx.WriteError(w, http.StatusServiceUnavailable, "FILE_STORAGE_DISABLED", "Dosya servisi aktif değil.", nil)
		return
	}

	key := strings.TrimSpace(r.PathValue("key"))
	if key == "" {
		httpx.WriteError(w, http.StatusNotFound, "FILE_NOT_FOUND", "Dosya bulunamadı.", nil)
		return
	}
	meta, found, err := h.fileStorage.Metadata(r.Context(), key)
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "FILE_METADATA_FAILED", "Dosya metadata alınamadı.", nil)
		return
	}
	if !found || meta.Category != "profile" || meta.ResourceType != "profile" || !strings.HasPrefix(meta.ContentType, "image/") {
		httpx.WriteError(w, http.StatusNotFound, "FILE_NOT_FOUND", "Dosya bulunamadı.", nil)
		return
	}

	filePath, err := h.fileStorage.ResolvePath(key)
	if err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "INVALID_FILE_KEY", "Dosya anahtarı geçersiz.", nil)
		return
	}
	if _, statErr := os.Stat(filePath); statErr != nil {
		if errors.Is(statErr, os.ErrNotExist) {
			httpx.WriteError(w, http.StatusNotFound, "FILE_NOT_FOUND", "Dosya bulunamadı.", nil)
			return
		}
		httpx.WriteError(w, http.StatusInternalServerError, "FILE_READ_FAILED", "Dosya okunamadı.", nil)
		return
	}
	http.ServeFile(w, r, filePath)
}

func (h *Handler) getFileMeta(w http.ResponseWriter, r *http.Request) {
	if h.fileStorage == nil {
		httpx.WriteError(w, http.StatusServiceUnavailable, "FILE_STORAGE_DISABLED", "Dosya servisi aktif değil.", nil)
		return
	}

	key := strings.TrimSpace(r.PathValue("key"))
	if key == "" {
		httpx.WriteError(w, http.StatusNotFound, "FILE_NOT_FOUND", "Dosya bulunamadı.", nil)
		return
	}
	principal, ok := requirePrincipal(w, r)
	if !ok {
		return
	}
	if h.fileStorage.KeyTenantID(key) != principal.TenantID {
		httpx.WriteError(w, http.StatusForbidden, "FORBIDDEN", "Dosya metadata erişim yetkiniz yok.", nil)
		return
	}

	meta, found, err := h.fileStorage.Metadata(r.Context(), key)
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "FILE_METADATA_FAILED", "Dosya metadata alınamadı.", nil)
		return
	}
	if !found {
		httpx.WriteError(w, http.StatusNotFound, "FILE_NOT_FOUND", "Dosya bulunamadı.", nil)
		return
	}
	if !h.canReadFileResource(r.Context(), principal, meta) {
		httpx.WriteError(w, http.StatusForbidden, "FORBIDDEN", "Bu dosyayı görüntüleme yetkiniz yok.", nil)
		return
	}
	httpx.WriteJSON(w, http.StatusOK, meta, nil)
}

func (h *Handler) listFiles(w http.ResponseWriter, r *http.Request) {
	if h.fileStorage == nil {
		httpx.WriteError(w, http.StatusServiceUnavailable, "FILE_STORAGE_DISABLED", "Dosya servisi aktif değil.", nil)
		return
	}
	principal, ok := requirePrincipal(w, r)
	if !ok {
		return
	}
	resourceType := strings.TrimSpace(r.URL.Query().Get("resourceType"))
	resourceID := strings.TrimSpace(r.URL.Query().Get("resourceId"))
	if resourceType == "" || resourceID == "" {
		httpx.WriteError(w, http.StatusBadRequest, "VALIDATION_ERROR", "resourceType ve resourceId zorunludur.", nil)
		return
	}
	resourceType = normalizeResourceType(resourceType)
	if !isAllowedResourceType(resourceType) {
		httpx.WriteError(w, http.StatusBadRequest, "INVALID_RESOURCE_TYPE", "resourceType geçersiz.", nil)
		return
	}

	category := strings.TrimSpace(r.URL.Query().Get("category"))
	if !h.canReadFileResource(r.Context(), principal, storage.FileMeta{
		Category:     normalizeUploadCategory(category),
		ResourceType: resourceType,
		ResourceID:   resourceID,
	}) {
		httpx.WriteError(w, http.StatusForbidden, "FORBIDDEN", "Bu kaynağın dosyalarını görüntüleme yetkiniz yok.", nil)
		return
	}
	offset := parseIntParam(r.URL.Query().Get("offset"), 0, 0, 100000)
	limit := parseIntParam(r.URL.Query().Get("limit"), 50, 1, 1000)

	items, err := h.fileStorage.ListByResourceFiltered(r.Context(), principal.TenantID, resourceType, resourceID, storage.ListFileFilter{
		Category: category,
		Offset:   offset,
		Limit:    limit,
	})
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "FILE_LIST_FAILED", "Dosya listesi alınamadı.", nil)
		return
	}
	httpx.WriteJSON(w, http.StatusOK, items, nil)
}

func normalizeUploadCategory(value string) string {
	return strings.ToLower(strings.TrimSpace(value))
}

func isAllowedUploadCategory(category string) bool {
	_, ok := allowedUploadCategories[category]
	return ok
}

func normalizeResourceType(value string) string {
	return strings.ToLower(strings.TrimSpace(value))
}

func isAllowedResourceType(resourceType string) bool {
	_, ok := allowedResourceTypes[resourceType]
	return ok
}

func parseIntParam(param string, defaultVal, min, max int) int {
	param = strings.TrimSpace(param)
	if param == "" {
		return defaultVal
	}
	val, err := strconv.Atoi(param)
	if err != nil {
		return defaultVal
	}
	if val < min {
		return min
	}
	if val > max {
		return max
	}
	return val
}

func (h *Handler) canUploadFileResource(ctx context.Context, principal identity.Principal, resourceType, resourceID string) bool {
	resourceType = strings.TrimSpace(resourceType)
	resourceID = strings.TrimSpace(resourceID)
	switch resourceType {
	case "profile":
		return resourceID == principal.UserID || principal.Role == identity.RolePrincipal || principal.Role == identity.RoleSystemAdmin
	case "announcement":
		return principal.Role == identity.RolePrincipal || principal.Role == identity.RoleSystemAdmin
	case "guidance_case":
		return principal.Role == identity.RoleGuidance && h.canReadGuidanceCaseFile(ctx, principal, resourceID)
	case "student", "student_import_job":
		return principal.Role == identity.RolePrincipal || principal.Role == identity.RoleSystemAdmin
	case "student_report":
		return h.canViewStudentAttendanceSummary(ctx, principal, resourceID)
	case "billing_account", "service_trip":
		return principal.Role == identity.RolePrincipal || principal.Role == identity.RoleSystemAdmin
	case "homework_assignment":
		if principal.Role == identity.RolePrincipal || principal.Role == identity.RoleSystemAdmin {
			return true
		}
		return principal.Role == identity.RoleTeacher && h.canReadHomeworkAssignmentFile(ctx, principal, resourceID)
	case "homework_submission":
		return principal.Role == identity.RoleGuardian || principal.Role == identity.RolePrincipal || principal.Role == identity.RoleSystemAdmin || hasStudentScope(ctx, resourceID)
	case "support_ticket":
		return true
	default:
		return principal.Role == identity.RolePrincipal || principal.Role == identity.RoleSystemAdmin
	}
}

func (h *Handler) canReadFileResource(ctx context.Context, principal identity.Principal, meta storage.FileMeta) bool {
	if principal.Role == identity.RolePrincipal || principal.Role == identity.RoleSystemAdmin {
		return true
	}
	switch strings.TrimSpace(meta.ResourceType) {
	case "profile":
		return meta.ResourceID == principal.UserID
	case "announcement":
		return h.canReadAnnouncementFile(ctx, principal, meta.ResourceID)
	case "guidance_case":
		return principal.Role == identity.RoleGuidance && h.canReadGuidanceCaseFile(ctx, principal, meta.ResourceID)
	case "student", "student_import_job":
		return false
	case "student_report":
		return h.canViewStudentAttendanceSummary(ctx, principal, meta.ResourceID)
	case "billing_account", "service_trip":
		return false
	case "homework_assignment":
		return principal.Role == identity.RoleTeacher && h.canReadHomeworkAssignmentFile(ctx, principal, meta.ResourceID)
	case "homework_submission":
		return meta.UploadedBy == principal.UserID || hasStudentScope(ctx, meta.ResourceID)
	case "support_ticket":
		return true
	default:
		return false
	}
}

func (h *Handler) canReadAnnouncementFile(ctx context.Context, principal identity.Principal, announcementID string) bool {
	if h.announcements == nil || strings.TrimSpace(announcementID) == "" {
		return false
	}
	_, err := h.announcements.Get(ctx, principal.TenantID, principal.UserID, announcementID, false)
	return err == nil
}

func (h *Handler) canReadGuidanceCaseFile(ctx context.Context, principal identity.Principal, caseID string) bool {
	if h.guidance == nil || strings.TrimSpace(caseID) == "" {
		return false
	}
	_, err := h.guidance.GetCase(ctx, principal.TenantID, principal.UserID, string(principal.Role), caseID)
	return err == nil
}

func (h *Handler) canReadHomeworkAssignmentFile(ctx context.Context, principal identity.Principal, assignmentID string) bool {
	if h.homework == nil || strings.TrimSpace(assignmentID) == "" {
		return false
	}
	item, err := h.homework.GetAssignment(ctx, principal.TenantID, assignmentID)
	return err == nil && item.CreatedBy == principal.UserID
}

func (h *Handler) generateGuidanceNotePDF(w http.ResponseWriter, r *http.Request) {
	if h.fileStorage == nil {
		httpx.WriteError(w, http.StatusServiceUnavailable, "FILE_STORAGE_DISABLED", "Dosya servisi aktif değil.", nil)
		return
	}

	principal, ok := requirePrincipal(w, r)
	if !ok {
		return
	}

	if err := r.ParseForm(); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "INVALID_REQUEST", "İstek verisi okunamadı.", nil)
		return
	}

	input := pdf.GuidanceNoteInput{
		StudentName:     strings.TrimSpace(r.FormValue("studentName")),
		StudentID:       strings.TrimSpace(r.FormValue("studentId")),
		SchoolName:      strings.TrimSpace(r.FormValue("schoolName")),
		CounselorName:   strings.TrimSpace(r.FormValue("counselorName")),
		Title:           strings.TrimSpace(r.FormValue("title")),
		Content:         strings.TrimSpace(r.FormValue("content")),
		Confidentiality: strings.TrimSpace(r.FormValue("confidentiality")),
	}

	if input.StudentName == "" || input.StudentID == "" || input.Content == "" {
		httpx.WriteError(w, http.StatusBadRequest, "VALIDATION_ERROR", "studentName, studentId, content zorunludur.", nil)
		return
	}

	if input.SchoolName == "" {
		input.SchoolName = "Okul"
	}
	if input.Confidentiality == "" {
		input.Confidentiality = "staff"
	}

	generator := pdf.NewReportGenerator()
	pdfContent, err := generator.GenerateGuidanceNotePDF(input)
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "PDF_GENERATION_FAILED", "PDF oluşturma başarısız.", nil)
		return
	}

	// Save PDF to file storage
	meta, err := h.fileStorage.Save(r.Context(), storage.SaveInput{
		TenantID:     principal.TenantID,
		Category:     "guidance",
		FileName:     input.StudentName + "_rehberlik_notu.pdf",
		ContentType:  "application/pdf",
		ResourceType: "guidance_case",
		ResourceID:   strings.TrimSpace(r.FormValue("guidanceCaseId")),
		UploadedBy:   principal.UserID,
		Content:      pdfContent,
	})
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "PDF_SAVE_FAILED", "PDF kaydedilemedi.", nil)
		return
	}

	httpx.WriteJSON(w, http.StatusCreated, map[string]interface{}{
		"fileKey": meta.Key,
		"fileUrl": meta.URL,
		"size":    len(pdfContent),
	}, nil)
}

func (h *Handler) generateProgressReportPDF(w http.ResponseWriter, r *http.Request) {
	if h.fileStorage == nil {
		httpx.WriteError(w, http.StatusServiceUnavailable, "FILE_STORAGE_DISABLED", "Dosya servisi aktif değil.", nil)
		return
	}

	principal, ok := requirePrincipal(w, r)
	if !ok {
		return
	}

	if err := r.ParseForm(); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "INVALID_REQUEST", "İstek verisi okunamadı.", nil)
		return
	}

	input := pdf.StudentProgressInput{
		StudentName:   strings.TrimSpace(r.FormValue("studentName")),
		StudentID:     strings.TrimSpace(r.FormValue("studentId")),
		SchoolName:    strings.TrimSpace(r.FormValue("schoolName")),
		BehaviorNotes: strings.TrimSpace(r.FormValue("behaviorNotes")),
		Summary:       strings.TrimSpace(r.FormValue("summary")),
	}

	if input.StudentName == "" || input.StudentID == "" {
		httpx.WriteError(w, http.StatusBadRequest, "VALIDATION_ERROR", "studentName, studentId zorunludur.", nil)
		return
	}

	if input.SchoolName == "" {
		input.SchoolName = "Okul"
	}

	generator := pdf.NewReportGenerator()
	pdfContent, err := generator.GenerateProgressReportPDF(input)
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "PDF_GENERATION_FAILED", "PDF oluşturma başarısız.", nil)
		return
	}

	// Save PDF to file storage
	meta, err := h.fileStorage.Save(r.Context(), storage.SaveInput{
		TenantID:     principal.TenantID,
		Category:     "guidance",
		FileName:     input.StudentName + "_basari_raporu.pdf",
		ContentType:  "application/pdf",
		ResourceType: "student_import_job",
		ResourceID:   strings.TrimSpace(r.FormValue("studentImportJobId")),
		UploadedBy:   principal.UserID,
		Content:      pdfContent,
	})
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "PDF_SAVE_FAILED", "PDF kaydedilemedi.", nil)
		return
	}

	httpx.WriteJSON(w, http.StatusCreated, map[string]interface{}{
		"fileKey": meta.Key,
		"fileUrl": meta.URL,
		"size":    len(pdfContent),
	}, nil)
}
