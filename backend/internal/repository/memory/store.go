package memory

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"sort"
	"strings"
	"sync"
	"time"

	"ots/backend/internal/domain/attendance"
	"ots/backend/internal/domain/dashboard"
	"ots/backend/internal/domain/identity"
	"ots/backend/internal/domain/observation"
	"ots/backend/internal/domain/scheduling"
	"ots/backend/internal/domain/school"
	superadmindomain "ots/backend/internal/domain/superadmin"
)

type Store struct {
	mu             sync.RWMutex
	clock          func() time.Time
	tenant         school.Tenant
	institutions   []superadmindomain.Institution
	users          []systemUser
	auditLogs      []superadmindomain.AuditEntry
	supportTickets []superadmindomain.SupportTicket
	maintenance    superadmindomain.MaintenanceMode
	credentials    map[string]memoryCredential
	classes        []school.Class
	students       []school.Student
	teachers       []school.Teacher
	subjects       []school.Subject
	schedule       scheduling.Schedule
	sessions       map[string]attendance.Session
	observations   []observation.Observation
	announcements  []school.Announcement
}

type memoryCredential struct {
	Value     string
	UpdatedAt *time.Time
}

type systemUser struct {
	ID                 string
	TenantID           string
	Tenant             string
	FullName           string
	Email              string
	Role               identity.Role
	Status             string
	MustChangePassword bool
	PasswordHash       string
	PasswordSalt       string
	CreatedAt          time.Time
}

