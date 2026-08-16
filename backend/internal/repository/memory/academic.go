package memory

import (
	"context"
	"errors"
	"fmt"
	"sort"
	"strings"

	academicdomain "ots/backend/internal/domain/academic"
	"ots/backend/internal/domain/school"
)

func (s *Store) ListAcademicAssessments(_ context.Context, tenantID string) ([]academicdomain.Assessment, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	if tenantID != s.tenant.ID {
		return []academicdomain.Assessment{}, nil
	}
	out := append([]academicdomain.Assessment(nil), s.academicAssessments...)
	sort.Slice(out, func(i, j int) bool {
		if out[i].AssessmentDate == out[j].AssessmentDate {
			return out[i].Name < out[j].Name
		}
		return out[i].AssessmentDate > out[j].AssessmentDate
	})
	return out, nil
}

func (s *Store) GetAcademicAssessment(_ context.Context, tenantID, assessmentID string) (academicdomain.Assessment, bool, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	if tenantID != s.tenant.ID {
		return academicdomain.Assessment{}, false, nil
	}
	for _, item := range s.academicAssessments {
		if item.ID == assessmentID {
			return item, true, nil
		}
	}
	return academicdomain.Assessment{}, false, nil
}

func (s *Store) CreateAcademicAssessment(_ context.Context, tenantID, actorUserID string, input academicdomain.CreateAssessmentInput) (academicdomain.Assessment, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if tenantID != s.tenant.ID {
		return academicdomain.Assessment{}, errors.New("tenant not found")
	}
	subject, ok := s.academicSubjectLocked(input.SubjectID)
	if !ok {
		return academicdomain.Assessment{}, school.ErrSubjectNotFound
	}
	className := ""
	if input.ClassID != "" {
		class, found := s.classByIDLocked(input.ClassID)
		if !found {
			return academicdomain.Assessment{}, school.ErrClassNotFound
		}
		className = class.Name
	}
	now := s.clock()
	item := academicdomain.Assessment{
		ID:             fmt.Sprintf("assessment-%d", len(s.academicAssessments)+1),
		TenantID:       tenantID,
		Name:           strings.TrimSpace(input.Name),
		SubjectID:      subject.ID,
		SubjectName:    subject.Name,
		ClassID:        strings.TrimSpace(input.ClassID),
		ClassName:      className,
		AssessmentType: input.AssessmentType,
		MaxScore:       input.MaxScore,
		AssessmentDate: input.AssessmentDate,
		CreatedBy:      actorUserID,
		CreatedAt:      now,
		UpdatedAt:      now,
	}
	s.academicAssessments = append(s.academicAssessments, item)
	return item, nil
}

func (s *Store) UpdateAcademicAssessment(_ context.Context, tenantID, assessmentID string, input academicdomain.UpdateAssessmentInput) (academicdomain.Assessment, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if tenantID != s.tenant.ID {
		return academicdomain.Assessment{}, errors.New("tenant not found")
	}
	for index := range s.academicAssessments {
		if s.academicAssessments[index].ID != assessmentID {
			continue
		}
		item := s.academicAssessments[index]
		if input.Name != nil {
			item.Name = *input.Name
		}
		if input.SubjectID != nil {
			subject, ok := s.academicSubjectLocked(*input.SubjectID)
			if !ok {
				return academicdomain.Assessment{}, school.ErrSubjectNotFound
			}
			item.SubjectID = subject.ID
			item.SubjectName = subject.Name
		}
		if input.ClassID != nil {
			item.ClassID = *input.ClassID
			item.ClassName = ""
			if item.ClassID != "" {
				class, ok := s.classByIDLocked(item.ClassID)
				if !ok {
					return academicdomain.Assessment{}, school.ErrClassNotFound
				}
				item.ClassName = class.Name
			}
		}
		if input.AssessmentType != nil {
			item.AssessmentType = *input.AssessmentType
		}
		if input.MaxScore != nil {
			item.MaxScore = *input.MaxScore
		}
		if input.AssessmentDate != nil {
			item.AssessmentDate = *input.AssessmentDate
		}
		item.UpdatedAt = s.clock()
		s.academicAssessments[index] = item
		return item, nil
	}
	return academicdomain.Assessment{}, errors.New("assessment not found")
}

