package announcement

import (
	"context"
	"testing"
	"time"

	domain "ots/backend/internal/domain/announcement"
)

type testRepo struct {
	announcements map[string]domain.Announcement
	reads         map[string]time.Time
	userCtx       domain.UserTargetContext
	targetUsers   []string
}

func (r *testRepo) ListTargetedAnnouncements(_ context.Context, tenantID string, includeDrafts bool) ([]domain.Announcement, error) {
	out := make([]domain.Announcement, 0)
	for _, item := range r.announcements {
		if item.TenantID != tenantID {
			continue
		}
		if !includeDrafts && item.Status != domain.StatusPublished {
			continue
		}
		out = append(out, item)
	}
	return out, nil
}

func (r *testRepo) GetTargetedAnnouncement(_ context.Context, tenantID, announcementID string) (domain.Announcement, bool, error) {
	item, ok := r.announcements[announcementID]
	if !ok || item.TenantID != tenantID {
		return domain.Announcement{}, false, nil
	}
	return item, true, nil
}

func (r *testRepo) CreateTargetedAnnouncement(_ context.Context, tenantID, createdBy string, input domain.CreateInput, audiences []domain.AudienceTarget, status domain.Status, publishedAt, scheduledAt *time.Time) (domain.Announcement, error) {
	now := time.Now()
	item := domain.Announcement{
		ID:          "ann-1",
		TenantID:    tenantID,
		Title:       input.Title,
		Body:        input.Body,
		Status:      status,
		Audience:    AudienceSummary(audiences),
		Audiences:   audiences,
		PublishedAt: publishedAt,
		ScheduledAt: scheduledAt,
		CreatedBy:   createdBy,
		CreatedAt:   now,
		UpdatedAt:   now,
	}
	r.announcements[item.ID] = item
	return item, nil
}

func (r *testRepo) UpdateTargetedAnnouncement(_ context.Context, tenantID, announcementID string, input domain.UpdateInput, audiences []domain.AudienceTarget, status domain.Status, scheduledAt *time.Time) (domain.Announcement, error) {
	item, ok := r.announcements[announcementID]
	if !ok {
		return domain.Announcement{}, nil
	}
	if input.Title != nil {
		item.Title = *input.Title
	}
	if input.Body != nil {
		item.Body = *input.Body
	}
	item.Audiences = audiences
	item.Audience = AudienceSummary(audiences)
	item.Status = status
	item.ScheduledAt = scheduledAt
	r.announcements[announcementID] = item
	return item, nil
}

func (r *testRepo) DeleteTargetedAnnouncement(_ context.Context, tenantID, announcementID string) bool {
	item, ok := r.announcements[announcementID]
	if !ok || item.TenantID != tenantID {
		return false
	}
	delete(r.announcements, announcementID)
	return true
}

func (r *testRepo) SetTargetedAnnouncementStatus(_ context.Context, tenantID, announcementID string, status domain.Status, publishedAt *time.Time) (domain.Announcement, error) {
	item, ok := r.announcements[announcementID]
	if !ok || item.TenantID != tenantID {
		return domain.Announcement{}, nil
	}
	item.Status = status
	item.PublishedAt = publishedAt
	r.announcements[announcementID] = item
	return item, nil
}

func (r *testRepo) ListDueScheduled(context.Context, time.Time) ([]domain.Announcement, error) {
	return nil, nil
}

func (r *testRepo) MarkAnnouncementRead(_ context.Context, _, announcementID, userID string, readAt time.Time) error {
	r.reads[announcementID+":"+userID] = readAt
	return nil
}

func (r *testRepo) GetAnnouncementRead(_ context.Context, _, announcementID, userID string) (*time.Time, error) {
	readAt, ok := r.reads[announcementID+":"+userID]
	if !ok {
		return nil, nil
	}
	return &readAt, nil
}

func (r *testRepo) GetUserTargetContext(context.Context, string, string) (domain.UserTargetContext, error) {
	return r.userCtx, nil
}

func (r *testRepo) ResolveTargetUserIDs(context.Context, string, []domain.AudienceTarget) ([]string, error) {
	return r.targetUsers, nil
}

func (r *testRepo) CountAnnouncementReads(_ context.Context, _, announcementID string) (int, error) {
	count := 0
	for key := range r.reads {
		if len(key) > len(announcementID) && key[:len(announcementID)] == announcementID {
			count++
		}
	}
	return count, nil
}

func (r *testRepo) CountAnnouncementDeliveries(context.Context, string, string) (int, error) {
	return len(r.targetUsers), nil
}

func (r *testRepo) ListTemplates(context.Context, string) ([]domain.Template, error) { return nil, nil }
func (r *testRepo) GetTemplate(context.Context, string, string) (domain.Template, bool, error) {
	return domain.Template{}, false, nil
}
func (r *testRepo) CreateTemplate(context.Context, string, string, domain.CreateTemplateInput) (domain.Template, error) {
	return domain.Template{}, nil
}
func (r *testRepo) UpdateTemplate(context.Context, string, string, domain.UpdateTemplateInput) (domain.Template, error) {
	return domain.Template{}, nil
}
func (r *testRepo) DeleteTemplate(context.Context, string, string) bool { return false }
func (r *testRepo) RecordOperationalAudit(context.Context, string, string, string, string, string, string) {
}

