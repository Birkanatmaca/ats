package academic

import (
	"context"
	"errors"
	"fmt"
	"math"
	"sort"
	"strings"
	"time"

	domain "ots/backend/internal/domain/academic"
	"ots/backend/internal/domain/identity"
)

var (
	ErrInvalidInput       = errors.New("invalid academic input")
	ErrAssessmentNotFound = errors.New("academic assessment not found")
	ErrStudentNotFound    = errors.New("academic student not found")
	ErrClassNotFound      = errors.New("academic class not found")
	ErrForbidden          = errors.New("academic access forbidden")
)

type Repository interface {
	ListAcademicAssessments(ctx context.Context, tenantID string) ([]domain.Assessment, error)
	GetAcademicAssessment(ctx context.Context, tenantID, assessmentID string) (domain.Assessment, bool, error)
	CreateAcademicAssessment(ctx context.Context, tenantID, actorUserID string, input domain.CreateAssessmentInput) (domain.Assessment, error)
	UpdateAcademicAssessment(ctx context.Context, tenantID, assessmentID string, input domain.UpdateAssessmentInput) (domain.Assessment, error)
	DeleteAcademicAssessment(ctx context.Context, tenantID, assessmentID string) error
	ListAcademicResults(ctx context.Context, tenantID, assessmentID string) ([]domain.Result, error)
	SaveAcademicResults(ctx context.Context, tenantID, assessmentID, actorUserID string, rows []domain.ResultInput) ([]domain.Result, error)
	ResolveAcademicStudent(ctx context.Context, tenantID string, input domain.ResultInput) (domain.StudentRef, bool, error)
	StudentAcademicDataset(ctx context.Context, tenantID, studentID string) (domain.StudentAcademicDataset, bool, error)
	ClassAcademicDataset(ctx context.Context, tenantID, classID string) (domain.ClassAcademicDataset, bool, error)
	TeacherCanManageClassSubject(ctx context.Context, tenantID, teacherUserID, classID, subjectID string) bool
	TeacherCanObserveStudent(ctx context.Context, tenantID, teacherUserID, studentID string) bool
	GuardianHasStudent(ctx context.Context, tenantID, guardianUserID, studentID string) bool
	RecordOperationalAudit(ctx context.Context, tenantID, actorUserID, action, resourceType, resourceID, metadata string)
}

type Service struct {
	repo  Repository
	clock func() time.Time
}

func NewService(repo Repository, clock func() time.Time) *Service {
	if clock == nil {
		clock = time.Now
	}
	return &Service{repo: repo, clock: clock}
}

func (s *Service) ListAssessments(ctx context.Context, actor identity.Principal) ([]domain.Assessment, error) {
	items, err := s.repo.ListAcademicAssessments(ctx, actor.TenantID)
	if err != nil {
		return nil, err
	}
	if actor.Role != identity.RoleTeacher {
		return items, nil
	}
	out := make([]domain.Assessment, 0, len(items))
	for _, item := range items {
		if s.repo.TeacherCanManageClassSubject(ctx, actor.TenantID, actor.UserID, item.ClassID, item.SubjectID) {
			out = append(out, item)
		}
	}
	return out, nil
}

func (s *Service) GetAssessment(ctx context.Context, actor identity.Principal, assessmentID string) (domain.Assessment, error) {
	item, ok, err := s.repo.GetAcademicAssessment(ctx, actor.TenantID, strings.TrimSpace(assessmentID))
	if err != nil {
		return domain.Assessment{}, err
	}
	if !ok {
		return domain.Assessment{}, ErrAssessmentNotFound
	}
	if actor.Role == identity.RoleTeacher && !s.repo.TeacherCanManageClassSubject(ctx, actor.TenantID, actor.UserID, item.ClassID, item.SubjectID) {
		return domain.Assessment{}, ErrForbidden
	}
	return item, nil
}

