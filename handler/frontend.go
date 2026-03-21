package handler

import (
	"encoding/json"
	"io/fs"
	"log/slog"
	"net/http"
	"strings"
)

func (h *Handler) frontendHandler() http.Handler {
	if h.devMode {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			http.Error(w, "dev mode: frontend served by Vite", http.StatusNotFound)
		})
	}

	sub := h.sub()

	indexBytes, err := fs.ReadFile(sub, "index.html")
	if err != nil {
		panic(err)
	}
	indexHTML := string(indexBytes)

	fileServer := http.FileServer(http.FS(sub))

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Serve static assets directly
		path := strings.TrimPrefix(r.URL.Path, "/")
		if path != "" && path != "index.html" {
			if _, err := fs.Stat(sub, path); err == nil {
				if strings.HasPrefix(path, "assets/") {
					w.Header().Set("Cache-Control", "public, max-age=31536000, immutable")
				}
				fileServer.ServeHTTP(w, r)
				return
			}
		}

		// For all other routes, serve index.html with auth state and tags injected
		status := h.resolveAuthStatus(r)
		page := strings.Replace(indexHTML, "<!--AUTH-->",
			`<script>window.__AUTH__="`+status+`"</script>`, 1)

		tags, _ := h.loadTags(r.Context())
		tagsJSON, _ := json.Marshal(tags)
		slog.Info("injecting tags into client", "count", len(tags))
		page = strings.Replace(page, "<!--TAGS-->",
			`<script>window.__TAGS__=`+string(tagsJSON)+`</script>`, 1)

		w.Header().Set("Content-Type", "text/html; charset=utf-8")
		w.Header().Set("Cache-Control", "no-cache")
		w.Write([]byte(page))
	})
}

func (h *Handler) resolveAuthStatus(r *http.Request) string {
	if h.devMode {
		return "authenticated"
	}

	cookie, err := r.Cookie("session")
	if err != nil || !h.isValidSession(r.Context(), cookie.Value) {
		return "login"
	}

	return "authenticated"
}