func NewStore(clock func() time.Time) *Store {
	if clock == nil {
		clock = time.Now
	}

	now := clock()
	today := normalizeSchoolDay(now)

	tenant := school.Tenant{
		ID:       "tenant-demo",
		Name:     "Özel Atlas Koleji",
		Plan:     "MVP Pilot",
		Timezone: "Europe/Istanbul",
	}

	classes := []school.Class{
		{ID: "class-5a", TenantID: tenant.ID, Name: "5/A", Level: "Ortaokul", Branch: "A"},
		{ID: "class-6b", TenantID: tenant.ID, Name: "6/B", Level: "Ortaokul", Branch: "B"},
		{ID: "class-ana", TenantID: tenant.ID, Name: "Ana Sınıfı", Level: "Okul Öncesi", Branch: "A"},
	}

	students := []school.Student{
		{ID: "student-1", TenantID: tenant.ID, ClassID: "class-5a", FullName: "Defne Yılmaz", Number: "501"},
		{ID: "student-2", TenantID: tenant.ID, ClassID: "class-5a", FullName: "Efe Demir", Number: "502"},
		{ID: "student-3", TenantID: tenant.ID, ClassID: "class-5a", FullName: "Mina Kaya", Number: "503"},
		{ID: "student-4", TenantID: tenant.ID, ClassID: "class-6b", FullName: "Aras Çelik", Number: "601"},
		{ID: "student-5", TenantID: tenant.ID, ClassID: "class-6b", FullName: "Elif Aydın", Number: "602"},
		{ID: "student-6", TenantID: tenant.ID, ClassID: "class-ana", FullName: "Can Koç", Number: "A01"},
	}

	teachers := []school.Teacher{
		{ID: "teacher-profile-1", UserID: "teacher-1", TenantID: tenant.ID, FullName: "Ayşe Kara", Title: "Matematik Öğretmeni"},
		{ID: "teacher-profile-2", UserID: "teacher-2", TenantID: tenant.ID, FullName: "Murat Aksoy", Title: "Türkçe Öğretmeni"},
		{ID: "teacher-profile-3", UserID: "teacher-3", TenantID: tenant.ID, FullName: "Selin Ergin", Title: "Rehber Öğretmen"},
	}

	subjects := []school.Subject{
		{ID: "subject-math", TenantID: tenant.ID, Name: "Matematik", Code: "MAT"},
		{ID: "subject-tr", TenantID: tenant.ID, Name: "Türkçe", Code: "TUR"},
		{ID: "subject-life", TenantID: tenant.ID, Name: "Yaşam Becerileri", Code: "YAS"},
	}

	lessons := []scheduling.Lesson{
		newLesson(tenant.ID, "lesson-1", "schedule-published", classes[0], teachers[0], subjects[0], today, "09:00", "09:40", "Derslik 5A"),
		newLesson(tenant.ID, "lesson-2", "schedule-published", classes[0], teachers[1], subjects[1], today, "10:00", "10:40", "Derslik 5A"),
		newLesson(tenant.ID, "lesson-3", "schedule-published", classes[1], teachers[0], subjects[0], today, "11:00", "11:40", "Derslik 6B"),
		newLesson(tenant.ID, "lesson-4", "schedule-published", classes[2], teachers[2], subjects[2], today, "13:00", "13:40", "Etkinlik Alanı"),
	}

	schedule := scheduling.Schedule{
		ID:        "schedule-published",
		TenantID:  tenant.ID,
		Name:      "2026 Bahar Haftalık Program",
		Status:    scheduling.SchedulePublished,
		Version:   3,
		Score:     91,
		Lessons:   lessons,
		UpdatedAt: now.Add(-2 * time.Hour),
	}

	observations := []observation.Observation{
		{
			ID:          "observation-1",
			TenantID:    tenant.ID,
			StudentID:   "student-2",
			StudentName: "Efe Demir",
			ClassID:     "class-5a",
			ClassName:   "5/A",
			AuthorID:    "teacher-1",
			AuthorName:  "Ayşe Kara",
			Category:    observation.CategoryAttention,
			Note:        "Son iki matematik dersinde dikkat süresi belirgin şekilde kısaldı.",
			Sensitivity: "sensitive_student",
			CreatedAt:   now.Add(-26 * time.Hour),
		},
	}

	users := []systemUser{
		{
			ID:           "user-super-admin",
			TenantID:     "system",
			Tenant:       "ÖTS Platform",
			FullName:     "ÖTS Süper Admin",
			Email:        "superadmin@ots.local",
			Role:         identity.RoleSuperAdmin,
			Status:       "active",
			PasswordSalt: "ots-default-superadmin",
			PasswordHash: "0e38f4b8c4c9795fcadf90a458054a897b0e430dacf62144c4e4a246276b058b",
			CreatedAt:    now.AddDate(0, -2, 0),
		},
		{
			ID:        "teacher-1",
			TenantID:  tenant.ID,
			Tenant:    tenant.Name,
			FullName:  "Ayşe Kara",
			Email:     "ayse.kara@atlas.k12.tr",
			Role:      identity.RoleTeacher,
			Status:    "active",
			CreatedAt: now.AddDate(0, -1, -12),
		},
		{
			ID:        "principal-1",
			TenantID:  tenant.ID,
			Tenant:    tenant.Name,
			FullName:  "Cem Arslan",
			Email:     "cem.arslan@atlas.k12.tr",
			Role:      identity.RolePrincipal,
			Status:    "active",
			CreatedAt: now.AddDate(0, -1, -18),
		},
		{
			ID:        "guidance-1",
			TenantID:  tenant.ID,
			Tenant:    tenant.Name,
			FullName:  "Selin Ergin",
			Email:     "selin.ergin@atlas.k12.tr",
			Role:      identity.RoleGuidance,
			Status:    "active",
			CreatedAt: now.AddDate(0, -1, -8),
		},
		{
			ID:        "guardian-1",
			TenantID:  tenant.ID,
			Tenant:    tenant.Name,
			FullName:  "Merve Demir",
			Email:     "merve.demir@example.com",
			Role:      identity.RoleGuardian,
			Status:    "invited",
			CreatedAt: now.AddDate(0, 0, -5),
		},
	}

	institutions := []superadmindomain.Institution{
		{ID: tenant.ID, Name: tenant.Name, Plan: tenant.Plan, Timezone: tenant.Timezone, Students: len(students), Users: 4, Status: "active", LastActivityAt: now.Add(-18 * time.Minute)},
		{ID: "tenant-02", Name: "Bilge Çocuk Kreşi", Plan: "Starter", Timezone: "Europe/Istanbul", Students: 84, Users: 19, Status: "trial", LastActivityAt: now.Add(-2 * time.Hour)},
		{ID: "tenant-03", Name: "Nova Etüt Merkezi", Plan: "Premium", Timezone: "Europe/Istanbul", Students: 231, Users: 42, Status: "active", LastActivityAt: now.Add(-41 * time.Minute)},
		{ID: "tenant-04", Name: "Kuzey Kurs Akademi", Plan: "Growth", Timezone: "Europe/Istanbul", Students: 156, Users: 28, Status: "review", LastActivityAt: now.Add(-7 * time.Hour)},
	}

	auditLogs := []superadmindomain.AuditEntry{
		{ID: "audit-1", Tenant: tenant.Name, Actor: "Cem Arslan", Action: "schedule.publish", ResourceType: "schedule", Sensitivity: "operational", CreatedAt: now.Add(-14 * time.Minute)},
		{ID: "audit-2", Tenant: tenant.Name, Actor: "Ayşe Kara", Action: "attendance.update", ResourceType: "attendance_session", Sensitivity: "operational", CreatedAt: now.Add(-38 * time.Minute)},
		{ID: "audit-3", Tenant: tenant.Name, Actor: "Selin Ergin", Action: "guidance.view", ResourceType: "student_observation", Sensitivity: "sensitive_student", CreatedAt: now.Add(-1 * time.Hour)},
		{ID: "audit-4", Tenant: "Nova Etüt Merkezi", Actor: "Sistem", Action: "tenant.plan_changed", ResourceType: "tenant", Sensitivity: "system_confidential", CreatedAt: now.Add(-5 * time.Hour)},
	}

	return &Store{
		clock:        clock,
		tenant:       tenant,
		institutions: institutions,
		users:        users,
		auditLogs:    auditLogs,
		supportTickets: []superadmindomain.SupportTicket{
			{
				ID:            "support-1",
				TenantID:      tenant.ID,
				Tenant:        tenant.Name,
				ReporterID:    "principal-1",
				ReporterName:  "Cem Arslan",
				ReporterEmail: "cem.arslan@atlas.k12.tr",
				Type:          "suggestion",
				Subject:       "Veli duyurularında gönderim planlama",
				Message:       "Duyuruların ileri tarihli gönderilebilmesi kurum operasyonunu kolaylaştırır.",
				Status:        "open",
				Priority:      "normal",
				CreatedAt:     now.Add(-3 * time.Hour),
				UpdatedAt:     now.Add(-3 * time.Hour),
			},
		},
		maintenance: superadmindomain.MaintenanceMode{
			Enabled: false,
			Message: "Sistem bakımı devam ediyor. Kısa süre sonra tekrar deneyebilirsiniz.",
		},
		credentials:  map[string]memoryCredential{},
		classes:      classes,
		students:     students,
		teachers:     teachers,
		subjects:     subjects,
		schedule:     schedule,
		sessions:     map[string]attendance.Session{},
		observations: observations,
		announcements: []school.Announcement{
			{
				ID:          "announcement-1",
				TenantID:    tenant.ID,
				Title:       "Haftalık bülten yayınlandı",
				Body:        "Bu hafta veli bilgilendirme toplantıları sınıf bazlı takvim üzerinden paylaşılacaktır.",
				Audience:    "guardians",
				PublishedAt: now.Add(-3 * time.Hour),
			},
			{
				ID:          "announcement-2",
				TenantID:    tenant.ID,
				Title:       "Program değişikliği",
				Body:        "Perşembe günü 5/A Matematik dersi ikinci saate alınmıştır.",
				Audience:    "teachers",
				PublishedAt: now.Add(-90 * time.Minute),
			},
		},
	}
}

