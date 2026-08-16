package memory

import (
	"context"
	"fmt"
	"strings"

	guidancedomain "ots/backend/internal/domain/guidance"
	"ots/backend/internal/domain/school"
)

type guidanceNoteRecord struct {
	guidancedomain.Note
	Deleted bool
}

type supportPlanRecord struct {
	guidancedomain.SupportPlan
	Deleted bool
}

type riskTrackingRecord struct {
	guidancedomain.RiskTracking
	Deleted bool
}

func memorySplitFullName(fullName string) (string, string) {
	parts := strings.Fields(strings.TrimSpace(fullName))
	if len(parts) == 0 {
		return "", ""
	}
	if len(parts) == 1 {
		return parts[0], ""
	}
	return parts[0], strings.Join(parts[1:], " ")
}

func memoryClassName(classes []school.Class, classID string) string {
	for _, c := range classes {
		if c.ID == classID {
			return c.Name
		}
	}
	return ""
}

func (s *Store) GuidanceCanAccessStudent(_ context.Context, tenantID, _, studentID string) bool {
	s.mu.RLock()
	defer s.mu.RUnlock()
	for _, st := range s.students {
		if st.TenantID == tenantID && st.ID == studentID {
			return true
		}
	}
	return false
}

func (s *Store) ListGuidanceStudents(_ context.Context, tenantID, _ string) ([]guidancedomain.Student, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := make([]guidancedomain.Student, 0, len(s.students))
	for _, st := range s.students {
		if st.TenantID != tenantID {
			continue
		}
		first, last := memorySplitFullName(st.FullName)
		out = append(out, guidancedomain.Student{
			ID:           st.ID,
			SchoolNumber: st.Number,
			FirstName:    first,
			LastName:     last,
			FullName:     st.FullName,
			ClassID:      st.ClassID,
			ClassName:    memoryClassName(s.classes, st.ClassID),
			Status:       string(st.Status),
		})
	}
	return out, nil
}

func (s *Store) ensureGuidanceNotes() map[string]*guidanceNoteRecord {
	if s.guidanceNotes == nil {
		s.guidanceNotes = make(map[string]*guidanceNoteRecord)
	}
	return s.guidanceNotes
}

func (s *Store) ensureSupportPlans() map[string]*supportPlanRecord {
	if s.supportPlans == nil {
		s.supportPlans = make(map[string]*supportPlanRecord)
	}
	return s.supportPlans
}

func (s *Store) ensureRiskTrackings() map[string]*riskTrackingRecord {
	if s.guidanceRiskTrackings == nil {
		s.guidanceRiskTrackings = make(map[string]*riskTrackingRecord)
	}
	return s.guidanceRiskTrackings
}

func memoryFindStudent(students []school.Student, id string) (school.Student, bool) {
	for _, st := range students {
		if st.ID == id {
			return st, true
		}
	}
	return school.Student{}, false
}

func memoryAuthorName(users []systemUser, authorID string) string {
	for _, u := range users {
		if u.ID == authorID {
			return u.FullName
		}
	}
	return "Rehberlik"
}

func (s *Store) ListGuidanceNotes(_ context.Context, tenantID, studentID string) ([]guidancedomain.Note, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := make([]guidancedomain.Note, 0)
	for _, rec := range s.ensureGuidanceNotes() {
		if rec.Deleted || rec.TenantID != tenantID {
			continue
		}
		if studentID != "" && rec.StudentID != studentID {
			continue
		}
		out = append(out, rec.Note)
	}
	return out, nil
}

func (s *Store) GetGuidanceNote(_ context.Context, tenantID, noteID string) (guidancedomain.Note, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	rec, ok := s.ensureGuidanceNotes()[noteID]
	if !ok || rec.Deleted || rec.TenantID != tenantID {
		return guidancedomain.Note{}, false
	}
	return rec.Note, true
}

