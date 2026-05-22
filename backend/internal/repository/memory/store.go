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
	guardiandomain "ots/backend/internal/domain/guardian"
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
	academicYears  []school.AcademicYear
	terms          []school.Term
	studentMeta    map[string]memoryStudentMeta
	schedule       scheduling.Schedule
	schedules      map[string]scheduling.Schedule
	requirements   []scheduling.ClassSubjectRequirement
	availabilities []scheduling.TeacherAvailability
	sessions       map[string]attendance.Session
	observations   []observation.Observation
	guidanceNotes  map[string]*guidanceNoteRecord
	supportPlans   map[string]*supportPlanRecord
	announcements     []school.Announcement
	notifications     []memoryNotification
	studentGuardians  []memoryStudentGuardian
	resetTokens       map[string]memoryResetToken
}

type memoryResetToken struct {
	userID  string
	expires time.Time
}

type memoryNotification struct {
	ID        string
	TenantID  string
	UserID    string
	Title     string
	Body      string
	Kind      string
	ReadAt    *time.Time
	CreatedAt time.Time
}

type memoryStudentGuardian struct {
	GuardianUserID string
	StudentID      string
	Relation       string
}

type memoryCredential struct {
	Value     string
	UpdatedAt *time.Time
}

type memoryStudentMeta struct {
	Gender        string
	GuardianName  string
	GuardianPhone string
}

