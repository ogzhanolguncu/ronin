package main

import (
	"context"
	"database/sql"
	"fmt"
	"log/slog"
	"math/rand"
	"net/url"

	"github.com/ogzhanolguncu/ronin/store"
)

type bookmarkTemplate struct {
	url         string
	title       string
	description string
	notes       string
	tags        string
}

var seedTemplates = []bookmarkTemplate{
	{"https://go.dev/blog/go1.22", "Go 1.22 Release Notes", "Overview of changes in Go 1.22", "Check the new range-over-func feature", "go programming"},
	{"https://pkg.go.dev/net/http", "net/http - Go Packages", "HTTP client and server implementations", "", "go stdlib"},
	{"https://jvns.ca/blog/2024/go-errors", "Errors in Go: A Practical Guide", "Julia Evans on Go error handling patterns", "Great diagrams", "go programming errors"},
	{"https://react.dev/learn", "React Learn", "Official React tutorial and docs", "Start here for React basics", "javascript react web"},
	{"https://developer.mozilla.org/en-US/docs/Web/JavaScript", "MDN JavaScript Docs", "Comprehensive JavaScript reference", "", "javascript web reference"},
	{"https://tailwindcss.com/docs/installation", "Tailwind CSS Installation", "Get started with Tailwind CSS", "Use the Vite plugin", "css web frontend"},
	{"https://htmx.org/docs", "htmx Documentation", "htmx gives you access to AJAX and more in HTML", "Lightweight alternative to SPA frameworks", "web htmx frontend"},
	{"https://docs.docker.com/get-started", "Docker Get Started", "Docker official getting started guide", "", "devops docker containers"},
	{"https://kubernetes.io/docs/tutorials", "Kubernetes Tutorials", "Learn Kubernetes basics", "Start with the deployment tutorial", "devops kubernetes containers"},
	{"https://github.com/containerd/nerdctl", "nerdctl - Docker-compatible CLI for containerd", "Drop-in replacement for docker CLI", "", "devops docker containers"},
	{"https://www.postgresql.org/docs/16/index.html", "PostgreSQL 16 Documentation", "Official PostgreSQL docs", "Check partitioning chapter", "database postgresql"},
	{"https://www.sqlite.org/wal.html", "SQLite WAL Mode", "Write-Ahead Logging in SQLite", "Essential for concurrent readers", "database sqlite"},
	{"https://redis.io/docs/getting-started", "Redis Getting Started", "Introduction to Redis data structures", "", "database redis"},
	{"https://owasp.org/www-project-top-ten", "OWASP Top Ten", "Top 10 web application security risks", "Review annually", "security web"},
	{"https://cheatsheetseries.owasp.org", "OWASP Cheat Sheet Series", "Security cheat sheets for developers", "", "security reference"},
	{"https://blog.cloudflare.com/http3-the-past-present-and-future", "HTTP/3 Deep Dive - Cloudflare", "Cloudflare blog on HTTP/3 and QUIC", "Good protocol comparison", "networking web"},
	{"https://nats.io/about", "NATS Messaging", "Cloud native messaging system", "Consider for microservices", "messaging distributed-systems"},
	{"https://grpc.io/docs/languages/go", "gRPC Go Quick Start", "Getting started with gRPC in Go", "", "go grpc api"},
	{"https://echo.labstack.com/docs", "Echo Framework Docs", "High performance Go web framework", "Good middleware support", "go web framework"},
	{"https://sqlc.dev", "sqlc - Generate type-safe Go from SQL", "Compile SQL to type-safe Go code", "Better than ORMs for complex queries", "go database tools"},
	{"https://turso.tech/blog/libsql-manifesto", "libSQL Manifesto", "Fork of SQLite for server use cases", "", "database sqlite"},
	{"https://testing.googleblog.com/2024/mocking", "Testing on the Toilet: Mocking Best Practices", "Google testing blog on mocking strategies", "Prefer fakes over mocks", "testing best-practices"},
	{"https://martinfowler.com/articles/microservices.html", "Microservices - Martin Fowler", "Defining the microservices architecture", "", "architecture distributed-systems"},
	{"https://fly.io/blog/all-in-on-sqlite", "All-in on SQLite - Fly.io", "Why Fly.io went all-in on SQLite", "Interesting production SQLite story", "database sqlite devops"},
	{"https://github.com/charmbracelet/bubbletea", "Bubble Tea - TUI Framework", "A Go framework for terminal user interfaces", "Fun to build with", "go tui tools"},
	{"https://github.com/junegunn/fzf", "fzf - Fuzzy Finder", "General-purpose command-line fuzzy finder", "", "tools cli productivity"},
	{"https://neovim.io/doc/user", "Neovim Documentation", "Neovim user manual", "", "tools editor"},
	{"https://github.com/BurntSushi/ripgrep", "ripgrep - Fast Search Tool", "Recursively search directories for a regex", "Faster than grep", "tools cli"},
	{"https://arxiv.org/abs/2303.08774", "GPT-4 Technical Report", "OpenAI GPT-4 paper", "Read the limitations section", "ai ml papers"},
	{"https://simonwillison.net/2024/llm-cli", "LLM CLI Tool - Simon Willison", "Command-line tool for working with LLMs", "", "ai tools cli"},
	{"https://prometheus.io/docs/introduction", "Prometheus Documentation", "Monitoring and alerting toolkit", "", "devops monitoring observability"},
	{"https://grafana.com/docs/grafana/latest", "Grafana Documentation", "Open source analytics and monitoring", "Pair with Prometheus", "devops monitoring observability"},
	{"https://opentelemetry.io/docs/go", "OpenTelemetry Go", "Observability framework for Go", "", "go observability devops"},
	{"https://github.com/golang-migrate/migrate", "golang-migrate", "Database migrations in Go", "Supports many databases", "go database tools"},
	{"https://blog.pragmaticengineer.com/system-design-interview", "System Design Interview Guide", "Pragmatic Engineer on system design interviews", "", "architecture career"},
	{"https://wizardzines.com/zines/dns", "How DNS Works - Wizard Zines", "Visual guide to DNS", "Great for quick reference", "networking reference"},
	{"https://refactoring.guru/design-patterns", "Design Patterns - Refactoring Guru", "Illustrated design patterns catalog", "Good Gang of Four refresher", "design patterns architecture"},
	{"https://lawsofux.com", "Laws of UX", "Collection of UX design principles", "", "design ux frontend"},
	{"https://designsystems.com", "Design Systems Handbook", "Guide to building design systems", "", "design-systems frontend"},
	{"https://github.com/donnemartin/system-design-primer", "System Design Primer", "Learn how to design large-scale systems", "", "design distributed-systems architecture"},
	{"https://github.com/practical-tutorials/project-based-learning", "Project Based Learning", "Curated list of project-based tutorials", "", "developer-tools learning"},
	{"https://devenv.sh", "devenv - Developer Environments", "Fast reproducible developer environments", "", "developer-tools devops nix"},
	{"https://devdocs.io", "DevDocs API Documentation", "Unified API documentation browser", "", "developer-tools reference documentation"},
	{"https://datasette.io", "Datasette", "Explore and publish data with SQLite", "Great for data exploration", "data sqlite tools"},
	{"https://github.com/apache/arrow", "Apache Arrow", "Cross-language columnar data format", "", "data data-structures"},
	{"https://the-algorithms.com", "The Algorithms", "Open source algorithm implementations", "", "data-structures algorithms learning"},
}

