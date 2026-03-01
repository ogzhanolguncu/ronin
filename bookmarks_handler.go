package main

import (
	"net/http"
)

type Bookmark struct {
	ID          int64  `db:"id"          json:"id"`
	URL         string `db:"url"         json:"url"`
	Title       string `db:"title"       json:"title"`
	Description string `db:"description" json:"description"`
	Archived    bool   `db:"archived"    json:"archived"`
	Read        bool   `db:"read"        json:"read"`
	CreatedAt   uint64 `db:"created_at"  json:"created_at"`
	UpdatedAt   uint64 `db:"updated_at"  json:"updated_at"`
}

func (h *handler) listBookmarks(w http.ResponseWriter, r *http.Request) {
}

func (h *handler) getBookmark(w http.ResponseWriter, r *http.Request) {
}

type CreateBookmarkRequest struct {
	URL         string  `json:"url"`
	Title       *string `json:"title"`
	Description *string `json:"description"`
	Notes       *string `json:"notes"`
	Tags        *string `json:"tags"`
}

func (h *handler) createBookmark(w http.ResponseWriter, r *http.Request) {
	req, ok := decode[CreateBookmarkRequest](r, w)
	if !ok {
		return
	}

	if req.URL == "" {
		writeError(w, http.StatusUnprocessableEntity, "URL is required")
		return
	}
	if len(req.URL) >= 2048 {
		writeError(w, http.StatusUnprocessableEntity, "URL cannot be longer than 2048")
		return
	}

	_, err := h.store.ExecContext(r.Context(),
		`INSERT INTO bookmark (url, title, description, notes) VALUES (?, ?, ?, ?)`, req.URL, req.Title, req.Description, req.Notes,
	)
	if err != nil {
		if IsUniqueConstraintErr(err) {
			writeError(w, http.StatusConflict, "bookmark already exists")
			return
		}
		writeError(w, http.StatusInternalServerError, "failed to create bookmark")
		return
	}
}

func (h *handler) updateBookmark(w http.ResponseWriter, r *http.Request) {
}

func (h *handler) deleteBookmark(w http.ResponseWriter, r *http.Request) {
}
