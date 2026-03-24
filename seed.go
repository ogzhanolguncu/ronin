package main

import (
	"context"
	"database/sql"
	"fmt"
	"io"
	"log/slog"
	"math/rand"
	"net/http"
	"net/url"
	"sync"

	"github.com/ogzhanolguncu/ronin/metadata"
	"github.com/ogzhanolguncu/ronin/store"
)

const maxFaviconBytes = 10 * 1024 // 10KB

type collectionTemplate struct {
	name    string
	slug    string
	colorID int
}

var seedCollections = []collectionTemplate{
	{"Programming", "programming", 1},
	{"DevOps", "devops", 2},
	{"Databases", "databases", 3},
	{"Security", "security", 4},
	{"Tools", "tools", 5},
	{"Design", "design", 6},
	{"AI & ML", "ai-ml", 7},
	{"Learning", "learning", 8},
}

type bookmarkTemplate struct {
	url         string
	title       string
	description string
	notes       string
	tags        string
	collection  string
}

var seedTemplates = []bookmarkTemplate{
	// Programming - Go
	{"https://go.dev/blog/go1.22", "Go 1.22 Release Notes", "Overview of changes in Go 1.22", "Check the new range-over-func feature", "go programming", "programming"},
	{"https://pkg.go.dev/net/http", "net/http - Go Packages", "HTTP client and server implementations", "", "go stdlib", "programming"},
	{"https://go.dev/doc/effective_go", "Effective Go", "Official guide to writing clear, idiomatic Go code", "", "go best-practices", "programming"},
	{"https://go.dev/blog/using-go-modules", "Using Go Modules", "Official guide to Go module system", "", "go modules", "programming"},
	{"https://gobyexample.com", "Go by Example", "Hands-on introduction to Go using annotated example programs", "Great quick reference", "go learning", "programming"},
	{"https://github.com/golang/go/wiki/CodeReviewComments", "Go Code Review Comments", "Common Go code review feedback", "", "go best-practices", "programming"},
	{"https://echo.labstack.com/docs", "Echo Framework Docs", "High performance Go web framework", "Good middleware support", "go web framework", "programming"},
	{"https://grpc.io/docs/languages/go", "gRPC Go Quick Start", "Getting started with gRPC in Go", "", "go grpc api", "programming"},
	{"https://github.com/uber-go/zap", "Zap Logger", "Blazing fast structured leveled logging in Go", "", "go logging", "programming"},
	{"https://github.com/stretchr/testify", "Testify - Go Testing Toolkit", "Toolkit with common assertions and mocks for Go tests", "", "go testing", "programming"},

	// Programming - JavaScript/TypeScript/Web
	{"https://react.dev/learn", "React Learn", "Official React tutorial and docs", "Start here for React basics", "javascript react web", "programming"},
	{"https://developer.mozilla.org/en-US/docs/Web/JavaScript", "MDN JavaScript Docs", "Comprehensive JavaScript reference", "", "javascript web reference", "programming"},
	{"https://www.typescriptlang.org/docs/handbook", "TypeScript Handbook", "Official TypeScript documentation and guide", "", "typescript javascript", "programming"},
	{"https://htmx.org/docs", "htmx Documentation", "htmx gives you access to AJAX and more in HTML", "Lightweight alternative to SPA frameworks", "web htmx frontend", "programming"},
	{"https://nextjs.org/docs", "Next.js Documentation", "The React framework for production", "", "react nextjs web", "programming"},
	{"https://svelte.dev/docs/introduction", "Svelte Documentation", "Cybernetically enhanced web apps", "", "svelte javascript web", "programming"},
	{"https://vuejs.org/guide/introduction", "Vue.js Guide", "The progressive JavaScript framework", "", "vue javascript web", "programming"},
	{"https://astro.build/docs", "Astro Documentation", "The web framework for content-driven websites", "", "astro web framework", "programming"},
	{"https://tanstack.com/query/latest", "TanStack Query", "Powerful async state management for TS/JS", "", "react typescript data-fetching", "programming"},
	{"https://zod.dev", "Zod - TypeScript Schema Validation", "TypeScript-first schema declaration and validation library", "", "typescript validation", "programming"},

	// Programming - General
	{"https://blog.cloudflare.com/http3-the-past-present-and-future", "HTTP/3 Deep Dive - Cloudflare", "Cloudflare blog on HTTP/3 and QUIC", "Good protocol comparison", "networking web", "programming"},
	{"https://testing.googleblog.com/2024/04/isbooleantoolongforamethod.html", "Google Testing Blog - Method Naming", "Google testing blog on naming strategies", "", "testing best-practices", "programming"},
	{"https://github.com/golang-jwt/jwt", "golang-jwt", "Go implementation of JSON Web Tokens", "", "go security jwt", "programming"},
	{"https://hono.dev/docs", "Hono - Web Framework", "Ultrafast web framework for the edge", "", "javascript web framework", "programming"},
	{"https://bun.sh/docs", "Bun Documentation", "Incredibly fast JavaScript runtime, bundler, and package manager", "", "javascript runtime tools", "programming"},
	{"https://deno.land/manual", "Deno Manual", "A modern runtime for JavaScript and TypeScript", "", "javascript typescript runtime", "programming"},

	// DevOps
	{"https://docs.docker.com/get-started", "Docker Get Started", "Docker official getting started guide", "", "devops docker containers", "devops"},
	{"https://kubernetes.io/docs/tutorials", "Kubernetes Tutorials", "Learn Kubernetes basics", "Start with the deployment tutorial", "devops kubernetes containers", "devops"},
	{"https://github.com/containerd/nerdctl", "nerdctl - Docker-compatible CLI", "Drop-in replacement for docker CLI", "", "devops docker containers", "devops"},
	{"https://nats.io/about", "NATS Messaging", "Cloud native messaging system", "Consider for microservices", "messaging distributed-systems", "devops"},
	{"https://prometheus.io/docs/introduction/overview", "Prometheus Documentation", "Monitoring and alerting toolkit", "", "devops monitoring observability", "devops"},
	{"https://grafana.com/docs/grafana/latest", "Grafana Documentation", "Open source analytics and monitoring", "Pair with Prometheus", "devops monitoring observability", "devops"},
	{"https://opentelemetry.io/docs/languages/go", "OpenTelemetry Go", "Observability framework for Go", "", "go observability devops", "devops"},
	{"https://devenv.sh", "devenv - Developer Environments", "Fast reproducible developer environments", "", "developer-tools devops nix", "devops"},
	{"https://www.terraform.io/docs", "Terraform Documentation", "Infrastructure as code tool by HashiCorp", "", "devops infrastructure iac", "devops"},
	{"https://www.ansible.com/overview/how-ansible-works", "Ansible - How It Works", "Simple IT automation platform", "", "devops automation", "devops"},
	{"https://argoproj.github.io/cd", "Argo CD", "Declarative GitOps continuous delivery for Kubernetes", "", "devops kubernetes gitops", "devops"},
	{"https://nixos.org/manual/nix/stable", "Nix Manual", "The purely functional package manager", "", "nix devops", "devops"},
	{"https://caddyserver.com/docs", "Caddy Documentation", "Fast multi-platform web server with automatic HTTPS", "", "devops web-server", "devops"},
	{"https://traefik.io/traefik", "Traefik Proxy", "Cloud-native application proxy", "", "devops proxy networking", "devops"},

	// Databases
	{"https://www.postgresql.org/docs/16/index.html", "PostgreSQL 16 Documentation", "Official PostgreSQL docs", "Check partitioning chapter", "database postgresql", "databases"},
	{"https://www.sqlite.org/wal.html", "SQLite WAL Mode", "Write-Ahead Logging in SQLite", "Essential for concurrent readers", "database sqlite", "databases"},
	{"https://redis.io/docs/getting-started", "Redis Getting Started", "Introduction to Redis data structures", "", "database redis", "databases"},
	{"https://sqlc.dev", "sqlc - Type-safe Go from SQL", "Compile SQL to type-safe Go code", "Better than ORMs for complex queries", "go database tools", "databases"},
	{"https://turso.tech/blog/introducing-libsql", "libSQL - Turso", "Fork of SQLite for server use cases", "", "database sqlite", "databases"},
	{"https://fly.io/blog/all-in-on-sqlite-litestream", "All-in on SQLite - Fly.io", "Why Fly.io went all-in on SQLite", "Interesting production SQLite story", "database sqlite devops", "databases"},
	{"https://github.com/golang-migrate/migrate", "golang-migrate", "Database migrations in Go", "Supports many databases", "go database tools", "databases"},
	{"https://datasette.io", "Datasette", "Explore and publish data with SQLite", "Great for data exploration", "data sqlite tools", "databases"},
	{"https://github.com/apache/arrow", "Apache Arrow", "Cross-language columnar data format", "", "data data-structures", "databases"},
	{"https://clickhouse.com/docs", "ClickHouse Documentation", "Open-source column-oriented DBMS", "", "database analytics", "databases"},
	{"https://www.mongodb.com/docs/manual", "MongoDB Manual", "Document-oriented NoSQL database", "", "database nosql", "databases"},
	{"https://neon.tech/docs/introduction", "Neon - Serverless Postgres", "Serverless Postgres with branching", "", "database postgresql serverless", "databases"},
	{"https://planetscale.com/docs", "PlanetScale Documentation", "MySQL-compatible serverless database", "", "database mysql serverless", "databases"},
	{"https://duckdb.org/docs", "DuckDB Documentation", "In-process analytical database", "", "database analytics", "databases"},

	// Security
	{"https://owasp.org/www-project-top-ten", "OWASP Top Ten", "Top 10 web application security risks", "Review annually", "security web", "security"},
	{"https://cheatsheetseries.owasp.org", "OWASP Cheat Sheet Series", "Security cheat sheets for developers", "", "security reference", "security"},
	{"https://portswigger.net/web-security", "PortSwigger Web Security Academy", "Free online web security training", "", "security web training", "security"},
	{"https://github.com/OWASP/Go-SCP", "Go Secure Coding Practices", "OWASP Go secure coding guide", "", "go security best-practices", "security"},
	{"https://cve.mitre.org", "CVE - Common Vulnerabilities", "CVE vulnerability database", "", "security vulnerabilities", "security"},
	{"https://www.ssllabs.com/ssltest", "SSL Labs Server Test", "Free SSL/TLS server testing", "", "security ssl tls", "security"},
	{"https://github.com/FiloSottile/age", "age - File Encryption", "Simple modern file encryption tool", "", "security encryption tools", "security"},
	{"https://www.vaultproject.io/docs", "HashiCorp Vault", "Secrets management and data protection", "", "security secrets devops", "security"},

	// Tools
	{"https://github.com/charmbracelet/bubbletea", "Bubble Tea - TUI Framework", "A Go framework for terminal user interfaces", "Fun to build with", "go tui tools", "tools"},
	{"https://github.com/junegunn/fzf", "fzf - Fuzzy Finder", "General-purpose command-line fuzzy finder", "", "tools cli productivity", "tools"},
	{"https://neovim.io/doc/user", "Neovim Documentation", "Neovim user manual", "", "tools editor", "tools"},
	{"https://github.com/BurntSushi/ripgrep", "ripgrep - Fast Search Tool", "Recursively search directories for a regex", "Faster than grep", "tools cli", "tools"},
	{"https://devdocs.io", "DevDocs API Documentation", "Unified API documentation browser", "", "developer-tools reference documentation", "tools"},
	{"https://github.com/jesseduffield/lazygit", "lazygit - Git TUI", "Simple terminal UI for git commands", "", "git tools tui", "tools"},
	{"https://github.com/sharkdp/bat", "bat - Better cat", "A cat clone with syntax highlighting and git integration", "", "tools cli", "tools"},
	{"https://github.com/ajeetdsouza/zoxide", "zoxide - Smarter cd", "A smarter cd command inspired by z and autojump", "", "tools cli productivity", "tools"},
	{"https://github.com/dandavison/delta", "delta - Git Diff Viewer", "A syntax-highlighting pager for git, diff, and grep", "", "git tools cli", "tools"},
	{"https://wezfurlong.org/wezterm", "WezTerm", "GPU-accelerated cross-platform terminal emulator", "", "tools terminal", "tools"},
	{"https://starship.rs", "Starship Prompt", "Minimal blazing-fast cross-shell prompt", "", "tools shell", "tools"},
	{"https://github.com/casey/just", "just - Command Runner", "A handy way to save and run project-specific commands", "", "tools automation", "tools"},

	// Design
	{"https://tailwindcss.com/docs/installation", "Tailwind CSS Installation", "Get started with Tailwind CSS", "Use the Vite plugin", "css web frontend", "design"},
	{"https://lawsofux.com", "Laws of UX", "Collection of UX design principles", "", "design ux frontend", "design"},
	{"https://designsystems.com", "Design Systems Handbook", "Guide to building design systems", "", "design-systems frontend", "design"},
	{"https://www.radix-ui.com/primitives/docs/overview/introduction", "Radix UI Primitives", "Unstyled accessible React UI components", "", "react ui components", "design"},
	{"https://ui.shadcn.com/docs", "shadcn/ui", "Beautifully designed components built with Radix and Tailwind", "", "react ui tailwind", "design"},
	{"https://fonts.google.com", "Google Fonts", "Free open-source font library", "", "design typography web", "design"},
	{"https://coolors.co", "Coolors - Color Palette Generator", "Fast color scheme generator", "", "design colors tools", "design"},
	{"https://www.figma.com/best-practices", "Figma Best Practices", "Tips and guides for designing in Figma", "", "design figma tools", "design"},

	// AI & ML
	{"https://arxiv.org/abs/2303.08774", "GPT-4 Technical Report", "OpenAI GPT-4 paper", "Read the limitations section", "ai ml papers", "ai-ml"},
	{"https://simonwillison.net/2024/Apr/8/llm-cli", "LLM CLI Tool - Simon Willison", "Command-line tool for working with LLMs", "", "ai tools cli", "ai-ml"},
	{"https://ollama.com", "Ollama", "Run large language models locally", "", "ai llm local", "ai-ml"},
	{"https://huggingface.co/docs", "Hugging Face Documentation", "ML model hub and tools", "", "ai ml models", "ai-ml"},
	{"https://github.com/ggerganov/llama.cpp", "llama.cpp", "LLM inference in pure C/C++", "", "ai llm cpp", "ai-ml"},
	{"https://docs.anthropic.com", "Anthropic API Documentation", "Claude API reference and guides", "", "ai api claude", "ai-ml"},
	{"https://platform.openai.com/docs", "OpenAI API Docs", "OpenAI platform documentation", "", "ai api openai", "ai-ml"},
	{"https://github.com/langchain-ai/langchain", "LangChain", "Framework for developing LLM-powered applications", "", "ai llm framework", "ai-ml"},
	{"https://www.cursor.com", "Cursor - AI Code Editor", "AI-first code editor built on VS Code", "", "ai tools editor", "ai-ml"},
	{"https://mlflow.org/docs/latest/index.html", "MLflow Documentation", "Open source platform for the ML lifecycle", "", "ml mlops tools", "ai-ml"},

	// Learning
	{"https://martinfowler.com/articles/microservices.html", "Microservices - Martin Fowler", "Defining the microservices architecture", "", "architecture distributed-systems", "learning"},
	{"https://blog.pragmaticengineer.com/system-design-interview-an-insiders-guide", "System Design Interview Guide", "Pragmatic Engineer on system design interviews", "", "architecture career", "learning"},
	{"https://wizardzines.com/zines/dns", "How DNS Works - Wizard Zines", "Visual guide to DNS", "Great for quick reference", "networking reference", "learning"},
	{"https://refactoring.guru/design-patterns", "Design Patterns - Refactoring Guru", "Illustrated design patterns catalog", "Good Gang of Four refresher", "design patterns architecture", "learning"},
	{"https://github.com/donnemartin/system-design-primer", "System Design Primer", "Learn how to design large-scale systems", "", "design distributed-systems architecture", "learning"},
	{"https://github.com/practical-tutorials/project-based-learning", "Project Based Learning", "Curated list of project-based tutorials", "", "developer-tools learning", "learning"},
	{"https://the-algorithms.com", "The Algorithms", "Open source algorithm implementations", "", "data-structures algorithms learning", "learning"},
	{"https://missing.csail.mit.edu", "The Missing Semester of CS", "MIT course on practical dev tools", "", "learning tools cs", "learning"},
	{"https://teachyourselfcs.com", "Teach Yourself Computer Science", "Curated self-study guide for CS fundamentals", "", "learning cs fundamentals", "learning"},
	{"https://roadmap.sh", "Developer Roadmaps", "Community-driven roadmaps for learning paths", "", "learning career roadmap", "learning"},
	{"https://web.dev/learn", "web.dev Learn", "Google's web development learning platform", "", "web learning frontend", "learning"},
	{"https://exercism.org", "Exercism", "Code practice and mentorship for everyone", "", "learning practice coding", "learning"},
}

