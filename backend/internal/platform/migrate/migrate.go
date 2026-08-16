package migrate

import (
	"context"
	"fmt"
	"io/fs"
	"log/slog"
	"sort"

	"github.com/jackc/pgx/v5"

	"ots/backend/migrations"
)

func Apply(ctx context.Context, databaseURL string, logger *slog.Logger) (int, error) {
	if logger == nil {
		logger = slog.Default()
	}

	cfg, err := pgx.ParseConfig(databaseURL)
	if err != nil {
		return 0, fmt.Errorf("parse database url: %w", err)
	}
	cfg.DefaultQueryExecMode = pgx.QueryExecModeSimpleProtocol

	conn, err := pgx.ConnectConfig(ctx, cfg)
	if err != nil {
		return 0, fmt.Errorf("connect: %w", err)
	}
	defer conn.Close(ctx)

	if _, err := conn.Exec(ctx, `
CREATE TABLE IF NOT EXISTS schema_migrations (
  version TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
)`); err != nil {
		return 0, fmt.Errorf("schema_migrations: %w", err)
	}

	files, err := fs.Glob(migrations.FS, "*.sql")
	if err != nil {
		return 0, err
	}
	sort.Strings(files)
	if len(files) == 0 {
		return 0, fmt.Errorf("no migration files embedded")
	}

	if err := recoverUntracked(ctx, conn, files); err != nil {
		return 0, err
	}

	applied := 0
	for _, name := range files {
		var exists int
		err := conn.QueryRow(ctx, `SELECT 1 FROM schema_migrations WHERE version = $1`, name).Scan(&exists)
		if err == nil {
			continue
		}
		if err != pgx.ErrNoRows {
			return applied, fmt.Errorf("check %s: %w", name, err)
		}

		body, err := migrations.FS.ReadFile(name)
		if err != nil {
			return applied, err
		}

		logger.Info("applying migration", slog.String("version", name))
		if _, err := conn.Exec(ctx, string(body)); err != nil {
			return applied, fmt.Errorf("apply %s: %w", name, err)
		}
		if _, err := conn.Exec(ctx, `INSERT INTO schema_migrations(version) VALUES ($1)`, name); err != nil {
			return applied, fmt.Errorf("record %s: %w", name, err)
		}
		applied++
	}
	return applied, nil
}

func recoverUntracked(ctx context.Context, conn *pgx.Conn, files []string) error {
	var count int
	if err := conn.QueryRow(ctx, `SELECT COUNT(*) FROM schema_migrations`).Scan(&count); err != nil {
		return err
	}
	if count > 0 {
		return nil
	}

	hasHomework, err := tableExists(ctx, conn, "homework_assignments")
	if err != nil {
		return err
	}
	if hasHomework {
		for _, name := range files {
			if _, err := conn.Exec(ctx, `INSERT INTO schema_migrations(version) VALUES ($1) ON CONFLICT DO NOTHING`, name); err != nil {
				return err
			}
		}
		return nil
	}

	hasAudit, err := tableExists(ctx, conn, "audit_logs")
	if err != nil {
		return err
	}
	if hasAudit && len(files) > 0 {
		_, err = conn.Exec(ctx, `INSERT INTO schema_migrations(version) VALUES ($1) ON CONFLICT DO NOTHING`, files[0])
		return err
	}
	return nil
}

func tableExists(ctx context.Context, conn *pgx.Conn, name string) (bool, error) {
	var exists int
	err := conn.QueryRow(ctx, `
SELECT 1
FROM information_schema.tables
WHERE table_schema = 'public' AND table_name = $1
`, name).Scan(&exists)
	if err == pgx.ErrNoRows {
		return false, nil
	}
	if err != nil {
		return false, err
	}
	return true, nil
}
