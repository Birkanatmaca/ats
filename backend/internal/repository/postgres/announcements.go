package postgres

import (
	"context"
	"database/sql"
	"strings"
	"time"

	announcementdomain "ots/backend/internal/domain/announcement"
)

func (s *Store) ListTargetedAnnouncements(ctx context.Context, tenantID string, includeDrafts bool) ([]announcementdomain.Announcement, error) {
	query := `
SELECT id::text, tenant_id::text, title, body, status, audience, published_at, scheduled_at,
       COALESCE(created_by::text, ''), created_at, updated_at
FROM announcements
WHERE tenant_id = $1`
	if !includeDrafts {
		query += ` AND status = 'published'`
	}
	query += ` ORDER BY COALESCE(published_at, scheduled_at, created_at) DESC`

	rows, err := s.db.QueryContext(ctx, query, tenantID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := make([]announcementdomain.Announcement, 0)
	for rows.Next() {
		item, err := scanAnnouncementRow(rows)
		if err != nil {
			continue
		}
		audiences, err := s.listAnnouncementAudiences(ctx, tenantID, item.ID)
		if err != nil {
			return nil, err
		}
		item.Audiences = audiences
		if item.Audience == "" {
			item.Audience = announcementAudienceSummary(audiences)
		}
		out = append(out, item)
	}
	return out, rows.Err()
}

func (s *Store) GetTargetedAnnouncement(ctx context.Context, tenantID, announcementID string) (announcementdomain.Announcement, bool, error) {
	row := s.db.QueryRowContext(ctx, `
SELECT id::text, tenant_id::text, title, body, status, audience, published_at, scheduled_at,
       COALESCE(created_by::text, ''), created_at, updated_at
FROM announcements
WHERE tenant_id = $1 AND id = $2`, tenantID, announcementID)
	item, err := scanAnnouncementRow(row)
	if err == sql.ErrNoRows {
		return announcementdomain.Announcement{}, false, nil
	}
	if err != nil {
		return announcementdomain.Announcement{}, false, err
	}
	audiences, err := s.listAnnouncementAudiences(ctx, tenantID, item.ID)
	if err != nil {
		return announcementdomain.Announcement{}, false, err
	}
	item.Audiences = audiences
	if item.Audience == "" {
		item.Audience = announcementAudienceSummary(audiences)
	}
	return item, true, nil
}

func (s *Store) CreateTargetedAnnouncement(ctx context.Context, tenantID, createdBy string, input announcementdomain.CreateInput, audiences []announcementdomain.AudienceTarget, status announcementdomain.Status, publishedAt, scheduledAt *time.Time) (announcementdomain.Announcement, error) {
	summary := announcementAudienceSummary(audiences)
	var item announcementdomain.Announcement
	err := s.db.QueryRowContext(ctx, `
INSERT INTO announcements (tenant_id, title, body, audience, status, published_at, scheduled_at, created_by)
VALUES ($1, $2, $3, $4, $5, $6, $7, NULLIF($8, '')::uuid)
RETURNING id::text, tenant_id::text, title, body, status, audience, published_at, scheduled_at,
          COALESCE(created_by::text, ''), created_at, updated_at`,
		tenantID, strings.TrimSpace(input.Title), strings.TrimSpace(input.Body), summary, string(status), publishedAt, scheduledAt, createdBy,
	).Scan(
		&item.ID, &item.TenantID, &item.Title, &item.Body, &item.Status, &item.Audience, &item.PublishedAt, &item.ScheduledAt,
		&item.CreatedBy, &item.CreatedAt, &item.UpdatedAt,
	)
	if err != nil {
		return announcementdomain.Announcement{}, err
	}
	if err := s.replaceAnnouncementAudiences(ctx, tenantID, item.ID, audiences); err != nil {
		return announcementdomain.Announcement{}, err
	}
	item.Audiences = audiences
	return item, nil
}

func (s *Store) UpdateTargetedAnnouncement(ctx context.Context, tenantID, announcementID string, input announcementdomain.UpdateInput, audiences []announcementdomain.AudienceTarget, status announcementdomain.Status, scheduledAt *time.Time) (announcementdomain.Announcement, error) {
	current, ok, err := s.GetTargetedAnnouncement(ctx, tenantID, announcementID)
	if err != nil {
		return announcementdomain.Announcement{}, err
	}
	if !ok {
		return announcementdomain.Announcement{}, sql.ErrNoRows
	}
	if input.Title != nil {
		current.Title = strings.TrimSpace(*input.Title)
	}
	if input.Body != nil {
		current.Body = strings.TrimSpace(*input.Body)
	}
	current.Status = status
	current.ScheduledAt = scheduledAt
	current.Audience = announcementAudienceSummary(audiences)
	current.Audiences = audiences

	err = s.db.QueryRowContext(ctx, `
UPDATE announcements
SET title = $1, body = $2, audience = $3, status = $4, scheduled_at = $5, updated_at = now()
WHERE tenant_id = $6 AND id = $7
RETURNING id::text, tenant_id::text, title, body, status, audience, published_at, scheduled_at,
          COALESCE(created_by::text, ''), created_at, updated_at`,
		current.Title, current.Body, current.Audience, string(status), scheduledAt, tenantID, announcementID,
	).Scan(
		&current.ID, &current.TenantID, &current.Title, &current.Body, &current.Status, &current.Audience, &current.PublishedAt, &current.ScheduledAt,
		&current.CreatedBy, &current.CreatedAt, &current.UpdatedAt,
	)
	if err != nil {
		return announcementdomain.Announcement{}, err
	}
	if err := s.replaceAnnouncementAudiences(ctx, tenantID, announcementID, audiences); err != nil {
		return announcementdomain.Announcement{}, err
	}
	return current, nil
}

func (s *Store) DeleteTargetedAnnouncement(ctx context.Context, tenantID, announcementID string) bool {
	res, err := s.db.ExecContext(ctx, `DELETE FROM announcements WHERE tenant_id = $1 AND id = $2`, tenantID, announcementID)
	if err != nil {
		return false
	}
	n, _ := res.RowsAffected()
	return n > 0
}

func (s *Store) SetTargetedAnnouncementStatus(ctx context.Context, tenantID, announcementID string, status announcementdomain.Status, publishedAt *time.Time) (announcementdomain.Announcement, error) {
	var item announcementdomain.Announcement
	err := s.db.QueryRowContext(ctx, `
UPDATE announcements
SET status = $1, published_at = COALESCE($2, published_at), updated_at = now()
WHERE tenant_id = $3 AND id = $4
RETURNING id::text, tenant_id::text, title, body, status, audience, published_at, scheduled_at,
          COALESCE(created_by::text, ''), created_at, updated_at`,
		string(status), publishedAt, tenantID, announcementID,
	).Scan(
		&item.ID, &item.TenantID, &item.Title, &item.Body, &item.Status, &item.Audience, &item.PublishedAt, &item.ScheduledAt,
		&item.CreatedBy, &item.CreatedAt, &item.UpdatedAt,
	)
	if err != nil {
		return announcementdomain.Announcement{}, err
	}
	audiences, err := s.listAnnouncementAudiences(ctx, tenantID, item.ID)
	if err != nil {
		return announcementdomain.Announcement{}, err
	}
	item.Audiences = audiences
	return item, nil
}

func (s *Store) ListDueScheduled(ctx context.Context, now time.Time) ([]announcementdomain.Announcement, error) {
	rows, err := s.db.QueryContext(ctx, `
SELECT id::text, tenant_id::text, title, body, status, audience, published_at, scheduled_at,
       COALESCE(created_by::text, ''), created_at, updated_at
FROM announcements
WHERE status = 'scheduled' AND scheduled_at IS NOT NULL AND scheduled_at <= $1`, now)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := make([]announcementdomain.Announcement, 0)
	for rows.Next() {
		item, err := scanAnnouncementRow(rows)
		if err != nil {
			continue
		}
		audiences, err := s.listAnnouncementAudiences(ctx, item.TenantID, item.ID)
		if err != nil {
			return nil, err
		}
		item.Audiences = audiences
		out = append(out, item)
	}
	return out, rows.Err()
}

func (s *Store) MarkAnnouncementRead(ctx context.Context, tenantID, announcementID, userID string, readAt time.Time) error {
	_, err := s.db.ExecContext(ctx, `
INSERT INTO announcement_reads (tenant_id, announcement_id, user_id, read_at)
VALUES ($1, $2, $3, $4)
ON CONFLICT (tenant_id, announcement_id, user_id) DO UPDATE SET read_at = EXCLUDED.read_at`,
		tenantID, announcementID, userID, readAt)
	return err
}

func (s *Store) GetAnnouncementRead(ctx context.Context, tenantID, announcementID, userID string) (*time.Time, error) {
	var readAt time.Time
	err := s.db.QueryRowContext(ctx, `
SELECT read_at FROM announcement_reads
WHERE tenant_id = $1 AND announcement_id = $2 AND user_id = $3`,
		tenantID, announcementID, userID).Scan(&readAt)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &readAt, nil
}

func (s *Store) CountAnnouncementReads(ctx context.Context, tenantID, announcementID string) (int, error) {
	var count int
	err := s.db.QueryRowContext(ctx, `
SELECT COUNT(*) FROM announcement_reads WHERE tenant_id = $1 AND announcement_id = $2`,
		tenantID, announcementID).Scan(&count)
	return count, err
}

func (s *Store) CountAnnouncementDeliveries(ctx context.Context, tenantID, announcementID string) (int, error) {
	var count int
	err := s.db.QueryRowContext(ctx, `
SELECT COUNT(*) FROM notifications
WHERE tenant_id = $1 AND kind LIKE $2`,
		tenantID, "announcement:"+announcementID+":%").Scan(&count)
	return count, err
}

func (s *Store) CountAnnouncementPushDeliveries(ctx context.Context, tenantID, announcementID string) (announcementdomain.PushDeliveryStats, error) {
	var stats announcementdomain.PushDeliveryStats
	err := s.db.QueryRowContext(ctx, `
SELECT
  COUNT(*) FILTER (WHERE status = 'sent'),
  COUNT(*) FILTER (WHERE status = 'dropped'),
  COUNT(*) FILTER (WHERE status = 'failed')
FROM push_delivery_logs
WHERE tenant_id = $1 AND source_kind LIKE $2`,
		tenantID, "announcement:"+announcementID+":%").Scan(&stats.Sent, &stats.Dropped, &stats.Failed)
	return stats, err
}

func (s *Store) GetUserTargetContext(ctx context.Context, tenantID, userID string) (announcementdomain.UserTargetContext, error) {
	ctxData := announcementdomain.UserTargetContext{
		UserID:            userID,
		StudentClassIDs:   map[string]string{},
		StudentSectionIDs: map[string]string{},
	}
	rows, err := s.db.QueryContext(ctx, `
SELECT r.code FROM user_roles ur
JOIN roles r ON r.id = ur.role_id
WHERE ur.tenant_id = $1 AND ur.user_id = $2`, tenantID, userID)
	if err != nil {
		return ctxData, err
	}
	defer rows.Close()
	for rows.Next() {
		var role string
		if err := rows.Scan(&role); err != nil {
			continue
		}
		ctxData.RoleCodes = append(ctxData.RoleCodes, role)
	}
	studentRows, err := s.db.QueryContext(ctx, `
SELECT sg.student_id::text, COALESCE(cs.class_id::text, '')
FROM guardians g
JOIN student_guardians sg ON sg.guardian_id = g.id AND sg.tenant_id = g.tenant_id
LEFT JOIN LATERAL (
  SELECT class_id FROM class_students
  WHERE tenant_id = sg.tenant_id AND student_id = sg.student_id
  ORDER BY starts_on DESC LIMIT 1
) cs ON true
WHERE g.tenant_id = $1 AND g.user_id = $2`, tenantID, userID)
	if err != nil {
		return ctxData, err
	}
	defer studentRows.Close()
	for studentRows.Next() {
		var studentID, classID string
		if err := studentRows.Scan(&studentID, &classID); err != nil {
			continue
		}
		ctxData.GuardianStudentIDs = append(ctxData.GuardianStudentIDs, studentID)
		if classID != "" {
			ctxData.StudentClassIDs[studentID] = classID
			ctxData.StudentSectionIDs[studentID] = classID + "-default"
		}
	}
	return ctxData, nil
}

func (s *Store) ResolveTargetUserIDs(ctx context.Context, tenantID string, audiences []announcementdomain.AudienceTarget) ([]string, error) {
	seen := map[string]struct{}{}
	out := make([]string, 0)
	for _, audience := range audiences {
		ids, err := s.resolveAudienceUserIDs(ctx, tenantID, audience)
		if err != nil {
			return nil, err
		}
		for _, id := range ids {
			if _, ok := seen[id]; ok {
				continue
			}
			seen[id] = struct{}{}
			out = append(out, id)
		}
	}
	return out, nil
}

func (s *Store) resolveAudienceUserIDs(ctx context.Context, tenantID string, audience announcementdomain.AudienceTarget) ([]string, error) {
	switch audience.Type {
	case announcementdomain.AudienceAll:
		return s.listActiveTenantUserIDs(ctx, tenantID, "")
	case announcementdomain.AudienceRole:
		return s.listActiveTenantUserIDs(ctx, tenantID, audience.Role)
	case announcementdomain.AudienceClass:
		if audience.ID == "" {
			return nil, nil
		}
		rows, err := s.db.QueryContext(ctx, `
SELECT DISTINCT g.user_id::text
FROM class_students cs
JOIN student_guardians sg ON sg.student_id = cs.student_id AND sg.tenant_id = cs.tenant_id
JOIN guardians g ON g.id = sg.guardian_id AND g.tenant_id = sg.tenant_id
WHERE cs.tenant_id = $1 AND cs.class_id = $2 AND g.user_id IS NOT NULL`, tenantID, audience.ID)
		if err != nil {
			return nil, err
		}
		defer rows.Close()
		return scanStringColumn(rows)
	case announcementdomain.AudienceSection:
		if audience.ID == "" {
			return nil, nil
		}
		classID := announcementdomain.SectionClassID(audience.ID)
		rows, err := s.db.QueryContext(ctx, `
SELECT DISTINCT g.user_id::text
FROM class_students cs
JOIN student_guardians sg ON sg.student_id = cs.student_id AND sg.tenant_id = cs.tenant_id
JOIN guardians g ON g.id = sg.guardian_id AND g.tenant_id = sg.tenant_id
WHERE cs.tenant_id = $1 AND cs.class_id = $2 AND g.user_id IS NOT NULL`, tenantID, classID)
		if err != nil {
			return nil, err
		}
		defer rows.Close()
		return scanStringColumn(rows)
	case announcementdomain.AudienceStudent:
		if audience.ID == "" {
			return nil, nil
		}
		rows, err := s.db.QueryContext(ctx, `
SELECT DISTINCT g.user_id::text
FROM student_guardians sg
JOIN guardians g ON g.id = sg.guardian_id AND g.tenant_id = sg.tenant_id
WHERE sg.tenant_id = $1 AND sg.student_id = $2 AND g.user_id IS NOT NULL`, tenantID, audience.ID)
		if err != nil {
			return nil, err
		}
		defer rows.Close()
		return scanStringColumn(rows)
	case announcementdomain.AudienceUser:
		if audience.ID == "" {
			return nil, nil
		}
		return []string{audience.ID}, nil
	default:
		return nil, nil
	}
}

func (s *Store) listActiveTenantUserIDs(ctx context.Context, tenantID, roleCode string) ([]string, error) {
	query := `
SELECT DISTINCT ur.user_id::text
FROM user_roles ur
JOIN roles r ON r.id = ur.role_id
JOIN tenant_memberships tm ON tm.user_id = ur.user_id AND tm.tenant_id = ur.tenant_id AND tm.status = 'active'
WHERE ur.tenant_id = $1`
	args := []any{tenantID}
	if roleCode != "" {
		query += ` AND r.code = $2`
		args = append(args, roleCode)
	}
	rows, err := s.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanStringColumn(rows)
}

func (s *Store) ListTemplates(ctx context.Context, tenantID string) ([]announcementdomain.Template, error) {
	rows, err := s.db.QueryContext(ctx, `
SELECT id::text, tenant_id::text, name, title_template, body_template, category,
       COALESCE(created_by::text, ''), created_at, updated_at
FROM announcement_templates
WHERE tenant_id = $1
ORDER BY name ASC`, tenantID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := make([]announcementdomain.Template, 0)
	for rows.Next() {
		var item announcementdomain.Template
		if err := rows.Scan(&item.ID, &item.TenantID, &item.Name, &item.TitleTemplate, &item.BodyTemplate, &item.Category, &item.CreatedBy, &item.CreatedAt, &item.UpdatedAt); err != nil {
			continue
		}
		out = append(out, item)
	}
	return out, rows.Err()
}

func (s *Store) GetTemplate(ctx context.Context, tenantID, templateID string) (announcementdomain.Template, bool, error) {
	var item announcementdomain.Template
	err := s.db.QueryRowContext(ctx, `
SELECT id::text, tenant_id::text, name, title_template, body_template, category,
       COALESCE(created_by::text, ''), created_at, updated_at
FROM announcement_templates
WHERE tenant_id = $1 AND id = $2`, tenantID, templateID).Scan(
		&item.ID, &item.TenantID, &item.Name, &item.TitleTemplate, &item.BodyTemplate, &item.Category, &item.CreatedBy, &item.CreatedAt, &item.UpdatedAt,
	)
	if err == sql.ErrNoRows {
		return announcementdomain.Template{}, false, nil
	}
	if err != nil {
		return announcementdomain.Template{}, false, err
	}
	return item, true, nil
}

func (s *Store) CreateTemplate(ctx context.Context, tenantID, createdBy string, input announcementdomain.CreateTemplateInput) (announcementdomain.Template, error) {
	category := strings.TrimSpace(input.Category)
	if category == "" {
		category = "general"
	}
	var item announcementdomain.Template
	err := s.db.QueryRowContext(ctx, `
INSERT INTO announcement_templates (tenant_id, name, title_template, body_template, category, created_by)
VALUES ($1, $2, $3, $4, $5, NULLIF($6, '')::uuid)
RETURNING id::text, tenant_id::text, name, title_template, body_template, category,
          COALESCE(created_by::text, ''), created_at, updated_at`,
		tenantID, strings.TrimSpace(input.Name), strings.TrimSpace(input.TitleTemplate), strings.TrimSpace(input.BodyTemplate), category, createdBy,
	).Scan(&item.ID, &item.TenantID, &item.Name, &item.TitleTemplate, &item.BodyTemplate, &item.Category, &item.CreatedBy, &item.CreatedAt, &item.UpdatedAt)
	return item, err
}

func (s *Store) UpdateTemplate(ctx context.Context, tenantID, templateID string, input announcementdomain.UpdateTemplateInput) (announcementdomain.Template, error) {
	current, ok, err := s.GetTemplate(ctx, tenantID, templateID)
	if err != nil {
		return announcementdomain.Template{}, err
	}
	if !ok {
		return announcementdomain.Template{}, sql.ErrNoRows
	}
	if input.Name != nil {
		current.Name = strings.TrimSpace(*input.Name)
	}
	if input.TitleTemplate != nil {
		current.TitleTemplate = strings.TrimSpace(*input.TitleTemplate)
	}
	if input.BodyTemplate != nil {
		current.BodyTemplate = strings.TrimSpace(*input.BodyTemplate)
	}
	if input.Category != nil {
		current.Category = strings.TrimSpace(*input.Category)
	}
	err = s.db.QueryRowContext(ctx, `
UPDATE announcement_templates
SET name = $1, title_template = $2, body_template = $3, category = $4, updated_at = now()
WHERE tenant_id = $5 AND id = $6
RETURNING id::text, tenant_id::text, name, title_template, body_template, category,
          COALESCE(created_by::text, ''), created_at, updated_at`,
		current.Name, current.TitleTemplate, current.BodyTemplate, current.Category, tenantID, templateID,
	).Scan(&current.ID, &current.TenantID, &current.Name, &current.TitleTemplate, &current.BodyTemplate, &current.Category, &current.CreatedBy, &current.CreatedAt, &current.UpdatedAt)
	return current, err
}

func (s *Store) DeleteTemplate(ctx context.Context, tenantID, templateID string) bool {
	res, err := s.db.ExecContext(ctx, `DELETE FROM announcement_templates WHERE tenant_id = $1 AND id = $2`, tenantID, templateID)
	if err != nil {
		return false
	}
	n, _ := res.RowsAffected()
	return n > 0
}

func (s *Store) listAnnouncementAudiences(ctx context.Context, tenantID, announcementID string) ([]announcementdomain.AudienceTarget, error) {
	rows, err := s.db.QueryContext(ctx, `
SELECT audience_type, COALESCE(audience_id::text, ''), COALESCE(role_code, '')
FROM announcement_audiences
WHERE tenant_id = $1 AND announcement_id = $2`, tenantID, announcementID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := make([]announcementdomain.AudienceTarget, 0)
	for rows.Next() {
		var item announcementdomain.AudienceTarget
		var audienceType string
		if err := rows.Scan(&audienceType, &item.ID, &item.Role); err != nil {
			continue
		}
		item.Type = announcementdomain.AudienceType(audienceType)
		out = append(out, item)
	}
	return out, rows.Err()
}

func (s *Store) replaceAnnouncementAudiences(ctx context.Context, tenantID, announcementID string, audiences []announcementdomain.AudienceTarget) error {
	if _, err := s.db.ExecContext(ctx, `DELETE FROM announcement_audiences WHERE tenant_id = $1 AND announcement_id = $2`, tenantID, announcementID); err != nil {
		return err
	}
	for _, audience := range audiences {
		var audienceID any
		if audience.ID != "" {
			audienceID = audience.ID
		}
		_, err := s.db.ExecContext(ctx, `
INSERT INTO announcement_audiences (tenant_id, announcement_id, audience_type, audience_id, role_code)
VALUES ($1, $2, $3, $4, NULLIF($5, ''))`,
			tenantID, announcementID, string(audience.Type), audienceID, audience.Role)
		if err != nil {
			return err
		}
	}
	return nil
}

type announcementScanner interface {
	Scan(dest ...any) error
}

func scanAnnouncementRow(scanner announcementScanner) (announcementdomain.Announcement, error) {
	var item announcementdomain.Announcement
	var publishedAt, scheduledAt sql.NullTime
	if err := scanner.Scan(
		&item.ID, &item.TenantID, &item.Title, &item.Body, &item.Status, &item.Audience, &publishedAt, &scheduledAt,
		&item.CreatedBy, &item.CreatedAt, &item.UpdatedAt,
	); err != nil {
		return announcementdomain.Announcement{}, err
	}
	if publishedAt.Valid {
		item.PublishedAt = &publishedAt.Time
	}
	if scheduledAt.Valid {
		item.ScheduledAt = &scheduledAt.Time
	}
	return item, nil
}

func announcementAudienceSummary(audiences []announcementdomain.AudienceTarget) string {
	if len(audiences) == 0 {
		return "all"
	}
	if len(audiences) == 1 {
		switch audiences[0].Type {
		case announcementdomain.AudienceAll:
			return "all"
		case announcementdomain.AudienceRole:
			if audiences[0].Role == "teacher" {
				return "teachers"
			}
			if audiences[0].Role == "guardian" {
				return "guardians"
			}
			return audiences[0].Role
		case announcementdomain.AudienceClass, announcementdomain.AudienceSection:
			if audiences[0].ID != "" {
				return "class:" + audiences[0].ID
			}
		}
	}
	return "mixed"
}
