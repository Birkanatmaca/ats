set -eu

psql -v ON_ERROR_STOP=1 <<'SQL'
CREATE TABLE IF NOT EXISTS schema_migrations (
  version TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF to_regclass('public.audit_logs') IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM schema_migrations WHERE version = '000001_initial_schema.sql')
  THEN
    INSERT INTO schema_migrations(version) VALUES ('000001_initial_schema.sql');
  END IF;
END $$;
SQL

for migration in /migrations/*.sql; do
  version="$(basename "$migration")"
  applied="$(psql -tAc "SELECT 1 FROM schema_migrations WHERE version = '$version'" | tr -d '[:space:]')"
  if [ "$applied" = "1" ]; then
    echo "$version already applied"
    continue
  fi

  echo "applying $version"
  psql -v ON_ERROR_STOP=1 -f "$migration"
  psql -v ON_ERROR_STOP=1 -c "INSERT INTO schema_migrations(version) VALUES ('$version')"
done
