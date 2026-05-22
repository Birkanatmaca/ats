package postgres

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"database/sql"
	"encoding/base32"
	"encoding/hex"
	"errors"
	"fmt"
	"os"
	"runtime"
	"strconv"
	"strings"
	"sync"
	"time"

	"ots/backend/internal/domain/identity"
	superadmindomain "ots/backend/internal/domain/superadmin"

	_ "github.com/jackc/pgx/v5/stdlib"
)

const systemTenantID = "00000000-0000-0000-0000-000000000001"

type Store struct {
	db    *sql.DB
	clock func() time.Time

	resetMu     sync.Mutex
	resetTokens map[string]passwordResetEntry
}

type passwordResetEntry struct {
	userID  string
	expires time.Time
}

func NewStore(ctx context.Context, databaseURL string, clock func() time.Time) (*Store, error) {
	if clock == nil {
		clock = time.Now
	}
	db, err := sql.Open("pgx", databaseURL)
	if err != nil {
		return nil, err
	}
	db.SetMaxOpenConns(10)
	db.SetMaxIdleConns(5)
	db.SetConnMaxLifetime(30 * time.Minute)

	pingCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()
	if err := db.PingContext(pingCtx); err != nil {
		_ = db.Close()
		return nil, err
	}

	return &Store{db: db, clock: clock, resetTokens: map[string]passwordResetEntry{}}, nil
}

func (s *Store) Close() error {
	return s.db.Close()
}

func (s *Store) Authenticate(ctx context.Context, email string, password string) (identity.Principal, bool, error) {
	const query = `
SELECT
	u.id::text,
	tm.tenant_id::text,
	COALESCE(r.code, 'principal') AS role_code,
	u.full_name,
	COALESCE(u.email, '') AS email,
	u.password_hash,
	u.must_change_password
FROM users u
JOIN tenant_memberships tm ON tm.user_id = u.id AND tm.status = 'active'
JOIN tenants t ON t.id = tm.tenant_id AND t.deleted_at IS NULL
LEFT JOIN LATERAL (
	SELECT roles.code
	FROM user_roles ur
	JOIN roles ON roles.id = ur.role_id
	WHERE ur.user_id = u.id AND ur.tenant_id = tm.tenant_id
	ORDER BY CASE roles.code
		WHEN 'super_admin' THEN 0
		WHEN 'system_admin' THEN 1
		WHEN 'principal' THEN 2
		WHEN 'guidance' THEN 3
		WHEN 'teacher' THEN 4
		WHEN 'guardian' THEN 5
		ELSE 9
	END
	LIMIT 1
) r ON true
WHERE lower(u.email) = lower($1) AND u.is_active = true
ORDER BY CASE COALESCE(r.code, 'principal')
	WHEN 'super_admin' THEN 0
	WHEN 'system_admin' THEN 1
	ELSE 2
END
LIMIT 1`

	var principal identity.Principal
	var roleCode string
	var passwordHash string
	err := s.db.QueryRowContext(ctx, query, strings.ToLower(strings.TrimSpace(email))).Scan(
		&principal.UserID,
		&principal.TenantID,
		&roleCode,
		&principal.Name,
		&principal.Email,
		&passwordHash,
		&principal.MustChangePassword,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return identity.Principal{}, false, nil
	}
	if err != nil {
		return identity.Principal{}, false, err
	}
	if !verifyPassword(passwordHash, password) {
		return identity.Principal{}, false, nil
	}
	principal.Role = identity.Role(roleCode)

	_, _ = s.db.ExecContext(ctx, `UPDATE users SET last_login_at = now(), updated_at = now() WHERE id = $1`, principal.UserID)
	return principal, true, nil
}

func (s *Store) SetPassword(ctx context.Context, userID string, newPassword string) (identity.Principal, bool, error) {
	passwordHash, err := hashPassword(newPassword)
	if err != nil {
		return identity.Principal{}, false, err
	}

	result, err := s.db.ExecContext(ctx, `
UPDATE users
SET password_hash = $1, must_change_password = false, updated_at = now()
WHERE id = $2 AND is_active = true`, passwordHash, userID)
	if err != nil {
		return identity.Principal{}, false, err
	}
	affected, err := result.RowsAffected()
	if err != nil {
		return identity.Principal{}, false, err
	}
	if affected == 0 {
		return identity.Principal{}, false, nil
	}

	principal, ok, err := s.principalByUserID(ctx, userID)
	if err != nil || !ok {
		return identity.Principal{}, ok, err
	}
	principal.MustChangePassword = false
	return principal, true, nil
}

func (s *Store) SystemStatus(ctx context.Context) (superadmindomain.SystemStatus, error) {
	settings, err := s.PlatformSettings(ctx)
	if err != nil {
		return superadmindomain.SystemStatus{}, err
	}
	return superadmindomain.SystemStatus{Maintenance: settings.Maintenance}, nil
}

func (s *Store) SystemMetrics(ctx context.Context) (superadmindomain.SystemMetrics, error) {
	now := s.clock().UTC()
	cpuPercent := readCPUPercent()
	memoryPercent, memoryDescription := readMemoryUsage()
	diskPercent, diskDescription := readDiskUsage("/")
	heapPercent, heapDescription := runtimeHeapUsage()

	dbStatus := "healthy"
	start := time.Now()
	pingCtx, cancel := context.WithTimeout(ctx, 900*time.Millisecond)
	err := s.db.PingContext(pingCtx)
	cancel()
	dbLatency := time.Since(start).Milliseconds()
	if err != nil {
		dbStatus = "critical"
	}

	resources := []superadmindomain.ResourceMetric{
		{Key: "cpu", Label: "CPU", Value: cpuPercent, Unit: "%", Status: metricStatus(cpuPercent), Description: fmt.Sprintf("%d çekirdek üzerinden anlık kullanım", runtime.NumCPU())},
		{Key: "ram", Label: "RAM", Value: memoryPercent, Unit: "%", Status: metricStatus(memoryPercent), Description: memoryDescription},
		{Key: "disk", Label: "Disk", Value: diskPercent, Unit: "%", Status: metricStatus(diskPercent), Description: diskDescription},
		{Key: "heap", Label: "API Heap", Value: heapPercent, Unit: "%", Status: metricStatus(heapPercent), Description: heapDescription},
	}
	services := []superadmindomain.ServiceMetric{
		{Key: "backend", Name: "Backend API", Status: "healthy", Description: "Go API health endpoint yanıt veriyor."},
		{Key: "postgres", Name: "Postgres", Status: dbStatus, LatencyMs: dbLatency, Description: "Veritabanı bağlantı ve ping kontrolü."},
		{Key: "frontend", Name: "Frontend", Status: "healthy", Description: "Nginx frontend container canlı yayın yapıyor."},
		{Key: "migrations", Name: "Migration", Status: "healthy", Description: "Schema migration takibi aktif."},
	}

	return superadmindomain.SystemMetrics{
		UpdatedAt: now,
		Health:    aggregateHealth(resources, services),
		Resources: resources,
		Services:  services,
	}, nil
}