func (s *Store) Authenticate(_ context.Context, email string, password string) (identity.Principal, bool, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	email = strings.ToLower(strings.TrimSpace(email))
	for _, user := range s.users {
		if strings.ToLower(user.Email) != email || user.Status != "active" {
			continue
		}
		if user.PasswordHash != hashPassword(user.PasswordSalt, password) {
			return identity.Principal{}, false, nil
		}
		return identity.Principal{
			UserID:             user.ID,
			TenantID:           user.TenantID,
			Role:               user.Role,
			Name:               user.FullName,
			Email:              user.Email,
			MustChangePassword: user.MustChangePassword,
		}, true, nil
	}
	return identity.Principal{}, false, nil
}

func (s *Store) SetPassword(_ context.Context, userID string, newPassword string) (identity.Principal, bool, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	for index := range s.users {
		if s.users[index].ID != userID || s.users[index].Status != "active" {
			continue
		}
		salt := fmt.Sprintf("memory-%d", s.clock().UnixNano())
		s.users[index].PasswordSalt = salt
		s.users[index].PasswordHash = hashPassword(salt, newPassword)
		s.users[index].MustChangePassword = false
		return identity.Principal{
			UserID:             s.users[index].ID,
			TenantID:           s.users[index].TenantID,
			Role:               s.users[index].Role,
			Name:               s.users[index].FullName,
			Email:              s.users[index].Email,
			MustChangePassword: false,
		}, true, nil
	}
	return identity.Principal{}, false, nil
}

func (s *Store) SystemStatus(_ context.Context) (superadmindomain.SystemStatus, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return superadmindomain.SystemStatus{Maintenance: s.maintenance}, nil
}

func (s *Store) SystemMetrics(_ context.Context) (superadmindomain.SystemMetrics, error) {
	now := s.clock().UTC()
	return superadmindomain.SystemMetrics{
		UpdatedAt: now,
		Health:    "healthy",
		Resources: []superadmindomain.ResourceMetric{
			{Key: "cpu", Label: "CPU", Value: 24.8, Unit: "%", Status: "healthy", Description: "Demo runtime CPU kullanımı"},
			{Key: "ram", Label: "RAM", Value: 48.2, Unit: "%", Status: "healthy", Description: "Demo sunucu RAM kullanımı"},
			{Key: "disk", Label: "Disk", Value: 41.5, Unit: "%", Status: "healthy", Description: "Demo disk doluluk oranı"},
			{Key: "heap", Label: "API Heap", Value: 33.1, Unit: "%", Status: "healthy", Description: "Demo API runtime heap"},
		},
		Services: []superadmindomain.ServiceMetric{
			{Key: "backend", Name: "Backend API", Status: "healthy", Description: "Go API health endpoint yanıt veriyor."},
			{Key: "postgres", Name: "Postgres", Status: "healthy", LatencyMs: 3, Description: "Veritabanı ping kontrolü."},
			{Key: "frontend", Name: "Frontend", Status: "healthy", Description: "Nginx frontend yayını aktif."},
			{Key: "migrations", Name: "Migration", Status: "healthy", Description: "Schema migration takibi aktif."},
		},
	}, nil
}

func (s *Store) PlatformSettings(_ context.Context) (superadmindomain.PlatformSettings, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.platformSettingsLocked(), nil
}

func (s *Store) UpdatePlatformSettings(_ context.Context, actor identity.Principal, input superadmindomain.UpdatePlatformSettingsInput) (superadmindomain.PlatformSettings, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	now := s.clock().UTC()
	s.maintenance = superadmindomain.MaintenanceMode{
		Enabled:   input.Maintenance.Enabled,
		Message:   strings.TrimSpace(input.Maintenance.Message),
		UpdatedAt: &now,
	}
	if s.maintenance.Message == "" {
		s.maintenance.Message = "Sistem bakımı devam ediyor. Kısa süre sonra tekrar deneyebilirsiniz."
	}
	for _, credential := range input.Credentials {
		definition, ok := credentialDefinition(credential.Key)
		if !ok {
			return superadmindomain.PlatformSettings{}, superadmindomain.ErrInvalidSettings
		}
		_ = definition
		if credential.Clear {
			s.credentials[credential.Key] = memoryCredential{UpdatedAt: &now}
			continue
		}
		if strings.TrimSpace(credential.Value) != "" {
			s.credentials[credential.Key] = memoryCredential{Value: strings.TrimSpace(credential.Value), UpdatedAt: &now}
		}
	}
	s.auditLogs = append(s.auditLogs, superadmindomain.AuditEntry{
		ID:           fmt.Sprintf("audit-%d", len(s.auditLogs)+1),
		Tenant:       "ÖTS Platform",
		Actor:        actor.Name,
		Action:       "platform_settings.update",
		ResourceType: "platform_settings",
		Sensitivity:  "system_confidential",
		CreatedAt:    now,
	})
	return s.platformSettingsLocked(), nil
}

