package postgres

import (
	"context"
	"database/sql"
	"sort"
	"strings"
	"time"

	dashboarddomain "ots/backend/internal/domain/dashboard"
)

func (s *Store) TeacherOverview(ctx context.Context, tenantID string, teacherID string, from time.Time, to time.Time) (dashboarddomain.TeacherOverview, bool) {
	fromDay := reportDayStart(from)
	toDay := reportDayStart(to)
	if toDay.Before(fromDay) {
		fromDay, toDay = toDay, fromDay
	}
	toExclusive := toDay.AddDate(0, 0, 1)
	now := reportDayStart(s.clock())

	profile, ok := s.loadTeacherOverviewProfile(ctx, tenantID, strings.TrimSpace(teacherID))
	if !ok {
		return dashboarddomain.TeacherOverview{}, false
	}

	out := dashboarddomain.TeacherOverview{
		From:           fromDay.Format("2006-01-02"),
		To:             toDay.Format("2006-01-02"),
		GeneratedAt:    s.clock(),
		Teacher:        profile,
		Attendance:     dashboarddomain.TeacherAttendanceOverview{Daily: []dashboarddomain.ReportAttendanceDaily{}},
		Classes:        []dashboarddomain.TeacherClassBreakdown{},
		Lessons:        []dashboarddomain.TeacherLessonSlot{},
		RecentSessions: []dashboarddomain.TeacherRecentSession{},
	}

	lessons := s.loadTeacherPublishedLessons(ctx, tenantID, profile.ID)
	out.Lessons = lessons
	subjectSet := map[string]struct{}{}
	classSet := map[string]string{}
	classWeekly := map[string]int{}
	weeklyMinutes := 0
	todayLessons := 0
	todayWeekday := isoWeekday(now)
	for _, lesson := range lessons {
		weeklyMinutes += lessonMinutes(lesson.StartTime, lesson.EndTime)
		if strings.TrimSpace(lesson.SubjectName) != "" {
			subjectSet[lesson.SubjectName] = struct{}{}
		}
		if lesson.ClassID != "" {
			classSet[lesson.ClassID] = lesson.ClassName
			classWeekly[lesson.ClassID]++
		}
		if lesson.DayOfWeek == todayWeekday {
			todayLessons++
		}
	}
	subjects := make([]string, 0, len(subjectSet))
	for name := range subjectSet {
		subjects = append(subjects, name)
	}
	sort.Strings(subjects)
	out.Workload = dashboarddomain.TeacherWorkload{
		WeeklyLessons: len(lessons),
		WeeklyMinutes: weeklyMinutes,
		ClassCount:    len(classSet),
		SubjectCount:  len(subjects),
		Subjects:      subjects,
	}

	type classAgg struct {
		dashboarddomain.TeacherClassBreakdown
	}
	classes := map[string]*classAgg{}
	for classID, className := range classSet {
		classes[classID] = &classAgg{TeacherClassBreakdown: dashboarddomain.TeacherClassBreakdown{
			ClassID:       classID,
			ClassName:     className,
			WeeklyLessons: classWeekly[classID],
		}}
	}

	rows, err := s.db.QueryContext(ctx, `
SELECT
	sess.id::text,
	sl.id::text,
	sl.class_id::text,
	c.name,
	sub.name,
	sess.started_at,
	sess.finalized_at,
	COUNT(ar.id),
	COUNT(ar.id) FILTER (WHERE ar.status = 'present'),
	COUNT(ar.id) FILTER (WHERE ar.status = 'absent'),
	COUNT(ar.id) FILTER (WHERE ar.status = 'late'),
	COUNT(ar.id) FILTER (WHERE ar.status = 'excused')
FROM attendance_sessions sess
JOIN schedule_lessons sl ON sl.id = sess.schedule_lesson_id
JOIN classes c ON c.id = sl.class_id
JOIN subjects sub ON sub.id = sl.subject_id
LEFT JOIN attendance_records ar ON ar.attendance_session_id = sess.id AND ar.tenant_id = sess.tenant_id
WHERE sess.tenant_id = $1
  AND sl.teacher_id = $2::uuid
  AND sess.started_at >= $3
  AND sess.started_at < $4
GROUP BY sess.id, sl.id, sl.class_id, c.name, sub.name, sess.started_at, sess.finalized_at
ORDER BY sess.started_at DESC`, tenantID, profile.ID, fromDay, toExclusive)
	if err != nil {
		return out, true
	}
	defer rows.Close()

	daily := map[string]*dashboarddomain.ReportAttendanceDaily{}
	recent := make([]dashboarddomain.TeacherRecentSession, 0, 8)
	for rows.Next() {
		var item dashboarddomain.TeacherRecentSession
		var classID string
		var finalized sql.NullTime
		if err := rows.Scan(
			&item.ID,
			&item.LessonID,
			&classID,
			&item.ClassName,
			&item.SubjectName,
			&item.StartedAt,
			&finalized,
			&item.StudentCount,
			&item.Present,
			&item.Absent,
			&item.Late,
			&item.Excused,
		); err != nil {
			continue
		}
		if finalized.Valid {
			item.FinalizedAt = &finalized.Time
		}
		out.Attendance.Sessions++
		dayKey := reportDayStart(item.StartedAt).Format("2006-01-02")
		day, ok := daily[dayKey]
		if !ok {
			day = &dashboarddomain.ReportAttendanceDaily{Date: dayKey}
			daily[dayKey] = day
		}
		day.Sessions++
		agg := classes[classID]
		if agg == nil {
			agg = &classAgg{TeacherClassBreakdown: dashboarddomain.TeacherClassBreakdown{ClassID: classID, ClassName: item.ClassName}}
			classes[classID] = agg
		}
		agg.Sessions++
		if item.FinalizedAt != nil {
			out.Attendance.FinalizedSessions++
			day.FinalizedSessions++
			agg.Finalized++
			out.Attendance.Present += item.Present
			out.Attendance.Absent += item.Absent
			out.Attendance.Late += item.Late
			out.Attendance.Excused += item.Excused
			day.Absent += item.Absent
			day.Late += item.Late
			agg.Present += item.Present
			agg.Absent += item.Absent
			agg.Late += item.Late
			if reportDayStart(*item.FinalizedAt).Equal(now) || reportDayStart(item.StartedAt).Equal(now) {
				out.Attendance.TodayFinalized++
			}
		}
		if len(recent) < 8 {
			recent = append(recent, item)
		}
	}
	out.RecentSessions = recent
	out.Attendance.TodayLessons = todayLessons
	if todayLessons > 0 {
		if out.Attendance.TodayFinalized > todayLessons {
			out.Attendance.TodayFinalized = todayLessons
		}
		out.Attendance.TodayCompletionPct = out.Attendance.TodayFinalized * 100 / todayLessons
	}
	if out.Attendance.Sessions > 0 {
		out.Attendance.CompletionPct = out.Attendance.FinalizedSessions * 100 / out.Attendance.Sessions
	}
	marked := out.Attendance.Present + out.Attendance.Absent + out.Attendance.Late + out.Attendance.Excused
	if marked > 0 {
		out.Attendance.PresencePct = (out.Attendance.Present + out.Attendance.Late) * 100 / marked
	}

	dayKeys := make([]string, 0, len(daily))
	for key := range daily {
		dayKeys = append(dayKeys, key)
	}
	sort.Strings(dayKeys)
	for _, key := range dayKeys {
		out.Attendance.Daily = append(out.Attendance.Daily, *daily[key])
	}

	classRows := make([]dashboarddomain.TeacherClassBreakdown, 0, len(classes))
	for _, item := range classes {
		marked := item.Present + item.Absent + item.Late
		if marked > 0 {
			item.PresencePct = (item.Present + item.Late) * 100 / marked
		}
		classRows = append(classRows, item.TeacherClassBreakdown)
	}
	sort.Slice(classRows, func(i, j int) bool {
		return classRows[i].ClassName < classRows[j].ClassName
	})
	out.Classes = classRows
	return out, true
}