func seedBookmarks(ctx context.Context, s *store.Store, count int) error {
	rng := rand.New(rand.NewSource(42))
	limit := min(count, len(seedTemplates))

	// Insert bookmarks and collections inside a transaction
	err := store.WithTx(ctx, s.WriteDB, func(tx *sql.Tx) error {
		// Seed collections first
		collectionIDs := make(map[string]int64, len(seedCollections))
		for _, c := range seedCollections {
			res, err := tx.ExecContext(ctx,
				`INSERT INTO collection (name, slug, color_id) VALUES (?, ?, ?)`,
				c.name, c.slug, c.colorID,
			)
			if err != nil {
				return fmt.Errorf("insert collection %s: %w", c.slug, err)
			}
			id, _ := res.LastInsertId()
			collectionIDs[c.slug] = id
		}
		slog.Info("seed collections", "count", len(seedCollections))

		for i := range limit {
			t := seedTemplates[i]

			archived := 0
			if rng.Intn(5) == 0 {
				archived = 1
			}
			read := 0
			if rng.Intn(3) == 0 {
				read = 1
			}

			var collectionID *int64
			if t.collection != "" {
				if cid, ok := collectionIDs[t.collection]; ok {
					collectionID = &cid
				}
			}

			res, err := tx.ExecContext(ctx,
				`INSERT INTO bookmark (url, title, description, notes, archived, read, collection_id)
				 VALUES (?, ?, ?, ?, ?, ?, ?)`,
				t.url, t.title, t.description, t.notes, archived, read, collectionID,
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
				slog.Info("seed progress", "inserted", i+1, "total", limit)
			}
		}

		return nil
	})
	if err != nil {
		return err
	}

	// Fetch real favicons outside the transaction to avoid holding it open during network I/O
	seedFavicons(ctx, s, limit)

	return nil
}

