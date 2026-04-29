.PHONY: help dev run build web preview prod prod-dev seed ext-dev ext-preview ext-build fmt

VERSION    ?= $(shell git describe --tags --always --dirty 2>/dev/null || echo "dev")
COMMIT     ?= $(shell git rev-parse --short HEAD 2>/dev/null || echo "unknown")
BUILD_TIME ?= $(shell date -u +"%Y-%m-%dT%H:%M:%SZ")
LDFLAGS    := -X main.version=$(VERSION) -X main.commit=$(COMMIT) -X main.buildTime=$(BUILD_TIME)

LOAD_ENV  = set -a && . ./.env && set +a
BUILD_WEB = cd web && pnpm build
BUILD_GO  = go build -ldflags "$(LDFLAGS)" -o ronin .

help: ## Show available targets
	@grep -E '^[a-zA-Z_-]+:.*##' $(MAKEFILE_LIST) | awk -F ':.*## ' '{printf "  %-15s %s\n", $$1, $$2}'

dev: ## Run backend + frontend + extension in dev mode
	$(MAKE) -j3 dev-backend dev-frontend ext-dev

dev-backend:
	DEV=1 go run .

dev-frontend:
	cd web && pnpm dev

run: ## Run backend with .env
	$(LOAD_ENV) && go run .

preview: ## Build frontend, then run backend with browser
	$(BUILD_WEB)
	sleep 1 && open http://localhost:8080 &
	$(LOAD_ENV) && go run .

prod: ## Production build and run
	$(BUILD_WEB)
	$(BUILD_GO)
	$(LOAD_ENV) && ./ronin

prod-dev: ## Production build with dev settings
	$(BUILD_WEB)
	$(BUILD_GO)
	PASSPHRASE=dev INSECURE_COOKIE=1 ./ronin

seed: ## Seed database with 100 entries
	DEV=1 go run . -seed 100

ext-dev:
	cd web && pnpm ext:dev --port 5174

ext-preview: ## Preview extension UI in browser (no backend needed)
	sleep 1 && open http://localhost:5174/popup.html && open http://localhost:5174/settings.html &
	cd web && pnpm ext:dev --port 5174

ext-build: ## Build browser extension
	cd web && pnpm ext:build

fmt: ## Format Go and frontend code
	gofmt -w .
	cd web && pnpm fmt
