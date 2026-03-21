package handler

import (
	"embed"
	"errors"
	"io/fs"
	"log/slog"
	"net/http"
	"os"
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

	metadataCache *gocache.Cache
	tagCache      *gocache.Cache
	sessionCache  *gocache.Cache
}

func New(s *store.Store, distFS embed.FS, passphrase []byte, devMode, secureCookie bool) *http.Server {
	h := &Handler{
		store:         s,
		distFS:        distFS,
		passphrase:    passphrase,
		devMode:       devMode,
		secureCookie:  secureCookie,
		metadataCache: gocache.New(10*time.Minute, 15*time.Minute),
		tagCache:      gocache.New(gocache.NoExpiration, 0),
		sessionCache:  gocache.New(30*time.Second, 1*time.Minute),
	}
	srv := &http.Server{
		Addr:         ":8080",
		Handler:      newRouter(h),
		ReadTimeout:  5 * time.Second,
		WriteTimeout: 10 * time.Second,
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
	mux.HandleFunc("GET    /api/v1/bookmarks", h.getBookmarks)
	mux.HandleFunc("GET    /api/v1/bookmarks/{id}", h.getBookmark)
	mux.HandleFunc("POST   /api/v1/bookmarks", h.createBookmark)
	mux.HandleFunc("PUT    /api/v1/bookmarks/{id}", h.updateBookmark)
	mux.HandleFunc("DELETE /api/v1/bookmarks/{id}", h.deleteBookmark)
	mux.HandleFunc("DELETE /api/v1/bookmarks", h.deleteBookmarks)
	mux.HandleFunc("PATCH  /api/v1/bookmarks/archive", h.archiveBookmarks)
	mux.HandleFunc("PATCH  /api/v1/bookmarks/read", h.readBookmarks)

	mux.HandleFunc("GET    /api/v1/tags", h.getTags)

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
	for i := len(middlewares) - 1; i >= 0; i-- {
		h = middlewares[i](h)
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