func (s *Store) CreateSupportTicket(_ context.Context, principal identity.Principal, input superadmindomain.CreateSupportTicketInput) (superadmindomain.SupportTicket, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	ticketType := normalizeSupportTicketType(input.Type)
	subject := strings.TrimSpace(input.Subject)
	message := strings.TrimSpace(input.Message)
	if ticketType == "" || subject == "" || message == "" {
		return superadmindomain.SupportTicket{}, superadmindomain.ErrInvalidSupportTicket
	}
	now := s.clock().UTC()
	ticket := superadmindomain.SupportTicket{
		ID:            fmt.Sprintf("support-%d", len(s.supportTickets)+1),
		TenantID:      principal.TenantID,
		Tenant:        s.tenantNameLocked(principal.TenantID),
		ReporterID:    principal.UserID,
		ReporterName:  principal.Name,
		ReporterEmail: principal.Email,
		Type:          ticketType,
		Subject:       subject,
		Message:       message,
		Status:        "open",
		Priority:      "normal",
		CreatedAt:     now,
		UpdatedAt:     now,
	}
	if ticket.Tenant == "" {
		ticket.Tenant = "ÖTS Platform"
	}
	if ticket.ReporterName == "" {
		ticket.ReporterName = "Kullanıcı"
	}
	s.supportTickets = append(s.supportTickets, ticket)
	s.auditLogs = append(s.auditLogs, superadmindomain.AuditEntry{
		ID:           fmt.Sprintf("audit-%d", len(s.auditLogs)+1),
		Tenant:       ticket.Tenant,
		Actor:        ticket.ReporterName,
		Action:       "support_ticket.create",
		ResourceType: "support_ticket",
		Sensitivity:  "operational",
		CreatedAt:    now,
	})
	return ticket, nil
}

func (s *Store) ListSupportTickets(_ context.Context) ([]superadmindomain.SupportTicket, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := append([]superadmindomain.SupportTicket(nil), s.supportTickets...)
	sort.Slice(out, func(i, j int) bool {
		return supportStatusRank(out[i].Status) < supportStatusRank(out[j].Status) || (supportStatusRank(out[i].Status) == supportStatusRank(out[j].Status) && out[i].CreatedAt.After(out[j].CreatedAt))
	})
	return out, nil
}

func (s *Store) UpdateSupportTicket(_ context.Context, actor identity.Principal, ticketID string, input superadmindomain.UpdateSupportTicketInput) (superadmindomain.SupportTicket, bool, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	status := normalizeSupportTicketStatus(input.Status)
	priority := normalizeSupportTicketPriority(input.Priority)
	if status == "" || priority == "" {
		return superadmindomain.SupportTicket{}, false, superadmindomain.ErrInvalidSupportTicket
	}
	for index := range s.supportTickets {
		if s.supportTickets[index].ID != ticketID {
			continue
		}
		now := s.clock().UTC()
		s.supportTickets[index].Status = status
		s.supportTickets[index].Priority = priority
		s.supportTickets[index].InternalNote = strings.TrimSpace(input.InternalNote)
		s.supportTickets[index].UpdatedAt = now
		s.auditLogs = append(s.auditLogs, superadmindomain.AuditEntry{
			ID:           fmt.Sprintf("audit-%d", len(s.auditLogs)+1),
			Tenant:       s.supportTickets[index].Tenant,
			Actor:        actor.Name,
			Action:       "support_ticket.update",
			ResourceType: "support_ticket",
			Sensitivity:  "system_confidential",
			CreatedAt:    now,
		})
		return s.supportTickets[index], true, nil
	}
	return superadmindomain.SupportTicket{}, false, nil
}

func (s *Store) SuperAdminOverview(_ context.Context) (superadmindomain.Overview, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	activeUsers := 0
	for _, user := range s.users {
		if user.Status == "active" {
			activeUsers++
		}
	}

	return superadmindomain.Overview{
		Institutions:        len(s.institutions),
		ActiveUsers:         activeUsers,
		SystemHealth:        "healthy",
		MonthlyRevenueTRY:   184500,
		OpenSecuritySignals: 2,
		Usage: []superadmindomain.UsagePoint{
			{Label: "Pzt", Value: 64},
			{Label: "Sal", Value: 71},
			{Label: "Çar", Value: 86},
			{Label: "Per", Value: 78},
			{Label: "Cum", Value: 92},
		},
		Incidents: []superadmindomain.Incident{
			{ID: "incident-1", Title: "Kuzey Kurs Akademi tenant scope kontrolü incelemede", Severity: "medium", Status: "review"},
			{ID: "incident-2", Title: "2 başarısız süper admin giriş denemesi", Severity: "low", Status: "watching"},
		},
		Modules: []superadmindomain.ModuleStatus{
			{Name: "Auth", Status: "operational", Description: "Login ve rol kapsamı çalışıyor."},
			{Name: "Scheduling", Status: "operational", Description: "Program üretim API'si erişilebilir."},
			{Name: "Attendance", Status: "operational", Description: "Yoklama oturumları kaydediliyor."},
			{Name: "Guidance", Status: "limited", Description: "MVP gözlem kayıtları aktif."},
			{Name: "Billing", Status: "planned", Description: "Premium modül fazına ayrıldı."},
		},
	}, nil
}

