#!/usr/bin/env bash
# mobile.ogtasis.com DNS kaydi olustuktan sonra SSL sertifikasini genisletir.
set -euo pipefail

HOST="${OTS_PROD_HOST:-188.132.234.29}"
USER="${OTS_PROD_USER:-root}"
TARGET="${OTS_PROD_PATH:-/opt/ots}"
SSL_EMAIL="${SSL_EMAIL:-billing@ogta.ai}"

echo ">> DNS kontrolu..."
if ! dig +short mobile.ogtasis.com A | grep -q .; then
  echo "HATA: mobile.ogtasis.com icin A kaydi bulunamadi."
  echo "Turhost DNS panelinde su kaydi ekleyin:"
  echo "  Tip: A   Host: mobile   Deger: ${HOST}"
  exit 1
fi

ssh -o BatchMode=yes "${USER}@${HOST}" bash -s <<EOF
set -e
cd ${TARGET}/deploy
docker compose -f docker-compose.prod.yml run --rm --entrypoint certbot certbot \\
  certonly --webroot -w /var/www/certbot \\
  -d ogtasis.com -d www.ogtasis.com -d panel.ogtasis.com -d mobile.ogtasis.com \\
  --email ${SSL_EMAIL} --agree-tos --no-eff-email --non-interactive --expand
docker compose -f docker-compose.prod.yml restart edge
sleep 2
curl -sI https://mobile.ogtasis.com/login | head -5
EOF

echo "OK: https://mobile.ogtasis.com/"