func (s *Service) CreateAssessment(ctx context.Context, actor identity.Principal, input domain.CreateAssessmentInput) (domain.Assessment, error) {
	input = normalizeCreateAssessment(input)
	if !validAssessmentInput(input.Name, input.SubjectID, input.AssessmentType, input.MaxScore, input.AssessmentDate) {
		return domain.Assessment{}, ErrInvalidInput
	}
	if actor.Role == identity.RoleTeacher && !s.repo.TeacherCanManageClassSubject(ctx, actor.TenantID, actor.UserID, input.ClassID, input.SubjectID) {
		return domain.Assessment{}, ErrForbidden
	}
	created, err := s.repo.CreateAcademicAssessment(ctx, actor.TenantID, actor.UserID, input)
	if err != nil {
		return domain.Assessment{}, err
	}
	s.repo.RecordOperationalAudit(ctx, actor.TenantID, actor.UserID, "academic.assessment.create", "academic_assessment", created.ID, `{}`)
	return created, nil
}

func (s *Service) UpdateAssessment(ctx context.Context, actor identity.Principal, assessmentID string, input domain.UpdateAssessmentInput) (domain.Assessment, error) {
	current, err := s.GetAssessment(ctx, actor, assessmentID)
	if err != nil {
		return domain.Assessment{}, err
	}
	nextClassID := current.ClassID
	nextSubjectID := current.SubjectID
	if input.ClassID != nil {
		nextClassID = strings.TrimSpace(*input.ClassID)
	}
	if input.SubjectID != nil {
		nextSubjectID = strings.TrimSpace(*input.SubjectID)
	}
	if actor.Role == identity.RoleTeacher && !s.repo.TeacherCanManageClassSubject(ctx, actor.TenantID, actor.UserID, nextClassID, nextSubjectID) {
		return domain.Assessment{}, ErrForbidden
	}
	updated, err := s.repo.UpdateAcademicAssessment(ctx, actor.TenantID, current.ID, normalizeUpdateAssessment(input))
	if err != nil {
		return domain.Assessment{}, err
	}
	s.repo.RecordOperationalAudit(ctx, actor.TenantID, actor.UserID, "academic.assessment.update", "academic_assessment", updated.ID, `{}`)
	return updated, nil
}

func (s *Service) DeleteAssessment(ctx context.Context, actor identity.Principal, assessmentID string) error {
	current, err := s.GetAssessment(ctx, actor, assessmentID)
	if err != nil {
		return err
	}
	if err := s.repo.DeleteAcademicAssessment(ctx, actor.TenantID, current.ID); err != nil {
		return err
	}
	s.repo.RecordOperationalAudit(ctx, actor.TenantID, actor.UserID, "academic.assessment.delete", "academic_assessment", current.ID, `{}`)
	return nil
}

func (s *Service) ListResults(ctx context.Context, actor identity.Principal, assessmentID string) ([]domain.Result, error) {
	assessment, err := s.GetAssessment(ctx, actor, assessmentID)
	if err != nil {
		return nil, err
	}
	return s.repo.ListAcademicResults(ctx, actor.TenantID, assessment.ID)
}

func (s *Service) SaveResults(ctx context.Context, actor identity.Principal, assessmentID string, input domain.SaveResultsInput) ([]domain.Result, error) {
	assessment, err := s.GetAssessment(ctx, actor, assessmentID)
	if err != nil {
		return nil, err
	}
	rows, err := s.validResultRows(ctx, actor.TenantID, assessment, input.Results)
	if err != nil {
		return nil, err
	}
	if len(rows) == 0 {
		return nil, ErrInvalidInput
	}
	saved, err := s.repo.SaveAcademicResults(ctx, actor.TenantID, assessment.ID, actor.UserID, rows)
	if err != nil {
		return nil, err
	}
	s.repo.RecordOperationalAudit(ctx, actor.TenantID, actor.UserID, "academic.results.save", "academic_assessment", assessment.ID, fmt.Sprintf(`{"count":%d}`, len(saved)))
	return saved, nil
}