func (s *Store) ListInstitutions(_ context.Context) ([]superadmindomain.Institution, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := append([]superadmindomain.Institution(nil), s.institutions...)
	sort.Slice(out, func(i, j int) bool { return out[i].LastActivityAt.After(out[j].LastActivityAt) })
	return out, nil
}

func (s *Store) GetInstitution(_ context.Context, tenantID string) (superadmindomain.InstitutionDetail, bool, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	for _, institution := range s.institutions {
		if institution.ID == tenantID {
			return superadmindomain.InstitutionDetail{
				Institution: institution,
				CreatedAt:   institution.LastActivityAt,
				UpdatedAt:   institution.LastActivityAt,
			}, true, nil
		}
	}
	return superadmindomain.InstitutionDetail{}, false, nil
}

func (s *Store) CreateInstitution(_ context.Context, _ identity.Principal, input superadmindomain.CreateInstitutionInput) (superadmindomain.InstitutionDetail, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	now := s.clock()
	plan := strings.TrimSpace(input.Plan)
	if plan == "" {
		plan = "MVP"
	}
	timezone := strings.TrimSpace(input.Timezone)
	if timezone == "" {
		timezone = "Europe/Istanbul"
	}
	institution := superadmindomain.Institution{
		ID:             fmt.Sprintf("tenant-%02d", len(s.institutions)+1),
		Name:           strings.TrimSpace(input.Name),
		Plan:           plan,
		Timezone:       timezone,
		Status:         "active",
		LastActivityAt: now,
	}
	s.institutions = append(s.institutions, institution)
	return superadmindomain.InstitutionDetail{Institution: institution, CreatedAt: now, UpdatedAt: now}, nil
}

func (s *Store) ListUserAccounts(_ context.Context) ([]superadmindomain.UserAccount, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := make([]superadmindomain.UserAccount, 0, len(s.users))
	for _, user := range s.users {
		out = append(out, superadmindomain.UserAccount{
			ID:                 user.ID,
			TenantID:           user.TenantID,
			Tenant:             user.Tenant,
			FullName:           user.FullName,
			Email:              user.Email,
			Role:               string(user.Role),
			Status:             userStatus(user),
			MustChangePassword: user.MustChangePassword,
			CreatedAt:          user.CreatedAt,
		})
	}
	sort.Slice(out, func(i, j int) bool { return out[i].CreatedAt.After(out[j].CreatedAt) })
	return out, nil
}

func (s *Store) CreateUser(ctx context.Context, actor identity.Principal, input superadmindomain.CreateUserInput) (superadmindomain.CreatedUserCredential, error) {
	return s.CreateInstitutionUser(ctx, actor, input.TenantID, superadmindomain.CreateInstitutionUserInput{
		Email:    input.Email,
		FullName: input.FullName,
		Role:     input.Role,
	})
}

func (s *Store) UpdateUser(_ context.Context, _ identity.Principal, userID string, input superadmindomain.UpdateUserInput) (superadmindomain.UserAccount, bool, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	for index := range s.users {
		if s.users[index].ID != userID || s.users[index].TenantID != input.TenantID {
			continue
		}
		if s.users[index].Role == identity.RoleSuperAdmin {
			return superadmindomain.UserAccount{}, false, superadmindomain.ErrProtectedUser
		}
		s.users[index].FullName = strings.TrimSpace(input.FullName)
		s.users[index].Email = strings.ToLower(strings.TrimSpace(input.Email))
		s.users[index].Role = identity.Role(strings.TrimSpace(input.Role))
		if strings.TrimSpace(input.Status) == "passive" {
			s.users[index].Status = "passive"
		} else {
			s.users[index].Status = "active"
		}
		return superadmindomain.UserAccount{
			ID:                 s.users[index].ID,
			TenantID:           s.users[index].TenantID,
			Tenant:             s.users[index].Tenant,
			FullName:           s.users[index].FullName,
			Email:              s.users[index].Email,
			Role:               string(s.users[index].Role),
			Status:             userStatus(s.users[index]),
			MustChangePassword: s.users[index].MustChangePassword,
			CreatedAt:          s.users[index].CreatedAt,
		}, true, nil
	}
	return superadmindomain.UserAccount{}, false, nil
}

func (s *Store) DeleteUser(_ context.Context, _ identity.Principal, userID string, tenantID string) (superadmindomain.UserAccount, bool, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	for index := range s.users {
		if s.users[index].ID != userID || s.users[index].TenantID != tenantID {
			continue
		}
		if s.users[index].Role == identity.RoleSuperAdmin {
			return superadmindomain.UserAccount{}, false, superadmindomain.ErrProtectedUser
		}
		s.users[index].Status = "passive"
		s.users[index].MustChangePassword = false
		return superadmindomain.UserAccount{
			ID:                 s.users[index].ID,
			TenantID:           s.users[index].TenantID,
			Tenant:             s.users[index].Tenant,
			FullName:           s.users[index].FullName,
			Email:              s.users[index].Email,
			Role:               string(s.users[index].Role),
			Status:             userStatus(s.users[index]),
			MustChangePassword: s.users[index].MustChangePassword,
			CreatedAt:          s.users[index].CreatedAt,
		}, true, nil
	}
	return superadmindomain.UserAccount{}, false, nil
}

