package memory

import (
	"context"
	"fmt"
	"sort"
	"strings"
	"time"

	announcementdomain "ots/backend/internal/domain/announcement"
	"ots/backend/internal/domain/identity"
	pushdomain "ots/backend/internal/domain/push"
)

type memoryTargetedAnnouncement struct {
	Item      announcementdomain.Announcement
	Audiences []announcementdomain.AudienceTarget
}

func (s *Store) ensureTargetedAnnouncementsLocked() map[string]memoryTargetedAnnouncement {
	if s.targetedAnnouncements == nil {
		s.targetedAnnouncements = map[string]memoryTargetedAnnouncement{}
		for _, item := range s.announcements {
			audiences := legacyAnnouncementAudiences(item.Audience)
			publishedAt := item.PublishedAt
			s.targetedAnnouncements[item.ID] = memoryTargetedAnnouncement{
				Item: announcementdomain.Announcement{
					ID:          item.ID,
					TenantID:    item.TenantID,
					Title:       item.Title,
					Body:        item.Body,
					Status:      announcementdomain.StatusPublished,
					Audience:    item.Audience,
					PublishedAt: &publishedAt,
					CreatedAt:   publishedAt,
					UpdatedAt:   publishedAt,
				},
				Audiences: audiences,
			}
		}
	}
	return s.targetedAnnouncements
}

func legacyAnnouncementAudiences(audience string) []announcementdomain.AudienceTarget {
	audience = strings.TrimSpace(strings.ToLower(audience))
	if strings.HasPrefix(audience, "class:") {
		return []announcementdomain.AudienceTarget{{Type: announcementdomain.AudienceClass, ID: strings.TrimPrefix(audience, "class:")}}
	}
	switch audience {
	case "all", "":
		return []announcementdomain.AudienceTarget{{Type: announcementdomain.AudienceAll}}
	case "teachers":
		return []announcementdomain.AudienceTarget{{Type: announcementdomain.AudienceRole, Role: "teacher"}}
	case "guardians":
		return []announcementdomain.AudienceTarget{{Type: announcementdomain.AudienceRole, Role: "guardian"}}
	default:
		return []announcementdomain.AudienceTarget{{Type: announcementdomain.AudienceRole, Role: audience}}
	}
}

func (s *Store) ListTargetedAnnouncements(_ context.Context, tenantID string, includeDrafts bool) ([]announcementdomain.Announcement, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	items := s.ensureTargetedAnnouncementsLocked()
	out := make([]announcementdomain.Announcement, 0, len(items))
	for _, record := range items {
		if record.Item.TenantID != tenantID {
			continue
		}
		if !includeDrafts && record.Item.Status != announcementdomain.StatusPublished {
			continue
		}
		item := record.Item
		item.Audiences = append([]announcementdomain.AudienceTarget(nil), record.Audiences...)
		out = append(out, item)
	}
	sort.Slice(out, func(i, j int) bool {
		left := out[i].CreatedAt
		if out[i].PublishedAt != nil {
			left = *out[i].PublishedAt
		}
		right := out[j].CreatedAt
		if out[j].PublishedAt != nil {
			right = *out[j].PublishedAt
		}
		return left.After(right)
	})
	return out, nil
}

func (s *Store) GetTargetedAnnouncement(_ context.Context, tenantID, announcementID string) (announcementdomain.Announcement, bool, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	record, ok := s.ensureTargetedAnnouncementsLocked()[announcementID]
	if !ok || record.Item.TenantID != tenantID {
		return announcementdomain.Announcement{}, false, nil
	}
	item := record.Item
	item.Audiences = append([]announcementdomain.AudienceTarget(nil), record.Audiences...)
	return item, true, nil
}