func (s *Service) ImportResults(ctx context.Context, actor identity.Principal, input domain.ImportResultsInput) (domain.ImportResultsResult, error) {
	assessment, err := s.GetAssessment(ctx, actor, input.AssessmentID)
	if err != nil {
		return domain.ImportResultsResult{}, err
	}
	seen := map[string]int{}
	valid := make([]domain.ResultInput, 0, len(input.Rows))
	out := domain.ImportResultsResult{Rows: make([]domain.ImportRowResult, 0, len(input.Rows))}
	for index, row := range input.Rows {
		rowNumber := index + 1
		student, ok, resolveErr := s.repo.ResolveAcademicStudent(ctx, actor.TenantID, row)
		errors := []string{}
		if resolveErr != nil {
			errors = append(errors, "Öğrenci okunamadı.")
		} else if !ok {
			errors = append(errors, "Öğrenci bulunamadı.")
		}
		if ok && assessment.ClassID != "" && student.ClassID != assessment.ClassID {
			errors = append(errors, "Öğrenci bu assessment sınıfında değil.")
		}
		if ok {
			if previous, exists := seen[student.ID]; exists {
				errors = append(errors, fmt.Sprintf("Aynı öğrenci %d. satırda zaten var.", previous))
			}
			seen[student.ID] = rowNumber
		}
		if row.Score < 0 || row.Score > assessment.MaxScore {
			errors = append(errors, "Puan assessment maksimumunu aşamaz.")
		}
		if len(errors) > 0 {
			out.Failed++
			out.Rows = append(out.Rows, domain.ImportRowResult{RowNumber: rowNumber, Status: "error", Errors: errors})
			continue
		}
		row.StudentID = student.ID
		valid = append(valid, row)
		out.Rows = append(out.Rows, domain.ImportRowResult{RowNumber: rowNumber, Status: "valid", StudentID: student.ID})
	}
	if len(valid) == 0 {
		return out, nil
	}
	saved, err := s.repo.SaveAcademicResults(ctx, actor.TenantID, assessment.ID, actor.UserID, valid)
	if err != nil {
		return domain.ImportResultsResult{}, err
	}
	out.Imported = len(saved)
	out.Results = saved
	s.repo.RecordOperationalAudit(ctx, actor.TenantID, actor.UserID, "academic.results.import", "academic_assessment", assessment.ID, fmt.Sprintf(`{"imported":%d,"failed":%d}`, out.Imported, out.Failed))
	return out, nil
}

func (s *Service) StudentSummary(ctx context.Context, actor identity.Principal, studentID string) (domain.StudentAcademicSummary, error) {
	studentID = strings.TrimSpace(studentID)
	if studentID == "" {
		return domain.StudentAcademicSummary{}, ErrStudentNotFound
	}
	if actor.Role == identity.RoleTeacher && !s.repo.TeacherCanObserveStudent(ctx, actor.TenantID, actor.UserID, studentID) {
		return domain.StudentAcademicSummary{}, ErrForbidden
	}
	dataset, ok, err := s.repo.StudentAcademicDataset(ctx, actor.TenantID, studentID)
	if err != nil {
		return domain.StudentAcademicSummary{}, err
	}
	if !ok {
		return domain.StudentAcademicSummary{}, ErrStudentNotFound
	}
	return BuildStudentSummary(dataset), nil
}

func (s *Service) GuardianReport(ctx context.Context, actor identity.Principal, studentID string) (domain.StudentAcademicSummary, error) {
	studentID = strings.TrimSpace(studentID)
	if studentID == "" || !s.repo.GuardianHasStudent(ctx, actor.TenantID, actor.UserID, studentID) {
		return domain.StudentAcademicSummary{}, ErrForbidden
	}
	dataset, ok, err := s.repo.StudentAcademicDataset(ctx, actor.TenantID, studentID)
	if err != nil {
		return domain.StudentAcademicSummary{}, err
	}
	if !ok {
		return domain.StudentAcademicSummary{}, ErrForbidden
	}
	return BuildStudentSummary(dataset), nil
}

func (s *Service) ClassSummary(ctx context.Context, actor identity.Principal, classID string) (domain.ClassAcademicSummary, error) {
	if actor.Role == identity.RoleGuardian {
		return domain.ClassAcademicSummary{}, ErrForbidden
	}
	dataset, ok, err := s.repo.ClassAcademicDataset(ctx, actor.TenantID, strings.TrimSpace(classID))
	if err != nil {
		return domain.ClassAcademicSummary{}, err
	}
	if !ok {
		return domain.ClassAcademicSummary{}, ErrClassNotFound
	}
	if actor.Role == identity.RoleTeacher {
		allowed := false
		for _, assessment := range dataset.Assessments {
			if s.repo.TeacherCanManageClassSubject(ctx, actor.TenantID, actor.UserID, dataset.Class.ID, assessment.SubjectID) {
				allowed = true
				break
			}
		}
		if !allowed {
			return domain.ClassAcademicSummary{}, ErrForbidden
		}
	}
	return BuildClassSummary(dataset), nil
}

