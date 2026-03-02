package main

import (
	"database/sql"
	"errors"
	"fmt"
	"net/http"
	"strings"
)

type Bookmark struct {
	ID          int64    `db:"id"          json:"id"`
	URL         string   `db:"url"         json:"url"`
	Title       string   `db:"title"       json:"title"`
	Notes       string   `db:"notes"       json:"notes"`
	Description string   `db:"description" json:"description"`
	Archived    bool     `db:"archived"    json:"archived"`
	Read        bool     `db:"read"        json:"read"`
	Tags        string   `db:"tags"        json:"-"`
	ParsedTags  []string `db:"-"           json:"tags"`
	CreatedAt   uint64   `db:"created_at"  json:"created_at"`
	UpdatedAt   uint64   `db:"updated_at"  json:"updated_at"`
}

type ResponseMeta struct {
	Cursor *int64 `json:"cursor"`
}

type ListBookmarksResponse struct {
	Bookmarks []Bookmark   `json:"bookmarks"`
	Meta      ResponseMeta `json:"meta"`
}

func (h *handler) getBookmarks(w http.ResponseWriter, r *http.Request) {
	limit, err := queryParam(r, "limit", 50)
	if err != nil {
		writeError(w, http.StatusUnprocessableEntity, fmt.Sprintf("invalid limit: %s", err.Error()))
		return
	}
	cursor, err := queryParam(r, "cursor", 0)
	if err != nil {
		writeError(w, http.StatusUnprocessableEntity, fmt.Sprintf("invalid cursor: %s", err.Error()))
		return
	}
	archived, err := queryParam(r, "archived", -1)
	if err != nil {
		writeError(w, http.StatusUnprocessableEntity, fmt.Sprintf("invalid archived: %s", err.Error()))
		return
	}
	read, err := queryParam(r, "read", -1)
	if err != nil {
		writeError(w, http.StatusUnprocessableEntity, fmt.Sprintf("invalid read: %s", err.Error()))
		return
	}

	var response ListBookmarksResponse
	err = h.store.SelectContext(r.Context(), &response.Bookmarks,
		`
		SELECT bm.*, GROUP_CONCAT(t.name, ', ') AS tags
		FROM bookmark bm
		LEFT JOIN bookmark_tag bt ON bt.bookmark_id = bm.id
		LEFT JOIN tag t ON t.id = bt.tag_id
		WHERE (? = 0 OR bm.id > ?)
			AND (? = -1 OR bm.archived = ?)
			AND (? = -1 OR bm.read = ?)
		GROUP BY bm.id
		ORDER BY bm.id ASC
		LIMIT ?`,
		cursor, cursor, archived, archived, read, read, limit+1,
	)
	if err != nil {
		serverError(w, "failed to query bookmarks", err)
		return
	}

	for i := range response.Bookmarks {
		if response.Bookmarks[i].Tags == "" {
			response.Bookmarks[i].ParsedTags = []string{}
		} else {
			response.Bookmarks[i].ParsedTags = strings.Split(response.Bookmarks[i].Tags, ", ")
		}
	}

	if len(response.Bookmarks) > limit {
		response.Bookmarks = response.Bookmarks[:limit]
		nextCursor := response.Bookmarks[limit-1].ID
		response.Meta.Cursor = &nextCursor
	}

	writeJSON(w, http.StatusOK, response)
}

func (h *handler) getBookmark(w http.ResponseWriter, r *http.Request) {
	id, err := pathParamInt(r, "id")
	if err != nil {
		writeError(w, http.StatusUnprocessableEntity, fmt.Sprintf("invalid bookmark id: %s", err.Error()))
		return
	}

	var response Bookmark
	err = h.store.GetContext(r.Context(), &response,
		`
		SELECT bm.*, GROUP_CONCAT(t.name, ', ') AS tags
		FROM bookmark bm
		LEFT JOIN bookmark_tag bt ON bt.bookmark_id = bm.id
		LEFT JOIN tag t ON t.id = bt.tag_id
		WHERE (bm.id = ?)
		GROUP BY bm.id`,
		id,
	)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			writeError(w, http.StatusNotFound, "bookmark not found")
			return
		}
		serverError(w, "failed to query bookmark", err)
		return
	}

	if response.Tags == "" {
		response.ParsedTags = []string{}
	} else {
		response.ParsedTags = strings.Split(response.Tags, ", ")
	}

	writeJSON(w, http.StatusOK, response)
}

type CreateBookmarkRequest struct {
	URL         string `json:"url"`
	Title       string `json:"title"`
	Description string `json:"description"`
	Notes       string `json:"notes"`
	Tags        string `json:"tags"`
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
	if len(req.URL) > 2048 {
		writeError(w, http.StatusUnprocessableEntity, "URL cannot be longer than 2048")
		return
	}

	bm, err := h.store.ExecContext(r.Context(),
		`INSERT INTO bookmark (url, title, description, notes) VALUES (?, ?, ?, ?)`, req.URL, req.Title, req.Description, req.Notes,
	)
	if err != nil {
		if IsUniqueConstraintErr(err) {
			writeError(w, http.StatusConflict, "bookmark already exists")
			return
		}
		serverError(w, "failed to create bookmark", err)
		return
	}

	bmID, err := bm.LastInsertId()
	if err != nil {
		serverError(w, "failed to get last inserted bookmark id", err)
		return
	}

	var tagIDs []int64
	if req.Tags != "" {
		tags := strings.FieldsSeq(req.Tags)
		for tag := range tags {
			var id int64
			err := h.store.QueryRowContext(r.Context(),
				"INSERT INTO tag (name) VALUES (?) ON CONFLICT(name) DO UPDATE SET name=name RETURNING id",
				tag,
			).Scan(&id)
			if err != nil {
				serverError(w, "failed to upsert tag", err, "tag", tag)
				return
			}
			tagIDs = append(tagIDs, id)
		}
	}

	if len(tagIDs) > 0 {
		placeholders := make([]string, len(tagIDs))
		args := make([]any, len(tagIDs)*2)
		for i, tagID := range tagIDs {
			placeholders[i] = "(?, ?)"
			args[i*2] = bmID
			args[i*2+1] = tagID
		}
		_, err := h.store.ExecContext(r.Context(),
			"INSERT INTO bookmark_tag (bookmark_id, tag_id) VALUES "+strings.Join(placeholders, ", "),
			args...,
		)
		if err != nil {
			serverError(w, "failed to create bookmark tags", err)
			return
		}
	}

	writeJSON(w, http.StatusCreated, map[string]int64{"id": bmID})
}