func (s *Store) ListInstitutionUsers(_ context.Context, tenantID string) ([]superadmindomain.UserAccount, error) {
	users, _ := s.ListUserAccounts(context.Background())
	out := make([]superadmindomain.UserAccount, 0, len(users))
	for _, user := range users {
		if user.TenantID == tenantID {
			out = append(out, user)
		}
	}
	return out, nil
}

func (s *Store) CreateInstitutionUser(_ context.Context, _ identity.Principal, tenantID string, input superadmindomain.CreateInstitutionUserInput) (superadmindomain.CreatedUserCredential, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	tenantName := ""
	for _, institution := range s.institutions {
		if institution.ID == tenantID {
			tenantName = institution.Name
			break
		}
	}
	if tenantName == "" {
		return superadmindomain.CreatedUserCredential{}, nil
	}
	now := s.clock()
	email := strings.ToLower(strings.TrimSpace(input.Email))
	fullName := strings.TrimSpace(input.FullName)
	if fullName == "" {
		fullName = email
	}
	role := identity.Role(strings.TrimSpace(input.Role))
	if role == "" {
		role = identity.RolePrincipal
	}
	tempPassword := "OtsTemp!2026"
	salt := fmt.Sprintf("memory-%d", now.UnixNano())
	user := systemUser{
		ID:                 fmt.Sprintf("user-%d", len(s.users)+1),
		TenantID:           tenantID,
		Tenant:             tenantName,
		FullName:           fullName,
		Email:              email,
		Role:               role,
		Status:             "active",
		MustChangePassword: true,
		PasswordSalt:       salt,
		PasswordHash:       hashPassword(salt, tempPassword),
		CreatedAt:          now,
	}
	s.users = append(s.users, user)
	return superadmindomain.CreatedUserCredential{
		User: superadmindomain.UserAccount{
			ID:                 user.ID,
			TenantID:           user.TenantID,
			Tenant:             user.Tenant,
			FullName:           user.FullName,
			Email:              user.Email,
			Role:               string(user.Role),
			Status:             userStatus(user),
			MustChangePassword: user.MustChangePassword,
			CreatedAt:          user.CreatedAt,
		},
		TemporaryPassword: tempPassword,
	}, nil
}

func (s *Store) ListAuditEntries(_ context.Context) ([]superadmindomain.AuditEntry, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := append([]superadmindomain.AuditEntry(nil), s.auditLogs...)
	sort.Slice(out, func(i, j int) bool { return out[i].CreatedAt.After(out[j].CreatedAt) })
	return out, nil
}

func (s *Store) CurrentTenant(_ context.Context, tenantID string) (school.Tenant, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	if tenantID != s.tenant.ID {
		return school.Tenant{}, false
	}
	return s.tenant, true
}

func (s *Store) ListAnnouncements(_ context.Context, tenantID string) []school.Announcement {
	s.mu.RLock()
	defer s.mu.RUnlock()
	if tenantID != s.tenant.ID {
		return nil
	}
	out := append([]school.Announcement(nil), s.announcements...)
	sort.Slice(out, func(i, j int) bool { return out[i].PublishedAt.After(out[j].PublishedAt) })
	return out
}

func (s *Store) PrincipalSummary(_ context.Context, tenantID string) dashboard.PrincipalSummary {
	s.mu.RLock()
	defer s.mu.RUnlock()
	if tenantID != s.tenant.ID {
		return dashboard.PrincipalSummary{}
	}
	return dashboard.PrincipalSummary{
		ActiveStudents:          len(s.students),
		ActiveTeachers:          len(s.teachers),
		Classes:                 len(s.classes),
		TodayLessons:            len(s.schedule.Lessons),
		AttendanceCompletionPct: 67,
		AbsentToday:             3,
		OpenObservationSignals:  len(s.observations),
		ClassAttendance: []dashboard.ClassAttendance{
			{ClassName: "5/A", Completed: 2, Total: 3, Absent: 1, AttentionNeed: "Dikkat takibi"},
			{ClassName: "6/B", Completed: 1, Total: 2, Absent: 2, AttentionNeed: "Devamsızlık"},
			{ClassName: "Ana Sınıfı", Completed: 1, Total: 1, Absent: 0, AttentionNeed: "Normal"},
		},
		Operations: []dashboard.OperationItem{
			{ID: "op-1", Title: "5/A ikinci saat yoklaması bekliyor", Status: "pending", Priority: "high"},
			{ID: "op-2", Title: "Yeni program taslağı yayın onayı bekliyor", Status: "review", Priority: "medium"},
			{ID: "op-3", Title: "Rehberlik biriminde 1 yeni gözlem kaydı var", Status: "new", Priority: "medium"},
		},
	}
}

func (s *Store) CurrentSchedule(_ context.Context, tenantID string) (scheduling.Schedule, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	if tenantID != s.tenant.ID {
		return scheduling.Schedule{}, false
	}
	return s.schedule, true
}

func (s *Store) GenerateDraftSchedule(_ context.Context, tenantID string) scheduling.GenerationResult {
	s.mu.Lock()
	defer s.mu.Unlock()
	if tenantID != s.tenant.ID {
		return scheduling.GenerationResult{}
	}

	draft := s.schedule
	draft.ID = "schedule-draft"
	draft.Name = "AI Taslak Program"
	draft.Status = scheduling.ScheduleDraft
	draft.Version = s.schedule.Version + 1
	draft.Score = 88
	draft.UpdatedAt = s.clock()
	for i := range draft.Lessons {
		draft.Lessons[i].ScheduleID = draft.ID
	}

	return scheduling.GenerationResult{
		Schedule:      draft,
		HardConflicts: 0,
		SoftWarnings: []string{
			"5/A Matematik dersi haftanın ilk günlerinde yoğunlaşıyor.",
			"Ayşe Kara için çarşamba günü boşluk azaltılabilir.",
		},
		Recommendation: "Taslak yayınlanabilir durumda. Soft uyarılar manuel düzenleme ekranında iyileştirilebilir.",
	}
}

