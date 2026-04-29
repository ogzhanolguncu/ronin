package handler

import (
	"context"
	"database/sql"
	"errors"
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

	data, contentType, err := h.store.GetFavicon(r.Context(), domain)
	if errors.Is(err, sql.ErrNoRows) {
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

func (h *Handler) fetchAndStoreFavicon(domain, baseOrigin, iconURL string) {
	fetchedAt, err := h.store.GetFaviconFetchedAt(context.Background(), domain)
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

		if err := h.store.UpsertFavicon(context.Background(), domain, data, contentType); err != nil {
			slog.Error("failed to store favicon", "domain", domain, "err", err)
		}
		return
	}
}
