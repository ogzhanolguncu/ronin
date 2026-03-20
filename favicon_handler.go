package main

import (
	"context"
	"database/sql"
	"io"
	"log/slog"
	"net/http"
	"time"
)

const (
	maxFaviconBytes = 10 * 1024 // 10KB favicon limit
	faviconMaxAge   = 24 * time.Hour
)

func (h *handler) getFavicon(w http.ResponseWriter, r *http.Request) {
	domain := r.PathValue("domain")
	if domain == "" {
		writeError(w, http.StatusBadRequest, "missing domain")
		return
	}

	var data []byte
	var contentType string
	err := h.store.QueryRowContext(r.Context(),
		"SELECT data, content_type FROM favicon WHERE domain = ?", domain,
	).Scan(&data, &contentType)
	if err == sql.ErrNoRows {
		http.NotFound(w, r)
		return
	}
	if err != nil {
		serverError(w, "failed to query favicon", err)
		return
	}

	w.Header().Set("Content-Type", contentType)
	w.Header().Set("Cache-Control", "public, max-age=86400")
	w.Write(data)
}

// fetchAndStoreFavicon downloads a favicon and stores it in the database.
// It tries iconURL first (from <link rel="icon">), then falls back to /favicon.ico.
func (h *handler) fetchAndStoreFavicon(domain, baseOrigin, iconURL string) {
	// Check if we already have a fresh favicon
	var fetchedAt int64
	err := h.store.QueryRowContext(context.Background(),
		"SELECT fetched_at FROM favicon WHERE domain = ?", domain,
	).Scan(&fetchedAt)
	if err == nil && time.Since(time.Unix(fetchedAt, 0)) < faviconMaxAge {
		return
	}

	client := newHTTPClient()

	var tryURLs []string
	if iconURL != "" {
		tryURLs = append(tryURLs, iconURL)
	}
	tryURLs = append(tryURLs, baseOrigin+"/favicon.ico")

	for _, faviconURL := range tryURLs {
		req, err := newMetadataRequest(context.Background(), http.MethodGet, faviconURL)
		if err != nil {
			continue
		}

		resp, err := client.Do(req)
		if err != nil {
			continue
		}

		if resp.StatusCode != http.StatusOK {
			resp.Body.Close()
			continue
		}

		data, err := io.ReadAll(io.LimitReader(resp.Body, maxFaviconBytes))
		resp.Body.Close()
		if err != nil || len(data) == 0 {
			continue
		}

		contentType := resp.Header.Get("Content-Type")
		if contentType == "" {
			contentType = "image/x-icon"
		}

		_, err = h.store.ExecContext(context.Background(),
			`INSERT INTO favicon (domain, data, content_type, fetched_at) VALUES (?, ?, ?, unixepoch())
			 ON CONFLICT(domain) DO UPDATE SET data = excluded.data, content_type = excluded.content_type, fetched_at = excluded.fetched_at`,
			domain, data, contentType,
		)
		if err != nil {
			slog.Error("failed to store favicon", "domain", domain, "err", err)
		}
		return // success
	}
}
