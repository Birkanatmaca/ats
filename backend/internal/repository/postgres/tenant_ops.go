package postgres

import (
	"context"
	"database/sql"
	"fmt"
	"strings"
	"time"

	dashboarddomain "ots/backend/internal/domain/dashboard"
	observationdomain "ots/backend/internal/domain/observation"
	schooldomain "ots/backend/internal/domain/school"
	platformaudit "ots/backend/internal/platform/audit"
)

func (s *Store) CurrentTenant(ctx context.Context, tenantID string) (schooldomain.Tenant, bool) {
	var tenant schooldomain.Tenant
	var modulesRaw []byte
	err := s.db.QueryRowContext(ctx, `
SELECT id::text, name, plan, timezone, enabled_modules
FROM tenants
WHERE id = $1 AND deleted_at IS NULL`, tenantID).Scan(&tenant.ID, &tenant.Name, &tenant.Plan, &tenant.Timezone, &modulesRaw)
	if err != nil {
		return schooldomain.Tenant{}, false
	}
	tenant.EnabledModules = s.scanTenantModules(modulesRaw)
	return tenant, true
}

func (s *Store) ListAnnouncements(ctx context.Context, tenantID string) []schooldomain.Announcement {
	rows, err := s.db.QueryContext(ctx, `
SELECT id::text, tenant_id::text, title, body, audience, published_at
FROM announcements
WHERE tenant_id = $1 AND published_at IS NOT NULL
ORDER BY published_at DESC`, tenantID)
	if err != nil {
		return nil
	}
	defer rows.Close()

	out := make([]schooldomain.Announcement, 0)
	for rows.Next() {
		var item schooldomain.Announcement
		var publishedAt sql.NullTime
		if err := rows.Scan(&item.ID, &item.TenantID, &item.Title, &item.Body, &item.Audience, &publishedAt); err != nil {
			continue
		}
		if publishedAt.Valid {
			item.PublishedAt = publishedAt.Time
		}
		out = append(out, item)
	}
	return out
}

func (s *Store) CreateAnnouncement(ctx context.Context, tenantID string, createdBy string, input schooldomain.CreateAnnouncementInput) (schooldomain.Announcement, bool) {
	var item schooldomain.Announcement
	var publishedAt time.Time
	err := s.db.QueryRowContext(ctx, `
INSERT INTO announcements (tenant_id, title, body, audience, published_at, created_by)
VALUES ($1, $2, $3, $4, now(), NULLIF($5, '')::uuid)
RETURNING id::text, tenant_id::text, title, body, audience, published_at`,
		tenantID, input.Title, input.Body, input.Audience, createdBy,
	).Scan(&item.ID, &item.TenantID, &item.Title, &item.Body, &item.Audience, &publishedAt)
	if err != nil {
		return schooldomain.Announcement{}, false
	}
	item.PublishedAt = publishedAt
	return item, true
}

func (s *Store) UpdateAnnouncement(ctx context.Context, tenantID string, announcementID string, input schooldomain.UpdateAnnouncementInput) (schooldomain.Announcement, bool) {
	current, ok := s.getAnnouncement(ctx, tenantID, announcementID)
	if !ok {
		return schooldomain.Announcement{}, false
	}
	if input.Title != nil {
		current.Title = strings.TrimSpace(*input.Title)
	}
	if input.Body != nil {
		current.Body = strings.TrimSpace(*input.Body)
	}
	if input.Audience != nil {
		current.Audience = strings.TrimSpace(*input.Audience)
	}

	var publishedAt sql.NullTime
	err := s.db.QueryRowContext(ctx, `
UPDATE announcements
SET title = $1, body = $2, audience = $3
WHERE tenant_id = $4 AND id = $5
RETURNING id::text, tenant_id::text, title, body, audience, published_at`,
		current.Title, current.Body, current.Audience, tenantID, announcementID,
	).Scan(&current.ID, &current.TenantID, &current.Title, &current.Body, &current.Audience, &publishedAt)
	if err != nil {
		return schooldomain.Announcement{}, false
	}
	if publishedAt.Valid {
		current.PublishedAt = publishedAt.Time
	}
	return current, true
}

