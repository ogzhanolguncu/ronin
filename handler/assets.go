package handler

import (
	"bytes"
	"compress/gzip"
	"context"
	_ "embed"
	"fmt"
	"html"
	"io"
	"log/slog"
	"net/http"
	nurl "net/url"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"time"

	readability "codeberg.org/readeck/go-readability/v2"
	"github.com/ogzhanolguncu/ronin/httputil"
)

//go:embed readable.css
var readableCSS string

func (h *Handler) getSnapshot(w http.ResponseWriter, r *http.Request) {
	id, err := httputil.PathParamInt(r, "id")
	if err != nil {
		httputil.WriteError(w, http.StatusUnprocessableEntity, "invalid id")
		return
	}

	path := filepath.Join(h.dataDir, "assets", strconv.FormatInt(id, 10), "snapshot.html.gz")
	f, err := os.Open(path)
	if err != nil {
		httputil.WriteError(w, http.StatusNotFound, "snapshot not available")
		return
	}
	defer f.Close()

	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	w.Header().Set("Content-Encoding", "gzip")
	w.Header().Set("Content-Security-Policy", "sandbox allow-scripts")
	io.Copy(w, f)
}

func (h *Handler) getReadable(w http.ResponseWriter, r *http.Request) {
	id, err := httputil.PathParamInt(r, "id")
	if err != nil {
		httputil.WriteError(w, http.StatusUnprocessableEntity, "invalid id")
		return
	}

	path := filepath.Join(h.dataDir, "assets", strconv.FormatInt(id, 10), "readable.html.gz")
	f, err := os.Open(path)
	if err != nil {
		httputil.WriteError(w, http.StatusNotFound, "readable version not available")
		return
	}
	defer f.Close()

	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	w.Header().Set("Content-Encoding", "gzip")
	w.Header().Set("Content-Security-Policy", "default-src 'none'; style-src 'unsafe-inline'; sandbox")
	io.Copy(w, f)
}

func (h *Handler) getAssetStatus(w http.ResponseWriter, r *http.Request) {
	id, err := httputil.PathParamInt(r, "id")
	if err != nil {
		httputil.WriteError(w, http.StatusUnprocessableEntity, "invalid id")
		return
	}

	var status struct {
		SnapshotStatus string `db:"snapshot_status" json:"snapshot_status"`
		ReadableStatus string `db:"readable_status" json:"readable_status"`
	}
	err = h.store.DB.GetContext(r.Context(), &status,
		"SELECT snapshot_status, readable_status FROM bookmark WHERE id = ?", id)
	if err != nil {
		httputil.WriteError(w, http.StatusNotFound, "bookmark not found")
		return
	}

	httputil.WriteJSON(w, http.StatusOK, status)
}

func (h *Handler) generateAssets(bookmarkID int64, bookmarkURL string) {
	go h.generateSnapshot(bookmarkID, bookmarkURL)
	go h.generateReadable(bookmarkID, bookmarkURL)
	go h.submitToWebArchive(bookmarkURL)
}

func (h *Handler) regenerateAssetsHandler(w http.ResponseWriter, r *http.Request) {
	id, err := httputil.PathParamInt(r, "id")
	if err != nil {
		httputil.WriteError(w, http.StatusUnprocessableEntity, "invalid id")
		return
	}

	var bookmarkURL string
	err = h.store.DB.GetContext(r.Context(), &bookmarkURL,
		"SELECT url FROM bookmark WHERE id = ?", id)
	if err != nil {
		httputil.WriteError(w, http.StatusNotFound, "bookmark not found")
		return
	}

	// Clean old assets
	os.RemoveAll(filepath.Join(h.dataDir, "assets", strconv.FormatInt(id, 10)))

	h.generateAssets(id, bookmarkURL)

	httputil.WriteJSON(w, http.StatusAccepted, map[string]string{"status": "generating"})
}

func (h *Handler) submitToWebArchive(bookmarkURL string) {
	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	saveURL := "https://web.archive.org/save/" + bookmarkURL
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, saveURL, nil)
	if err != nil {
		slog.Warn("web archive request failed", "url", bookmarkURL, "err", err)
		return
	}
	req.Header.Set("User-Agent", "Mozilla/5.0 (compatible; Ronin/1.0)")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		slog.Warn("web archive submission failed", "url", bookmarkURL, "err", err)
		return
	}
	resp.Body.Close()

	slog.Info("web archive submitted", "url", bookmarkURL, "status", resp.StatusCode)
}

const (
	maxRetries = 2
	retryDelay = 3 * time.Second
)

