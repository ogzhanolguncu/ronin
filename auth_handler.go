package main

import (
	"crypto/rand"
	"crypto/subtle"
	"encoding/hex"
	"net/http"
	"strings"
	"time"
)

const sessionDuration = 7 * 24 * time.Hour

type loginRequest struct {
	Passphrase string `json:"passphrase"`
}

func (h *handler) authLogin(w http.ResponseWriter, r *http.Request) {
	req, ok := decode[loginRequest](r, w)
	if !ok {
		return
	}

	if subtle.ConstantTimeCompare([]byte(req.Passphrase), h.passphrase) != 1 {
		writeError(w, http.StatusUnauthorized, "invalid passphrase")
		return
	}

	// Clean expired sessions
	h.store.ExecContext(r.Context(), "DELETE FROM session WHERE expires_at < ?", time.Now().Unix())

	token, err := h.createSession(r)
	if err != nil {
		serverError(w, "failed to create session", err)
		return
	}

	h.setSessionCookie(w, token)
	writeJSON(w, http.StatusOK, map[string]bool{"authenticated": true})
}

func (h *handler) authLogout(w http.ResponseWriter, r *http.Request) {
	cookie, err := r.Cookie("session")
	if err == nil {
		h.store.ExecContext(r.Context(), "DELETE FROM session WHERE token = ?", cookie.Value)
	}

	http.SetCookie(w, &http.Cookie{
		Name:     "session",
		Value:    "",
		Path:     "/",
		MaxAge:   -1,
		HttpOnly: true,
		Secure:   h.secureCookie,
		SameSite: http.SameSiteLaxMode,
	})

	writeJSON(w, http.StatusOK, map[string]bool{"authenticated": false})
}

func (h *handler) authMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if h.devMode {
			next.ServeHTTP(w, r)
			return
		}

		path := r.URL.Path

		if !strings.HasPrefix(path, "/api/") || strings.HasPrefix(path, "/api/v1/auth/") || path == "/api/v1/healthz" {
			next.ServeHTTP(w, r)
			return
		}

		cookie, err := r.Cookie("session")
		if err != nil {
			writeError(w, http.StatusUnauthorized, "unauthorized")
			return
		}

		var exists int
		err = h.store.QueryRowContext(r.Context(),
			"SELECT COUNT(*) FROM session WHERE token = ? AND expires_at > ?",
			cookie.Value, time.Now().Unix(),
		).Scan(&exists)
		if err != nil || exists == 0 {
			writeError(w, http.StatusUnauthorized, "unauthorized")
			return
		}

		next.ServeHTTP(w, r)
	})
}

func (h *handler) createSession(r *http.Request) (string, error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	token := hex.EncodeToString(b)
	expiresAt := time.Now().Add(sessionDuration).Unix()

	if _, err := h.store.ExecContext(r.Context(), "INSERT INTO session (token, expires_at) VALUES (?, ?)", token, expiresAt); err != nil {
		return "", err
	}

	return token, nil
}

func (h *handler) setSessionCookie(w http.ResponseWriter, token string) {
	http.SetCookie(w, &http.Cookie{
		Name:     "session",
		Value:    token,
		Path:     "/",
		MaxAge:   int(sessionDuration.Seconds()),
		HttpOnly: true,
		Secure:   h.secureCookie,
		SameSite: http.SameSiteLaxMode,
	})
}