func (s *Store) TeacherCalendar(_ context.Context, tenantID string, teacherID string) []scheduling.Lesson {
	s.mu.RLock()
	defer s.mu.RUnlock()
	if tenantID != s.tenant.ID {
		return nil
	}
	out := []scheduling.Lesson{}
	for _, lesson := range s.schedule.Lessons {
		if lesson.TeacherID == teacherID {
			out = append(out, lesson)
		}
	}
	sort.Slice(out, func(i, j int) bool { return out[i].StartsAt.Before(out[j].StartsAt) })
	return out
}

func (s *Store) ActiveLessonForTeacher(_ context.Context, tenantID string, teacherID string, now time.Time) (scheduling.Lesson, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	if tenantID != s.tenant.ID {
		return scheduling.Lesson{}, false
	}
	for _, lesson := range s.schedule.Lessons {
		startWindow := lesson.StartsAt.Add(-10 * time.Minute)
		endWindow := lesson.EndsAt.Add(10 * time.Minute)
		if lesson.TeacherID == teacherID && !now.Before(startWindow) && !now.After(endWindow) {
			return lesson, true
		}
	}
	return scheduling.Lesson{}, false
}

func (s *Store) GetOrCreateAttendanceSession(_ context.Context, tenantID string, lessonID string) (attendance.Session, bool) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if tenantID != s.tenant.ID {
		return attendance.Session{}, false
	}
	if session, ok := s.sessions[lessonID]; ok {
		return session, true
	}
	lesson, ok := s.lessonByID(lessonID)
	if !ok {
		return attendance.Session{}, false
	}
	records := []attendance.Record{}
	for _, student := range s.students {
		if student.ClassID == lesson.ClassID {
			records = append(records, attendance.Record{
				StudentID:   student.ID,
				StudentName: student.FullName,
				Number:      student.Number,
				Status:      attendance.StatusUnknown,
			})
		}
	}
	session := attendance.Session{
		ID:          "att-" + lesson.ID,
		TenantID:    tenantID,
		LessonID:    lesson.ID,
		ClassID:     lesson.ClassID,
		ClassName:   lesson.ClassName,
		SubjectName: lesson.SubjectName,
		TeacherID:   lesson.TeacherID,
		StartedAt:   s.clock(),
		Records:     records,
	}
	s.sessions[lessonID] = session
	return session, true
}

func (s *Store) UpdateAttendanceRecords(_ context.Context, tenantID string, sessionID string, updates []attendance.RecordUpdate) (attendance.Session, bool) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if tenantID != s.tenant.ID {
		return attendance.Session{}, false
	}
	var sessionKey string
	var session attendance.Session
	var ok bool
	for key, candidate := range s.sessions {
		if candidate.ID == sessionID {
			sessionKey = key
			session = candidate
			ok = true
			break
		}
	}
	if !ok {
		return attendance.Session{}, false
	}

	updatesByStudent := map[string]attendance.RecordUpdate{}
	for _, update := range updates {
		updatesByStudent[update.StudentID] = update
	}
	for i := range session.Records {
		if update, exists := updatesByStudent[session.Records[i].StudentID]; exists {
			session.Records[i].Status = update.Status
			session.Records[i].Note = update.Note
		}
	}
	s.sessions[sessionKey] = session
	return session, true
}

func (s *Store) ListObservations(_ context.Context, tenantID string) []observation.Observation {
	s.mu.RLock()
	defer s.mu.RUnlock()
	if tenantID != s.tenant.ID {
		return nil
	}
	out := append([]observation.Observation(nil), s.observations...)
	sort.Slice(out, func(i, j int) bool { return out[i].CreatedAt.After(out[j].CreatedAt) })
	return out
}

func (s *Store) CreateObservation(_ context.Context, tenantID string, authorID string, input observation.CreateInput) (observation.Observation, bool) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if tenantID != s.tenant.ID {
		return observation.Observation{}, false
	}
	student, ok := s.studentByID(input.StudentID)
	if !ok {
		return observation.Observation{}, false
	}
	className := ""
	if class, found := s.classByID(student.ClassID); found {
		className = class.Name
	}
	authorName := authorID
	if teacher, found := s.teacherByUserID(authorID); found {
		authorName = teacher.FullName
	}
	created := observation.Observation{
		ID:          fmt.Sprintf("observation-%d", len(s.observations)+1),
		TenantID:    tenantID,
		StudentID:   student.ID,
		StudentName: student.FullName,
		ClassID:     student.ClassID,
		ClassName:   className,
		AuthorID:    authorID,
		AuthorName:  authorName,
		Category:    input.Category,
		Note:        input.Note,
		Sensitivity: "sensitive_student",
		CreatedAt:   s.clock(),
	}
	s.observations = append(s.observations, created)
	return created, true
}

func (s *Store) lessonByID(id string) (scheduling.Lesson, bool) {
	for _, lesson := range s.schedule.Lessons {
		if lesson.ID == id {
			return lesson, true
		}
	}
	return scheduling.Lesson{}, false
}

