package main

import (
	"database/sql"
	"errors"
	"fmt"
	"net/http"
	"strings"
)

var ErrNotFound = errors.New("not found")

const bookmarkBaseQuery = `
	SELECT bm.*, GROUP_CONCAT(t.name, ', ') AS tags
	FROM bookmark bm
	LEFT JOIN bookmark_tag bt ON bt.bookmark_id = bm.id
	LEFT JOIN tag t ON t.id = bt.tag_id`

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

func (b *Bookmark) parseTags() {
	if b.Tags == "" {
		b.ParsedTags = []string{}
	} else {
		b.ParsedTags = strings.Split(b.Tags, ", ")
	}
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
		bookmarkBaseQuery+`
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
		response.Bookmarks[i].parseTags()
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
		bookmarkBaseQuery+`
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

	response.parseTags()

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

type UpdateBookmarkRequest struct {
	ID          int    `json:"id"`
	URL         string `json:"url"`
	Title       string `json:"title"`
	Description string `json:"description"`
	Notes       string `json:"notes"`
	Tags        string `json:"tags"`
}

func (h *handler) updateBookmark(w http.ResponseWriter, r *http.Request) {
	req, ok := decode[UpdateBookmarkRequest](r, w)
	if !ok {
		return
	}

	err := WithTx(r.Context(), h.store.DB, func(tx *sql.Tx) error {
		result, err := tx.ExecContext(
			r.Context(),
			`UPDATE bookmark SET url = ?, title = ?, description = ?, notes = ? WHERE id = ?`,
			req.URL,
			req.Title,
			req.Description,
			req.Notes,
			req.ID,
		)
		if err != nil {
			return fmt.Errorf("failed to update bookmark: %w", err)
		}
		rows, err := result.RowsAffected()
		if err != nil {
			return fmt.Errorf("failed to check rows affected: %w", err)
		}
		if rows == 0 {
			return ErrNotFound
		}

		var tagIDs []int64
		if req.Tags != "" {
			for tag := range strings.FieldsSeq(req.Tags) {
				var id int64
				err := tx.QueryRowContext(r.Context(),
					"INSERT INTO tag (name) VALUES (?) ON CONFLICT(name) DO UPDATE SET name=name RETURNING id",
					tag,
				).Scan(&id)
				if err != nil {
					return fmt.Errorf("failed to upsert tag %q: %w", tag, err)
				}
				tagIDs = append(tagIDs, id)
			}
		}

		if _, err = tx.ExecContext(r.Context(), "DELETE FROM bookmark_tag WHERE bookmark_id = ?", req.ID); err != nil {
			return fmt.Errorf("failed to delete bookmark tags: %w", err)
		}

		if len(tagIDs) > 0 {
			placeholders := make([]string, len(tagIDs))
			args := make([]any, len(tagIDs)*2)
			for i, tagID := range tagIDs {
				placeholders[i] = "(?, ?)"
				args[i*2] = req.ID
				args[i*2+1] = tagID
			}
			if _, err = tx.ExecContext(r.Context(),
				"INSERT INTO bookmark_tag (bookmark_id, tag_id) VALUES "+strings.Join(placeholders, ", "),
				args...,
			); err != nil {
				return fmt.Errorf("failed to insert bookmark tags: %w", err)
			}
		}

		return nil
	})
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			writeError(w, http.StatusNotFound, "bookmark not found")
			return
		}
		serverError(w, "failed to update bookmark", err)
		return
	}

	writeJSON(w, http.StatusNoContent, nil)
}

func (h *handler) deleteBookmark(w http.ResponseWriter, r *http.Request) {
	id, err := pathParamInt(r, "id")
	if err != nil {
		writeError(w, http.StatusUnprocessableEntity, fmt.Sprintf("invalid bookmark id: %s", err.Error()))
		return
	}

	err = WithTx(r.Context(), h.store.DB, func(tx *sql.Tx) error {
		if _, err = tx.ExecContext(r.Context(), "DELETE FROM bookmark WHERE id = ?", id); err != nil {
			return fmt.Errorf("failed to delete tags: %w", err)
		}

		if _, err = tx.ExecContext(r.Context(), "DELETE FROM bookmark_tag WHERE bookmark_id = ?", id); err != nil {
			return fmt.Errorf("failed to delete bookmark tags: %w", err)
		}

		return nil
	})
	if err != nil {
		serverError(w, "failed to update bookmark", err)
		return
	}

	writeJSON(w, http.StatusNoContent, nil)
}

