package announcement

import (
	"context"
	"errors"
	"strings"
	"time"

	domain "ots/backend/internal/domain/announcement"
)

var (
	ErrInvalidInput        = errors.New("invalid announcement input")
	ErrNotFound            = errors.New("announcement not found")
	ErrForbidden           = errors.New("announcement forbidden")
	ErrPublishedImmutable  = errors.New("published announcement cannot change audiences")
	ErrTemplateNotFound    = errors.New("announcement template not found")
)

type Repository interface {
	ListTargetedAnnouncements(ctx context.Context, tenantID string, includeDrafts bool) ([]domain.Announcement, error)
	GetTargetedAnnouncement(ctx context.Context, tenantID, announcementID string) (domain.Announcement, bool, error)
	CreateTargetedAnnouncement(ctx context.Context, tenantID, createdBy string, input domain.CreateInput, audiences []domain.AudienceTarget, status domain.Status, publishedAt, scheduledAt *time.Time) (domain.Announcement, error)
	UpdateTargetedAnnouncement(ctx context.Context, tenantID, announcementID string, input domain.UpdateInput, audiences []domain.AudienceTarget, status domain.Status, scheduledAt *time.Time) (domain.Announcement, error)
	DeleteTargetedAnnouncement(ctx context.Context, tenantID, announcementID string) bool
	SetTargetedAnnouncementStatus(ctx context.Context, tenantID, announcementID string, status domain.Status, publishedAt *time.Time) (domain.Announcement, error)
	ListDueScheduled(ctx context.Context, now time.Time) ([]domain.Announcement, error)
	MarkAnnouncementRead(ctx context.Context, tenantID, announcementID, userID string, readAt time.Time) error
	GetUserTargetContext(ctx context.Context, tenantID, userID string) (domain.UserTargetContext, error)
	ResolveTargetUserIDs(ctx context.Context, tenantID string, audiences []domain.AudienceTarget) ([]string, error)
	CountAnnouncementReads(ctx context.Context, tenantID, announcementID string) (int, error)

	ListTemplates(ctx context.Context, tenantID string) ([]domain.Template, error)
	GetTemplate(ctx context.Context, tenantID, templateID string) (domain.Template, bool, error)
	CreateTemplate(ctx context.Context, tenantID, createdBy string, input domain.CreateTemplateInput) (domain.Template, error)
	UpdateTemplate(ctx context.Context, tenantID, templateID string, input domain.UpdateTemplateInput) (domain.Template, error)
	DeleteTemplate(ctx context.Context, tenantID, templateID string) bool

	RecordOperationalAudit(ctx context.Context, tenantID, userID, action, resourceType, resourceID, metadata string)
}

type Service struct {
	repo  Repository
	clock func() time.Time
}

func NewService(repo Repository, clock func() time.Time) *Service {
	if clock == nil {
		clock = time.Now
	}
	return &Service{repo: repo, clock: clock}
}

func (s *Service) ListForUser(ctx context.Context, tenantID, userID string, manage bool) ([]domain.Announcement, error) {
	items, err := s.repo.ListTargetedAnnouncements(ctx, tenantID, manage)
	if err != nil {
		return nil, err
	}
	if manage {
		return items, nil
	}
	ctxData, err := s.repo.GetUserTargetContext(ctx, tenantID, userID)
	if err != nil {
		return nil, err
	}
	out := make([]domain.Announcement, 0, len(items))
	for _, item := range items {
		if item.Status != domain.StatusPublished {
			continue
		}
		if !UserMatchesAudience(ctxData, item.Audiences) {
			continue
		}
		out = append(out, item)
	}
	return out, nil
}

func (s *Service) Get(ctx context.Context, tenantID, userID, announcementID string, manage bool) (domain.Announcement, error) {
	item, ok, err := s.repo.GetTargetedAnnouncement(ctx, tenantID, announcementID)
	if err != nil {
		return domain.Announcement{}, err
	}
	if !ok {
		return domain.Announcement{}, ErrNotFound
	}
	if !manage {
		if item.Status != domain.StatusPublished {
			return domain.Announcement{}, ErrNotFound
		}
		ctxData, err := s.repo.GetUserTargetContext(ctx, tenantID, userID)
		if err != nil {
			return domain.Announcement{}, err
		}
		if !UserMatchesAudience(ctxData, item.Audiences) {
			return domain.Announcement{}, ErrForbidden
		}
	}
	return item, nil
}

