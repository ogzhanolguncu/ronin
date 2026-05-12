.PHONY: help dev run build web preview prod prod-dev seed ext-dev ext-preview ext-build fmt deploy-build deploy-bootstrap deploy deploy-logs deploy-status

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

# --- Deployment (Tailscale + systemd on Ubuntu 24.04) ---
DEPLOY_HOST ?=
DEPLOY_ARCH ?= amd64
SSH          = ssh $(DEPLOY_HOST)
SCP          = scp
REQUIRE_HOST = @test -n "$(DEPLOY_HOST)" || (echo "DEPLOY_HOST=user@host required" && exit 1)

deploy-build: ## Cross-compile linux binary (DEPLOY_ARCH=amd64|arm64)
	$(BUILD_WEB)
	GOOS=linux GOARCH=$(DEPLOY_ARCH) CGO_ENABLED=0 go build -ldflags "$(LDFLAGS)" -o ronin-linux-$(DEPLOY_ARCH) .

deploy-bootstrap: ## One-time server setup (installs monolith, tailscale, systemd unit)
	$(REQUIRE_HOST)
	$(SCP) deploy/bootstrap.sh deploy/ronin.service $(DEPLOY_HOST):/tmp/
	$(SSH) "sudo bash /tmp/bootstrap.sh"

deploy: deploy-build ## Build, upload, restart ronin (DEPLOY_HOST=user@host)
	$(REQUIRE_HOST)
	$(SCP) ronin-linux-$(DEPLOY_ARCH) $(DEPLOY_HOST):/tmp/ronin.new
	$(SSH) "sudo install -o root -g root -m 0755 /tmp/ronin.new /usr/local/bin/ronin && sudo systemctl restart ronin && rm /tmp/ronin.new"

deploy-logs: ## Tail ronin logs on remote
	$(REQUIRE_HOST)
	$(SSH) "sudo journalctl -u ronin -f -n 100"

deploy-status: ## Show ronin + tailscale status on remote
	$(REQUIRE_HOST)
	$(SSH) "sudo systemctl status ronin --no-pager; echo; tailscale status; echo; sudo tailscale serve status"