func (s *Store) DeleteAcademicAssessment(_ context.Context, tenantID, assessmentID string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	if tenantID != s.tenant.ID {
		return errors.New("tenant not found")
	}
	for index := range s.academicAssessments {
		if s.academicAssessments[index].ID != assessmentID {
			continue
		}
		s.academicAssessments = append(s.academicAssessments[:index], s.academicAssessments[index+1:]...)
		filtered := s.academicResults[:0]
		for _, result := range s.academicResults {
			if result.AssessmentID != assessmentID {
				filtered = append(filtered, result)
			}
		}
		s.academicResults = filtered
		return nil
	}
	return errors.New("assessment not found")
}

func (s *Store) ListAcademicResults(_ context.Context, tenantID, assessmentID string) ([]academicdomain.Result, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	if tenantID != s.tenant.ID {
		return []academicdomain.Result{}, nil
	}
	out := make([]academicdomain.Result, 0)
	for _, item := range s.academicResults {
		if item.AssessmentID == assessmentID {
			out = append(out, item)
		}
	}
	sort.Slice(out, func(i, j int) bool {
		if out[i].ClassName == out[j].ClassName {
			return out[i].StudentName < out[j].StudentName
		}
		return out[i].ClassName < out[j].ClassName
	})
	return out, nil
}

func (s *Store) SaveAcademicResults(_ context.Context, tenantID, assessmentID, _ string, rows []academicdomain.ResultInput) ([]academicdomain.Result, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if tenantID != s.tenant.ID {
		return nil, errors.New("tenant not found")
	}
	if _, ok := s.academicAssessmentLocked(assessmentID); !ok {
		return nil, errors.New("assessment not found")
	}
	now := s.clock()
	out := make([]academicdomain.Result, 0, len(rows))
	for _, row := range rows {
		student, ok := s.resolveAcademicStudentLocked(row)
		if !ok {
			continue
		}
		result := academicdomain.Result{
			ID:           fmt.Sprintf("academic-result-%d", len(s.academicResults)+1),
			TenantID:     tenantID,
			AssessmentID: assessmentID,
			StudentID:    student.ID,
			StudentName:  student.FullName,
			ClassID:      student.ClassID,
			ClassName:    student.ClassName,
			Score:        row.Score,
			Percentile:   row.Percentile,
			Note:         strings.TrimSpace(row.Note),
			CreatedAt:    now,
			UpdatedAt:    now,
		}
		replaced := false
		for index := range s.academicResults {
			if s.academicResults[index].AssessmentID == assessmentID && s.academicResults[index].StudentID == student.ID {
				result.ID = s.academicResults[index].ID
				result.CreatedAt = s.academicResults[index].CreatedAt
				s.academicResults[index] = result
				replaced = true
				break
			}
		}
		if !replaced {
			s.academicResults = append(s.academicResults, result)
		}
		out = append(out, result)
	}
	return out, nil
}

func (s *Store) ResolveAcademicStudent(_ context.Context, tenantID string, input academicdomain.ResultInput) (academicdomain.StudentRef, bool, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	if tenantID != s.tenant.ID {
		return academicdomain.StudentRef{}, false, nil
	}
	student, ok := s.resolveAcademicStudentLocked(input)
	return student, ok, nil
}

func (s *Store) StudentAcademicDataset(_ context.Context, tenantID, studentID string) (academicdomain.StudentAcademicDataset, bool, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	if tenantID != s.tenant.ID {
		return academicdomain.StudentAcademicDataset{}, false, nil
	}
	student, ok := s.academicStudentRefLocked(studentID)
	if !ok {
		return academicdomain.StudentAcademicDataset{}, false, nil
	}
	results := make([]academicdomain.Result, 0)
	assessmentIDs := map[string]struct{}{}
	for _, result := range s.academicResults {
		if result.StudentID == studentID {
			results = append(results, result)
			assessmentIDs[result.AssessmentID] = struct{}{}
		}
	}
	assessments := make([]academicdomain.Assessment, 0)
	for _, assessment := range s.academicAssessments {
		if _, ok := assessmentIDs[assessment.ID]; ok {
			assessments = append(assessments, assessment)
		}
	}
	outcomes := make([]academicdomain.StudentOutcomeProgress, 0)
	for _, item := range s.outcomeProgress {
		if item.StudentID == studentID {
			outcomes = append(outcomes, item)
		}
	}
	return academicdomain.StudentAcademicDataset{Student: student, Assessments: assessments, Results: results, Outcomes: outcomes}, true, nil
}

