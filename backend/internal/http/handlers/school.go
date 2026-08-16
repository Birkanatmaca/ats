package handlers

import (
	"errors"
	"net/http"
	"strings"

	schoolapp "ots/backend/internal/app/school"
	"ots/backend/internal/domain/identity"
	schooldomain "ots/backend/internal/domain/school"
	"ots/backend/internal/platform/httpx"
)

func (h *Handler) listAcademicYears(w http.ResponseWriter, r *http.Request) {
	principal, ok := requireSchoolOperator(w, r)
	if !ok {
		return
	}
	items, err := h.school.ListAcademicYears(r.Context(), principal.TenantID)
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "ACADEMIC_YEARS_FAILED", "Akademik yıllar alınamadı.", nil)
		return
	}
	httpx.WriteJSON(w, http.StatusOK, items, nil)
}

func (h *Handler) createAcademicYear(w http.ResponseWriter, r *http.Request) {
	principal, ok := requireSchoolOperator(w, r)
	if !ok {
		return
	}
	var input schooldomain.CreateAcademicYearInput
	if err := httpx.DecodeJSON(r, &input); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Akademik yıl bilgileri okunamadı.", nil)
		return
	}
	item, err := h.school.CreateAcademicYear(r.Context(), principal.TenantID, input)
	if errors.Is(err, schoolapp.ErrInvalidInput) {
		httpx.WriteError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Geçerli akademik yıl bilgisi gönderilmelidir.", nil)
		return
	}
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "ACADEMIC_YEAR_CREATE_FAILED", "Akademik yıl oluşturulamadı.", nil)
		return
	}
	httpx.WriteJSON(w, http.StatusCreated, item, nil)
}

func (h *Handler) listTerms(w http.ResponseWriter, r *http.Request) {
	principal, ok := requireSchoolOperator(w, r)
	if !ok {
		return
	}
	items, err := h.school.ListTerms(r.Context(), principal.TenantID)
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "TERMS_FAILED", "Dönemler alınamadı.", nil)
		return
	}
	httpx.WriteJSON(w, http.StatusOK, items, nil)
}

func (h *Handler) createTerm(w http.ResponseWriter, r *http.Request) {
	principal, ok := requireSchoolOperator(w, r)
	if !ok {
		return
	}
	var input schooldomain.CreateTermInput
	if err := httpx.DecodeJSON(r, &input); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Dönem bilgileri okunamadı.", nil)
		return
	}
	item, err := h.school.CreateTerm(r.Context(), principal.TenantID, input)
	if errors.Is(err, schoolapp.ErrInvalidInput) {
		httpx.WriteError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Geçerli dönem bilgisi gönderilmelidir.", nil)
		return
	}
	if errors.Is(err, schoolapp.ErrAcademicYearNotFound) {
		httpx.WriteError(w, http.StatusNotFound, "ACADEMIC_YEAR_NOT_FOUND", "Akademik yıl bulunamadı.", nil)
		return
	}
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "TERM_CREATE_FAILED", "Dönem oluşturulamadı.", nil)
		return
	}
	httpx.WriteJSON(w, http.StatusCreated, item, nil)
}

func (h *Handler) listClasses(w http.ResponseWriter, r *http.Request) {
	principal, ok := requireSchoolOperator(w, r)
	if !ok {
		return
	}
	items, err := h.school.ListClasses(r.Context(), principal.TenantID)
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "CLASSES_FAILED", "Sınıflar alınamadı.", nil)
		return
	}
	httpx.WriteJSON(w, http.StatusOK, items, nil)
}

func (h *Handler) createClass(w http.ResponseWriter, r *http.Request) {
	principal, ok := requireSchoolOperator(w, r)
	if !ok {
		return
	}
	var input schooldomain.CreateClassInput
	if err := httpx.DecodeJSON(r, &input); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Sınıf bilgileri okunamadı.", nil)
		return
	}
	item, err := h.school.CreateClass(r.Context(), principal.TenantID, input)
	if errors.Is(err, schoolapp.ErrInvalidInput) {
		httpx.WriteError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Geçerli sınıf adı gönderilmelidir.", nil)
		return
	}
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "CLASS_CREATE_FAILED", "Sınıf oluşturulamadı.", nil)
		return
	}
	httpx.WriteJSON(w, http.StatusCreated, item, nil)
}

func (h *Handler) updateClass(w http.ResponseWriter, r *http.Request) {
	principal, ok := requireSchoolOperator(w, r)
	if !ok {
		return
	}
	var input schooldomain.UpdateClassInput
	if err := httpx.DecodeJSON(r, &input); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Sınıf güncellemesi okunamadı.", nil)
		return
	}
	item, err := h.school.UpdateClass(r.Context(), principal.TenantID, r.PathValue("id"), input)
	if errors.Is(err, schoolapp.ErrInvalidInput) {
		httpx.WriteError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Geçerli sınıf bilgisi gönderilmelidir.", nil)
		return
	}
	if errors.Is(err, schoolapp.ErrClassNotFound) {
		httpx.WriteError(w, http.StatusNotFound, "CLASS_NOT_FOUND", "Sınıf bulunamadı.", nil)
		return
	}
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "CLASS_UPDATE_FAILED", "Sınıf güncellenemedi.", nil)
		return
	}
	httpx.WriteJSON(w, http.StatusOK, item, nil)
}

