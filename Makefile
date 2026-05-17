BACKEND_DIR=backend
WEB_DIR=frontend/apps/web

.PHONY: backend-dev backend-test backend-build web-dev web-build postgres-up postgres-down prod-deploy

backend-dev:
	cd $(BACKEND_DIR) && go run ./cmd/api

backend-test:
	cd $(BACKEND_DIR) && go test ./...

backend-build:
	cd $(BACKEND_DIR) && go build ./cmd/api

web-dev:
	cd $(WEB_DIR) && npm run dev

web-build:
	cd $(WEB_DIR) && npm run build

postgres-up:
	docker compose up -d postgres

postgres-down:
	docker compose down

# Canlı sunucu: SSH anahtarı ile root@OTS_PROD_HOST (varsayılan 188.132.234.29) /opt/ots
prod-deploy:
	bash deploy/scripts/push-prod.sh

