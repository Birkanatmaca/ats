package guidance

import (
	"context"
	"fmt"
	"sort"
	"strings"
	"time"

	domain "ots/backend/internal/domain/guidance"
	observationdomain "ots/backend/internal/domain/observation"
)

const (
	earlyWarningAbsentThreshold     = 3
	earlyWarningObservationWindow   = 14 * 24 * time.Hour
	earlyWarningObservationRepeat   = 2
)

var riskObservationCategories = map[string]bool{
	string(observationdomain.CategoryAbsenceRisk):  true,
	string(observationdomain.CategoryAttention):    true,
	string(observationdomain.CategoryBehavior):     true,
	string(observationdomain.CategoryAcademicDrop): true,
}

var observationCategoryLabels = map[string]string{
	string(observationdomain.CategoryParticipation): "Derse katılım",
	string(observationdomain.CategoryAttention):     "Dikkat durumu",
	string(observationdomain.CategoryBehavior):      "Davranış değişikliği",
	string(observationdomain.CategorySocial):        "Sosyal uyum",
	string(observationdomain.CategoryAbsenceRisk):   "Devamsızlık eğilimi",
	string(observationdomain.CategoryAcademicDrop):  "Akademik performans düşüşü",
	string(observationdomain.CategoryTeacherNote):   "Öğretmen notu",
}

func (s *Service) ListEarlyWarnings(ctx context.Context, tenantID, userID, role string) ([]domain.EarlyWarningSignal, error) {
	students, err := s.repo.ListGuidanceStudents(ctx, tenantID, userID)
	if err != nil {
		return nil, err
	}

	observations := s.repo.ListObservations(ctx, tenantID)
	obsByStudent := map[string][]observationdomain.Observation{}
	cutoff := time.Now().Add(-earlyWarningObservationWindow)
	for _, item := range observations {
		if item.CreatedAt.Before(cutoff) {
			continue
		}
		obsByStudent[item.StudentID] = append(obsByStudent[item.StudentID], item)
	}

	openCasesByStudent := map[string]bool{}
	for _, item := range s.ListCases(ctx, tenantID, userID, role, "", "") {
		if item.Status != domain.CaseStatusClosed {
			openCasesByStudent[item.StudentID] = true
		}
	}

	signals := make([]domain.EarlyWarningSignal, 0)
	seen := map[string]bool{}

	for _, student := range students {
		if !s.repo.GuidanceCanAccessStudent(ctx, tenantID, userID, student.ID) {
			continue
		}
		hasOpenCase := openCasesByStudent[student.ID]

		if summary, ok := s.repo.StudentAttendanceSummary(ctx, tenantID, student.ID); ok {
			if summary.Absent >= earlyWarningAbsentThreshold {
				key := student.ID + ":attendance"
				if !seen[key] {
					seen[key] = true
					signals = append(signals, domain.EarlyWarningSignal{
						ID:              fmt.Sprintf("%s-attendance", student.ID),
						StudentID:       student.ID,
						StudentName:     student.FullName,
						ClassName:       student.ClassName,
						SignalType:      "attendance_absent",
						Severity:        earlyWarningSeverityFromAbsent(summary.Absent),
						Title:           "Artan devamsızlık",
						Summary:         fmt.Sprintf("Yoklama özetinde %d devamsızlık kaydı bulunuyor.", summary.Absent),
						SuggestedAction: earlyWarningSuggestedAction(hasOpenCase),
						HasOpenCase:     hasOpenCase,
						DetectedAt:      time.Now(),
					})
				}
			}
		}

		categoryCounts := map[string]int{}
		for _, observation := range obsByStudent[student.ID] {
			categoryCounts[string(observation.Category)]++
		}
		for category, count := range categoryCounts {
			if count < earlyWarningObservationRepeat {
				continue
			}
			key := student.ID + ":obs:" + category
			if seen[key] {
				continue
			}
			seen[key] = true
			label := observationCategoryLabels[category]
			if label == "" {
				label = category
			}
			severity := "medium"
			if riskObservationCategories[category] {
				severity = "high"
			}
			signals = append(signals, domain.EarlyWarningSignal{
				ID:              fmt.Sprintf("%s-obs-%s", student.ID, category),
				StudentID:       student.ID,
				StudentName:     student.FullName,
				ClassName:       student.ClassName,
				SignalType:      "observation_repeat",
				Severity:        severity,
				Title:           "Tekrarlayan öğretmen gözlemi",
				Summary:         fmt.Sprintf("Son 14 günde %s kategorisinde %d gözlem kaydı var.", label, count),
				SuggestedAction: earlyWarningSuggestedAction(hasOpenCase),
				HasOpenCase:     hasOpenCase,
				DetectedAt:      time.Now(),
			})
		}

		if _, ok := s.repo.GetRiskTrackingByStudent(ctx, tenantID, student.ID); ok && !hasOpenCase {
			key := student.ID + ":risk"
			if !seen[key] {
				seen[key] = true
				signals = append(signals, domain.EarlyWarningSignal{
					ID:              fmt.Sprintf("%s-risk", student.ID),
					StudentID:       student.ID,
					StudentName:     student.FullName,
					ClassName:       student.ClassName,
					SignalType:      "risk_without_case",
					Severity:        "high",
					Title:           "Risk takibi açık, vaka yok",
					Summary:         "Öğrenci risk takibinde ancak aktif vaka dosyası bulunmuyor.",
					SuggestedAction: "Vaka dosyası açmayı değerlendirin.",
					HasOpenCase:     false,
					DetectedAt:      time.Now(),
				})
			}
		}
	}

	sort.Slice(signals, func(i, j int) bool {
		if earlyWarningSeverityRank(signals[i].Severity) != earlyWarningSeverityRank(signals[j].Severity) {
			return earlyWarningSeverityRank(signals[i].Severity) > earlyWarningSeverityRank(signals[j].Severity)
		}
		return strings.ToLower(signals[i].StudentName) < strings.ToLower(signals[j].StudentName)
	})

	return signals, nil
}

func earlyWarningSeverityFromAbsent(absent int) string {
	if absent >= 5 {
		return "high"
	}
	return "medium"
}

func earlyWarningSeverityRank(severity string) int {
	switch severity {
	case "high":
		return 2
	case "medium":
		return 1
	default:
		return 0
	}
}

func earlyWarningSuggestedAction(hasOpenCase bool) string {
	if hasOpenCase {
		return "Mevcut vaka dosyasını ve zaman çizelgesini gözden geçirin."
	}
	return "Vaka dosyası açmayı değerlendirin."
}