func (h *Handler) listStudents(w http.ResponseWriter, r *http.Request) {
	principal, ok := requireSchoolOperator(w, r)
	if !ok {
		return
	}
	if r.URL.Query().Get("page") != "" || r.URL.Query().Get("limit") != "" || strings.TrimSpace(r.URL.Query().Get("q")) != "" {
		params := httpx.ParsePageParams(r, 25, 100)
		items, total, err := h.school.ListStudentsPage(r.Context(), principal.TenantID, params.Query, params.Offset, params.Limit)
		if err != nil {
			httpx.WriteError(w, http.StatusInternalServerError, "STUDENTS_FAILED", "Öğrenciler alınamadı.", nil)
			return
		}
		httpx.WriteJSON(w, http.StatusOK, httpx.NewPageResult(items, total, params.Page, params.Limit), nil)
		return
	}
	items, err := h.school.ListStudents(r.Context(), principal.TenantID)
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "STUDENTS_FAILED", "Öğrenciler alınamadı.", nil)
		return
	}
	httpx.WriteJSON(w, http.StatusOK, items, nil)
}

func (h *Handler) createStudent(w http.ResponseWriter, r *http.Request) {
	principal, ok := requireSchoolOperator(w, r)
	if !ok {
		return
	}
	var input schooldomain.CreateStudentInput
	if err := httpx.DecodeJSON(r, &input); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Öğrenci bilgileri okunamadı.", nil)
		return
	}
	item, err := h.school.CreateStudent(r.Context(), principal.TenantID, input)
	if errors.Is(err, schoolapp.ErrInvalidInput) {
		httpx.WriteError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Geçerli öğrenci bilgisi gönderilmelidir.", nil)
		return
	}
	if errors.Is(err, schoolapp.ErrDuplicateNumber) {
		httpx.WriteError(w, http.StatusConflict, "DUPLICATE_STUDENT_NUMBER", "Bu okul numarası zaten kayıtlı.", nil)
		return
	}
	if errors.Is(err, schoolapp.ErrClassNotFound) {
		httpx.WriteError(w, http.StatusNotFound, "CLASS_NOT_FOUND", "Sınıf bulunamadı.", nil)
		return
	}
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "STUDENT_CREATE_FAILED", "Öğrenci oluşturulamadı.", nil)
		return
	}
	httpx.WriteJSON(w, http.StatusCreated, item, nil)
}

func (h *Handler) updateStudent(w http.ResponseWriter, r *http.Request) {
	principal, ok := requireSchoolOperator(w, r)
	if !ok {
		return
	}
	var input schooldomain.UpdateStudentInput
	if err := httpx.DecodeJSON(r, &input); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Öğrenci güncellemesi okunamadı.", nil)
		return
	}
	item, err := h.school.UpdateStudent(r.Context(), principal.TenantID, r.PathValue("id"), input)
	if errors.Is(err, schoolapp.ErrInvalidInput) {
		httpx.WriteError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Geçerli öğrenci bilgisi gönderilmelidir.", nil)
		return
	}
	if errors.Is(err, schoolapp.ErrStudentNotFound) {
		httpx.WriteError(w, http.StatusNotFound, "STUDENT_NOT_FOUND", "Öğrenci bulunamadı.", nil)
		return
	}
	if errors.Is(err, schoolapp.ErrDuplicateNumber) {
		httpx.WriteError(w, http.StatusConflict, "DUPLICATE_STUDENT_NUMBER", "Bu okul numarası zaten kayıtlı.", nil)
		return
	}
	if errors.Is(err, schoolapp.ErrClassNotFound) {
		httpx.WriteError(w, http.StatusNotFound, "CLASS_NOT_FOUND", "Sınıf bulunamadı.", nil)
		return
	}
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "STUDENT_UPDATE_FAILED", "Öğrenci güncellenemedi.", nil)
		return
	}
	httpx.WriteJSON(w, http.StatusOK, item, nil)
}

func (h *Handler) listSubjects(w http.ResponseWriter, r *http.Request) {
	principal, ok := requireSchoolOperator(w, r)
	if !ok {
		return
	}
	items, err := h.school.ListSubjects(r.Context(), principal.TenantID)
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "SUBJECTS_FAILED", "Dersler alınamadı.", nil)
		return
	}
	httpx.WriteJSON(w, http.StatusOK, items, nil)
}

