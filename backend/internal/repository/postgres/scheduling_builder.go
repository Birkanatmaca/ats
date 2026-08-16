package postgres

import (
	"context"
	"encoding/json"
	"fmt"

	schedulingapp "ots/backend/internal/app/scheduling"
	schedulingdomain "ots/backend/internal/domain/scheduling"
)

func (s *Store) ScheduleConflicts(ctx context.Context, tenantID, scheduleID string) schedulingdomain.ConflictsResult {
	schedule, ok := s.GetSchedule(ctx, tenantID, scheduleID)
	if !ok {
		return schedulingdomain.ConflictsResult{
			Valid:         false,
			HardConflicts: []string{"Program bulunamadı."},
		}
	}
	return schedulingapp.BuildConflictsResultWithAvailabilities(
		schedule.Lessons,
		s.ListRequirements(ctx, tenantID),
		s.ListTeacherAvailabilities(ctx, tenantID),
	)
}

func (s *Store) CloneSchedule(ctx context.Context, tenantID, scheduleID, actorUserID string) (schedulingdomain.Schedule, bool, error) {
	source, ok := s.GetSchedule(ctx, tenantID, scheduleID)
	if !ok {
		return schedulingdomain.Schedule{}, false, nil
	}

	version := source.Version + 1
	_ = s.db.QueryRowContext(ctx, `
SELECT COALESCE(MAX(version), 0) + 1 FROM schedules WHERE tenant_id = $1`, tenantID).Scan(&version)

	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return schedulingdomain.Schedule{}, false, err
	}
	defer func() { _ = tx.Rollback() }()

	var newID string
	name := fmt.Sprintf("Kopya — %s", source.Name)
	err = tx.QueryRowContext(ctx, `
INSERT INTO schedules (tenant_id, name, status, version, score, created_by, updated_at)
VALUES ($1, $2, 'draft', $3, $4, $5, now())
RETURNING id::text`, tenantID, name, version, source.Score, nullString(actorUserID)).Scan(&newID)
	if err != nil {
		return schedulingdomain.Schedule{}, false, err
	}

	for _, lesson := range source.Lessons {
		teacherID := s.resolveTeacherProfileID(ctx, tenantID, lesson.TeacherID)
		if teacherID == "" {
			continue
		}
		_, err := tx.ExecContext(ctx, `
INSERT INTO schedule_lessons (tenant_id, schedule_id, class_id, teacher_id, subject_id, day_of_week, starts_at, ends_at, room)
VALUES ($1, $2, $3, $4, $5, $6, $7::time, $8::time, $9)`,
			tenantID, newID, lesson.ClassID, teacherID, lesson.SubjectID,
			lesson.DayOfWeek, normalizeTimeText(lesson.StartTime), normalizeTimeText(lesson.EndTime), nullString(lesson.Room))
		if err != nil {
			return schedulingdomain.Schedule{}, false, err
		}
	}

	if err := tx.Commit(); err != nil {
		return schedulingdomain.Schedule{}, false, err
	}

	s.writeOperationalAudit(ctx, tenantID, actorUserID, "schedule.clone", "schedule", newID, fmt.Sprintf(`{"sourceScheduleId":"%s"}`, scheduleID))

	cloned, ok := s.GetSchedule(ctx, tenantID, newID)
	return cloned, ok, nil
}

func (s *Store) ListScheduleChangeLogs(ctx context.Context, tenantID, scheduleID string, limit int) []schedulingdomain.ScheduleChangeLog {
	if limit <= 0 || limit > 200 {
		limit = 50
	}
	rows, err := s.db.QueryContext(ctx, `
SELECT id::text, tenant_id::text, schedule_id::text, COALESCE(actor_user_id::text, ''),
       COALESCE(lesson_id::text, ''), change_type, before_data, after_data, created_at
FROM schedule_change_logs
WHERE tenant_id = $1 AND schedule_id = $2
ORDER BY created_at DESC
LIMIT $3`, tenantID, scheduleID, limit)
	if err != nil {
		return nil
	}
	defer rows.Close()

	out := make([]schedulingdomain.ScheduleChangeLog, 0)
	for rows.Next() {
		var item schedulingdomain.ScheduleChangeLog
		var beforeRaw, afterRaw []byte
		if err := rows.Scan(
			&item.ID, &item.TenantID, &item.ScheduleID, &item.ActorUserID, &item.LessonID,
			&item.ChangeType, &beforeRaw, &afterRaw, &item.CreatedAt,
		); err != nil {
			continue
		}
		_ = json.Unmarshal(beforeRaw, &item.Before)
		_ = json.Unmarshal(afterRaw, &item.After)
		if item.Before == nil {
			item.Before = map[string]any{}
		}
		if item.After == nil {
			item.After = map[string]any{}
		}
		out = append(out, item)
	}
	return out
}

func (s *Store) appendScheduleChangeLog(ctx context.Context, tenantID, scheduleID, actorUserID, lessonID, changeType string, before, after map[string]any) {
	beforeRaw, _ := json.Marshal(before)
	afterRaw, _ := json.Marshal(after)
	_, _ = s.db.ExecContext(ctx, `
INSERT INTO schedule_change_logs (tenant_id, schedule_id, actor_user_id, lesson_id, change_type, before_data, after_data)
VALUES ($1, $2, NULLIF($3, '')::uuid, NULLIF($4, '')::uuid, $5, $6::jsonb, $7::jsonb)`,
		tenantID, scheduleID, actorUserID, lessonID, changeType, string(beforeRaw), string(afterRaw))
}

func lessonSnapshot(lesson schedulingdomain.Lesson) map[string]any {
	return map[string]any{
		"teacherId": lesson.TeacherID,
		"subjectId": lesson.SubjectID,
		"dayOfWeek": lesson.DayOfWeek,
		"startTime": lesson.StartTime,
		"endTime":   lesson.EndTime,
		"room":      lesson.Room,
	}
}

func (s *Store) SaveTeacherAvailabilitiesBulk(ctx context.Context, tenantID string, items []schedulingdomain.AvailabilityInput) ([]schedulingdomain.TeacherAvailability, error) {
	return s.SaveTeacherAvailabilities(ctx, tenantID, items)
}