func (s *Store) CreateTargetedAnnouncement(_ context.Context, tenantID, createdBy string, input announcementdomain.CreateInput, audiences []announcementdomain.AudienceTarget, status announcementdomain.Status, publishedAt, scheduledAt *time.Time) (announcementdomain.Announcement, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	items := s.ensureTargetedAnnouncementsLocked()
	now := s.clock()
	id := fmt.Sprintf("announcement-%d", len(items)+1)
	item := announcementdomain.Announcement{
		ID:          id,
		TenantID:    tenantID,
		Title:       strings.TrimSpace(input.Title),
		Body:        strings.TrimSpace(input.Body),
		Status:      status,
		Audience:    audienceSummaryLocked(audiences),
		PublishedAt: publishedAt,
		ScheduledAt: scheduledAt,
		CreatedBy:   createdBy,
		CreatedAt:   now,
		UpdatedAt:   now,
	}
	items[id] = memoryTargetedAnnouncement{Item: item, Audiences: append([]announcementdomain.AudienceTarget(nil), audiences...)}
	item.Audiences = audiences
	return item, nil
}

func (s *Store) UpdateTargetedAnnouncement(_ context.Context, tenantID, announcementID string, input announcementdomain.UpdateInput, audiences []announcementdomain.AudienceTarget, status announcementdomain.Status, scheduledAt *time.Time) (announcementdomain.Announcement, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	items := s.ensureTargetedAnnouncementsLocked()
	record, ok := items[announcementID]
	if !ok || record.Item.TenantID != tenantID {
		return announcementdomain.Announcement{}, fmt.Errorf("not found")
	}
	if input.Title != nil {
		record.Item.Title = strings.TrimSpace(*input.Title)
	}
	if input.Body != nil {
		record.Item.Body = strings.TrimSpace(*input.Body)
	}
	record.Item.Status = status
	record.Item.ScheduledAt = scheduledAt
	record.Item.UpdatedAt = s.clock()
	record.Audiences = append([]announcementdomain.AudienceTarget(nil), audiences...)
	record.Item.Audience = audienceSummaryLocked(audiences)
	items[announcementID] = record
	item := record.Item
	item.Audiences = audiences
	return item, nil
}

func (s *Store) DeleteTargetedAnnouncement(_ context.Context, tenantID, announcementID string) bool {
	s.mu.Lock()
	defer s.mu.Unlock()
	items := s.ensureTargetedAnnouncementsLocked()
	record, ok := items[announcementID]
	if !ok || record.Item.TenantID != tenantID {
		return false
	}
	delete(items, announcementID)
	return true
}

func (s *Store) SetTargetedAnnouncementStatus(_ context.Context, tenantID, announcementID string, status announcementdomain.Status, publishedAt *time.Time) (announcementdomain.Announcement, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	items := s.ensureTargetedAnnouncementsLocked()
	record, ok := items[announcementID]
	if !ok || record.Item.TenantID != tenantID {
		return announcementdomain.Announcement{}, fmt.Errorf("not found")
	}
	record.Item.Status = status
	if publishedAt != nil {
		record.Item.PublishedAt = publishedAt
	}
	record.Item.UpdatedAt = s.clock()
	items[announcementID] = record
	item := record.Item
	item.Audiences = append([]announcementdomain.AudienceTarget(nil), record.Audiences...)
	return item, nil
}

func (s *Store) ListDueScheduled(_ context.Context, now time.Time) ([]announcementdomain.Announcement, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := make([]announcementdomain.Announcement, 0)
	for _, record := range s.ensureTargetedAnnouncementsLocked() {
		if record.Item.Status != announcementdomain.StatusScheduled || record.Item.ScheduledAt == nil {
			continue
		}
		if record.Item.ScheduledAt.After(now) {
			continue
		}
		item := record.Item
		item.Audiences = append([]announcementdomain.AudienceTarget(nil), record.Audiences...)
		out = append(out, item)
	}
	return out, nil
}

func (s *Store) MarkAnnouncementRead(_ context.Context, tenantID, announcementID, userID string, readAt time.Time) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.announcementReads == nil {
		s.announcementReads = map[string]time.Time{}
	}
	s.announcementReads[tenantID+":"+announcementID+":"+userID] = readAt
	return nil
}

func (s *Store) GetAnnouncementRead(_ context.Context, tenantID, announcementID, userID string) (*time.Time, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	if s.announcementReads == nil {
		return nil, nil
	}
	readAt, ok := s.announcementReads[tenantID+":"+announcementID+":"+userID]
	if !ok {
		return nil, nil
	}
	copy := readAt
	return &copy, nil
}