func (s *Store) studentByID(id string) (school.Student, bool) {
	for _, student := range s.students {
		if student.ID == id {
			return student, true
		}
	}
	return school.Student{}, false
}

func (s *Store) classByID(id string) (school.Class, bool) {
	for _, class := range s.classes {
		if class.ID == id {
			return class, true
		}
	}
	return school.Class{}, false
}

func (s *Store) teacherByUserID(userID string) (school.Teacher, bool) {
	for _, teacher := range s.teachers {
		if teacher.UserID == userID {
			return teacher, true
		}
	}
	return school.Teacher{}, false
}

func (s *Store) tenantNameLocked(tenantID string) string {
	if tenantID == s.tenant.ID {
		return s.tenant.Name
	}
	for _, institution := range s.institutions {
		if institution.ID == tenantID {
			return institution.Name
		}
	}
	return ""
}

func normalizeSchoolDay(now time.Time) time.Time {
	return time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())
}

func newLesson(tenantID string, id string, scheduleID string, class school.Class, teacher school.Teacher, subject school.Subject, day time.Time, start string, end string, room string) scheduling.Lesson {
	startsAt := parseLessonTime(day, start)
	endsAt := parseLessonTime(day, end)
	return scheduling.Lesson{
		ID:          id,
		TenantID:    tenantID,
		ScheduleID:  scheduleID,
		ClassID:     class.ID,
		ClassName:   class.Name,
		TeacherID:   teacher.UserID,
		TeacherName: teacher.FullName,
		SubjectID:   subject.ID,
		SubjectName: subject.Name,
		DayOfWeek:   int(day.Weekday()),
		StartTime:   start,
		EndTime:     end,
		StartsAt:    startsAt,
		EndsAt:      endsAt,
		Room:        room,
	}
}

func parseLessonTime(day time.Time, value string) time.Time {
	parsed, err := time.Parse("15:04", value)
	if err != nil {
		return day
	}
	return time.Date(day.Year(), day.Month(), day.Day(), parsed.Hour(), parsed.Minute(), 0, 0, day.Location())
}

func hashPassword(salt string, password string) string {
	sum := sha256.Sum256([]byte(salt + ":" + password))
	return hex.EncodeToString(sum[:])
}

func userStatus(user systemUser) string {
	if user.MustChangePassword {
		return "first_login"
	}
	return user.Status
}

func (s *Store) platformSettingsLocked() superadmindomain.PlatformSettings {
	credentials := make([]superadmindomain.IntegrationCredential, 0, len(credentialDefinitions()))
	for _, definition := range credentialDefinitions() {
		state := s.credentials[definition.Key]
		credentials = append(credentials, superadmindomain.IntegrationCredential{
			Key:         definition.Key,
			Label:       definition.Label,
			Provider:    definition.Provider,
			Description: definition.Description,
			Configured:  state.Value != "",
			MaskedValue: maskSecret(state.Value),
			UpdatedAt:   state.UpdatedAt,
		})
	}
	return superadmindomain.PlatformSettings{
		Maintenance: s.maintenance,
		Credentials: credentials,
	}
}

type credentialDef struct {
	Key         string
	Label       string
	Provider    string
	Description string
}

func credentialDefinitions() []credentialDef {
	return []credentialDef{
		{Key: "ai_provider_key", Label: "AI API Key", Provider: "OpenAI / LLM", Description: "Ders programı ve analiz servisleri"},
		{Key: "sms_provider_key", Label: "SMS API Key", Provider: "SMS Gateway", Description: "Devamsızlık ve duyuru SMS bildirimleri"},
		{Key: "mail_provider_key", Label: "Mail API Key", Provider: "E-posta Servisi", Description: "Veli ve kurum e-posta bildirimleri"},
		{Key: "mail_sender_secret", Label: "Mail Sender Secret", Provider: "SMTP / Sender", Description: "Gönderici kimliği ve imza anahtarı"},
	}
}

func credentialDefinition(key string) (credentialDef, bool) {
	for _, definition := range credentialDefinitions() {
		if definition.Key == key {
			return definition, true
		}
	}
	return credentialDef{}, false
}

func maskSecret(value string) string {
	value = strings.TrimSpace(value)
	if value == "" {
		return ""
	}
	if len(value) <= 4 {
		return "••••"
	}
	return "••••" + value[len(value)-4:]
}

func normalizeSupportTicketType(value string) string {
	switch strings.TrimSpace(strings.ToLower(value)) {
	case "complaint":
		return "complaint"
	case "suggestion":
		return "suggestion"
	case "report":
		return "report"
	case "", "support":
		return "support"
	default:
		return ""
	}
}

func normalizeSupportTicketStatus(value string) string {
	switch strings.TrimSpace(strings.ToLower(value)) {
	case "open":
		return "open"
	case "in_review":
		return "in_review"
	case "resolved":
		return "resolved"
	case "closed":
		return "closed"
	default:
		return ""
	}
}

func normalizeSupportTicketPriority(value string) string {
	switch strings.TrimSpace(strings.ToLower(value)) {
	case "low":
		return "low"
	case "", "normal":
		return "normal"
	case "high":
		return "high"
	case "urgent":
		return "urgent"
	default:
		return ""
	}
}

func supportStatusRank(value string) int {
	switch value {
	case "open":
		return 0
	case "in_review":
		return 1
	case "resolved":
		return 2
	default:
		return 3
	}
}