func TestTeacherDoesNotSeeGuardianOnlyAnnouncement(t *testing.T) {
	repo := &testRepo{
		announcements: map[string]domain.Announcement{
			"ann-1": {
				ID:        "ann-1",
				TenantID:  "tenant-1",
				Title:     "Veli duyurusu",
				Status:    domain.StatusPublished,
				Audiences: []domain.AudienceTarget{{Type: domain.AudienceRole, Role: "guardian"}},
			},
		},
		userCtx: domain.UserTargetContext{
			UserID:    "teacher-1",
			RoleCodes: []string{"teacher"},
		},
	}
	svc := NewService(repo, time.Now)
	items, err := svc.ListForUser(context.Background(), "tenant-1", "teacher-1", false)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(items) != 0 {
		t.Fatalf("expected no announcements for teacher, got %d", len(items))
	}
}

func TestDraftAnnouncementHiddenFromTargets(t *testing.T) {
	repo := &testRepo{
		announcements: map[string]domain.Announcement{
			"ann-1": {
				ID:        "ann-1",
				TenantID:  "tenant-1",
				Status:    domain.StatusDraft,
				Audiences: []domain.AudienceTarget{{Type: domain.AudienceAll}},
			},
		},
		userCtx: domain.UserTargetContext{RoleCodes: []string{"teacher"}},
	}
	svc := NewService(repo, time.Now)
	items, err := svc.ListForUser(context.Background(), "tenant-1", "teacher-1", false)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(items) != 0 {
		t.Fatalf("expected draft hidden, got %d", len(items))
	}
}

func TestGuardianMatchesClassAudience(t *testing.T) {
	ctx := domain.UserTargetContext{
		RoleCodes:          []string{"guardian"},
		GuardianStudentIDs: []string{"student-1"},
		StudentClassIDs:    map[string]string{"student-1": "class-5a"},
	}
	if !UserMatchesAudience(ctx, []domain.AudienceTarget{{Type: domain.AudienceClass, ID: "class-5a"}}) {
		t.Fatal("expected guardian to match class audience")
	}
	if UserMatchesAudience(ctx, []domain.AudienceTarget{{Type: domain.AudienceClass, ID: "class-6b"}}) {
		t.Fatal("expected guardian not to match other class")
	}
}

func TestCreateDraftByDefault(t *testing.T) {
	repo := &testRepo{announcements: map[string]domain.Announcement{}}
	svc := NewService(repo, time.Now)
	created, err := svc.Create(context.Background(), "tenant-1", "principal-1", domain.CreateInput{
		Title:     "Taslak",
		Body:      "İçerik",
		Audiences: []domain.AudienceTarget{{Type: domain.AudienceAll}},
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if created.Status != domain.StatusDraft {
		t.Fatalf("expected draft, got %s", created.Status)
	}
}

func TestListForUserIncludesReadAt(t *testing.T) {
	readAt := time.Date(2026, 6, 8, 10, 30, 0, 0, time.UTC)
	repo := &testRepo{
		announcements: map[string]domain.Announcement{
			"ann-1": {
				ID:        "ann-1",
				TenantID:  "tenant-1",
				Status:    domain.StatusPublished,
				Audiences: []domain.AudienceTarget{{Type: domain.AudienceRole, Role: "guardian"}},
			},
		},
		reads: map[string]time.Time{"ann-1:guardian-1": readAt},
		userCtx: domain.UserTargetContext{
			UserID:    "guardian-1",
			RoleCodes: []string{"guardian"},
		},
	}
	svc := NewService(repo, time.Now)
	items, err := svc.ListForUser(context.Background(), "tenant-1", "guardian-1", false)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(items) != 1 || items[0].ReadAt == nil || !items[0].ReadAt.Equal(readAt) {
		t.Fatalf("expected readAt on announcement, got %#v", items)
	}
}

func TestEnrichManageStatsIncludesDeliveryCount(t *testing.T) {
	repo := &testRepo{
		announcements: map[string]domain.Announcement{},
		reads:         map[string]time.Time{"ann-1:user-1": time.Now()},
		targetUsers:   []string{"user-1", "user-2", "user-3"},
	}
	svc := NewService(repo, time.Now)
	items, err := svc.EnrichManageStats(context.Background(), "tenant-1", []domain.Announcement{{
		ID:        "ann-1",
		TenantID:  "tenant-1",
		Audiences: []domain.AudienceTarget{{Type: domain.AudienceAll}},
	}})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(items) != 1 || items[0].TargetCount != 3 || items[0].DeliveryCount != 3 || items[0].ReadCount != 1 {
		t.Fatalf("unexpected stats: %#v", items)
	}
}