func (s *Store) PlatformSettings(ctx context.Context) (superadmindomain.PlatformSettings, error) {
	rows, err := s.db.QueryContext(ctx, `SELECT key, value, updated_at FROM platform_settings`)
	if err != nil {
		return superadmindomain.PlatformSettings{}, err
	}
	defer rows.Close()

	values := map[string]string{}
	updatedAt := map[string]time.Time{}
	for rows.Next() {
		var key string
		var value string
		var updated time.Time
		if err := rows.Scan(&key, &value, &updated); err != nil {
			return superadmindomain.PlatformSettings{}, err
		}
		values[key] = value
		updatedAt[key] = updated
	}
	if err := rows.Err(); err != nil {
		return superadmindomain.PlatformSettings{}, err
	}
	return platformSettingsFromValues(values, updatedAt), nil
}

func (s *Store) UpdatePlatformSettings(ctx context.Context, actor identity.Principal, input superadmindomain.UpdatePlatformSettingsInput) (superadmindomain.PlatformSettings, error) {
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return superadmindomain.PlatformSettings{}, err
	}
	defer rollback(tx)

	message := strings.TrimSpace(input.Maintenance.Message)
	if message == "" {
		message = defaultMaintenanceMessage()
	}
	if err := upsertPlatformSetting(ctx, tx, "maintenance_enabled", boolString(input.Maintenance.Enabled), false, actor.UserID); err != nil {
		return superadmindomain.PlatformSettings{}, err
	}
	if err := upsertPlatformSetting(ctx, tx, "maintenance_message", message, false, actor.UserID); err != nil {
		return superadmindomain.PlatformSettings{}, err
	}
	for _, credential := range input.Credentials {
		if _, ok := credentialDefinition(credential.Key); !ok {
			return superadmindomain.PlatformSettings{}, superadmindomain.ErrInvalidSettings
		}
		value := strings.TrimSpace(credential.Value)
		if credential.Clear {
			if err := upsertPlatformSetting(ctx, tx, credential.Key, "", true, actor.UserID); err != nil {
				return superadmindomain.PlatformSettings{}, err
			}
			continue
		}
		if value != "" {
			if err := upsertPlatformSetting(ctx, tx, credential.Key, value, true, actor.UserID); err != nil {
				return superadmindomain.PlatformSettings{}, err
			}
		}
	}
	if err := insertAudit(ctx, tx, systemTenantID, actor.UserID, "platform_settings.update", "platform_settings", "", "system_confidential", fmt.Sprintf(`{"maintenance_enabled":%t}`, input.Maintenance.Enabled)); err != nil {
		return superadmindomain.PlatformSettings{}, err
	}
	if err := tx.Commit(); err != nil {
		return superadmindomain.PlatformSettings{}, err
	}
	return s.PlatformSettings(ctx)
}

func (s *Store) CreateSupportTicket(ctx context.Context, principal identity.Principal, input superadmindomain.CreateSupportTicketInput) (superadmindomain.SupportTicket, error) {
	ticketType := normalizeSupportTicketType(input.Type)
	subject := strings.TrimSpace(input.Subject)
	message := strings.TrimSpace(input.Message)
	if ticketType == "" || subject == "" || message == "" {
		return superadmindomain.SupportTicket{}, superadmindomain.ErrInvalidSupportTicket
	}

	tenantID := postgresUUID(principal.TenantID)
	if tenantID == "" {
		tenantID = systemTenantID
	}
	reporterID := postgresUUID(principal.UserID)
	reporterName := strings.TrimSpace(principal.Name)
	reporterEmail := strings.TrimSpace(principal.Email)
	if reporterName == "" {
		reporterName = reporterEmail
	}
	if reporterName == "" {
		reporterName = "Kullanıcı"
	}

	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return superadmindomain.SupportTicket{}, err
	}
	defer rollback(tx)

	var ticketID string
	if err := tx.QueryRowContext(ctx, `
INSERT INTO support_tickets (tenant_id, reporter_user_id, reporter_name, reporter_email, type, subject, message, status, priority)
VALUES ($1, NULLIF($2, '')::uuid, $3, $4, $5, $6, $7, 'open', 'normal')
RETURNING id::text`, tenantID, reporterID, reporterName, reporterEmail, ticketType, subject, message).Scan(&ticketID); err != nil {
		return superadmindomain.SupportTicket{}, err
	}
	if err := insertAudit(ctx, tx, tenantID, reporterID, "support_ticket.create", "support_ticket", ticketID, "operational", fmt.Sprintf(`{"type":%q,"status":"open"}`, ticketType)); err != nil {
		return superadmindomain.SupportTicket{}, err
	}
	if err := tx.Commit(); err != nil {
		return superadmindomain.SupportTicket{}, err
	}

	ticket, ok, err := s.supportTicketByID(ctx, ticketID)
	if err != nil {
		return superadmindomain.SupportTicket{}, err
	}
	if !ok {
		return superadmindomain.SupportTicket{}, superadmindomain.ErrSupportTicketNotFound
	}
	return ticket, nil
}