func (s *Store) getAnnouncement(ctx context.Context, tenantID string, announcementID string) (schooldomain.Announcement, bool) {
	var item schooldomain.Announcement
	var publishedAt sql.NullTime
	err := s.db.QueryRowContext(ctx, `
SELECT id::text, tenant_id::text, title, body, audience, published_at
FROM announcements
WHERE tenant_id = $1 AND id = $2`, tenantID, announcementID).Scan(
		&item.ID, &item.TenantID, &item.Title, &item.Body, &item.Audience, &publishedAt,
	)
	if err != nil {
		return schooldomain.Announcement{}, false
	}
	if publishedAt.Valid {
		item.PublishedAt = publishedAt.Time
	}
	return item, true
}

func (s *Store) PrincipalSummary(ctx context.Context, tenantID string) dashboarddomain.PrincipalSummary {
	var students, teachers, classes int
	_ = s.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM students WHERE tenant_id = $1 AND status = 'active' AND deleted_at IS NULL`, tenantID).Scan(&students)
	_ = s.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM teachers WHERE tenant_id = $1`, tenantID).Scan(&teachers)
	_ = s.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM classes WHERE tenant_id = $1 AND deleted_at IS NULL`, tenantID).Scan(&classes)

	todayWeekday := isoWeekday(s.clock())
	var todayLessons, finalizedToday int
	_ = s.db.QueryRowContext(ctx, `
SELECT COUNT(*)
FROM schedule_lessons sl
JOIN schedules sc ON sc.id = sl.schedule_id
WHERE sl.tenant_id = $1 AND sc.status = 'published' AND sl.day_of_week = $2`, tenantID, todayWeekday).Scan(&todayLessons)

	dayStart := time.Date(s.clock().Year(), s.clock().Month(), s.clock().Day(), 0, 0, 0, 0, s.clock().Location())
	dayEnd := dayStart.Add(24 * time.Hour)
	_ = s.db.QueryRowContext(ctx, `
SELECT COUNT(DISTINCT sess.schedule_lesson_id)
FROM attendance_sessions sess
JOIN schedule_lessons sl ON sl.id = sess.schedule_lesson_id
JOIN schedules sc ON sc.id = sl.schedule_id
WHERE sess.tenant_id = $1
  AND sc.status = 'published'
  AND sl.day_of_week = $2
  AND sess.finalized_at IS NOT NULL
  AND sess.started_at >= $3
  AND sess.started_at < $4`, tenantID, todayWeekday, dayStart, dayEnd).Scan(&finalizedToday)

	var absentToday int
	_ = s.db.QueryRowContext(ctx, `
SELECT COUNT(*)
FROM attendance_records ar
JOIN attendance_sessions sess ON sess.id = ar.attendance_session_id
WHERE ar.tenant_id = $1
  AND ar.status = 'absent'
  AND sess.finalized_at IS NOT NULL
  AND sess.started_at >= $2
  AND sess.started_at < $3`, tenantID, dayStart, dayEnd).Scan(&absentToday)

	var openObservations int
	_ = s.db.QueryRowContext(ctx, `
SELECT COUNT(*) FROM student_observations
WHERE tenant_id = $1 AND deleted_at IS NULL`, tenantID).Scan(&openObservations)

	attendancePct := 0
	if todayLessons > 0 {
		attendancePct = finalizedToday * 100 / todayLessons
	}

	classRows, err := s.db.QueryContext(ctx, `
SELECT c.id::text, c.name,
       COALESCE((
         SELECT COUNT(*)
         FROM schedule_lessons sl
         JOIN schedules sc ON sc.id = sl.schedule_id
         WHERE sl.tenant_id = c.tenant_id AND sl.class_id = c.id
           AND sc.status = 'published' AND sl.day_of_week = $2
       ), 0) AS total_lessons,
       COALESCE((
         SELECT COUNT(DISTINCT sl.id)
         FROM schedule_lessons sl
         JOIN schedules sc ON sc.id = sl.schedule_id
         JOIN attendance_sessions sess ON sess.schedule_lesson_id = sl.id
         WHERE sl.tenant_id = c.tenant_id AND sl.class_id = c.id
           AND sc.status = 'published' AND sl.day_of_week = $2
           AND sess.finalized_at IS NOT NULL
           AND sess.started_at >= $3 AND sess.started_at < $4
       ), 0) AS completed_lessons,
       COALESCE((
         SELECT COUNT(*)
         FROM attendance_records ar
         JOIN attendance_sessions sess ON sess.id = ar.attendance_session_id
         JOIN schedule_lessons sl ON sl.id = sess.schedule_lesson_id
         WHERE sl.tenant_id = c.tenant_id AND sl.class_id = c.id
           AND ar.status = 'absent'
           AND sess.finalized_at IS NOT NULL
           AND sess.started_at >= $3 AND sess.started_at < $4
       ), 0) AS absent_count