func (h *Handler) createSubject(w http.ResponseWriter, r *http.Request) {
	principal, ok := requireSchoolOperator(w, r)
	if !ok {
		return
	}
	var input schooldomain.CreateSubjectInput
	if err := httpx.DecodeJSON(r, &input); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Ders bilgileri okunamadı.", nil)
		return
	}
	item, err := h.school.CreateSubject(r.Context(), principal.TenantID, input)
	if errors.Is(err, schoolapp.ErrInvalidInput) {
		httpx.WriteError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Geçerli ders adı ve kodu gönderilmelidir.", nil)
		return
	}
	if errors.Is(err, schoolapp.ErrDuplicateCode) {
		httpx.WriteError(w, http.StatusConflict, "DUPLICATE_SUBJECT_CODE", "Bu ders kodu zaten kayıtlı.", nil)
		return
	}
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "SUBJECT_CREATE_FAILED", "Ders oluşturulamadı.", nil)
		return
	}
	httpx.WriteJSON(w, http.StatusCreated, item, nil)
}

func (h *Handler) listTeachers(w http.ResponseWriter, r *http.Request) {
	principal, ok := requireSchoolOperator(w, r)
	if !ok {
		return
	}
	items, err := h.school.ListTeachers(r.Context(), principal.TenantID)
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "TEACHERS_FAILED", "Öğretmenler alınamadı.", nil)
		return
	}
	httpx.WriteJSON(w, http.StatusOK, items, nil)
}

func (h *Handler) createTeacher(w http.ResponseWriter, r *http.Request) {
	principal, ok := requireSchoolOperator(w, r)
	if !ok {
		return
	}
	var input schooldomain.CreateTeacherInput
	if err := httpx.DecodeJSON(r, &input); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Öğretmen bilgileri okunamadı.", nil)
		return
	}
	item, err := h.school.CreateTeacher(r.Context(), principal.TenantID, input)
	if errors.Is(err, schoolapp.ErrInvalidInput) {
		httpx.WriteError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Geçerli kullanıcı kimliği gönderilmelidir.", nil)
		return
	}
	if errors.Is(err, schoolapp.ErrUserNotInTenant) {
		httpx.WriteError(w, http.StatusBadRequest, "USER_NOT_IN_TENANT", "Kullanıcı bu kurumda bulunamadı.", nil)
		return
	}
	if errors.Is(err, schoolapp.ErrDuplicateTeacher) {
		httpx.WriteError(w, http.StatusConflict, "TEACHER_ALREADY_EXISTS", "Bu kullanıcı zaten öğretmen olarak kayıtlı.", nil)
		return
	}
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "TEACHER_CREATE_FAILED", "Öğretmen oluşturulamadı.", nil)
		return
	}
	httpx.WriteJSON(w, http.StatusCreated, item, nil)
}

func (h *Handler) updateTeacher(w http.ResponseWriter, r *http.Request) {
	principal, ok := requireSchoolOperator(w, r)
	if !ok {
		return
	}
	var input schooldomain.UpdateTeacherInput
	if err := httpx.DecodeJSON(r, &input); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Öğretmen güncellemesi okunamadı.", nil)
		return
	}
	item, err := h.school.UpdateTeacher(r.Context(), principal.TenantID, r.PathValue("id"), input)
	if errors.Is(err, schoolapp.ErrTeacherNotFound) {
		httpx.WriteError(w, http.StatusNotFound, "TEACHER_NOT_FOUND", "Öğretmen bulunamadı.", nil)
		return
	}
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "TEACHER_UPDATE_FAILED", "Öğretmen güncellenemedi.", nil)
		return
	}
	httpx.WriteJSON(w, http.StatusOK, item, nil)
}

func (h *Handler) assignClassStudent(w http.ResponseWriter, r *http.Request) {
	principal, ok := requireSchoolOperator(w, r)
	if !ok {
		return
	}
	var input schooldomain.AssignClassStudentInput
	if err := httpx.DecodeJSON(r, &input); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Sınıf ataması okunamadı.", nil)
		return
	}
	item, err := h.school.AssignClassStudent(r.Context(), principal.TenantID, r.PathValue("id"), input)
	if errors.Is(err, schoolapp.ErrInvalidInput) {
		httpx.WriteError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Geçerli öğrenci kimliği gönderilmelidir.", nil)
		return
	}
	if errors.Is(err, schoolapp.ErrClassNotFound) {
		httpx.WriteError(w, http.StatusNotFound, "CLASS_NOT_FOUND", "Sınıf bulunamadı.", nil)
		return
	}
	if errors.Is(err, schoolapp.ErrStudentNotFound) {
		httpx.WriteError(w, http.StatusNotFound, "STUDENT_NOT_FOUND", "Öğrenci bulunamadı.", nil)
		return
	}
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "CLASS_STUDENT_ASSIGN_FAILED", "Öğrenci sınıfa atanamadı.", nil)
		return
	}
	httpx.WriteJSON(w, http.StatusCreated, item, nil)
}

func requireSchoolOperator(w http.ResponseWriter, r *http.Request) (identity.Principal, bool) {
	return requirePrincipalRole(w, r, identity.RolePrincipal, identity.RoleSystemAdmin, identity.RoleSuperAdmin)
}
