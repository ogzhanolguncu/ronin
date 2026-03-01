package main

import (
	"net/http"

	"github.com/jmoiron/sqlx"
)

type handler struct {
	store *sqlx.DB
}

func (h *handler) healthz(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}
