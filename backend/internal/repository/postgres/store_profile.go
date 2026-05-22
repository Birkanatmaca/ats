package postgres

import (
	"context"
	"database/sql"
	"errors"
	"strings"

	identitydomain "ots/backend/internal/domain/identity"
	superadmindomain "ots/backend/internal/domain/superadmin"
)

func (s *Store) GetUserProfile(ctx context.Context, tenantID string, userID string) (identitydomain.UserProfile, bool, error) {
	const query = `
SELECT
	u.id::text,
	tm.tenant_id::text,
	t.name,
	u.full_name,
	COALESCE(u.email, '') AS email,
	COALESCE(u.phone, '') AS phone,
	COALESCE(r.code, 'principal') AS role_code,
	CASE
		WHEN u.is_active = true AND tm.status = 'active' AND u.must_change_password = true THEN 'first_login'
		WHEN u.is_active = true AND tm.status = 'active' THEN 'active'
		WHEN tm.status = 'invited' THEN 'invited'
		ELSE 'passive'
	END AS status,
	COALESCE(u.avatar_url, '') AS avatar_url,
	COALESCE(u.profile_accent, '#0891b2') AS profile_accent,
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
) r ON true
WHERE u.id = $1 AND ($2 = '' OR tm.tenant_id = $2::uuid)
LIMIT 1`

	var profile identitydomain.UserProfile
	var roleCode string
	err := s.db.QueryRowContext(ctx, query, userID, postgresUUID(tenantID)).Scan(
		&profile.ID,
		&profile.TenantID,
		&profile.Tenant,
		&profile.FullName,
		&profile.Email,
		&profile.Phone,
		&roleCode,
		&profile.Status,
		&profile.AvatarURL,
		&profile.ProfileAccent,
		&profile.MustChangePassword,
		&profile.CreatedAt,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return identitydomain.UserProfile{}, false, nil
	}
	if err != nil {
		return identitydomain.UserProfile{}, false, err
	}
	profile.Role = identitydomain.Role(roleCode)
	return profile, true, nil
}

func (s *Store) UpdateSelfProfile(ctx context.Context, principal identitydomain.Principal, input superadmindomain.UpdateSelfProfileInput) (identitydomain.UserProfile, error) {
	current, ok, err := s.GetUserProfile(ctx, principal.TenantID, principal.UserID)
	if err != nil {
		return identitydomain.UserProfile{}, err
	}
	if !ok {
		return identitydomain.UserProfile{}, identitydomain.ErrUserNotFound
	}

	avatarURL := current.AvatarURL
	if input.AvatarURL != nil {
		avatarURL = strings.TrimSpace(*input.AvatarURL)
	}
	accent := current.ProfileAccent
	if input.ProfileAccent != nil {
		accent = strings.TrimSpace(*input.ProfileAccent)
		if accent == "" {
			accent = "#0891b2"
		}
	}

	if _, err := s.db.ExecContext(ctx, `
UPDATE users
SET avatar_url = NULLIF($1, ''), profile_accent = $2, updated_at = now()
WHERE id = $3`, avatarURL, accent, principal.UserID); err != nil {
		return identitydomain.UserProfile{}, err
	}

	profile, ok, err := s.GetUserProfile(ctx, principal.TenantID, principal.UserID)
	if err != nil {
		return identitydomain.UserProfile{}, err
	}
	if !ok {
		return identitydomain.UserProfile{}, identitydomain.ErrUserNotFound
	}
	return profile, nil
}
