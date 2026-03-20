.PHONY: dev run build web preview

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