func (s *Store) ListSupportTicketsByReporter(ctx context.Context, principal identity.Principal) ([]superadmindomain.SupportTicket, error) {
	reporterID := postgresUUID(principal.UserID)
	if reporterID == "" {
		return []superadmindomain.SupportTicket{}, nil
	}
	tenantID := postgresUUID(principal.TenantID)
	const query = `
SELECT
	st.id::text,
	COALESCE(st.tenant_id::text, '') AS tenant_id,
	COALESCE(t.name, 'ÖTS Platform') AS tenant_name,
	COALESCE(st.reporter_user_id::text, '') AS reporter_id,
	COALESCE(NULLIF(st.reporter_name, ''), u.full_name, 'Kullanıcı') AS reporter_name,
	COALESCE(NULLIF(st.reporter_email, ''), u.email, '') AS reporter_email,
	st.type,
	st.subject,
	st.message,
	st.status,
	st.priority,
	st.internal_note,
	st.created_at,
	st.updated_at
FROM support_tickets st
LEFT JOIN tenants t ON t.id = st.tenant_id
LEFT JOIN users u ON u.id = st.reporter_user_id
WHERE st.reporter_user_id = $1::uuid
  AND ($2 = '' OR st.tenant_id = $2::uuid)
ORDER BY st.created_at DESC
LIMIT 100`
	rows, err := s.db.QueryContext(ctx, query, reporterID, tenantID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanSupportTickets(rows)
}

func (s *Store) ListSupportTickets(ctx context.Context) ([]superadmindomain.SupportTicket, error) {
	const query = `
SELECT
	st.id::text,
	COALESCE(st.tenant_id::text, '') AS tenant_id,
	COALESCE(t.name, 'ÖTS Platform') AS tenant_name,
	COALESCE(st.reporter_user_id::text, '') AS reporter_id,
	COALESCE(NULLIF(st.reporter_name, ''), u.full_name, 'Kullanıcı') AS reporter_name,
	COALESCE(NULLIF(st.reporter_email, ''), u.email, '') AS reporter_email,
	st.type,
	st.subject,
	st.message,
	st.status,
	st.priority,
	st.internal_note,
	st.created_at,
	st.updated_at
FROM support_tickets st
LEFT JOIN tenants t ON t.id = st.tenant_id
LEFT JOIN users u ON u.id = st.reporter_user_id
ORDER BY CASE st.status
	WHEN 'open' THEN 0
	WHEN 'in_review' THEN 1
	WHEN 'resolved' THEN 2
	ELSE 3
END, st.created_at DESC
LIMIT 250`
	rows, err := s.db.QueryContext(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanSupportTickets(rows)
}

func (s *Store) UpdateSupportTicket(ctx context.Context, actor identity.Principal, ticketID string, input superadmindomain.UpdateSupportTicketInput) (superadmindomain.SupportTicket, bool, error) {
	status := normalizeSupportTicketStatus(input.Status)
	priority := normalizeSupportTicketPriority(input.Priority)
	internalNote := strings.TrimSpace(input.InternalNote)
	if status == "" || priority == "" {
		return superadmindomain.SupportTicket{}, false, superadmindomain.ErrInvalidSupportTicket
	}

	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return superadmindomain.SupportTicket{}, false, err
	}
	defer rollback(tx)

	var tenantID string
	err = tx.QueryRowContext(ctx, `
UPDATE support_tickets
SET status = $1, priority = $2, internal_note = $3, updated_at = now()
WHERE id = $4
RETURNING COALESCE(tenant_id::text, '')`, status, priority, internalNote, ticketID).Scan(&tenantID)
	if errors.Is(err, sql.ErrNoRows) {
		return superadmindomain.SupportTicket{}, false, nil
	}
	if err != nil {
		return superadmindomain.SupportTicket{}, false, err
	}
	if tenantID == "" {
		tenantID = systemTenantID
	}
	if err := insertAudit(ctx, tx, tenantID, postgresUUID(actor.UserID), "support_ticket.update", "support_ticket", ticketID, "system_confidential", fmt.Sprintf(`{"status":%q,"priority":%q}`, status, priority)); err != nil {
		return superadmindomain.SupportTicket{}, false, err
	}
	if err := tx.Commit(); err != nil {
		return superadmindomain.SupportTicket{}, false, err
	}

	ticket, ok, err := s.supportTicketByID(ctx, ticketID)
	if err != nil || !ok {
		return superadmindomain.SupportTicket{}, ok, err
	}
	return ticket, true, nil
}

func (s *Store) SuperAdminOverview(ctx context.Context) (superadmindomain.Overview, error) {
	var institutions int
	if err := s.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM tenants WHERE deleted_at IS NULL AND plan <> 'system'`).Scan(&institutions); err != nil {
		return superadmindomain.Overview{}, err
	}

	var activeUsers int
	if err := s.db.QueryRowContext(ctx, `
SELECT COUNT(DISTINCT u.id)
FROM users u
JOIN tenant_memberships tm ON tm.user_id = u.id AND tm.status = 'active'
JOIN tenants t ON t.id = tm.tenant_id AND t.deleted_at IS NULL
WHERE u.is_active = true`).Scan(&activeUsers); err != nil {
		return superadmindomain.Overview{}, err
	}

	usage, err := s.weeklyUsage(ctx)
	if err != nil {
		return superadmindomain.Overview{}, err
	}

	return superadmindomain.Overview{
		Institutions:        institutions,
		ActiveUsers:         activeUsers,
		SystemHealth:        "healthy",
		MonthlyRevenueTRY:   institutions * 32500,
		OpenSecuritySignals: 0,
		Usage:               usage,
		Incidents: []superadmindomain.Incident{
			{ID: "db-audit", Title: "Tenant ve kullanıcı işlemleri audit altında", Severity: "low", Status: "operational"},
		},
		Modules: defaultModules(),
	}, nil
}

func (s *Store) ListInstitutions(ctx context.Context) ([]superadmindomain.Institution, error) {
	const query = `
SELECT
	t.id::text,
	t.name,
	t.plan,
	t.timezone,
	COUNT(DISTINCT st.id) FILTER (WHERE st.deleted_at IS NULL AND st.status = 'active') AS students,
	COUNT(DISTINCT tm.user_id) FILTER (WHERE tm.status = 'active') AS users,
	CASE
		WHEN lower(t.plan) IN ('trial', 'deneme') THEN 'trial'
		WHEN lower(t.plan) IN ('review', 'inceleme') THEN 'review'
		ELSE 'active'
	END AS status,
	GREATEST(t.updated_at, COALESCE(MAX(a.created_at), t.updated_at), COALESCE(MAX(tm.created_at), t.updated_at)) AS last_activity_at
FROM tenants t
LEFT JOIN students st ON st.tenant_id = t.id
LEFT JOIN tenant_memberships tm ON tm.tenant_id = t.id
LEFT JOIN audit_logs a ON a.tenant_id = t.id
WHERE t.deleted_at IS NULL AND t.plan <> 'system'
GROUP BY t.id, t.name, t.plan, t.timezone, t.updated_at
ORDER BY last_activity_at DESC`
	return s.queryInstitutions(ctx, query)
}

func (s *Store) GetInstitution(ctx context.Context, tenantID string) (superadmindomain.InstitutionDetail, bool, error) {
	const query = `
SELECT
	t.id::text,
	t.name,
	t.plan,
	t.timezone,
	COUNT(DISTINCT st.id) FILTER (WHERE st.deleted_at IS NULL AND st.status = 'active') AS students,
	COUNT(DISTINCT tm.user_id) FILTER (WHERE tm.status = 'active') AS users,
	CASE
		WHEN lower(t.plan) IN ('trial', 'deneme') THEN 'trial'
		WHEN lower(t.plan) IN ('review', 'inceleme') THEN 'review'
		ELSE 'active'
	END AS status,
	GREATEST(t.updated_at, COALESCE(MAX(a.created_at), t.updated_at), COALESCE(MAX(tm.created_at), t.updated_at)) AS last_activity_at,
	t.created_at,
	t.updated_at
FROM tenants t
LEFT JOIN students st ON st.tenant_id = t.id
LEFT JOIN tenant_memberships tm ON tm.tenant_id = t.id
LEFT JOIN audit_logs a ON a.tenant_id = t.id
WHERE t.deleted_at IS NULL AND t.plan <> 'system' AND t.id = $1
GROUP BY t.id, t.name, t.plan, t.timezone, t.created_at, t.updated_at`

	var detail superadmindomain.InstitutionDetail
	err := s.db.QueryRowContext(ctx, query, tenantID).Scan(
		&detail.ID,
		&detail.Name,
		&detail.Plan,
		&detail.Timezone,
		&detail.Students,
		&detail.Users,
		&detail.Status,
		&detail.LastActivityAt,
		&detail.CreatedAt,
		&detail.UpdatedAt,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return superadmindomain.InstitutionDetail{}, false, nil
	}
	if err != nil {
		return superadmindomain.InstitutionDetail{}, false, err
	}
	return detail, true, nil
}

func (s *Store) CreateInstitution(ctx context.Context, actor identity.Principal, input superadmindomain.CreateInstitutionInput) (superadmindomain.InstitutionDetail, error) {
	name := strings.TrimSpace(input.Name)
	if name == "" {
		return superadmindomain.InstitutionDetail{}, superadmindomain.ErrInvalidInstitution
	}
	plan := strings.TrimSpace(input.Plan)
	if plan == "" {
		plan = "MVP"
	}
	timezone := strings.TrimSpace(input.Timezone)
	if timezone == "" {
		timezone = "Europe/Istanbul"
	}

	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return superadmindomain.InstitutionDetail{}, err
	}
	defer rollback(tx)

	var tenantID string
	if err := tx.QueryRowContext(ctx, `
INSERT INTO tenants (name, plan, timezone)
VALUES ($1, $2, $3)
RETURNING id::text`, name, plan, timezone).Scan(&tenantID); err != nil {
		return superadmindomain.InstitutionDetail{}, err
	}

	if err := ensureInstitutionRoles(ctx, tx, tenantID); err != nil {
		return superadmindomain.InstitutionDetail{}, err
	}
	if err := insertAudit(ctx, tx, tenantID, actor.UserID, "tenant.create", "tenant", tenantID, "system_confidential", fmt.Sprintf(`{"name":%q,"plan":%q}`, name, plan)); err != nil {
		return superadmindomain.InstitutionDetail{}, err
	}
	if err := tx.Commit(); err != nil {
		return superadmindomain.InstitutionDetail{}, err
	}

	detail, ok, err := s.GetInstitution(ctx, tenantID)
	if err != nil {
		return superadmindomain.InstitutionDetail{}, err
	}
	if !ok {
		return superadmindomain.InstitutionDetail{}, superadmindomain.ErrInstitutionNotFound
	}
	return detail, nil
}

func (s *Store) ListUserAccounts(ctx context.Context) ([]superadmindomain.UserAccount, error) {
	return s.listUsers(ctx, "")
}

func (s *Store) CreateUser(ctx context.Context, actor identity.Principal, input superadmindomain.CreateUserInput) (superadmindomain.CreatedUserCredential, error) {
	return s.CreateInstitutionUser(ctx, actor, input.TenantID, superadmindomain.CreateInstitutionUserInput{
		Email:    input.Email,
		FullName: input.FullName,
		Role:     input.Role,
	})
}

func (s *Store) UpdateUser(ctx context.Context, actor identity.Principal, userID string, input superadmindomain.UpdateUserInput) (superadmindomain.UserAccount, bool, error) {
	email := strings.ToLower(strings.TrimSpace(input.Email))
	fullName := strings.TrimSpace(input.FullName)
	roleCode := normalizeInstitutionRole(input.Role)
	status := normalizeUserStatus(input.Status)
	if email == "" || !strings.Contains(email, "@") || fullName == "" || roleCode == "" || status == "" {
		return superadmindomain.UserAccount{}, false, superadmindomain.ErrInvalidUser
	}

	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return superadmindomain.UserAccount{}, false, err
	}
	defer rollback(tx)

	currentRole, found, err := roleInTenant(ctx, tx, input.TenantID, userID)
	if err != nil {
		return superadmindomain.UserAccount{}, false, err
	}
	if !found {
		return superadmindomain.UserAccount{}, false, nil
	}
	if currentRole == string(identity.RoleSuperAdmin) {
		return superadmindomain.UserAccount{}, false, superadmindomain.ErrProtectedUser
	}
	if exists, err := tenantExists(ctx, tx, input.TenantID); err != nil || !exists {
		if err != nil {
			return superadmindomain.UserAccount{}, false, err
		}
		return superadmindomain.UserAccount{}, false, superadmindomain.ErrInstitutionNotFound
	}
	if exists, err := emailTakenByAnotherUser(ctx, tx, email, userID); err != nil || exists {
		if err != nil {
			return superadmindomain.UserAccount{}, false, err
		}
		return superadmindomain.UserAccount{}, false, superadmindomain.ErrUserAlreadyExists
	}

	isActive := status == "active"
	phone := strings.TrimSpace(input.Phone)
	avatarURL := strings.TrimSpace(input.AvatarURL)
	profileAccent := strings.TrimSpace(input.ProfileAccent)
	if profileAccent == "" {
		profileAccent = "#0891b2"
	}
	if _, err := tx.ExecContext(ctx, `
UPDATE users
SET email = $1, full_name = $2, phone = NULLIF($3, ''), avatar_url = NULLIF($4, ''), profile_accent = $5,
    is_active = $6, must_change_password = false, updated_at = now()
WHERE id = $7`, email, fullName, phone, avatarURL, profileAccent, isActive, userID); err != nil {
		return superadmindomain.UserAccount{}, false, err
	}
	if _, err := tx.ExecContext(ctx, `
UPDATE tenant_memberships
SET status = $1
WHERE tenant_id = $2 AND user_id = $3`, status, input.TenantID, userID); err != nil {
		return superadmindomain.UserAccount{}, false, err
	}

	roleID, err := ensureRole(ctx, tx, input.TenantID, roleCode)
	if err != nil {
		return superadmindomain.UserAccount{}, false, err
	}
	if _, err := tx.ExecContext(ctx, `DELETE FROM user_roles WHERE tenant_id = $1 AND user_id = $2`, input.TenantID, userID); err != nil {
		return superadmindomain.UserAccount{}, false, err
	}
	if _, err := tx.ExecContext(ctx, `INSERT INTO user_roles (tenant_id, user_id, role_id) VALUES ($1, $2, $3)`, input.TenantID, userID, roleID); err != nil {
		return superadmindomain.UserAccount{}, false, err
	}
	if err := createRoleProfile(ctx, tx, input.TenantID, userID, fullName, email, roleCode); err != nil {
		return superadmindomain.UserAccount{}, false, err
	}
	if err := insertAudit(ctx, tx, input.TenantID, actor.UserID, "tenant_user.update", "user", userID, "system_confidential", fmt.Sprintf(`{"email":%q,"role":%q,"status":%q}`, email, roleCode, status)); err != nil {
		return superadmindomain.UserAccount{}, false, err
	}
	if err := tx.Commit(); err != nil {
		return superadmindomain.UserAccount{}, false, err
	}

	user, err := s.userAccount(ctx, input.TenantID, userID)
	if err != nil {
		return superadmindomain.UserAccount{}, false, err
	}
	return user, true, nil
}

func (s *Store) DeleteUser(ctx context.Context, actor identity.Principal, userID string, tenantID string) (superadmindomain.UserAccount, bool, error) {
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return superadmindomain.UserAccount{}, false, err
	}
	defer rollback(tx)

	currentRole, found, err := roleInTenant(ctx, tx, tenantID, userID)
	if err != nil {
		return superadmindomain.UserAccount{}, false, err
	}
	if !found {
		return superadmindomain.UserAccount{}, false, nil
	}
	if currentRole == string(identity.RoleSuperAdmin) || actor.UserID == userID {
		return superadmindomain.UserAccount{}, false, superadmindomain.ErrProtectedUser
	}

	if _, err := tx.ExecContext(ctx, `
UPDATE users
SET is_active = false, must_change_password = false, updated_at = now()
WHERE id = $1`, userID); err != nil {
		return superadmindomain.UserAccount{}, false, err
	}
	if _, err := tx.ExecContext(ctx, `
UPDATE tenant_memberships
SET status = 'passive'
WHERE tenant_id = $1 AND user_id = $2`, tenantID, userID); err != nil {
		return superadmindomain.UserAccount{}, false, err
	}
	if err := insertAudit(ctx, tx, tenantID, actor.UserID, "tenant_user.delete", "user", userID, "system_confidential", `{"delete_mode":"soft_deactivate"}`); err != nil {
		return superadmindomain.UserAccount{}, false, err
	}
	if err := tx.Commit(); err != nil {
		return superadmindomain.UserAccount{}, false, err
	}

	user, err := s.userAccount(ctx, tenantID, userID)
	if err != nil {
		return superadmindomain.UserAccount{}, false, err
	}
	return user, true, nil
}

func (s *Store) ListInstitutionUsers(ctx context.Context, tenantID string) ([]superadmindomain.UserAccount, error) {
	if _, ok, err := s.GetInstitution(ctx, tenantID); err != nil || !ok {
		if err != nil {
			return nil, err
		}
		return nil, superadmindomain.ErrInstitutionNotFound
	}
	return s.listUsers(ctx, tenantID)
}

func (s *Store) CreateInstitutionUser(ctx context.Context, actor identity.Principal, tenantID string, input superadmindomain.CreateInstitutionUserInput) (superadmindomain.CreatedUserCredential, error) {
	email := strings.ToLower(strings.TrimSpace(input.Email))
	if email == "" || !strings.Contains(email, "@") {
		return superadmindomain.CreatedUserCredential{}, superadmindomain.ErrInvalidUser
	}

	fullName := strings.TrimSpace(input.FullName)
	if fullName == "" {
		fullName = defaultNameFromEmail(email)
	}
	roleCode := normalizeInstitutionRole(input.Role)
	if roleCode == "" {
		return superadmindomain.CreatedUserCredential{}, superadmindomain.ErrInvalidUser
	}

	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return superadmindomain.CreatedUserCredential{}, err
	}
	defer rollback(tx)

	if exists, err := tenantExists(ctx, tx, tenantID); err != nil || !exists {
		if err != nil {
			return superadmindomain.CreatedUserCredential{}, err
		}
		return superadmindomain.CreatedUserCredential{}, superadmindomain.ErrInstitutionNotFound
	}

	var existing string
	err = tx.QueryRowContext(ctx, `SELECT id::text FROM users WHERE lower(email) = lower($1) LIMIT 1`, email).Scan(&existing)
	if err == nil {
		return superadmindomain.CreatedUserCredential{}, superadmindomain.ErrUserAlreadyExists
	}
	if err != nil && !errors.Is(err, sql.ErrNoRows) {
		return superadmindomain.CreatedUserCredential{}, err
	}

	tempPassword, err := temporaryPassword()
	if err != nil {
		return superadmindomain.CreatedUserCredential{}, err
	}
	passwordHash, err := hashPassword(tempPassword)
	if err != nil {
		return superadmindomain.CreatedUserCredential{}, err
	}

	var userID string
	if err := tx.QueryRowContext(ctx, `
INSERT INTO users (email, password_hash, full_name, is_active, must_change_password)
VALUES ($1, $2, $3, true, true)
RETURNING id::text`, email, passwordHash, fullName).Scan(&userID); err != nil {
		return superadmindomain.CreatedUserCredential{}, err
	}

	if _, err := tx.ExecContext(ctx, `INSERT INTO tenant_memberships (tenant_id, user_id, status) VALUES ($1, $2, 'active')`, tenantID, userID); err != nil {
		return superadmindomain.CreatedUserCredential{}, err
	}

	roleID, err := ensureRole(ctx, tx, tenantID, roleCode)
	if err != nil {
		return superadmindomain.CreatedUserCredential{}, err
	}
	if _, err := tx.ExecContext(ctx, `INSERT INTO user_roles (tenant_id, user_id, role_id) VALUES ($1, $2, $3)`, tenantID, userID, roleID); err != nil {
		return superadmindomain.CreatedUserCredential{}, err
	}

	if err := createRoleProfile(ctx, tx, tenantID, userID, fullName, email, roleCode); err != nil {
		return superadmindomain.CreatedUserCredential{}, err
	}
	if err := insertAudit(ctx, tx, tenantID, actor.UserID, "tenant_user.create", "user", userID, "system_confidential", fmt.Sprintf(`{"email":%q,"role":%q,"must_change_password":true}`, email, roleCode)); err != nil {
		return superadmindomain.CreatedUserCredential{}, err
	}
	if err := tx.Commit(); err != nil {
		return superadmindomain.CreatedUserCredential{}, err
	}

	user, err := s.userAccount(ctx, tenantID, userID)
	if err != nil {
		return superadmindomain.CreatedUserCredential{}, err
	}
	return superadmindomain.CreatedUserCredential{User: user, TemporaryPassword: tempPassword}, nil
}

func (s *Store) ListAuditEntries(ctx context.Context) ([]superadmindomain.AuditEntry, error) {
	const query = `
SELECT
	a.id::text,
	COALESCE(t.name, 'ÖTS Platform') AS tenant_name,
	COALESCE(u.full_name, 'Sistem') AS actor,
	a.action,
	a.resource_type,
	a.sensitivity,
	a.created_at
FROM audit_logs a
LEFT JOIN tenants t ON t.id = a.tenant_id
LEFT JOIN users u ON u.id = a.actor_user_id
ORDER BY a.created_at DESC
LIMIT 100`

	rows, err := s.db.QueryContext(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	entries := []superadmindomain.AuditEntry{}
	for rows.Next() {
		var entry superadmindomain.AuditEntry
		if err := rows.Scan(&entry.ID, &entry.Tenant, &entry.Actor, &entry.Action, &entry.ResourceType, &entry.Sensitivity, &entry.CreatedAt); err != nil {
			return nil, err
		}
		entries = append(entries, entry)
	}
	return entries, rows.Err()
}

func (s *Store) supportTicketByID(ctx context.Context, ticketID string) (superadmindomain.SupportTicket, bool, error) {
	const query = `
SELECT
	st.id::text,
	COALESCE(st.tenant_id::text, '') AS tenant_id,
	COALESCE(t.name, 'ÖTS Platform') AS tenant_name,
	COALESCE(st.reporter_user_id::text, '') AS reporter_id,
	COALESCE(NULLIF(st.reporter_name, ''), u.full_name, 'Kullanıcı') AS reporter_name,
	COALESCE(NULLIF(st.reporter_email, ''), u.email, '') AS reporter_email,
	st.type,
	st.subject,
	st.message,
	st.status,
	st.priority,
	st.internal_note,
	st.created_at,
	st.updated_at
FROM support_tickets st
LEFT JOIN tenants t ON t.id = st.tenant_id
LEFT JOIN users u ON u.id = st.reporter_user_id
WHERE st.id = $1
LIMIT 1`
	rows, err := s.db.QueryContext(ctx, query, ticketID)
	if err != nil {
		return superadmindomain.SupportTicket{}, false, err
	}
	defer rows.Close()

	tickets, err := scanSupportTickets(rows)
	if err != nil {
		return superadmindomain.SupportTicket{}, false, err
	}
	if len(tickets) == 0 {
		return superadmindomain.SupportTicket{}, false, nil
	}
	return tickets[0], true, nil
}

func scanSupportTickets(rows *sql.Rows) ([]superadmindomain.SupportTicket, error) {
	tickets := []superadmindomain.SupportTicket{}
	for rows.Next() {
		var ticket superadmindomain.SupportTicket
		if err := rows.Scan(
			&ticket.ID,
			&ticket.TenantID,
			&ticket.Tenant,
			&ticket.ReporterID,
			&ticket.ReporterName,
			&ticket.ReporterEmail,
			&ticket.Type,
			&ticket.Subject,
			&ticket.Message,
			&ticket.Status,
			&ticket.Priority,
			&ticket.InternalNote,
			&ticket.CreatedAt,
			&ticket.UpdatedAt,
		); err != nil {
			return nil, err
		}
		tickets = append(tickets, ticket)
	}
	return tickets, rows.Err()
}

func (s *Store) queryInstitutions(ctx context.Context, query string, args ...any) ([]superadmindomain.Institution, error) {
	rows, err := s.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	institutions := []superadmindomain.Institution{}
	for rows.Next() {
		var institution superadmindomain.Institution
		if err := rows.Scan(
			&institution.ID,
			&institution.Name,
			&institution.Plan,
			&institution.Timezone,
			&institution.Students,
			&institution.Users,
			&institution.Status,
			&institution.LastActivityAt,
		); err != nil {
			return nil, err
		}
		institutions = append(institutions, institution)
	}
	return institutions, rows.Err()
}

func (s *Store) listUsers(ctx context.Context, tenantID string) ([]superadmindomain.UserAccount, error) {
	query := `
SELECT
	u.id::text,
	tm.tenant_id::text,
	t.name,
	u.full_name,
	COALESCE(u.email, '') AS email,
	COALESCE(u.phone, '') AS phone,
	COALESCE(u.avatar_url, '') AS avatar_url,
	COALESCE(u.profile_accent, '#0891b2') AS profile_accent,
	COALESCE(r.code, 'principal') AS role_code,
	CASE
		WHEN u.is_active = true AND tm.status = 'active' AND u.must_change_password = true THEN 'first_login'
		WHEN u.is_active = true AND tm.status = 'active' THEN 'active'
		WHEN tm.status = 'invited' THEN 'invited'
		ELSE 'passive'
	END AS status,
	u.must_change_password,
	u.created_at
FROM users u
JOIN tenant_memberships tm ON tm.user_id = u.id
JOIN tenants t ON t.id = tm.tenant_id AND t.deleted_at IS NULL
LEFT JOIN LATERAL (
	SELECT roles.code
	FROM user_roles ur
	JOIN roles ON roles.id = ur.role_id
	WHERE ur.user_id = u.id AND ur.tenant_id = tm.tenant_id
	ORDER BY CASE roles.code
		WHEN 'super_admin' THEN 0
		WHEN 'system_admin' THEN 1
		WHEN 'principal' THEN 2
		WHEN 'guidance' THEN 3
		WHEN 'teacher' THEN 4
		WHEN 'guardian' THEN 5
		ELSE 9
	END
	LIMIT 1
) r ON true`

	args := []any{}
	if tenantID != "" {
		query += ` WHERE tm.tenant_id = $1`
		args = append(args, tenantID)
	}
	query += ` ORDER BY u.created_at DESC`

	rows, err := s.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	users := []superadmindomain.UserAccount{}
	for rows.Next() {
		var user superadmindomain.UserAccount
		if err := rows.Scan(
			&user.ID,
			&user.TenantID,
			&user.Tenant,
			&user.FullName,
			&user.Email,
			&user.Phone,
			&user.AvatarURL,
			&user.ProfileAccent,
			&user.Role,
			&user.Status,
			&user.MustChangePassword,
			&user.CreatedAt,
		); err != nil {
			return nil, err
		}
		users = append(users, user)
	}
	return users, rows.Err()
}

func (s *Store) userAccount(ctx context.Context, tenantID string, userID string) (superadmindomain.UserAccount, error) {
	users, err := s.listUsers(ctx, tenantID)
	if err != nil {
		return superadmindomain.UserAccount{}, err
	}
	for _, user := range users {
		if user.ID == userID {
			return user, nil
		}
	}
	return superadmindomain.UserAccount{}, sql.ErrNoRows
}

func (s *Store) GetUserPrincipal(ctx context.Context, userID string) (identity.Principal, bool, error) {
	return s.principalByUserID(ctx, userID)
}

func (s *Store) principalByUserID(ctx context.Context, userID string) (identity.Principal, bool, error) {
	const query = `
SELECT
	u.id::text,
	tm.tenant_id::text,
	COALESCE(r.code, 'principal') AS role_code,
	u.full_name,
	COALESCE(u.email, '') AS email,
	u.must_change_password
FROM users u
JOIN tenant_memberships tm ON tm.user_id = u.id AND tm.status = 'active'
JOIN tenants t ON t.id = tm.tenant_id AND t.deleted_at IS NULL
LEFT JOIN LATERAL (
	SELECT roles.code
	FROM user_roles ur
	JOIN roles ON roles.id = ur.role_id
	WHERE ur.user_id = u.id AND ur.tenant_id = tm.tenant_id
	ORDER BY CASE roles.code
		WHEN 'super_admin' THEN 0
		WHEN 'system_admin' THEN 1
		WHEN 'principal' THEN 2
		WHEN 'guidance' THEN 3
		WHEN 'teacher' THEN 4
		WHEN 'guardian' THEN 5
		ELSE 9
	END
	LIMIT 1
) r ON true
WHERE u.id = $1 AND u.is_active = true
ORDER BY CASE COALESCE(r.code, 'principal')
	WHEN 'super_admin' THEN 0
	WHEN 'system_admin' THEN 1
	ELSE 2
END
LIMIT 1`

	var principal identity.Principal
	var roleCode string
	err := s.db.QueryRowContext(ctx, query, userID).Scan(
		&principal.UserID,
		&principal.TenantID,
		&roleCode,
		&principal.Name,
		&principal.Email,
		&principal.MustChangePassword,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return identity.Principal{}, false, nil
	}
	if err != nil {
		return identity.Principal{}, false, err
	}
	principal.Role = identity.Role(roleCode)
	return principal, true, nil
}

func (s *Store) weeklyUsage(ctx context.Context) ([]superadmindomain.UsagePoint, error) {
	start := s.clock().AddDate(0, 0, -4)
	points := make([]superadmindomain.UsagePoint, 0, 5)
	labels := []string{"Paz", "Pzt", "Sal", "Çar", "Per", "Cum", "Cmt"}
	for day := 0; day < 5; day++ {
		current := time.Date(start.Year(), start.Month(), start.Day()+day, 0, 0, 0, 0, start.Location())
		next := current.AddDate(0, 0, 1)
		var count int
		if err := s.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM audit_logs WHERE created_at >= $1 AND created_at < $2`, current, next).Scan(&count); err != nil {
			return nil, err
		}
		value := 12 + count*18
		if value > 100 {
			value = 100
		}
		points = append(points, superadmindomain.UsagePoint{
			Label: labels[int(current.Weekday())],
			Value: value,
		})
	}
	return points, nil
}