func (s *Service) validResultRows(ctx context.Context, tenantID string, assessment domain.Assessment, rows []domain.ResultInput) ([]domain.ResultInput, error) {
	out := make([]domain.ResultInput, 0, len(rows))
	seen := map[string]struct{}{}
	for _, row := range rows {
		student, ok, err := s.repo.ResolveAcademicStudent(ctx, tenantID, row)
		if err != nil {
			return nil, err
		}
		if !ok || row.Score < 0 || row.Score > assessment.MaxScore {
			return nil, ErrInvalidInput
		}
		if assessment.ClassID != "" && student.ClassID != assessment.ClassID {
			return nil, ErrInvalidInput
		}
		if _, duplicate := seen[student.ID]; duplicate {
			return nil, ErrInvalidInput
		}
		seen[student.ID] = struct{}{}
		row.StudentID = student.ID
		out = append(out, row)
	}
	return out, nil
}

func normalizeCreateAssessment(input domain.CreateAssessmentInput) domain.CreateAssessmentInput {
	input.Name = strings.TrimSpace(input.Name)
	input.SubjectID = strings.TrimSpace(input.SubjectID)
	input.ClassID = strings.TrimSpace(input.ClassID)
	input.AssessmentType = normalizeAssessmentType(input.AssessmentType)
	input.AssessmentDate = strings.TrimSpace(input.AssessmentDate)
	return input
}

func normalizeUpdateAssessment(input domain.UpdateAssessmentInput) domain.UpdateAssessmentInput {
	if input.Name != nil {
		value := strings.TrimSpace(*input.Name)
		input.Name = &value
	}
	if input.SubjectID != nil {
		value := strings.TrimSpace(*input.SubjectID)
		input.SubjectID = &value
	}
	if input.ClassID != nil {
		value := strings.TrimSpace(*input.ClassID)
		input.ClassID = &value
	}
	if input.AssessmentType != nil {
		value := normalizeAssessmentType(*input.AssessmentType)
		input.AssessmentType = &value
	}
	if input.AssessmentDate != nil {
		value := strings.TrimSpace(*input.AssessmentDate)
		input.AssessmentDate = &value
	}
	return input
}

func validAssessmentInput(name, subjectID string, assessmentType domain.AssessmentType, maxScore float64, date string) bool {
	if name == "" || subjectID == "" || maxScore <= 0 {
		return false
	}
	if assessmentType == "" {
		return false
	}
	_, err := time.Parse("2006-01-02", date)
	return err == nil
}

func normalizeAssessmentType(value domain.AssessmentType) domain.AssessmentType {
	switch value {
	case domain.AssessmentQuiz, domain.AssessmentHomework, domain.AssessmentProject:
		return value
	default:
		return domain.AssessmentExam
	}
}

func BuildStudentSummary(dataset domain.StudentAcademicDataset) domain.StudentAcademicSummary {
	assessmentByID := map[string]domain.Assessment{}
	for _, assessment := range dataset.Assessments {
		assessmentByID[assessment.ID] = assessment
	}
	rows := make([]domain.ResultSummary, 0, len(dataset.Results))
	for _, result := range dataset.Results {
		assessment, ok := assessmentByID[result.AssessmentID]
		if !ok || assessment.MaxScore <= 0 {
			continue
		}
		rows = append(rows, domain.ResultSummary{
			StudentID:      result.StudentID,
			AssessmentID:   assessment.ID,
			AssessmentName: assessment.Name,
			SubjectID:      assessment.SubjectID,
			SubjectName:    assessment.SubjectName,
			AssessmentDate: assessment.AssessmentDate,
			Score:          round1(result.Score),
			MaxScore:       round1(assessment.MaxScore),
			Percent:        round1(result.Score / assessment.MaxScore * 100),
			Note:           result.Note,
		})
	}
	sort.Slice(rows, func(i, j int) bool {
		return rows[i].AssessmentDate > rows[j].AssessmentDate
	})
	subjects := buildStudentSubjectSummaries(rows)
	average := averageResultPercent(rows)
	signals := academicSupportSignals(average, subjects, dataset.Outcomes)
	recent := rows
	if len(recent) > 5 {
		recent = recent[:5]
	}
	return domain.StudentAcademicSummary{
		Student:          dataset.Student,
		AveragePercent:   round1(average),
		AssessmentCount:  len(rows),
		SubjectSummaries: subjects,
		RecentResults:    recent,
		Outcomes:         dataset.Outcomes,
		SupportSignals:   signals,
		AIWeeklySummary:  studentAISummary(dataset.Student.FullName, average, signals),
	}
}