func (s *Store) CountAnnouncementReads(_ context.Context, tenantID, announcementID string) (int, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	if s.announcementReads == nil {
		return 0, nil
	}
	prefix := tenantID + ":" + announcementID + ":"
	count := 0
	for key := range s.announcementReads {
		if strings.HasPrefix(key, prefix) {
			count++
		}
	}
	return count, nil
}

func (s *Store) CountAnnouncementDeliveries(_ context.Context, tenantID, announcementID string) (int, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	prefix := "announcement:" + announcementID + ":"
	count := 0
	for _, item := range s.notifications {
		if item.TenantID == tenantID && strings.HasPrefix(item.Kind, prefix) {
			count++
		}
	}
	return count, nil
}

func (s *Store) CountAnnouncementPushDeliveries(_ context.Context, tenantID, announcementID string) (announcementdomain.PushDeliveryStats, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	prefix := "announcement:" + announcementID + ":"
	var stats announcementdomain.PushDeliveryStats
	for _, item := range s.ensureDeliveryLogs() {
		if item.TenantID != tenantID || !strings.HasPrefix(item.SourceKind, prefix) {
			continue
		}
		switch item.Status {
		case pushdomain.DeliveryStatusSent:
			stats.Sent++
		case pushdomain.DeliveryStatusDropped:
			stats.Dropped++
		case pushdomain.DeliveryStatusFailed:
			stats.Failed++
		}
	}
	return stats, nil
}

func (s *Store) GetUserTargetContext(_ context.Context, tenantID, userID string) (announcementdomain.UserTargetContext, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	ctxData := announcementdomain.UserTargetContext{
		UserID:            userID,
		StudentClassIDs:   map[string]string{},
		StudentSectionIDs: map[string]string{},
	}
	for _, user := range s.users {
		if user.TenantID != tenantID || user.ID != userID {
			continue
		}
		ctxData.RoleCodes = append(ctxData.RoleCodes, string(user.Role))
	}
	for _, link := range s.studentGuardians {
		if link.GuardianUserID != userID {
			continue
		}
		ctxData.GuardianStudentIDs = append(ctxData.GuardianStudentIDs, link.StudentID)
		for _, student := range s.students {
			if student.ID == link.StudentID && student.ClassID != "" {
				ctxData.StudentClassIDs[link.StudentID] = student.ClassID
				ctxData.StudentSectionIDs[link.StudentID] = student.ClassID + "-default"
			}
		}
	}
	return ctxData, nil
}

func (s *Store) ResolveTargetUserIDs(_ context.Context, tenantID string, audiences []announcementdomain.AudienceTarget) ([]string, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	seen := map[string]struct{}{}
	out := make([]string, 0)
	for _, audience := range audiences {
		for _, userID := range s.resolveAudienceUserIDsLocked(tenantID, audience) {
			if _, ok := seen[userID]; ok {
				continue
			}
			seen[userID] = struct{}{}
			out = append(out, userID)
		}
	}
	return out, nil
}

func (s *Store) resolveAudienceUserIDsLocked(tenantID string, audience announcementdomain.AudienceTarget) []string {
	out := make([]string, 0)
	switch audience.Type {
	case announcementdomain.AudienceAll:
		for _, user := range s.users {
			if user.TenantID == tenantID && user.Status == "active" {
				out = append(out, user.ID)
			}
		}
	case announcementdomain.AudienceRole:
		for _, user := range s.users {
			if user.TenantID != tenantID || user.Status != "active" {
				continue
			}
			if string(user.Role) == audience.Role || (audience.Role == "teacher" && user.Role == identity.RoleTeacher) || (audience.Role == "guardian" && user.Role == identity.RoleGuardian) {
				out = append(out, user.ID)
			}
		}
	case announcementdomain.AudienceClass:
		for _, link := range s.studentGuardians {
			for _, student := range s.students {
				if student.ID != link.StudentID || student.ClassID != audience.ID {
					continue
				}
				out = append(out, link.GuardianUserID)
			}
		}
	case announcementdomain.AudienceSection:
		for _, link := range s.studentGuardians {
			for _, student := range s.students {
				sectionID := ""
				if student.ClassID != "" {
					sectionID = student.ClassID + "-default"
				}
				if student.ID != link.StudentID || sectionID != audience.ID {
					continue
				}
				out = append(out, link.GuardianUserID)
			}
		}
	case announcementdomain.AudienceStudent:
		for _, link := range s.studentGuardians {
			if link.StudentID == audience.ID {
				out = append(out, link.GuardianUserID)
			}
		}
	case announcementdomain.AudienceUser:
		if audience.ID != "" {
			out = append(out, audience.ID)
		}
	}
	return out
}

