package main

import (
	"context"
	"flag"
	"log/slog"
	"os"
	"os/signal"
	"syscall"
	"time"

	_ "modernc.org/sqlite"
)

func main() {
	seed := flag.Int("seed", 0, "seed the database with N test bookmarks and exit")
	flag.Parse()

	logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))
	slog.SetDefault(logger)

	store, err := NewStore("./sanctum.db")
	if err != nil {
		slog.Error("failed to init store", "err", err)
		os.Exit(1)
	}

	if *seed > 0 {
		ctx := context.Background()
		if err := seedBookmarks(ctx, store, *seed); err != nil {
			slog.Error("seed failed", "err", err)
			os.Exit(1)
		}
		slog.Info("seeding complete", "count", *seed)
		store.Close()
		os.Exit(0)
	}

	srv := NewHTTP(store)

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	slog.Info("shutting down")

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		slog.Error("shutdown error", "err", err)
	}
	if err := store.Close(); err != nil {
		slog.Error("failed to close store", "err", err)
	}
}
