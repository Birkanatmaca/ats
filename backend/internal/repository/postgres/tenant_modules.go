package postgres

import (
	"context"
	"encoding/json"
	"strings"

	schooldomain "ots/backend/internal/domain/school"
)

func (s *Store) scanTenantModules(raw []byte) []string {
	if len(raw) == 0 {
		return schooldomain.DefaultEnabledModules()
	}
	var modules []string
	if err := json.Unmarshal(raw, &modules); err != nil || len(modules) == 0 {
		return schooldomain.DefaultEnabledModules()
	}
	return modules
}

func (s *Store) TenantEnabledModules(ctx context.Context, tenantID string) ([]string, error) {
	var raw []byte
	err := s.db.QueryRowContext(ctx, `
SELECT enabled_modules
FROM tenants
WHERE id = $1 AND deleted_at IS NULL`, tenantID).Scan(&raw)
	if err != nil {
		return nil, err
	}
	return s.scanTenantModules(raw), nil
}

func (s *Store) TenantHasModule(ctx context.Context, tenantID, module string) bool {
	modules, err := s.TenantEnabledModules(ctx, tenantID)
	if err != nil {
		return false
	}
	return schooldomain.HasModule(modules, strings.TrimSpace(module))
}

func (s *Store) UpdateTenantEnabledModules(ctx context.Context, tenantID string, modules []string) ([]string, error) {
	if len(modules) == 0 {
		modules = schooldomain.DefaultEnabledModules()
	}
	raw, err := json.Marshal(modules)
	if err != nil {
		return nil, err
	}
	_, err = s.db.ExecContext(ctx, `
UPDATE tenants
SET enabled_modules = $2::jsonb, updated_at = now()
WHERE id = $1 AND deleted_at IS NULL`, tenantID, string(raw))
	if err != nil {
		return nil, err
	}
	return modules, nil
}