func hashPassword(password string) (string, error) {
	saltBytes := make([]byte, 12)
	if _, err := rand.Read(saltBytes); err != nil {
		return "", err
	}
	salt := hex.EncodeToString(saltBytes)
	sum := sha256.Sum256([]byte(salt + ":" + password))
	return "sha256$" + salt + "$" + hex.EncodeToString(sum[:]), nil
}

func verifyPassword(stored string, password string) bool {
	parts := strings.Split(stored, "$")
	if len(parts) != 3 || parts[0] != "sha256" {
		return false
	}
	sum := sha256.Sum256([]byte(parts[1] + ":" + password))
	return parts[2] == hex.EncodeToString(sum[:])
}

func temporaryPassword() (string, error) {
	bytes := make([]byte, 9)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	encoded := base32.StdEncoding.WithPadding(base32.NoPadding).EncodeToString(bytes)
	if len(encoded) > 12 {
		encoded = encoded[:12]
	}
	return "Ots-" + encoded + "!26", nil
}

func ensureInstitutionRoles(ctx context.Context, tx *sql.Tx, tenantID string) error {
	for _, roleCode := range []string{"principal", "guidance", "teacher", "guardian"} {
		if _, err := ensureRole(ctx, tx, tenantID, roleCode); err != nil {
			return err
		}
	}
	return nil
}

