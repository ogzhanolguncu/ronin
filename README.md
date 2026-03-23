# Ronin

A self-hosted bookmark manager. Single binary, SQLite storage, React frontend embedded at compile time.

## Features

- **Collections** — group bookmarks with colored labels
- **Tags** — flexible tagging with counts
- **Full-text search** — SQLite FTS5 with highlighted results
- **Snapshots** — offline page archives via [monolith](https://github.com/Y2Z/monolith)
- **Reader mode** — extracted article content with clean styling
- **Favicons** — automatic domain favicon fetching and caching
- **Wayback Machine** — bookmarks are auto-submitted to the Internet Archive
- **Passphrase auth** — simple session-based authentication

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Go, `net/http`, sqlx |
| Database | SQLite (WAL mode, FTS5) |
| Frontend | React 19, TypeScript, TanStack Query |
| Styling | TailwindCSS 4 |
| Build | Vite, `go:embed` |

Ships as a single binary with the frontend embedded.

## Quick Start

```bash
git clone https://github.com/ogzhanolguncu/ronin.git
cd ronin
cp .env.example .env
# Edit .env and set PASSPHRASE

# Development (Go backend + Vite dev server)
make dev

# Production build and run
make prod
```

The app runs at `http://localhost:8080`.

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `PASSPHRASE` | Yes (prod) | Passphrase users enter to log in |
| `DEV` | No | Set to `1` to bypass auth (dev mode) |
| `INSECURE_COOKIE` | No | Set to `1` to allow cookies over plain HTTP |
| `DATA_DIR` | No | Asset storage directory (default: `./data`) |

## Project Structure

```
ronin/
  handler/        HTTP handlers, middleware, routing
  store/          SQLite schema, migrations, query helpers
  model/          Domain types (Bookmark, Collection, Tag)
  metadata/       URL metadata and favicon extraction
  httputil/       JSON response helpers, error types
  web/
    src/
      components/ React components
      lib/        API client, queries, types, utilities
  main.go         Entry point, config, graceful shutdown
  seed.go         Test data seeding
```

## API

All endpoints are prefixed with `/api/v1/`. Protected routes require a valid session cookie.

### Bookmarks

| Method | Path | Description |
|--------|------|-------------|
| GET | `/bookmarks` | List bookmarks (pagination, filters, search via `?q=`) |
| GET | `/bookmarks/{id}` | Get bookmark |
| GET | `/bookmarks/counts` | Counts by status (all, favorites, unread, archived) |
| POST | `/bookmarks` | Create bookmark |
| PUT | `/bookmarks/{id}` | Update bookmark |
| DELETE | `/bookmarks/{id}` | Delete bookmark |
| DELETE | `/bookmarks` | Bulk delete |
| PATCH | `/bookmarks/archive` | Bulk archive toggle |
| PATCH | `/bookmarks/read` | Bulk read toggle |
| PATCH | `/bookmarks/favorite` | Bulk favorite toggle |

### Collections

| Method | Path | Description |
|--------|------|-------------|
| GET | `/collections` | List collections |
| GET | `/collections/{id}` | Get collection |
| POST | `/collections` | Create collection |
| PUT | `/collections/{id}` | Update collection |
| DELETE | `/collections/{id}` | Delete collection |

### Tags

| Method | Path | Description |
|--------|------|-------------|
| GET | `/tags` | List tags with counts |

### Assets

| Method | Path | Description |
|--------|------|-------------|
| GET | `/assets/{id}` | Get page snapshot (gzipped HTML) |
| GET | `/assets/{id}/readable` | Get reader mode content |
| GET | `/assets/{id}/status` | Check generation status |
| POST | `/assets/{id}/regenerate` | Regenerate assets |

### Other

| Method | Path | Description |
|--------|------|-------------|
| POST | `/auth/login` | Login with passphrase |
| POST | `/auth/logout` | Logout |
| GET | `/metadata?url=` | Fetch URL metadata |
| GET | `/favicons/{domain}` | Get cached favicon |
| GET | `/healthz` | Health check with version info |

## Development

| Command | Description |
|---------|-------------|
| `make dev` | Run backend + frontend dev servers |
| `make run` | Run backend with `.env` config |
| `make preview` | Build frontend, open browser, run backend |
| `make prod` | Build optimized binary and run |
| `make seed` | Seed database with 100 test bookmarks |

## Build

```bash
make prod
```

The production build injects version info via ldflags:

```bash
CGO_ENABLED=1 go build -ldflags "-X main.version=... -X main.commit=... -X main.buildTime=..." -o ronin .
```

Snapshot generation requires [monolith](https://github.com/Y2Z/monolith) to be installed and available in `$PATH`.