FROM classes c
WHERE c.tenant_id = $1 AND c.deleted_at IS NULL
ORDER BY c.name
LIMIT 6`, tenantID, todayWeekday, dayStart, dayEnd)
	classAttendance := []dashboarddomain.ClassAttendance{}
	if err == nil {
		defer classRows.Close()
		for classRows.Next() {
			var classID, name string
			var totalLessons, completedLessons, absentCount int
			if err := classRows.Scan(&classID, &name, &totalLessons, &completedLessons, &absentCount); err != nil {
				continue
			}
			attention := "Normal"
			if completedLessons < totalLessons {
				attention = "Yoklama bekliyor"
			}
			if absentCount > 0 {
				attention = "Devamsızlık"
			}
			classAttendance = append(classAttendance, dashboarddomain.ClassAttendance{
				ClassName:     name,
				Completed:     completedLessons,
				Total:         max(1, totalLessons),
				Absent:        absentCount,
				AttentionNeed: attention,
			})
		}
	}

	var publishedSchedules int
	_ = s.db.QueryRowContext(ctx, `
SELECT COUNT(*) FROM schedules WHERE tenant_id = $1 AND status = 'published'`, tenantID).Scan(&publishedSchedules)

	operations := buildPrincipalOperations(todayLessons, finalizedToday, publishedSchedules, classAttendance)

	return dashboarddomain.PrincipalSummary{
		ActiveStudents:          students,
		ActiveTeachers:          teachers,
		Classes:                 classes,
		TodayLessons:            todayLessons,
		AttendanceCompletionPct: attendancePct,
		AbsentToday:             absentToday,
		OpenObservationSignals:  openObservations,
		ClassAttendance:         classAttendance,
		Operations:              operations,
	}
}

func (s *Store) PrincipalReportOverview(ctx context.Context, tenantID string, from time.Time, to time.Time) dashboarddomain.PrincipalReportOverview {
	fromDay := reportDayStart(from)
	toDay := reportDayStart(to)
	if toDay.Before(fromDay) {
		fromDay, toDay = toDay, fromDay
	}
	toExclusive := toDay.AddDate(0, 0, 1)
	asOf := reportDayStart(s.clock())

	report := dashboarddomain.PrincipalReportOverview{
		From:        fromDay.Format("2006-01-02"),
		To:          toDay.Format("2006-01-02"),
		GeneratedAt: s.clock(),
		Attendance:  dashboarddomain.ReportAttendanceOverview{Daily: []dashboarddomain.ReportAttendanceDaily{}},
		Billing:     dashboarddomain.ReportBillingOverview{Currency: "TRY"},
	}

	_ = s.db.QueryRowContext(ctx, `
SELECT COUNT(*),
       COUNT(*) FILTER (WHERE finalized_at IS NOT NULL)
FROM attendance_sessions
WHERE tenant_id = $1
  AND started_at >= $2
  AND started_at < $3`, tenantID, fromDay, toExclusive).Scan(&report.Attendance.Sessions, &report.Attendance.FinalizedSessions)

	_ = s.db.QueryRowContext(ctx, `
SELECT COUNT(*) FILTER (WHERE ar.status = 'present'),
       COUNT(*) FILTER (WHERE ar.status = 'absent'),
       COUNT(*) FILTER (WHERE ar.status = 'late'),
       COUNT(*) FILTER (WHERE ar.status = 'excused')
FROM attendance_records ar
JOIN attendance_sessions sess ON sess.id = ar.attendance_session_id
WHERE ar.tenant_id = $1
  AND sess.finalized_at IS NOT NULL
  AND sess.started_at >= $2
  AND sess.started_at < $3`, tenantID, fromDay, toExclusive).Scan(
		&report.Attendance.Present,
		&report.Attendance.Absent,
		&report.Attendance.Late,
		&report.Attendance.Excused,
	)
	if report.Attendance.Sessions > 0 {
		report.Attendance.CompletionPct = report.Attendance.FinalizedSessions * 100 / report.Attendance.Sessions
	}

	dailyRows, err := s.db.QueryContext(ctx, `