func (s *Store) CreateGuidanceNote(_ context.Context, tenantID, authorID string, input guidancedomain.CreateNoteInput) (guidancedomain.Note, bool) {
	s.mu.Lock()
	defer s.mu.Unlock()
	st, ok := memoryFindStudent(s.students, input.StudentID)
	if !ok || st.TenantID != tenantID {
		return guidancedomain.Note{}, false
	}
	now := s.clock()
	id := fmt.Sprintf("guidance-note-%d", len(s.ensureGuidanceNotes())+1)
	item := guidancedomain.Note{
		ID:          id,
		TenantID:    tenantID,
		StudentID:   input.StudentID,
		StudentName: st.FullName,
		ClassName:   memoryClassName(s.classes, st.ClassID),
		AuthorID:    authorID,
		AuthorName:  memoryAuthorName(s.users, authorID),
		NoteType:    input.NoteType,
		Title:       input.Title,
		Body:        input.Body,
		Sensitivity: "guidance_confidential",
		CreatedAt:   now,
		UpdatedAt:   now,
	}
	s.ensureGuidanceNotes()[id] = &guidanceNoteRecord{Note: item}
	return item, true
}

func (s *Store) UpdateGuidanceNote(_ context.Context, tenantID, noteID string, input guidancedomain.UpdateNoteInput) (guidancedomain.Note, bool) {
	s.mu.Lock()
	defer s.mu.Unlock()
	rec, ok := s.ensureGuidanceNotes()[noteID]
	if !ok || rec.Deleted || rec.TenantID != tenantID {
		return guidancedomain.Note{}, false
	}
	if input.NoteType != nil {
		rec.NoteType = *input.NoteType
	}
	if input.Title != nil {
		rec.Title = *input.Title
	}
	if input.Body != nil {
		rec.Body = *input.Body
	}
	rec.UpdatedAt = s.clock()
	return rec.Note, true
}

func (s *Store) DeleteGuidanceNote(_ context.Context, tenantID, noteID string) bool {
	s.mu.Lock()
	defer s.mu.Unlock()
	rec, ok := s.ensureGuidanceNotes()[noteID]
	if !ok || rec.TenantID != tenantID {
		return false
	}
	rec.Deleted = true
	return true
}

func (s *Store) ListSupportPlans(_ context.Context, tenantID, studentID string) ([]guidancedomain.SupportPlan, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := make([]guidancedomain.SupportPlan, 0)
	for _, rec := range s.ensureSupportPlans() {
		if rec.Deleted || rec.TenantID != tenantID {
			continue
		}
		if studentID != "" && rec.StudentID != studentID {
			continue
		}
		out = append(out, rec.SupportPlan)
	}
	return out, nil
}

func (s *Store) GetSupportPlan(_ context.Context, tenantID, planID string) (guidancedomain.SupportPlan, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	rec, ok := s.ensureSupportPlans()[planID]
	if !ok || rec.Deleted || rec.TenantID != tenantID {
		return guidancedomain.SupportPlan{}, false
	}
	return rec.SupportPlan, true
}

func (s *Store) CreateSupportPlan(_ context.Context, tenantID, ownerID string, input guidancedomain.CreatePlanInput) (guidancedomain.SupportPlan, bool) {
	s.mu.Lock()
	defer s.mu.Unlock()
	st, ok := memoryFindStudent(s.students, input.StudentID)
	if !ok || st.TenantID != tenantID {
		return guidancedomain.SupportPlan{}, false
	}
	now := s.clock()
	id := fmt.Sprintf("support-plan-%d", len(s.ensureSupportPlans())+1)
	item := guidancedomain.SupportPlan{
		ID:          id,
		TenantID:    tenantID,
		StudentID:   input.StudentID,
		StudentName: st.FullName,
		ClassName:   memoryClassName(s.classes, st.ClassID),
		OwnerID:     ownerID,
		OwnerName:   memoryAuthorName(s.users, ownerID),
		Title:       input.Title,
		Description: strings.TrimSpace(input.Description),
		Status:      input.Status,
		DueDate:     input.DueDate,
		CreatedAt:   now,
		UpdatedAt:   now,
	}
	s.ensureSupportPlans()[id] = &supportPlanRecord{SupportPlan: item}
	return item, true
}

