package main

import (
	"context"
	"log/slog"
	"os"
	"os/signal"
	"syscall"
	"time"

	_ "modernc.org/sqlite"
)

// type handler struct {
// 	store *Store
// }
//
// // GET /users
// func (h *handler) listUsers(w http.ResponseWriter, r *http.Request) {
// 	var users []User
// 	if err := h.db.SelectContext(r.Context(), &users, `SELECT * FROM users ORDER BY id DESC`); err != nil {
// 		writeError(w, http.StatusInternalServerError, "failed to list users")
// 		slog.Error("list users", "err", err)
// 		return
// 	}
// 	writeJSON(w, http.StatusOK, users)
// }
//
// // POST /users
// func (h *handler) createUser(w http.ResponseWriter, r *http.Request) {
// 	var req CreateUserRequest
// 	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
// 		writeError(w, http.StatusBadRequest, "invalid JSON body")
// 		return
// 	}
// 	if req.Name == "" || req.Email == "" {
// 		writeError(w, http.StatusUnprocessableEntity, "name and email are required")
// 		return
// 	}
//
// 	res, err := h.db.ExecContext(r.Context(),
// 		`INSERT INTO users (name, email) VALUES (?, ?)`, req.Name, req.Email,
// 	)
// 	if err != nil {
// 		writeError(w, http.StatusInternalServerError, "failed to create user")
// 		slog.Error("create user", "err", err)
// 		return
// 	}
//
// 	id, _ := res.LastInsertId()
//
// 	var user User
// 	if err := h.db.GetContext(r.Context(), &user, `SELECT * FROM users WHERE id = ?`, id); err != nil {
// 		writeError(w, http.StatusInternalServerError, "failed to fetch created user")
// 		slog.Error("fetch user after insert", "err", err)
// 		return
// 	}
//
// 	writeJSON(w, http.StatusCreated, user)
// }

func main() {
	logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))
	slog.SetDefault(logger)

	store, err := NewStore("./sanctum.db")
	if err != nil {
		slog.Error("failed to init store", "err", err)
		os.Exit(1)
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