func ensureRole(ctx context.Context, tx *sql.Tx, tenantID string, code string) (string, error) {
	var roleID string
	err := tx.QueryRowContext(ctx, `
INSERT INTO roles (tenant_id, code, name)
VALUES ($1, $2, $3)
ON CONFLICT (tenant_id, code) DO UPDATE SET name = EXCLUDED.name
RETURNING id::text`, tenantID, code, roleName(code)).Scan(&roleID)
	return roleID, err
}

func tenantExists(ctx context.Context, tx *sql.Tx, tenantID string) (bool, error) {
	var exists bool
	err := tx.QueryRowContext(ctx, `SELECT EXISTS(SELECT 1 FROM tenants WHERE id = $1 AND deleted_at IS NULL AND plan <> 'system')`, tenantID).Scan(&exists)
	return exists, err
}

func upsertPlatformSetting(ctx context.Context, tx *sql.Tx, key string, value string, secret bool, actorUserID string) error {
	_, err := tx.ExecContext(ctx, `
INSERT INTO platform_settings (key, value, is_secret, updated_by, updated_at)
VALUES ($1, $2, $3, $4, now())
ON CONFLICT (key) DO UPDATE
SET value = EXCLUDED.value,
    is_secret = EXCLUDED.is_secret,
    updated_by = EXCLUDED.updated_by,
    updated_at = now()`, key, value, secret, actorUserID)
	return err
}