func BuildClassSummary(dataset domain.ClassAcademicDataset) domain.ClassAcademicSummary {
	assessmentByID := map[string]domain.Assessment{}
	for _, assessment := range dataset.Assessments {
		assessmentByID[assessment.ID] = assessment
	}
	rows := make([]domain.ResultSummary, 0, len(dataset.Results))
	studentScores := map[string][]float64{}
	studentByID := map[string]domain.StudentRef{}
	for _, student := range dataset.Students {
		studentByID[student.ID] = student
	}
	for _, result := range dataset.Results {
		assessment, ok := assessmentByID[result.AssessmentID]
		if !ok || assessment.MaxScore <= 0 {
			continue
		}
		percent := result.Score / assessment.MaxScore * 100
		rows = append(rows, domain.ResultSummary{
			StudentID:      result.StudentID,
			AssessmentID:   assessment.ID,
			AssessmentName: assessment.Name,
			SubjectID:      assessment.SubjectID,
			SubjectName:    assessment.SubjectName,
			AssessmentDate: assessment.AssessmentDate,
			Score:          round1(result.Score),
			MaxScore:       round1(assessment.MaxScore),
			Percent:        round1(percent),
		})
		studentScores[result.StudentID] = append(studentScores[result.StudentID], percent)
	}
	subjects := buildClassSubjectSummaries(rows, studentScores, dataset.Results)
	support := make([]domain.StudentSupportSummary, 0)
	for studentID, scores := range studentScores {
		avg := average(scores)
		if avg >= 60 {
			continue
		}
		student := studentByID[studentID]
		support = append(support, domain.StudentSupportSummary{
			StudentID:      student.ID,
			StudentName:    student.FullName,
			SchoolNumber:   student.SchoolNumber,
			AveragePercent: round1(avg),
			Signal:         "Ortalama %60 altında; ders bazlı destek planı önerilir.",
		})
	}
	sort.Slice(support, func(i, j int) bool { return support[i].AveragePercent < support[j].AveragePercent })
	if len(support) > 6 {
		support = support[:6]
	}
	avg := averageResultPercent(rows)
	return domain.ClassAcademicSummary{
		Class:            dataset.Class,
		AveragePercent:   round1(avg),
		AssessmentCount:  len(dataset.Assessments),
		StudentCount:     len(dataset.Students),
		SubjectSummaries: subjects,
		SupportStudents:  support,
		AIWeeklySummary:  classAISummary(dataset.Class.Name, avg, len(support)),
	}
}

func buildStudentSubjectSummaries(rows []domain.ResultSummary) []domain.SubjectAcademicSummary {
	grouped := map[string][]domain.ResultSummary{}
	for _, row := range rows {
		grouped[row.SubjectID] = append(grouped[row.SubjectID], row)
	}
	out := make([]domain.SubjectAcademicSummary, 0, len(grouped))
	for subjectID, items := range grouped {
		sort.Slice(items, func(i, j int) bool { return items[i].AssessmentDate < items[j].AssessmentDate })
		percents := make([]float64, 0, len(items))
		for _, item := range items {
			percents = append(percents, item.Percent)
		}
		latest := items[len(items)-1]
		out = append(out, domain.SubjectAcademicSummary{
			SubjectID:       subjectID,
			SubjectName:     latest.SubjectName,
			AveragePercent:  round1(average(percents)),
			AssessmentCount: len(items),
			LatestScore:     latest.Score,
			LatestMaxScore:  latest.MaxScore,
			Trend:           trend(percents),
			NeedsSupport:    average(percents) < 60 || trend(percents) == "down",
		})
	}
	sort.Slice(out, func(i, j int) bool { return out[i].SubjectName < out[j].SubjectName })
	return out
}