func (s *Service) Create(ctx context.Context, tenantID, userID string, input domain.CreateInput) (domain.Announcement, error) {
	title := strings.TrimSpace(input.Title)
	body := strings.TrimSpace(input.Body)
	audiences := NormalizeAudiences(input.Audience, input.Audiences)
	if title == "" || body == "" || len(audiences) == 0 {
		return domain.Announcement{}, ErrInvalidInput
	}
	now := s.clock()
	status := domain.StatusDraft
	var publishedAt *time.Time
	var scheduledAt = input.ScheduledAt
	if input.Publish {
		if scheduledAt != nil && scheduledAt.After(now) {
			status = domain.StatusScheduled
		} else {
			status = domain.StatusPublished
			publishedAt = &now
			scheduledAt = nil
		}
	} else if scheduledAt != nil && scheduledAt.After(now) {
		status = domain.StatusScheduled
	}
	created, err := s.repo.CreateTargetedAnnouncement(ctx, tenantID, userID, input, audiences, status, publishedAt, scheduledAt)
	if err != nil {
		return domain.Announcement{}, err
	}
	s.repo.RecordOperationalAudit(ctx, tenantID, userID, "announcement.create", "announcement", created.ID, `{}`)
	if status == domain.StatusPublished {
		s.repo.RecordOperationalAudit(ctx, tenantID, userID, "announcement.publish", "announcement", created.ID, `{}`)
	}
	return created, nil
}

func (s *Service) Update(ctx context.Context, tenantID, userID, announcementID string, input domain.UpdateInput) (domain.Announcement, error) {
	current, ok, err := s.repo.GetTargetedAnnouncement(ctx, tenantID, announcementID)
	if err != nil {
		return domain.Announcement{}, err
	}
	if !ok {
		return domain.Announcement{}, ErrNotFound
	}
	audiences := current.Audiences
	status := current.Status
	scheduledAt := current.ScheduledAt
	if input.Audiences != nil || input.Audience != nil {
		if current.Status == domain.StatusPublished || current.Status == domain.StatusArchived {
			return domain.Announcement{}, ErrPublishedImmutable
		}
		legacy := ""
		if input.Audience != nil {
			legacy = *input.Audience
		}
		if input.Audiences != nil {
			audiences = NormalizeAudiences(legacy, *input.Audiences)
		} else {
			audiences = NormalizeAudiences(legacy, nil)
		}
		if len(audiences) == 0 {
			return domain.Announcement{}, ErrInvalidInput
		}
	}
	if input.ScheduledAt != nil {
		if current.Status == domain.StatusPublished || current.Status == domain.StatusArchived {
			return domain.Announcement{}, ErrPublishedImmutable
		}
		scheduledAt = input.ScheduledAt
		if scheduledAt != nil && scheduledAt.After(s.clock()) {
			status = domain.StatusScheduled
		} else if status == domain.StatusScheduled {
			status = domain.StatusDraft
		}
	}
	updated, err := s.repo.UpdateTargetedAnnouncement(ctx, tenantID, announcementID, input, audiences, status, scheduledAt)
	if err != nil {
		return domain.Announcement{}, err
	}
	s.repo.RecordOperationalAudit(ctx, tenantID, userID, "announcement.update", "announcement", updated.ID, `{}`)
	return updated, nil
}

func (s *Service) Delete(ctx context.Context, tenantID, userID, announcementID string) error {
	_, ok, err := s.repo.GetTargetedAnnouncement(ctx, tenantID, announcementID)
	if err != nil {
		return err
	}
	if !ok {
		return ErrNotFound
	}
	if !s.repo.DeleteTargetedAnnouncement(ctx, tenantID, announcementID) {
		return ErrNotFound
	}
	s.repo.RecordOperationalAudit(ctx, tenantID, userID, "announcement.delete", "announcement", announcementID, `{}`)
	return nil
}

func (s *Service) Publish(ctx context.Context, tenantID, userID, announcementID string) (domain.Announcement, []string, error) {
	current, ok, err := s.repo.GetTargetedAnnouncement(ctx, tenantID, announcementID)
	if err != nil {
		return domain.Announcement{}, nil, err
	}
	if !ok {
		return domain.Announcement{}, nil, ErrNotFound
	}
	if current.Status == domain.StatusPublished {
		userIDs, _ := s.repo.ResolveTargetUserIDs(ctx, tenantID, current.Audiences)
		return current, userIDs, nil
	}
	if current.Status == domain.StatusArchived {
		return domain.Announcement{}, nil, ErrInvalidInput
	}
	now := s.clock()
	if current.ScheduledAt != nil && current.ScheduledAt.After(now) {
		return domain.Announcement{}, nil, ErrInvalidInput
	}
	published, err := s.repo.SetTargetedAnnouncementStatus(ctx, tenantID, announcementID, domain.StatusPublished, &now)
	if err != nil {
		return domain.Announcement{}, nil, err
	}
	s.repo.RecordOperationalAudit(ctx, tenantID, userID, "announcement.publish", "announcement", published.ID, `{}`)
	userIDs, err := s.repo.ResolveTargetUserIDs(ctx, tenantID, published.Audiences)
	return published, userIDs, err
}

