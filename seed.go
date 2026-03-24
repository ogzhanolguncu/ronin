package main

import (
	"context"
	"database/sql"
	"fmt"
	"io"
	"log/slog"
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
	archived    bool
	favorite    bool
	read        bool
}

var seedTemplates = []bookmarkTemplate{
	// Programming - Go
	{"https://go.dev/blog/go1.22", "Go 1.22 Release Notes", "Overview of changes in Go 1.22", "Check the new range-over-func feature", "go release-notes changelog", "programming", false, false, true},
	{"https://pkg.go.dev/net/http", "net/http - Go Packages", "HTTP client and server implementations", "", "go stdlib http", "programming", false, false, true},
	{"https://go.dev/doc/effective_go", "Effective Go", "Official guide to writing clear, idiomatic Go code", "", "go style-guide best-practices", "programming", false, true, true},
	{"https://go.dev/blog/using-go-modules", "Using Go Modules", "Official guide to Go module system", "", "go modules dependencies", "programming", true, false, true},
	{"https://gobyexample.com", "Go by Example", "Hands-on introduction to Go using annotated example programs", "Great quick reference", "go tutorial examples", "programming", false, true, true},
	{"https://github.com/golang/go/wiki/CodeReviewComments", "Go Code Review Comments", "Common Go code review feedback", "", "go code-review style-guide", "programming", false, false, true},
	{"https://echo.labstack.com/docs", "Echo Framework Docs", "High performance Go web framework", "Good middleware support", "go http framework middleware", "programming", false, false, false},
	{"https://grpc.io/docs/languages/go", "gRPC Go Quick Start", "Getting started with gRPC in Go", "", "go grpc protobuf api", "programming", false, false, false},
	{"https://github.com/uber-go/zap", "Zap Logger", "Blazing fast structured leveled logging in Go", "", "go logging structured-logs", "programming", false, false, true},
	{"https://github.com/stretchr/testify", "Testify - Go Testing Toolkit", "Toolkit with common assertions and mocks for Go tests", "", "go testing assertions mocks", "programming", false, false, true},

	// Programming - JavaScript/TypeScript/Web
	{"https://react.dev/learn", "React Learn", "Official React tutorial and docs", "Start here for React basics", "react tutorial hooks", "programming", false, true, false},
	{"https://developer.mozilla.org/en-US/docs/Web/JavaScript", "MDN JavaScript Docs", "Comprehensive JavaScript reference", "", "javascript reference mdn", "programming", false, false, true},
	{"https://www.typescriptlang.org/docs/handbook", "TypeScript Handbook", "Official TypeScript documentation and guide", "", "typescript handbook types", "programming", false, false, true},
	{"https://htmx.org/docs", "htmx Documentation", "htmx gives you access to AJAX and more in HTML", "Lightweight alternative to SPA frameworks", "htmx hypermedia html", "programming", false, false, false},
	{"https://nextjs.org/docs", "Next.js Documentation", "The React framework for production", "", "react nextjs ssr", "programming", false, false, false},
	{"https://svelte.dev/docs/introduction", "Svelte Documentation", "Cybernetically enhanced web apps", "", "svelte compiler frontend", "programming", true, false, true},
	{"https://vuejs.org/guide/introduction", "Vue.js Guide", "The progressive JavaScript framework", "", "vue reactive frontend", "programming", true, false, true},
	{"https://astro.build/docs", "Astro Documentation", "The web framework for content-driven websites", "", "astro static-site islands", "programming", false, false, false},
	{"https://tanstack.com/query/latest", "TanStack Query", "Powerful async state management for TS/JS", "", "react data-fetching cache state", "programming", false, true, true},
	{"https://zod.dev", "Zod - TypeScript Schema Validation", "TypeScript-first schema declaration and validation library", "", "typescript validation schema", "programming", false, false, false},

	// Programming - General
	{"https://blog.cloudflare.com/http3-the-past-present-and-future", "HTTP/3 Deep Dive - Cloudflare", "Cloudflare blog on HTTP/3 and QUIC", "Good protocol comparison", "http3 quic networking protocols", "programming", false, false, true},
	{"https://testing.googleblog.com/2024/04/isbooleantoolongforamethod.html", "Google Testing Blog - Method Naming", "Google testing blog on naming strategies", "", "testing naming clean-code", "programming", false, false, false},
	{"https://github.com/golang-jwt/jwt", "golang-jwt", "Go implementation of JSON Web Tokens", "", "go jwt auth tokens", "programming", false, false, true},
	{"https://hono.dev/docs", "Hono - Web Framework", "Ultrafast web framework for the edge", "", "typescript edge-computing http", "programming", false, false, false},
	{"https://bun.sh/docs", "Bun Documentation", "Incredibly fast JavaScript runtime, bundler, and package manager", "", "javascript runtime bundler", "programming", false, false, false},
	{"https://deno.land/manual", "Deno Manual", "A modern runtime for JavaScript and TypeScript", "", "typescript runtime permissions", "programming", true, false, true},

	// DevOps
	{"https://docs.docker.com/get-started", "Docker Get Started", "Docker official getting started guide", "", "docker containers getting-started", "devops", false, false, true},
	{"https://kubernetes.io/docs/tutorials", "Kubernetes Tutorials", "Learn Kubernetes basics", "Start with the deployment tutorial", "kubernetes orchestration pods", "devops", false, false, false},
	{"https://github.com/containerd/nerdctl", "nerdctl - Docker-compatible CLI", "Drop-in replacement for docker CLI", "", "docker cli containerd", "devops", false, false, false},
	{"https://nats.io/about", "NATS Messaging", "Cloud native messaging system", "Consider for microservices", "messaging pubsub microservices", "devops", false, false, false},
	{"https://prometheus.io/docs/introduction/overview", "Prometheus Documentation", "Monitoring and alerting toolkit", "", "monitoring metrics alerting", "devops", false, true, true},
	{"https://grafana.com/docs/grafana/latest", "Grafana Documentation", "Open source analytics and monitoring", "Pair with Prometheus", "dashboards visualization metrics", "devops", false, false, true},
	{"https://opentelemetry.io/docs/languages/go", "OpenTelemetry Go", "Observability framework for Go", "", "go tracing observability otel", "devops", false, false, false},
	{"https://devenv.sh", "devenv - Developer Environments", "Fast reproducible developer environments", "", "nix dev-environment reproducible", "devops", false, false, false},
	{"https://www.terraform.io/docs", "Terraform Documentation", "Infrastructure as code tool by HashiCorp", "", "iac infrastructure hcl", "devops", false, false, true},
	{"https://www.ansible.com/overview/how-ansible-works", "Ansible - How It Works", "Simple IT automation platform", "", "automation configuration-management yaml", "devops", true, false, true},
	{"https://argoproj.github.io/cd", "Argo CD", "Declarative GitOps continuous delivery for Kubernetes", "", "gitops kubernetes continuous-delivery", "devops", false, false, false},
	{"https://nixos.org/manual/nix/stable", "Nix Manual", "The purely functional package manager", "", "nix packages reproducible", "devops", false, false, false},
	{"https://caddyserver.com/docs", "Caddy Documentation", "Fast multi-platform web server with automatic HTTPS", "", "web-server https automatic-tls", "devops", false, false, true},
	{"https://traefik.io/traefik", "Traefik Proxy", "Cloud-native application proxy", "", "reverse-proxy load-balancer service-discovery", "devops", false, false, false},

	// Databases
	{"https://www.postgresql.org/docs/16/index.html", "PostgreSQL 16 Documentation", "Official PostgreSQL docs", "Check partitioning chapter", "postgresql relational partitioning", "databases", false, false, true},
	{"https://www.sqlite.org/wal.html", "SQLite WAL Mode", "Write-Ahead Logging in SQLite", "Essential for concurrent readers", "sqlite wal concurrency", "databases", false, true, true},
	{"https://redis.io/docs/getting-started", "Redis Getting Started", "Introduction to Redis data structures", "", "redis cache key-value", "databases", false, false, true},
	{"https://sqlc.dev", "sqlc - Type-safe Go from SQL", "Compile SQL to type-safe Go code", "Better than ORMs for complex queries", "go sql codegen type-safety", "databases", false, true, true},
	{"https://turso.tech/blog/introducing-libsql", "libSQL - Turso", "Fork of SQLite for server use cases", "", "sqlite edge distributed", "databases", false, false, false},
	{"https://fly.io/blog/all-in-on-sqlite-litestream", "All-in on SQLite - Fly.io", "Why Fly.io went all-in on SQLite", "Interesting production SQLite story", "sqlite production replication", "databases", false, false, true},
	{"https://github.com/golang-migrate/migrate", "golang-migrate", "Database migrations in Go", "Supports many databases", "go migrations schema-management", "databases", false, false, true},
	{"https://datasette.io", "Datasette", "Explore and publish data with SQLite", "Great for data exploration", "sqlite data-exploration publishing", "databases", false, false, false},
	{"https://github.com/apache/arrow", "Apache Arrow", "Cross-language columnar data format", "", "columnar analytics interop", "databases", false, false, false},
	{"https://clickhouse.com/docs", "ClickHouse Documentation", "Open-source column-oriented DBMS", "", "olap columnar analytics", "databases", false, false, false},
	{"https://www.mongodb.com/docs/manual", "MongoDB Manual", "Document-oriented NoSQL database", "", "nosql documents json", "databases", true, false, true},
	{"https://neon.tech/docs/introduction", "Neon - Serverless Postgres", "Serverless Postgres with branching", "", "postgresql serverless branching", "databases", false, false, false},
	{"https://planetscale.com/docs", "PlanetScale Documentation", "MySQL-compatible serverless database", "", "mysql serverless vitess", "databases", false, false, false},
	{"https://duckdb.org/docs", "DuckDB Documentation", "In-process analytical database", "", "olap embedded analytics", "databases", false, false, false},

	// Security
	{"https://owasp.org/www-project-top-ten", "OWASP Top Ten", "Top 10 web application security risks", "Review annually", "owasp vulnerabilities web-security", "security", false, true, true},
	{"https://cheatsheetseries.owasp.org", "OWASP Cheat Sheet Series", "Security cheat sheets for developers", "", "owasp cheatsheet reference", "security", false, false, true},
	{"https://portswigger.net/web-security", "PortSwigger Web Security Academy", "Free online web security training", "", "web-security training hands-on", "security", false, false, false},
	{"https://github.com/OWASP/Go-SCP", "Go Secure Coding Practices", "OWASP Go secure coding guide", "", "go secure-coding owasp", "security", false, false, true},
	{"https://cve.mitre.org", "CVE - Common Vulnerabilities", "CVE vulnerability database", "", "cve vulnerabilities tracking", "security", false, false, true},
	{"https://www.ssllabs.com/ssltest", "SSL Labs Server Test", "Free SSL/TLS server testing", "", "tls ssl testing audit", "security", false, false, true},
	{"https://github.com/FiloSottile/age", "age - File Encryption", "Simple modern file encryption tool", "", "encryption files cli", "security", false, false, false},
	{"https://www.vaultproject.io/docs", "HashiCorp Vault", "Secrets management and data protection", "", "secrets-management rotation pki", "security", false, false, false},

	// Tools
	{"https://github.com/charmbracelet/bubbletea", "Bubble Tea - TUI Framework", "A Go framework for terminal user interfaces", "Fun to build with", "go tui terminal-ui", "tools", false, true, true},
	{"https://github.com/junegunn/fzf", "fzf - Fuzzy Finder", "General-purpose command-line fuzzy finder", "", "cli fuzzy-search productivity", "tools", false, false, true},
	{"https://neovim.io/doc/user", "Neovim Documentation", "Neovim user manual", "", "neovim editor lua", "tools", false, false, false},
	{"https://github.com/BurntSushi/ripgrep", "ripgrep - Fast Search Tool", "Recursively search directories for a regex", "Faster than grep", "cli search regex fast", "tools", false, false, true},
	{"https://devdocs.io", "DevDocs API Documentation", "Unified API documentation browser", "", "documentation reference offline", "tools", false, false, true},
	{"https://github.com/jesseduffield/lazygit", "lazygit - Git TUI", "Simple terminal UI for git commands", "", "git tui terminal-ui", "tools", false, false, false},
	{"https://github.com/sharkdp/bat", "bat - Better cat", "A cat clone with syntax highlighting and git integration", "", "cli syntax-highlight cat", "tools", false, false, true},
	{"https://github.com/ajeetdsouza/zoxide", "zoxide - Smarter cd", "A smarter cd command inspired by z and autojump", "", "cli navigation autojump", "tools", false, false, true},
	{"https://github.com/dandavison/delta", "delta - Git Diff Viewer", "A syntax-highlighting pager for git, diff, and grep", "", "git diff syntax-highlight", "tools", false, false, false},
	{"https://wezfurlong.org/wezterm", "WezTerm", "GPU-accelerated cross-platform terminal emulator", "", "terminal gpu multiplexer", "tools", false, false, false},
	{"https://starship.rs", "Starship Prompt", "Minimal blazing-fast cross-shell prompt", "", "shell prompt customization", "tools", false, false, true},
	{"https://github.com/casey/just", "just - Command Runner", "A handy way to save and run project-specific commands", "", "task-runner automation makefile", "tools", false, false, false},

	// Design
	{"https://tailwindcss.com/docs/installation", "Tailwind CSS Installation", "Get started with Tailwind CSS", "Use the Vite plugin", "tailwind css utility-first", "design", false, false, true},
	{"https://lawsofux.com", "Laws of UX", "Collection of UX design principles", "", "ux principles psychology", "design", false, true, true},
	{"https://designsystems.com", "Design Systems Handbook", "Guide to building design systems", "", "design-systems components tokens", "design", false, false, false},
	{"https://www.radix-ui.com/primitives/docs/overview/introduction", "Radix UI Primitives", "Unstyled accessible React UI components", "", "react accessibility headless-ui", "design", false, false, false},
	{"https://ui.shadcn.com/docs", "shadcn/ui", "Beautifully designed components built with Radix and Tailwind", "", "react tailwind copy-paste", "design", false, false, true},
	{"https://fonts.google.com", "Google Fonts", "Free open-source font library", "", "typography fonts web-fonts", "design", false, false, true},
	{"https://coolors.co", "Coolors - Color Palette Generator", "Fast color scheme generator", "", "colors palette generator", "design", false, false, false},
	{"https://www.figma.com/best-practices", "Figma Best Practices", "Tips and guides for designing in Figma", "", "figma workflow prototyping", "design", true, false, true},

	// AI & ML
	{"https://arxiv.org/abs/2303.08774", "GPT-4 Technical Report", "OpenAI GPT-4 paper", "Read the limitations section", "llm research paper transformer", "ai-ml", false, false, true},
	{"https://simonwillison.net/2024/Apr/8/llm-cli", "LLM CLI Tool - Simon Willison", "Command-line tool for working with LLMs", "", "llm cli prompt-engineering", "ai-ml", false, false, false},
	{"https://ollama.com", "Ollama", "Run large language models locally", "", "llm local-inference self-hosted", "ai-ml", false, true, true},
	{"https://huggingface.co/docs", "Hugging Face Documentation", "ML model hub and tools", "", "models hub transformers", "ai-ml", false, false, false},
	{"https://github.com/ggerganov/llama.cpp", "llama.cpp", "LLM inference in pure C/C++", "", "llm inference cpp quantization", "ai-ml", false, false, false},
	{"https://docs.anthropic.com", "Anthropic API Documentation", "Claude API reference and guides", "", "claude api tool-use sdk", "ai-ml", false, true, true},
	{"https://platform.openai.com/docs", "OpenAI API Docs", "OpenAI platform documentation", "", "openai api embeddings chat", "ai-ml", false, false, true},
	{"https://github.com/langchain-ai/langchain", "LangChain", "Framework for developing LLM-powered applications", "", "llm chains agents rag", "ai-ml", false, false, false},
	{"https://www.cursor.com", "Cursor - AI Code Editor", "AI-first code editor built on VS Code", "", "ai-coding editor autocomplete", "ai-ml", false, false, false},
	{"https://mlflow.org/docs/latest/index.html", "MLflow Documentation", "Open source platform for the ML lifecycle", "", "mlops experiment-tracking models", "ai-ml", false, false, false},

	// Learning
	{"https://martinfowler.com/articles/microservices.html", "Microservices - Martin Fowler", "Defining the microservices architecture", "", "microservices architecture patterns", "learning", false, false, true},
	{"https://blog.pragmaticengineer.com/system-design-interview-an-insiders-guide", "System Design Interview Guide", "Pragmatic Engineer on system design interviews", "", "system-design interview scalability", "learning", false, false, false},
	{"https://wizardzines.com/zines/dns", "How DNS Works - Wizard Zines", "Visual guide to DNS", "Great for quick reference", "dns networking illustrated", "learning", false, false, true},
	{"https://refactoring.guru/design-patterns", "Design Patterns - Refactoring Guru", "Illustrated design patterns catalog", "Good Gang of Four refresher", "design-patterns oop refactoring", "learning", false, true, true},
	{"https://github.com/donnemartin/system-design-primer", "System Design Primer", "Learn how to design large-scale systems", "", "system-design scalability distributed", "learning", false, false, false},
	{"https://github.com/practical-tutorials/project-based-learning", "Project Based Learning", "Curated list of project-based tutorials", "", "tutorials projects hands-on", "learning", false, false, false},
	{"https://the-algorithms.com", "The Algorithms", "Open source algorithm implementations", "", "algorithms data-structures implementations", "learning", false, false, false},
	{"https://missing.csail.mit.edu", "The Missing Semester of CS", "MIT course on practical dev tools", "", "shell git vim cli-tools", "learning", false, false, true},
	{"https://teachyourselfcs.com", "Teach Yourself Computer Science", "Curated self-study guide for CS fundamentals", "", "cs-fundamentals self-study curriculum", "learning", false, false, false},
	{"https://roadmap.sh", "Developer Roadmaps", "Community-driven roadmaps for learning paths", "", "roadmap career-path skills", "learning", false, false, false},
	{"https://web.dev/learn", "web.dev Learn", "Google's web development learning platform", "", "web performance accessibility core-vitals", "learning", false, false, true},
	{"https://exercism.org", "Exercism", "Code practice and mentorship for everyone", "", "practice mentorship exercises", "learning", false, false, false},
}

func seedBookmarks(ctx context.Context, s *store.Store, count int) error {
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

			var collectionID *int64
			if t.collection != "" {
				if cid, ok := collectionIDs[t.collection]; ok {
					collectionID = &cid
				}
			}

			res, err := tx.ExecContext(ctx,
				`INSERT INTO bookmark (url, title, description, notes, archived, read, favorite, collection_id)
				 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
				t.url, t.title, t.description, t.notes, t.archived, t.read, t.favorite, collectionID,
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