func seedBookmarks(ctx context.Context, s *store.Store, count int) error {
	rng := rand.New(rand.NewSource(42))
	n := len(seedTemplates)

	return store.WithTx(ctx, s.DB.DB, func(tx *sql.Tx) error {
		for i := range count {
			t := seedTemplates[i%n]

			url := fmt.Sprintf("%s?ref=%d", t.url, i)

			archived := 0
			if rng.Intn(5) == 0 {
				archived = 1
			}
			read := 0
			if rng.Intn(3) == 0 {
				read = 1
			}

			res, err := tx.ExecContext(ctx,
				`INSERT INTO bookmark (url, title, description, notes, archived, read)
				 VALUES (?, ?, ?, ?, ?, ?)`,
				url, t.title, t.description, t.notes, archived, read,
			)
			if err != nil {
				return fmt.Errorf("insert bookmark %d: %w", i, err)
			}

			bookmarkID, err := res.LastInsertId()
			if err != nil {
				return fmt.Errorf("last insert id %d: %w", i, err)
			}

			if t.tags != "" {
				if err := store.UpsertTagsAndLink(ctx, tx, bookmarkID, t.tags); err != nil {
					return fmt.Errorf("tags for bookmark %d: %w", i, err)
				}
			}

			if (i+1)%100 == 0 {
				slog.Info("seed progress", "inserted", i+1, "total", count)
			}
		}

		// Seed favicons for unique domains
		seen := make(map[string]bool)
		// Minimal 1x1 pixel PNG
		pixel := []byte{
			0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
			0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
			0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xde, 0x00, 0x00, 0x00,
			0x0c, 0x49, 0x44, 0x41, 0x54, 0x08, 0xd7, 0x63, 0xf8, 0xcf, 0xc0, 0x00,
			0x00, 0x00, 0x02, 0x00, 0x01, 0xe2, 0x21, 0xbc, 0x33, 0x00, 0x00, 0x00,
			0x00, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
		}
		for _, t := range seedTemplates {
			parsed, err := url.Parse(t.url)
			if err != nil {
				continue
			}
			domain := parsed.Hostname()
			if seen[domain] {
				continue
			}
			seen[domain] = true
			if _, err := tx.ExecContext(ctx,
				`INSERT OR IGNORE INTO favicon (domain, data, content_type) VALUES (?, ?, ?)`,
				domain, pixel, "image/png",
			); err != nil {
				return fmt.Errorf("favicon for %s: %w", domain, err)
			}
		}

		return nil
	})
}
