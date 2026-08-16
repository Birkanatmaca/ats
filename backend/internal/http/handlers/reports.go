package handlers

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"sort"
	"strings"
	"time"

	academicapp "ots/backend/internal/app/academic"
	attendanceapp "ots/backend/internal/app/attendance"
	guidanceapp "ots/backend/internal/app/guidance"
	academicdomain "ots/backend/internal/domain/academic"
	attendancedomain "ots/backend/internal/domain/attendance"
	billingdomain "ots/backend/internal/domain/billing"
	guidancedomain "ots/backend/internal/domain/guidance"
	"ots/backend/internal/domain/identity"
	schooldomain "ots/backend/internal/domain/school"
	transportdomain "ots/backend/internal/domain/transport"
	"ots/backend/internal/platform/httpx"
	"ots/backend/internal/platform/pdf"
	"ots/backend/internal/platform/storage"
)

type reportFileResponse struct {
	storage.FileMeta
	ReportType string `json:"reportType"`
	Title      string `json:"title"`
}

type studentReportRequest struct {
	StudentID     string `json:"studentId"`
	TeacherNote   string `json:"teacherNote,omitempty"`
	CounselorNote string `json:"counselorNote,omitempty"`
}

type billingReceiptReportRequest struct {
	StudentID string `json:"studentId"`
	PaymentID string `json:"paymentId,omitempty"`
}

type guidanceCaseReportRequest struct {
	CaseID string `json:"caseId"`
}

type serviceTripReportRequest struct {
	TripID string `json:"tripId"`
}

func (h *Handler) generateAttendanceReportPDF(w http.ResponseWriter, r *http.Request) {
	if h.fileStorage == nil || h.attendance == nil {
		httpx.WriteError(w, http.StatusServiceUnavailable, "REPORTS_DISABLED", "Rapor servisi aktif değil.", nil)
		return
	}
	principal, ok := requirePrincipal(w, r)
	if !ok {
		return
	}
	var input studentReportRequest
	if err := httpx.DecodeJSON(r, &input); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Rapor girdisi okunamadı.", nil)
		return
	}
	studentID := strings.TrimSpace(input.StudentID)
	if studentID == "" {
		httpx.WriteError(w, http.StatusBadRequest, "VALIDATION_ERROR", "studentId zorunludur.", nil)
		return
	}
	if !h.canViewStudentAttendanceSummary(r.Context(), principal, studentID) {
		httpx.WriteError(w, http.StatusForbidden, "FORBIDDEN", "Bu öğrencinin devamsızlık raporuna erişim yetkiniz yok.", nil)
		return
	}
	summary, err := h.attendance.StudentSummary(r.Context(), principal.TenantID, studentID)
	if errors.Is(err, attendanceapp.ErrStudentNotFound) {
		httpx.WriteError(w, http.StatusNotFound, "STUDENT_NOT_FOUND", "Öğrenci bulunamadı.", nil)
		return
	}
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "ATTENDANCE_REPORT_FAILED", "Devamsızlık raporu oluşturulamadı.", nil)
		return
	}
	student := h.findReportStudent(r.Context(), principal.TenantID, studentID)
	reportInput := h.attendanceReportInput(r.Context(), principal.TenantID, student, summary)
	content, err := pdf.NewReportGenerator().GenerateAttendanceReportPDF(reportInput)
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "PDF_GENERATION_FAILED", "PDF oluşturma başarısız.", nil)
		return
	}
	h.writeGeneratedReport(w, r, principal, "attendance", "Devamsızlık raporu", "student_report", studentID, reportFileName("devamsizlik", student), content)
}