func buildClassSubjectSummaries(rows []domain.ResultSummary, _ map[string][]float64, _ []domain.Result) []domain.ClassSubjectSummary {
	grouped := map[string][]domain.ResultSummary{}
	for _, row := range rows {
		grouped[row.SubjectID] = append(grouped[row.SubjectID], row)
	}
	out := make([]domain.ClassSubjectSummary, 0, len(grouped))
	for subjectID, items := range grouped {
		sort.Slice(items, func(i, j int) bool { return items[i].AssessmentDate < items[j].AssessmentDate })
		percents := make([]float64, 0, len(items))
		for _, item := range items {
			percents = append(percents, item.Percent)
		}
		studentSubjectScores := map[string][]float64{}
		for _, item := range items {
			if item.StudentID == "" {
				continue
			}
			studentSubjectScores[item.StudentID] = append(studentSubjectScores[item.StudentID], item.Percent)
		}
		needsSupportCount := 0
		for _, scores := range studentSubjectScores {
			if average(scores) < 60 {
				needsSupportCount++
			}
		}
		out = append(out, domain.ClassSubjectSummary{
			SubjectID:         subjectID,
			SubjectName:       items[0].SubjectName,
			AveragePercent:    round1(average(percents)),
			AssessmentCount:   len(items),
			Trend:             trend(percents),
			NeedsSupportCount: needsSupportCount,
		})
	}
	sort.Slice(out, func(i, j int) bool { return out[i].SubjectName < out[j].SubjectName })
	return out
}

func averageResultPercent(rows []domain.ResultSummary) float64 {
	values := make([]float64, 0, len(rows))
	for _, row := range rows {
		values = append(values, row.Percent)
	}
	return average(values)
}

func average(values []float64) float64 {
	if len(values) == 0 {
		return 0
	}
	total := 0.0
	for _, value := range values {
		total += value
	}
	return total / float64(len(values))
}

func trend(values []float64) string {
	if len(values) < 2 {
		return "not_enough_data"
	}
	delta := values[len(values)-1] - values[0]
	if delta >= 5 {
		return "up"
	}
	if delta <= -5 {
		return "down"
	}
	return "stable"
}

func academicSupportSignals(averagePercent float64, subjects []domain.SubjectAcademicSummary, outcomes []domain.StudentOutcomeProgress) []string {
	signals := []string{}
	if averagePercent > 0 && averagePercent < 60 {
		signals = append(signals, "Genel akademik ortalama %60 altında.")
	}
	for _, subject := range subjects {
		if subject.NeedsSupport {
			signals = append(signals, fmt.Sprintf("%s dersinde destek ihtiyacı var.", subject.SubjectName))
		}
	}
	for _, outcome := range outcomes {
		if outcome.Status == domain.OutcomeNeedsSupport {
			signals = append(signals, fmt.Sprintf("%s kazanımı destek bekliyor.", outcome.OutcomeCode))
		}
	}
	if len(signals) == 0 {
		signals = append(signals, "Belirgin akademik risk sinyali yok.")
	}
	return signals
}

func studentAISummary(studentName string, averagePercent float64, signals []string) string {
	if averagePercent == 0 {
		return "Henüz yeterli akademik veri yok; ilk sonuçlar girildikten sonra haftalık özet oluşur."
	}
	return fmt.Sprintf("%s için haftalık akademik ortalama %0.1f. %s", studentName, round1(averagePercent), signals[0])
}

func classAISummary(className string, averagePercent float64, supportCount int) string {
	if averagePercent == 0 {
		return "Sınıf için henüz akademik sonuç girilmemiş."
	}
	if supportCount > 0 {
		return fmt.Sprintf("%s ortalaması %0.1f; %d öğrenci için destek takibi önerilir.", className, round1(averagePercent), supportCount)
	}
	return fmt.Sprintf("%s ortalaması %0.1f; bu hafta belirgin sınıf geneli risk yok.", className, round1(averagePercent))
}

func round1(value float64) float64 {
	if math.IsNaN(value) || math.IsInf(value, 0) {
		return 0
	}
	return math.Round(value*10) / 10
}
