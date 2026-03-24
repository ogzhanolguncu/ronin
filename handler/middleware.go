package handler

import (
	"compress/gzip"
	"io"
	"log/slog"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/ogzhanolguncu/ronin/httputil"
)

func loggingMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		next.ServeHTTP(w, r)
		slog.Info("request",
			"method", r.Method,
			"path", r.URL.Path,
			"duration", time.Since(start).String(),
		)
	})
}

func recoveryMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		defer func() {
			if err := recover(); err != nil {
				slog.Error("panic recovered", "err", err)
				httputil.WriteError(w, http.StatusInternalServerError, "internal server error")
			}
		}()
		next.ServeHTTP(w, r)
	})
}

var gzipPool = sync.Pool{
	New: func() any { return gzip.NewWriter(io.Discard) },
}

type gzipResponseWriter struct {
	http.ResponseWriter
	gw         *gzip.Writer
	statusCode int
	sniffDone  bool
	useGzip    bool
}

func (g *gzipResponseWriter) WriteHeader(code int) {
	g.statusCode = code
}

func (g *gzipResponseWriter) Write(b []byte) (int, error) {
	if !g.sniffDone {
		g.sniffDone = true
		// If Content-Encoding is already set (pre-compressed assets), skip gzip.
		if g.Header().Get("Content-Encoding") != "" {
			if g.statusCode != 0 {
				g.ResponseWriter.WriteHeader(g.statusCode)
			}
			return g.ResponseWriter.Write(b)
		}
		g.Header().Set("Content-Encoding", "gzip")
		g.Header().Set("Vary", "Accept-Encoding")
		g.Header().Del("Content-Length")
		if g.statusCode != 0 {
			g.ResponseWriter.WriteHeader(g.statusCode)
		}
		g.useGzip = true
		g.gw.Reset(g.ResponseWriter)
	}
	if !g.useGzip {
		return g.ResponseWriter.Write(b)
	}
	return g.gw.Write(b)
}

func gzipMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if !strings.Contains(r.Header.Get("Accept-Encoding"), "gzip") {
			next.ServeHTTP(w, r)
			return
		}

		gz := gzipPool.Get().(*gzip.Writer)
		defer gzipPool.Put(gz)

		grw := &gzipResponseWriter{ResponseWriter: w, gw: gz}
		next.ServeHTTP(grw, r)

		if grw.useGzip {
			gz.Close()
		} else if grw.statusCode != 0 {
			// No body written (e.g. 204 No Content) — flush the deferred status.
			w.WriteHeader(grw.statusCode)
		}
	})
}

func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")
		if origin != "" {
			w.Header().Set("Access-Control-Allow-Origin", origin)
			w.Header().Set("Vary", "Origin")
		}
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		w.Header().Set("Access-Control-Allow-Credentials", "true")

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}

		next.ServeHTTP(w, r)
	})
}