func (h *Handler) generateBillingReceiptPDF(w http.ResponseWriter, r *http.Request) {
	if h.fileStorage == nil || h.billing == nil {
		httpx.WriteError(w, http.StatusServiceUnavailable, "REPORTS_DISABLED", "Rapor servisi aktif değil.", nil)
		return
	}
	principal, ok := h.requireBillingAccess(w, r)
	if !ok {
		return
	}
	var input billingReceiptReportRequest
	if err := httpx.DecodeJSON(r, &input); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Makbuz girdisi okunamadı.", nil)
		return
	}
	studentID := strings.TrimSpace(input.StudentID)
	if studentID == "" {
		httpx.WriteError(w, http.StatusBadRequest, "VALIDATION_ERROR", "studentId zorunludur.", nil)
		return
	}
	account, err := h.billing.StudentAccount(r.Context(), principal.TenantID, studentID)
	if writeBillingError(w, err) {
		return
	}
	plan, installment, payment, found := selectReceiptPayment(account, strings.TrimSpace(input.PaymentID))
	if !found {
		httpx.WriteError(w, http.StatusNotFound, "PAYMENT_NOT_FOUND", "Makbuz üretilecek ödeme bulunamadı.", nil)
		return
	}
	reportInput := pdf.BillingReceiptInput{
		SchoolName:      h.reportSchoolName(r.Context(), principal.TenantID),
		StudentName:     account.StudentName,
		SchoolNumber:    account.SchoolNumber,
		ClassName:       account.ClassName,
		ReceiptNo:       receiptNumber(payment),
		GeneratedAt:     h.reportNow(),
		PlanName:        plan.Name,
		InstallmentID:   installment.ID,
		InstallmentDue:  installment.DueDate,
		InstallmentCost: installment.Amount,
		PaymentID:       payment.ID,
		PaymentAmount:   payment.Amount,
		PaymentMethod:   string(payment.Method),
		PaidAt:          payment.PaidAt,
		Note:            payment.Note,
		Currency:        plan.Currency,
		RecordedBy:      payment.RecordedBy,
	}
	content, err := pdf.NewReportGenerator().GenerateBillingReceiptPDF(reportInput)
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "PDF_GENERATION_FAILED", "PDF oluşturma başarısız.", nil)
		return
	}
	h.writeGeneratedReport(w, r, principal, "billing_receipt", "Tahsilat makbuzu", "billing_account", account.ID, reportFileName("tahsilat_makbuzu", reportStudent{FullName: account.StudentName, SchoolNumber: account.SchoolNumber}), content)
}

func (h *Handler) generateGuidanceCaseSummaryPDF(w http.ResponseWriter, r *http.Request) {
	if h.fileStorage == nil || h.guidance == nil {
		httpx.WriteError(w, http.StatusServiceUnavailable, "REPORTS_DISABLED", "Rapor servisi aktif değil.", nil)
		return
	}
	principal, ok := requireGuidanceRole(w, r)
	if !ok {
		return
	}
	var input guidanceCaseReportRequest
	if err := httpx.DecodeJSON(r, &input); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Vaka raporu girdisi okunamadı.", nil)
		return
	}
	caseID := strings.TrimSpace(input.CaseID)
	if caseID == "" {
		httpx.WriteError(w, http.StatusBadRequest, "VALIDATION_ERROR", "caseId zorunludur.", nil)
		return
	}
	item, err := h.guidance.GetCase(r.Context(), principal.TenantID, principal.UserID, string(principal.Role), caseID)
	if writeGuidanceReportError(w, err) {
		return
	}
	timeline, err := h.guidance.ListCaseTimeline(r.Context(), principal.TenantID, principal.UserID, string(principal.Role), caseID)
	if writeGuidanceReportError(w, err) {
		return
	}
	reportInput := pdf.GuidanceCaseSummaryInput{
		SchoolName:  h.reportSchoolName(r.Context(), principal.TenantID),
		GeneratedAt: h.reportNow(),
		CaseID:      item.ID,
		StudentName: item.StudentName,
		ClassName:   item.ClassName,
		OwnerName:   item.OwnerName,
		Title:       item.Title,
		Status:      string(item.Status),
		Priority:    string(item.Priority),
		Sensitivity: item.Sensitivity,
		OpenedAt:    item.OpenedAt,
		ClosedAt:    item.ClosedAt,
		Summary:     item.Summary,
		Timeline:    guidanceTimelineRows(timeline),
	}
	content, err := pdf.NewReportGenerator().GenerateGuidanceCaseSummaryPDF(reportInput)
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "PDF_GENERATION_FAILED", "PDF oluşturma başarısız.", nil)
		return
	}
	h.writeGeneratedReport(w, r, principal, "guidance_case_summary", "Rehberlik vaka özeti", "guidance_case", item.ID, reportFileName("rehberlik_vaka_ozeti", reportStudent{FullName: item.StudentName}), content)
}