func (s *Service) Archive(ctx context.Context, tenantID, userID, announcementID string) (domain.Announcement, error) {
	if _, ok, err := s.repo.GetTargetedAnnouncement(ctx, tenantID, announcementID); err != nil {
		return domain.Announcement{}, err
	} else if !ok {
		return domain.Announcement{}, ErrNotFound
	}
	archived, err := s.repo.SetTargetedAnnouncementStatus(ctx, tenantID, announcementID, domain.StatusArchived, nil)
	if err != nil {
		return domain.Announcement{}, err
	}
	s.repo.RecordOperationalAudit(ctx, tenantID, userID, "announcement.archive", "announcement", archived.ID, `{}`)
	return archived, nil
}

func (s *Service) MarkRead(ctx context.Context, tenantID, userID, announcementID string) error {
	item, err := s.Get(ctx, tenantID, userID, announcementID, false)
	if err != nil {
		return err
	}
	_ = item
	return s.repo.MarkAnnouncementRead(ctx, tenantID, announcementID, userID, s.clock())
}

func (s *Service) PublishDueScheduled(ctx context.Context) ([]domain.Announcement, error) {
	due, err := s.repo.ListDueScheduled(ctx, s.clock())
	if err != nil {
		return nil, err
	}
	out := make([]domain.Announcement, 0, len(due))
	for _, item := range due {
		published, _, err := s.Publish(ctx, item.TenantID, item.CreatedBy, item.ID)
		if err != nil {
			continue
		}
		out = append(out, published)
	}
	return out, nil
}

func (s *Service) ResolveTargetUserIDs(ctx context.Context, tenantID string, audiences []domain.AudienceTarget) ([]string, error) {
	return s.repo.ResolveTargetUserIDs(ctx, tenantID, audiences)
}

func (s *Service) ListTemplates(ctx context.Context, tenantID string) ([]domain.Template, error) {
	return s.repo.ListTemplates(ctx, tenantID)
}

func (s *Service) CreateTemplate(ctx context.Context, tenantID, userID string, input domain.CreateTemplateInput) (domain.Template, error) {
	if strings.TrimSpace(input.Name) == "" || strings.TrimSpace(input.TitleTemplate) == "" || strings.TrimSpace(input.BodyTemplate) == "" {
		return domain.Template{}, ErrInvalidInput
	}
	created, err := s.repo.CreateTemplate(ctx, tenantID, userID, input)
	if err != nil {
		return domain.Template{}, err
	}
	s.repo.RecordOperationalAudit(ctx, tenantID, userID, "announcement_template.create", "announcement_template", created.ID, `{}`)
	return created, nil
}

func (s *Service) UpdateTemplate(ctx context.Context, tenantID, userID, templateID string, input domain.UpdateTemplateInput) (domain.Template, error) {
	updated, err := s.repo.UpdateTemplate(ctx, tenantID, templateID, input)
	if err != nil {
		return domain.Template{}, ErrTemplateNotFound
	}
	if updated.ID == "" {
		return domain.Template{}, ErrTemplateNotFound
	}
	s.repo.RecordOperationalAudit(ctx, tenantID, userID, "announcement_template.update", "announcement_template", updated.ID, `{}`)
	return updated, nil
}

func (s *Service) DeleteTemplate(ctx context.Context, tenantID, userID, templateID string) error {
	if !s.repo.DeleteTemplate(ctx, tenantID, templateID) {
		return ErrTemplateNotFound
	}
	s.repo.RecordOperationalAudit(ctx, tenantID, userID, "announcement_template.delete", "announcement_template", templateID, `{}`)
	return nil
}

func (s *Service) EnrichManageStats(ctx context.Context, tenantID string, items []domain.Announcement) ([]domain.Announcement, error) {
	out := make([]domain.Announcement, 0, len(items))
	for _, item := range items {
		readCount, err := s.repo.CountAnnouncementReads(ctx, tenantID, item.ID)
		if err != nil {
			return nil, err
		}
		targetIDs, err := s.repo.ResolveTargetUserIDs(ctx, tenantID, item.Audiences)
		if err != nil {
			return nil, err
		}
		item.ReadCount = readCount
		item.TargetCount = len(targetIDs)
		out = append(out, item)
	}
	return out, nil
}