func (s *Store) ClassAcademicDataset(_ context.Context, tenantID, classID string) (academicdomain.ClassAcademicDataset, bool, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	if tenantID != s.tenant.ID {
		return academicdomain.ClassAcademicDataset{}, false, nil
	}
	class, ok := s.classByIDLocked(classID)
	if !ok {
		return academicdomain.ClassAcademicDataset{}, false, nil
	}
	students := make([]academicdomain.StudentRef, 0)
	studentIDs := map[string]struct{}{}
	for _, student := range s.students {
		if student.ClassID == classID {
			ref, ok := s.academicStudentRefLocked(student.ID)
			if ok {
				students = append(students, ref)
				studentIDs[student.ID] = struct{}{}
			}
		}
	}
	results := make([]academicdomain.Result, 0)
	assessmentIDs := map[string]struct{}{}
	for _, result := range s.academicResults {
		if _, ok := studentIDs[result.StudentID]; ok {
			results = append(results, result)
			assessmentIDs[result.AssessmentID] = struct{}{}
		}
	}
	assessments := make([]academicdomain.Assessment, 0)
	for _, assessment := range s.academicAssessments {
		if assessment.ClassID == classID {
			assessments = append(assessments, assessment)
			continue
		}
		if _, ok := assessmentIDs[assessment.ID]; ok {
			assessments = append(assessments, assessment)
		}
	}
	return academicdomain.ClassAcademicDataset{
		Class:       academicdomain.ClassRef{ID: class.ID, Name: class.Name},
		Students:    students,
		Assessments: assessments,
		Results:     results,
	}, true, nil
}

func (s *Store) TeacherCanManageClassSubject(_ context.Context, tenantID, teacherUserID, classID, subjectID string) bool {
	s.mu.RLock()
	defer s.mu.RUnlock()
	if tenantID != s.tenant.ID {
		return false
	}
	for _, schedule := range s.schedules {
		if schedule.Status != "published" {
			continue
		}
		for _, lesson := range schedule.Lessons {
			if lesson.TeacherID != teacherUserID {
				continue
			}
			if classID != "" && lesson.ClassID != classID {
				continue
			}
			if subjectID != "" && lesson.SubjectID != subjectID {
				continue
			}
			return true
		}
	}
	return false
}

func (s *Store) academicAssessmentLocked(id string) (academicdomain.Assessment, bool) {
	for _, item := range s.academicAssessments {
		if item.ID == id {
			return item, true
		}
	}
	return academicdomain.Assessment{}, false
}

func (s *Store) academicSubjectLocked(id string) (school.Subject, bool) {
	for _, subject := range s.subjects {
		if subject.ID == id {
			return subject, true
		}
	}
	return school.Subject{}, false
}

func (s *Store) resolveAcademicStudentLocked(input academicdomain.ResultInput) (academicdomain.StudentRef, bool) {
	studentID := strings.TrimSpace(input.StudentID)
	number := strings.TrimSpace(input.SchoolNumber)
	name := strings.ToLower(strings.TrimSpace(input.FullName))
	for _, student := range s.students {
		if studentID != "" && student.ID != studentID {
			continue
		}
		if studentID == "" && number != "" && student.Number != number {
			continue
		}
		if studentID == "" && number == "" && name != "" && strings.ToLower(student.FullName) != name {
			continue
		}
		return s.academicStudentRefFromStudentLocked(student), true
	}
	return academicdomain.StudentRef{}, false
}

func (s *Store) academicStudentRefLocked(studentID string) (academicdomain.StudentRef, bool) {
	student, ok := s.studentByIDLocked(studentID)
	if !ok {
		return academicdomain.StudentRef{}, false
	}
	return s.academicStudentRefFromStudentLocked(student), true
}

func (s *Store) academicStudentRefFromStudentLocked(student school.Student) academicdomain.StudentRef {
	className := ""
	if class, ok := s.classByIDLocked(student.ClassID); ok {
		className = class.Name
	}
	return academicdomain.StudentRef{
		ID:           student.ID,
		FullName:     student.FullName,
		SchoolNumber: student.Number,
		ClassID:      student.ClassID,
		ClassName:    className,
	}
}
