package memory

import (
	"context"
	"encoding/json"
	"fmt"

	schedulingapp "ots/backend/internal/app/scheduling"
	"ots/backend/internal/domain/scheduling"
)

func (s *Store) ScheduleConflicts(_ context.Context, tenantID, scheduleID string) scheduling.ConflictsResult {
	s.mu.RLock()
	defer s.mu.RUnlock()
	schedule, ok := s.schedules[scheduleID]
	if !ok || tenantID != s.tenant.ID {
		return scheduling.ConflictsResult{Valid: false, HardConflicts: []string{"Program bulunamadı."}}
	}
	reqs := make([]scheduling.ClassSubjectRequirement, len(s.requirements))
	copy(reqs, s.requirements)
	availabilities := make([]scheduling.TeacherAvailability, len(s.availabilities))
	copy(availabilities, s.availabilities)
	return schedulingapp.BuildConflictsResultWithAvailabilities(schedule.Lessons, reqs, availabilities)
}

func (s *Store) CloneSchedule(_ context.Context, tenantID, scheduleID, actorUserID string) (scheduling.Schedule, bool, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	source, ok := s.schedules[scheduleID]
	if !ok || tenantID != s.tenant.ID {
		return scheduling.Schedule{}, false, nil
	}
	newID := fmt.Sprintf("schedule-clone-%d", len(s.schedules)+1)
	cloned := source
	cloned.ID = newID
	cloned.Name = fmt.Sprintf("Kopya — %s", source.Name)
	cloned.Status = scheduling.ScheduleDraft
	cloned.Version = source.Version + 1
	cloned.UpdatedAt = s.clock()
	clonedLessons := make([]scheduling.Lesson, len(source.Lessons))
	for i, lesson := range source.Lessons {
		cloneLesson := lesson
		cloneLesson.ID = fmt.Sprintf("%s-copy-%d", lesson.ID, i)
		cloneLesson.ScheduleID = newID
		clonedLessons[i] = cloneLesson
	}
	cloned.Lessons = clonedLessons
	s.schedules[newID] = cloned
	s.appendOperationalAuditLocked(actorUserID, "schedule.clone", "schedule", newID, fmt.Sprintf(`{"sourceScheduleId":"%s"}`, scheduleID))
	return cloned, true, nil
}

func (s *Store) ListScheduleChangeLogs(_ context.Context, tenantID, scheduleID string, limit int) []scheduling.ScheduleChangeLog {
	s.mu.RLock()
	defer s.mu.RUnlock()
	if tenantID != s.tenant.ID {
		return nil
	}
	if limit <= 0 || limit > 200 {
		limit = 50
	}
	items := s.scheduleChangeLogs[scheduleID]
	if len(items) <= limit {
		out := make([]scheduling.ScheduleChangeLog, len(items))
		copy(out, items)
		return out
	}
	out := make([]scheduling.ScheduleChangeLog, limit)
	copy(out, items[:limit])
	return out
}

func (s *Store) SaveTeacherAvailabilitiesBulk(ctx context.Context, tenantID string, items []scheduling.AvailabilityInput) ([]scheduling.TeacherAvailability, error) {
	return s.SaveTeacherAvailabilities(ctx, tenantID, items)
}

func memoryLessonSnapshot(lesson scheduling.Lesson) map[string]any {
	return map[string]any{
		"teacherId": lesson.TeacherID,
		"subjectId": lesson.SubjectID,
		"dayOfWeek": lesson.DayOfWeek,
		"startTime": lesson.StartTime,
		"endTime":   lesson.EndTime,
		"room":      lesson.Room,
	}
}

func (s *Store) appendScheduleChangeLogLocked(scheduleID, actorUserID, lessonID, changeType string, before, after map[string]any) {
	beforeCopy := map[string]any{}
	afterCopy := map[string]any{}
	rawBefore, _ := json.Marshal(before)
	rawAfter, _ := json.Marshal(after)
	_ = json.Unmarshal(rawBefore, &beforeCopy)
	_ = json.Unmarshal(rawAfter, &afterCopy)
	entry := scheduling.ScheduleChangeLog{
		ID:          fmt.Sprintf("scl-%d", len(s.scheduleChangeLogs[scheduleID])+1),
		TenantID:    s.tenant.ID,
		ScheduleID:  scheduleID,
		ActorUserID: actorUserID,
		LessonID:    lessonID,
		ChangeType:  changeType,
		Before:      beforeCopy,
		After:       afterCopy,
		CreatedAt:   s.clock(),
	}
	s.scheduleChangeLogs[scheduleID] = append([]scheduling.ScheduleChangeLog{entry}, s.scheduleChangeLogs[scheduleID]...)
}
