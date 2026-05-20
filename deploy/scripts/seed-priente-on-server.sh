#!/usr/bin/env bash
# Sunucuda çalıştırın (SSH ile bağlandıktan sonra):
#   cd /opt/ots && bash deploy/scripts/seed-priente-on-server.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
SQL="${ROOT}/backend/migrations/000006_priente_test_school.sql"
VERSION="000006_priente_test_school.sql"

if [ ! -f "$SQL" ]; then
  echo "SQL dosyasi bulunamadi: $SQL" >&2
  exit 1
fi

echo ">> Seed uygulaniyor: $VERSION"
docker exec -i ots_postgres psql -v ON_ERROR_STOP=1 -U ots -d ots < "$SQL"

docker exec -i ots_postgres psql -v ON_ERROR_STOP=1 -U ots -d ots <<EOSQL
INSERT INTO schema_migrations(version)
VALUES ('$VERSION')
ON CONFLICT (version) DO NOTHING;
EOSQL

echo ">> Ozet"
docker exec ots_postgres psql -U ots -d ots -c "
SELECT t.name,
       (SELECT count(*) FROM students s WHERE s.tenant_id = t.id) AS students,
       (SELECT count(*) FROM classes c WHERE c.tenant_id = t.id) AS classes,
       (SELECT count(*) FROM teachers te WHERE te.tenant_id = t.id) AS teachers
FROM tenants t
WHERE t.id = '00000000-0000-0000-0000-000000020001';
"

echo "OK. Giris bilgileri: PRIENTE_TEST_CREDENTIALS.txt"