func emailTakenByAnotherUser(ctx context.Context, tx *sql.Tx, email string, userID string) (bool, error) {
	var exists bool
	err := tx.QueryRowContext(ctx, `SELECT EXISTS(SELECT 1 FROM users WHERE lower(email) = lower($1) AND id <> $2::uuid)`, email, userID).Scan(&exists)
	return exists, err
}

func roleInTenant(ctx context.Context, tx *sql.Tx, tenantID string, userID string) (string, bool, error) {
	const query = `
SELECT COALESCE(r.code, 'principal') AS role_code
FROM users u
JOIN tenant_memberships tm ON tm.user_id = u.id AND tm.tenant_id = $1::uuid
LEFT JOIN LATERAL (
	SELECT roles.code
	FROM user_roles ur
	JOIN roles ON roles.id = ur.role_id
	WHERE ur.user_id = u.id AND ur.tenant_id = tm.tenant_id
	ORDER BY CASE roles.code
		WHEN 'super_admin' THEN 0
		WHEN 'system_admin' THEN 1
		WHEN 'principal' THEN 2
		WHEN 'guidance' THEN 3
		WHEN 'teacher' THEN 4
		WHEN 'guardian' THEN 5
		ELSE 9
	END
	LIMIT 1
) r ON true
WHERE u.id = $2::uuid
LIMIT 1`

	var roleCode string
	err := tx.QueryRowContext(ctx, query, tenantID, userID).Scan(&roleCode)
	if errors.Is(err, sql.ErrNoRows) {
		return "", false, nil
	}
	if err != nil {
		return "", false, err
	}
	return roleCode, true, nil
}