func (h *Handler) generateSnapshot(bookmarkID int64, bookmarkURL string) {
	dir := filepath.Join(h.dataDir, "assets", strconv.FormatInt(bookmarkID, 10))
	if err := os.MkdirAll(dir, 0o755); err != nil {
		slog.Error("failed to create asset directory", "bookmark_id", bookmarkID, "err", err)
		return
	}

	gzPath := filepath.Join(dir, "snapshot.html.gz")
	tmpPath := gzPath + ".tmp"

	h.store.DB.ExecContext(context.Background(),
		"UPDATE bookmark SET snapshot_status = 'pending' WHERE id = ?", bookmarkID)

	if _, err := exec.LookPath("monolith"); err != nil {
		slog.Warn("monolith not installed, skipping snapshot", "bookmark_id", bookmarkID)
		h.store.DB.ExecContext(context.Background(),
			"UPDATE bookmark SET snapshot_status = 'failed' WHERE id = ?", bookmarkID)
		return
	}

	var lastErr error
	for attempt := range maxRetries {
		if attempt > 0 {
			slog.Info("retrying snapshot", "bookmark_id", bookmarkID, "attempt", attempt+1)
			time.Sleep(retryDelay)
		}

		ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
		cmd := exec.CommandContext(ctx, "monolith", bookmarkURL, "-o", tmpPath, "-I")
		output, err := cmd.CombinedOutput()
		cancel()

		if err != nil {
			lastErr = fmt.Errorf("%w: %s", err, string(output))
			os.Remove(tmpPath)
			continue
		}

		if err := gzipFile(tmpPath, gzPath); err != nil {
			lastErr = err
			os.Remove(tmpPath)
			continue
		}
		os.Remove(tmpPath)

		h.store.DB.ExecContext(context.Background(),
			"UPDATE bookmark SET snapshot_status = 'ready' WHERE id = ?", bookmarkID)
		slog.Info("snapshot created", "bookmark_id", bookmarkID)
		return
	}

	slog.Error("monolith failed after retries", "bookmark_id", bookmarkID, "err", lastErr)
	h.store.DB.ExecContext(context.Background(),
		"UPDATE bookmark SET snapshot_status = 'failed' WHERE id = ?", bookmarkID)
}

func (h *Handler) generateReadable(bookmarkID int64, bookmarkURL string) {
	dir := filepath.Join(h.dataDir, "assets", strconv.FormatInt(bookmarkID, 10))
	if err := os.MkdirAll(dir, 0o755); err != nil {
		slog.Error("failed to create asset directory", "bookmark_id", bookmarkID, "err", err)
		return
	}

	gzPath := filepath.Join(dir, "readable.html.gz")

	h.store.DB.ExecContext(context.Background(),
		"UPDATE bookmark SET readable_status = 'pending' WHERE id = ?", bookmarkID)

	parsedURL, err := nurl.Parse(bookmarkURL)
	if err != nil {
		h.setReadableStatus(bookmarkID, "failed", err)
		return
	}

	var lastErr error
	for attempt := range maxRetries {
		if attempt > 0 {
			slog.Info("retrying readable", "bookmark_id", bookmarkID, "attempt", attempt+1)
			time.Sleep(retryDelay)
		}

		article, err := readability.FromURL(bookmarkURL, 30*time.Second)
		if err != nil {
			lastErr = err
			continue
		}

		var contentBuf bytes.Buffer
		if err := article.RenderHTML(&contentBuf); err != nil {
			lastErr = err
			continue
		}

		htmlContent := wrapReadableHTML(article.Title(), parsedURL.String(), contentBuf.String())
		if err := writeGzipped(gzPath, []byte(htmlContent)); err != nil {
			lastErr = err
			continue
		}

		h.store.DB.ExecContext(context.Background(),
			"UPDATE bookmark SET readable_status = 'ready' WHERE id = ?", bookmarkID)
		slog.Info("readable created", "bookmark_id", bookmarkID)
		return
	}

	h.setReadableStatus(bookmarkID, "failed", lastErr)
}

func (h *Handler) setReadableStatus(id int64, status string, err error) {
	slog.Error("readable generation failed", "bookmark_id", id, "err", err)
	h.store.DB.ExecContext(context.Background(),
		"UPDATE bookmark SET readable_status = ? WHERE id = ?", status, id)
}

func writeGzipped(dst string, data []byte) error {
	f, err := os.Create(dst)
	if err != nil {
		return fmt.Errorf("create file: %w", err)
	}
	defer f.Close()

	w := gzip.NewWriter(f)
	if _, err := w.Write(data); err != nil {
		return fmt.Errorf("gzip write: %w", err)
	}
	return w.Close()
}

func gzipFile(src, dst string) error {
	raw, err := os.Open(src)
	if err != nil {
		return fmt.Errorf("open source: %w", err)
	}
	defer raw.Close()

	gz, err := os.Create(dst)
	if err != nil {
		return fmt.Errorf("create gzip file: %w", err)
	}
	defer gz.Close()

	w := gzip.NewWriter(gz)
	if _, err := io.Copy(w, raw); err != nil {
		return fmt.Errorf("gzip write: %w", err)
	}
	return w.Close()
}

func wrapReadableHTML(title, sourceURL, content string) string {
	return fmt.Sprintf(`<!DOCTYPE html>
<html><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>%s</title>
<style>%s</style>
</head><body>
<h1>%s</h1>
<p class="source"><a href="%s">%s</a></p>
%s
</body></html>`,
		html.EscapeString(title),
		readableCSS,
		html.EscapeString(title),
		html.EscapeString(sourceURL),
		html.EscapeString(sourceURL),
		content,
	)
}