func (h *Handler) generateStudentDevelopmentReportPDF(w http.ResponseWriter, r *http.Request) {
	if h.fileStorage == nil || h.academic == nil {
		httpx.WriteError(w, http.StatusServiceUnavailable, "REPORTS_DISABLED", "Rapor servisi aktif değil.", nil)
		return
	}
	principal, ok := requirePrincipal(w, r)
	if !ok {
		return
	}
	var input studentReportRequest
	if err := httpx.DecodeJSON(r, &input); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Gelişim raporu girdisi okunamadı.", nil)
		return
	}
	studentID := strings.TrimSpace(input.StudentID)
	if studentID == "" {
		httpx.WriteError(w, http.StatusBadRequest, "VALIDATION_ERROR", "studentId zorunludur.", nil)
		return
	}
	academicSummary, err := h.academic.StudentSummary(r.Context(), principal, studentID)
	if principal.Role == identity.RoleGuardian {
		academicSummary, err = h.academic.GuardianReport(r.Context(), principal, studentID)
	}
	if writeAcademicReportError(w, err) {
		return
	}
	attendanceInput := pdf.AttendanceReportInput{}
	if h.attendance != nil && h.canViewStudentAttendanceSummary(r.Context(), principal, studentID) {
		if summary, attendanceErr := h.attendance.StudentSummary(r.Context(), principal.TenantID, studentID); attendanceErr == nil {
			student := h.findReportStudent(r.Context(), principal.TenantID, studentID)
			attendanceInput = h.attendanceReportInput(r.Context(), principal.TenantID, student, summary)
		}
	}
	reportInput := studentDevelopmentReportInput(h.reportSchoolName(r.Context(), principal.TenantID), h.reportNow(), academicSummary, attendanceInput, input.TeacherNote, input.CounselorNote)
	content, err := pdf.NewReportGenerator().GenerateStudentDevelopmentReportPDF(reportInput)
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "PDF_GENERATION_FAILED", "PDF oluşturma başarısız.", nil)
		return
	}
	h.writeGeneratedReport(w, r, principal, "student_development", "Öğrenci gelişim raporu", "student_report", studentID, reportFileName("ogrenci_gelisim", reportStudent{FullName: academicSummary.Student.FullName, SchoolNumber: academicSummary.Student.SchoolNumber}), content)
}

func (h *Handler) generateServiceTripReportPDF(w http.ResponseWriter, r *http.Request) {
	if h.fileStorage == nil || h.transport == nil {
		httpx.WriteError(w, http.StatusServiceUnavailable, "REPORTS_DISABLED", "Rapor servisi aktif değil.", nil)
		return
	}
	principal, ok := requireTransportOperator(w, r)
	if !ok {
		return
	}
	var input serviceTripReportRequest
	if err := httpx.DecodeJSON(r, &input); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Servis raporu girdisi okunamadı.", nil)
		return
	}
	tripID := strings.TrimSpace(input.TripID)
	if tripID == "" {
		httpx.WriteError(w, http.StatusBadRequest, "VALIDATION_ERROR", "tripId zorunludur.", nil)
		return
	}
	live, err := h.transport.TripLive(r.Context(), principal.TenantID, tripID, 300, 300)
	if writeTransportError(w, err) {
		return
	}
	timeline, err := h.transport.TripTimeline(r.Context(), principal.TenantID, tripID, 300)
	if writeTransportError(w, err) {
		return
	}
	reportInput := serviceTripReportInput(h.reportSchoolName(r.Context(), principal.TenantID), h.reportNow(), live, timeline)
	content, err := pdf.NewReportGenerator().GenerateServiceTripReportPDF(reportInput)
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "PDF_GENERATION_FAILED", "PDF oluşturma başarısız.", nil)
		return
	}
	h.writeGeneratedReport(w, r, principal, "service_trip", "Servis raporu", "service_trip", live.Trip.ID, reportFileName("servis_raporu", reportStudent{FullName: live.Trip.RouteName}), content)
}

func (h *Handler) writeGeneratedReport(w http.ResponseWriter, r *http.Request, principal identity.Principal, reportType, title, resourceType, resourceID, fileName string, content []byte) {
	meta, err := h.fileStorage.Save(r.Context(), storage.SaveInput{
		TenantID:     principal.TenantID,
		Category:     "report",
		FileName:     fileName,
		ContentType:  "application/pdf",
		ResourceType: resourceType,
		ResourceID:   resourceID,
		UploadedBy:   principal.UserID,
		Content:      content,
	})
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "PDF_SAVE_FAILED", "PDF kaydedilemedi.", nil)
		return
	}
	httpx.WriteJSON(w, http.StatusCreated, reportFileResponse{
		FileMeta:   meta,
		ReportType: reportType,
		Title:      title,
	}, nil)
}