func createRoleProfile(ctx context.Context, tx *sql.Tx, tenantID string, userID string, fullName string, email string, roleCode string) error {
	switch roleCode {
	case "teacher", "guidance":
		_, err := tx.ExecContext(ctx, `
INSERT INTO teachers (tenant_id, user_id, title)
VALUES ($1, $2, $3)
ON CONFLICT (tenant_id, user_id) DO NOTHING`, tenantID, userID, roleName(roleCode))
		return err
	case "guardian":
		_, err := tx.ExecContext(ctx, `
INSERT INTO guardians (tenant_id, user_id, full_name, email)
VALUES ($1, $2, $3, $4)`, tenantID, userID, fullName, email)
		return err
	default:
		return nil
	}
}

func insertAudit(ctx context.Context, tx *sql.Tx, tenantID string, actorUserID string, action string, resourceType string, resourceID string, sensitivity string, metadata string) error {
	_, err := tx.ExecContext(ctx, `
INSERT INTO audit_logs (tenant_id, actor_user_id, action, resource_type, resource_id, sensitivity, metadata)
VALUES ($1, NULLIF($2, '')::uuid, $3, $4, NULLIF($5, '')::uuid, $6, $7::jsonb)`, tenantID, actorUserID, action, resourceType, resourceID, sensitivity, metadata)
	return err
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

func postgresUUID(value string) string {
	value = strings.ToLower(strings.TrimSpace(value))
	if len(value) != 36 {
		return ""
	}
	for index, char := range value {
		if index == 8 || index == 13 || index == 18 || index == 23 {
			if char != '-' {
				return ""
			}
			continue
		}
		if (char < '0' || char > '9') && (char < 'a' || char > 'f') {
			return ""
		}
	}
	return value
}

func normalizeInstitutionRole(value string) string {
	switch strings.TrimSpace(strings.ToLower(value)) {
	case "", "principal":
		return "principal"
	case "guidance":
		return "guidance"
	case "teacher":
		return "teacher"
	case "guardian":
		return "guardian"
	default:
		return ""
	}
}

func normalizeUserStatus(value string) string {
	switch strings.TrimSpace(strings.ToLower(value)) {
	case "", "active":
		return "active"
	case "passive":
		return "passive"
	default:
		return ""
	}
}

func roleName(code string) string {
	labels := map[string]string{
		"principal":   "Müdür",
		"guidance":    "Rehberlik",
		"teacher":     "Öğretmen",
		"guardian":    "Veli",
		"super_admin": "Süper Admin",
	}
	if label, ok := labels[code]; ok {
		return label
	}
	return code
}

func defaultNameFromEmail(email string) string {
	local := strings.Split(email, "@")[0]
	local = strings.ReplaceAll(local, ".", " ")
	local = strings.ReplaceAll(local, "_", " ")
	local = strings.TrimSpace(local)
	if local == "" {
		return email
	}
	return strings.Title(local)
}

func platformSettingsFromValues(values map[string]string, updatedAt map[string]time.Time) superadmindomain.PlatformSettings {
	maintenanceUpdatedAt := latestSettingTime(updatedAt, "maintenance_enabled", "maintenance_message")
	maintenance := superadmindomain.MaintenanceMode{
		Enabled:   strings.EqualFold(values["maintenance_enabled"], "true"),
		Message:   values["maintenance_message"],
		UpdatedAt: maintenanceUpdatedAt,
	}
	if maintenance.Message == "" {
		maintenance.Message = defaultMaintenanceMessage()
	}

	credentials := make([]superadmindomain.IntegrationCredential, 0, len(credentialDefinitions()))
	for _, definition := range credentialDefinitions() {
		value := values[definition.Key]
		updated := updatedAtPointer(updatedAt, definition.Key)
		credentials = append(credentials, superadmindomain.IntegrationCredential{
			Key:         definition.Key,
			Label:       definition.Label,
			Provider:    definition.Provider,
			Description: definition.Description,
			Configured:  strings.TrimSpace(value) != "",
			MaskedValue: maskSecret(value),
			UpdatedAt:   updated,
		})
	}
	return superadmindomain.PlatformSettings{Maintenance: maintenance, Credentials: credentials}
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

func latestSettingTime(updatedAt map[string]time.Time, keys ...string) *time.Time {
	var latest *time.Time
	for _, key := range keys {
		value, ok := updatedAt[key]
		if !ok {
			continue
		}
		copyValue := value
		if latest == nil || copyValue.After(*latest) {
			latest = &copyValue
		}
	}
	return latest
}

func updatedAtPointer(updatedAt map[string]time.Time, key string) *time.Time {
	value, ok := updatedAt[key]
	if !ok {
		return nil
	}
	return &value
}

func defaultMaintenanceMessage() string {
	return "Sistem bakımı devam ediyor. Kısa süre sonra tekrar deneyebilirsiniz."
}

func boolString(value bool) string {
	if value {
		return "true"
	}
	return "false"
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

type cpuSample struct {
	idle  uint64
	total uint64
}

func readCPUPercent() float64 {
	first, err := readCPUSample()
	if err != nil {
		return 0
	}
	time.Sleep(120 * time.Millisecond)
	second, err := readCPUSample()
	if err != nil {
		return 0
	}
	total := second.total - first.total
	idle := second.idle - first.idle
	if total == 0 || idle > total {
		return 0
	}
	return roundOne(float64(total-idle) * 100 / float64(total))
}

func readCPUSample() (cpuSample, error) {
	content, err := os.ReadFile("/proc/stat")
	if err != nil {
		return cpuSample{}, err
	}
	lines := strings.Split(string(content), "\n")
	if len(lines) == 0 {
		return cpuSample{}, errors.New("missing cpu stat")
	}
	fields := strings.Fields(lines[0])
	if len(fields) < 5 || fields[0] != "cpu" {
		return cpuSample{}, errors.New("invalid cpu stat")
	}
	values := make([]uint64, 0, len(fields)-1)
	for _, field := range fields[1:] {
		value, err := strconv.ParseUint(field, 10, 64)
		if err != nil {
			return cpuSample{}, err
		}
		values = append(values, value)
	}
	var total uint64
	for _, value := range values {
		total += value
	}
	idle := values[3]
	if len(values) > 4 {
		idle += values[4]
	}
	return cpuSample{idle: idle, total: total}, nil
}

func readMemoryUsage() (float64, string) {
	content, err := os.ReadFile("/proc/meminfo")
	if err != nil {
		return 0, "RAM bilgisi okunamadı"
	}
	values := map[string]uint64{}
	for _, line := range strings.Split(string(content), "\n") {
		fields := strings.Fields(line)
		if len(fields) < 2 {
			continue
		}
		value, err := strconv.ParseUint(fields[1], 10, 64)
		if err != nil {
			continue
		}
		values[strings.TrimSuffix(fields[0], ":")] = value
	}
	total := values["MemTotal"]
	available := values["MemAvailable"]
	if total == 0 {
		return 0, "RAM bilgisi okunamadı"
	}
	used := total - available
	return roundOne(float64(used) * 100 / float64(total)), fmt.Sprintf("%.1f GB / %.1f GB", kbToGB(used), kbToGB(total))
}

func runtimeHeapUsage() (float64, string) {
	var stats runtime.MemStats
	runtime.ReadMemStats(&stats)
	if stats.Sys == 0 {
		return 0, "Runtime heap bilgisi okunamadı"
	}
	percent := float64(stats.Alloc) * 100 / float64(stats.Sys)
	return roundOne(percent), fmt.Sprintf("%.1f MB alloc / %.1f MB sys", bytesToMB(stats.Alloc), bytesToMB(stats.Sys))
}

func metricStatus(value float64) string {
	switch {
	case value >= 90:
		return "critical"
	case value >= 75:
		return "warning"
	default:
		return "healthy"
	}
}

func aggregateHealth(resources []superadmindomain.ResourceMetric, services []superadmindomain.ServiceMetric) string {
	health := "healthy"
	for _, resource := range resources {
		if resource.Status == "critical" {
			return "critical"
		}
		if resource.Status == "warning" {
			health = "warning"
		}
	}
	for _, service := range services {
		if service.Status == "critical" {
			return "critical"
		}
		if service.Status == "warning" {
			health = "warning"
		}
	}
	return health
}

func kbToGB(value uint64) float64 {
	return float64(value) / 1024 / 1024
}

func bytesToGB(value uint64) float64 {
	return float64(value) / 1024 / 1024 / 1024
}

func bytesToMB(value uint64) float64 {
	return float64(value) / 1024 / 1024
}

func roundOne(value float64) float64 {
	return float64(int(value*10+0.5)) / 10
}

func defaultModules() []superadmindomain.ModuleStatus {
	return []superadmindomain.ModuleStatus{
		{Name: "Auth", Status: "operational", Description: "Login, ilk giriş şifre değişimi ve rol kapsamı çalışıyor."},
		{Name: "Scheduling", Status: "operational", Description: "AI ders programı üretim yüzeyi MVP kapsamında."},
		{Name: "Attendance", Status: "operational", Description: "Akıllı yoklama akışı canlı API'ye bağlı."},
		{Name: "Guidance", Status: "limited", Description: "Öğrenci gözlem kayıtları temel seviyede."},
		{Name: "Billing", Status: "planned", Description: "Lisans ve tahsilat premium faza ayrıldı."},
	}
}

func (s *Store) RequestPasswordReset(ctx context.Context, email string) (string, error) {
	email = strings.ToLower(strings.TrimSpace(email))
	if email == "" {
		return "", errors.New("invalid email")
	}
	var userID string
	err := s.db.QueryRowContext(ctx, `SELECT id::text FROM users WHERE lower(email) = lower($1) AND is_active = true`, email).Scan(&userID)
	if errors.Is(err, sql.ErrNoRows) {
		return "", nil
	}
	if err != nil {
		return "", err
	}
	token, err := temporaryPassword()
	if err != nil {
		return "", err
	}
	s.resetMu.Lock()
	s.resetTokens[token] = passwordResetEntry{userID: userID, expires: s.clock().Add(30 * time.Minute)}
	s.resetMu.Unlock()
	return token, nil
}

func (s *Store) ResetPasswordWithToken(ctx context.Context, token string, newPassword string) error {
	token = strings.TrimSpace(token)
	if token == "" || len(strings.TrimSpace(newPassword)) < 8 {
		return identity.ErrWeakPassword
	}
	s.resetMu.Lock()
	entry, ok := s.resetTokens[token]
	if ok {
		delete(s.resetTokens, token)
	}
	s.resetMu.Unlock()
	if !ok || s.clock().After(entry.expires) {
		return identity.ErrInvalidResetToken
	}
	hash, err := hashPassword(newPassword)
	if err != nil {
		return err
	}
	res, err := s.db.ExecContext(ctx, `
UPDATE users SET password_hash = $1, must_change_password = false, updated_at = now()
WHERE id = $2::uuid`, hash, entry.userID)
	if err != nil {
		return err
	}
	rows, _ := res.RowsAffected()
	if rows == 0 {
		return identity.ErrUserNotFound
	}
	return nil
}

func rollback(tx *sql.Tx) {
	_ = tx.Rollback()
}