SELECT date_trunc('day', sess.started_at)::date AS report_day,
       COUNT(DISTINCT sess.id) AS sessions,
       COUNT(DISTINCT sess.id) FILTER (WHERE sess.finalized_at IS NOT NULL) AS finalized_sessions,
       COUNT(ar.id) FILTER (WHERE ar.status = 'absent' AND sess.finalized_at IS NOT NULL) AS absent_count,
       COUNT(ar.id) FILTER (WHERE ar.status = 'late' AND sess.finalized_at IS NOT NULL) AS late_count
FROM attendance_sessions sess
LEFT JOIN attendance_records ar ON ar.attendance_session_id = sess.id AND ar.tenant_id = sess.tenant_id
WHERE sess.tenant_id = $1
  AND sess.started_at >= $2
  AND sess.started_at < $3
GROUP BY report_day
ORDER BY report_day`, tenantID, fromDay, toExclusive)
	if err == nil {
		defer dailyRows.Close()
		for dailyRows.Next() {
			var day time.Time
			var item dashboarddomain.ReportAttendanceDaily
			if err := dailyRows.Scan(&day, &item.Sessions, &item.FinalizedSessions, &item.Absent, &item.Late); err != nil {
				continue
			}
			item.Date = day.Format("2006-01-02")
			report.Attendance.Daily = append(report.Attendance.Daily, item)
		}
	}

	var currency string
	_ = s.db.QueryRowContext(ctx, `
SELECT COALESCE(MAX(currency), 'TRY')
FROM payment_plans
WHERE tenant_id = $1`, tenantID).Scan(&currency)
	if strings.TrimSpace(currency) != "" {
		report.Billing.Currency = strings.TrimSpace(currency)
	}

	_ = s.db.QueryRowContext(ctx, `
SELECT COALESCE(SUM(amount), 0)::float8,
       COUNT(*)
FROM payments
WHERE tenant_id = $1
  AND void = false
  AND paid_at >= $2
  AND paid_at < $3`, tenantID, fromDay, toExclusive).Scan(&report.Billing.CollectedAmount, &report.Billing.PaymentCount)

	_ = s.db.QueryRowContext(ctx, `
SELECT COALESCE(SUM(GREATEST(pi.amount - pi.paid_amount, 0)), 0)::float8,
       COUNT(*)
FROM payment_installments pi
JOIN payment_plans pp ON pp.id = pi.payment_plan_id
WHERE pi.tenant_id = $1
  AND pp.status <> 'cancelled'
  AND pi.status NOT IN ('paid', 'cancelled')
  AND pi.due_date < $2::date`, tenantID, asOf.Format("2006-01-02")).Scan(&report.Billing.OverdueAmount, &report.Billing.OverdueCount)

	_ = s.db.QueryRowContext(ctx, `
SELECT COALESCE(SUM(GREATEST(pi.amount - pi.paid_amount, 0)), 0)::float8,
       COUNT(*)
FROM payment_installments pi
JOIN payment_plans pp ON pp.id = pi.payment_plan_id
WHERE pi.tenant_id = $1
  AND pp.status <> 'cancelled'
  AND pi.status NOT IN ('paid', 'cancelled')
  AND pi.due_date >= $2::date
  AND pi.due_date < $3::date`, tenantID, asOf.Format("2006-01-02"), toExclusive.Format("2006-01-02")).Scan(
		&report.Billing.UpcomingAmount,
		&report.Billing.UpcomingCount,
	)

	_ = s.db.QueryRowContext(ctx, `
SELECT COUNT(*) FILTER (WHERE status = 'open'),
       COUNT(*) FILTER (WHERE status = 'monitoring'),
       COUNT(*) FILTER (WHERE status = 'closed'),
       COUNT(*) FILTER (WHERE status IN ('open', 'monitoring') AND priority IN ('high', 'critical')),
       COUNT(*) FILTER (WHERE created_at >= $2 AND created_at < $3)
FROM guidance_cases
WHERE tenant_id = $1
  AND deleted_at IS NULL`, tenantID, fromDay, toExclusive).Scan(
		&report.Guidance.OpenCases,
		&report.Guidance.MonitoringCases,
		&report.Guidance.ClosedCases,
		&report.Guidance.HighPriorityOpen,
		&report.Guidance.NewCases,
	)
	_ = s.db.QueryRowContext(ctx, `