func (s *Store) UpdateSupportPlan(_ context.Context, tenantID, planID string, input guidancedomain.UpdatePlanInput) (guidancedomain.SupportPlan, bool) {
	s.mu.Lock()
	defer s.mu.Unlock()
	rec, ok := s.ensureSupportPlans()[planID]
	if !ok || rec.Deleted || rec.TenantID != tenantID {
		return guidancedomain.SupportPlan{}, false
	}
	if input.Title != nil {
		rec.Title = *input.Title
	}
	if input.Description != nil {
		rec.Description = *input.Description
	}
	if input.Status != nil {
		rec.Status = *input.Status
	}
	if input.DueDate != nil {
		rec.DueDate = *input.DueDate
	}
	rec.UpdatedAt = s.clock()
	return rec.SupportPlan, true
}

func (s *Store) DeleteSupportPlan(_ context.Context, tenantID, planID string) bool {
	s.mu.Lock()
	defer s.mu.Unlock()
	rec, ok := s.ensureSupportPlans()[planID]
	if !ok || rec.TenantID != tenantID {
		return false
	}
	rec.Deleted = true
	return true
}

func (s *Store) ListRiskTrackings(_ context.Context, tenantID, studentID string) ([]guidancedomain.RiskTracking, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := make([]guidancedomain.RiskTracking, 0)
	for _, rec := range s.ensureRiskTrackings() {
		if rec.Deleted || rec.TenantID != tenantID {
			continue
		}
		if studentID != "" && rec.StudentID != studentID {
			continue
		}
		out = append(out, rec.RiskTracking)
	}
	return out, nil
}

func (s *Store) GetRiskTrackingByStudent(_ context.Context, tenantID, studentID string) (guidancedomain.RiskTracking, bool) {
	items, _ := s.ListRiskTrackings(context.Background(), tenantID, studentID)
	if len(items) == 0 {
		return guidancedomain.RiskTracking{}, false
	}
	return items[0], true
}

func (s *Store) GetRiskTracking(_ context.Context, tenantID, trackingID string) (guidancedomain.RiskTracking, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	rec, ok := s.ensureRiskTrackings()[trackingID]
	if !ok || rec.Deleted || rec.TenantID != tenantID {
		return guidancedomain.RiskTracking{}, false
	}
	return rec.RiskTracking, true
}

func (s *Store) CreateRiskTracking(_ context.Context, tenantID, counselorID string, input guidancedomain.CreateRiskTrackingInput) (guidancedomain.RiskTracking, bool) {
	s.mu.Lock()
	defer s.mu.Unlock()
	st, ok := memoryFindStudent(s.students, input.StudentID)
	if !ok || st.TenantID != tenantID {
		return guidancedomain.RiskTracking{}, false
	}
	for _, rec := range s.ensureRiskTrackings() {
		if !rec.Deleted && rec.TenantID == tenantID && rec.StudentID == input.StudentID {
			return rec.RiskTracking, true
		}
	}
	now := s.clock()
	id := fmt.Sprintf("risk-tracking-%d", len(s.ensureRiskTrackings())+1)
	item := guidancedomain.RiskTracking{
		ID:            id,
		TenantID:      tenantID,
		StudentID:     input.StudentID,
		StudentName:   st.FullName,
		ClassName:     memoryClassName(s.classes, st.ClassID),
		CounselorID:   counselorID,
		CounselorName: memoryAuthorName(s.users, counselorID),
		Reason:        strings.TrimSpace(input.Reason),
		CreatedAt:     now,
		UpdatedAt:     now,
	}
	s.ensureRiskTrackings()[id] = &riskTrackingRecord{RiskTracking: item}
	return item, true
}

func (s *Store) DeleteRiskTracking(_ context.Context, tenantID, trackingID string) bool {
	s.mu.Lock()
	defer s.mu.Unlock()
	rec, ok := s.ensureRiskTrackings()[trackingID]
	if !ok || rec.TenantID != tenantID || rec.Deleted {
		return false
	}
	rec.Deleted = true
	return true
}