type reportStudent struct {
	ID           string
	FullName     string
	SchoolNumber string
	ClassName    string
}

func (h *Handler) findReportStudent(ctx context.Context, tenantID, studentID string) reportStudent {
	out := reportStudent{ID: strings.TrimSpace(studentID), FullName: strings.TrimSpace(studentID)}
	if h.school == nil || studentID == "" {
		return out
	}
	roster, err := h.school.PrincipalRoster(ctx, tenantID)
	if err != nil {
		return out
	}
	classByID := make(map[string]string, len(roster.Classes))
	for _, item := range roster.Classes {
		classByID[item.ID] = item.Name
	}
	sectionByID := make(map[string]schooldomain.PrincipalRosterSection, len(roster.Sections))
	for _, item := range roster.Sections {
		sectionByID[item.ID] = item
	}
	for _, item := range roster.Students {
		if item.ID != studentID {
			continue
		}
		fullName := strings.TrimSpace(item.FirstName + " " + item.LastName)
		if fullName == "" {
			fullName = item.ID
		}
		className := classByID[item.ClassID]
		if section, ok := sectionByID[item.SectionID]; ok {
			if className != "" {
				className += " / " + section.Name
			} else {
				className = section.Name
			}
		}
		return reportStudent{
			ID:           item.ID,
			FullName:     fullName,
			SchoolNumber: item.SchoolNumber,
			ClassName:    className,
		}
	}
	return out
}

func (h *Handler) attendanceReportInput(ctx context.Context, tenantID string, student reportStudent, summary attendancedomain.StudentSummary) pdf.AttendanceReportInput {
	rows := make([]pdf.AttendanceRecordRow, 0, len(summary.Records))
	for _, item := range summary.Records {
		rows = append(rows, pdf.AttendanceRecordRow{
			Date:        item.Date,
			SubjectName: item.SubjectName,
			ClassName:   item.ClassName,
			Status:      string(item.Status),
		})
	}
	return pdf.AttendanceReportInput{
		SchoolName:   h.reportSchoolName(ctx, tenantID),
		StudentName:  student.FullName,
		StudentID:    summary.StudentID,
		SchoolNumber: student.SchoolNumber,
		ClassName:    student.ClassName,
		GeneratedAt:  h.reportNow(),
		Present:      summary.Present,
		Absent:       summary.Absent,
		Late:         summary.Late,
		Excused:      summary.Excused,
		Records:      rows,
	}
}

func studentDevelopmentReportInput(schoolName string, generatedAt time.Time, summary academicdomain.StudentAcademicSummary, attendance pdf.AttendanceReportInput, teacherNote, counselorNote string) pdf.StudentDevelopmentReportInput {
	subjects := make([]pdf.AcademicSubjectRow, 0, len(summary.SubjectSummaries))
	for _, item := range summary.SubjectSummaries {
		subjects = append(subjects, pdf.AcademicSubjectRow{
			SubjectName:     item.SubjectName,
			AveragePercent:  item.AveragePercent,
			AssessmentCount: item.AssessmentCount,
			Trend:           item.Trend,
			NeedsSupport:    item.NeedsSupport,
		})
	}
	results := make([]pdf.AcademicResultRow, 0, len(summary.RecentResults))
	for _, item := range summary.RecentResults {
		results = append(results, pdf.AcademicResultRow{
			Date:           item.AssessmentDate,
			AssessmentName: item.AssessmentName,
			SubjectName:    item.SubjectName,
			Score:          item.Score,
			MaxScore:       item.MaxScore,
			Percent:        item.Percent,
			Note:           item.Note,
		})
	}
	outcomes := make([]pdf.AcademicOutcomeRow, 0, len(summary.Outcomes))
	for _, item := range summary.Outcomes {
		outcomes = append(outcomes, pdf.AcademicOutcomeRow{
			SubjectName:  item.SubjectName,
			OutcomeCode:  item.OutcomeCode,
			OutcomeTitle: item.OutcomeTitle,
			Status:       string(item.Status),
			Evidence:     item.Evidence,
		})
	}
	return pdf.StudentDevelopmentReportInput{
		SchoolName:      schoolName,
		GeneratedAt:     generatedAt,
		StudentName:     summary.Student.FullName,
		StudentID:       summary.Student.ID,
		SchoolNumber:    summary.Student.SchoolNumber,
		ClassName:       summary.Student.ClassName,
		AveragePercent:  summary.AveragePercent,
		AssessmentCount: summary.AssessmentCount,
		Subjects:        subjects,
		RecentResults:   results,
		Outcomes:        outcomes,
		SupportSignals:  summary.SupportSignals,
		AIWeeklySummary: summary.AIWeeklySummary,
		Attendance:      attendance,
		TeacherNote:     strings.TrimSpace(teacherNote),
		CounselorNote:   strings.TrimSpace(counselorNote),
	}
}