SELECT COUNT(*)
FROM guidance_case_events
WHERE tenant_id = $1
  AND deleted_at IS NULL
  AND occurred_at >= $2
  AND occurred_at < $3`, tenantID, fromDay, toExclusive).Scan(&report.Guidance.Events)

	_ = s.db.QueryRowContext(ctx, `
SELECT COUNT(*),
       COUNT(*) FILTER (WHERE status = 'completed'),
       COUNT(*) FILTER (WHERE status = 'active')
FROM service_trips
WHERE tenant_id = $1
  AND started_at >= $2
  AND started_at < $3`, tenantID, fromDay, toExclusive).Scan(
		&report.Transport.Trips,
		&report.Transport.CompletedTrips,
		&report.Transport.ActiveTrips,
	)
	_ = s.db.QueryRowContext(ctx, `
SELECT COUNT(*),
       COUNT(*) FILTER (WHERE event_type = 'delay_note'),
       COUNT(*) FILTER (WHERE event_type = 'incident')
FROM service_trip_events
WHERE tenant_id = $1
  AND created_at >= $2
  AND created_at < $3`, tenantID, fromDay, toExclusive).Scan(
		&report.Transport.Events,
		&report.Transport.DelayEvents,
		&report.Transport.IncidentEvents,
	)

	return report
}

func buildPrincipalOperations(todayLessons, finalizedToday, publishedSchedules int, classAttendance []dashboarddomain.ClassAttendance) []dashboarddomain.OperationItem {
	operations := []dashboarddomain.OperationItem{}
	if publishedSchedules == 0 {
		operations = append(operations, dashboarddomain.OperationItem{
			ID: "op-schedule-missing", Title: "Yayınlanmış ders programı yok",
			Status: "review", Priority: "urgent", Kind: "schedule", TargetPath: "/dashboard/schedule/builder",
		})
	}
	if todayLessons > 0 && finalizedToday < todayLessons {
		pending := todayLessons - finalizedToday
		operations = append(operations, dashboarddomain.OperationItem{
			ID: "op-attendance-pending", Title: fmt.Sprintf("%d ders yoklaması bekliyor", pending),
			Status: "pending", Priority: "high", Kind: "attendance", TargetPath: "/dashboard/attendance",
		})
	}
	for _, item := range classAttendance {
		if item.AttentionNeed != "Devamsızlık" && item.AttentionNeed != "Yoklama bekliyor" {
			continue
		}
		priority := "normal"
		if item.AttentionNeed == "Devamsızlık" {
			priority = "high"
		}
		operations = append(operations, dashboarddomain.OperationItem{
			ID:         "op-class-" + item.ClassName,
			Title:      item.ClassName + ": " + item.AttentionNeed,
			Status:     "pending",
			Priority:   priority,
			Kind:       "attendance",
			TargetPath: "/dashboard/attendance",
		})
	}
	if len(operations) == 0 {
		operations = append(operations, dashboarddomain.OperationItem{
			ID: "op-all-clear", Title: "Bugün için bekleyen kritik operasyon yok",
			Status: "operational", Priority: "normal", Kind: "info", TargetPath: "/dashboard/operations",
		})
	}
	return operations
}

func (s *Store) ClassSummary(ctx context.Context, tenantID string, classID string, date time.Time) (dashboarddomain.ClassSummary, bool) {
	var className string
	err := s.db.QueryRowContext(ctx, `
SELECT name FROM classes WHERE tenant_id = $1 AND id = $2 AND deleted_at IS NULL`, tenantID, classID).Scan(&className)
	if err != nil {
		return dashboarddomain.ClassSummary{}, false
	}

	var studentsTotal int
	_ = s.db.QueryRowContext(ctx, `
SELECT COUNT(*)
FROM class_students cs
JOIN students s ON s.id = cs.student_id
WHERE cs.tenant_id = $1 AND cs.class_id = $2
  AND (cs.ends_on IS NULL OR cs.ends_on >= CURRENT_DATE)
  AND s.status = 'active' AND s.deleted_at IS NULL`, tenantID, classID).Scan(&studentsTotal)

	weekday := isoWeekday(date)
	var lessonsTotal, lessonsCompleted int
	_ = s.db.QueryRowContext(ctx, `
SELECT COUNT(*)
FROM schedule_lessons sl
JOIN schedules sc ON sc.id = sl.schedule_id
WHERE sl.tenant_id = $1 AND sl.class_id = $2 AND sc.status = 'published' AND sl.day_of_week = $3`,
		tenantID, classID, weekday).Scan(&lessonsTotal)

	dayStart := time.Date(date.Year(), date.Month(), date.Day(), 0, 0, 0, 0, date.Location())
	dayEnd := dayStart.Add(24 * time.Hour)
	_ = s.db.QueryRowContext(ctx, `
