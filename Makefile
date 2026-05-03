BACKEND_DIR=backend
WEB_DIR=frontend/apps/web

.PHONY: backend-dev backend-test backend-build web-dev web-build postgres-up postgres-down

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

