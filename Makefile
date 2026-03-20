.PHONY: dev run build web preview

dev:
	DEV=1 go run .

run:
	set -a && . ./.env && set +a && go run .

build:
	cd web && pnpm build
	go build -o ronin .

web:
	cd web && pnpm dev

preview:
	cd web && pnpm build
	sleep 1 && open http://localhost:8080 &
	set -a && . ./.env && set +a && go run .