func (s *Store) loadTeacherOverviewProfile(ctx context.Context, tenantID, teacherID string) (dashboarddomain.TeacherOverviewProfile, bool) {
	var profile dashboarddomain.TeacherOverviewProfile
	err := s.db.QueryRowContext(ctx, `
SELECT
	COALESCE(t.id::text, ''),
	u.id::text,
	u.full_name,
	COALESCE(u.email, ''),
	COALESCE(u.phone, ''),
	COALESCE(t.title, ''),
	CASE
		WHEN u.is_active = true AND tm.status = 'active' AND u.must_change_password = true THEN 'first_login'
		WHEN u.is_active = true AND tm.status = 'active' THEN 'active'
		WHEN tm.status = 'invited' THEN 'invited'
		ELSE 'passive'
	END,
	u.must_change_password,
	u.created_at
FROM users u
JOIN tenant_memberships tm ON tm.user_id = u.id AND tm.tenant_id = $1
LEFT JOIN teachers t ON t.user_id = u.id AND t.tenant_id = $1
LEFT JOIN LATERAL (
	SELECT roles.code
	FROM user_roles ur
	JOIN roles ON roles.id = ur.role_id
	WHERE ur.user_id = u.id AND ur.tenant_id = tm.tenant_id
	ORDER BY CASE roles.code
		WHEN 'teacher' THEN 0
		ELSE 9
	END
	LIMIT 1
) r ON true
WHERE (t.id::text = $2 OR u.id::text = $2)
  AND (r.code = 'teacher' OR t.id IS NOT NULL)
LIMIT 1`, tenantID, teacherID).Scan(
		&profile.ID,
		&profile.UserID,
		&profile.FullName,
		&profile.Email,
		&profile.Phone,
		&profile.Title,
		&profile.Status,
		&profile.MustChangePassword,
		&profile.CreatedAt,
	)
	if err != nil {
		return dashboarddomain.TeacherOverviewProfile{}, false
	}
	if profile.ID == "" {
		profile.ID = profile.UserID
	}
	return profile, true
}