func seedFavicons(ctx context.Context, s *store.Store, limit int) {
	// Collect unique domains
	seen := make(map[string]bool)
	var domains []string
	for i := range limit {
		parsed, err := url.Parse(seedTemplates[i].url)
		if err != nil {
			continue
		}
		d := parsed.Hostname()
		if !seen[d] {
			seen[d] = true
			domains = append(domains, d)
		}
	}

	slog.Info("seed favicons: fetching", "domains", len(domains))

	client := metadata.NewHTTPClient()
	var wg sync.WaitGroup
	sem := make(chan struct{}, 10) // max 10 concurrent fetches

	for _, domain := range domains {
		wg.Add(1)
		sem <- struct{}{}
		go func(domain string) {
			defer wg.Done()
			defer func() { <-sem }()

			faviconURL := fmt.Sprintf("https://www.google.com/s2/favicons?sz=32&domain=%s", domain)
			data, contentType, ok := fetchFavicon(ctx, client, faviconURL)
			if !ok {
				slog.Warn("seed favicon: fetch failed", "domain", domain)
				return
			}

			if _, err := s.WriteDB.ExecContext(ctx,
				`INSERT OR IGNORE INTO favicon (domain, data, content_type, fetched_at) VALUES (?, ?, ?, unixepoch())`,
				domain, data, contentType,
			); err != nil {
				slog.Warn("seed favicon: insert failed", "domain", domain, "err", err)
			} else {
				slog.Info("seed favicon", "domain", domain, "bytes", len(data))
			}
		}(domain)
	}

	wg.Wait()
	slog.Info("seed favicons: done")
}

func fetchFavicon(ctx context.Context, client *http.Client, faviconURL string) ([]byte, string, bool) {
	req, err := metadata.NewRequest(ctx, http.MethodGet, faviconURL)
	if err != nil {
		return nil, "", false
	}

	resp, err := client.Do(req)
	if err != nil {
		return nil, "", false
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, "", false
	}

	data, err := io.ReadAll(io.LimitReader(resp.Body, maxFaviconBytes))
	if err != nil || len(data) == 0 {
		return nil, "", false
	}

	contentType := resp.Header.Get("Content-Type")
	if contentType == "" {
		contentType = "image/x-icon"
	}

	return data, contentType, true
}
