.PHONY: dev run build web preview prod seed

VERSION ?= $(shell git describe --tags --always --dirty 2>/dev/null || echo "dev")
COMMIT  ?= $(shell git rev-parse --short HEAD 2>/dev/null || echo "unknown")
BUILD_TIME ?= $(shell date -u +"%Y-%m-%dT%H:%M:%SZ")
LDFLAGS := -X main.version=$(VERSION) -X main.commit=$(COMMIT) -X main.buildTime=$(BUILD_TIME)

dev:
	$(MAKE) -j2 dev-backend dev-frontend

dev-backend:
	DEV=1 go run .

dev-frontend:
	cd web && pnpm dev

run:
	set -a && . ./.env && set +a && go run .

preview:
	cd web && pnpm build
	sleep 1 && open http://localhost:8080 &
	set -a && . ./.env && set +a && go run .

prod:
	cd web && pnpm build
	CGO_ENABLED=1 go build -ldflags "$(LDFLAGS)" -o ronin .
	set -a && . ./.env && set +a && ./ronin

seed:
	DEV=1 go run . -seed 100
