package main

import (
	"context"
	"embed"
	"flag"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/ogzhanolguncu/ronin/handler"
	"github.com/ogzhanolguncu/ronin/store"
	_ "modernc.org/sqlite"
)

//go:embed web/dist/*
var distFS embed.FS

type config struct {
	seed         int
	passphrase   []byte
	devMode      bool
	secureCookie bool
}

func main() {
	slog.SetDefault(slog.New(slog.NewJSONHandler(os.Stdout, nil)))
	cfg := loadConfig()

	s, err := store.NewStore("./ronin.db")
	if err != nil {
		slog.Error("failed to init store", "err", err)
		os.Exit(1)
	}

	if cfg.seed > 0 {
		if err := seedBookmarks(context.Background(), s, cfg.seed); err != nil {
			slog.Error("seed failed", "err", err)
			os.Exit(1)
		}
		slog.Info("seeding complete", "count", cfg.seed)
		s.Close()
		os.Exit(0)
	}

	dataDir := os.Getenv("DATA_DIR")
	if dataDir == "" {
		dataDir = "./"
	}

	srv := handler.New(s, distFS, cfg.passphrase, cfg.devMode, cfg.secureCookie, dataDir)
	waitForShutdown(srv, s)
}

func loadConfig() config {
	seed := flag.Int("seed", 0, "seed the database with N test bookmarks and exit")
	flag.Parse()

	devMode := os.Getenv("DEV") == "1"
	if devMode {
		slog.Warn("DEV MODE ENABLED — auth bypassed, do not use in production")
	}

	passphrase := os.Getenv("PASSPHRASE")
	if passphrase == "" && !devMode {
		slog.Error("PASSPHRASE environment variable must be set")
		os.Exit(1)
	}

	return config{
		seed:         *seed,
		passphrase:   []byte(passphrase),
		devMode:      devMode,
		secureCookie: os.Getenv("INSECURE_COOKIE") != "1",
	}
}

func waitForShutdown(srv *http.Server, s *store.Store) {
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	slog.Info("shutting down")

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		slog.Error("shutdown error", "err", err)
	}
	if err := s.Close(); err != nil {
		slog.Error("failed to close store", "err", err)
	}
}