type DeleteBookmarkRequest struct {
	IDs []int `json:"ids"`
}

func (h *handler) deleteBookmarks(w http.ResponseWriter, r *http.Request) {
	req, ok := decode[DeleteBookmarkRequest](r, w)
	if !ok {
		return
	}

	err := WithTx(r.Context(), h.store.DB, func(tx *sql.Tx) error {
		if err := BulkDelete(r.Context(), tx, "bookmark", "id", req.IDs); err != nil {
			return fmt.Errorf("failed to delete bookmarks: %w", err)
		}
		if err := BulkDelete(r.Context(), tx, "bookmark_tag", "bookmark_id", req.IDs); err != nil {
			return fmt.Errorf("failed to delete bookmark tags: %w", err)
		}
		return nil
	})
	if err != nil {
		serverError(w, "failed to update bookmark", err)
		return
	}

	writeJSON(w, http.StatusNoContent, nil)
}

type ArchiveEntry struct {
	ID       int64 `json:"id"`
	Archived bool  `json:"archived"`
}

type ArchiveBookmarkRequest struct {
	IDs []ArchiveEntry `json:"ids_archived"`
}

func (h *handler) archiveBookmarks(w http.ResponseWriter, r *http.Request) {
	req, ok := decode[ArchiveBookmarkRequest](r, w)
	if !ok {
		return
	}
	if len(req.IDs) == 0 {
		writeError(w, http.StatusUnprocessableEntity, "at least 1 archive entry is required")
		return
	}

	// CASE WHEN id = ? THEN ? ...
	caseClauses := make([]string, len(req.IDs))
	ids := make([]any, len(req.IDs))
	args := make([]any, 0, len(req.IDs)*2+len(req.IDs))

	for i, entry := range req.IDs {
		caseClauses[i] = "WHEN ? THEN ?"
		args = append(args, entry.ID, entry.Archived)
		ids[i] = entry.ID
	}

	query := "UPDATE bookmark SET archived = CASE id " +
		strings.Join(caseClauses, " ") +
		" END WHERE id IN (?" + strings.Repeat(",?", len(req.IDs)-1) + ")"

	args = append(args, ids...)

	if _, err := h.store.ExecContext(r.Context(), query, args...); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to archive bookmarks")
		return
	}

	writeJSON(w, http.StatusNoContent, nil)
}

type ReadEntry struct {
	ID   int64 `json:"id"`
	Read bool  `json:"read"`
}

type ReadBookmarkRequest struct {
	IDs []ReadEntry `json:"ids_read"`
}

func (h *handler) readBookmarks(w http.ResponseWriter, r *http.Request) {
	req, ok := decode[ReadBookmarkRequest](r, w)
	if !ok {
		return
	}
	if len(req.IDs) == 0 {
		writeError(w, http.StatusUnprocessableEntity, "at least 1 read entry is required")
		return
	}

	// CASE WHEN id = ? THEN ? ...
	caseClauses := make([]string, len(req.IDs))
	ids := make([]any, len(req.IDs))
	args := make([]any, 0, len(req.IDs)*2+len(req.IDs))

	for i, entry := range req.IDs {
		caseClauses[i] = "WHEN ? THEN ?"
		args = append(args, entry.ID, entry.Read)
		ids[i] = entry.ID
	}

	query := "UPDATE bookmark SET read = CASE id " +
		strings.Join(caseClauses, " ") +
		" END WHERE id IN (?" + strings.Repeat(",?", len(req.IDs)-1) + ")"

	args = append(args, ids...)

	if _, err := h.store.ExecContext(r.Context(), query, args...); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to read bookmarks")
		return
	}

	writeJSON(w, http.StatusNoContent, nil)
}