func guidanceTimelineRows(items []guidancedomain.CaseTimelineItem) []pdf.GuidanceTimelineRow {
	rows := make([]pdf.GuidanceTimelineRow, 0, len(items))
	for _, item := range items {
		rows = append(rows, pdf.GuidanceTimelineRow{
			Date:      item.OccurredAt,
			Type:      item.EventType,
			Title:     item.Title,
			Body:      item.Body,
			ActorName: item.ActorName,
		})
	}
	return rows
}

func serviceTripReportInput(schoolName string, generatedAt time.Time, live transportdomain.ServiceTripLive, timeline []transportdomain.ServiceTripTimelineItem) pdf.ServiceTripReportInput {
	rows := make([]pdf.ServiceTimelineRow, 0, len(timeline))
	for _, item := range timeline {
		rows = append(rows, pdf.ServiceTimelineRow{
			Date:        item.OccurredAt,
			Type:        serviceTimelineType(item),
			Description: serviceTimelineDescription(item),
		})
	}
	lastSeen := (*time.Time)(nil)
	if live.LiveStatus != nil && live.LiveStatus.LastLocationAt != nil {
		lastSeen = live.LiveStatus.LastLocationAt
	}
	return pdf.ServiceTripReportInput{
		SchoolName:    schoolName,
		GeneratedAt:   generatedAt,
		TripID:        live.Trip.ID,
		RouteName:     live.Trip.RouteName,
		DriverName:    live.Trip.DriverName,
		Direction:     string(live.Trip.Direction),
		Status:        string(live.Trip.Status),
		StartedAt:     live.Trip.StartedAt,
		EndedAt:       live.Trip.EndedAt,
		LastSeenAt:    lastSeen,
		LocationCount: len(live.Locations),
		EventCount:    len(live.Events),
		Timeline:      rows,
	}
}

func serviceTimelineType(item transportdomain.ServiceTripTimelineItem) string {
	if item.Type == "location" {
		return "Konum"
	}
	if item.EventType != "" {
		return serviceEventLabel(item.EventType)
	}
	return item.Type
}

func serviceTimelineDescription(item transportdomain.ServiceTripTimelineItem) string {
	if item.Location != nil {
		return fmt.Sprintf("Lat %.5f, Lng %.5f, hiz %.1f km/s", item.Location.Latitude, item.Location.Longitude, item.Location.SpeedKPH)
	}
	if item.Event != nil {
		parts := []string{serviceEventLabel(item.Event.EventType)}
		if studentName, ok := item.Event.Payload["studentName"].(string); ok && strings.TrimSpace(studentName) != "" {
			parts = append(parts, studentName)
		}
		if note, ok := item.Event.Payload["note"].(string); ok && strings.TrimSpace(note) != "" {
			parts = append(parts, note)
		}
		return strings.Join(parts, " - ")
	}
	return "-"
}

func serviceEventLabel(value string) string {
	switch value {
	case "trip_started":
		return "Sefer basladi"
	case "trip_completed":
		return "Sefer tamamlandi"
	case "student_boarded":
		return "Ogrenci bindi"
	case "student_left":
		return "Ogrenci indi"
	case "delay_note":
		return "Gecikme notu"
	case "incident":
		return "Olay"
	case "manual_note":
		return "Not"
	default:
		return value
	}
}