SELECT COUNT(DISTINCT sl.id)
FROM schedule_lessons sl
JOIN schedules sc ON sc.id = sl.schedule_id
JOIN attendance_sessions sess ON sess.schedule_lesson_id = sl.id
WHERE sl.tenant_id = $1 AND sl.class_id = $2
  AND sc.status = 'published' AND sl.day_of_week = $3
  AND sess.finalized_at IS NOT NULL
  AND sess.started_at >= $4 AND sess.started_at < $5`,
		tenantID, classID, weekday, dayStart, dayEnd).Scan(&lessonsCompleted)

	var absentCount int
	_ = s.db.QueryRowContext(ctx, `
SELECT COUNT(*)
FROM attendance_records ar
JOIN attendance_sessions sess ON sess.id = ar.attendance_session_id
JOIN schedule_lessons sl ON sl.id = sess.schedule_lesson_id
WHERE sl.tenant_id = $1 AND sl.class_id = $2
  AND ar.status = 'absent'
  AND sess.finalized_at IS NOT NULL
  AND sess.started_at >= $3 AND sess.started_at < $4`,
		tenantID, classID, dayStart, dayEnd).Scan(&absentCount)

	pct := 0
	if lessonsTotal > 0 {
		pct = lessonsCompleted * 100 / lessonsTotal
	}

	return dashboarddomain.ClassSummary{
		ClassID:                 classID,
		ClassName:               className,
		Date:                    dayStart.Format("2006-01-02"),
		LessonsTotal:            lessonsTotal,
		LessonsCompleted:        lessonsCompleted,
		AttendanceCompletionPct: pct,
		AbsentCount:             absentCount,
		StudentsTotal:           studentsTotal,
	}, true
}

func isoWeekday(value time.Time) int {
	weekday := int(value.Weekday())
	if weekday == 0 {
		return 7
	}
	return weekday
}

func reportDayStart(value time.Time) time.Time {
	return time.Date(value.Year(), value.Month(), value.Day(), 0, 0, 0, 0, value.Location())
}

func (s *Store) scanObservation(row interface {
	Scan(dest ...any) error
}) (observationdomain.Observation, bool) {
	var item observationdomain.Observation
	if err := row.Scan(
		&item.ID, &item.TenantID, &item.StudentID, &item.StudentName, &item.ClassID, &item.ClassName,
		&item.AuthorID, &item.AuthorName, &item.Category, &item.Note, &item.Sensitivity, &item.CreatedAt,
	); err != nil {
		return observationdomain.Observation{}, false
	}
	return item, true
}

const observationSelectSQL = `
SELECT o.id::text, o.tenant_id::text, o.student_id::text, s.full_name, COALESCE(o.class_id::text, ''), COALESCE(c.name, ''),
       o.author_id::text, u.full_name, o.category, o.note, o.sensitivity, o.created_at
FROM student_observations o
JOIN students s ON s.id = o.student_id
LEFT JOIN classes c ON c.id = o.class_id
JOIN users u ON u.id = o.author_id`

func (s *Store) GetObservation(ctx context.Context, tenantID string, observationID string) (observationdomain.Observation, bool) {
	row := s.db.QueryRowContext(ctx, observationSelectSQL+`
WHERE o.tenant_id = $1 AND o.id = $2 AND o.deleted_at IS NULL`, tenantID, observationID)
	return s.scanObservation(row)
}

func (s *Store) CreateObservation(ctx context.Context, tenantID string, authorID string, input observationdomain.CreateInput) (observationdomain.Observation, bool) {
	var classID sql.NullString
	err := s.db.QueryRowContext(ctx, `
SELECT cs.class_id::text
FROM class_students cs
WHERE cs.tenant_id = $1
  AND cs.student_id = $2
  AND (cs.ends_on IS NULL OR cs.ends_on >= CURRENT_DATE)
ORDER BY cs.starts_on DESC NULLS LAST
LIMIT 1`, tenantID, input.StudentID).Scan(&classID)
	if err != nil && err != sql.ErrNoRows {
		return observationdomain.Observation{}, false
	}

	row := s.db.QueryRowContext(ctx, `