func (s *Store) ListTemplates(_ context.Context, tenantID string) ([]announcementdomain.Template, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	if s.announcementTemplates == nil {
		return []announcementdomain.Template{}, nil
	}
	out := make([]announcementdomain.Template, 0)
	for _, item := range s.announcementTemplates {
		if item.TenantID == tenantID {
			out = append(out, item)
		}
	}
	sort.Slice(out, func(i, j int) bool { return out[i].Name < out[j].Name })
	return out, nil
}

func (s *Store) GetTemplate(_ context.Context, tenantID, templateID string) (announcementdomain.Template, bool, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	if s.announcementTemplates == nil {
		return announcementdomain.Template{}, false, nil
	}
	item, ok := s.announcementTemplates[templateID]
	if !ok || item.TenantID != tenantID {
		return announcementdomain.Template{}, false, nil
	}
	return item, true, nil
}

func (s *Store) CreateTemplate(_ context.Context, tenantID, createdBy string, input announcementdomain.CreateTemplateInput) (announcementdomain.Template, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.announcementTemplates == nil {
		s.announcementTemplates = map[string]announcementdomain.Template{}
	}
	now := s.clock()
	id := fmt.Sprintf("template-%d", len(s.announcementTemplates)+1)
	category := strings.TrimSpace(input.Category)
	if category == "" {
		category = "general"
	}
	item := announcementdomain.Template{
		ID:            id,
		TenantID:      tenantID,
		Name:          strings.TrimSpace(input.Name),
		TitleTemplate: strings.TrimSpace(input.TitleTemplate),
		BodyTemplate:  strings.TrimSpace(input.BodyTemplate),
		Category:      category,
		CreatedBy:     createdBy,
		CreatedAt:     now,
		UpdatedAt:     now,
	}
	s.announcementTemplates[id] = item
	return item, nil
}

func (s *Store) UpdateTemplate(_ context.Context, tenantID, templateID string, input announcementdomain.UpdateTemplateInput) (announcementdomain.Template, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	item, ok := s.announcementTemplates[templateID]
	if !ok || item.TenantID != tenantID {
		return announcementdomain.Template{}, fmt.Errorf("not found")
	}
	if input.Name != nil {
		item.Name = strings.TrimSpace(*input.Name)
	}
	if input.TitleTemplate != nil {
		item.TitleTemplate = strings.TrimSpace(*input.TitleTemplate)
	}
	if input.BodyTemplate != nil {
		item.BodyTemplate = strings.TrimSpace(*input.BodyTemplate)
	}
	if input.Category != nil {
		item.Category = strings.TrimSpace(*input.Category)
	}
	item.UpdatedAt = s.clock()
	s.announcementTemplates[templateID] = item
	return item, nil
}

func (s *Store) DeleteTemplate(_ context.Context, tenantID, templateID string) bool {
	s.mu.Lock()
	defer s.mu.Unlock()
	item, ok := s.announcementTemplates[templateID]
	if !ok || item.TenantID != tenantID {
		return false
	}
	delete(s.announcementTemplates, templateID)
	return true
}

func audienceSummaryLocked(audiences []announcementdomain.AudienceTarget) string {
	if len(audiences) == 1 && audiences[0].Type == announcementdomain.AudienceRole {
		if audiences[0].Role == "teacher" {
			return "teachers"
		}
		if audiences[0].Role == "guardian" {
			return "guardians"
		}
	}
	if len(audiences) == 1 && audiences[0].Type == announcementdomain.AudienceAll {
		return "all"
	}
	if len(audiences) == 1 && audiences[0].Type == announcementdomain.AudienceClass && audiences[0].ID != "" {
		return "class:" + audiences[0].ID
	}
	return "mixed"
}