func (s *Store) loadTeacherPublishedLessons(ctx context.Context, tenantID, teacherProfileID string) []dashboarddomain.TeacherLessonSlot {
	if teacherProfileID == "" {
		return []dashboarddomain.TeacherLessonSlot{}
	}
	rows, err := s.db.QueryContext(ctx, `
SELECT sl.id::text, sl.class_id::text, c.name, sub.name, sl.day_of_week,
       to_char(sl.starts_at, 'HH24:MI'), to_char(sl.ends_at, 'HH24:MI'), COALESCE(sl.room, '')
FROM schedule_lessons sl
JOIN schedules sc ON sc.id = sl.schedule_id
JOIN classes c ON c.id = sl.class_id
JOIN subjects sub ON sub.id = sl.subject_id
WHERE sl.tenant_id = $1
  AND sl.teacher_id = $2::uuid
  AND sc.status = 'published'
ORDER BY sl.day_of_week, sl.starts_at`, tenantID, teacherProfileID)
	if err != nil {
		return []dashboarddomain.TeacherLessonSlot{}
	}
	defer rows.Close()
	out := []dashboarddomain.TeacherLessonSlot{}
	for rows.Next() {
		var item dashboarddomain.TeacherLessonSlot
		if err := rows.Scan(&item.ID, &item.ClassID, &item.ClassName, &item.SubjectName, &item.DayOfWeek, &item.StartTime, &item.EndTime, &item.Room); err != nil {
			continue
		}
		out = append(out, item)
	}
	return out
}

func lessonMinutes(start, end string) int {
	parse := func(value string) (int, bool) {
		parts := strings.Split(strings.TrimSpace(value), ":")
		if len(parts) < 2 {
			return 0, false
		}
		hour := 0
		minute := 0
		for _, ch := range parts[0] {
			if ch < '0' || ch > '9' {
				return 0, false
			}
			hour = hour*10 + int(ch-'0')
		}
		for _, ch := range parts[1] {
			if ch < '0' || ch > '9' {
				return 0, false
			}
			minute = minute*10 + int(ch-'0')
		}
		return hour*60 + minute, true
	}
	startMin, startOK := parse(start)
	endMin, endOK := parse(end)
	if !startOK || !endOK || endMin <= startMin {
		return 0
	}
	return endMin - startMin
}