func selectReceiptPayment(account billingdomain.BillingAccount, paymentID string) (billingdomain.PaymentPlan, billingdomain.PaymentInstallment, billingdomain.Payment, bool) {
	type candidate struct {
		plan        billingdomain.PaymentPlan
		installment billingdomain.PaymentInstallment
		payment     billingdomain.Payment
	}
	candidates := make([]candidate, 0)
	for _, plan := range account.Plans {
		for _, installment := range plan.Installments {
			for _, payment := range installment.Payments {
				if payment.Void {
					continue
				}
				if paymentID != "" && payment.ID != paymentID {
					continue
				}
				candidates = append(candidates, candidate{plan: plan, installment: installment, payment: payment})
			}
		}
	}
	if len(candidates) == 0 {
		return billingdomain.PaymentPlan{}, billingdomain.PaymentInstallment{}, billingdomain.Payment{}, false
	}
	sort.Slice(candidates, func(i, j int) bool {
		left := candidates[i].payment.PaidAt
		right := candidates[j].payment.PaidAt
		if left.Equal(right) {
			return candidates[i].payment.CreatedAt.After(candidates[j].payment.CreatedAt)
		}
		return left.After(right)
	})
	return candidates[0].plan, candidates[0].installment, candidates[0].payment, true
}

func receiptNumber(payment billingdomain.Payment) string {
	if strings.TrimSpace(payment.ID) == "" {
		return fmt.Sprintf("RCP-%s", time.Now().Format("20060102150405"))
	}
	id := strings.ReplaceAll(payment.ID, "-", "")
	if len(id) > 10 {
		id = id[:10]
	}
	return "RCP-" + strings.ToUpper(id)
}

func (h *Handler) reportSchoolName(ctx context.Context, tenantID string) string {
	if h.school != nil {
		if tenant, found := h.school.CurrentTenant(ctx, tenantID); found && strings.TrimSpace(tenant.Name) != "" {
			return tenant.Name
		}
	}
	return "OGTA"
}

func (h *Handler) reportNow() time.Time {
	if h.clock != nil {
		return h.clock()
	}
	return time.Now()
}

func reportFileName(prefix string, student reportStudent) string {
	parts := []string{prefix}
	if strings.TrimSpace(student.SchoolNumber) != "" {
		parts = append(parts, student.SchoolNumber)
	}
	if strings.TrimSpace(student.FullName) != "" {
		parts = append(parts, student.FullName)
	}
	parts = append(parts, time.Now().Format("20060102"))
	return sanitizeReportFileName(strings.Join(parts, "_")) + ".pdf"
}

func sanitizeReportFileName(value string) string {
	value = strings.ToLower(strings.TrimSpace(value))
	replacer := strings.NewReplacer(
		"ı", "i", "ğ", "g", "ü", "u", "ş", "s", "ö", "o", "ç", "c",
		"İ", "i", "Ğ", "g", "Ü", "u", "Ş", "s", "Ö", "o", "Ç", "c",
		" ", "_", "/", "_", "\\", "_", ":", "_", ";", "_", ",", "_",
	)
	value = replacer.Replace(value)
	builder := strings.Builder{}
	for _, r := range value {
		if (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9') || r == '_' || r == '-' {
			builder.WriteRune(r)
		}
	}
	out := strings.Trim(builder.String(), "_-")
	if out == "" {
		return "rapor"
	}
	return out
}

func writeGuidanceReportError(w http.ResponseWriter, err error) bool {
	if err == nil {
		return false
	}
	if errors.Is(err, guidanceapp.ErrStudentOutScope) {
		httpx.WriteError(w, http.StatusForbidden, "STUDENT_OUT_OF_SCOPE", "Bu vaka dosyasına erişiminiz yok.", nil)
		return true
	}
	if errors.Is(err, guidanceapp.ErrCaseNotFound) {
		httpx.WriteError(w, http.StatusNotFound, "GUIDANCE_CASE_NOT_FOUND", "Vaka dosyası bulunamadı.", nil)
		return true
	}
	httpx.WriteError(w, http.StatusInternalServerError, "GUIDANCE_REPORT_FAILED", "Vaka raporu oluşturulamadı.", nil)
	return true
}

func writeAcademicReportError(w http.ResponseWriter, err error) bool {
	if err == nil {
		return false
	}
	if errors.Is(err, academicapp.ErrForbidden) {
		httpx.WriteError(w, http.StatusForbidden, "FORBIDDEN", "Bu öğrencinin gelişim raporuna erişim yetkiniz yok.", nil)
		return true
	}
	if errors.Is(err, academicapp.ErrStudentNotFound) {
		httpx.WriteError(w, http.StatusNotFound, "STUDENT_NOT_FOUND", "Öğrenci bulunamadı.", nil)
		return true
	}
	httpx.WriteError(w, http.StatusInternalServerError, "ACADEMIC_REPORT_FAILED", "Gelişim raporu oluşturulamadı.", nil)
	return true
}
