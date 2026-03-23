package handler

import (
	"embed"
	"errors"
	"io/fs"
	"log/slog"
	"net/http"
	"os"
	"path/filepath"
	"slices"
	"time"

	"github.com/ogzhanolguncu/ronin/httputil"
	"github.com/ogzhanolguncu/ronin/store"
	gocache "github.com/patrickmn/go-cache"
)

type Handler struct {
	store  *store.Store
	distFS embed.FS

	passphrase   []byte
	devMode      bool
	secureCookie bool
	dataDir      string

	metadataCache   *gocache.Cache
	tagCache        *gocache.Cache
	collectionCache *gocache.Cache
	sessionCache    *gocache.Cache
}

func New(s *store.Store, distFS embed.FS, passphrase []byte, devMode, secureCookie bool, dataDir string) *http.Server {
	if err := os.MkdirAll(filepath.Join(dataDir, "assets"), 0o755); err != nil {
		slog.Error("failed to create assets directory", "err", err)
		os.Exit(1)
	}

	h := &Handler{
		store:         s,
		distFS:        distFS,
		passphrase:    passphrase,
		devMode:       devMode,
		secureCookie:  secureCookie,
		dataDir:       dataDir,
		metadataCache:   gocache.New(10*time.Minute, 15*time.Minute),
		tagCache:        gocache.New(gocache.NoExpiration, 0),
		collectionCache: gocache.New(gocache.NoExpiration, 0),
		sessionCache:    gocache.New(30*time.Second, 1*time.Minute),
	}
	srv := &http.Server{
		Addr:         ":8080",
		Handler:      newRouter(h),
		ReadTimeout:  5 * time.Second,
		WriteTimeout: 30 * time.Second,
		IdleTimeout:  120 * time.Second,
	}

	go func() {
		slog.Info("server starting", "addr", srv.Addr)
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			slog.Error("server error", "err", err)
			os.Exit(1)
		}
	}()

	return srv
}

func newRouter(h *Handler) http.Handler {
	mux := http.NewServeMux()

	mux.HandleFunc("GET /api/v1/healthz", func(w http.ResponseWriter, r *http.Request) {
		httputil.WriteJSON(w, http.StatusOK, map[string]string{"status": "ok"})
	})

	mux.HandleFunc("POST   /api/v1/auth/login", h.authLogin)
	mux.HandleFunc("POST   /api/v1/auth/logout", h.authLogout)

	mux.HandleFunc("GET    /api/v1/bookmarks/search", h.searchBookmarks)
	mux.HandleFunc("GET    /api/v1/bookmarks/counts", h.getBookmarkCounts)
	mux.HandleFunc("GET    /api/v1/bookmarks", h.getBookmarks)
	mux.HandleFunc("GET    /api/v1/bookmarks/{id}", h.getBookmark)
	mux.HandleFunc("POST   /api/v1/bookmarks", h.createBookmark)
	mux.HandleFunc("PUT    /api/v1/bookmarks/{id}", h.updateBookmark)
	mux.HandleFunc("DELETE /api/v1/bookmarks/{id}", h.deleteBookmark)
	mux.HandleFunc("DELETE /api/v1/bookmarks", h.deleteBookmarks)
	mux.HandleFunc("PATCH  /api/v1/bookmarks/archive", h.archiveBookmarks)
	mux.HandleFunc("PATCH  /api/v1/bookmarks/read", h.readBookmarks)
	mux.HandleFunc("PATCH  /api/v1/bookmarks/favorite", h.favoriteBookmarks)

	mux.HandleFunc("GET    /api/v1/collections", h.getCollections)
	mux.HandleFunc("GET    /api/v1/collections/{id}", h.getCollection)
	mux.HandleFunc("POST   /api/v1/collections", h.createCollection)
	mux.HandleFunc("PUT    /api/v1/collections/{id}", h.updateCollection)
	mux.HandleFunc("DELETE /api/v1/collections/{id}", h.deleteCollection)

	mux.HandleFunc("GET    /api/v1/tags", h.getTags)

	mux.HandleFunc("GET    /api/v1/assets/{id}", h.getSnapshot)
	mux.HandleFunc("GET    /api/v1/assets/{id}/read", h.getReadable)
	mux.HandleFunc("GET    /api/v1/assets/{id}/status", h.getAssetStatus)
	mux.HandleFunc("POST   /api/v1/assets/{id}/generate", h.regenerateAssetsHandler)

	mux.HandleFunc("GET    /api/v1/metadata", h.getMetadata)
	mux.HandleFunc("GET    /api/v1/favicons/{domain}", h.getFavicon)

	mux.Handle("/", h.frontendHandler())

	return applyMiddleware(mux,
		corsMiddleware,
		h.authMiddleware,
		recoveryMiddleware,
		loggingMiddleware,
	)
}

func applyMiddleware(h http.Handler, middlewares ...func(http.Handler) http.Handler) http.Handler {
	for _, mw := range slices.Backward(middlewares) {
		h = mw(h)
	}
	return h
}

// sub returns the embedded dist filesystem, panicking on error.
func (h *Handler) sub() fs.FS {
	sub, err := fs.Sub(h.distFS, "web/dist")
	if err != nil {
		panic(err)
	}
	return sub
}
