package handler

import (
	"context"
	"database/sql"
	"io"
	"log/slog"
	"net/http"
	"time"

	"github.com/ogzhanolguncu/ronin/httputil"
	"github.com/ogzhanolguncu/ronin/metadata"
)

const (
	maxFaviconBytes = 10 * 1024 // 10KB favicon limit
	faviconMaxAge   = 24 * time.Hour
)

func (h *Handler) getFavicon(w http.ResponseWriter, r *http.Request) {
	domain := r.PathValue("domain")
	if domain == "" {
		httputil.WriteError(w, http.StatusBadRequest, "missing domain")
		return
	}

	var data []byte
	var contentType string
	err := h.store.ReadDB.QueryRowContext(r.Context(),
		"SELECT data, content_type FROM favicon WHERE domain = ?", domain,
	).Scan(&data, &contentType)
	if err == sql.ErrNoRows {
		http.NotFound(w, r)
		return
	}
	if err != nil {
		httputil.ServerError(w, "failed to query favicon", err)
		return
	}

	w.Header().Set("Content-Type", contentType)
	w.Header().Set("Cache-Control", "public, max-age=86400")
	if _, err := w.Write(data); err != nil {
		slog.Warn("failed to write favicon response", "domain", domain, "err", err)
	}
}

// fetchAndStoreFavicon downloads a favicon and stores it in the database.
// It tries iconURL first (from <link rel="icon">), then falls back to /favicon.ico.
func (h *Handler) fetchAndStoreFavicon(domain, baseOrigin, iconURL string) {
	// Check if we already have a fresh favicon
	var fetchedAt int64
	err := h.store.ReadDB.QueryRowContext(context.Background(),
		"SELECT fetched_at FROM favicon WHERE domain = ?", domain,
	).Scan(&fetchedAt)
	if err == nil && time.Since(time.Unix(fetchedAt, 0)) < faviconMaxAge {
		return
	}

	client := metadata.NewHTTPClient()

	var tryURLs []string
	if iconURL != "" {
		tryURLs = append(tryURLs, iconURL)
	}
	tryURLs = append(tryURLs, baseOrigin+"/favicon.ico")

	for _, faviconURL := range tryURLs {
		req, err := metadata.NewRequest(context.Background(), http.MethodGet, faviconURL)
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

		_, err = h.store.WriteDB.ExecContext(context.Background(),
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