INSERT INTO student_observations (tenant_id, student_id, class_id, author_id, category, note)
VALUES ($1, $2, NULLIF($3, '')::uuid, $4, $5, $6)
RETURNING id`, tenantID, input.StudentID, nullUUID(classID), authorID, input.Category, input.Note)
	var observationID string
	if err := row.Scan(&observationID); err != nil {
		return observationdomain.Observation{}, false
	}
	return s.GetObservation(ctx, tenantID, observationID)
}

func (s *Store) UpdateObservation(ctx context.Context, tenantID string, observationID string, input observationdomain.UpdateInput) (observationdomain.Observation, bool) {
	current, ok := s.GetObservation(ctx, tenantID, observationID)
	if !ok {
		return observationdomain.Observation{}, false
	}
	if input.Category != nil {
		current.Category = *input.Category
	}
	if input.Note != nil {
		current.Note = strings.TrimSpace(*input.Note)
	}
	_, err := s.db.ExecContext(ctx, `
UPDATE student_observations
SET category = $1, note = $2, updated_at = now()
WHERE tenant_id = $3 AND id = $4 AND deleted_at IS NULL`,
		current.Category, current.Note, tenantID, observationID)
	if err != nil {
		return observationdomain.Observation{}, false
	}
	return s.GetObservation(ctx, tenantID, observationID)
}

func (s *Store) DeleteObservation(ctx context.Context, tenantID string, observationID string) bool {
	result, err := s.db.ExecContext(ctx, `
UPDATE student_observations
SET deleted_at = now(), updated_at = now()
WHERE tenant_id = $1 AND id = $2 AND deleted_at IS NULL`, tenantID, observationID)
	if err != nil {
		return false
	}
	rows, _ := result.RowsAffected()
	return rows > 0
}

func nullUUID(value sql.NullString) string {
	if !value.Valid {
		return ""
	}
	return value.String
}

func (s *Store) ListObservations(ctx context.Context, tenantID string) []observationdomain.Observation {
	rows, err := s.db.QueryContext(ctx, observationSelectSQL+`
WHERE o.tenant_id = $1 AND o.deleted_at IS NULL
ORDER BY o.created_at DESC
LIMIT 50`, tenantID)
	if err != nil {
		return make([]observationdomain.Observation, 0)
	}
	defer rows.Close()

	out := make([]observationdomain.Observation, 0)
	for rows.Next() {
		item, ok := s.scanObservation(rows)
		if !ok {
			continue
		}
		out = append(out, item)
	}
	return out
}

func (s *Store) TeacherCanObserveStudent(ctx context.Context, tenantID string, teacherUserID string, studentID string) bool {
	if allowed, checked := s.teacherCanObserveViaScopes(ctx, tenantID, teacherUserID, studentID); checked {
		return allowed
	}
	var exists bool
	err := s.db.QueryRowContext(ctx, `
SELECT EXISTS (
  SELECT 1
  FROM schedule_lessons sl
  JOIN schedules sch ON sch.id = sl.schedule_id AND sch.tenant_id = sl.tenant_id
  JOIN teachers t ON t.id = sl.teacher_id AND t.tenant_id = sl.tenant_id
  JOIN class_students cs ON cs.tenant_id = sl.tenant_id AND cs.class_id = sl.class_id AND cs.student_id = $3
  WHERE sl.tenant_id = $1
    AND t.user_id = $2
    AND sch.status = 'published'
    AND (cs.ends_on IS NULL OR cs.ends_on >= CURRENT_DATE)
)`, tenantID, teacherUserID, studentID).Scan(&exists)
	return err == nil && exists
}

func (s *Store) RecordOperationalAudit(ctx context.Context, tenantID string, actorUserID string, action string, resourceType string, resourceID string, metadata string) {
	sensitivity := "operational"
	if action == "guidance.view" {
		sensitivity = "sensitive_student"
	}
	metadata = platformaudit.MergeRequestDetails(ctx, metadata)
	_, _ = s.db.ExecContext(ctx, `
INSERT INTO audit_logs (tenant_id, actor_user_id, action, resource_type, resource_id, sensitivity, metadata)
VALUES ($1, NULLIF($2, '')::uuid, $3, $4, NULLIF($5, '')::uuid, $6, $7::jsonb)`,
		tenantID, actorUserID, action, resourceType, resourceID, sensitivity, metadata)
}

func max(a, b int) int {
	if a > b {
		return a
	}
	return b
}