type systemUser struct {
	ID                 string
	TenantID           string
	Tenant             string
	FullName           string
	Email              string
	Phone              string
	Role               identity.Role
	Status             string
	AvatarURL          string
	ProfileAccent      string
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
		ID:       "00000000-0000-0000-0000-000000010001",
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
		{ID: "teacher-profile-1", UserID: "00000000-0000-0000-0000-000000010112", TenantID: tenant.ID, FullName: "Ayşe Kara", Title: "Matematik Öğretmeni"},
		{ID: "teacher-profile-2", UserID: "teacher-2", TenantID: tenant.ID, FullName: "Murat Aksoy", Title: "Türkçe Öğretmeni"},
		{ID: "teacher-profile-3", UserID: "00000000-0000-0000-0000-000000010111", TenantID: tenant.ID, FullName: "Selin Ergin", Title: "Rehber Öğretmen"},
	}

	subjects := []school.Subject{
		{ID: "subject-math", TenantID: tenant.ID, Name: "Matematik", Code: "MAT"},
		{ID: "subject-tr", TenantID: tenant.ID, Name: "Türkçe", Code: "TUR"},
		{ID: "subject-life", TenantID: tenant.ID, Name: "Yaşam Becerileri", Code: "YAS"},
	}

	academicYears := []school.AcademicYear{
		{ID: "ay-2025", TenantID: tenant.ID, Name: "2025-2026", StartsOn: "2025-09-01", EndsOn: "2026-06-30", IsActive: true},
	}
	terms := []school.Term{
		{ID: "term-1", TenantID: tenant.ID, AcademicYearID: "ay-2025", Name: "1. Dönem", StartsOn: "2025-09-01", EndsOn: "2026-01-31", IsActive: true},
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

	schedules := map[string]scheduling.Schedule{
		schedule.ID: schedule,
	}

	observations := []observation.Observation{
		{
			ID:          "observation-1",
			TenantID:    tenant.ID,
			StudentID:   "student-2",
			StudentName: "Efe Demir",
			ClassID:     "class-5a",
			ClassName:   "5/A",
			AuthorID:    "00000000-0000-0000-0000-000000010112",
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
			ID:           "00000000-0000-0000-0000-000000010112",
			TenantID:     tenant.ID,
			Tenant:       tenant.Name,
			FullName:     "Ayşe Kara",
			Email:        "ogretmen@atlas.k12.tr",
			Role:         identity.RoleTeacher,
			Status:       "active",
			PasswordSalt: "ots-default-teacher",
			PasswordHash: "f9b1789ca13b599d8d79aef4747c4b727087a9331a5f021fca6138037b18d28b",
			CreatedAt:    now.AddDate(0, -1, -12),
		},
		{
			ID:           "00000000-0000-0000-0000-000000010110",
			TenantID:     tenant.ID,
			Tenant:       tenant.Name,
			FullName:     "Cem Arslan",
			Email:        "mudur@atlas.k12.tr",
			Role:         identity.RolePrincipal,
			Status:       "active",
			PasswordSalt: "ots-default-principal",
			PasswordHash: "401f5e4ee34b5a978ba7ab29eb4ed4cadb5910308c145270a5dad16b1c8b958c",
			CreatedAt:    now.AddDate(0, -1, -18),
		},
		{
			ID:           "00000000-0000-0000-0000-000000010111",
			TenantID:     tenant.ID,
			Tenant:       tenant.Name,
			FullName:     "Selin Ergin",
			Email:        "rehberlik@atlas.k12.tr",
			Role:         identity.RoleGuidance,
			Status:       "active",
			PasswordSalt: "ots-default-guidance",
			PasswordHash: "389229a241807a39d991e63a0a0fb5bfe712edbddb0e972451f57dec88001187",
			CreatedAt:    now.AddDate(0, -1, -8),
		},
		{
			ID:           "00000000-0000-0000-0000-000000010113",
			TenantID:     tenant.ID,
			Tenant:       tenant.Name,
			FullName:     "Merve Demir",
			Email:        "veli@atlas.k12.tr",
			Role:         identity.RoleGuardian,
			Status:       "active",
			PasswordSalt: "ots-default-guardian",
			PasswordHash: "b68306fe713a56eadf2f649a2c1ad73766e3f7fb005772ed560eaeef9c20fcb4",
			CreatedAt:    now.AddDate(0, 0, -5),
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
				ReporterID:    "00000000-0000-0000-0000-000000010110",
				ReporterName:  "Cem Arslan",
				ReporterEmail: "mudur@atlas.k12.tr",
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
		classes:       classes,
		students:      students,
		teachers:      teachers,
		subjects:      subjects,
		academicYears: academicYears,
		terms:         terms,
		studentMeta:   map[string]memoryStudentMeta{},
		schedule:      schedule,
		schedules:     schedules,
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
		studentGuardians: []memoryStudentGuardian{
			{GuardianUserID: "00000000-0000-0000-0000-000000010113", StudentID: "student-2", Relation: "Anne"},
		},
		notifications: []memoryNotification{
			{
				ID:        "notification-1",
				TenantID:  tenant.ID,
				UserID:    "00000000-0000-0000-0000-000000010113",
				Title:     "Devamsızlık bildirimi",
				Body:      "Efe Demir (502) öğrencisi için yoklama kaydı oluşturuldu.",
				Kind:      "attendance_absence:demo",
				CreatedAt: now.Add(-2 * time.Hour),
			},
		},
		resetTokens: map[string]memoryResetToken{},
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

func (s *Store) RequestPasswordReset(_ context.Context, email string) (string, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	email = strings.ToLower(strings.TrimSpace(email))
	for _, user := range s.users {
		if strings.ToLower(user.Email) != email || user.Status != "active" {
			continue
		}
		token := fmt.Sprintf("reset-%d", s.clock().UnixNano())
		s.resetTokens[token] = memoryResetToken{userID: user.ID, expires: s.clock().Add(30 * time.Minute)}
		return token, nil
	}
	return "", nil
}

func (s *Store) ResetPasswordWithToken(_ context.Context, token string, newPassword string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	entry, ok := s.resetTokens[token]
	if !ok || s.clock().After(entry.expires) {
		return identity.ErrInvalidResetToken
	}
	delete(s.resetTokens, token)
	for index := range s.users {
		if s.users[index].ID != entry.userID {
			continue
		}
		salt := fmt.Sprintf("memory-%d", s.clock().UnixNano())
		s.users[index].PasswordSalt = salt
		s.users[index].PasswordHash = hashPassword(salt, newPassword)
		s.users[index].MustChangePassword = false
		return nil
	}
	return identity.ErrUserNotFound
}

func (s *Store) GetUserPrincipal(_ context.Context, userID string) (identity.Principal, bool, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	for _, user := range s.users {
		if user.ID != userID || user.Status != "active" {
			continue
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

func (s *Store) ListSupportTicketsByReporter(_ context.Context, principal identity.Principal) ([]superadmindomain.SupportTicket, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := make([]superadmindomain.SupportTicket, 0)
	for _, ticket := range s.supportTickets {
		if ticket.ReporterID != principal.UserID {
			continue
		}
		if principal.TenantID != "" && ticket.TenantID != principal.TenantID {
			continue
		}
		out = append(out, ticket)
	}
	sort.Slice(out, func(i, j int) bool {
		return out[i].CreatedAt.After(out[j].CreatedAt)
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
		s.users[index].Phone = strings.TrimSpace(input.Phone)
		s.users[index].AvatarURL = strings.TrimSpace(input.AvatarURL)
		accent := strings.TrimSpace(input.ProfileAccent)
		if accent == "" {
			accent = "#0891b2"
		}
		s.users[index].ProfileAccent = accent
		s.users[index].Role = identity.Role(strings.TrimSpace(input.Role))
		if strings.TrimSpace(input.Status) == "passive" {
			s.users[index].Status = "passive"
		} else {
			s.users[index].Status = "active"
		}
		return userAccountFromSystem(s.users[index]), true, nil
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
		return []school.Announcement{}
	}
	out := append([]school.Announcement(nil), s.announcements...)
	sort.Slice(out, func(i, j int) bool { return out[i].PublishedAt.After(out[j].PublishedAt) })
	return out
}

func (s *Store) CreateAnnouncement(_ context.Context, tenantID string, _ string, input school.CreateAnnouncementInput) (school.Announcement, bool) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if tenantID != s.tenant.ID {
		return school.Announcement{}, false
	}
	created := school.Announcement{
		ID:          fmt.Sprintf("announcement-%d", len(s.announcements)+1),
		TenantID:    tenantID,
		Title:       input.Title,
		Body:        input.Body,
		Audience:    input.Audience,
		PublishedAt: s.clock(),
	}
	s.announcements = append(s.announcements, created)
	return created, true
}

func (s *Store) UpdateAnnouncement(_ context.Context, tenantID string, announcementID string, input school.UpdateAnnouncementInput) (school.Announcement, bool) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if tenantID != s.tenant.ID {
		return school.Announcement{}, false
	}
	for index := range s.announcements {
		if s.announcements[index].ID != announcementID {
			continue
		}
		if input.Title != nil {
			s.announcements[index].Title = *input.Title
		}
		if input.Body != nil {
			s.announcements[index].Body = *input.Body
		}
		if input.Audience != nil {
			s.announcements[index].Audience = *input.Audience
		}
		return s.announcements[index], true
	}
	return school.Announcement{}, false
}

func (s *Store) GuardianHasStudent(_ context.Context, tenantID string, guardianUserID string, studentID string) bool {
	s.mu.RLock()
	defer s.mu.RUnlock()
	if tenantID != s.tenant.ID {
		return false
	}
	for _, link := range s.studentGuardians {
		if link.GuardianUserID == guardianUserID && link.StudentID == studentID {
			return true
		}
	}
	return false
}

func (s *Store) ListGuardianStudents(_ context.Context, tenantID string, guardianUserID string) []guardiandomain.Student {
	s.mu.RLock()
	defer s.mu.RUnlock()
	if tenantID != s.tenant.ID {
		return []guardiandomain.Student{}
	}
	out := make([]guardiandomain.Student, 0)
	for _, link := range s.studentGuardians {
		if link.GuardianUserID != guardianUserID {
			continue
		}
		student, ok := s.studentByIDLocked(link.StudentID)
		if !ok {
			continue
		}
		className := ""
		if class, found := s.classByIDLocked(student.ClassID); found {
			className = class.Name
		}
		out = append(out, guardiandomain.Student{
			ID:           student.ID,
			FullName:     student.FullName,
			ClassName:    className,
			SchoolNumber: student.Number,
			Relation:     link.Relation,
		})
	}
	sort.Slice(out, func(i, j int) bool { return out[i].FullName < out[j].FullName })
	return out
}

func (s *Store) StudentScheduleForGuardian(_ context.Context, tenantID string, guardianUserID string, studentID string) (guardiandomain.StudentSchedule, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	if tenantID != s.tenant.ID || !s.guardianHasStudentLocked(guardianUserID, studentID) {
		return guardiandomain.StudentSchedule{}, false
	}
	student, ok := s.studentByIDLocked(studentID)
	if !ok {
		return guardiandomain.StudentSchedule{}, false
	}
	lessons := make([]scheduling.Lesson, 0)
	for _, lesson := range s.schedule.Lessons {
		if lesson.ClassID == student.ClassID {
			lessons = append(lessons, lesson)
		}
	}
	return guardiandomain.StudentSchedule{StudentID: studentID, Lessons: lessons}, true
}

func (s *Store) StudentAttendanceForGuardian(_ context.Context, tenantID string, guardianUserID string, studentID string) (guardiandomain.StudentAttendance, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	if tenantID != s.tenant.ID || !s.guardianHasStudentLocked(guardianUserID, studentID) {
		return guardiandomain.StudentAttendance{}, false
	}

	records := make([]guardiandomain.AttendanceRecord, 0)
	for _, session := range s.sessions {
		if session.FinalizedAt == nil {
			continue
		}
		lesson, hasLesson := s.lessonByID(session.LessonID)
		for _, record := range session.Records {
			if record.StudentID != studentID {
				continue
			}
			item := guardiandomain.AttendanceRecord{
				ID:     fmt.Sprintf("%s-%s", session.ID, record.StudentID),
				Date:   session.StartedAt.Format("2006-01-02"),
				Lesson: session.SubjectName,
				Status: record.Status,
				Note:   record.Note,
			}
			if hasLesson {
				item.StartTime = lesson.StartTime
				item.EndTime = lesson.EndTime
				item.DayOfWeek = lesson.DayOfWeek
			}
			records = append(records, item)
		}
	}
	sort.Slice(records, func(i, j int) bool { return records[i].Date > records[j].Date })
	return guardiandomain.StudentAttendance{StudentID: studentID, Records: records}, true
}

func (s *Store) ListGuardianAnnouncements(_ context.Context, tenantID string) []school.Announcement {
	s.mu.RLock()
	defer s.mu.RUnlock()
	if tenantID != s.tenant.ID {
		return []school.Announcement{}
	}
	out := make([]school.Announcement, 0)
	for _, item := range s.announcements {
		if item.Audience == "guardians" || item.Audience == "all" {
			out = append(out, item)
		}
	}
	sort.Slice(out, func(i, j int) bool { return out[i].PublishedAt.After(out[j].PublishedAt) })
	return out
}

func (s *Store) ListGuardianNotifications(_ context.Context, tenantID string, userID string) []guardiandomain.Notification {
	s.mu.RLock()
	defer s.mu.RUnlock()
	if tenantID != s.tenant.ID {
		return []guardiandomain.Notification{}
	}
	out := make([]guardiandomain.Notification, 0)
	for _, item := range s.notifications {
		if item.UserID != userID {
			continue
		}
		out = append(out, guardiandomain.Notification{
			ID:        item.ID,
			Title:     item.Title,
			Body:      item.Body,
			Kind:      item.Kind,
			ReadAt:    item.ReadAt,
			CreatedAt: item.CreatedAt,
		})
	}
	sort.Slice(out, func(i, j int) bool { return out[i].CreatedAt.After(out[j].CreatedAt) })
	return out
}

func (s *Store) MarkGuardianNotificationRead(_ context.Context, tenantID string, userID string, notificationID string) (guardiandomain.Notification, bool) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if tenantID != s.tenant.ID {
		return guardiandomain.Notification{}, false
	}
	for index := range s.notifications {
		if s.notifications[index].ID != notificationID || s.notifications[index].UserID != userID {
			continue
		}
		if s.notifications[index].ReadAt == nil {
			readAt := s.clock()
			s.notifications[index].ReadAt = &readAt
		}
		item := s.notifications[index]
		return guardiandomain.Notification{
			ID:        item.ID,
			Title:     item.Title,
			Body:      item.Body,
			Kind:      item.Kind,
			ReadAt:    item.ReadAt,
			CreatedAt: item.CreatedAt,
		}, true
	}
	return guardiandomain.Notification{}, false
}

func (s *Store) PrincipalRoster(_ context.Context, tenantID string) (school.PrincipalRoster, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	if tenantID != s.tenant.ID {
		return school.PrincipalRoster{}, nil
	}
	now := s.clock()
	classes := make([]school.PrincipalRosterClass, 0, len(s.classes))
	sections := make([]school.PrincipalRosterSection, 0, len(s.classes))
	for _, class := range s.classes {
		classes = append(classes, school.PrincipalRosterClass{
			ID:        class.ID,
			Name:      class.Name,
			CreatedAt: now,
		})
		sections = append(sections, school.PrincipalRosterSection{
			ID:         class.ID + "-default",
			ClassID:    class.ID,
			Name:       "A",
			GradeLevel: class.Level,
			Advisor:    "",
			Capacity:   40,
			CreatedAt:  now,
		})
	}
	students := make([]school.PrincipalRosterStudent, 0, len(s.students))
	for _, student := range s.students {
		students = append(students, memoryStudentToRoster(student, s.studentMeta[student.ID], now))
	}
	return school.PrincipalRoster{
		Classes:  classes,
		Sections: sections,
		Students: students,
	}, nil
}

func splitMemoryFullName(fullName string) (string, string) {
	parts := strings.Fields(strings.TrimSpace(fullName))
	if len(parts) == 0 {
		return "", ""
	}
	if len(parts) == 1 {
		return parts[0], ""
	}
	return strings.Join(parts[:len(parts)-1], " "), parts[len(parts)-1]
}

func (s *Store) PrincipalSummary(_ context.Context, tenantID string) dashboard.PrincipalSummary {
	s.mu.RLock()
	defer s.mu.RUnlock()
	if tenantID != s.tenant.ID {
		return dashboard.PrincipalSummary{}
	}

	todayWeekday := isoWeekdayMemory(s.clock())
	todayLessons := 0
	for _, lesson := range s.schedule.Lessons {
		if lesson.DayOfWeek == todayWeekday {
			todayLessons++
		}
	}

	dayStart := time.Date(s.clock().Year(), s.clock().Month(), s.clock().Day(), 0, 0, 0, 0, s.clock().Location())
	dayEnd := dayStart.Add(24 * time.Hour)
	finalizedToday := 0
	absentToday := 0
	for _, session := range s.sessions {
		if session.FinalizedAt == nil || session.StartedAt.Before(dayStart) || !session.StartedAt.Before(dayEnd) {
			continue
		}
		finalizedToday++
		for _, record := range session.Records {
			if record.Status == "absent" {
				absentToday++
			}
		}
	}

	attendancePct := 0
	if todayLessons > 0 {
		attendancePct = finalizedToday * 100 / todayLessons
	}

	classAttendance := []dashboard.ClassAttendance{}
	for _, class := range s.classes {
		total := 0
		completed := 0
		absent := 0
		for _, lesson := range s.schedule.Lessons {
			if lesson.ClassID == class.ID && lesson.DayOfWeek == todayWeekday {
				total++
			}
		}
		for _, session := range s.sessions {
			if session.ClassID != class.ID || session.FinalizedAt == nil || session.StartedAt.Before(dayStart) || !session.StartedAt.Before(dayEnd) {
				continue
			}
			completed++
			for _, record := range session.Records {
				if record.Status == "absent" {
					absent++
				}
			}
		}
		attention := "Normal"
		if completed < total {
			attention = "Yoklama bekliyor"
		}
		if absent > 0 {
			attention = "Devamsızlık"
		}
		classAttendance = append(classAttendance, dashboard.ClassAttendance{
			ClassName: class.Name, Completed: completed, Total: maxInt(1, total), Absent: absent, AttentionNeed: attention,
		})
	}

	return dashboard.PrincipalSummary{
		ActiveStudents:          len(s.students),
		ActiveTeachers:          len(s.teachers),
		Classes:                 len(s.classes),
		TodayLessons:            todayLessons,
		AttendanceCompletionPct: attendancePct,
		AbsentToday:             absentToday,
		OpenObservationSignals:  len(s.observations),
		ClassAttendance:         classAttendance,
		Operations: buildMemoryPrincipalOperations(todayLessons, finalizedToday, string(s.schedule.Status), classAttendance),
	}
}

func buildMemoryPrincipalOperations(todayLessons, finalizedToday int, scheduleStatus string, classAttendance []dashboard.ClassAttendance) []dashboard.OperationItem {
	operations := []dashboard.OperationItem{}
	if scheduleStatus != "published" {
		operations = append(operations, dashboard.OperationItem{
			ID: "op-schedule-missing", Title: "Yayınlanmış ders programı yok",
			Status: "review", Priority: "urgent", Kind: "schedule", TargetPath: "/dashboard/schedule/builder",
		})
	}
	if todayLessons > 0 && finalizedToday < todayLessons {
		operations = append(operations, dashboard.OperationItem{
			ID: "op-attendance-pending", Title: fmt.Sprintf("%d ders yoklaması bekliyor", todayLessons-finalizedToday),
			Status: "pending", Priority: "high", Kind: "attendance", TargetPath: "/dashboard/attendance",
		})
	}
	for _, item := range classAttendance {
		if item.AttentionNeed == "Devamsızlık" || item.AttentionNeed == "Yoklama bekliyor" {
			operations = append(operations, dashboard.OperationItem{
				ID: "op-class-" + item.ClassName, Title: item.ClassName + ": " + item.AttentionNeed,
				Status: "pending", Priority: "high", Kind: "attendance", TargetPath: "/dashboard/attendance",
			})
		}
	}
	if len(operations) == 0 {
		operations = append(operations, dashboard.OperationItem{ID: "op-all-clear", Title: "Bugün için bekleyen kritik operasyon yok", Status: "operational", Priority: "normal", Kind: "info", TargetPath: "/dashboard/operations"})
	}
	return operations
}

func maxInt(a, b int) int {
	if a > b {
		return a
	}
	return b
}

func (s *Store) CurrentSchedule(_ context.Context, tenantID string) (scheduling.Schedule, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	if tenantID != s.tenant.ID {
		return scheduling.Schedule{}, false
	}
	return s.schedule, true
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

func (s *Store) GetAttendanceSession(_ context.Context, tenantID string, sessionID string) (attendance.Session, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	if tenantID != s.tenant.ID {
		return attendance.Session{}, false
	}
	for _, session := range s.sessions {
		if session.ID == sessionID {
			return session, true
		}
	}
	return attendance.Session{}, false
}

func (s *Store) GetAttendanceSessionByLesson(_ context.Context, tenantID string, lessonID string) (attendance.Session, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	if tenantID != s.tenant.ID {
		return attendance.Session{}, false
	}
	session, ok := s.sessions[lessonID]
	return session, ok
}

func (s *Store) GetOrCreateAttendanceSession(_ context.Context, tenantID string, lessonID string, _ string) (attendance.Session, bool) {
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

func (s *Store) UpdateAttendanceRecords(_ context.Context, tenantID string, sessionID string, _ string, updates []attendance.RecordUpdate) (attendance.Session, bool) {
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
	if session.FinalizedAt != nil {
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

func (s *Store) FinalizeAttendanceSession(_ context.Context, tenantID string, sessionID string, finalizedAt time.Time, _ string) (attendance.Session, bool) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if tenantID != s.tenant.ID {
		return attendance.Session{}, false
	}
	for key, session := range s.sessions {
		if session.ID != sessionID {
			continue
		}
		newlyFinalized := session.FinalizedAt == nil
		if newlyFinalized {
			finalized := finalizedAt
			session.FinalizedAt = &finalized
			s.sessions[key] = session
			s.emitAttendanceAbsenceNotifications(tenantID, sessionID, s.sessions[key])
		}
		return s.sessions[key], true
	}
	return attendance.Session{}, false
}

func (s *Store) ReopenAttendanceSession(_ context.Context, tenantID string, sessionID string, _ string) (attendance.Session, bool) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if tenantID != s.tenant.ID {
		return attendance.Session{}, false
	}
	for key, session := range s.sessions {
		if session.ID != sessionID {
			continue
		}
		session.FinalizedAt = nil
		s.sessions[key] = session
		return session, true
	}
	return attendance.Session{}, false
}

func (s *Store) StudentAttendanceSummary(_ context.Context, tenantID string, studentID string) (attendance.StudentSummary, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	if tenantID != s.tenant.ID {
		return attendance.StudentSummary{}, false
	}
	foundStudent := false
	for _, student := range s.students {
		if student.ID == studentID {
			foundStudent = true
			break
		}
	}
	if !foundStudent {
		return attendance.StudentSummary{}, false
	}
	summary := attendance.StudentSummary{StudentID: studentID, Records: []attendance.SummaryEntry{}}
	for _, session := range s.sessions {
		if session.FinalizedAt == nil {
			continue
		}
		for _, record := range session.Records {
			if record.StudentID != studentID {
				continue
			}
			summary.Records = append(summary.Records, attendance.SummaryEntry{
				Date:        session.StartedAt.Format("2006-01-02"),
				SubjectName: session.SubjectName,
				ClassName:   session.ClassName,
				Status:      record.Status,
			})
			switch record.Status {
			case attendance.StatusPresent:
				summary.Present++
			case attendance.StatusAbsent:
				summary.Absent++
			case attendance.StatusLate:
				summary.Late++
			case attendance.StatusExcused:
				summary.Excused++
			}
		}
	}
	return summary, true
}

func (s *Store) AttendanceDayReport(_ context.Context, tenantID string, date time.Time) attendance.DayReport {
	s.mu.RLock()
	defer s.mu.RUnlock()
	if tenantID != s.tenant.ID {
		return attendance.DayReport{Date: date.Format("2006-01-02")}
	}

	dayStart := time.Date(date.Year(), date.Month(), date.Day(), 0, 0, 0, 0, date.Location())
	dayEnd := dayStart.Add(24 * time.Hour)
	byStudent := map[string]attendance.DayRecord{}

	for _, session := range s.sessions {
		if session.StartedAt.Before(dayStart) || !session.StartedAt.Before(dayEnd) {
			continue
		}
		if session.FinalizedAt == nil {
			continue
		}
		for _, record := range session.Records {
			current, exists := byStudent[record.StudentID]
			if !exists || memoryStatusPriority(record.Status) > memoryStatusPriority(current.Status) {
				byStudent[record.StudentID] = attendance.DayRecord{
					StudentID: record.StudentID,
					ClassID:   session.ClassID,
					Status:    record.Status,
				}
			}
		}
	}

	out := make([]attendance.DayRecord, 0, len(byStudent))
	for _, record := range byStudent {
		out = append(out, record)
	}
	return attendance.DayReport{
		Date:    dayStart.Format("2006-01-02"),
		Records: out,
	}
}

func memoryStatusPriority(status attendance.Status) int {
	switch status {
	case attendance.StatusAbsent:
		return 5
	case attendance.StatusLate:
		return 4
	case attendance.StatusUnknown:
		return 3
	case attendance.StatusExcused:
		return 2
	case attendance.StatusPresent:
		return 1
	default:
		return 0
	}
}

func (s *Store) emitAttendanceAbsenceNotifications(tenantID string, sessionID string, session attendance.Session) {
	for _, record := range session.Records {
		if record.Status != attendance.StatusAbsent && record.Status != attendance.StatusLate {
			continue
		}
		statusLabel := "gelmedi"
		if record.Status == attendance.StatusLate {
			statusLabel = "geç kaldı"
		}
		title := "Devamsızlık bildirimi"
		body := fmt.Sprintf(
			"%s (%s) öğrencisi %s sınıfında %s dersinde %s. Oturum: %s",
			record.StudentName,
			record.Number,
			session.ClassName,
			session.SubjectName,
			statusLabel,
			sessionID,
		)
		for _, link := range s.studentGuardians {
			if link.StudentID != record.StudentID {
				continue
			}
			kind := fmt.Sprintf("attendance_absence:%s:%s:%s", sessionID, record.StudentID, link.GuardianUserID)
			duplicate := false
			for _, existing := range s.notifications {
				if existing.Kind == kind {
					duplicate = true
					break
				}
			}
			if duplicate {
				continue
			}
			s.notifications = append(s.notifications, memoryNotification{
				ID:        fmt.Sprintf("notification-%d", len(s.notifications)+1),
				TenantID:  tenantID,
				UserID:    link.GuardianUserID,
				Title:     title,
				Body:      body,
				Kind:      kind,
				CreatedAt: s.clock(),
			})
		}
	}
}

func (s *Store) guardianHasStudentLocked(guardianUserID string, studentID string) bool {
	for _, link := range s.studentGuardians {
		if link.GuardianUserID == guardianUserID && link.StudentID == studentID {
			return true
		}
	}
	return false
}

func (s *Store) studentByIDLocked(id string) (school.Student, bool) {
	for _, student := range s.students {
		if student.ID == id {
			return student, true
		}
	}
	return school.Student{}, false
}

func (s *Store) classByIDLocked(id string) (school.Class, bool) {
	for _, class := range s.classes {
		if class.ID == id {
			return class, true
		}
	}
	return school.Class{}, false
}

func (s *Store) GetObservation(_ context.Context, tenantID string, observationID string) (observation.Observation, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	if tenantID != s.tenant.ID {
		return observation.Observation{}, false
	}
	for _, item := range s.observations {
		if item.ID == observationID {
			return item, true
		}
	}
	return observation.Observation{}, false
}

func (s *Store) UpdateObservation(_ context.Context, tenantID string, observationID string, input observation.UpdateInput) (observation.Observation, bool) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if tenantID != s.tenant.ID {
		return observation.Observation{}, false
	}
	for index := range s.observations {
		if s.observations[index].ID != observationID {
			continue
		}
		if input.Category != nil {
			s.observations[index].Category = *input.Category
		}
		if input.Note != nil {
			s.observations[index].Note = *input.Note
		}
		return s.observations[index], true
	}
	return observation.Observation{}, false
}

func (s *Store) DeleteObservation(_ context.Context, tenantID string, observationID string) bool {
	s.mu.Lock()
	defer s.mu.Unlock()
	if tenantID != s.tenant.ID {
		return false
	}
	for index := range s.observations {
		if s.observations[index].ID != observationID {
			continue
		}
		s.observations = append(s.observations[:index], s.observations[index+1:]...)
		return true
	}
	return false
}

func (s *Store) ListObservations(_ context.Context, tenantID string) []observation.Observation {
	s.mu.RLock()
	defer s.mu.RUnlock()
	if tenantID != s.tenant.ID {
		return []observation.Observation{}
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

func (s *Store) TeacherCanObserveStudent(_ context.Context, tenantID string, teacherUserID string, studentID string) bool {
	s.mu.RLock()
	defer s.mu.RUnlock()
	if tenantID != s.tenant.ID {
		return false
	}
	student, ok := s.studentByID(studentID)
	if !ok {
		return false
	}
	allowedClasses := map[string]struct{}{}
	for _, schedule := range s.schedules {
		if schedule.Status != scheduling.SchedulePublished {
			continue
		}
		for _, lesson := range schedule.Lessons {
			if lesson.TeacherID == teacherUserID {
				allowedClasses[lesson.ClassID] = struct{}{}
			}
		}
	}
	_, ok = allowedClasses[student.ClassID]
	return ok
}

func (s *Store) RecordOperationalAudit(_ context.Context, tenantID string, actorUserID string, action string, resourceType string, resourceID string, metadata string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if tenantID != s.tenant.ID {
		return
	}
	s.appendOperationalAuditLocked(actorUserID, action, resourceType, resourceID, metadata)
}

func (s *Store) appendOperationalAuditLocked(actorUserID string, action string, resourceType string, resourceID string, metadata string) {
	actorName := actorUserID
	for _, user := range s.users {
		if user.ID == actorUserID {
			actorName = user.FullName
			break
		}
	}
	sensitivity := "operational"
	if action == "guidance.view" {
		sensitivity = "sensitive_student"
	}
	_ = metadata
	s.auditLogs = append(s.auditLogs, superadmindomain.AuditEntry{
		ID:           fmt.Sprintf("audit-%d", len(s.auditLogs)+1),
		Tenant:       s.tenant.Name,
		Actor:        actorName,
		Action:       action,
		ResourceType: resourceType,
		Sensitivity:  sensitivity,
		CreatedAt:    s.clock(),
	})
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
